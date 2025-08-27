"use client";

import { useParams } from 'next/navigation';
//import { motion } from 'motion/react';
import { PresenceFacePile } from '@/components/ui/face-pile';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function VisionDetailPage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const params = useParams();
    const visionId = params.id as string;

    if (!isLoaded || !isSignedIn) {
        return ( null ) // Todo Skeletion loader
    }

    return (
        <main className="h-screen p-2 flex gap-2">
            {/* Left bar */}
            <div className="h-full flex flex-col gap-2 justify-between">
                <div
                    className="h-full w-[280px] bg-card border border-border rounded-xl p-6"
                >
                    <div className='flex justify-between'>
                        <h2 className="text-xl font-semibold mb-4">Vision</h2>
                    </div>
                </div>
                <div
                    className="h-[30%] w-[280px] bg-card border border-border rounded-xl p-6"
                >
                    <div className='flex justify-between'>
                        <h2 className="text-xl font-semibold mb-4">Members</h2>
                    </div>
                </div>
            </div>

            {/* Middle */}
            <div className="h-full w-full bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Frame 1</h2>
            </div>

            {/* Right bar */}
            <div className="h-full w-[400px] bg-card border border-border rounded-xl p-4">
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
