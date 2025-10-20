"use client"

import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"

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

// -------------------
// Reducer for cache
// -------------------
type CacheAction =
  | { type: "add"; user: NodeUser }
  | { type: "fetching"; userId: Id<"users"> }

function cacheReducer(
  state: NodeUserCacheState,
  action: CacheAction
): NodeUserCacheState {
  switch (action.type) {
    case "add":
      return {
        nodeUsers: new Map(state.nodeUsers).set(action.user._id, action.user),
        fetchingUsers: new Set(
          [...state.fetchingUsers].filter((id) => id !== action.user._id)
        ),
      }
    case "fetching":
      return {
        ...state,
        fetchingUsers: state.fetchingUsers.add(action.userId),
      }
    default:
      return state
  }
}

interface NodeUserCacheProviderProps {
  children: React.ReactNode
  visionId: Id<"visions">
}

export function NodeUserCacheProvider({
  children,
}: NodeUserCacheProviderProps) {
  // cache + reducer
  const [state, dispatch] = useReducer(cacheReducer, {
    nodeUsers: new Map(),
    fetchingUsers: new Set() as Set<Id<"users">>,
  })

  // pending queue + current user being fetched
  const pending = useRef<Id<"users">[]>([])
  const [currentUserId, setCurrentUserId] =
    useState<Id<"users"> | null>(null)

  // fetch single user with Convex
  const userData = useQuery(
    api.channels.getUser,
    currentUserId ? { userId: currentUserId } : "skip"
  )

  // When userData comes back, commit to cache and move queue
  useEffect(() => {
    if (userData && currentUserId) {
      dispatch({ type: "add", user: userData })
      // advance to next queued user
      const next = pending.current.shift() ?? null
      setCurrentUserId(next)
      if (next) dispatch({ type: "fetching", userId: next })
    }
  }, [userData, currentUserId])

  // -------------------
  // Cache API
  // -------------------
  const getUserForNode = useCallback(
    (userId: Id<"users">): NodeUser | null => {
      return state.nodeUsers.get(userId) ?? null
    },
    [state.nodeUsers]
  )

  const ensureUserFetched = useCallback(
    (userId: Id<"users">) => {
      if (
        !state.nodeUsers.has(userId) &&
        !state.fetchingUsers.has(userId) &&
        !pending.current.includes(userId)
      ) {
        pending.current.push(userId)
        if (!currentUserId) {
          const next = pending.current.shift()!
          setCurrentUserId(next)
          dispatch({ type: "fetching", userId: next })
        }
      }
    },
    [state, currentUserId]
  )

  const prefetchUsers = useCallback(
    (userIds: Id<"users">[]) => {
      userIds.forEach((id) => ensureUserFetched(id))
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
