"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export type UpgradeReason = "ai" | "commenting" | "teams" | "vision_limit" | "collaboration_limit" | "export";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: UpgradeReason;
  requiredPlan?: "pro" | "teams";
  currentLimit?: number;
}

const UPGRADE_MESSAGES: Record<UpgradeReason, { title: string; description: string; defaultPlan: "pro" | "teams" }> = {
  ai: {
    title: "AI Features Locked",
    description: "Unlock AI-powered nodes, intelligent linking, and context mapping with the Pro plan.",
    defaultPlan: "pro",
  },
  commenting: {
    title: "Commenting Locked",
    description: "Upgrade to Teams to unlock team commenting and real-time collaboration features.",
    defaultPlan: "teams",
  },
  teams: {
    title: "Teams Plan Required",
    description: "You need the Teams tier to use Vision Maps with organizations. Get full collaboration features, unlimited visions, and team management.",
    defaultPlan: "teams",
  },
  vision_limit: {
    title: "Vision Limit Reached",
    description: "Upgrade to Pro or Teams to create unlimited visions and unlock advanced features.",
    defaultPlan: "pro",
  },
  collaboration_limit: {
    title: "Collaboration Limit Reached",
    description: "Upgrade to increase your collaboration limit and invite more team members to your visions.",
    defaultPlan: "pro",
  },
  export: {
    title: "Advanced Export Locked",
    description: "Upgrade to Pro to unlock advanced export options and premium features.",
    defaultPlan: "pro",
  },
};

export function UpgradeDialog({ open, onOpenChange, reason, requiredPlan, currentLimit }: UpgradeDialogProps) {
  const router = useRouter();
  const message = UPGRADE_MESSAGES[reason];
  const targetPlan = requiredPlan || message.defaultPlan;

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push("/pricing");
  };

  let description = message.description;
  if (reason === "vision_limit" && currentLimit !== undefined) {
    description = `You've reached your vision limit (${currentLimit} vision${currentLimit !== 1 ? "s" : ""}). ${message.description}`;
  } else if (reason === "collaboration_limit" && currentLimit !== undefined) {
    description = `You've reached your collaboration limit (${currentLimit} user${currentLimit !== 1 ? "s" : ""}). ${message.description}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            {message.title}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3 text-sm">
            {targetPlan === "pro" && (
              <>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Unlimited Visions</p>
                    <p className="text-muted-foreground text-xs">Create as many visions as you need</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">AI-Powered Features</p>
                    <p className="text-muted-foreground text-xs">Smart nodes, linking, and context mapping</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Light Collaboration</p>
                    <p className="text-muted-foreground text-xs">Invite up to 1 additional user per vision</p>
                  </div>
                </div>
              </>
            )}

            {targetPlan === "teams" && (
              <>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Full Team Collaboration</p>
                    <p className="text-muted-foreground text-xs">Up to 20 users per vision</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Real-Time Commenting</p>
                    <p className="text-muted-foreground text-xs">Team communication and feedback</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Organization Support</p>
                    <p className="text-muted-foreground text-xs">Manage visions within your organization</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">All Pro Features</p>
                    <p className="text-muted-foreground text-xs">Plus unlimited visions and AI features</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="gap-2">
            View Pricing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}