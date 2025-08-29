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
import { Camera, Search, MoreVertical, Crown, Edit2, UserPlus, X, Upload, ImageIcon } from "lucide-react";
import { VisionAccessRole } from "../../../convex/tables/visions";
import { Textarea } from "../ui/textarea";

export default function SettingsComponent({ id }: { id?: string }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
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

    const { startUpload } = useUploadThing("visionBanner", {
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            handleBannerUpload(files);
        }
    };

    const handleTitleSave = async () => {
        if (visionId && titleValue.trim()) {
            await updateVision({
                id: visionId,
                title: titleValue.trim(),
            });
            setEditingTitle(false);
            toast.success("Title updated!");
        }
    };

    const handleDescriptionSave = async () => {
        if (visionId) {
            await updateVision({
                id: visionId,
                description: descriptionValue,
            });
            setEditingDescription(false);
            toast.success("Description updated!");
        }
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

    const handleTitleEdit = () => {
        setTitleValue(vision.title);
        setEditingTitle(true);
    };

    const handleDescriptionEdit = () => {
        setDescriptionValue(vision.description || "");
        setEditingDescription(true);
    };

    return (
        <div className="p-6 space-y-8">
            {/* Vision Info Section */}
            <div className="space-y-6">
                <h2 className="text-lg font-semibold">Vision Settings</h2>

                {/* Banner Upload */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Banner</label>
                    <div
                        className="relative group border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {vision.banner ? (
                            <div className="relative aspect-video w-full max-w-2xl">
                                <img
                                    src={vision.banner}
                                    alt="Vision banner"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                    <div className="text-white text-center">
                                        <Camera className="w-8 h-8 mx-auto mb-2" />
                                        <p>Click to change banner</p>
                                    </div>
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
                                    <p>Uploading...</p>
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

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    {editingTitle ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                className="flex-1"
                                placeholder="Vision title..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleTitleSave();
                                    if (e.key === 'Escape') setEditingTitle(false);
                                }}
                                autoFocus
                            />
                            <Button className="text-xs h-full" onClick={handleTitleSave} size="sm">Save</Button>
                            <Button className="h-full" onClick={() => setEditingTitle(false)} variant="outline" size="sm">
                                <X size={20} />
                            </Button>
                        </div>
                    ) : (
                        <div
                            className="group flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
                            onClick={handleTitleEdit}
                        >
                            <span className="flex-1 text-sm">{vision.title}</span>
                            <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    {editingDescription ? (
                        <div className="space-y-2">
                            <Textarea
                                value={descriptionValue}
                                onChange={(e) => setDescriptionValue(e.target.value)}
                                className="text-sm w-full p-3 border rounded-lg resize-none"
                                rows={3}
                                placeholder="Describe your vision..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setEditingDescription(false);
                                }}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button className="text-xs" onClick={handleDescriptionSave} size="sm">Save</Button>
                                <Button className="text-xs" onClick={() => setEditingDescription(false)} variant="outline" size="sm">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="group p-3 rounded-lg border hover:bg-gray-50 cursor-pointer min-h-[60px] flex items-start gap-2"
                            onClick={handleDescriptionEdit}
                        >
                            <span className="text-sm flex-1 text-gray-700">
                                {vision.description || "Add a description..."}
                            </span>
                            <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
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
