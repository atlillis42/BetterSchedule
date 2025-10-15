import type { ViewMode } from "@/types/calendarView";

/**
 * Returns the DayPilot theme name for the given view.
 * Must match the CSS classes you ship in styles.
 */
export function themeForView(view: ViewMode): string | undefined {
    switch (view) {
        case "Month":
            return "monthview";
        case "Resources":
            return "resourceview";
        case "Day":
        case "Week":
        default:
            return "weekview";
    }
}

/** Theme for the date navigator widget. */
export function navigatorTheme(): string | undefined {
    return "navigator";
}
