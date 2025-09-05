"use client";

import {
  motion,
  Reorder,
  useDragControls,
  AnimatePresence,
} from "motion/react";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
} from "react";
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
  isMobile,
}: {
  tab: Tab;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  renderTabIcon: (type: string) => React.ReactNode;
  isMobile: boolean;
}) {
  const dragControls = useDragControls();
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove();
    },
    [onRemove]
  );

  const tabWidth = isMobile ? 120 : 180;
  const maxTitleLength = isMobile ? 8 : 20;

  // Start drag only after long press
  const handlePointerDown = (e: React.PointerEvent) => {
    // Allow normal scroll if user just swipes
    longPressTimeout.current = setTimeout(() => {
      dragControls.start(e);
    }, 250); // 250ms long press
  };

  const handlePointerUp = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  return (
    <Reorder.Item
      key={tab.id}
      value={tab}
      onClick={onSelect}
      dragListener={false} // we control drag manually
      dragControls={dragControls}
      className="relative"
      data-tab-id={tab.id}
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      initial={{ width: 0, opacity: 0, x: -10 }}
      animate={{ width: tabWidth, opacity: 1, x: 0 }}
      exit={{
        width: 0,
        opacity: 0,
        x: -10,
        transition: { duration: 0.25, ease: "easeInOut" },
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
            ? "bg-background z-10 shadow-sm"
            : "bg-muted/30 hover:bg-background/80"
        )}
        style={{
          minWidth: `${tabWidth}px`,
          width: `${tabWidth}px`,
          flexShrink: 0,
        }}
        whileHover={{
          y: isSelected ? 0 : -1,
          transition: { duration: 0.15 },
        }}
        whileTap={{ scale: 0.99 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <button
          className={cn(
            "flex items-center gap-1 truncate flex-1 text-left",
            "text-xs",
            isMobile ? "gap-1" : "gap-2"
          )}
        >
          {renderTabIcon(tab.type)}
          <span className="truncate">
            {tab.title.length > maxTitleLength
              ? `${tab.title.substring(0, maxTitleLength)}...`
              : tab.title}
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        onReorder={TabReorderAction}
        className="flex gap-0 min-w-max"
        style={{
          display: "flex",
          flexShrink: 0,
          width: "max-content",
        }}
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
