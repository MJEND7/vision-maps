"use client";

import React, { createContext, useContext } from 'react';
import type { UserResource } from '@clerk/types';

interface ProfileUserContextType {
  user: UserResource | null | undefined;
}

const ProfileUserContext = createContext<ProfileUserContextType | undefined>(undefined);

export const ProfileUserProvider: React.FC<{
  user: UserResource | null | undefined;
  children: React.ReactNode;
}> = ({ user, children }) => {
  return (
    <ProfileUserContext.Provider value={{ user }}>
      {children}
    </ProfileUserContext.Provider>
  );
};

export const useProfileUser = (): ProfileUserContextType => {
  const context = useContext(ProfileUserContext);
  if (context === undefined) {
    throw new Error('useProfileUser must be used within a ProfileUserProvider');
  }
  return context;
};