"use client";

import React, { useMemo } from 'react';
import {
    Background,
    BackgroundVariant,
    ReactFlow,
    Node,
    Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeVariants } from "../../../convex/tables/nodes";
import nodeTypes from "../vision/nodes";

export default function FramePreview() {
    // Create static node data positioned across from the heading with more spacing
    const nodes: Node[] = useMemo(() => [
        {
            id: 'youtube-1',
            type: NodeVariants.YouTube,
            position: { x: 600, y: 50 },
            data: {
                node: {
                    _id: 'youtube-1',
                    title: 'Vision Maps Demo',
                    variant: NodeVariants.YouTube,
                    value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    thought: 'Product walkthrough video'
                },
                nodeUser: null,
                frameId: 'preview',
                editingNodeId: null,
                onEditComplete: () => {},
                onOpenChat: () => {},
                onNodeRightClick: () => {},
            },
        },
        {
            id: 'text-1',
            type: NodeVariants.Text,
            position: { x: 1000, y: 0 },
            data: {
                node: {
                    _id: 'text-1',
                    title: 'Core Concept',
                    variant: NodeVariants.Text,
                    value: '**Vision Maps** enables rapid ideation through visual node-based planning.\n\n• Connect ideas with links\n• Embed rich media content\n• Collaborate in real-time',
                    thought: null
                },
                nodeUser: null,
                frameId: 'preview',
                editingNodeId: null,
                onEditComplete: () => {},
                onOpenChat: () => {},
                onNodeRightClick: () => {},
            },
        },
        {
            id: 'ai-1',
            type: NodeVariants.AI,
            position: { x: 800, y: 250 },
            data: {
                node: {
                    _id: 'ai-1',
                    title: 'Market Research Assistant',
                    variant: NodeVariants.AI,
                    value: 'chat-id-123',
                    thought: 'AI analysis of competitive landscape'
                },
                nodeUser: null,
                frameId: 'preview',
                editingNodeId: null,
                onEditComplete: () => {},
                onOpenChat: () => {},
                onNodeRightClick: () => {},
            },
        },
        {
            id: 'twitter-1',
            type: NodeVariants.Twitter,
            position: { x: 1300, y: 200 },
            data: {
                node: {
                    _id: 'twitter-1',
                    title: 'User Feedback',
                    variant: NodeVariants.Twitter,
                    value: 'https://twitter.com/example/status/123456789',
                    thought: 'Community discussing vision tools'
                },
                nodeUser: null,
                frameId: 'preview',
                editingNodeId: null,
                onEditComplete: () => {},
                onOpenChat: () => {},
                onNodeRightClick: () => {},
            },
        },
    ], []);

    const edges: Edge[] = useMemo(() => [
        {
            id: 'e1-2',
            source: 'youtube-1',
            target: 'text-1',
            animated: true,
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: 'arrow', color: '#6b7280' },
        },
        {
            id: 'e2-3',
            source: 'text-1',
            target: 'ai-1',
            animated: true,
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: 'arrow', color: '#6b7280' },
        },
        {
            id: 'e2-4',
            source: 'text-1',
            target: 'twitter-1',
            animated: true,
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: 'arrow', color: '#6b7280' },
        },
    ], []);

    return (
        <div className="w-full h-96 relative overflow-hidden">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                panOnDrag={true}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                attributionPosition="bottom-left"
                proOptions={{ hideAttribution: true }}
                className="bg-transparent"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={15}
                    size={1}
                    className="opacity-30"
                />
            </ReactFlow>
            {/* Gradient overlay focused on the left where nodes are */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/60 pointer-events-none" />
        </div>
    );
}
