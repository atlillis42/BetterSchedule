import { useEffect } from "react";

export function useMonthResize(containerRef: React.RefObject<HTMLElement>) {
    useEffect(() => {
        if (!containerRef.current) return;

        const resize = () => {
            const calendarEl = containerRef.current?.querySelector(".month_main") as HTMLElement | null;
            if (calendarEl) {
                calendarEl.style.width = "100%";
            }
        };

        // Initial manual call to cover first render
        const timeoutId = setTimeout(resize, 100); // Give DayPilot time to mount

        // Watch for resizes
        const observer = new ResizeObserver(resize);
        observer.observe(containerRef.current);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [containerRef]);
}
