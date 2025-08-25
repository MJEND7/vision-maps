"use client";

import { motion } from 'motion/react';
import ProfileNav from '@/components/profile/ProfileNav';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import { timeSinceFromDateString } from '@/utils/date';
import AvatarStack from '@/components/ui/avatar-stack';
import { useState } from 'react';
import { useProfileUser } from '@/contexts/ProfileUserContext';

export default function SheetsPage() {
    const { user } = useProfileUser();
    const router = useRouter();
    const [visions, setVisions] = useState([{
        id: 1,
        title: "The Vision",
        description: "A visions to rule them all",
        activeUsers: [user, user, user, user],
        createdAt: new Date()
    }])

    return (
            <main className="max-w-7xl space-y-10 mx-auto p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-lg p-6"
                >
                    <h2 className="text-xl font-semibold mb-4">Your Sheets</h2>
                    <p className="text-muted-foreground">
                        Welcome to your sheets dashboard. This is where you&apos;ll manage your vision maps.
                    </p>
                </motion.div>
                {
                    visions.length === 0 ? (
                        // This block runs if visions array is empty
                        <div className="text-center text-gray-500 py-10">
                            No visions to display yet. Create one!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {visions.map((vision) => (
                                <button
                                    key={vision.id}
                                    onClick={() => router.push(`${ROUTES.PROFILE.VISIONS}/${vision.id}`)}
                                    className="cursor-pointer hover:shadow-xl hover:scale-101 transition-all ease-in-out shadow-lg flex flex-col justify-between rounded-xl border"
                                >
                                    <div className="flex h-[200px] items-center justify-center">
                                        <h1 className="text-lg">
                                            {vision.title || 'Untitled Vision'}
                                        </h1>
                                    </div>
                                    <hr />
                                    <div className="space-y-2 p-3 text-left text-xs">
                                        <p className="w-full truncate">
                                            {vision.description || 'No description provided.'}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            {' '}
                                            <p className="text-primary/30">
                                                {timeSinceFromDateString(vision.createdAt || new Date())}
                                            </p>
                                            <AvatarStack users={vision.activeUsers || []} />
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
