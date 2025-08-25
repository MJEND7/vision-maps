"use client";

import { UserButton } from '@clerk/nextjs';
import { motion } from 'motion/react';
import { useProfileUser } from '@/contexts/ProfileUserContext';

export default function SheetsPage() {
  const { user } = useProfileUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <h1 className="text-2xl font-display font-bold">Vision Maps - Sheets</h1>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.firstName || user?.username || 'User'}
            </span>
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
          <h2 className="text-xl font-semibold mb-4">Your Sheets</h2>
          <p className="text-muted-foreground">
            Welcome to your sheets dashboard. This is where you&apos;ll manage your vision maps.
          </p>
        </motion.div>
      </main>
    </div>
  );
}