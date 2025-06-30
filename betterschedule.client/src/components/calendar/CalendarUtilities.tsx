import { DayPilot } from "@daypilot/daypilot-lite-react";

/**
 * Returns a nicely-formatted header object for DayPilot Week view.
 *
 * @param d DayPilot.Date (the column’s date)
 * @param locale optional BCP-47 locale, defaults to en-US
 */
export const formatWeekHeader = (
    d: DayPilot.Date,
    locale: string = "en-US"
) => {
    const jsDate = d.toDate();               // Convert to native Date

    const weekday = jsDate.toLocaleDateString(locale, {
        weekday: "long",
    });                                       // → Monday

    const short = jsDate.toLocaleDateString(locale, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
    });                                       // → 6/29/2025

    return { weekday, short };
};