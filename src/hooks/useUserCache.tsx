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
  
  // Dynamic query hook - only fetch users that aren't cached and aren't being fetched
  const usersToFetch = useMemo(() => {
    return Array.from(cacheState.pendingFetches).slice(0, 10) // Batch limit of 10
  }, [cacheState.pendingFetches.size])

  // Individual user queries for each user that needs to be fetched
  const userQueries = usersToFetch.map(userId => {
    return {
      userId,
      data: useQuery(
        api.channels.getUser,
        cacheState.nodeUsers.has(userId) ? "skip" : { userId }
      )
    }
  })

  // Process completed queries and update cache
  React.useEffect(() => {
    userQueries.forEach(({ userId, data }) => {
      if (data && !cacheState.nodeUsers.has(userId)) {
        // Add to cache
        cacheState.nodeUsers.set(userId, data)
        
        // Remove from pending fetches
        cacheState.pendingFetches.delete(userId)
        cacheState.fetchingUsers.delete(userId)
        pendingFetchesRef.current.delete(userId)
      }
    })
  }, [userQueries.map(q => q.data).join(',')]) // Depend on query results

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
    getUserForNode
  }), [getUserForNode])

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