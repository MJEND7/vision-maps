// stores/useNodeStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { NodeWithFrame } from '../../convex/channels'

interface NodeStore {
  // Store nodes by channel ID
  nodesByChannel: Record<string, NodeWithFrame[]>
  // Track pagination cursors
  cursors: Record<string, string | null>
  // Track loading states
  loading: Record<string, boolean>
  hasMore: Record<string, boolean>
  
  // Actions
  setNodes: (channelId: string, nodes: NodeWithFrame[], cursor?: string | null) => void
  appendNodes: (channelId: string, nodes: NodeWithFrame[], cursor?: string | null) => void
  addNewNode: (channelId: string, node: NodeWithFrame) => void
  clearChannel: (channelId: string) => void
  setLoading: (channelId: string, loading: boolean) => void
  setHasMore: (channelId: string, hasMore: boolean) => void
}

export const useNodeStore = create<NodeStore>()(
  subscribeWithSelector((set, get) => ({
    nodesByChannel: {},
    cursors: {},
    loading: {},
    hasMore: {},

    setNodes: (channelId, nodes, cursor) => {
      set((state) => ({
        nodesByChannel: {
          ...state.nodesByChannel,
          [channelId]: nodes,
        },
        cursors: {
          ...state.cursors,
          [channelId]: cursor ?? null,
        },
      }))
    },

    appendNodes: (channelId, nodes, cursor) => {
      set((state) => {
        const existing = state.nodesByChannel[channelId] || []
        const newNodes = nodes.filter(
          (newNode) => !existing.some((existingNode) => existingNode._id === newNode._id)
        )
        
        return {
          nodesByChannel: {
            ...state.nodesByChannel,
            [channelId]: [...newNodes, ...existing], // Prepend older nodes
          },
          cursors: {
            ...state.cursors,
            [channelId]: cursor ?? null,
          },
        }
      })
    },

    addNewNode: (channelId, node) => {
      set((state) => {
        const existing = state.nodesByChannel[channelId] || []
        if (existing.some((existingNode) => existingNode._id === node._id)) {
          return state // Node already exists
        }
        
        return {
          nodesByChannel: {
            ...state.nodesByChannel,
            [channelId]: [...existing, node], // Append new node at the end
          },
        }
      })
    },

    clearChannel: (channelId) => {
      set((state) => ({
        nodesByChannel: {
          ...state.nodesByChannel,
          [channelId]: [],
        },
        cursors: {
          ...state.cursors,
          [channelId]: null,
        },
        hasMore: {
          ...state.hasMore,
          [channelId]: true,
        },
      }))
    },

    setLoading: (channelId, loading) => {
      set((state) => ({
        loading: {
          ...state.loading,
          [channelId]: loading,
        },
      }))
    },

    setHasMore: (channelId, hasMore) => {
      set((state) => ({
        hasMore: {
          ...state.hasMore,
          [channelId]: hasMore,
        },
      }))
    },
  }))
)
