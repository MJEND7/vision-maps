"use client";

import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';

interface SidebarContextType {
  openChat: (chatId: string) => void;
  rightSidebarContentRef: React.RefObject<{ 
    openChat: (chatId: string) => void;
    openNodeComments: (nodeId: string) => void;
    openCommentChat: (chatId: string) => void;
  } | null>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
  onOpenChat: (chatId: string) => void;
  rightSidebarContentRef: React.RefObject<{ 
    openChat: (chatId: string) => void;
    openNodeComments: (nodeId: string) => void;
    openCommentChat: (chatId: string) => void;
  } | null>;
}

export function SidebarProvider({ 
  children, 
  onOpenChat, 
  rightSidebarContentRef 
}: SidebarProviderProps) {
  const openChat = useCallback((chatId: string) => {
    onOpenChat(chatId);
  }, [onOpenChat]);

  const value: SidebarContextType = useMemo(() => ({
    openChat,
    rightSidebarContentRef,
  }), [openChat, rightSidebarContentRef]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}