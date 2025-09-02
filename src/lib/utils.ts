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
