import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@daypilot/daypilot-lite-react", () => {
    class FakeDate {
        private iso: string;

        constructor(iso: string) {
            this.iso = iso;
        }

        /** Returns a new “date” N days later – keeps ISO for tests */
        addDays(days: number) {
            // simple YYYY-MM-DD → Date maths just for tests
            const d = new Date(this.iso);
            d.setDate(d.getDate() + days);
            const iso = d.toISOString().substring(0, 10);      // yyyy-MM-dd
            return new FakeDate(iso);
        }

        /** Formats are ignored – we only need yyyy-MM-dd */
        toString() {
            return this.iso;
        }

        static today() {
            // fixed value keeps tests deterministic
            return new FakeDate("2025-01-01");
        }

        /** Always return Monday for week tests (or Sunday if 0) */
        firstDayOfWeek(startOn = 0) {
            const d = new Date(this.iso);
            const day = d.getDay(); // Sunday=0, Monday=1, ...
            const diff = (7 + day - startOn) % 7;
            d.setDate(d.getDate() - diff);
            const iso = d.toISOString().substring(0, 10);
            return new FakeDate(iso);
        }

        /** Always return first of month */
        firstDayOfMonth() {
            const d = new Date(this.iso);
            d.setDate(1);
            const iso = d.toISOString().substring(0, 10);
            return new FakeDate(iso);
        }
    }

    return { DayPilot: { Date: FakeDate } };
});
// --------Import Helpers to Mocked Daypilot----------------------

import { DayPilot } from "@daypilot/daypilot-lite-react";
import { getResources, getEvents } from "@/api/calendar-api";
import { api } from "@auth/axios";
vi.mock("@auth/axios", () => ({
    api: { get: vi.fn() },
}));

const mockedApi = vi.mocked(api, true);

describe("calendar API helpers", () => {
    beforeEach(() => vi.resetAllMocks());

    it("calls /calendar/resources", async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [] });
        await getResources();
        expect(mockedApi.get).toHaveBeenCalledWith("/calendar/resources");
    });

    it("calls /calendar/events with correct params for Week view", async () => {
        const start = new DayPilot.Date("2025-06-23"); // Monday
        const end = start.addDays(7); // Next Monday
        mockedApi.get.mockResolvedValueOnce({ data: [] });

        await getEvents(start, end);

        expect(mockedApi.get).toHaveBeenCalledWith(
            "/calendar/events",
            expect.objectContaining({
                params: {
                    start: "2025-06-23",
                    end: "2025-06-30",
                },
            })
        );
    });
});
