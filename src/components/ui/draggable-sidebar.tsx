"use client";

import { motion, Reorder, useDragControls, AnimatePresence } from "motion/react";
import { ChevronRight, Frame, GripVertical, Plus } from "lucide-react";
import { useRef, useCallback } from "react";

interface Channel {
    _id: string;
    title: string;
    sortOrder?: number;
}

interface FrameItem {
    _id: string;
    title: string;
    channel: string;
    sortOrder?: number;
}

interface DraggableSidebarProps {
    channels: Channel[];
    framesByChannel: Record<string, FrameItem[]>;
    openChannels: Set<string>;
    selectedTabId?: string;
    editingChannel: string | null;
    editingChannelName: string;
    editingFrame: string | null;
    editingFrameName: string;
    onChannelReorder: (channelIds: string[]) => void;
    onChannelReorderEnd?: (channelIds: string[]) => void;
    onFrameReorder: (channelId: string, frameIds: string[]) => void;
    onFrameReorderEnd?: (channelId: string, frameIds: string[]) => void;
    onToggleChannel: (channelId: string) => void;
    onOpenTab: (type: "channel" | "frame", id: string, title: string) => void;
    onCreateFrame: (channelId: string) => void;
    onEditChannel: (channelId: string, title: string) => void;
    onEditFrame: (frameId: string, title: string) => void;
    onSaveChannel: (channelId: string) => void;
    onSaveFrame: (frameId: string) => void;
    onCancelEditChannel: () => void;
    onCancelEditFrame: () => void;
    onEditChannelNameChange: (name: string) => void;
    onEditFrameNameChange: (name: string) => void;
}

function DraggableChannel({
    channel,
    isSelected,
    isEditing,
    editingName,
    frames,
    isOpen,
    editingFrame,
    editingFrameName,
    onToggle,
    onOpenTab,
    onCreateFrame,
    onEdit,
    onSave,
    onCancel,
    onNameChange,
    onFrameReorder,
    onFrameReorderEnd,
    onEditFrame,
    onSaveFrame,
    onCancelEditFrame,
    onFrameNameChange,
}: {
    channel: Channel;
    isSelected: boolean;
    isEditing: boolean;
    editingName: string;
    frames: FrameItem[];
    isOpen: boolean;
    editingFrame: string | null;
    editingFrameName: string;
    onToggle: () => void;
    onOpenTab: (type: "channel" | "frame", id: string, title: string) => void;
    onCreateFrame: () => void;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onNameChange: (name: string) => void;
    onFrameReorder: (frameIds: string[]) => void;
    onFrameReorderEnd?: (frameIds: string[]) => void;
    onEditFrame: (frameId: string, title: string) => void;
    onSaveFrame: (frameId: string) => void;
    onCancelEditFrame: () => void;
    onFrameNameChange: (name: string) => void;
}) {
    const dragControls = useDragControls();
    const currentFrameOrder = useRef<string[]>([]);
    const frameSyncTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleFrameReorder = useCallback((reorderedFrames: FrameItem[]) => {
        const frameIds = reorderedFrames.map(f => f._id);
        currentFrameOrder.current = frameIds;
        onFrameReorder(frameIds);

        // Clear existing timeout
        if (frameSyncTimeout.current) {
            clearTimeout(frameSyncTimeout.current);
        }

        // Set new timeout to sync after drag ends (500ms delay)
        frameSyncTimeout.current = setTimeout(() => {
            if (onFrameReorderEnd && frameIds.length > 0) {
                onFrameReorderEnd(frameIds);
            }
        }, 500);
    }, [onFrameReorder, onFrameReorderEnd]);

    return (
        <Reorder.Item
            value={channel}
            dragListener={false}
            dragControls={dragControls}
        >
            <div>
                <div className="flex justify-between items-center gap-1 p-1">
                    <div
                        className={`${isSelected ? "bg-accent text-primary" : "hover:text-primary text-muted-foreground"} 
                        rounded-md text-xs flex items-center transition-colors group ease-in-out w-full text-left px-1`}
                    >
                        <motion.div
                            onPointerDown={(e) => dragControls.start(e)}
                            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/80"
                            whileHover={{ scale: 1.1 }}
                        >
                            <GripVertical size={15} />
                        </motion.div>

                        <button onClick={onToggle} className="p-0.5">
                            <ChevronRight
                                className={`group-hover:text-muted-foreground/80 text-muted-foreground/50 transition-transform ${isOpen ? 'rotate-90' : ''
                                    }`}
                                size={18}
                            />
                        </button>

                        {isEditing ? (
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => onNameChange(e.target.value)}
                                onBlur={onSave}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onSave();
                                    } else if (e.key === 'Escape') {
                                        onCancel();
                                    }
                                }}
                                className="text-xs bg-background border border-border rounded px-1 py-0.5 w-full"
                                autoFocus
                            />
                        ) : (
                            <button
                                className="text-left max-w-[190px] truncate py-1 flex-1"
                                onClick={() => onOpenTab("channel", channel._id, channel.title)}
                                onDoubleClick={onEdit}
                            >
                                {channel.title}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onCreateFrame}
                        className="text-muted-foreground hover:text-primary"
                    >
                        <Plus size={15} />
                    </button>
                </div>

                {/* Show frames when channel is open */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-10 space-y-1 overflow-hidden"
                        >
                            <Reorder.Group
                                axis="y"
                                values={frames}
                                onReorder={handleFrameReorder}
                                className="space-y-1"
                            >
                                {frames.map((frame) => (
                                    <DraggableFrame
                                        key={frame._id}
                                        frame={frame}
                                        isSelected={false}
                                        isEditing={editingFrame === frame._id}
                                        editingName={editingFrameName}
                                        onOpenTab={onOpenTab}
                                        onEdit={() => onEditFrame(frame._id, frame.title)}
                                        onSave={() => onSaveFrame(frame._id)}
                                        onCancel={onCancelEditFrame}
                                        onNameChange={onFrameNameChange}
                                    />
                                ))}
                            </Reorder.Group>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Reorder.Item>
    );
}

