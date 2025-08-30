"use client";

import { motion, Reorder, useDragControls, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useCallback } from "react";

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
}: {
  tab: Tab;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  renderTabIcon: (type: string) => React.ReactNode;
}) {
  const dragControls = useDragControls();

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  }, [onRemove]);

  return (
    <Reorder.Item
      key={tab.id}
      value={tab}
      dragListener={false}
      dragControls={dragControls}
      className="relative"
      whileDrag={{ scale: 1.02, zIndex: 50 }}
      initial={{ width: 0, opacity: 0, x: -10 }}
      animate={{ width: 180, opacity: 1, x: 0 }}
      exit={{ 
        width: 0, 
        opacity: 0,
        x: -10,
        transition: { duration: 0.25, ease: "easeInOut" }
      }}
      transition={{ duration: 0.2 }}
      style={{ overflow: "hidden" }}
    >
      <motion.button
        onClick={onSelect}
        onPointerDown={(e) => dragControls.start(e)}
        className={`
          relative w-[180px] flex bg-background p-2 rounded-t-lg justify-between items-center
          cursor-grab active:cursor-grabbing select-none
          transition-all duration-200 ease-out
          ${isSelected 
            ? 'bg-background z-10 shadow-sm' 
            : 'bg-muted/30 hover:bg-background/80'
          }
        `}
        style={{ minWidth: "180px" }}
        whileHover={{ 
          y: isSelected ? 0 : -1,
          transition: { duration: 0.15 }
        }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-2 text-xs truncate flex-1">
          {renderTabIcon(tab.type)}
          <span className="truncate">{tab.title}</span>
        </div>

        <motion.button
          onClick={handleRemove}
          className="ml-2 rounded-full p-0.5 hover:bg-muted-foreground/10 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={12} />
        </motion.button>

      </motion.button>
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
  return (
    <div className="flex gap-0 w-full pt-2 px-2 h-10 bg-accent overflow-x-auto">
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
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
}
