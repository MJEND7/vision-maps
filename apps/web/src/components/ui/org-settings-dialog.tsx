"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useWorkspace, useWorkspaceList } from "@/contexts/WorkspaceContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Users,
    Crown,
    Trash2,
    LogOut,
    Settings,
    Mail,
    AlertTriangle,
    Camera,
    Save,
    UserPlus,
    DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { RoleUtils } from "@/lib/roles";
import { InviteUsersPopup } from "@/components/ui/custom-org-popup";
import { OwnerType, useSubscription } from "@/hooks/users/useSubscription";
import { Organization } from "@convex/tables/organization";
import { BillingTab as SharedBillingTab } from "@/components/billing/BillingTab";

interface OrgSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "members" | "invites" | "profile" | "billing" | "danger";
}

interface MembersTabProps {
    organization: any;
    memberships: any;
    currentUser: any;
    isAdmin: boolean;
    onRoleChange: (memberId: string, newRole: string, memberName: string) => void;
    onRemoveMember: (memberId: string, memberName: string) => void;
    onInviteMembers: () => void;
}


interface ProfileTabProps {
    organization: any;
    isAdmin: boolean;
    orgName: string;
    setOrgName: (name: string) => void;
    onUpdateProfile: () => void;
    isUpdatingProfile: boolean;
}

interface DangerTabProps {
    isAdmin: boolean;
    organizationName: string;
    onLeave: () => void;
    onDelete: () => void;
}


