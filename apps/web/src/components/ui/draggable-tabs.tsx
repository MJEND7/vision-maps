"use client";

import { Reorder } from "motion/react";
import { X } from "lucide-react";
import {
    useCallback,
    useEffect,
    useState,
    useRef,
    useLayoutEffect,
    memo,
} from "react";
import { cn } from "@/lib/utils";
import { TabStore } from "@/types/vision_page";
import useSmoothWheelScroll from "@/hooks/srcoll";

function useLongPress(callback: { start: () => void, process: (id: string) => void, end: (id: string) => void }, delay = 500, max = 2) {
    const timerRef = useRef<number>(0);
    const interval = useRef<NodeJS.Timeout | null>(null);

    const start = useCallback((_: React.TouchEvent, id: string) => {
        callback.start();
        interval.current = setInterval(() => {
            timerRef.current += 1
            if (timerRef.current == max) {
                if (interval.current) {
                    clearInterval(interval.current);
                }
                timerRef.current = 0
                callback.process(id);
            }
        }, delay);
    }, [callback.start, delay]);

    const end = useCallback((_: React.TouchEvent, id: string) => {
        if (interval.current) {
            clearInterval(interval.current);
        }
        timerRef.current = 0;
        callback.end(id);
    }, [callback.end]);

    return {
        onTouchStart: start,
        onTouchEnd: end,
    };
}

const DraggableTab = memo(function DraggableTab({
    tab,
    isSelected,
    onSelect,
    onRemove,
    renderTabIcon,
    isMobile,
    isDraggable,
    onTouchStart,
    onTouchEnd,
}: {
    tab: TabStore;
    isSelected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    renderTabIcon: (type: string) => React.ReactNode;
    isMobile: boolean;
    isDraggable: boolean
    onTouchStart?: (e: React.TouchEvent, id: string) => void;
    onTouchEnd?: (e: React.TouchEvent, id: string) => void;
}) {

    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove();
        },
        [onRemove],
    );

    const tabWidth = isMobile ? 120 : 180;
    const maxTitleLength = isMobile ? 8 : 20;
    const displayTitle =
        tab.title.length > maxTitleLength
            ? `${tab.title.substring(0, maxTitleLength)}...`
            : tab.title;

    const content = (
        <div
            onClick={onSelect}
            className={cn(
                "relative pointer-events-auto flex bg-background p-2 rounded-t-lg justify-between items-center",
                "select-none cursor-pointer transition-colors",
                isSelected
                    ? "bg-background z-10 shadow-sm"
                    : isDraggable ? "bg-black/20" : "bg-accent hover:bg-background/80",
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
                    isMobile ? "gap-1" : "gap-2",
                )}
                type="button"
            >
                {renderTabIcon(tab.type)}
                <span className="truncate">{displayTitle}</span>
            </button>

            <button
                onClick={handleRemove}
                className={cn(
                    "rounded-full hover:bg-muted-foreground/10 transition-colors",
                    "ml-2 p-0.5",
                )}
                type="button"
            >
                <X size={12} />
            </button>
        </div>
    );

    return (
        <Reorder.Item
            key={tab.id}
            value={tab}
            onClick={onSelect}
            className={cn("relative cursor-grab active:cursor-grabbing")}
            dragListener={isDraggable}
            data-tab-id={tab.id}
            onTouchStart={(e) => { if (onTouchStart) onTouchStart(e, tab.id) }}
            onTouchEnd={(e) => { if (onTouchEnd) onTouchEnd(e, tab.id) }}
            style={{
                overflow: "hidden",
                flexShrink: 0,
            }}
        >
            {content}
        </Reorder.Item>
    );
});

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
    const mobileDragDebounce = useRef<NodeJS.Timeout | undefined>(null);
    const [mobileDragEnabled, setMobileDragEnabled] = useState(false);
    const [draggableTab, setDraggableTab] = useState<string | null>(null);

    const longPressHandlers = useLongPress({
        start: () => {
            if (!mobileDragDebounce.current) return
            clearTimeout(mobileDragDebounce.current)
        },
        process: (id) => {
            setMobileDragEnabled(true)
            setDraggableTab(id)
            if (navigator.vibrate) navigator.vibrate(10);
        },
        end: () => {
            if (mobileDragDebounce.current) {
                clearTimeout(mobileDragDebounce.current)
            }
            if (!mobileDragEnabled) return
            mobileDragDebounce.current = setTimeout(() => {
                setMobileDragEnabled(false)
                setDraggableTab(null)
            }, 1500);
        }
    });

    // Resize observer to track viewport size
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            setIsMobile(window.innerWidth < 768);
        });
        observer.observe(document.body);
        setIsMobile(window.innerWidth < 768);
        return () => observer.disconnect();
    }, []);

    useSmoothWheelScroll(scrollContainerRef, isMobile)

    // Auto‑scroll selected tab into view
    useLayoutEffect(() => {
        if (selectedTab && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const selectedTabElement = container.querySelector<HTMLElement>(
                `[data-tab-id="${selectedTab.id}"]`,
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
        (newOrder: TabStore[]) => {
            TabReorderAction(newOrder);
        },
        [TabReorderAction],
    );

    return (
        <div
            ref={scrollContainerRef}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
                "flex gap-0 w-full bg-accent overflow-hidden scrollbar-hide",
                isMobile ? "pt-1 px-1 h-9" : "pt-2 px-2 h-10",
            )}
            style={{
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch",
                overflowX: "auto",
                overscrollBehaviorX: "contain",
            }}

        >
            <Reorder.Group
                axis="x"
                values={tabs}
                onReorder={handleReorder}
                layoutScroll
                className="flex gap-0"
                style={{
                    display: "flex",
                    flexShrink: 0,
                    width: "max-content",
                }}
            >
                {tabs.map((tab) => (
                    <DraggableTab
                        key={tab.id}
                        tab={tab}
                        isSelected={selectedTab?.id === tab.id}
                        {...(isMobile ? { ...longPressHandlers } : {})}
                        onSelect={() => {
                            if (mobileDragDebounce.current) {
                                clearTimeout(mobileDragDebounce.current)
                            }
                            TabSelectAction(tab);
                            setMobileDragEnabled(false)
                        }}
                        onRemove={() => {
                            if (mobileDragDebounce.current) {
                                clearTimeout(mobileDragDebounce.current)
                            }
                            TabRemoveAction(tab.id);
                            setMobileDragEnabled(false)
                        }}
                        renderTabIcon={renderTabIconAction}
                        isMobile={isMobile}
                        isDraggable={!isMobile || isMobile && mobileDragEnabled && draggableTab == tab.id}
                    />
                ))}
            </Reorder.Group>
        </div>
    );
}
