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
  updateNode: (channelId: string, nodeId: string, updatedNode: NodeWithFrame) => void
  removeNode: (channelId: string, nodeId: string) => void
  syncWithServerData: (channelId: string, serverNodes: NodeWithFrame[]) => void
  clearChannel: (channelId: string) => void
  setLoading: (channelId: string, loading: boolean) => void
  setHasMore: (channelId: string, hasMore: boolean) => void
}

export const useNodeStore = create<NodeStore>()(
  subscribeWithSelector((set) => ({
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
            [channelId]: [node, ...existing], // Append new node at the end
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

    updateNode: (channelId, nodeId, updatedNode) => {
      set((state) => {
        const existing = state.nodesByChannel[channelId] || []
        const nodeIndex = existing.findIndex((node) => node._id === nodeId)
        
        if (nodeIndex === -1) {
          return state // Node not found
        }
        
        const updatedNodes = [...existing]
        updatedNodes[nodeIndex] = updatedNode
        
        return {
          nodesByChannel: {
            ...state.nodesByChannel,
            [channelId]: updatedNodes,
          },
        }
      })
    },

    removeNode: (channelId, nodeId) => {
      set((state) => {
        const existing = state.nodesByChannel[channelId] || []
        const filteredNodes = existing.filter((node) => node._id !== nodeId)
        
        return {
          nodesByChannel: {
            ...state.nodesByChannel,
            [channelId]: filteredNodes,
          },
        }
      })
    },

    syncWithServerData: (channelId, serverNodes) => {
      set((state) => {
        const existing = state.nodesByChannel[channelId] || []
        
        // Create a map of server nodes by ID for efficient lookup
        const serverNodeMap = new Map(serverNodes.map(node => [node._id, node]))
        
        // Start with existing nodes and update/add from server data
        let updatedNodes = [...existing]
        
        // Update existing nodes with server data
        updatedNodes = updatedNodes.map(existingNode => {
          const serverNode = serverNodeMap.get(existingNode._id)
          return serverNode || existingNode
        })
        
        // Add new nodes from server that don't exist locally
        const existingIds = new Set(existing.map(node => node._id))
        const newNodes = serverNodes.filter(serverNode => !existingIds.has(serverNode._id))
        updatedNodes.push(...newNodes)
        
        // Remove nodes that no longer exist on server
        const serverIds = new Set(serverNodes.map(node => node._id))
        updatedNodes = updatedNodes.filter(node => serverIds.has(node._id))
        
        return {
          nodesByChannel: {
            ...state.nodesByChannel,
            [channelId]: updatedNodes,
          },
        }
      })
    },
  }))
)
