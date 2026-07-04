"""
GemGym — Python Face Recognition Background Service
====================================================

Architecture:
  - WebSocket server on ws://127.0.0.1:8765
  - Captures frames from local camera (OpenCV)
  - Runs face detection and embedding extraction
  - Compares embeddings against encrypted DB (via Tauri bridge)
  - Streams detection events back to the Tauri frontend

Messages (JSON):
  Server → Client:
    { "type": "frame",   "data": "<base64 JPEG>" }
    { "type": "detected","member_id": "...", "name": "...", "confidence": 0.94 }
    { "type": "unknown", "confidence": 0.0 }
    { "type": "status",  "status": "ready" | "no_camera" | "error", "message": "..." }

  Client → Server:
    { "type": "ping" }
    { "type": "add_embedding", "member_id": "...", "embedding": [...] }
    { "type": "remove_embedding", "member_id": "..." }
    { "type": "shutdown" }

Requirements: see requirements.txt
"""

import asyncio
import base64
import json
import logging
import sys
from typing import Optional

import cv2
import numpy as np
import websockets
import websockets.server

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("gemgym.face")

# ── Configuration ─────────────────────────────────────────────────────────────

HOST = "127.0.0.1"
PORT = 8765
CAMERA_INDEX = 0          # Default camera (0 = built-in webcam)
FRAME_QUALITY = 60        # JPEG quality for streaming (0–100)
FRAME_INTERVAL = 0.033    # ~30 FPS

# ── Embedding Store ───────────────────────────────────────────────────────────


class EmbeddingStore:
    """In-memory store for member face embeddings loaded from the DB."""

    def __init__(self) -> None:
        # member_id -> numpy embedding vector
        self._store: dict[str, np.ndarray] = {}

    def add(self, member_id: str, embedding: list[float]) -> None:
        self._store[member_id] = np.array(embedding, dtype=np.float32)
        logger.info(f"Embedding added for member {member_id}")

    def remove(self, member_id: str) -> None:
        self._store.pop(member_id, None)

    def find_match(
        self, query: np.ndarray, threshold: float = 0.6
    ) -> Optional[tuple[str, float]]:
        """
        Compare query embedding against all stored embeddings.
        Returns (member_id, confidence) if match found, else None.
        Uses cosine similarity.
        """
        if not self._store:
            return None

        best_member: Optional[str] = None
        best_score = -1.0

        query_norm = query / (np.linalg.norm(query) + 1e-6)

        for member_id, stored in self._store.items():
            stored_norm = stored / (np.linalg.norm(stored) + 1e-6)
            score = float(np.dot(query_norm, stored_norm))
            if score > best_score:
                best_score = score
                best_member = member_id

        if best_member and best_score >= threshold:
            return (best_member, round(best_score, 4))
        return None


# ── Face Service ──────────────────────────────────────────────────────────────


class FaceRecognitionService:
    """
    Manages camera capture and face detection/recognition pipeline.

    NOTE: face_recognition library (dlib-based) will be used in production.
    This version uses OpenCV's Haar cascade as a lightweight placeholder
    for initial development. Replace detect_and_encode() in Milestone 4.
    """

    def __init__(self) -> None:
        self.store = EmbeddingStore()
        self.cap: Optional[cv2.VideoCapture] = None
        self._face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"  # type: ignore[attr-defined]
        )

    def start_camera(self, index: int = CAMERA_INDEX) -> bool:
        self.cap = cv2.VideoCapture(index)
        if not self.cap.isOpened():
            logger.warning(f"Camera {index} not available")
            self.cap = None
            return False
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        logger.info(f"Camera {index} opened successfully")
        return True

    def stop_camera(self) -> None:
        if self.cap and self.cap.isOpened():
            self.cap.release()
            self.cap = None

    def read_frame(self) -> Optional[np.ndarray]:
        if not self.cap or not self.cap.isOpened():
            return None
        ret, frame = self.cap.read()
        return frame if ret else None

    def frame_to_jpeg_b64(self, frame: np.ndarray) -> str:
        """Encode an OpenCV frame to a Base64 JPEG string."""
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, FRAME_QUALITY])
        return base64.b64encode(buffer.tobytes()).decode("ascii")

    def detect_faces(self, frame: np.ndarray) -> list[tuple[int, int, int, int]]:
        """Detect face bounding boxes using Haar cascade."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self._face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
        return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces] if len(faces) else []

    def draw_detections(
        self, frame: np.ndarray, faces: list[tuple[int, int, int, int]], label: str = ""
    ) -> np.ndarray:
        """Draw bounding boxes and label on frame."""
        out = frame.copy()
        for (x, y, w, h) in faces:
            color = (99, 102, 241)  # Indigo
            cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)
            if label:
                cv2.putText(out, label, (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
        return out


# ── WebSocket Handler ─────────────────────────────────────────────────────────


async def handle_client(
    websocket: websockets.server.WebSocketServerProtocol,
    service: FaceRecognitionService,
) -> None:
    """Handle a single WebSocket client connection."""
    logger.info(f"Client connected: {websocket.remote_address}")

    # Send initial status
    has_camera = service.cap is not None and service.cap.isOpened()
    await websocket.send(json.dumps({
        "type": "status",
        "status": "ready" if has_camera else "no_camera",
        "message": "Face recognition service started" if has_camera else "No camera detected",
    }))

    # Stream frames and handle messages concurrently
    async def stream_frames() -> None:
        while True:
            frame = service.read_frame()
            if frame is None:
                await asyncio.sleep(FRAME_INTERVAL)
                continue

            faces = service.detect_faces(frame)
            label = ""

            if faces:
                # TODO Milestone 4: Extract real embedding with face_recognition library
                # and compare against store. For now we send an "unknown" event.
                label = "Detecting..."
                await websocket.send(json.dumps({"type": "unknown", "confidence": 0.0}))

            annotated = service.draw_detections(frame, faces, label)
            b64 = service.frame_to_jpeg_b64(annotated)
            await websocket.send(json.dumps({"type": "frame", "data": b64}))
            await asyncio.sleep(FRAME_INTERVAL)

    async def receive_messages() -> None:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            match msg.get("type"):
                case "ping":
                    await websocket.send(json.dumps({"type": "pong"}))
                case "add_embedding":
                    service.store.add(msg["member_id"], msg["embedding"])
                case "remove_embedding":
                    service.store.remove(msg["member_id"])
                case "shutdown":
                    logger.info("Shutdown requested by client")
                    return

    try:
        await asyncio.gather(stream_frames(), receive_messages())
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected")


# ── Main ──────────────────────────────────────────────────────────────────────


async def main() -> None:
    service = FaceRecognitionService()
    service.start_camera(CAMERA_INDEX)

    logger.info(f"Starting GemGym Face Recognition Service on ws://{HOST}:{PORT}")

    async with websockets.serve(
        lambda ws: handle_client(ws, service),
        HOST,
        PORT,
    ):
        await asyncio.Future()  # Run until cancelled


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service stopped")
