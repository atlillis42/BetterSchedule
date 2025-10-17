namespace BetterSchedule.Server.Services.Errors
{
    /// <summary>Standard API error payload.</summary>
    public record ApiError(string Code, string Message)
    {
        public static ApiError Validation(string message) => new("VALIDATION_ERROR", message);
        public static ApiError ReservationConflict(string message) => new("RESERVATION_CONFLICT", message);
        public static ApiError BlockOverlap(string message) => new("BLOCK_OVERLAP", message);
        public static ApiError InsideCancelWindow(string message) => new("INSIDE_CANCEL_WINDOW", message);
    }
}
