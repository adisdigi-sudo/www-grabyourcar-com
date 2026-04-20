import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BusinessVertical } from "@/hooks/useVerticalAccess";

interface VerticalPasswordDialogProps {
  vertical: BusinessVertical | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (vertical: BusinessVertical) => void;
}

const VERIFIED_KEY = "gyc_vp_verified";

export const getVerifiedVerticals = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(VERIFIED_KEY) || "[]");
  } catch {
    return [];
  }
};

export const markVerticalVerified = (verticalId: string) => {
  const current = getVerifiedVerticals();
  if (!current.includes(verticalId)) {
    localStorage.setItem(VERIFIED_KEY, JSON.stringify([...current, verticalId]));
  }
};

export const clearVerifiedVerticals = () => {
  localStorage.removeItem(VERIFIED_KEY);
};

export const VerticalPasswordDialog = ({ vertical, open, onClose, onSuccess }: VerticalPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vertical || !password.trim()) {
      toast.error("Please enter the workspace password");
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-vertical-password", {
        body: { vertical_id: vertical.id, password: password.trim() },
      });

      if (error) throw error;

      if (data?.valid) {
        markVerticalVerified(vertical.id);
        setPassword("");
        onSuccess(vertical);
      } else {
        toast.error("Incorrect password. Please try again.");
      }
    } catch (err) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPassword(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Enter Workspace Password
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{vertical?.name}</span> requires a password to access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleVerify} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="vp-password">Password</Label>
            <div className="relative">
              <Input
                id="vp-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter workspace password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={verifying}>
              Cancel
            </Button>
            <Button type="submit" disabled={verifying || !password.trim()}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Unlock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
