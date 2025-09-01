"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useUploadThing } from "@/utils/uploadthing";
import { Camera, Search, MoreVertical, Crown, Edit2, UserPlus, X, Upload, ImageIcon, Trash2, Save, AlertTriangle, TableProperties, Frame, Filter, ChevronDown, Check } from "lucide-react";
import { VisionAccessRole } from "../../../convex/tables/visions";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SettingsComponentProps {
    id?: string;
    onChannelDeleted?: (channelId: string) => void;
    onFrameDeleted?: (frameId: string) => void;
    onFramesDeleted?: (frameIds: string[]) => void;
}

export default function SettingsComponent({ 
    id, 
    onChannelDeleted, 
    onFrameDeleted, 
    onFramesDeleted 
}: SettingsComponentProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [descriptionValue, setDescriptionValue] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [deleteChannelDialog, setDeleteChannelDialog] = useState<{ isOpen: boolean; channel: any | null }>({ isOpen: false, channel: null });
    const [deleteFramesDialog, setDeleteFramesDialog] = useState<{ isOpen: boolean; frames: any[] }>({ isOpen: false, frames: [] });
    const [activeTab, setActiveTab] = useState<string>("users");
    const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
    const [selectedChannelFilter, setSelectedChannelFilter] = useState<string | null>(null);
    const [isChannelFilterOpen, setIsChannelFilterOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const visionId = id as Id<"visions">;
    const vision = useQuery(api.visions.get, visionId ? { id: visionId } : "skip");
    const members = useQuery(api.visions.getMembers, visionId ? { visionId } : "skip");
    const channels = useQuery(api.channels.listByVision, visionId ? { visionId } : "skip");
    const allFrames = useQuery(api.frames.listByVision, visionId ? { visionId } : "skip");
    const updateVision = useMutation(api.visions.update);
    const updateMemberRole = useMutation(api.visions.updateMemberRole);
    const removeMember = useMutation(api.visions.removeMember);
    const deleteChannel = useMutation(api.channels.remove);
    const deleteFrame = useMutation(api.frames.remove);

    const { startUpload } = useUploadThing("imageUploader", {
        onClientUploadComplete: (res) => {
            const uploadedFile = res[0];
            if (uploadedFile && visionId) {
                updateVision({
                    id: visionId,
                    banner: uploadedFile.ufsUrl,
                });
                toast.success("Banner updated successfully!");
                setIsUploading(false);
            }
        },
        onUploadError: (error) => {
            toast.error("Upload failed: " + error.message);
            setIsUploading(false);
        },
    });

    const handleBannerUpload = async (files: File[]) => {
        if (files.length > 0) {
            setIsUploading(true);
            await startUpload(files);
        }
    };

    const handleBannerRemove = async () => {
        if (!vision?.banner || !visionId) return;

        setIsUploading(true);
        try {
            const response = await fetch('/api/uploadthing/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileUrl: vision.banner }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete file from storage');
            }

            await updateVision({
                id: visionId,
                banner: "",
            });

            toast.success("Banner removed successfully!");
        } catch (error) {
            toast.error("Failed to remove banner: " + (error as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            handleBannerUpload(files);
        }
    };

    const handleEditToggle = async () => {
        if (isEditing) {
            const updates: any = {};

            if (titleValue.trim() !== (vision?.title || "")) {
                updates.title = titleValue.trim();
            }

            if (descriptionValue !== (vision?.description || "")) {
                updates.description = descriptionValue;
            }

            if (Object.keys(updates).length > 0 && visionId) {
                await updateVision({
                    id: visionId,
                    ...updates,
                });
                toast.success("Vision updated!");
            }

            setIsEditing(false);
        } else {
            setTitleValue(vision?.title || "");
            setDescriptionValue(vision?.description || "");
            setIsEditing(true);
        }
    };

    const handleCancel = () => {
        setTitleValue(vision?.title || "");
        setDescriptionValue(vision?.description || "");
        setIsEditing(false);
    };

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        if (visionId) {
            try {
                await updateMemberRole({
                    visionId,
                    userId,
                    newRole,
                });
                toast.success("Role updated!");
            } catch (error) {
                toast.error("Failed to update role: " + (error as Error).message);
            }
        }
    };

    const handleMemberRemove = async (userId: string) => {
        if (visionId) {
            try {
                await removeMember({
                    visionId,
                    userId,
                });
                toast.success("Member removed!");
            } catch (error) {
                toast.error("Failed to remove member: " + (error as Error).message);
            }
        }
    };

    const handleChannelDelete = (channel: any) => {
        setDeleteChannelDialog({ isOpen: true, channel });
    };

    const confirmChannelDelete = async () => {
        if (!deleteChannelDialog.channel) return;

        try {
            await deleteChannel({
                id: deleteChannelDialog.channel._id as Id<"channels">
            });
            toast.success(`Channel "${deleteChannelDialog.channel.title}" deleted successfully!`);
            
            // Close tabs for the deleted channel
            onChannelDeleted?.(deleteChannelDialog.channel._id);
            
            setDeleteChannelDialog({ isOpen: false, channel: null });
        } catch (error) {
            toast.error("Failed to delete channel: " + (error as Error).message);
        }
    };

    const cancelChannelDelete = () => {
        setDeleteChannelDialog({ isOpen: false, channel: null });
    };

    const handleFrameSelect = (frameId: string, isSelected: boolean) => {
        setSelectedFrames(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(frameId);
            } else {
                newSet.delete(frameId);
            }
            return newSet;
        });
    };

    const handleSelectAllFrames = (isSelected: boolean) => {
        if (isSelected) {
            setSelectedFrames(new Set(filteredFrames?.map(f => f._id) || []));
        } else {
            setSelectedFrames(new Set());
        }
    };

    const handleBulkDeleteFrames = () => {
        const framesToDelete = filteredFrames?.filter(f => selectedFrames.has(f._id)) || [];
        setDeleteFramesDialog({ isOpen: true, frames: framesToDelete });
    };

    const confirmFramesDelete = async () => {
        try {
            const frameIds = deleteFramesDialog.frames.map(f => f._id);
            
            for (const frame of deleteFramesDialog.frames) {
                await deleteFrame({ id: frame._id as Id<"frames"> });
            }
            
            toast.success(`${deleteFramesDialog.frames.length} frame(s) deleted successfully!`);
            
            // Close tabs for deleted frames
            if (frameIds.length === 1) {
                onFrameDeleted?.(frameIds[0]);
            } else {
                onFramesDeleted?.(frameIds);
            }
            
            setSelectedFrames(new Set());
            setDeleteFramesDialog({ isOpen: false, frames: [] });
        } catch (error) {
            toast.error("Failed to delete frames: " + (error as Error).message);
        }
    };

    const cancelFramesDelete = () => {
        setDeleteFramesDialog({ isOpen: false, frames: [] });
    };

    // Close channel filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isChannelFilterOpen && event.target instanceof Element) {
                const filterButton = event.target.closest('[data-channel-filter]');
                if (!filterButton) {
                    setIsChannelFilterOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isChannelFilterOpen]);

    const filteredMembers = members?.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const filteredChannels = channels?.filter(channel =>
        channel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (channel.description && channel.description.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const filteredFrames = allFrames?.filter(frame => {
        const matchesSearch = frame.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesChannel = !selectedChannelFilter || frame.channel === selectedChannelFilter;
        return matchesSearch && matchesChannel;
    }) || [];

    const selectedChannelData = channels?.find(c => c._id === selectedChannelFilter);

    if (!vision) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="h-[94%] overflow-scroll flex flex-col">
            {/* Vision Info Section */}
            <div className="p-4 space-y-4">
                <h2 className="text-lg font-semibold">Settings</h2>

                {/* Banner Upload */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Banner</label>
                    <div
                        className="relative group border-2 border-dashed border-accent rounded-xl hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {vision.banner ? (
                            <div className="relative aspect-video w-full max-h-[200px] p-2">
                                <img
                                    src={vision.banner}
                                    alt="Vision banner"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                                    <div className="flex gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                            className="text-white hover:text-gray-200 transition-colors p-2 rounded-lg bg-black/30 hover:bg-black/50"
                                            title="Change banner"
                                        >
                                            <Camera className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBannerRemove();
                                            }}
                                            className="text-white hover:text-white transition-colors p-2 rounded-lg bg-black/30 hover:bg-red-600/50"
                                            title="Remove banner"
                                        >
                                            <Trash2 className="w-6 h-6" />
                                        </button>
                                    </div>
                                    <p className="text-white text-sm">Change or remove banner</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-600 mb-2">Click to upload banner</p>
                                <p className="text-sm text-gray-400">Recommended: 16:9 aspect ratio</p>
                            </div>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <div className="text-white text-center">
                                    <Upload className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                                    <p>Loading...</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Edit/Save Button */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium">Information</h3>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleEditToggle}
                            size="sm"
                            variant={isEditing ? "default" : "outline"}
                            className="text-xs"
                        >
                            {isEditing ? (
                                <>
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                </>
                            ) : (
                                <>
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Edit
                                </>
                            )}
                        </Button>
                        {isEditing && (
                            <Button
                                onClick={handleCancel}
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    {isEditing ? (
                        <Input
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            className="flex-1"
                            placeholder="Vision title..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditToggle();
                                if (e.key === 'Escape') handleCancel();
                            }}
                            autoFocus
                        />
                    ) : (
                        <div className="px-3 py-2 rounded-lg border text-primary/80">
                            <span className="text-sm">{vision.title}</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    {isEditing ? (
                        <Textarea
                            value={descriptionValue}
                            onChange={(e) => setDescriptionValue(e.target.value)}
                            className="text-sm w-full p-3 border rounded-lg resize-none"
                            rows={3}
                            placeholder="Describe your vision..."
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') handleCancel();
                            }}
                        />
                    ) : (
                        <div className="px-3 py-2 rounded-lg border min-h-[80px] flex items-start">
                            <span className="text-sm text-primary/80">
                                {vision.description || "Add a description..."}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabbed Management Section */}

            {/* Tab Navigation */}
            <div className=" p-4 space-y-2">
                <div className="inline-flex gap-1 bg-muted p-1 rounded-lg w-auto">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === "users"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <UserPlus className="w-3 h-3" />
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab("channels")}
                        className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === "channels"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <TableProperties className="w-3 h-3" />
                        Channels
                    </button>
                    <button
                        onClick={() => setActiveTab("frames")}
                        className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === "frames"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Frame className="w-3 h-3" />
                        Frames
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        {/* Unified Search Bar */}
                        <div className="w-[300px] relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={`Search ${activeTab}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 text-xs placeholder:text-xs h-9"
                            />
                        </div>
                        {activeTab === "users" && (
                            <Button className="text-xs" size="sm" variant="outline">
                                <UserPlus className="w-4 h-4" />
                                Invite User
                            </Button>
                        )}
                        {activeTab === "frames" && (
                            <div className="flex items-center gap-2">
                                {/* Channel Filter */}
                                <div className="relative" data-channel-filter>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs flex items-center gap-2"
                                        onClick={() => setIsChannelFilterOpen(!isChannelFilterOpen)}
                                    >
                                        <Filter className="w-3 h-3" />
                                        {selectedChannelData ? selectedChannelData.title : "All Channels"}
                                        <ChevronDown className="w-3 h-3" />
                                    </Button>
                                    {isChannelFilterOpen && (
                                        <div className="absolute top-full right-0 mt-1 w-64 bg-background border rounded-lg shadow-lg z-10">
                                            <div className="p-2">
                                                <Input
                                                    placeholder="Search channels..."
                                                    className="text-xs placeholder:text-xs h-8"
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                <button
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center"
                                                    onClick={() => {
                                                        setSelectedChannelFilter(null);
                                                        setIsChannelFilterOpen(false);
                                                    }}
                                                >
                                                    <div className="w-3 h-3">{!selectedChannelFilter && <Check className="w-3 h-3" />}</div>
                                                    <span className="ml-1">All Channels</span>
                                                </button>
                                                {channels?.map(channel => (
                                                    <button
                                                        key={channel._id}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center"
                                                        onClick={() => {
                                                            setSelectedChannelFilter(channel._id);
                                                            setIsChannelFilterOpen(false);
                                                        }}
                                                    >
                                                        <div className="w-3 h-3">{selectedChannelFilter === channel._id && <Check className="w-3 h-3" />}</div>
                                                        <span className="ml-1">{channel.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {selectedFrames.size > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="text-xs"
                                        onClick={handleBulkDeleteFrames}
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Delete {selectedFrames.size} frame{selectedFrames.size > 1 ? "s" : ""}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {activeTab === "users" && (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.map((member, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage src={member.picture} />
                                                        <AvatarFallback className="text-xs">
                                                            {member.name.split(' ').map((n: any) => n[0]).join('').toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm">{member.name}</span>
                                                            {member.role === 'owner' && (
                                                                <Crown className="w-3 h-3 text-yellow-500" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${member.role === 'owner'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-secondary text-secondary-foreground'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {member.email || 'No email'}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className={`${member.role == VisionAccessRole.Owner ? "hidden" : ""}`} asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {member.role !== 'owner' && (
                                                            <DropdownMenuItem onClick={() => handleRoleUpdate(member.userId, 'owner')}>
                                                                Promote to Owner
                                                            </DropdownMenuItem>
                                                        )}
                                                        {member.role !== 'owner' && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleMemberRemove(member.userId)}
                                                                className="text-red-600"
                                                            >
                                                                Remove Member
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredMembers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                {searchTerm ? 'No users match your search' : 'No users found'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {activeTab === "channels" && (
                        < div className="border rounded-lg">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredChannels?.map((channel) => (
                                        <TableRow key={channel._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <TableProperties className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium text-muted-foreground">{channel.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {channel.description || 'No description'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(channel.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleChannelDelete(channel)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) || null}
                                    {!filteredChannels || filteredChannels.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                {searchTerm ? 'No channels match your search' : 'No channels found'}
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {activeTab === "frames" && (
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <input
                                                type="checkbox"
                                                checked={filteredFrames.length > 0 && selectedFrames.size === filteredFrames.length}
                                                onChange={(e) => handleSelectAllFrames(e.target.checked)}
                                                className="rounded"
                                            />
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFrames?.map((frame) => {
                                        const frameChannel = channels?.find(c => c._id === frame.channel);
                                        return (
                                            <TableRow key={frame._id}>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFrames.has(frame._id)}
                                                        onChange={(e) => handleFrameSelect(frame._id, e.target.checked)}
                                                        className="rounded"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Frame className="w-4 h-4 text-muted-foreground" />
                                                        <span className="font-medium text-muted-foreground">{frame.title}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TableProperties className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-muted-foreground">
                                                            {frameChannel?.title || 'Unknown Channel'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(frame.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteFramesDialog({ isOpen: true, frames: [frame] })}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }) || null}
                                    {!filteredFrames || filteredFrames.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                {searchTerm || selectedChannelFilter ? 'No frames match your filters' : 'No frames found'}
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            {/* Channel Deletion Confirmation Dialog */}
            <Dialog open={deleteChannelDialog.isOpen} onOpenChange={(open) => {
                if (!open) cancelChannelDelete();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Delete Channel
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the channel <strong>&ldquo;{deleteChannelDialog.channel?.title}&rdquo;</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            <strong>Warning:</strong> This action cannot be undone. Deleting this channel will permanently remove:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>All frames in this channel</li>
                                <li>All nodes and connections</li>
                                <li>All comments and discussions</li>
                                <li>All associated data</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={cancelChannelDelete}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmChannelDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Channel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Frame Deletion Confirmation Dialog */}
            <Dialog open={deleteFramesDialog.isOpen} onOpenChange={(open) => {
                if (!open) cancelFramesDelete();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Delete Frame{deleteFramesDialog.frames.length > 1 ? 's' : ''}
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {deleteFramesDialog.frames.length > 1
                                ? `${deleteFramesDialog.frames.length} frames`
                                : `the frame "${deleteFramesDialog.frames[0]?.title}"`}?
                        </DialogDescription>
                    </DialogHeader>

                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            <strong>Warning:</strong> This action cannot be undone. Deleting {deleteFramesDialog.frames.length > 1 ? 'these frames' : 'this frame'} will permanently remove:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>All nodes and connections in {deleteFramesDialog.frames.length > 1 ? 'these frames' : 'this frame'}</li>
                                <li>All comments and discussions</li>
                                <li>All associated data</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={cancelFramesDelete}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmFramesDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Frame{deleteFramesDialog.frames.length > 1 ? 's' : ''}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
