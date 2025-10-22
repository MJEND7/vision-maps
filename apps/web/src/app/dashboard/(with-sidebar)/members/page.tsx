"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Trash2, Crown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { RoleUtils } from "@/lib/roles";
import { InviteUsersPopup } from "@/components/ui/custom-org-popup";

export default function MembersPage() {
    const { user } = useUser();
    const { workspace, isAdmin } = useWorkspace();
    const [showInviteDialog, setShowInviteDialog] = useState(false);

    // Fetch members from Convex
    const convexMembers = useQuery(
        api.workspaces.getMembers,
        workspace ? { workspaceId: workspace._id as unknown as Id<"workspaces"> } : "skip"
    );

    // Fetch pending invites
    const pendingInvites = useQuery(
        api.notifications.getOrgPendingInvites,
        workspace ? { organizationId: workspace._id } : "skip"
    );

    // Mutations
    const createNotification = useMutation(api.notifications.createNotification);
    const removeMember = useMutation(api.workspaces.removeMember);
    const updateMemberRole = useMutation(api.workspaces.updateMemberRole);
    const deleteNotification = useMutation(api.notifications.deleteNotification);

    const memberships = {
        data: convexMembers?.map(m => ({
            id: m._id,
            role: m.role,
            publicUserData: {
                userId: m.userId,
                firstName: m.user?.name?.split(' ')[0] || '',
                lastName: m.user?.name?.split(' ').slice(1).join(' ') || '',
                imageUrl: m.user?.picture,
                emailAddress: m.user?.email
            }
        }))
    };

    if (!workspace) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please select a workspace</p>
            </div>
        );
    }

    const handleRoleChange = async (memberId: string, newRole: string, memberName: string) => {
        try {
            const targetMembership = memberships?.data?.find(m => m.id === memberId);
            if (!targetMembership || !workspace) {
                toast.error("Member not found");
                return;
            }

            await updateMemberRole({
                workspaceId: workspace._id as unknown as Id<"workspaces">,
                userId: targetMembership.publicUserData.userId,
                newRole: newRole
            });

            // Send notification to the user about role change
            if (targetMembership.publicUserData?.userId) {
                try {
                    await createNotification({
                        recipientId: targetMembership.publicUserData.userId,
                        type: "system",
                        title: "Role Updated",
                        message: `Your role in "${workspace?.name}" has been updated to ${RoleUtils.getDisplayName(newRole)}`,
                    });
                } catch (notificationError) {
                    console.warn("Failed to send role change notification:", notificationError);
                }
            }

            toast.success(`${memberName}'s role updated to ${RoleUtils.getDisplayName(newRole)}`);
        } catch (error) {
            console.error("Failed to update member role:", error);
            toast.error("Failed to update member role");
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        try {
            const targetMembership = memberships?.data?.find(m => m.id === memberId);
            if (!targetMembership || !workspace) {
                toast.error("Member not found");
                return;
            }

            await removeMember({
                workspaceId: workspace._id as unknown as Id<"workspaces">,
                userId: targetMembership.publicUserData.userId
            });

            toast.success(`${memberName} removed from workspace`);
        } catch (error) {
            console.error("Failed to remove member:", error);
            toast.error("Failed to remove member");
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        try {
            await deleteNotification({ notificationId: inviteId as any });
            toast.success("Invitation cancelled");
        } catch (error) {
            console.error("Failed to cancel invitation:", error);
            toast.error("Failed to cancel invitation");
        }
    };

    const membersList = memberships?.data || [];
    const invitesList = pendingInvites || [];

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b border-border p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Members</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage workspace members and invitations
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="active" className="h-full flex flex-col">
                    <TabsList className="border-b border-border rounded-none bg-transparent px-6">
                        <TabsTrigger value="active">
                            Active Members ({membersList.length})
                        </TabsTrigger>
                        <TabsTrigger value="invites">
                            Pending Invites ({invitesList.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Active Members Tab */}
                    <TabsContent value="active" className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-medium">Active Members ({membersList.length})</h3>
                                {isAdmin && (
                                    <Button
                                        onClick={() => setShowInviteDialog(true)}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Invite Members
                                    </Button>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-3">
                                {membersList.map((membership: any) => (
                                    <div key={membership.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={membership.publicUserData.imageUrl} />
                                                <AvatarFallback>
                                                    {membership.publicUserData.firstName?.[0]}
                                                    {membership.publicUserData.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">
                                                        {membership.publicUserData.firstName} {membership.publicUserData.lastName}
                                                        {membership.publicUserData.userId === user?.id && " (You)"}
                                                    </p>
                                                    {RoleUtils.isAdmin(membership.role) && (
                                                        <Crown className="w-4 h-4 text-amber-500" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {membership.publicUserData.emailAddress}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isAdmin && membership.publicUserData.userId !== user?.id ? (
                                                <>
                                                    <Select
                                                        value={membership.role}
                                                        onValueChange={(newRole) => handleRoleChange(
                                                            membership.id,
                                                            newRole,
                                                            `${membership.publicUserData.firstName} ${membership.publicUserData.lastName}`
                                                        )}
                                                    >
                                                        <SelectTrigger className="w-25">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {RoleUtils.getAllRoles().map((role) => (
                                                                <SelectItem key={role.value} value={role.value}>
                                                                    {role.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveMember(
                                                            membership.id,
                                                            `${membership.publicUserData.firstName} ${membership.publicUserData.lastName}`
                                                        )}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Badge variant={RoleUtils.isAdmin(membership.role) ? "default" : "secondary"}>
                                                    {RoleUtils.getDisplayName(membership.role)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Pending Invites Tab */}
                    <TabsContent value="invites" className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Pending Invites ({invitesList.length})</h3>

                            {invitesList.length > 0 ? (
                                <div className="flex flex-col-reverse gap-3">
                                    {invitesList.map((invite: any) => (
                                        <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={invite.recipientPicture} />
                                                    <AvatarFallback>
                                                        {invite.recipientEmail[0]?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">
                                                            {invite.recipientName}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {invite.recipientEmail}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Invited as {RoleUtils.getDisplayName(invite.role)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                                    Pending
                                                </Badge>
                                                {isAdmin && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleCancelInvite(invite.id)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-card/50 rounded-lg border border-dashed">
                                    <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No pending invites</h3>
                                    <p className="text-muted-foreground">All invitations have been accepted or expired.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Invite Members Dialog */}
            <InviteUsersPopup
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
                organizationId={workspace._id as any as Id<"workspaces">}
                organizationName={workspace.name}
            />
        </div>
    );
}
