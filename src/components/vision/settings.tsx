"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useUploadThing } from "@/utils/uploadthing";
import { Camera, Search, MoreVertical, Crown, Edit2, UserPlus, X, Upload, ImageIcon, Trash2, Save } from "lucide-react";
import { VisionAccessRole } from "../../../convex/tables/visions";
import { Textarea } from "../ui/textarea";

export default function SettingsComponent({ id }: { id?: string }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [descriptionValue, setDescriptionValue] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const visionId = id as Id<"visions">;
    const vision = useQuery(api.visions.get, visionId ? { id: visionId } : "skip");
    const members = useQuery(api.visions.getMembers, visionId ? { visionId } : "skip");
    const updateVision = useMutation(api.visions.update);
    const updateMemberRole = useMutation(api.visions.updateMemberRole);
    const removeMember = useMutation(api.visions.removeMember);

    const { startUpload } = useUploadThing("imageUploader", {
        onClientUploadComplete: (res) => {
            const uploadedFile = res[0];
            if (uploadedFile && visionId) {
                updateVision({
                    id: visionId,
                    banner: uploadedFile.url,
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
            // Delete from UploadThing storage
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

            // Update vision in database
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
            // Save mode - save any changes
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
            // Edit mode - enter editing
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

    const filteredMembers = members?.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (!vision) {
        return <div className="p-6">Loading...</div>;
    }


    return (
        <div className="p-6 space-y-8">
            {/* Vision Info Section */}
            <div className="space-y-6">
                <h2 className="text-lg font-semibold">Settings</h2>

                {/* Banner Upload */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Banner</label>
                    <div
                        className="relative group border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 transition-colors cursor-pointer"
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
                        <div className="p-3 rounded-lg border bg-gray-50/50">
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
                        <div className="p-3 rounded-lg border bg-gray-50/50 min-h-[80px] flex items-start">
                            <span className="text-sm text-gray-700">
                                {vision.description || "Add a description..."}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Members Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium">Members ({members?.length || 0})</h3>
                    <Button size="sm" variant="outline">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Members List */}
                <div className="h-[15rem] space-y-2 overflow-scroll">
                    {filteredMembers.map((member, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={member.picture} />
                                    <AvatarFallback>
                                        {member.name.split(' ').map((n: any) => n[0]).join('').toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{member.name}</span>
                                        {member.role === 'owner' && (
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                        )}
                                    </div>
                                    {member.email && (
                                        <p className="text-sm text-gray-500">{member.email}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 capitalize">{member.role}</span>
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
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
