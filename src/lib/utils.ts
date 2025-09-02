import { clsx, type ClassValue } from "clsx"
import { useLayoutEffect, useState } from "react";
import { twMerge } from "tailwind-merge"

// UI UTILS ONLY

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
}

export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [node, setNode] = useState<T | null>(null);

  useLayoutEffect(() => {
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node]);

  return [setNode, size] as const;
}
