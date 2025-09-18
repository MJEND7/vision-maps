"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Background,
    BackgroundVariant,
    ReactFlow,
    Node,
    Edge,
    useReactFlow,
    ReactFlowProvider,
    Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeVariants } from "../../../convex/tables/nodes";
import nodeTypes from "../vision/nodes";
import { Button } from "../ui/button";
import { motion } from "motion/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { ROUTES } from "@/lib/constants";
import WastedTimeTimer from "../WastedTimeTimer";
import { useRouter } from "next/navigation";

function getNodePositions(headlineBounds: {
    top: number;
    left: number;
    width: number;
    height: number;
}) {
    const px = window.innerWidth * 0.05;
    const rfHeight = window.innerHeight * 0.8;
    const rfWidth = window.innerWidth;

    const isMobileFlow = rfWidth < 992;
    const isLargeFlow = rfWidth > 1250;

    // Default zoom
    let zoom = 0.8;

    if (isMobileFlow) {
        zoom = 0.4; // zoom out more on mobile
        const offsetY =
            headlineBounds.top +
            headlineBounds.height +
            (rfHeight - headlineBounds.height) / 2 -
            125;

        return {
            positions: {
                youtube: { x: rfWidth - 300 - px, y: (offsetY * 2) + 50 },
                ai: { x: (rfWidth - px) - 270, y: (offsetY * 2.7) + 400 },
                twitter: { x: rfWidth - px + 50, y: (offsetY * 2.4) + 50 },
                text: { x: rfWidth - px + 200, y: (offsetY * 2.9) + 400 },
            },
            zoom,
        };
    }

    if (isLargeFlow) {
        zoom = 0.7; // slightly closer on very large screens
        const offsetX = rfWidth / 2;
        const offsetY = headlineBounds.top + 20;

        return {
            positions: {
                youtube: { x: (offsetX + 800) + 200, y: offsetY - 80 },
                ai: { x: (offsetX + 400) + 200, y: offsetY + 430 },
                twitter: { x: (offsetX + 300) + 200, y: offsetY - 100 },
                text: { x: (offsetX + 50) + 200, y: offsetY + 100 },
            },
            zoom,
        };
    }

    // Default tablet/desktop fallback
    const offsetX = headlineBounds.left + headlineBounds.width + px;
    const offsetY = rfHeight / 2 - 150;

    return {
        positions: {
            youtube: { x: offsetX + 700, y: offsetY - 80 },
            ai: { x: offsetX + 400, y: offsetY + 430 },
            twitter: { x: offsetX + 300, y: offsetY - 100 },
            text: { x: offsetX + 50, y: offsetY + 100 },
        },
        zoom,
    };
}

