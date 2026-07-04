/**
 * GemGym — License Activation Page
 *
 * Used to display the current license status and machine fingerprint.
 * Allows entering a new license key to activate the software.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Key, CheckCircle, AlertTriangle, Fingerprint, Copy, ShieldCheck } from "lucide-react";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { usePermissions } from "@/hooks/usePermissions";

interface LicenseInfo {
  id: string;
  licenseKey: string;
  status: string;
  activationDate: string | null;
  expirationDate: string | null;
  hardwareFingerprint: string;
}

const licenseSchema = z.object({
  key: z.string().min(5, "License key is required"),
});

export function LicensePage() {
  const qc = useQueryClient();
  const { isAdmin } = usePermissions();
  const [copied, setCopied] = useState(false);

  const { data: license, isLoading: loadingLicense } = useQuery({
    queryKey: ["license"],
    queryFn: () => tauriInvoke<LicenseInfo | null>(Commands.LICENSE_GET),
    enabled: isAdmin,
  });

  const { data: fingerprint } = useQuery({
    queryKey: ["fingerprint"],
    queryFn: () => tauriInvoke<string>(Commands.LICENSE_GET_FINGERPRINT),
    enabled: isAdmin && !license,
  });

  const activateMutation = useMutation({
    mutationFn: (key: string) => tauriInvoke<LicenseInfo>(Commands.LICENSE_ACTIVATE, { licenseKey: key }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["license"] });
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<{ key: string }>({
    resolver: zodResolver(licenseSchema),
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
        <ShieldCheck size={32} className="opacity-40" />
        <p className="text-sm">You don't have permission to manage the system license.</p>
      </div>
    );
  }

  const copyFingerprint = async () => {
    const text = license?.hardwareFingerprint || fingerprint || "";
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in mt-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[oklch(0.50_0.27_270)/0.1] flex items-center justify-center mx-auto mb-4 glow-primary">
          <Key size={32} className="text-[oklch(0.77_0.19_270)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">System License</h1>
        <p className="text-[var(--color-text-secondary)] mt-2">Manage your GemGym software activation</p>
      </div>

      <Card variant="default">
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-[rgba(255,255,255,0.05)]">
                {license?.status === "active" ? (
                  <CheckCircle size={24} className="text-[oklch(0.70_0.18_148)]" />
                ) : (
                  <AlertTriangle size={24} className="text-[oklch(0.65_0.24_22)]" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {loadingLicense ? "Checking..." : license?.status === "active" ? "Activated" : "Not Activated"}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {license?.status === "active" 
                    ? `Activated on ${new Date(license.activationDate!).toLocaleDateString()}` 
                    : "You are currently running in trial or limited mode."}
                </p>
              </div>
            </div>
            {license?.status === "active" ? (
              <Badge variant="success">PRO LICENSE</Badge>
            ) : (
              <Badge variant="danger">UNLICENSED</Badge>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
              <Fingerprint size={16} className="text-[var(--color-text-muted)]" />
              Machine Fingerprint
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              This unique identifier is tied to this physical machine. Provide it to support when requesting a license.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 p-3 rounded bg-black/30 border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] font-mono overflow-x-auto">
                {license?.hardwareFingerprint || fingerprint || "Generating..."}
              </code>
              <Button variant="outline" onClick={() => void copyFingerprint()} leftIcon={<Copy size={14} />}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader>
          <CardTitle>Activate License</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => activateMutation.mutate(d.key))} className="space-y-4">
            {activateMutation.error && (
              <div className="px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[oklch(0.55_0.24_22)/0.3]">
                <p className="text-sm text-[oklch(0.65_0.24_22)]">
                  {activateMutation.error instanceof Error ? activateMutation.error.message : "Activation failed"}
                </p>
              </div>
            )}
            <Input
              {...register("key")}
              label="License Key"
              placeholder="GEMGYM-XXXX-XXXX-XXXX"
              error={errors.key?.message}
            />
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={activateMutation.isPending}
              disabled={license?.status === "active"}
            >
              {license?.status === "active" ? "Already Activated" : "Activate"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
