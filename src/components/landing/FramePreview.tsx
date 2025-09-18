"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
    Background,
    BackgroundVariant,
    ReactFlow,
    Node,
    Edge,
    NodeChange,
    applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeVariants } from "../../../convex/tables/nodes";
import nodeTypes from "../vision/nodes";

export default function FramePreview() {
    // Create initial node data positioned across from the heading with more spacing
    const initialNodes: Node[] = useMemo(() => [
        {
            id: 'youtube-1',
            type: NodeVariants.YouTube,
            position: { x: 651.4285714285714, y: 2 },
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
                onEditComplete: () => { },
                onOpenChat: () => { },
                onNodeRightClick: () => { },
            },
        },
        {
            id: 'ai-1',
            type: NodeVariants.AI,
            position: { x: 1078, y: 531 },
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
                onEditComplete: () => { },
                onOpenChat: () => { },
                onNodeRightClick: () => { },
            },
        },
        {
            id: 'twitter-1',
            type: NodeVariants.Twitter,
            position: { x: 1071, y: -67 },
            data: {
                node: {
                    _id: 'twitter-1',
                    title: 'The Dashboard',
                    variant: NodeVariants.Image,
                    value: 'https://2f2rdbbnpm.ufs.sh/f/vzSMsuO7wzNELKjY0gBVn0bgRxWHi4EtYdoU8eyI1ADZ62X7',
                    thought: 'Vision maps Dashboard, built for the furture of mapping imagination'
                },
                nodeUser: null,
                frameId: 'preview',
                editingNodeId: null,
                onEditComplete: () => { },
                onOpenChat: () => { },
                onNodeRightClick: () => { },
            },
        },
        {
            id: 'text-1',
            type: NodeVariants.Text,
            position: { x: 1438.5714285714287, y: 279 },
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
                onEditComplete: () => { },
                onOpenChat: () => { },
                onNodeRightClick: () => { },
            },
        },
    ], []);

    // State for draggable nodes
    const [nodes, setNodes] = useState<Node[]>(initialNodes);

    // Handle node changes (including dragging)
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        console.log(changes)
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    const edges: Edge[] = useMemo(() => [
        {
            id: 'e1-2',
            source: 'youtube-1',
            target: 'ai-1',
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
            source: 'twitter-1',
            target: 'ai-1',
            animated: true,
            style: { stroke: '#6b7280', strokeWidth: 2 },
            markerEnd: { type: 'arrow', color: '#6b7280' },
        },
    ], []);

    return (
        <div className="w-full h-full relative overflow-hidden">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                defaultViewport={{ x: 350, y: 250, zoom: 0.7 }}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                panOnDrag={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                onWheelCapture={(e) => {
                    // stop ReactFlow eating the wheel
                    e.stopPropagation();
                    // don’t call preventDefault → browser scrolls page naturally
                }}
                attributionPosition="bottom-left"
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={40}
                    size={2}
                />
            </ReactFlow>
        </div>
    );
}
