"use client";

import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { UserButton } from '@clerk/nextjs';

export default function VisionDetailPage() {
  const params = useParams();
  const visionId = params.vision_id as string;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <h1 className="text-2xl font-display font-bold">Vision Detail</h1>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
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
    </div>
  );
}