"use client"

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

export type NodeUser = {
  _id: Id<"users">
  name: string
  email?: string
  profileImage?: string
}

type NodeUserCacheState = {
  nodeUsers: Map<Id<"users">, NodeUser>
  fetchingUsers: Set<Id<"users">>
}

type NodeUserCacheContextType = {
  getUserForNode: (userId: Id<"users">) => NodeUser | null
  prefetchUsers: (userIds: Id<"users">[]) => void
  ensureUserFetched: (userId: Id<"users">) => void
}

const NodeUserCacheContext =
  createContext<NodeUserCacheContextType | null>(null)

interface NodeUserCacheProviderProps {
  children: React.ReactNode
  visionId: Id<"visions">
}

export function NodeUserCacheProvider({
  children,
  visionId,
}: NodeUserCacheProviderProps) {
  // Persistent cache using useMemo with visionId as dependency
  const cacheState = useMemo<NodeUserCacheState>(() => {
    // reference visionId so eslint knows it's intentional
    void visionId
    return {
      nodeUsers: new Map(),
      fetchingUsers: new Set(),
    }
  }, [visionId])

  // ✅ pendingFetches is now React state
  const [pendingFetches, setPendingFetches] = React.useState<
    Set<Id<"users">>
  >(new Set())

  // Track pending fetches separately to avoid duplicate requests
  const pendingFetchesRef = useRef<Set<Id<"users">>>(new Set())

  // Get the first user that needs to be fetched
  const nextUserToFetch = useMemo(() => {
    const pending = Array.from(pendingFetches)
    return pending.length > 0 ? pending[0] : null
  }, [pendingFetches])

  // Single user query - fetch one user at a time
  const userData = useQuery(
    api.channels.getUser,
    nextUserToFetch && !cacheState.nodeUsers.has(nextUserToFetch)
      ? { userId: nextUserToFetch }
      : "skip"
  )

  // Process completed query and update cache
  React.useEffect(() => {
    if (
      userData &&
      nextUserToFetch &&
      !cacheState.nodeUsers.has(nextUserToFetch)
    ) {
      // Add to cache
      cacheState.nodeUsers.set(nextUserToFetch, userData)

      // Remove from pending + fetching
      setPendingFetches((prev) => {
        const newSet = new Set(prev)
        newSet.delete(nextUserToFetch)
        return newSet
      })
      cacheState.fetchingUsers.delete(nextUserToFetch)
      pendingFetchesRef.current.delete(nextUserToFetch)
    }
  }, [userData, nextUserToFetch, cacheState])

  // ✅ Pure read-only function
  const getUserForNode = useCallback(
    (userId: Id<"users">): NodeUser | null => {
      return cacheState.nodeUsers.get(userId) ?? null
    },
    [cacheState]
  )

  // ✅ Safe function to schedule a fetch (no setState during render)
  const ensureUserFetched = useCallback(
    (userId: Id<"users">) => {
      if (
        !cacheState.nodeUsers.has(userId) &&
        !cacheState.fetchingUsers.has(userId) &&
        !pendingFetchesRef.current.has(userId)
      ) {
        setPendingFetches((prev) => {
          const newSet = new Set(prev)
          newSet.add(userId)
          return newSet
        })
        cacheState.fetchingUsers.add(userId)
        pendingFetchesRef.current.add(userId)
      }
    },
    [cacheState]
  )

  const prefetchUsers = useCallback(
    (userIds: Id<"users">[]) => {
      userIds.forEach((userId) => {
        ensureUserFetched(userId)
      })
    },
    [ensureUserFetched]
  )

  const contextValue = useMemo<NodeUserCacheContextType>(
    () => ({
      getUserForNode,
      prefetchUsers,
      ensureUserFetched,
    }),
    [getUserForNode, prefetchUsers, ensureUserFetched]
  )

  return (
    <NodeUserCacheContext.Provider value={contextValue}>
      {children}
    </NodeUserCacheContext.Provider>
  )
}

export function useNodeUserCache() {
  const context = useContext(NodeUserCacheContext)
  if (!context) {
    throw new Error(
      "useNodeUserCache must be used within a NodeUserCacheProvider"
    )
  }
  return context
}
