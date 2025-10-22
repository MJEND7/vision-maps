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
import { MoreHorizontal, Search, UserPlus, Shield, Trash2, Users } from "lucide-react";
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

    const convexMembers = useQuery(
        api.workspaces.getMembers,
        workspace ? { workspaceId: workspace._id as unknown as Id<"workspaces"> } : "skip"
    );
    const pendingInvites = useQuery(
        api.notifications.getWorkspacePendingInvites,
        workspace ? { workspaceId: workspace._id as unknown as Id<"workspaces"> } : "skip"
    );

    const createNotification = useMutation(api.notifications.createNotification);
    const removeMember = useMutation(api.workspaces.removeMember);
    const updateMemberRole = useMutation(api.workspaces.updateMemberRole);
    const deleteNotification = useMutation(api.notifications.deleteNotification);

    const activeMembers = useMemo<Member[]>(() => {
        return (
            convexMembers?.map((m) => ({
                id: m._id,
                role: m.role,
                publicUserData: {
                    userId: m.userId,
                    firstName: m.user?.name?.split(" ")[0] || "",
                    lastName: m.user?.name?.split(" ").slice(1).join(" ") || "",
                    imageUrl: m.user?.picture,
                    emailAddress: m.user?.email || "",
                },
            })) || []
        );
    }, [convexMembers]);

    const pendingMembers = useMemo<Member[]>(() => {
        return (
            (pendingInvites || []).map((invite: PendingInvite) => ({
                id: invite.id,
                role: invite.role,
                publicUserData: {
                    userId: "",
                    firstName: invite.recipientName?.split(" ")[0] || "",
                    lastName: invite.recipientName?.split(" ").slice(1).join(" ") || "",
                    imageUrl: invite.recipientPicture,
                    emailAddress: invite.recipientEmail,
                },
                isPending: true,
            })) || []
        );
    }, [pendingInvites]);

    const allMembers = useMemo(
        () => [...activeMembers, ...pendingMembers],
        [activeMembers, pendingMembers]
    );

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return allMembers;
        const query = searchQuery.toLowerCase();
        return allMembers.filter((m) => {
            const fullName = `${m.publicUserData.firstName} ${m.publicUserData.lastName}`.toLowerCase();
            const email = m.publicUserData.emailAddress.toLowerCase();
            return fullName.includes(query) || email.includes(query);
        });
    }, [allMembers, searchQuery]);

    if (!workspace) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Please select a workspace</p>
            </div>
        );
    }

    const handleRoleChange = async (
        memberId: string,
        newRole: string,
        memberName: string,
        isPending: boolean
    ) => {
        if (isPending) {
            toast.error("Cannot change role for pending invites");
            return;
        }
        try {
            const target = activeMembers.find((m) => m.id === memberId);
            if (!target || !workspace) return toast.error("Member not found");

            await updateMemberRole({
                workspaceId: workspace._id as unknown as Id<"workspaces">,
                userId: target.publicUserData.userId,
                newRole,
            });

            await createNotification({
                recipientId: target.publicUserData.userId,
                type: "system",
                title: "Role Updated",
                message: `Your role in "${workspace.name}" was updated to ${RoleUtils.getDisplayName(
                    newRole
                )}`,
            });

            toast.success(`${memberName}'s role updated to ${RoleUtils.getDisplayName(newRole)}`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update member role");
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string, isPending: boolean) => {
        if (isPending) return handleCancelInvite(memberId, memberName);
        try {
            const target = activeMembers.find((m) => m.id === memberId);
            if (!target || !workspace) return toast.error("Member not found");

            await removeMember({
                workspaceId: workspace._id as unknown as Id<"workspaces">,
                userId: target.publicUserData.userId,
            });

            toast.success(`${memberName} removed from workspace`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to remove member");
        }
    };

    const handleCancelInvite = async (inviteId: string, memberName?: string) => {
        try {
            await deleteNotification({ notificationId: inviteId as any });
            toast.success(`Invitation for ${memberName} cancelled`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to cancel invitation");
        }
    };

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">People</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage who has access to {workspace.name}
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Find a member..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                    />
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowInviteDialog(true)} size="sm" className="gap-2 h-9">
                        <UserPlus className="h-4 w-4" />
                        Invite Member
                    </Button>
                )}
            </div>

            {filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <Users className="mb-3 h-10 w-10" />
                    <p>No members found</p>
                    <p className="text-sm">
                        {searchQuery ? "Try another search" : "Invite your first member"}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                    <div className="hidden sm:grid sm:grid-cols-12 bg-muted/40 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                        <div className="col-span-5">Member</div>
                        <div className="col-span-3">Role</div>
                        <div className="col-span-2">2FA</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    <div className="divide-y divide-border">
                        {filteredMembers.map((member) => (
                            <MemberRow
                                key={member.id}
                                member={member}
                                userId={user?.id}
                                isAdmin={isAdmin}
                                onChangeRole={handleRoleChange}
                                onRemove={handleRemoveMember}
                            />
                        ))}
                    </div>
                </div>
            )}

            <InviteUsersPopup
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
                organizationId={workspace._id as any as Id<"workspaces">}
                organizationName={workspace.name}
            />
        </div>
    );
}

