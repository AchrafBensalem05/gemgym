/**
 * GemGym — Face & RFID Check-in Page
 *
 * Connects to the local Python background service via WebSocket to:
 * - Receive live camera frames (Base64 JPEG)
 * - Receive face detection events
 * - (Future) Handle RFID scan inputs
 */

import { useState, useEffect, useRef } from "react";
import { Scan, Camera, CameraOff, UserCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const WS_URL = "ws://127.0.0.1:8765";

export function FaceRfidPage() {
  const [status, setStatus] = useState<"connecting" | "ready" | "no_camera" | "error" | "disconnected">("connecting");
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<{ label: string; confidence: number; time: Date } | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connecting"); // Will wait for 'status' message from server
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "status") {
          setStatus(msg.status);
        } else if (msg.type === "frame") {
          // React to frame data
          setFrameUrl(`data:image/jpeg;base64,${msg.data}`);
        } else if (msg.type === "detected" || msg.type === "unknown") {
          setLastDetection({
            label: msg.type === "detected" ? msg.name : "Unknown Face",
            confidence: msg.confidence,
            time: new Date(),
          });
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[oklch(0.50_0.27_270)/0.12] flex items-center justify-center">
          <Scan size={18} className="text-[oklch(0.77_0.19_270)]" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Live Check-in Station</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Face Recognition & RFID Scanner</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Camera Feed */}
        <Card variant="default" className="overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <Camera size={14} className="text-[var(--color-text-muted)]" />
              Camera Feed
            </div>
            {status === "ready" && (
              <Badge variant="success" dot>Live</Badge>
            )}
            {status === "connecting" && (
              <Badge variant="warning" dot>Connecting...</Badge>
            )}
            {(status === "error" || status === "disconnected") && (
              <Badge variant="danger" dot>Offline</Badge>
            )}
            {status === "no_camera" && (
              <Badge variant="danger" dot>No Camera</Badge>
            )}
          </div>
          <div className="relative flex-1 bg-[#0a0a0a] min-h-[400px] flex items-center justify-center">
            {status === "ready" && frameUrl ? (
              <img src={frameUrl} alt="Live feed" className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-3">
                <CameraOff size={32} className="opacity-40" />
                <p className="text-sm">
                  {status === "connecting" ? "Connecting to background service..." : 
                   status === "no_camera" ? "No webcam detected" : 
                   "Service offline. Please ensure Python service is running."}
                </p>
              </div>
            )}
            
            {/* Overlay Grid lines for aesthetics */}
            <div className="absolute inset-0 pointer-events-none opacity-20 border-[var(--color-border-subtle)] border">
              <div className="absolute top-1/3 left-0 right-0 border-t border-[var(--color-border-subtle)] border-dashed" />
              <div className="absolute top-2/3 left-0 right-0 border-t border-[var(--color-border-subtle)] border-dashed" />
              <div className="absolute left-1/3 top-0 bottom-0 border-l border-[var(--color-border-subtle)] border-dashed" />
              <div className="absolute left-2/3 top-0 bottom-0 border-l border-[var(--color-border-subtle)] border-dashed" />
            </div>
          </div>
        </Card>

        {/* Sidebar panels */}
        <div className="space-y-4">
          
          {/* Latest Detection */}
          <Card variant="default">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Latest Detection</h3>
            </div>
            <CardContent className="py-4">
              {lastDetection ? (
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    lastDetection.label === "Unknown Face" 
                      ? "bg-[oklch(0.65_0.24_22)/0.1] text-[oklch(0.65_0.24_22)]"
                      : "bg-[oklch(0.70_0.18_148)/0.1] text-[oklch(0.70_0.18_148)]"
                  )}>
                    {lastDetection.label === "Unknown Face" ? <AlertTriangle size={18} /> : <UserCheck size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">
                      {lastDetection.label}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Match: {(lastDetection.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      {lastDetection.time.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center text-[var(--color-text-muted)] py-4">
                  Waiting for face...
                </p>
              )}
            </CardContent>
          </Card>

          {/* RFID Scanner Stub */}
          <Card variant="default">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">RFID Scanner</h3>
            </div>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center gap-2 p-2 rounded bg-black/20 border border-[var(--color-border-subtle)] border-dashed">
                <Scan size={14} className="text-[var(--color-text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Scan card..." 
                  className="bg-transparent text-sm w-full outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-center text-[var(--color-text-muted)]">
                Scanner active. Focus the input above to scan a physical card.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
