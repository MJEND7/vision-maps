"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Search,
    UserPlus,
    Shield,
    Lock,
    Users,
    Mail,
    Trash2
} from "lucide-react";
import { toast } from "sonner";
import { RoleUtils } from "@/lib/roles";
import { InviteUsersPopup } from "@/components/ui/custom-org-popup";

interface Member {
    id: string;
    role: string;
    publicUserData: {
        userId: string;
        firstName: string;
        lastName: string;
        imageUrl?: string;
        emailAddress: string;
    };
    isPending?: boolean;
}

interface PendingInvite {
    id: string;
    recipientName: string;
    recipientEmail: string;
    recipientPicture?: string;
    role: string;
}

export default function MembersPage() {
    const { user } = useUser();
    const { workspace, isAdmin } = useWorkspace();
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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

    // Transform members data
    const activeMembers: Member[] = useMemo(() => {
        return convexMembers?.map(m => ({
            id: m._id,
            role: m.role,
            publicUserData: {
                userId: m.userId,
                firstName: m.user?.name?.split(' ')[0] || '',
                lastName: m.user?.name?.split(' ').slice(1).join(' ') || '',
                imageUrl: m.user?.picture,
                emailAddress: m.user?.email || ''
            },
            isPending: false
        })) || [];
    }, [convexMembers]);

    // Transform pending invites to member format
    const pendingMembers: Member[] = useMemo(() => {
        return (pendingInvites || []).map((invite: PendingInvite) => ({
            id: invite.id,
            role: invite.role,
            publicUserData: {
                userId: '',
                firstName: invite.recipientName?.split(' ')[0] || '',
                lastName: invite.recipientName?.split(' ').slice(1).join(' ') || '',
                imageUrl: invite.recipientPicture,
                emailAddress: invite.recipientEmail
            },
            isPending: true
        }));
    }, [pendingInvites]);

    // Combine active members and pending invites
    const allMembers = useMemo(() => {
        return [...activeMembers, ...pendingMembers];
    }, [activeMembers, pendingMembers]);

    // Filter members based on search query
    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return allMembers;

        const query = searchQuery.toLowerCase();
        return allMembers.filter(member => {
            const fullName = `${member.publicUserData.firstName} ${member.publicUserData.lastName}`.toLowerCase();
            const email = member.publicUserData.emailAddress.toLowerCase();
            return fullName.includes(query) || email.includes(query);
        });
    }, [allMembers, searchQuery]);

    if (!workspace) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Please select a workspace</p>
            </div>
        );
    }

    const handleRoleChange = async (memberId: string, newRole: string, memberName: string, isPending: boolean) => {
        if (isPending) {
            toast.error("Cannot change role for pending invites");
            return;
        }

        try {
            const targetMember = activeMembers.find(m => m.id === memberId);
            if (!targetMember || !workspace) {
                toast.error("Member not found");
                return;
            }

            await updateMemberRole({
                workspaceId: workspace._id as unknown as Id<"workspaces">,
                userId: targetMember.publicUserData.userId,
                newRole: newRole
            });

            // Send notification to the user about role change
            if (targetMember.publicUserData?.userId) {
                try {
                    await createNotification({
                        recipientId: targetMember.publicUserData.userId,
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

    const handleRemoveMember = async (memberId: string, memberName: string, isPending: boolean) => {
        if (isPending) {
            await handleCancelInvite(memberId, memberName);
            return;
        }

        try {
            const targetMember = activeMembers.find(m => m.id === memberId);
            if (!targetMember || !workspace) {
                toast.error("Member not found");
                return;
            }

            await removeMember({
                workspaceId: workspace._id as unknown as Id<"workspaces">,
                userId: targetMember.publicUserData.userId
            });

            toast.success(`${memberName} removed from workspace`);
        } catch (error) {
            console.error("Failed to remove member:", error);
            toast.error("Failed to remove member");
        }
    };

    const handleCancelInvite = async (inviteId: string, memberName?: string) => {
        try {
            await deleteNotification({ notificationId: inviteId as any });
            toast.success(memberName ? `Invitation for ${memberName} cancelled` : "Invitation cancelled");
        } catch (error) {
            console.error("Failed to cancel invitation:", error);
            toast.error("Failed to cancel invitation");
        }
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b border-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">People</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage who has access to {workspace.name}
                        </p>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => setShowInviteDialog(true)}
                            size="sm"
                            className="gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Invite member
                        </Button>
                    )}
                </div>

                {/* Stats and Search */}
                <div className="flex items-center justify-between gap-4 mt-4">
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{activeMembers.length}</span>
                            <span className="text-muted-foreground">members</span>
                        </div>
                        {pendingMembers.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{pendingMembers.length}</span>
                                <span className="text-muted-foreground">pending invites</span>
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Find a member..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <div className="min-w-full">
                    {/* Table Header */}
                    <div className="border-b border-border bg-muted/30 sticky top-0 z-10">
                        <div className="grid grid-cols-[40px_1fr_120px_100px_100px_100px_40px] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground">
                            <div className="flex items-center">
                                {/* Checkbox column */}
                                <input
                                    type="checkbox"
                                    disabled
                                    className="w-4 h-4 rounded border-border opacity-30 cursor-not-allowed"
                                />
                            </div>
                            <div>Member</div>
                            <div>2FA</div>
                            <div>Privacy</div>
                            <div>Role</div>
                            <div className="text-center">Teams</div>
                            <div></div>
                        </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-border">
                        {filteredMembers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">No members found</h3>
                                <p className="text-muted-foreground">
                                    {searchQuery ? "Try adjusting your search query" : "Get started by inviting members"}
                                </p>
                            </div>
                        ) : (
                            filteredMembers.map((member) => {
                                const fullName = `${member.publicUserData.firstName} ${member.publicUserData.lastName}`.trim();
                                const isCurrentUser = member.publicUserData.userId === user?.id;
                                const isAdminRole = RoleUtils.isAdmin(member.role);

                                return (
                                    <div
                                        key={member.id}
                                        className="grid grid-cols-[40px_1fr_120px_100px_100px_100px_40px] gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                                    >
                                        {/* Checkbox */}
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                disabled
                                                className="w-4 h-4 rounded border-border opacity-30 cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Member Info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                                <AvatarImage src={member.publicUserData.imageUrl} />
                                                <AvatarFallback className="text-xs">
                                                    {member.publicUserData.firstName?.[0]}
                                                    {member.publicUserData.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm truncate">
                                                        {fullName || "Invited User"}
                                                        {isCurrentUser && " (You)"}
                                                    </p>
                                                    {member.isPending && (
                                                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {member.publicUserData.emailAddress}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 2FA */}
                                        <div className="flex items-center">
                                            {!member.isPending && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    Off
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Privacy */}
                                        <div className="flex items-center">
                                            {!member.isPending && (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Lock className="w-3 h-3 mr-1" />
                                                    Public
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Role */}
                                        <div className="flex items-center">
                                            <Badge
                                                variant={isAdminRole ? "default" : "secondary"}
                                                className="text-xs"
                                            >
                                                {RoleUtils.getDisplayName(member.role)}
                                            </Badge>
                                        </div>

                                        {/* Teams */}
                                        <div className="flex items-center justify-center">
                                            <span className="text-sm text-muted-foreground">
                                                {member.isPending ? "-" : "0"}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-end">
                                            {isAdmin && !isCurrentUser && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 hover:bg-muted"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                            <span className="sr-only">Open menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        {!member.isPending ? (
                                                            <>
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuSub>
                                                                    <DropdownMenuSubTrigger>
                                                                        Change role
                                                                    </DropdownMenuSubTrigger>
                                                                    <DropdownMenuSubContent>
                                                                        {RoleUtils.getAllRoles().map((role) => (
                                                                            <DropdownMenuItem
                                                                                key={role.value}
                                                                                onClick={() => handleRoleChange(
                                                                                    member.id,
                                                                                    role.value,
                                                                                    fullName,
                                                                                    false
                                                                                )}
                                                                                disabled={member.role === role.value}
                                                                            >
                                                                                {role.label}
                                                                                {member.role === role.value && (
                                                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                                                        Current
                                                                                    </span>
                                                                                )}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuSubContent>
                                                                </DropdownMenuSub>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onClick={() => handleRemoveMember(
                                                                        member.id,
                                                                        fullName,
                                                                        false
                                                                    )}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Remove member
                                                                </DropdownMenuItem>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <DropdownMenuLabel>Invitation</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onClick={() => handleRemoveMember(
                                                                        member.id,
                                                                        fullName,
                                                                        true
                                                                    )}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Cancel invitation
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
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
