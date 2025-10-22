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

    // Update workspace name when workspace changes
    useEffect(() => {
        if (workspace?.name) {
            setWorkspaceName(workspace.name);
        }
    }, [workspace?.name]);

    if (!workspace) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please select a workspace</p>
            </div>
        );
    }

    const handleUpdateProfile = async () => {
        if (!workspaceName.trim()) {
            toast.error("Workspace name cannot be empty");
            return;
        }

        setIsUpdatingProfile(true);
        try {
            await updateWorkspace({
                workspaceId: workspace._id as unknown as Id<"workspaces">,
                name: workspaceName.trim()
            });

            toast.success("Workspace profile updated successfully");
        } catch (error) {
            console.error("Failed to update workspace:", error);
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
                    userId: user.id
                });
            }

            await setActive?.({ workspace: null });

            toast.success("Left workspace successfully");
        } catch (error) {
            console.error("Failed to leave workspace:", error);
            toast.error("Failed to leave workspace");
        }
    };

    const handleDeleteWorkspace = async () => {
        try {
            await removeWorkspace({ workspaceId: workspace._id as unknown as Id<"workspaces"> });

            await setActive?.({ workspace: null });

            toast.success("Workspace deleted successfully");
        } catch (error) {
            console.error("Failed to delete workspace:", error);
            toast.error("Failed to delete workspace");
        }
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b border-border p-6">
                <div>
                    <h1 className="text-2xl font-bold">Workspace Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your workspace profile and configuration
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-6 space-y-8">
                    {/* Profile Section */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Workspace Profile</h2>
                            <p className="text-sm text-muted-foreground mt-1">Update your workspace information</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={workspace.imageUrl} />
                                    <AvatarFallback className="text-xl">
                                        {workspace.name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                {isAdmin && (
                                    <Button variant="outline" disabled>
                                        <Camera className="w-4 h-4 mr-2" />
                                        Change Logo
                                        <span className="text-xs ml-2">(Coming soon)</span>
                                    </Button>
                                )}
                            </div>

                            <Separator />

                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="workspace-name">Workspace Name</Label>
                                    <Input
                                        id="workspace-name"
                                        value={workspaceName}
                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                        disabled={!isAdmin}
                                        placeholder="Enter workspace name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Workspace ID</Label>
                                    <Input
                                        value={workspace._id}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Created</Label>
                                    <Input
                                        value={new Date(workspace.createdAt).toLocaleDateString()}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={handleUpdateProfile}
                                        disabled={isUpdatingProfile || workspaceName === workspace.name}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {isUpdatingProfile ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator className="my-8" />

                    {/* Danger Zone */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                            <p className="text-sm text-muted-foreground mt-1">Irreversible actions</p>
                        </div>

                        <div className="space-y-4">
                            {/* Leave Workspace */}
                            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Leave Workspace</h4>
                                        <p className="text-sm text-muted-foreground">
                                            You will no longer have access to this workspace.
                                        </p>
                                    </div>
                                    <Button variant="destructive" onClick={() => setShowLeaveDialog(true)}>
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Leave
                                    </Button>
                                </div>
                            </div>

                            {/* Delete Workspace - Only for admins */}
                            {isAdmin && (
                                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium">Delete Workspace</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Permanently delete "{workspace.name}" and all associated data.
                                            </p>
                                        </div>
                                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Leave Confirmation Dialog */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Workspace</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave &quot;{workspace.name}&quot;? This action cannot be undone.
                            You will need to be re-invited to access this workspace again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveWorkspace}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave Workspace
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{workspace.name}&quot;? This action cannot be undone.
                            All data associated with this workspace will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteWorkspace}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Workspace
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
