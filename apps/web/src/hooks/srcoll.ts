import { useEffect, useRef } from "react";

function useSmoothWheelScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean,
  enabled: boolean = true
) {
  const velocityRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;

    // Return early if conditions aren't met
    if (!container || isMobile || !enabled) return;

    const friction = 0.55;
    const speedMultiplier = 0.5;

    const animate = () => {
      if (!container) return;

      container.scrollLeft += velocityRef.current;
      velocityRef.current *= friction;

      if (Math.abs(velocityRef.current) > 0.1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        velocityRef.current = 0;
        rafIdRef.current = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && !e.altKey) {
        e.preventDefault();
        velocityRef.current += e.deltaY * speedMultiplier;

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(animate);
        }
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

export default useSmoothWheelScroll;
