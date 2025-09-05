"use client";

import { motion, Reorder, useDragControls, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
    id: string;
    title: string;
    type: string;
}

interface DraggableTabsProps {
    tabs: Tab[];
    selectedTab: Tab | null;
    TabSelectAction: (tab: Tab) => void;
    TabRemoveAction: (id: string) => void;
    TabReorderAction: (tabs: Tab[]) => void;
    renderTabIconAction: (type: string) => React.ReactNode;
}

function DraggableTab({
    tab,
    isSelected,
    onSelect,
    onRemove,
    renderTabIcon,
    isMobile
}: {
    tab: Tab;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    renderTabIcon: (type: string) => React.ReactNode;
    isMobile: boolean;
}) {
    const dragControls = useDragControls();

    const handleRemove = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    }, [onRemove]);

    const tabWidth = isMobile ? 140 : 180;
    const maxTitleLength = isMobile ? 10 : 20;

    return (
        <Reorder.Item
            key={tab.id}
            value={tab}
            onClick={onSelect}
            dragListener={false}
            dragControls={dragControls}
            className="relative"
            whileDrag={{ scale: 1.02, zIndex: 50 }}
            initial={{ width: 0, opacity: 0, x: -10 }}
            animate={{ width: tabWidth, opacity: 1, x: 0 }}
            exit={{
                width: 0,
                opacity: 0,
                x: -10,
                transition: { duration: 0.25, ease: "easeInOut" }
            }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
        >
            <motion.div
                className={cn(
                    "relative flex bg-background p-2 rounded-t-lg justify-between items-center",
                    "cursor-grab active:cursor-grabbing select-none",
                    "transition-all duration-200 ease-out",
                    isSelected
                        ? 'bg-background z-10 shadow-sm'
                        : 'bg-muted/30 hover:bg-background/80'
                )}
                style={{ 
                    minWidth: `${tabWidth}px`,
                    width: `${tabWidth}px`
                }}
                whileHover={{
                    y: isSelected ? 0 : -1,
                    transition: { duration: 0.15 }
                }}
                whileTap={{ scale: 0.99 }}
                onPointerDown={(e) => dragControls.start(e)}
            >
                <button
                    className={cn(
                        "flex items-center gap-1 truncate flex-1 text-left",
                        isMobile ? "text-xs" : "text-xs",
                        isMobile ? "gap-1" : "gap-2"
                    )}
                >
                    {renderTabIcon(tab.type)}
                    <span className="truncate">
                        {tab.title.length > maxTitleLength 
                            ? `${tab.title.substring(0, maxTitleLength)}...` 
                            : tab.title
                        }
                    </span>
                </button>

                <motion.button
                    onClick={handleRemove}
                    className={cn(
                        "rounded-full hover:bg-muted-foreground/10 transition-colors",
                        "ml-2 p-0.5"
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <X size={12} />
                </motion.button>

            </motion.div>
        </Reorder.Item>
    );
}

export function DraggableTabs({
    tabs,
    selectedTab,
    TabSelectAction,
    TabRemoveAction,
    TabReorderAction,
    renderTabIconAction,
}: DraggableTabsProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className={cn(
            "flex gap-0 w-full bg-accent overflow-x-auto",
            isMobile ? "pt-1 px-1 h-9" : "pt-2 px-2 h-10"
        )}>
            <Reorder.Group
                axis="x"
                values={tabs}
                onReorder={TabReorderAction}
                className="flex gap-0"
            >
                <AnimatePresence mode="popLayout">
                    {tabs.map((tab) => (
                        <DraggableTab
                            key={tab.id}
                            tab={tab}
                            isSelected={selectedTab?.id === tab.id}
                            onSelect={() => TabSelectAction(tab)}
                            onRemove={() => TabRemoveAction(tab.id)}
                            renderTabIcon={renderTabIconAction}
                            isMobile={isMobile}
                        />
                    ))}
                </AnimatePresence>
            </Reorder.Group>
        </div>
    );
}
