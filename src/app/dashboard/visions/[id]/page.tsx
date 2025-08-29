"use client";

import { useParams } from 'next/navigation';
//import { motion } from 'motion/react';
import { PresenceFacePile } from '@/components/ui/face-pile';
import { Button } from '@/components/ui/button';
import { Frame, Hash, Play, Settings, TableProperties, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import FrameComponent from '@/components/vision/frame';
import { useState } from 'react';
import Channel from '@/components/vision/channel';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Vision } from '../../../../../convex/tables/visions';
import SettingsComponent from '@/components/vision/settings';

enum ViewMode {
    CHANNEL = "channel",
    FRAME = "frame",
    SETTINGS = "Settings"
}

function TitleCard({ isLoading, vision, OpenSettings }: { isLoading: boolean, vision?: Vision, OpenSettings: (id: string) => void }) {
    if (isLoading || !vision) {
        return (
            <div>

            </div>
        )
    }

    return (
        <div className='w-full flex flex-col gap-1 p-4'>
            <div className="w-full flex justify-between items-center">
                <h1 className="flex gap-1 items-center text-left text-lg font-semibold">
                    {vision?.title}
                </h1>
                <button onClick={() => OpenSettings(vision._id.toString())}>
                    <Settings size={15} />
                </button>
            </div>
            <h2 className="text-left text-xs text-muted-foreground truncate">
                {vision?.description || "No description provided"}
            </h2>
        </div>
    )
}

export default function VisionDetailPage() {
    const { isLoaded, isSignedIn } = useUser();
    const params = useParams();
    const visionId = params.id as Id<"visions">;
    const [viewMode, setViewMode] = useState<ViewMode | null>(null);
    const [tabs, setTab] = useState<{ title: string, id: string, type: ViewMode }[]>([]);
    const [selectedTab, setSelectedTab] = useState<{ title: string, id: string, type: ViewMode } | null>(null)


    // ✅ Always call useQuery, but only pass params if ready
    const vision = useQuery(
        api.visions.get,
        isLoaded && isSignedIn ? { id: visionId } : "skip"
    );

    const isLoading = vision === undefined;

    if (!isLoaded || !isSignedIn) {
        return (
            null
        );
    }

    const renderContent = () => {
        switch (selectedTab?.type) {
            case ViewMode.CHANNEL:
                return <Channel id={selectedTab.id} />;
            case ViewMode.FRAME:
                return <FrameComponent id={selectedTab.id} />;
            case ViewMode.SETTINGS:
                return <SettingsComponent id={selectedTab.id} />;
            default:
                return (
                    <p className="flex h-full w-full items-center justify-center text-center text-sm text-primary/70 bg-accent">
                        No file selected
                    </p>
                );
        }
    };

    const renderTabIcon = (t: ViewMode) => {
        const size = 15;
        switch (t) {
            case ViewMode.CHANNEL:
                return <TableProperties size={size} />
            case ViewMode.FRAME:
                return <Frame size={size} />
            case ViewMode.SETTINGS:
                return <Settings size={size} />
            default:
                return null
        }
    }

    const openTab = (tab: ViewMode, id: string) => {
        const index = tabs.findIndex((t) => t.id == id);
        if (index >= 0) {
            setSelectedTab(tabs[index])
            return
        }

        newTab(tab, id);
    }

    const newTab = (tab: ViewMode, id: string) => {
        setTab((t) => {
            const newTab = { title: tab, id: id, type: tab };
            const arr = [...t, newTab];

            if (t.length == 0) {
                setSelectedTab(newTab)
            }

            return arr;

        })
    }

    const removeTab = (index: number) => {
        setTab((t) => {
            const arr = t.filter((_, i) => i != index)
            if (arr.length == 0) {
                setSelectedTab(null)
            }

            return arr;
        })
    }

    return (
        <main className="h-screen flex">
            {/* Left bar */}
            <div className="h-full flex flex-col gap-2 justify-between">
                <div
                    className="h-full w-[280px] bg-card border border-border"
                >
                    <TitleCard
                        OpenSettings={(id) => {
                            openTab(ViewMode.SETTINGS, id)
                        }}
                        isLoading={isLoading}
                        vision={vision}
                    />
                    <hr />
                </div>
            </div>

            {/* Middle */}
            <div className="overflow-hidden w-full bg-background">
                <div className="flex w-full pt-2 px-2 h-8 bg-accent">
                    {tabs.map((t, i) => (
                        <button key={i} onClick={() => setSelectedTab(t)} className="w-[150px] flex bg-background rounded-t-lg p-2 justify-between items-center">
                            <p className="flex items-center gap-1 text-xs truncate">
                                {renderTabIcon(t.type)}
                                {t.title}
                            </p>

                            <button onClick={() => removeTab(i)}>
                                <X size={15} />
                            </button>
                        </button>
                    ))}
                </div>
                {renderContent()}
            </div>

            {/* Right bar */}
            <div className="h-full w-[400px] bg-card border border-border p-4">
                <div className="flex justify-between">
                    <div className="">
                        <PresenceFacePile visionId={visionId} />
                    </div>

                    <div className="flex items-center gap-1">
                        <Button className="text-xs" size={"sm"} variant={"outline"}>
                            <Play />
                        </Button>
                        <Button className="text-xs" size={"sm"} variant={"outline"}>
                            Share
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
