/**
 * Static legend for reservation status colors.
 */
export default function CalendarLegend() {
    return (
        <div className="ml-4 flex items-center gap-3 text-xs p-2 border-b bg-white">
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#3b82f6" }} />
                <span>Booked</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#10b981" }} />
                <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#f59e0b" }} />
                <span>No-Show</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: "#9ca3af" }} />
                <span>Canceled</span>
            </div>
        </div>
    );
}
