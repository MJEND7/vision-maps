"use client";

import { Reorder } from "motion/react";
import { X, GripVertical } from "lucide-react"; // 👈 Added GripVertical here
import {
    useCallback,
    useEffect,
    useState,
    useRef,
    useLayoutEffect,
} from "react";
import { cn } from "@/lib/utils";
import { TabStore } from "@/types/vision_page";
import useSmoothWheelScroll from "@/hooks/srcoll";

function useLongPress(
    callback: {
        start: () => void;
        process: (id: string) => void;
        end: (id: string) => void;
    },
    delay = 500,
    max = 2
) {
    const timerRef = useRef<number>(0);
    const interval = useRef<NodeJS.Timeout | null>(null);
    const initialTouchRef = useRef<{ x: number; y: number } | null>(null);
    const isScrollingRef = useRef<boolean>(false);

    const start = useCallback(
        (e: React.TouchEvent, id: string) => {
            const touch = e.touches[0];
            initialTouchRef.current = { x: touch.clientX, y: touch.clientY };
            isScrollingRef.current = false;

            callback.start();
            interval.current = setInterval(() => {
                if (isScrollingRef.current) {
                    if (interval.current) clearInterval(interval.current);
                    timerRef.current = 0;
                    return;
                }

                timerRef.current += 1;
                if (timerRef.current === max) {
                    if (interval.current) clearInterval(interval.current);
                    timerRef.current = 0;
                    callback.process(id);
                }
            }, delay);
        },
        [callback.start, delay, max]
    );

    const move = useCallback((e: React.TouchEvent) => {
        if (!initialTouchRef.current) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - initialTouchRef.current.x);
        const deltaY = Math.abs(touch.clientY - initialTouchRef.current.y);

        if (deltaX > 10 || deltaY > 10) {
            isScrollingRef.current = true;
            if (interval.current) clearInterval(interval.current);
            timerRef.current = 0;
        }
    }, []);

    const end = useCallback(
        (_: React.TouchEvent, id: string) => {
            if (interval.current) clearInterval(interval.current);
            timerRef.current = 0;
            initialTouchRef.current = null;
            isScrollingRef.current = false;
            callback.end(id);
        },
        [callback.end]
    );

    return {
        onTouchStart: start,
        onTouchMove: move,
        onTouchEnd: end,
    };
}

const DraggableTab = function DraggableTab({
    tab,
    isSelected,
    onSelect,
    onRemove,
    renderTabIcon,
    isMobile,
    isDraggable,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}: {
    tab: TabStore;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    renderTabIcon: (type: string) => React.ReactNode;
    isMobile: boolean;
    isDraggable: boolean;
    onTouchStart?: (e: React.TouchEvent, id: string) => void;
    onTouchMove?: (e: React.TouchEvent, id: string) => void;
    onTouchEnd?: (e: React.TouchEvent, id: string) => void;
}) {
    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove();
        },
        [onRemove]
    );

    const tabWidth = isMobile ? 120 : 180;
    const maxTitleLength = isMobile ? 8 : 20;
    const displayTitle =
        tab.title.length > maxTitleLength
            ? `${tab.title.substring(0, maxTitleLength)}...`
            : tab.title;

    const iconSize = isMobile ? 12 : 14;

    const content = (
        <div
            onClick={onSelect}
            className={cn(
                "relative pointer-events-auto flex bg-background p-2 rounded-t-lg justify-between items-center",
                "select-none cursor-pointer transition-colors",
                isSelected
                    ? "bg-background z-10 shadow-sm"
                    : "bg-accent hover:bg-background/80",
                isDraggable && isMobile ? "tab-reorganize" : ""
            )}
            style={{
                minWidth: `${tabWidth}px`,
                width: `${tabWidth}px`,
                flexShrink: 0,
                overflow: "hidden",
            }}
            data-tab-id={tab.id}
        >
            <button
                className={cn(
                    "flex items-center gap-1 truncate flex-1 text-left",
                    "text-xs",
                    isMobile ? "gap-1" : "gap-2"
                )}
                type="button"
            >
                {renderTabIcon(tab.type)}
                <span className="truncate">{displayTitle}</span>
            </button>

            {/* 👇 Dynamic icon change */}
            {isDraggable && isMobile ? (
                // Grip icon in org mode (disabled for click)
                <div className="ml-2 text-muted-foreground/70 cursor-grab p-0.5">
                    <GripVertical size={iconSize} />
                </div>
            ) : (
                // X icon in normal mode
                <button
                    onClick={handleRemove}
                    className={cn(
                        "rounded-full hover:bg-muted-foreground/10 transition-colors",
                        "ml-2 p-0.5"
                    )}
                    type="button"
                >
                    <X size={iconSize} />
                </button>
            )}
        </div>
    );

    if (!isDraggable)
        return (
            <div
                onTouchStart={(e) => onTouchStart?.(e, tab.id)}
                onTouchMove={(e) => onTouchMove?.(e, tab.id)}
                onTouchEnd={(e) => onTouchEnd?.(e, tab.id)}
            >
                {content}
            </div>
        );

    return (
        <Reorder.Item
            key={tab.id}
            value={tab}
            onClick={onSelect}
            className={cn("relative cursor-grab active:cursor-grabbing touch-none")}
            onTouchMove={(e) => onTouchMove?.(e, tab.id)}
            onTouchEnd={(e) => onTouchEnd?.(e, tab.id)}
            data-tab-id={tab.id}
            style={{ overflow: "hidden", flexShrink: 0 }}
        >
            {content}
        </Reorder.Item>
    );
};

