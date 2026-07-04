/**
 * GemGym — 404 Not Found Page
 */

import { useNavigate } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[oklch(0.50_0.27_270)/0.1] flex items-center justify-center mb-6">
        <AlertCircle size={32} className="text-[oklch(0.57_0.28_270)]" />
      </div>
      <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">404</h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        This page doesn't exist.
      </p>
      <Button
        variant="primary"
        leftIcon={<Home size={14} />}
        onClick={() => navigate("/dashboard")}
      >
        Back to Dashboard
      </Button>
    </div>
  );
}
