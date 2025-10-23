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

interface DraggableTabsProps {
  tabs: TabStore[];
  selectedTab: TabStore | null;
  TabSelectAction: (tab: TabStore | null) => void;
  TabRemoveAction: (id: string) => void;
  TabReorderAction: (tabs: TabStore[]) => void;
  renderTabIconAction: (type: string) => React.ReactNode;
}

const DraggableTab = memo(function DraggableTab({
  tab,
  isSelected,
  onSelect,
  onRemove,
  renderTabIcon,
  isMobile,
}: {
  tab: TabStore;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  renderTabIcon: (type: string) => React.ReactNode;
  isMobile: boolean;
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
  const displayTitle = tab.title.length > maxTitleLength
    ? `${tab.title.substring(0, maxTitleLength)}...`
    : tab.title;

  return (
    <Reorder.Item
      key={tab.id}
      value={tab}
      onClick={onSelect}
      className="relative cursor-grab active:cursor-grabbing"
      data-tab-id={tab.id}
      style={{
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        className={cn(
          "relative flex bg-background p-2 rounded-t-lg justify-between items-center",
          "select-none",
          isSelected
            ? "bg-background z-10 shadow-sm"
            : "bg-muted/30 hover:bg-background/80"
        )}
        style={{
          minWidth: `${tabWidth}px`,
          width: `${tabWidth}px`,
          touchAction: "none",
        }}
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

        <button
          onClick={handleRemove}
          className={cn(
            "rounded-full hover:bg-muted-foreground/10 transition-colors",
            "ml-2 p-0.5"
          )}
          type="button"
        >
          <X size={12} />
        </button>
      </div>
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
}: DraggableTabsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTabsRef = useRef<TabStore[]>(tabs);

  // Update ref without causing re-render
  useEffect(() => {
    prevTabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      setIsMobile(window.innerWidth < 768);
    });

    observer.observe(document.body);
    setIsMobile(window.innerWidth < 768);

    return () => observer.disconnect();
  }, []);

  // Handle horizontal scroll with mouse wheel on desktop
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && !e.altKey) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [isMobile]);

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

  const handleReorder = useCallback((newOrder: TabStore[]) => {
    // Notify parent immediately
    TabReorderAction(newOrder);
  }, [TabReorderAction]);

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex gap-0 w-full bg-accent overflow-hidden scrollbar-hide",
        isMobile ? "pt-1 px-1 h-9" : "pt-2 px-2 h-10"
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
            onSelect={() => TabSelectAction(tab)}
            onRemove={() => TabRemoveAction(tab.id)}
            renderTabIcon={renderTabIconAction}
            isMobile={isMobile}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}