export function OrgSettingsDialog({ open, onOpenChange, defaultTab = "members" }: OrgSettingsDialogProps) {
    const { user } = useUser();
    const { workspace, isAdmin } = useWorkspace();
    const { setActive } = useWorkspaceList();

    // Fetch members from Convex (using workspace members)
    const convexMembers = useQuery(
        api.workspaces.getMembers,
        workspace ? { workspaceId: workspace._id as unknown as Id<"workspaces"> } : "skip"
    );

    // Fetch pending invites
    const pendingInvites = useQuery(
        api.notifications.getOrgPendingInvites,
        workspace ? { organizationId: workspace._id } : "skip"
    );

    const [activeTab, setActiveTab] = useState(defaultTab);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [orgName, setOrgName] = useState(workspace?.name || "");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Mutations (using workspace functions)
    const createNotification = useMutation(api.notifications.createNotification);
    const updateOrg = useMutation(api.workspaces.update);
    const removeOrg = useMutation(api.workspaces.remove);
    const removeMember = useMutation(api.workspaces.removeMember);
    const updateMemberRole = useMutation(api.workspaces.updateMemberRole);
    const deleteNotification = useMutation(api.notifications.deleteNotification);

    // Create compatibility layer to match original component structure
    const membership = workspace ? {
        role: workspace.role || "member"
    } : null;

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

    // Update orgName when workspace changes (but not when user is typing)
    useEffect(() => {
        if (workspace?.name) {
            setOrgName(workspace.name);
        }
    }, [workspace?.name]);

    if (!workspace || !membership) {
        return null;
    }
    
    const handleLeaveOrg = async () => {
        try {
            if (workspace && user?.id) {
                await removeMember({
                    workspaceId: workspace._id as unknown as Id<"workspaces">,
                    userId: user.id
                });
            }

            await setActive?.({ workspace: null });

            toast.success("Left workspace successfully");
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to leave workspace:", error);
            toast.error("Failed to leave workspace");
        }
    };

    const handleDeleteOrg = async () => {
        try {
            if (workspace) {
                await removeOrg({ workspaceId: workspace._id as unknown as Id<"workspaces"> });
            }

            await setActive?.({ workspace: null });

            toast.success("Workspace deleted successfully");
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to delete workspace:", error);
            toast.error("Failed to delete workspace");
        }
    };

    const handleUpdateProfile = async () => {
        if (!orgName.trim()) {
            toast.error("Workspace name cannot be empty");
            return;
        }

        setIsUpdatingProfile(true);
        try {
            if (workspace) {
                await updateOrg({
                    workspaceId: workspace._id as unknown as Id<"workspaces">,
                    name: orgName.trim()
                });
            }

            toast.success("Workspace profile updated successfully");
        } catch (error) {
            console.error("Failed to update workspace:", error);
            toast.error("Failed to update workspace");
        } finally {
            setIsUpdatingProfile(false);
        }
    };

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
                    // Don't throw - the role change succeeded
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

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="flex flex-col gap-0 sm:max-w-[800px] max-w-[95vw] h-[90vh] sm:h-[60vh] max-h-[95vh] overflow-hidden p-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={workspace.imageUrl} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {workspace.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-semibold">{workspace.name}</h2>
                                <p className="text-sm text-muted-foreground">Workspace Settings</p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col sm:flex-row h-full overflow-hidden">
                        {/* Sidebar Navigation */}
                        <div className="w-full sm:w-60 border-r sm:border-r border-b sm:border-b-0 bg-muted/30 p-4 sm:p-6 flex-shrink-0">
                            <nav className="flex sm:flex-col gap-2 sm:space-y-2 overflow-x-auto sm:overflow-x-visible scrollbar-hide">
                                <button
                                    onClick={() => setActiveTab("members")}
                                    className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
                                        activeTab === "members" 
                                            ? "bg-primary text-primary-foreground shadow-sm" 
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    <span className="font-medium whitespace-nowrap">Members</span>
                                    <span className="ml-auto text-xs bg-background/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {workspace?.membersCount || 0}
                                    </span>
                                </button>
                                
                                <button
                                    onClick={() => setActiveTab("invites")}
                                    className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
                                        activeTab === "invites"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                >
                                    <Mail className="w-4 h-4" />
                                    <span className="font-medium whitespace-nowrap">Invites</span>
                                    {pendingInvites && pendingInvites.length > 0 && (
                                        <span className="ml-auto text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {pendingInvites.length}
                                        </span>
                                    )}
                                </button>
                                
                                <button
                                    onClick={() => setActiveTab("profile")}
                                    className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
                                        activeTab === "profile"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                >
                                    <Settings className="w-4 h-4" />
                                    <span className="font-medium whitespace-nowrap">Profile</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("billing")}
                                    className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
                                        activeTab === "billing"
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    <span className="font-medium whitespace-nowrap">Billing</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab("danger")}
                                    className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
                                        activeTab === "danger"
                                            ? "bg-destructive text-white shadow-sm"
                                            : "hover:bg-red-300/30 hover:text-red-400"
                                    }`}
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium whitespace-nowrap">Danger Zone</span>
                                </button>
                            </nav>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto scrollbar-hide p-4 sm:p-8">
                                {activeTab === "members" && (
                                    <MembersTab
                                        organization={workspace}
                                        memberships={memberships}
                                        currentUser={user}
                                        isAdmin={isAdmin}
                                        onRoleChange={handleRoleChange}
                                        onRemoveMember={handleRemoveMember}
                                        onInviteMembers={() => setShowInviteDialog(true)}
                                    />
                                )}

                                {activeTab === "invites" && (
                                    <InvitesTab
                                        invites={pendingInvites}
                                        isAdmin={isAdmin}
                                        onCancelInvite={handleCancelInvite}
                                    />
                                )}

                                {activeTab === "profile" && (
                                    <ProfileTab
                                        organization={workspace}
                                        isAdmin={isAdmin}
                                        orgName={orgName}
                                        setOrgName={setOrgName}
                                        onUpdateProfile={handleUpdateProfile}
                                        isUpdatingProfile={isUpdatingProfile}
                                    />
                                )}

                                {activeTab === "billing" && (
                                    <OrgBillingTab
                                        organization={workspace}
                                        isAdmin={isAdmin}
                                    />
                                )}

                                {activeTab === "danger" && (
                                    <DangerTab
                                        isAdmin={isAdmin}
                                        organizationName={workspace.name}
                                        onLeave={() => setShowLeaveDialog(true)}
                                        onDelete={() => setShowDeleteDialog(true)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Leave Workspace Confirmation */}
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
                            onClick={handleLeaveOrg}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave Workspace
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Workspace Confirmation */}
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
                            onClick={handleDeleteOrg}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Workspace
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Invite Members Dialog */}
            <InviteUsersPopup
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
                organizationId={workspace._id}
                organizationName={workspace.name}
            />
        </>
    );
}

// Members Tab Component
function MembersTab({ organization, memberships, currentUser, isAdmin, onRoleChange, onRemoveMember, onInviteMembers }: MembersTabProps) {
    const membersList = memberships?.data || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Members ({organization?.membersCount || membersList.length})</h3>
                {isAdmin && (
                    <Button
                        onClick={onInviteMembers}
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
                    <div key={membership.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                                        {membership.publicUserData.userId === currentUser?.id && " (You)"}
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
                            {isAdmin && membership.publicUserData.userId !== currentUser?.id ? (
                                <>
                                    <Select
                                        value={membership.role}
                                        onValueChange={(newRole) => onRoleChange(
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
                                        onClick={() => onRemoveMember(
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
    );
}

// Invites Tab Component
function InvitesTab({ invites, isAdmin, onCancelInvite }: {
    invites: any[] | undefined;
    isAdmin: boolean;
    onCancelInvite: (inviteId: string) => void;
}) {
    const invitesList = invites || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Pending Invites ({invitesList.length})</h3>
            </div>

            {invitesList.length > 0 ? (
                <div className="flex flex-col-reverse gap-3">
                    {invitesList.map((invite: any) => (
                        <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                                        onClick={() => onCancelInvite(invite.id)}
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
    );
}

// Profile Tab Component
function ProfileTab({ organization, isAdmin, orgName, setOrgName, onUpdateProfile, isUpdatingProfile }: ProfileTabProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Workspace Profile</h3>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                        <AvatarImage src={organization.imageUrl} />
                        <AvatarFallback className="text-xl">
                            {organization.name[0]}
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
                        <Label htmlFor="org-name">Workspace Name</Label>
                        <Input
                            id="org-name"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            disabled={!isAdmin}
                            placeholder="Enter workspace name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Workspace ID</Label>
                        <Input
                            value={organization._id}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Created</Label>
                        <Input
                            value={new Date(organization.createdAt).toLocaleDateString()}
                            disabled
                            className="bg-muted"
                        />
                    </div>
                </div>

                {isAdmin && (
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={onUpdateProfile}
                            disabled={isUpdatingProfile || orgName === organization.name}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isUpdatingProfile ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Wrapper for Org Billing Tab
function OrgBillingTab({ organization, isAdmin }: { organization: any; isAdmin: boolean }) {
    const { plan: orgPlan, planType, isOnTrial, status, isActive } = useSubscription(organization._id, OwnerType.Workspace);

    const getPlanBadgeColor = () => {
        if (isOnTrial)
            return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
        if (planType === "team")
            return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
        if (planType === "pro")
            return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    };

    const getPlanDisplayName = () => {
        if (planType === "team") return "Team";
        if (planType === "pro") return "Pro";
        return "Free";
    };

    return (
        <SharedBillingTab
            ownerId={organization._id}
            ownerType="workspace"
            plan={orgPlan}
            planType={planType}
            isOnTrial={isOnTrial}
            status={status}
            isActive={isActive}
            organizationMembersCount={organization.membersCount}
            getPlanBadgeColor={getPlanBadgeColor}
            getPlanDisplayName={getPlanDisplayName}
            canManageBilling={isAdmin}
        />
    );
}


// Danger Zone Tab Component
function DangerTab({ isAdmin, organizationName, onLeave, onDelete }: DangerTabProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
            </div>

            <div className="space-y-4">
                {/* Leave Workspace - Available to all members */}
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium">Leave Workspace</h4>
                            <p className="text-sm text-muted-foreground">
                                You will no longer have access to this workspace.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={onLeave}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave
                        </Button>
                    </div>
                </div>

                {/* Delete Workspace - Only available to admins */}
                {isAdmin && (
                    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">Delete Workspace</h4>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete &quot;{organizationName}&quot; and all associated data.
                                </p>
                            </div>
                            <Button variant="destructive" onClick={onDelete}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
