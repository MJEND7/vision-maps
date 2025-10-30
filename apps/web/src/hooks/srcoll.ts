import { useEffect, useRef } from "react";

export default function useSmoothWheelScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean,
  enabled = true
) {
  const velocityRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isMobile || !enabled) return;

    const friction = 1; // higher = smoother deceleration
    const speedMultiplier = 1;

    const animate = () => {
      if (!container) return;

      container.scrollLeft += velocityRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;

      // Stop if we're hitting bounds
      if (
        container.scrollLeft <= 0 ||
        container.scrollLeft >= maxScroll
      ) {
        velocityRef.current = 0;
      }

      velocityRef.current *= friction;

      if (Math.abs(velocityRef.current) >= 0.1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Grab the dominant scroll axis (horizontal usually deltaX)
      const delta =
        Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

      // Only handle horizontal/vertical scrolls without modifiers
      if (delta === 0 || e.altKey || e.ctrlKey || e.metaKey) return;

      e.preventDefault();
      velocityRef.current += delta * speedMultiplier;

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [scrollContainerRef, isMobile, enabled]);
}
