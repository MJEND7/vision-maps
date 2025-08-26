"use client";

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { timeSinceFromDateString } from '@/utils/date';
import AvatarStack from '@/components/ui/avatar-stack';
import { useState } from 'react';
import { useProfileUser } from '@/contexts/ProfileUserContext';
import { Map, Scan, Search, Grid3X3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SheetsPage() {
    const { user } = useProfileUser();
    const router = useRouter();
    const [visions, setVisions] = useState([{
        id: 1,
        title: "A Vision",
        description: "A visions to rule them all",
        activeUsers: [user, user, user, user],
        createdAt: new Date()
    }])

    const [selectedOrg, setSelectedOrg] = useState("all");
    const [sortBy, setSortBy] = useState("updated");
    const [viewMode, setViewMode] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? "table" : "grid");
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <main className="max-w-7xl space-y-5 mx-auto p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-lg p-6"
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">Your Vision Maps</h2>
                        <p className="text-muted-foreground text-sm">
                            Welcome to your vision dashboard. This is where you&apos;ll manage your visions.
                        </p>
                    </div>

                </div>
            </motion.div>
            <div className="flex flex-col-reverse sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2 items-center">
                    <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                        <SelectTrigger className="max-w-[180px]">
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
                        <SelectTrigger className="max-w-[150px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="updated">Last updated</SelectItem>
                            <SelectItem value="created">Date created</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="size">Size</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            type="text"
                            placeholder="Search visions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center border border-border rounded-lg">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`h-full w-10 flex items-center justify-center rounded-l-lg transition-colors ${viewMode === "grid"
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                                }`}
                        >
                            <Grid3X3 size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`h-full w-10 flex items-center justify-center rounded-r-lg transition-colors ${viewMode === "table"
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
                visions.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        No visions to display yet. Create one!
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {visions.map((vision) => (
                            <button
                                key={vision.id}
                                onClick={() => router.push(`${ROUTES.PROFILE.VISIONS}/${vision.id}`)}
                                className="sm:w-[400px] group cursor-pointer hover:shadow-xl transition-all ease-in-out shadow-lg flex flex-col justify-between rounded-3xl border"
                            >
                                <div className="relative flex h-[200px] items-center justify-center">
                                    <div className="absolute right-5 top-5 transition-all duration-300 ease-in-out opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                                        <Scan />
                                    </div>
                                    <h1 className="text-lg">
                                        {vision.title || 'Untitled Vision'}
                                    </h1>
                                </div>
                                <hr />
                                <div className="flex gap-3 items-center bg-accent rounded-b-3xl space-y-1 p-3 text-left text-xs">
                                    <div className=' rounded-lg bg-background p-2'>
                                        <Map size={15} />
                                    </div>
                                    <div className="w-full">
                                        <p className="w-full truncate">
                                            {vision.description || 'No description provided.'}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-primary/30">
                                                Updated {timeSinceFromDateString(vision.createdAt || new Date())}
                                            </p>
                                            <AvatarStack users={vision.activeUsers || []} />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {visions.map((vision) => (
                            <button
                                key={vision.id}
                                onClick={() => router.push(`${ROUTES.PROFILE.VISIONS}/${vision.id}`)}
                                className="w-full group cursor-pointer hover:shadow-xl transition-all ease-in-out shadow-lg rounded-xl border bg-card"
                            >
                                <div className="flex flex-row">
                                    <div className="relative flex w-[200px] h-[120px] sm:h-[100px] sm:w-[200px] items-center justify-center">
                                        <div className="absolute left-2 top-2">
                                            <div className=' rounded-sm bg-accent p-1'>
                                                <Map size={15} />
                                            </div>
                                        </div>
                                        <h1 className="text-lg font-medium">
                                            {vision.title || 'Untitled Vision'}
                                        </h1>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="sm:w-auto w-[200px] flex gap-3 items-start bg-accent rounded-none rounded-r-xl p-3 text-left text-xs h-full">
                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm text-muted-foreground">
                                                    {vision.description || 'No description provided.'}
                                                </p>
                                                <div className="flex sm:flex-row flex-col-reverse items-start justify-between gap-5">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <p className="text-primary/30 text-xs">
                                                            Updated {timeSinceFromDateString(vision.createdAt || new Date())}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <AvatarStack users={vision.activeUsers || []} />
                                                        <span className="sm:inline hidden text-xs text-muted-foreground">
                                                            {vision.activeUsers?.length || 0} collaborators
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            }
        </main>
    );
}
