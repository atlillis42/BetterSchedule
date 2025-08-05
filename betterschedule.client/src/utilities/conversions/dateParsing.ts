export function getLocalDateString(dateLike: string | Date | { toDate?: () => Date }): string {
    let d: Date | null = null;
    if (dateLike && typeof (dateLike as any).toDate === "function") {
        d = (dateLike as any).toDate();
    } else if (typeof dateLike === "string") {
        d = new Date(dateLike);
    } else if (dateLike instanceof Date) {
        d = dateLike;
    }
    return d && !isNaN(d.getTime())
        ? d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, "0") + '-' +
        String(d.getDate()).padStart(2, "0")
        : "";
}

export function getLocalTimeString(dateLike: string | Date | { toDate?: () => Date }): string {
    let d: Date | null = null;
    if (dateLike && typeof (dateLike as any).toDate === "function") {
        d = (dateLike as any).toDate();
    } else if (typeof dateLike === "string") {
        d = new Date(dateLike);
    } else if (dateLike instanceof Date) {
        d = dateLike;
    }
    return d && !isNaN(d.getTime())
        ? String(d.getHours()).padStart(2, "0") + ':' +
        String(d.getMinutes()).padStart(2, "0")
        : "";
}

/**
 * Combines local date and time strings into an ISO8601 UTC string.
 * Returns: { iso: string | null, errorField?: string, errorMsg?: string }
 */
export function combineDateTime(
    dateStr: string,
    timeStr: string
): { iso: string | null; errorField?: string; errorMsg?: string } {
    const datePart = (dateStr || "").trim().slice(0, 10);
    const timePart = (timeStr || "").trim().slice(0, 5);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return {
            iso: null,
            errorField: "startDate",
            errorMsg: "Please select a valid date (YYYY-MM-DD)."
        };
    }
    if (!/^\d{2}:\d{2}$/.test(timePart)) {
        return {
            iso: null,
            errorField: "startTime",
            errorMsg: "Please select a valid time (HH:mm)."
        };
    }

    const localDateTimeString = `${datePart}T${timePart}:00`;
    const d = new Date(localDateTimeString);

    if (isNaN(d.getTime())) {
        return {
            iso: null,
            errorField: "startTime",
            errorMsg: "Invalid date or time combination."
        };
    }

    return { iso: d.toISOString() };
}

export function toISODate(mdyyyy: string): string {
    const [month, day, year] = mdyyyy.split("/");
    if (!month || !day || !year) return "";
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
