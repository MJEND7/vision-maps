import { useEffect } from "react";

function useSmoothWheelScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean
) {
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isMobile) return;

    let velocity = 0;
    let rafId: number | null = null;

    const friction = 0.95; // 0.90–0.97 works well; smaller is slower
    const speedMultiplier = 1.2; // a sensitivity factor

    const animate = () => {
      if (!container) return;
      container.scrollLeft += velocity;
      velocity *= friction;

      if (Math.abs(velocity) > 0.1) {
        rafId = requestAnimationFrame(animate);
      } else {
        velocity = 0;
        rafId = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && !e.altKey) {
        e.preventDefault();
        velocity += e.deltaY * speedMultiplier;

        if (!rafId) {
          rafId = requestAnimationFrame(animate);
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollContainerRef, isMobile]);
}

export default useSmoothWheelScroll;