/* ------------ REDESIGNED MEMBER ROW ------------ */

function MemberRow({
    member,
    userId,
    isAdmin,
    onChangeRole,
    onRemove,
}: {
    member: Member;
    userId?: string;
    isAdmin: boolean;
    onChangeRole: (memberId: string, newRole: string, memberName: string, isPending: boolean) => void;
    onRemove: (memberId: string, memberName: string, isPending: boolean) => void;
}) {
    const fullName = `${member.publicUserData.firstName} ${member.publicUserData.lastName}`.trim();
    const isCurrentUser = member.publicUserData.userId === userId;
    const roleDisplay = RoleUtils.getDisplayName(member.role);

    return (
        <div className="sm:grid sm:grid-cols-12 items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between">
            {/* Member */}
            <div className="sm:col-span-5 flex items-center w-full gap-3">
                <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={member.publicUserData.imageUrl} />
                    <AvatarFallback>
                        {member.publicUserData.firstName?.[0]}
                        {member.publicUserData.lastName?.[0]}
                    </AvatarFallback>
                </Avatar>
                <div className="truncate">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm truncate">{fullName || "Invited User"}</p>
                        {isCurrentUser && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                You
                            </Badge>
                        )}
                        {member.isPending && (
                            <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600"
                            >
                                Pending
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.publicUserData.emailAddress}</p>
                </div>
            </div>

            {/* Role */}
            <div className="sm:col-span-3 flex items-center gap-1 mt-2 sm:mt-0 text-sm">
                <Shield className="h-3.5 w-3.5 text-primary/70" />
                <span>{roleDisplay}</span>
            </div>

            {/* 2FA Column */}
            <div className="sm:col-span-2 text-sm mt-2 sm:mt-0">{member.isPending ? "—" : "Off"}</div>

            {/* Actions */}
            <div className="sm:col-span-2 mt-2 sm:mt-0 sm:text-right">
                {isAdmin && !isCurrentUser && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {!member.isPending ? (
                                <>
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {RoleUtils.getAllRoles().map((r) => (
                                                <DropdownMenuItem
                                                    key={r.value}
                                                    onClick={() => onChangeRole(member.id, r.value, fullName, false)}
                                                    disabled={member.role === r.value}
                                                >
                                                    {r.label}
                                                    {member.role === r.value && (
                                                        <span className="ml-auto text-xs text-muted-foreground">Current</span>
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onRemove(member.id, fullName, false)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuLabel>Invitation</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onRemove(member.id, fullName, true)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Cancel invite
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}
