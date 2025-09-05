"use client"

import React, { createContext, useContext, useMemo, useCallback, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

export type NodeUser = {
  _id: Id<"users">
  name: string
  email?: string
  profileImage?: string
}

type NodeUserCacheState = {
  nodeUsers: Map<Id<"users">, NodeUser>
  fetchingUsers: Set<Id<"users">>
  pendingFetches: Set<Id<"users">>
}

type NodeUserCacheContextType = {
  getUserForNode: (userId: Id<"users">) => NodeUser | null
  prefetchUsers: (userIds: Id<"users">[]) => void
}

const NodeUserCacheContext = createContext<NodeUserCacheContextType | null>(null)

interface NodeUserCacheProviderProps {
  children: React.ReactNode
  visionId: Id<"visions">
}

export function NodeUserCacheProvider({ children, visionId }: NodeUserCacheProviderProps) {
  // Persistent cache using useMemo with visionId as dependency
  // This ensures cache persists during navigation within the same vision
  const cacheState = useMemo<NodeUserCacheState>(() => ({
    nodeUsers: new Map(),
    fetchingUsers: new Set(),
    pendingFetches: new Set()
  }), [visionId]) // Only reset when visionId changes

  // Track pending fetches to avoid duplicate requests
  const pendingFetchesRef = useRef<Set<Id<"users">>>(new Set())
  
  // Get the first user that needs to be fetched (one at a time to avoid hooks violations)
  const nextUserToFetch = useMemo(() => {
    const pending = Array.from(cacheState.pendingFetches)
    return pending.length > 0 ? pending[0] : null
  }, [cacheState.pendingFetches.size])

  // Single user query - fetch one user at a time
  const userData = useQuery(
    api.channels.getUser,
    nextUserToFetch && !cacheState.nodeUsers.has(nextUserToFetch) 
      ? { userId: nextUserToFetch }
      : "skip"
  )

  // Process completed query and update cache
  React.useEffect(() => {
    if (userData && nextUserToFetch && !cacheState.nodeUsers.has(nextUserToFetch)) {
      // Add to cache
      cacheState.nodeUsers.set(nextUserToFetch, userData)
      
      // Remove from pending fetches
      cacheState.pendingFetches.delete(nextUserToFetch)
      cacheState.fetchingUsers.delete(nextUserToFetch)
      pendingFetchesRef.current.delete(nextUserToFetch)
    }
  }, [userData, nextUserToFetch, cacheState])

  const prefetchUsers = useCallback((userIds: Id<"users">[]) => {
    // Add unique users that aren't cached or already being fetched
    userIds.forEach(userId => {
      if (!cacheState.nodeUsers.has(userId) && 
          !cacheState.fetchingUsers.has(userId) && 
          !pendingFetchesRef.current.has(userId)) {
        cacheState.pendingFetches.add(userId)
        cacheState.fetchingUsers.add(userId)
        pendingFetchesRef.current.add(userId)
      }
    })
  }, [cacheState])

  const getUserForNode = useCallback((userId: Id<"users">): NodeUser | null => {
    // Check if user is in cache
    if (cacheState.nodeUsers.has(userId)) {
      return cacheState.nodeUsers.get(userId)!
    }

    // If not fetching and not pending, add to pending fetches
    if (!cacheState.fetchingUsers.has(userId) && !pendingFetchesRef.current.has(userId)) {
      cacheState.pendingFetches.add(userId)
      cacheState.fetchingUsers.add(userId)
      pendingFetchesRef.current.add(userId)
    }

    return null
  }, [cacheState])

  const contextValue = useMemo<NodeUserCacheContextType>(() => ({
    getUserForNode,
    prefetchUsers
  }), [getUserForNode, prefetchUsers])

  return (
    <NodeUserCacheContext.Provider value={contextValue}>
      {children}
    </NodeUserCacheContext.Provider>
  )
}

export function useNodeUserCache() {
  const context = useContext(NodeUserCacheContext)
  if (!context) {
    throw new Error('useNodeUserCache must be used within a NodeUserCacheProvider')
  }
  return context
}