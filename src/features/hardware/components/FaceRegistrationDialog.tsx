import { useState, useEffect, useRef } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { tauriInvoke, Commands } from "@/lib/tauri";

const WS_URL = "ws://127.0.0.1:8765";

export function FaceRegistrationDialog({
  memberId,
  open,
  onClose,
  onSuccess
}: {
  memberId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting" | "ready" | "captured" | "saving" | "error">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const [embedding, setEmbedding] = useState<number[] | null>(null);

  useEffect(() => {
    if (!open) {
      setFrameUrl(null);
      setEmbedding(null);
      setStatus("connecting");
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("ready");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "frame" && !["captured", "saving"].includes(status)) {
          setFrameUrl(`data:image/jpeg;base64,${msg.data}`);
        } else if (msg.type === "extracted_embedding") {
          setEmbedding(msg.embedding);
          setStatus("captured");
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onerror = () => setStatus("error");

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [open, status]);

  const handleCapture = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "extract_embedding" }));
    }
  };

  const handleSave = async () => {
    if (!embedding) return;
    setStatus("saving");
    try {
      await tauriInvoke(Commands.MEMBERS_SET_EMBEDDING, { id: memberId, embedding });
      // Inform the python service to add it to the active store
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: "add_embedding", 
          member_id: memberId, 
          embedding 
        }));
      }
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Register Face</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
            {frameUrl ? (
              <img src={frameUrl} alt="Camera" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-2">
                <Camera size={32} className="opacity-40" />
                <p className="text-sm">
                  {status === "error" ? "Service Offline" : "Connecting to camera..."}
                </p>
              </div>
            )}
            
            {status === "captured" && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-3 animate-fade-in">
                <CheckCircle2 size={48} className="text-green-400" />
                <p className="font-medium text-lg">Face Captured Successfully!</p>
              </div>
            )}
          </div>
          
          <p className="text-xs text-center text-[var(--color-text-secondary)]">
            {status === "captured" 
              ? "Review the capture. You can retake if necessary." 
              : "Please look directly at the camera and ensure your face is well-lit."}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {["captured", "saving"].includes(status) ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStatus("ready")} disabled={status === "saving"}>
                Retake
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} isLoading={status === "saving"}>
                Save Face Data
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={handleCapture} disabled={status !== "ready"}>
              <Camera size={14} className="mr-2" /> Capture Face
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
