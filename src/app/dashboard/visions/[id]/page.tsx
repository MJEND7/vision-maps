"use client";

import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { useProfileUser } from '@/contexts/ProfileUserContext';
import FacePile from '@/components/ui/face-pile';

export default function VisionDetailPage() {
    const { user } = useProfileUser();
    const params = useParams();
    const visionId = params.id as string;

    if (!user || !user?.fullName) {
        throw new Error("Failed to get user")
    }

    return (
        <main className="max-w-7xl mx-auto p-6">
            <FacePile visionId={visionId} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-lg p-6"
            >
                <h2 className="text-xl font-semibold mb-4">Vision ID: {visionId}</h2>
                <p className="text-muted-foreground">
                    This is a placeholder for the vision detail page. Vision mapping functionality will be implemented here.
                </p>
            </motion.div>
        </main>
    );
}
