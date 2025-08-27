"use client";

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { timeSinceFromDateString } from '@/utils/date';
import { useState, useEffect } from 'react';
import { Map, Scan, Search, Grid3X3, List, Plus, Trash2, MoreHorizontal, Download, Share } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { Id } from '@/../convex/_generated/dataModel';
import { toast } from 'sonner';
import { StaticFacePile } from '@/components/ui/face-pile';
import { VisionTableSkeleton, VisionGridSkeleton } from '@/components/vision-skeletons';
import ProfileNav from '@/components/profile/ProfileNav';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@clerk/nextjs';

export default function SheetsPage() {
    const router = useRouter();
    const { isLoaded, isSignedIn } = useUser();
    const LOCAL_VIEW_MODE = "visions-view-mode";

    const [selectedOrg, setSelectedOrg] = useState("all");
    const [sortBy, setSortBy] = useState("updatedAt");
    const [viewMode, setViewMode] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [visionToDelete, setVisionToDelete] = useState<Id<"visions"> | null>(null);

    // Initialize view mode from localStorage
    useEffect(() => {
        const localViewMode = localStorage.getItem(LOCAL_VIEW_MODE);
        if (localViewMode) {
            setViewMode(localViewMode);
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
        isLoaded && isSignedIn ? {
            search: debouncedSearch || undefined,
            organization: selectedOrg === "all" ? undefined : selectedOrg,
            sortBy: sortBy as "updatedAt" | "createdAt" | "title",
            limit: 50
        } : "skip"
    );

    const createVision = useMutation(api.visions.create);
    const deleteVision = useMutation(api.visions.remove);

    const newVision = async () => {
        //Create blank vision in convex
        const id = await createVision({});
        router.push(`${ROUTES.PROFILE.VISIONS}/${id}`)
    }

    const handleDelete = (visionId: Id<"visions">) => {
        setVisionToDelete(visionId);
        setIsDeleteOpen(true);
    }

    const handleExport = (visionId: Id<"visions">) => {
        // TODO: Implement export functionality
        console.log(visionId)
        toast.success("Export feature coming soon!");
    }

    const handleShare = (visionId: Id<"visions">) => {
        // TODO: Implement share functionality
        console.log(visionId)
        toast.success("Share feature coming soon!");
    }

    const visions = visionsData?.visions || [];
    const isLoading = visionsData === undefined;

    // Show full screen skeleton while user authentication is loading
    if (!isLoaded || !isSignedIn) {
        return (
            <>
                <div className="py-[36px]">
                    <ProfileNav />
                </div>
                <main className="max-w-7xl space-y-5 mx-auto p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-card border border-border rounded-lg p-4 sm:p-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <Skeleton className="h-6 w-48 mb-2" />
                                <Skeleton className="h-4 w-80" />
                            </div>
                            <Skeleton className="h-10 w-32 rounded-lg" />
                        </div>
                    </motion.div>

                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                        <div className="flex w-full gap-2 items-center">
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="h-8 w-32" />
                        </div>

                        <div className="sm:w-auto w-full flex gap-2">
                            <div className="relative w-full sm:w-[300px]">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                    size={16}
                                />
                                <Input
                                    type="text"
                                    placeholder="Search visions..."
                                    disabled
                                    className="pl-8 h-[40px] sm:h-[32px] placeholder:text-xs text-sm rounded-md opacity-50"
                                />
                            </div>
                            <div className="flex items-center border border-border h-[40px] sm:h-[32px] rounded-md">
                                <button
                                    disabled
                                    className={`h-full w-10 flex items-center justify-center rounded-l-sm transition-colors ${viewMode === "grid"
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/50"
                                        }`}
                                >
                                    <Grid3X3 size={16} />
                                </button>
                                <button
                                    disabled
                                    className={`h-full w-10 flex items-center justify-center rounded-r-sm transition-colors ${viewMode === "table"
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/50"
                                        }`}
                                >
                                    <List size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {viewMode === "grid" ? <VisionGridSkeleton /> : viewMode === "table" ? <VisionTableSkeleton /> : ( null ) }
                </main>
            </>
        );
    }

    return (
        <>
            <div className="py-[36px]">
                <ProfileNav />
            </div>

            <main className="max-w-7xl space-y-5 mx-auto p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-lg p-4 sm:p-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="sm:text-xl text-lg font-semibold">Your Vision Maps</h2>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                                Welcome to your vision dashboard. This is where you&apos;ll manage your visions.
                            </p>
                        </div>
                        <Button size={"lg"} className="rounded-lg" onClick={newVision}>
                            <Plus className="w-4 h-4" />
                            New Vision
                        </Button>
                    </div>
                </motion.div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <div className="flex w-full gap-2 items-center">
                        <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                            <SelectTrigger size='sm' className='sm:w-auto w-full'>
                                <SelectValue placeholder="All organizations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All organizations</SelectItem>
                                <SelectItem value="personal">Personal</SelectItem>
                                <SelectItem value="company">Company</SelectItem>
                                <SelectItem value="team">Team</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger size="sm">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="updatedAt">Last updated</SelectItem>
                                <SelectItem value="createdAt">Date created</SelectItem>
                                <SelectItem value="title">Name</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="sm:w-auto w-full flex gap-2">
                        <div className="relative w-full sm:w-[300px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                            <Input
                                type="text"
                                placeholder="Search visions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-[40px] sm:h-[32px] placeholder:text-xs text-sm rounded-md"
                            />
                        </div>
                        <div className="flex items-center border border-border h-[40px] sm:h-[32px] rounded-md">
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
                    </div>
                </div>
                {
                    isLoading ? (
                        viewMode === "grid" ? <VisionGridSkeleton /> : <VisionTableSkeleton />
                    ) : visions.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            No visions to display yet. Create one!
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`}>
                            {visions.map((vision) => (
                                <div
                                    key={vision._id}
                                    className="hover:shadow-xl transition-all ease-in-out shadow-lg flex flex-col justify-between rounded-3xl border"
                                >
                                    <button
                                        onClick={() => router.push(`${ROUTES.PROFILE.VISIONS}/${vision._id}`)}
                                        className="group relative flex h-[200px] items-center justify-center hover:shadow-inner rounded-3xl">
                                        <div className="absolute right-5 top-5 transition-all duration-300 ease-in-out opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                                            <Scan />
                                        </div>
                                        <h1 className="text-lg">
                                            {vision.title || 'Untitled Vision'}
                                        </h1>
                                    </button>
                                    <hr />
                                    <div className="flex gap-3 items-start bg-accent rounded-b-3xl space-y-1 px-3 py-2 text-left text-xs">
                                        <div className='text-white mt-1 rounded-md bg-blue-400 p-2'>
                                            <Map size={15} />
                                        </div>
                                        <div className="w-full">
                                            <div className="flex justify-between items-start">
                                                <div className='w-full'>
                                                    <p className="text-sm sm:text-md text-primary">
                                                        {vision.title || 'No description provided.'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {vision.description || 'No description provided.'}
                                                    </p>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                            }}
                                                            className="p-1 hover:bg-muted rounded transition-colors"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="text-muted-foreground" align="end">
                                                        <DropdownMenuItem onClick={() => handleShare(vision._id)}>
                                                            <Share className="hover:text-primary w-4 h-4 mr-2" />
                                                            Share
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleExport(vision._id)}>
                                                            <Download className="hover:text-primary w-4 h-4 mr-2" />
                                                            Export
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={() => handleDelete(vision._id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-primary/30">
                                                    Updated {timeSinceFromDateString(vision.createdAt || new Date())}
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
                                            onClick={() => router.push(`${ROUTES.PROFILE.VISIONS}/${vision._id}`)}
                                            className="relative flex w-[100px] sm:h-[100px] sm:w-[250px] items-center justify-center">
                                            <div className="absolute left-2 top-2">
                                                <div className='rounded-sm text-white bg-blue-400 p-1'>
                                                    <Map size={15} />
                                                </div>
                                            </div>
                                            <h1 className="text-lg font-medium">
                                                {vision.title || 'Untitled Vision'}
                                            </h1>
                                        </button>
                                        <div className="flex-1 flex flex-col gap-2 bg-accent rounded-none rounded-r-xl px-3 py-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-left text-sm sm:text-[1.1rem] text-primary">
                                                    {vision.title || 'No description provided.'}
                                                </p>
                                                <div className="flex items-center ">
                                                    <StaticFacePile visionId={vision._id} />
                                                    {/* Desktop: Show inline buttons */}
                                                    <div className="hidden sm:flex items-center">
                                                        <button
                                                            onClick={() => handleShare(vision._id)}
                                                            className="p-1.5 hover:bg-muted rounded transition-colors"
                                                            title="Share"
                                                        >
                                                            <Share className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleExport(vision._id)}
                                                            className="p-1.5 hover:bg-muted rounded transition-colors"
                                                            title="Export"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(vision._id)}
                                                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {/* Mobile: Show 3-dot menu */}
                                                    <div className="sm:hidden">
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
                                                                <DropdownMenuItem onClick={() => handleShare(vision._id)}>
                                                                    <Share className="w-4 h-4 mr-2" />
                                                                    Share
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleExport(vision._id)}>
                                                                    <Download className="w-4 h-4 mr-2" />
                                                                    Export
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onClick={() => handleDelete(vision._id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-left space-y-1">
                                                <p className="text-xs text-muted-foreground">
                                                    {vision.description || 'No description provided.'}
                                                </p>
                                                <p className="text-primary/30 text-xs">
                                                    Updated {timeSinceFromDateString(vision.createdAt || new Date())}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }

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
            </main>
        </>
    );
}
