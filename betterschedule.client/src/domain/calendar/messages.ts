/**
 * Short labels and prompts used by calendar UI glue.
 * Extracted for testability and consistency across entry points.
 */
export const Messages = {
    // Preflight / validation
    ConflictOverlap: "This time overlaps an existing booking.",
    ConflictBlocked: "This time is blocked by the provider or resource.",

    // Confirmations
    ConfirmCancelWindowOverride: "This is inside the organization’s change window. Override and proceed?",

    // Toasts / notices
    WarnDoubleBook: "Heads up: this overlaps another booking.",
    PermissionDenied: "You don’t have permission to perform this action.",
};
