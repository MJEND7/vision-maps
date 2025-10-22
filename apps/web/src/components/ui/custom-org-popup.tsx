"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useWorkspace, useWorkspaceList } from "@/contexts/WorkspaceContext";
import { api } from "@/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
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
    ChevronDown,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { OrgRole, RoleUtils } from "@/lib/roles";
import { Id } from "@/../convex/_generated/dataModel";

interface CustomOrgPopupProps {
    children: React.ReactNode;
    onOrgChange?: (workspaceId: Id<"workspaces"> | null) => void;
}

interface CreateOrgPopupProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrgCreated?: () => void;
}

interface InviteUsersPopupProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: Id<"workspaces">;
    organizationName: string;
}

interface InlineInviteUsersProps {
    organizationId: Id<"workspaces">;
    onInviteSent: () => void;
    onDone: () => void;
}

export function CustomOrgPopup({ children, onOrgChange }: CustomOrgPopupProps) {
    const { user } = useUser();
    const { workspace } = useWorkspace();
    const { userMemberships, setActive, isLoaded } = useWorkspaceList();

    const [createOrgOpen, setCreateOrgOpen] = useState(false);
    const [inviteUsersOpen, setInviteUsersOpen] = useState(false);
    const [selectedOrgForInvite, setSelectedOrgForInvite] = useState<{id: Id<"workspaces">, name: string} | null>(null);

    const handleOrganizationSwitch = async (workspaceId: Id<"workspaces"> | null) => {
        try {
            await setActive({ workspace: workspaceId });
            onOrgChange?.(workspaceId);
            toast.success(`Switched to ${workspaceId ? 'workspace' : 'personal workspace'}`);
        } catch {
            toast.error("Failed to switch workspace");
        }
    };

    const handleInviteUsers = (workspaceId: Id<"workspaces">, workspaceName: string) => {
        setSelectedOrgForInvite({ id: workspaceId, name: workspaceName });
        setInviteUsersOpen(true);
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

                    {/* Workspaces */}
                    {isLoaded && userMemberships.data?.map((membership) => (
                        <DropdownMenuItem
                            key={membership.workspace.id}
                            onClick={() => handleOrganizationSwitch(membership.workspace.id as unknown as Id<"workspaces">)}
                            className="p-3"
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={membership.workspace.imageUrl} />
                                        <AvatarFallback className="bg-blue-500 text-white">
                                            {membership.workspace.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                                {membership.workspace.name}
                                            </span>
                                            {membership.role === "admin" && (
                                                <Crown className="w-3 h-3 text-amber-500" />
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {membership.workspace.membersCount} members
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {workspace?._id === (membership.workspace.id as unknown as Id<"workspaces">) && (
                                        <Check className="w-4 h-4 text-green-600" />
                                    )}
                                    {membership.role === "admin" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleInviteUsers(membership.workspace.id as unknown as Id<"workspaces">, membership.workspace.name);
                                            }}
                                        >
                                            <Users className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateOrgPopup
                open={createOrgOpen}
                onOpenChange={setCreateOrgOpen}
                onOrgCreated={() => {
                    setCreateOrgOpen(false);
                }}
            />

            {selectedOrgForInvite && (
                <InviteUsersPopup
                    open={inviteUsersOpen}
                    onOpenChange={setInviteUsersOpen}
                    organizationId={selectedOrgForInvite.id as any as Id<"workspaces">}
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
    const [createdOrgId, setCreatedOrgId] = useState<Id<"workspaces"> | null>(null);

    const createOrganization = useMutation(api.workspaces.create);
    const { setActive } = useWorkspaceList();

    const handleCreateOrg = async () => {
        if (!orgName.trim()) return;

        setLoading(true);
        try {
            const workspaceId = await createOrganization({ name: orgName.trim() });
            if (workspaceId) {
                setCreatedOrgId(workspaceId);

                // Switch to the newly created workspace
                await setActive({ workspace: workspaceId });
                toast.success("Workspace created successfully!");
                setShowInviteStep(true);
            }
        } catch (error) {
            console.error("Failed to create workspace:", error);
            toast.error("Failed to create workspace");
        } finally {
            setLoading(false);
        }
    };

    const handleFinishSetup = () => {
        setShowInviteStep(false);
        setOrgName("");
        setCreatedOrgId(null);
        onOrgCreated?.();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                {!showInviteStep ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Create Workspace</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="space-y-3">
                                <Label htmlFor="org-name">Name</Label>
                                <Input
                                    id="org-name"
                                    placeholder="Enter workspace name"
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
                            {createdOrgId && (
                                <InlineInviteUsers
                                    organizationId={createdOrgId}
                                    onInviteSent={() => {}}
                                    onDone={handleFinishSetup}
                                />
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function InviteUsersPopup({ open, onOpenChange, organizationId, organizationName }: InviteUsersPopupProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>(OrgRole.MEMBER);
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Array<{ email: string, role: string, userId?: string }>>([]);

    const searchUsers = useQuery(
        api.user.searchUsersByEmail,
        email.length > 2 ? { searchTerm: email } : "skip"
    );

    const { user } = useUser();
    const inviteMember = useMutation(api.orgs.inviteMember);

    // Filter out current user and already selected users from suggestions
    const filteredSearchUsers = searchUsers?.filter(searchUser => {
        if (user && searchUser.email === user.emailAddresses?.[0]?.emailAddress) {
            return false;
        }
        if (selectedUsers.some(selectedUser => selectedUser.email === searchUser.email)) {
            return false;
        }
        return true;
    }) || [];

    const handleAddUser = () => {
        if (!email.trim()) return;

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
            // Send invitations to all selected users
            await Promise.all(
                selectedUsers.map(async (user) => {
                    await inviteMember({
                        organizationId: organizationId as any as Id<"organizations">,
                        recipientEmail: user.email,
                        role: user.role
                    });
                })
            );
            toast.success(`${selectedUsers.length} invitation(s) sent successfully!`);
            setSelectedUsers([]);
            onOpenChange(false);
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
                    <DialogTitle>Invite Users to {organizationName}</DialogTitle>
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
                                                if (selectedUsers.some(selectedUser => selectedUser.email === user.email)) {
                                                    toast.error("User already added");
                                                    return;
                                                }
                                                setSelectedUsers(prev => [...prev, {
                                                    email: user.email!,
                                                    role,
                                                    userId: user.externalId
                                                }]);
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
                            {loading ? "Adding Members..." : `Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function InlineInviteUsers({ organizationId, onInviteSent, onDone }: InlineInviteUsersProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>(OrgRole.MEMBER);
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Array<{ email: string, role: string, userId?: string }>>([]);

    const searchUsers = useQuery(
        api.user.searchUsersByEmail,
        email.length > 2 ? { searchTerm: email } : "skip"
    );

    const { user } = useUser();
    const inviteMember = useMutation(api.orgs.inviteMember);

    const filteredSearchUsers = searchUsers?.filter(searchUser => {
        if (user && searchUser.email === user.emailAddresses?.[0]?.emailAddress) {
            return false;
        }
        if (selectedUsers.some(selectedUser => selectedUser.email === searchUser.email)) {
            return false;
        }
        return true;
    }) || [];

    const handleAddUser = () => {
        if (!email.trim()) return;

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
                await Promise.all(
                    selectedUsers.map(async (user) => {
                        await inviteMember({
                            organizationId: organizationId as any as Id<"organizations">,
                            recipientEmail: user.email,
                            role: user.role
                        });
                    })
                );
                toast.success(`${selectedUsers.length} invitation(s) sent successfully!`);
                onInviteSent();
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
                                        if (selectedUsers.some(selectedUser => selectedUser.email === user.email)) {
                                            toast.error("User already added");
                                            return;
                                        }
                                        setSelectedUsers(prev => [...prev, {
                                            email: user.email!,
                                            role,
                                            userId: user.externalId
                                        }]);
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
                    {loading ? "Adding..." : selectedUsers.length > 0 ? `Add ${selectedUsers.length} & Done` : "Done"}
                </Button>
            </div>
        </div>
    );
}
