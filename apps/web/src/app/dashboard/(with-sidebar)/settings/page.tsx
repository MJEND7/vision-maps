"use client";

import { useState, useEffect } from "react";
import { useWorkspace, useWorkspaceList } from "@/contexts/WorkspaceContext";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, Save, Trash2, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WorkspaceSettingsPage() {
  const { workspace, isAdmin } = useWorkspace();
  const { setActive } = useWorkspaceList();
  const { user } = useUser();

  const [workspaceName, setWorkspaceName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateWorkspace = useMutation(api.workspaces.update);
  const removeWorkspace = useMutation(api.workspaces.remove);
  const removeMember = useMutation(api.workspaces.removeMember);

  // Sync name when workspace changes
  useEffect(() => {
    if (workspace?.name) setWorkspaceName(workspace.name);
  }, [workspace?.name]);

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    );
  }

  /* ----- Logic Handlers ----- */

  const handleUpdateProfile = async () => {
    if (!workspaceName.trim()) {
      toast.error("Workspace name cannot be empty");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateWorkspace({
        workspaceId: workspace._id as unknown as Id<"workspaces">,
        name: workspaceName.trim(),
      });
      toast.success("Workspace profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update workspace");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    try {
      if (workspace && user?.id) {
        await removeMember({
          workspaceId: workspace._id as unknown as Id<"workspaces">,
          userId: user.id,
        });
      }
      await setActive?.({ workspace: null });
      toast.success("Left workspace successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to leave workspace");
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      await removeWorkspace({
        workspaceId: workspace._id as unknown as Id<"workspaces">,
      });
      await setActive?.({ workspace: null });
      toast.success("Workspace deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete workspace");
    }
  };

  /* ---------- UI ---------- */

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Workspace Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace details and configuration
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-lg border border-border bg-card/50 px-5 py-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/50">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 ring-2 ring-muted/30">
              <AvatarImage src={workspace.imageUrl} />
              <AvatarFallback className="text-lg">{workspace.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{workspace.name}</h2>
              <p className="text-xs text-muted-foreground">
                ID: {workspace._id.slice(0, 8)} • Created{" "}
                {new Date(workspace.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" disabled className="gap-2">
              <Camera className="h-4 w-4" />
              Change Logo <span className="text-[10px]">(coming soon)</span>
            </Button>
          )}
        </div>

        {/* Form */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={!isAdmin}
              className="h-9"
              placeholder="Enter workspace name"
            />
          </div>
          <div className="space-y-2">
            <Label>Created</Label>
            <Input
              value={new Date(workspace.createdAt).toLocaleDateString()}
              disabled
              className="h-9 bg-muted text-muted-foreground"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Workspace ID</Label>
            <Input
              value={workspace._id}
              disabled
              className="bg-muted text-muted-foreground h-9"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="pt-6 flex justify-end">
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile || workspaceName === workspace.name}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isUpdatingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Irreversible workspace actions
          </p>
        </div>
        <div className="space-y-4">
          {/* Leave */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-destructive/20 rounded-md p-4 bg-destructive/5">
            <div>
              <h4 className="font-medium">Leave Workspace</h4>
              <p className="text-xs text-muted-foreground">
                You will lose access to {workspace.name}.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowLeaveDialog(true)}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Leave
            </Button>
          </div>

          {/* Delete */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-destructive/20 rounded-md p-4 bg-destructive/5">
              <div>
                <h4 className="font-medium">Delete Workspace</h4>
                <p className="text-xs text-muted-foreground">
                  Permanently remove all data for {workspace.name}.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Leave Confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave “{workspace.name}”? You’ll need an
              invite to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveWorkspace}
              className="bg-destructive text-white hover:bg-destructive/90 gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Leave Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All workspace data
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-white hover:bg-destructive/90 gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
