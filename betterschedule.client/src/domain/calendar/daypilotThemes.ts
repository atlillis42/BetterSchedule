import type { ViewMode } from "@/types/calendarView";

/**
 * Flip this to false to instantly revert to the old "betterschedule" themes.
 * (We keep the mapping here so you can toggle without touching components.)
 */
const USE_NEW_THEMES = true;

type ThemeName = string | undefined;

/**
 * Returns the DayPilot theme name to use for the given view.
 * When USE_NEW_THEMES=false, we match your current setup.
 */
export function themeForView(view: ViewMode): ThemeName {
    if (!USE_NEW_THEMES) {
        switch (view) {
            case "Month":
                return "monthlybetterschedule";
            case "Resources":
                // Old code didn't pass a theme to Scheduler (default theme).
                return undefined;
            case "Day":
            case "Week":
            default:
                return "betterschedule";
        }
    }

    // Modular themes
    switch (view) {
        case "Month":
            return "monthview";
        case "Resources":
            return "resourceview";
        case "Day":
            return "weekview";
        case "Week":
        default:
            return "weekview";
    }
}

/** Navigator uses its own theme name. */
export function navigatorTheme(): ThemeName {
    return USE_NEW_THEMES ? "navigator" : "betterschedule_navigator";
}