function DraggableFrame({
    frame,
    isSelected,
    isEditing,
    editingName,
    onOpenTab,
    onEdit,
    onSave,
    onCancel,
    onNameChange,
}: {
    frame: FrameItem;
    isSelected: boolean;
    isEditing: boolean;
    editingName: string;
    onOpenTab: (type: "channel" | "frame", id: string, title: string) => void;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onNameChange: (name: string) => void;
}) {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={frame}
            dragListener={false}
            dragControls={dragControls}
            className={`${isSelected ? "bg-accent text-primary" : "text-muted-foreground/80 hover:text-primary"} 
            p-1 rounded-md flex items-center group`}
        >
            <motion.div
                onPointerDown={(e) => dragControls.start(e)}
                className="cursor-grab active:cursor-grabbing p-0.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
            >

                <GripVertical size={15} />
            </motion.div>

            {isEditing ? (
                <div
                    className="flex items-center text-xs transition-colors w-full text-left truncate"
                >
                    <Frame size={12} className="mr-1" />
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => onNameChange(e.target.value)}
                        onBlur={onSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSave();
                            } else if (e.key === 'Escape') {
                                onCancel();
                            }
                        }}
                        className="text-xs bg-background border border-border rounded px-1 py-0.5 w-full"
                        autoFocus
                    />
                </div>
            ) : (
                <button
                    className="text-xs transition-colors flex items-center w-full text-left truncate"
                    onClick={() => onOpenTab("frame", frame._id, frame.title)}
                    onDoubleClick={onEdit}
                >
                    <Frame size={12} className="inline mr-1" />
                    {frame.title}
                </button>
            )}
        </Reorder.Item>
    );
}

export function DraggableSidebar(props: DraggableSidebarProps) {
    const currentChannelOrder = useRef<string[]>([]);
    const channelSyncTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleChannelReorder = useCallback((reorderedChannels: Channel[]) => {
        const channelIds = reorderedChannels.map(c => c._id);
        currentChannelOrder.current = channelIds;
        props.onChannelReorder(channelIds);

        // Clear existing timeout
        if (channelSyncTimeout.current) {
            clearTimeout(channelSyncTimeout.current);
        }

        // Set new timeout to sync after drag ends (500ms delay)
        channelSyncTimeout.current = setTimeout(() => {
            if (props.onChannelReorderEnd && channelIds.length > 0) {
                props.onChannelReorderEnd(channelIds);
            }
        }, 500);
    }, [props]);

    return (
        <div>
            <Reorder.Group
                axis="y"
                values={props.channels}
                onReorder={handleChannelReorder}
            >
                {props.channels.map((channel) => (
                    <DraggableChannel
                        key={channel._id}
                        channel={channel}
                        isSelected={props.selectedTabId === channel._id}
                        isEditing={props.editingChannel === channel._id}
                        editingName={props.editingChannelName}
                        frames={props.framesByChannel[channel._id] || []}
                        isOpen={props.openChannels.has(channel._id)}
                        editingFrame={props.editingFrame}
                        editingFrameName={props.editingFrameName}
                        onToggle={() => props.onToggleChannel(channel._id)}
                        onOpenTab={props.onOpenTab}
                        onCreateFrame={() => props.onCreateFrame(channel._id)}
                        onEdit={() => props.onEditChannel(channel._id, channel.title)}
                        onSave={() => props.onSaveChannel(channel._id)}
                        onCancel={props.onCancelEditChannel}
                        onNameChange={props.onEditChannelNameChange}
                        onFrameReorder={(frameIds) => props.onFrameReorder(channel._id, frameIds)}
                        onFrameReorderEnd={(frameIds) => props.onFrameReorderEnd?.(channel._id, frameIds)}
                        onEditFrame={props.onEditFrame}
                        onSaveFrame={props.onSaveFrame}
                        onCancelEditFrame={props.onCancelEditFrame}
                        onFrameNameChange={props.onEditFrameNameChange}
                    />
                ))}
            </Reorder.Group>
        </div>
    );
}