function FramePreview({
    headlineRef,
}: {
    headlineRef?: React.RefObject<HTMLDivElement | null>;
}) {
    const { setNodes, setViewport } = useReactFlow();
    const reactFlowRef = useRef<HTMLDivElement>(null);
    const [headlineDimensions, setHeadlineDimensions] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);

    const defaultNodes: Node[] = [];

    useEffect(() => {
        const updateHeadlineDimensions = () => {
            if (headlineRef?.current && reactFlowRef.current) {
                const headlineBbox = headlineRef.current.getBoundingClientRect();
                const rfBbox = reactFlowRef.current.getBoundingClientRect();
                setHeadlineDimensions({
                    top: headlineBbox.top - rfBbox.top,
                    left: headlineBbox.left - rfBbox.left,
                    width: headlineBbox.width,
                    height: headlineBbox.height,
                });
            }
        };

        updateHeadlineDimensions();
        window.addEventListener("resize", updateHeadlineDimensions);
        return () =>
            window.removeEventListener("resize", updateHeadlineDimensions);
    }, [headlineRef]);

    useEffect(() => {
        if (!headlineDimensions) return;

        const { positions, zoom } = getNodePositions(headlineDimensions);

        setNodes([
            {
                id: "ai-1",
                type: NodeVariants.AI,
                position: positions.ai,
                data: {
                    node: {
                        _id: "ai-1",
                        title: "Market Research Assistant",
                        variant: NodeVariants.AI,
                        value: "chat-id-123",
                        thought: "AI analysis of competitive landscape",
                    },
                    nodeUser: null,
                    frameId: "preview",
                    editingNodeId: null,
                    onEditComplete: () => { },
                    onOpenChat: () => { },
                    onNodeRightClick: () => { },
                },
            },
            {
                id: "twitter-1",
                type: NodeVariants.Twitter,
                position: positions.twitter,
                data: {
                    node: {
                        _id: "twitter-1",
                        title: "The Dashboard",
                        variant: NodeVariants.Image,
                        value:
                            "https://2f2rdbbnpm.ufs.sh/f/vzSMsuO7wzNELKjY0gBVn0bgRxWHi4EtYdoU8eyI1ADZ62X7",
                        thought:
                            "Vision maps Dashboard, built for the furture of mapping imagination",
                    },
                    nodeUser: null,
                    frameId: "preview",
                    editingNodeId: null,
                    onEditComplete: () => { },
                    onOpenChat: () => { },
                    onNodeRightClick: () => { },
                },
            },
            {
                id: "youtube-1",
                type: NodeVariants.YouTube,
                position: positions.youtube,
                data: {
                    node: {
                        _id: "youtube-1",
                        title: "Vision Maps Demo",
                        variant: NodeVariants.YouTube,
                        value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        thought: "Product walkthrough video",
                    },
                    nodeUser: null,
                    frameId: "preview",
                    editingNodeId: null,
                    onEditComplete: () => { },
                    onOpenChat: () => { },
                    onNodeRightClick: () => { },
                },
            },
            {
                id: "text-1",
                type: NodeVariants.Text,
                position: positions.text,
                data: {
                    node: {
                        _id: "text-1",
                        title: "Core Concept",
                        variant: NodeVariants.Text,
                        value:
                            "**Vision Maps** enables rapid ideation through visual node-based planning.\n\n• Connect ideas with links\n• Embed rich media content\n• Collaborate in real-time",
                        thought: null,
                    },
                    nodeUser: null,
                    frameId: "preview",
                    editingNodeId: null,
                    onEditComplete: () => { },
                    onOpenChat: () => { },
                    onNodeRightClick: () => { },
                },
            },
        ]);

        // 👇 Apply per-device zoom
        setViewport({ x: 0, y: 0, zoom });
    }, [headlineDimensions, setNodes, setViewport]);

    // 👇 Compute edges dynamically: mobile = into text, desktop = into AI
    const isMobileFlow = typeof window !== "undefined" && window.innerWidth < 992;

    const edges: Edge[] = isMobileFlow
        ? [
            {
                id: "m1",
                source: "youtube-1",
                sourceHandle: Position.Bottom,
                target: "ai-1",
                animated: true,
                style: { stroke: "#6b7280", strokeWidth: 2 },
                markerEnd: { type: "arrow", color: "#6b7280" },
            },
            {
                id: "m2",
                source: "twitter-1",
                sourceHandle: Position.Bottom,
                target: "ai-1",
                animated: true,
                style: { stroke: "#6b7280", strokeWidth: 2 },
                markerEnd: { type: "arrow", color: "#6b7280" },
            },
            {
                id: "m3",
                source: "ai-1",
                sourceHandle: Position.Right,
                targetHandle: Position.Left,
                target: "text-1",
                animated: true,
                style: { stroke: "#6b7280", strokeWidth: 2 },
                markerEnd: { type: "arrow", color: "#6b7280" },
            },
        ]
        : [
            {
                id: "d1",
                source: "youtube-1",
                sourceHandle: Position.Bottom,
                target: "ai-1",
                animated: true,
                style: { stroke: "#6b7280", strokeWidth: 2 },
                markerEnd: { type: "arrow", color: "#6b7280" },
            },
            {
                id: "d2",
                source: "text-1",
                target: "ai-1",
                sourceHandle: Position.Bottom,
                animated: true,
                style: { stroke: "#6b7280", strokeWidth: 2 },
                markerEnd: { type: "arrow", color: "#6b7280" },
            },
            {
                id: "d3",
                source: "twitter-1",
                sourceHandle: Position.Bottom,
                target: "ai-1",
                animated: true,
                style: { stroke: "#6b7280", strokeWidth: 2 },
                markerEnd: { type: "arrow", color: "#6b7280" },
            },
        ];

    return (
        <div ref={reactFlowRef} className="w-full h-full relative overflow-hidden">
            <ReactFlow
                preventScrolling={false}
                zoomOnScroll={false}
                nodeTypes={nodeTypes}
                defaultNodes={defaultNodes}
                defaultEdges={edges}
                proOptions={{ hideAttribution: true }}
                id="hero"
            >
                <Background variant={BackgroundVariant.Dots} gap={40} size={2} />
            </ReactFlow>
        </div>
    );
}

export function Header() {
    const headlineRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    return (
        <ReactFlowProvider>
            <motion.section
                ref={headlineRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="absolute z-[20] text-left top-[80px] sm:top-[280px] sm:left-10 p-4 rounded-lg max-w-[650px] backdrop-blur-md space-y-3"
            >
                <motion.div
                    initial={{ y: 100, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{
                        duration: 1.2,
                        delay: 0.8,
                        type: "spring",
                        stiffness: 100,
                        damping: 12,
                    }}
                    className="text-5xl sm:text-6xl sm:text-left text-center cursor-default font-light"
                >
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 2 }}
                        className="font-semibold"
                    >
                        Map your ideation with{" "}
                    </motion.span>
                    <motion.span className="font-bold moving-gradient font-display tracking-tight">
                        Visions Maps
                    </motion.span>
                </motion.div>

                <motion.h2 className="sm:text-left text-center sm:max-w-[700px] text-lg sm:text-2xl text-primary/80">
                    The best way to tack your ideation.
                </motion.h2>

                <WastedTimeTimer />

                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        duration: 0.8,
                        delay: 1.6,
                        type: "spring",
                        stiffness: 120,
                    }}
                    className="relative sm:inline flex justify-center"
                >
                    <Authenticated>
                        <Button
                            size="xl"
                            onClick={() => {
                                router.push(ROUTES.PROFILE.VISIONS);
                            }}
                        >
                            Your Visions
                        </Button>
                    </Authenticated>
                    <Unauthenticated>
                        <Button
                            size="xl"
                            onClick={() => {
                                router.push(ROUTES.SIGNUP);
                            }}
                        >
                            Join for free
                        </Button>
                    </Unauthenticated>
                </motion.div>
            </motion.section>

            <FramePreview headlineRef={headlineRef} />
        </ReactFlowProvider>
    );
}
