export const VISIT_START_KEY = 'vision_maps_visit_start';
export const ELAPSED_TIME_KEY = 'vision_maps_elapsed_time';
export const LAST_UPDATE_KEY = 'vision_maps_last_update';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function setVisitStartTime(): void {
  if (typeof window !== 'undefined') {
    const now = Date.now();
    
    // Check if we need to reset (after 1 day)
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
    if (lastUpdate && (now - parseInt(lastUpdate, 10)) > ONE_DAY_MS) {
      localStorage.removeItem(VISIT_START_KEY);
      localStorage.removeItem(ELAPSED_TIME_KEY);
      localStorage.removeItem(LAST_UPDATE_KEY);
    }
    
    // Only set start time if not already set
    if (!localStorage.getItem(VISIT_START_KEY)) {
      localStorage.setItem(VISIT_START_KEY, now.toString());
      localStorage.setItem(ELAPSED_TIME_KEY, '0');
    }
    localStorage.setItem(LAST_UPDATE_KEY, now.toString());
  }
}

export function getVisitStartTime(): number | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(VISIT_START_KEY);
    return stored ? parseInt(stored, 10) : null;
  }
  return null;
}

export function clearVisitStartTime(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(VISIT_START_KEY);
    localStorage.removeItem(ELAPSED_TIME_KEY);
    localStorage.removeItem(LAST_UPDATE_KEY);
  }
}

export function updateElapsedTime(): void {
  if (typeof window !== 'undefined') {
    const startTime = getVisitStartTime();
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
    
    if (startTime && lastUpdate) {
      const now = Date.now();
      const sessionTime = (now - parseInt(lastUpdate, 10)) * 0.7; // Apply 30% slowdown
      const currentElapsed = parseFloat(localStorage.getItem(ELAPSED_TIME_KEY) || '0');
      const newElapsed = currentElapsed + sessionTime;
      
      localStorage.setItem(ELAPSED_TIME_KEY, newElapsed.toString());
      localStorage.setItem(LAST_UPDATE_KEY, now.toString());
    }
  }
}

export function getSecondsWasted(): number {
  const startTime = getVisitStartTime();
  if (!startTime) return 0;
  
  return Math.floor((Date.now() - startTime) / 1000);
}

export function getSecondsWithDecimalsWasted(): number {
  if (typeof window !== 'undefined') {
    updateElapsedTime();
    const elapsed = parseFloat(localStorage.getItem(ELAPSED_TIME_KEY) || '0');
    return elapsed / 1000; // Convert to seconds
  }
  return 0;
}