export function DraggableTabs({
    tabs,
    selectedTab,
    TabSelectAction,
    TabRemoveAction,
    TabReorderAction,
    renderTabIconAction,
}: {
    tabs: TabStore[];
    selectedTab: TabStore | null;
    TabSelectAction: (tab: TabStore | null) => void;
    TabRemoveAction: (id: string) => void;
    TabReorderAction: (tabs: TabStore[]) => void;
    renderTabIconAction: (type: string) => React.ReactNode;
}) {
    const [isMobile, setIsMobile] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const mobileDragDebounce = useRef<NodeJS.Timeout | undefined>(undefined);
    const [mobileDragEnabled, setMobileDragEnabled] = useState(false);

    const longPressHandlers = useLongPress(
        {
            start: () => {
                if (!mobileDragDebounce.current) return;
                clearTimeout(mobileDragDebounce.current);
            },
            process: () => {
                setMobileDragEnabled(true);
                if (navigator.vibrate) navigator.vibrate(10);
            },
            end: () => {
                if (mobileDragDebounce.current) clearTimeout(mobileDragDebounce.current);
                if (!mobileDragEnabled) return;
                mobileDragDebounce.current = setTimeout(() => {
                    setMobileDragEnabled(false);
                }, 1500);
            },
        },
    );

    // Detect mobile viewport
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            setIsMobile(window.innerWidth < 768);
        });
        observer.observe(document.body);
        setIsMobile(window.innerWidth < 768);
        return () => observer.disconnect();
    }, []);

    useSmoothWheelScroll(scrollContainerRef, isMobile);

    // Auto-scroll selected tab
    useLayoutEffect(() => {
        if (selectedTab && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const selectedTabElement = container.querySelector<HTMLElement>(
                `[data-tab-id="${selectedTab.id}"]`
            );
            if (selectedTabElement) {
                selectedTabElement.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                });
            }
        }
    }, [selectedTab]);

    const handleReorder = useCallback(
        (newOrder: TabStore[]) => TabReorderAction(newOrder),
        [TabReorderAction]
    );

    const draggable = !isMobile || (isMobile && mobileDragEnabled);
    const items = tabs.map((tab) => (
        <DraggableTab
            key={tab.id}
            tab={tab}
            isSelected={selectedTab?.id === tab.id}
            {...(isMobile ? { ...longPressHandlers } : {})}
            onSelect={() => {
                if (mobileDragDebounce.current) clearTimeout(mobileDragDebounce.current);
                TabSelectAction(tab);
                setMobileDragEnabled(false);
            }}
            onRemove={() => {
                if (mobileDragDebounce.current) clearTimeout(mobileDragDebounce.current);
                TabRemoveAction(tab.id);
                setMobileDragEnabled(false);
            }}
            renderTabIcon={renderTabIconAction}
            isMobile={isMobile}
            isDraggable={draggable}
        />
    ));

    return (
        <div
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
                "flex gap-1 w-full bg-accent overflow-hidden",
                isMobile ? "pt-1 px-1 h-9" : "pt-2 px-2 h-10"
            )}
        >
            {
                draggable ? (
                    <Reorder.Group
                        axis="x"
                        values={tabs}
                        onReorder={handleReorder}
                        className="flex gap-1"
                        style={{ display: "flex", flexShrink: 0, width: "max-content" }
                        }
                    >
                        {items}
                    </Reorder.Group >
                ) : (

                    <div
                        ref={scrollContainerRef}
                        className={cn(
                            "flex gap-1 w-full bg-accent overflow-hidden scrollbar-hide",
                        )}
                        style={{
                            scrollBehavior: "smooth",
                            WebkitOverflowScrolling: "touch",
                            overflowX: "auto",
                            overscrollBehaviorX: "contain",
                        }}
                    >
                        {items}
                    </div>
                )}
        </div >
    );
}
