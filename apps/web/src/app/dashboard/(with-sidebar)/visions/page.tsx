"use client";

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { timeSinceFromDateString } from '@/utils/date';
import { useState, useEffect } from 'react';
import { Map, Scan, Search, Grid3X3, List, Plus, Trash2, MoreHorizontal, Download, Share, Filter, Lock, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { toast } from 'sonner';
import { StaticFacePile } from '@/components/ui/face-pile';
import { VisionTableSkeleton, VisionGridSkeleton } from '@/components/vision-skeletons';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Plan } from '@/lib/permissions';
import { UpgradeDialog } from '@/components/ui/upgrade-dialog';

export default function VisionsPage() {
    const router = useRouter();
    const { organization } = useOrganization();
    const { canCreateVision: checkCanCreateVision, visionLimit, plan } = usePermissions();
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

    const LOCAL_VIEW_MODE = "visions-view-mode";

    const [sortBy, setSortBy] = useState("updatedAt");
    const [viewMode, setViewMode] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [visionToDelete, setVisionToDelete] = useState<Id<"visions"> | null>(null);
    const [isLeaveOpen, setIsLeaveOpen] = useState(false);
    const [visionToLeave, setVisionToLeave] = useState<Id<"visions"> | null>(null);

    // Initialize view mode from localStorage with mobile-first grid default
    useEffect(() => {
        const localViewMode = localStorage.getItem(LOCAL_VIEW_MODE);
        if (localViewMode) {
            setViewMode(localViewMode);
        } else {
            setViewMode("grid");
        }
    }, []);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const setLocalViewMode = (m: string) => {
        localStorage.setItem(LOCAL_VIEW_MODE, m)
        setViewMode(m)
    }

    // Convex queries and mutations - only call when authenticated
    const visionsData = useQuery(
        api.visions.list,
        organization?._id ? {
            search: debouncedSearch || undefined,
            workspaceId: organization._id,
            sortBy: sortBy as "updatedAt" | "createdAt" | "title",
            limit: 50
        } : "skip",
    );

    const createVision = useMutation(api.visions.create);
    const deleteVision = useMutation(api.visions.remove);
    const leaveVision = useMutation(api.visions.leaveVision);

    const visions = visionsData?.visions || [];
    const visionCount = visions.length;
    const canCreate = checkCanCreateVision(visionCount);

    // Check if user is in org but doesn't have Teams tier
    const isInOrgWithoutTeams = organization && plan !== Plan.TEAMS;

    const newVision = async () => {
        // If in org without Teams tier, show upgrade prompt
        if (isInOrgWithoutTeams) {
            setShowUpgradeDialog(true);
            return;
        }

        if (!canCreate) {
            setShowUpgradeDialog(true);
            return;
        }

        const id = await createVision({
            workspaceId: organization?._id!
        });
        router.push(`${ROUTES.PROFILE.VISIONS}/${id}`);
    };

    const handleDelete = (visionId: Id<"visions">) => {
        setVisionToDelete(visionId);
        setIsDeleteOpen(true);
    };

    const handleLeave = (visionId: Id<"visions">) => {
        setVisionToLeave(visionId);
        setIsLeaveOpen(true);
    };

    const handleExport = (visionId: Id<"visions">) => {
        console.log(visionId);
        toast.success("Export feature coming soon!");
    };

    const handleShare = (visionId: Id<"visions">) => {
        console.log(visionId);
        toast.success("Share feature coming soon!");
    };

    const isLoading = visionsData === undefined;

    // Component for vision menu items with role awareness
    const VisionMenuItems = ({ visionId }: { visionId: Id<"visions"> }) => {
        const userRole = useQuery(api.visions.getUserRole, { visionId });
        const isOwner = userRole === "owner";

        return (
            <>
                <DropdownMenuItem onClick={() => handleShare(visionId)}>
                    <Share className="w-4 h-4 mr-2" />
                    Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(visionId)}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isOwner ? (
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(visionId)}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleLeave(visionId)}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave
                    </DropdownMenuItem>
                )}
            </>
        );
    };

    return (
        <>
            {/* Upgrade Dialog */}
            <UpgradeDialog
                open={showUpgradeDialog}
                onOpenChange={setShowUpgradeDialog}
                reason={isInOrgWithoutTeams ? "teams" : "vision_limit"}
                currentLimit={visionLimit}
            />

            <div className="max-w-7xl space-y-5 mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-8 lg:pt-16">

                <div
                    className={`bg-card border border-border rounded-xl p-4 sm:p-6 lg:p-8 shadow-sm ${isInOrgWithoutTeams ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:gap-6">
                        <div className="space-y-1">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                                {organization ? `${organization.name} Vision Maps` : 'Your Vision Maps'}
                            </h2>
                            <p className="text-muted-foreground text-sm sm:text-base">
                                {organization
                                    ? `Manage visions for ${organization.name} organization.`
                                    : 'Welcome to your personal vision dashboard.'
                                }
                            </p>
                        </div>
                        <Button
                            size={"lg"}
                            className="rounded-xl px-6 py-3 text-base font-medium"
                            onClick={newVision}
                            title={
                                isInOrgWithoutTeams
                                    ? "Upgrade to Teams to use organizations"
                                    : (!canCreate ? `Upgrade to create more visions (limit: ${visionLimit})` : "")
                            }
                        >
                            <Plus className="w-6 h-6" />
                            New Vision
                        </Button>
                    </div>
                </div>

                <div className={`sm:w-auto sm:items-center sm:justify-end w-full flex gap-2 ${isInOrgWithoutTeams ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            type="text"
                            placeholder="Search visions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 rounded-md"
                        />
                    </div>

                    <div className="flex items-center border border-border h-[40px] rounded-md">
                        <button
                            onClick={() => setLocalViewMode("grid")}
                            className={`h-full w-10 flex items-center justify-center rounded-l-sm transition-colors ${viewMode === "grid"
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                                }`}
                        >
                            <Grid3X3 size={16} />
                        </button>
                        <button
                            onClick={() => setLocalViewMode("table")}
                            className={`h-full w-10 flex items-center justify-center rounded-r-sm transition-colors ${viewMode === "table"
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                                }`}
                        >
                            <List size={16} />
                        </button>
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="flex items-center justify-center h-[40px] w-[40px] border border-border rounded-md hover:bg-accent/50 transition-colors">
                                <Filter size={16} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="end">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Sort by</label>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="updatedAt">Last updated</SelectItem>
                                            <SelectItem value="createdAt">Date created</SelectItem>
                                            <SelectItem value="title">Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Rest of your content remains the same */}
                <div className="relative">
                    {isInOrgWithoutTeams && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full absolute mt-30 flex items-center justify-center z-50 pointer-events-none px-4"
                        >
                            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-8 max-w-md w-full shadow-2xl bg-background/95 backdrop-blur-sm pointer-events-auto">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="p-4 bg-primary/10 rounded-lg">
                                        <Lock className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">Teams Plan Required</h3>
                                        <p className="text-sm text-muted-foreground">
                                            You need the Teams tier to use organizations.
                                            Upgrade this organization now for full collaboration features.
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={() => router.push('/pricing')}
                                        className="w-full"
                                    >
                                        View Pricing
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Gray overlay only for visions list */}
                    <div className={isInOrgWithoutTeams ? 'relative opacity-50 pointer-events-none' : ''}>
                        {
                            isLoading ? (
                                viewMode === "grid" ? <VisionGridSkeleton /> : <VisionTableSkeleton />
                            ) : visions.length === 0 ? (
                                <div className={`${isInOrgWithoutTeams ? "hidden" : ""} text-center text-gray-500 py-10`}>
                                    No visions to display yet. Create one!
                                </div>
                            ) : viewMode === "grid" ? (
                                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3`}>
                                    {visions.map((vision) => (
                                        <div
                                            key={vision._id}
                                            className="hover:shadow-xl transition-all ease-in-out shadow-lg flex flex-col justify-between rounded-3xl border"
                                        >
                                            {/* Banner / Header button */}
                                            <button
                                                onClick={() =>
                                                    router.push(`${ROUTES.PROFILE.VISIONS}/${vision._id}`)
                                                }
                                                style={{ backgroundImage: `url(${vision.banner})` }}
                                                className="group relative flex h-[200px] items-center justify-center 
       hover:shadow-inner rounded-t-3xl bg-cover bg-center"
                                            >
                                                {/* Scan button on hover */}
                                                <div className="bg-background text-primary p-[5px] rounded-md absolute right-5 top-5 transition-all duration-300 ease-in-out opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                                                    <Scan size={18} />
                                                </div>
                                                <h1 className={`${vision.banner ? "hidden" : ""} text-lg`}>
                                                    {vision.title || "Untitled Vision"}
                                                </h1>
                                            </button>

                                            <hr />

                                            {/* Content area */}
                                            <div className="flex gap-3 items-start bg-accent rounded-b-3xl space-y-1 px-3 py-2 text-left text-xs">
                                                <div className="text-white mt-1 rounded-md bg-blue-400 p-2">
                                                    <Map size={15} />
                                                </div>

                                                <div className="w-full min-w-0">
                                                    <div className="flex gap-2 items-start min-w-0">
                                                        <p className="flex-1 truncate text-sm sm:text-md text-primary">
                                                            {vision.title || "No description provided."}
                                                        </p>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                    }}
                                                                    className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                                                                >
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>

                                                            <DropdownMenuContent
                                                                className="text-muted-foreground"
                                                                align="end"
                                                            >
                                                                <VisionMenuItems visionId={vision._id} />
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <p className="truncate text-xs text-muted-foreground w-full">
                                                        {vision.description || "No description provided."}
                                                    </p>

                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-primary/30">
                                                            Updated{" "}
                                                            {timeSinceFromDateString(
                                                                new Date(vision.updatedAt) || new Date()
                                                            )}
                                                        </p>
                                                        <StaticFacePile visionId={vision._id} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {visions.map((vision) => (
                                        <div
                                            key={vision._id}
                                            className="w-full group  hover:shadow-xl transition-all ease-in-out shadow-lg rounded-xl border bg-card"
                                        >
                                            <div className="flex flex-row">
                                                <button
                                                    style={{ backgroundImage: `url(${vision.banner})` }}
                                                    onClick={() => router.push(`${ROUTES.PROFILE.VISIONS}/${vision._id}`)}
                                                    className="relative bg-cover rounded-l-xl flex w-[100px] sm:h-[100px] sm:w-[250px] items-center justify-center">
                                                    <div className="absolute left-2 top-2">
                                                        <div className='rounded-sm text-white bg-blue-400 p-1'>
                                                            <Map size={15} />
                                                        </div>
                                                    </div>
                                                    <h1 className={`${vision.banner ? "hidden" : ""} text-lg`}>
                                                        {vision.title || 'Untitled Vision'}
                                                    </h1>
                                                </button>
                                                <div className="flex-1 flex flex-col justify-between bg-accent rounded-none rounded-r-xl p-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-left text-sm sm:text-[1.1rem] text-primary">
                                                            {vision.title || 'No description provided.'}
                                                        </p>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                    }}
                                                                    className="p-1.5 hover:bg-muted rounded transition-colors"
                                                                >
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <VisionMenuItems visionId={vision._id} />
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    <div className="flex justify-between items-end ">
                                                        <div className="text-left space-y-1">
                                                            <p className="text-xs text-muted-foreground">
                                                                {vision.description || 'No description provided.'}
                                                            </p>
                                                            <p className="text-primary/30 text-xs">
                                                                Updated {timeSinceFromDateString(new Date(vision.updatedAt) || new Date())}
                                                            </p>
                                                        </div>
                                                        <StaticFacePile visionId={vision._id} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Vision</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this vision? This action cannot be undone and will delete all associated channels, frames, and nodes.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    if (!visionToDelete) return;
                                    try {
                                        await deleteVision({ id: visionToDelete });
                                        toast.success("Vision deleted successfully!");
                                        setIsDeleteOpen(false);
                                        setVisionToDelete(null);
                                    } catch (error) {
                                        toast.error("Failed to delete vision");
                                        console.error(error);
                                    }
                                }}
                            >
                                Delete Vision
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Leave Vision Confirmation Dialog */}
                <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Leave Vision</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to leave this vision? You will lose access to all content unless invited back.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsLeaveOpen(false)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    if (!visionToLeave) return;
                                    try {
                                        await leaveVision({ visionId: visionToLeave });
                                        toast.success("Left vision successfully!");
                                        setIsLeaveOpen(false);
                                        setVisionToLeave(null);
                                    } catch (error: any) {
                                        toast.error(error.message || "Failed to leave vision");
                                        console.error(error);
                                    }
                                }}
                            >
                                Leave Vision
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
