"use client";

import { useState, useEffect } from "react";
import { useUser, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useOrgSwitch } from "@/contexts/OrgSwitchContext";
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
    X,
    Camera,
    Save
} from "lucide-react";
import { toast } from "sonner";
import { RoleUtils } from "@/lib/roles";

interface OrgSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface MembersTabProps {
    organization: any;
    memberships: any;
    currentUser: any;
    isAdmin: boolean;
    onRoleChange: (memberId: string, newRole: string, memberName: string) => void;
    onRemoveMember: (memberId: string, memberName: string) => void;
}

interface InvitesTabProps {
    invitations: any;
    isAdmin: boolean;
    onCancelInvite: (inviteId: string) => void;
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

export function OrgSettingsDialog({ open, onOpenChange }: OrgSettingsDialogProps) {
    const { user } = useUser();
    const { organization, membership, memberships, invitations } = useOrganization({
        memberships: {
            infinite: true,
            keepPreviousData: true,
        },
        invitations: {
            infinite: true,
            keepPreviousData: true,
        }
    });
    const { setActive, userMemberships, userInvitations } = useOrganizationList({
        userMemberships: { infinite: true },
        userInvitations: { infinite: true },
    });
    const { setIsOrgSwitching } = useOrgSwitch();
    
    const [activeTab, setActiveTab] = useState("members");
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [orgName, setOrgName] = useState(organization?.name || "");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Mutations
    const createNotification = useMutation(api.notifications.createNotification);

    // Update orgName when organization changes
    useEffect(() => {
        if (organization?.name && organization.name !== orgName) {
            setOrgName(organization.name);
        }
    }, [organization?.name, orgName]);

    if (!organization || !membership) {
        return null;
    }

    const isAdmin = RoleUtils.isAdmin(membership.role);
    
    const handleLeaveOrg = async () => {
        try {
            setIsOrgSwitching(true);
            await membership.destroy();
            await setActive?.({ organization: null });
            
            // Refresh organization list in workspace switcher
            userMemberships.revalidate?.();
            userInvitations.revalidate?.();
            
            toast.success("Left organization successfully");
            onOpenChange(false);
            
            // Reset org switching state after a delay to allow auth to settle
            setTimeout(() => {
                setIsOrgSwitching(false);
            }, 1500);
        } catch (error) {
            console.error("Failed to leave organization:", error);
            toast.error("Failed to leave organization");
            setIsOrgSwitching(false);
        }
    };

    const handleDeleteOrg = async () => {
        try {
            setIsOrgSwitching(true);
            await organization.destroy();
            await setActive?.({ organization: null });
            
            // Refresh organization list in workspace switcher
            userMemberships.revalidate?.();
            userInvitations.revalidate?.();
            
            toast.success("Organization deleted successfully");
            onOpenChange(false);
            
            // Reset org switching state after a delay to allow auth to settle
            setTimeout(() => {
                setIsOrgSwitching(false);
            }, 1500);
        } catch (error) {
            console.error("Failed to delete organization:", error);
            toast.error("Failed to delete organization");
            setIsOrgSwitching(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!orgName.trim()) {
            toast.error("Organization name cannot be empty");
            return;
        }

        setIsUpdatingProfile(true);
        try {
            await organization.update({ name: orgName.trim() });
            
            // Refresh organization list in workspace switcher to show updated name
            userMemberships.revalidate?.();
            
            toast.success("Organization profile updated successfully");
        } catch (error) {
            console.error("Failed to update organization:", error);
            toast.error("Failed to update organization");
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: string, memberName: string) => {
        try {
            const targetMembership = memberships?.data?.find(m => m.id === memberId);
            if (!targetMembership) {
                toast.error("Member not found");
                return;
            }

            await targetMembership.update({ role: newRole });
            
            // Send notification to the user about role change
            if (targetMembership.publicUserData?.userId) {
                try {
                    await createNotification({
                        recipientId: targetMembership.publicUserData.userId,
                        type: "system",
                        title: "Role Updated",
                        message: `Your role in "${organization?.name}" has been updated to ${RoleUtils.getDisplayName(newRole)}`,
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
            if (!targetMembership) {
                toast.error("Member not found");
                return;
            }

            await targetMembership.destroy();
            
            // Refresh organization list in workspace switcher
            userMemberships.revalidate?.();
            
            toast.success(`${memberName} removed from organization`);
        } catch (error) {
            console.error("Failed to remove member:", error);
            toast.error("Failed to remove member");
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        try {
            const invitation = invitations?.data?.find(inv => inv.id === inviteId);
            if (invitation) {
                await invitation.revoke();
                toast.success("Invitation cancelled");
            }
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
                                <AvatarImage src={organization.imageUrl} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {organization.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-semibold">{organization.name}</h2>
                                <p className="text-sm text-muted-foreground">Organization Settings</p>
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
                                        {organization?.membersCount || 0}
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
                                    {invitations && invitations?.data?.filter(inv => inv.status === "pending").length > 0 && (
                                        <span className="ml-auto text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {invitations.data.filter(inv => inv.status === "pending").length}
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
                                    onClick={() => setActiveTab("danger")}
                                    className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left rounded-lg transition-colors ${
                                        activeTab === "danger" 
                                            ? "bg-destructive text-destructive-foreground shadow-sm" 
                                            : "hover:bg-destructive/10 hover:text-destructive"
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
                                        organization={organization}
                                        memberships={memberships}
                                        currentUser={user}
                                        isAdmin={isAdmin}
                                        onRoleChange={handleRoleChange}
                                        onRemoveMember={handleRemoveMember}
                                    />
                                )}

                                {activeTab === "invites" && (
                                    <InvitesTab 
                                        invitations={invitations}
                                        isAdmin={isAdmin}
                                        onCancelInvite={handleCancelInvite}
                                    />
                                )}

                                {activeTab === "profile" && (
                                    <ProfileTab
                                        organization={organization}
                                        isAdmin={isAdmin}
                                        orgName={orgName}
                                        setOrgName={setOrgName}
                                        onUpdateProfile={handleUpdateProfile}
                                        isUpdatingProfile={isUpdatingProfile}
                                    />
                                )}

                                {activeTab === "danger" && (
                                    <DangerTab
                                        isAdmin={isAdmin}
                                        organizationName={organization.name}
                                        onLeave={() => setShowLeaveDialog(true)}
                                        onDelete={() => setShowDeleteDialog(true)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Leave Organization Confirmation */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Organization</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave &quot;{organization.name}&quot;? This action cannot be undone.
                            You will need to be re-invited to access this organization again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveOrg}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave Organization
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Organization Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{organization.name}&quot;? This action cannot be undone.
                            All data associated with this organization will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteOrg}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Organization
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// Members Tab Component
function MembersTab({ organization, memberships, currentUser, isAdmin, onRoleChange, onRemoveMember }: MembersTabProps) {
    const membersList = memberships?.data || [];
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Members ({organization?.membersCount || membersList.length})</h3>
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
function InvitesTab({ invitations, isAdmin, onCancelInvite }: InvitesTabProps) {
    const pendingInvites = invitations?.data?.filter((inv: any) => inv.status === "pending") || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Pending Invites ({pendingInvites.length})</h3>
            </div>
            
            {pendingInvites.length > 0 ? (
                <div className="space-y-3">
                    {pendingInvites.map((invitation: any) => (
                        <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium">{invitation.emailAddress}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Invited as {RoleUtils.getDisplayName(invitation.role)}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">Pending</Badge>
                                {isAdmin && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onCancelInvite(invitation.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <X className="w-4 h-4" />
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
                <h3 className="text-lg font-medium">Organization Profile</h3>
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
                        <Label htmlFor="org-name">Organization Name</Label>
                        <Input
                            id="org-name"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            disabled={!isAdmin}
                            placeholder="Enter organization name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Organization ID</Label>
                        <Input
                            value={organization.id}
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

// Danger Zone Tab Component
function DangerTab({ isAdmin, organizationName, onLeave, onDelete }: DangerTabProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
            </div>

            <div className="space-y-4">
                {/* Leave Organization - Available to all members */}
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium">Leave Organization</h4>
                            <p className="text-sm text-muted-foreground">
                                You will no longer have access to this organization.
                            </p>
                        </div>
                        <Button variant="destructive" onClick={onLeave}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Leave
                        </Button>
                    </div>
                </div>

                {/* Delete Organization - Only available to admins */}
                {isAdmin && (
                    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">Delete Organization</h4>
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
