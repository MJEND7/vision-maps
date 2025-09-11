"use client";

import { useState } from "react";
import { useUser, useOrganization, useOrganizationList, useClerk } from "@clerk/nextjs";
import { useOrgSwitch } from "@/contexts/OrgSwitchContext";
import { api } from "@/../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Plus,
    Users,
    Crown,
    Check,
    X,
    ChevronDown,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { OrgRole, RoleUtils } from "@/lib/roles";

interface CustomOrgPopupProps {
    children: React.ReactNode;
    onOrgChange?: (orgId: string | null) => void;
}

interface CreateOrgPopupProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrgCreated?: () => void;
}

interface InviteUsersPopupProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
    organizationName: string;
}

interface InlineInviteUsersProps {
    onInviteSent: () => void;
    onDone: () => void;
}

export function CustomOrgPopup({ children, onOrgChange }: CustomOrgPopupProps) {
    const { user } = useUser();
    const { organization } = useOrganization();
    const { 
        userMemberships, 
        userInvitations, 
        setActive, 
        isLoaded
    } = useOrganizationList({
        userMemberships: { infinite: true },
        userInvitations: { infinite: true },
    });
    const { setIsOrgSwitching } = useOrgSwitch();

    const [createOrgOpen, setCreateOrgOpen] = useState(false);
    const [inviteUsersOpen, setInviteUsersOpen] = useState(false);
    const [selectedOrgForInvite, setSelectedOrgForInvite] = useState<{id: string, name: string} | null>(null);

    const handleOrganizationSwitch = async (orgId: string | null) => {
        try {
            setIsOrgSwitching(true);
            await setActive?.({ organization: orgId });
            onOrgChange?.(orgId);
            toast.success(`Switched to ${orgId ? 'organization' : 'personal workspace'}`);
            
            // Reset org switching state after a delay to allow auth to settle
            setTimeout(() => {
                setIsOrgSwitching(false);
            }, 1500);
        } catch {
            toast.error("Failed to switch organization");
            setIsOrgSwitching(false);
        }
    };

    const handleInviteUsers = (orgId: string, orgName: string) => {
        setSelectedOrgForInvite({ id: orgId, name: orgName });
        setInviteUsersOpen(true);
    };

    const handleAcceptInvitation = async (invitationId: string) => {
        try {
            const invitation = userInvitations.data?.find(inv => inv.id === invitationId);
            if (invitation) {
                await invitation.accept();
                toast.success("Invitation accepted!");
                userMemberships.revalidate?.();
                userInvitations.revalidate?.();
            }
        } catch {
            toast.error("Failed to accept invitation");
        }
    };

    const handleDeclineInvitation = async () => {
        try {
            // Note: Clerk doesn't provide a direct reject method for invitations
            // Users typically need to ignore invitations or they expire automatically
            toast.info("Invitation ignored. It will expire automatically.");
        } catch {
            toast.error("Failed to decline invitation");
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {children}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="start">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Switch Workspace</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCreateOrgOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Personal Account */}
                    <DropdownMenuItem 
                        onClick={() => handleOrganizationSwitch(null)}
                        className="p-3"
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={user?.imageUrl} />
                                    <AvatarFallback className="bg-gray-500 text-white">
                                        {user?.firstName?.[0] || "P"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Personal Account</span>
                                    <span className="text-xs text-muted-foreground">
                                        {user?.emailAddresses?.[0]?.emailAddress}
                                    </span>
                                </div>
                            </div>
                            {!organization && <Check className="w-4 h-4 text-green-600" />}
                        </div>
                    </DropdownMenuItem>

                    {/* Organizations */}
                    {isLoaded && userMemberships.data?.map((membership) => (
                        <DropdownMenuItem
                            key={membership.organization.id}
                            onClick={() => handleOrganizationSwitch(membership.organization.id)}
                            className="p-3"
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={membership.organization.imageUrl} />
                                        <AvatarFallback className="bg-blue-500 text-white">
                                            {membership.organization.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                                {membership.organization.name}
                                            </span>
                                            {membership.role === "admin" && (
                                                <Crown className="w-3 h-3 text-amber-500" />
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {membership.organization.membersCount} members
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {organization?.id === membership.organization.id && (
                                        <Check className="w-4 h-4 text-green-600" />
                                    )}
                                    {membership.role === "admin" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleInviteUsers(membership.organization.id, membership.organization.name);
                                            }}
                                        >
                                            <Users className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </DropdownMenuItem>
                    ))}

                    {/* Invitations */}
                    {isLoaded && userInvitations.data?.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Invitations</DropdownMenuLabel>
                            {userInvitations.data.map((invitation) => (
                                <DropdownMenuItem key={invitation.id} className="p-3">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={invitation.publicOrganizationData.imageUrl} />
                                                <AvatarFallback className="bg-amber-500 text-white">
                                                    {invitation.publicOrganizationData.name[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    {invitation.publicOrganizationData.name}
                                                </span>
                                                <span className="text-xs text-amber-600">
                                                    Pending invitation
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAcceptInvitation(invitation.id);
                                                }}
                                            >
                                                <Check className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeclineInvitation();
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateOrgPopup 
                open={createOrgOpen} 
                onOpenChange={setCreateOrgOpen}
                onOrgCreated={() => {
                    setCreateOrgOpen(false);
                    // Refresh organization list
                    userMemberships.revalidate?.();
                userInvitations.revalidate?.();
                }}
            />

            {selectedOrgForInvite && (
                <InviteUsersPopup
                    open={inviteUsersOpen}
                    onOpenChange={setInviteUsersOpen}
                    organizationId={selectedOrgForInvite.id}
                    organizationName={selectedOrgForInvite.name}
                />
            )}
        </>
    );
}

function CreateOrgPopup({ open, onOpenChange, onOrgCreated }: CreateOrgPopupProps) {
    const [orgName, setOrgName] = useState("");
    const [loading, setLoading] = useState(false);
    const [showInviteStep, setShowInviteStep] = useState(false);
    
    const { createOrganization } = useClerk();
    const { setActive } = useOrganizationList();
    const { setIsOrgSwitching } = useOrgSwitch();

    const handleCreateOrg = async () => {
        if (!orgName.trim()) return;
        
        setLoading(true);
        try {
            const org = await createOrganization({ name: orgName.trim() });
            if (org) {
                // Set org switching state
                setIsOrgSwitching(true);
                
                // Switch to the newly created organization
                await setActive?.({ organization: org.id });
                toast.success("Organization created successfully!");
                setShowInviteStep(true);
                
                // Reset org switching state after a delay to allow auth to settle
                setTimeout(() => {
                    setIsOrgSwitching(false);
                }, 1500);
            }
        } catch (error) {
            console.error("Failed to create organization:", error);
            toast.error("Failed to create organization");
            setIsOrgSwitching(false);
        } finally {
            setLoading(false);
        }
    };

    const handleFinishSetup = () => {
        setShowInviteStep(false);
        setOrgName("");
        onOrgCreated?.();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                {!showInviteStep ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Create Organization</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="space-y-3">
                                <Label htmlFor="org-name">Name</Label>
                                <Input
                                    id="org-name"
                                    placeholder="Enter organization name"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCreateOrg();
                                    }}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleCreateOrg} 
                                    disabled={!orgName.trim() || loading}
                                >
                                    {loading ? "Creating..." : "Create"}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Invite Team Members</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                Would you like to invite team members now?
                            </p>
                        </DialogHeader>
                        <div className="space-y-4">
                            <InlineInviteUsers
                                onInviteSent={() => {}}
                                onDone={handleFinishSetup}
                            />
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function InviteUsersPopup({ open, onOpenChange }: InviteUsersPopupProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>(OrgRole.MEMBER);
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Array<{ email: string, role: string }>>([]);

    const searchUsers = useQuery(
        api.user.searchUsersByEmail,
        email.length > 2 ? { searchTerm: email } : "skip"
    );

    const { organization } = useOrganization();
    const { user } = useUser();
    const createOrgInviteNotification = useMutation(api.notifications.createOrgInviteNotification);

    // Filter out current user and already selected users from suggestions
    const filteredSearchUsers = searchUsers?.filter(searchUser => {
        // Filter out current user
        if (user && searchUser.email === user.emailAddresses?.[0]?.emailAddress) {
            return false;
        }
        // Filter out already selected users
        if (selectedUsers.some(selectedUser => selectedUser.email === searchUser.email)) {
            return false;
        }
        return true;
    }) || [];

    const handleAddUser = () => {
        if (!email.trim()) return;
        
        // Check if user already added
        if (selectedUsers.some(user => user.email === email.trim())) {
            toast.error("User already added");
            return;
        }

        setSelectedUsers(prev => [...prev, { email: email.trim(), role }]);
        setEmail("");
        setRole(OrgRole.MEMBER);
    };

    const handleRemoveUser = (emailToRemove: string) => {
        setSelectedUsers(prev => prev.filter(user => user.email !== emailToRemove));
    };

    const handleSendInvitations = async () => {
        if (selectedUsers.length === 0) {
            toast.error("Please add at least one user to invite");
            return;
        }

        setLoading(true);
        try {
            if (organization) {
                // Send invitations for all selected users using both Clerk and Convex
                await Promise.all(
                    selectedUsers.map(async (user) => {
                        // Send Clerk email invitation
                        await organization.inviteMember({
                            emailAddress: user.email,
                            role: user.role
                        });

                        // Send Convex notification
                        try {
                            await createOrgInviteNotification({
                                recipientEmail: user.email,
                                organizationId: organization.id,
                                organizationName: organization.name,
                                role: user.role
                            });
                        } catch (convexError) {
                            console.warn("Failed to create Convex notification for", user.email, convexError);
                            // Don't throw here - Clerk invite still succeeded
                        }
                    })
                );
                toast.success(`${selectedUsers.length} invitation${selectedUsers.length > 1 ? 's' : ''} sent successfully!`);
                setSelectedUsers([]);
                onOpenChange(false);
            } else {
                throw new Error("No organization selected");
            }
        } catch (error) {
            console.error("Failed to send invitations:", error);
            toast.error(`Failed to send invitations: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite Users to {organization?.name || "Organization"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Add User Section */}
                    <div className="space-y-2">
                        <Label>Add Team Members</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    type="email"
                                    placeholder="Enter email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddUser();
                                        }
                                    }}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="flex items-center gap-1 min-w-[100px]">
                                        <span className="text-sm">{RoleUtils.getDisplayName(role)}</span>
                                        <ChevronDown className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {RoleUtils.getAllRoles().map((roleOption) => (
                                        <DropdownMenuItem key={roleOption.value} onClick={() => setRole(roleOption.value)}>
                                            {roleOption.value === OrgRole.ADMIN ? (
                                                <Crown className="w-4 h-4 mr-2" />
                                            ) : (
                                                <Users className="w-4 h-4 mr-2" />
                                            )}
                                            {roleOption.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Search Results */}
                    {filteredSearchUsers && filteredSearchUsers.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Suggested Users</Label>
                            <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                                {filteredSearchUsers.map((user) => (
                                    <div 
                                        key={user._id}
                                        className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                                        onClick={() => {
                                            if (user.email) {
                                                // Check if user already added
                                                if (selectedUsers.some(selectedUser => selectedUser.email === user.email)) {
                                                    toast.error("User already added");
                                                    return;
                                                }
                                                setSelectedUsers(prev => [...prev, { email: user.email!, role }]);
                                                setEmail("");
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={user.picture} />
                                                <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="space-y-2">
                            <Label>Selected Members ({selectedUsers.length})</Label>
                            <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                                {selectedUsers.map((user, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-accent rounded">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                                    {user.email[0].toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{user.email}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {RoleUtils.isAdmin(user.role) ? (
                                                        <>
                                                            <Crown className="w-3 h-3" />
                                                            Admin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Users className="w-3 h-3" />
                                                            Member
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                            onClick={() => handleRemoveUser(user.email)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSendInvitations}
                            disabled={selectedUsers.length === 0 || loading}
                        >
                            {loading ? "Sending Invitations..." : `Send ${selectedUsers.length} Invitation${selectedUsers.length !== 1 ? 's' : ''}`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function InlineInviteUsers({ onInviteSent, onDone }: InlineInviteUsersProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>(OrgRole.MEMBER);
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Array<{ email: string, role: string }>>([]);

    const searchUsers = useQuery(
        api.user.searchUsersByEmail,
        email.length > 2 ? { searchTerm: email } : "skip"
    );

    const { organization } = useOrganization();
    const { user } = useUser();
    const createOrgInviteNotification = useMutation(api.notifications.createOrgInviteNotification);

    // Filter out current user and already selected users from suggestions
    const filteredSearchUsers = searchUsers?.filter(searchUser => {
        // Filter out current user
        if (user && searchUser.email === user.emailAddresses?.[0]?.emailAddress) {
            return false;
        }
        // Filter out already selected users
        if (selectedUsers.some(selectedUser => selectedUser.email === searchUser.email)) {
            return false;
        }
        return true;
    }) || [];

    const handleAddUser = () => {
        if (!email.trim()) return;
        
        // Check if user already added
        if (selectedUsers.some(user => user.email === email.trim())) {
            toast.error("User already added");
            return;
        }

        setSelectedUsers(prev => [...prev, { email: email.trim(), role }]);
        setEmail("");
        setRole(OrgRole.MEMBER);
    };

    const handleRemoveUser = (emailToRemove: string) => {
        setSelectedUsers(prev => prev.filter(user => user.email !== emailToRemove));
    };

    const handleDone = async () => {
        if (selectedUsers.length > 0) {
            setLoading(true);
            try {
                if (organization) {
                    // Send invitations for all selected users using both Clerk and Convex
                    await Promise.all(
                        selectedUsers.map(async (user) => {
                            // Send Clerk email invitation
                            await organization.inviteMember({
                                emailAddress: user.email,
                                role: user.role
                            });

                            // Send Convex notification
                            try {
                                await createOrgInviteNotification({
                                    recipientEmail: user.email,
                                    organizationId: organization.id,
                                    organizationName: organization.name,
                                    role: user.role
                                });
                            } catch (convexError) {
                                console.warn("Failed to create Convex notification for", user.email, convexError);
                                // Don't throw here - Clerk invite still succeeded
                            }
                        })
                    );
                    toast.success(`${selectedUsers.length} invitation${selectedUsers.length > 1 ? 's' : ''} sent successfully!`);
                    onInviteSent();
                } else {
                    throw new Error("No organization selected");
                }
            } catch (error) {
                console.error("Failed to send invitations:", error);
                toast.error(`Failed to send invitations: ${error}`);
            } finally {
                setLoading(false);
            }
        }
        onDone();
    };

    return (
        <div className="space-y-4">
            {/* Add User Section */}
            <div className="space-y-2">
                <Label>Add Team Members</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            type="email"
                            placeholder="Enter email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddUser();
                                }
                            }}
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-1 min-w-[100px]">
                                <span className="text-sm">{RoleUtils.getDisplayName(role)}</span>
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {RoleUtils.getAllRoles().map((roleOption) => (
                                <DropdownMenuItem key={roleOption.value} onClick={() => setRole(roleOption.value)}>
                                    {roleOption.value === OrgRole.ADMIN ? (
                                        <Crown className="w-4 h-4 mr-2" />
                                    ) : (
                                        <Users className="w-4 h-4 mr-2" />
                                    )}
                                    {roleOption.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Search Results */}
            {filteredSearchUsers && filteredSearchUsers.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Suggested Users</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                        {filteredSearchUsers.map((user) => (
                            <div 
                                key={user._id}
                                className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                                onClick={() => {
                                    if (user.email) {
                                        // Check if user already added
                                        if (selectedUsers.some(selectedUser => selectedUser.email === user.email)) {
                                            toast.error("User already added");
                                            return;
                                        }
                                        setSelectedUsers(prev => [...prev, { email: user.email!, role }]);
                                        setEmail("");
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                        <AvatarImage src={user.picture} />
                                        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
                <div className="space-y-2">
                    <Label>Selected Members ({selectedUsers.length})</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                        {selectedUsers.map((user, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-accent rounded">
                                <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                            {user.email[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm">{user.email}</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            {RoleUtils.isAdmin(user.role) ? (
                                                <>
                                                    <Crown className="w-3 h-3" />
                                                    Admin
                                                </>
                                            ) : (
                                                <>
                                                    <Users className="w-3 h-3" />
                                                    Member
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveUser(user.email)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onDone} disabled={loading}>
                    Skip for now
                </Button>
                <Button onClick={handleDone} disabled={loading}>
                    {loading ? "Sending..." : selectedUsers.length > 0 ? `Send ${selectedUsers.length} & Done` : "Done"}
                </Button>
            </div>
        </div>
    );
}
