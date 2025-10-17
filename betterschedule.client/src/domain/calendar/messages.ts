/**
 * Calendar UI messages and prompts used across create/update flows.
 * Centralizing these strings ensures consistent copy and enables
 * easier i18n/localization in the future.
 *
 * @public
 */
export const Messages = {
    // -----------------------
    // Preflight / validation
    // -----------------------

    /**
     * Short notice used when a selected time range overlaps an existing booking.
     */
    ConflictOverlap: "This time overlaps an existing booking.",

    /**
     * Short notice used when the selected time range intersects a blocked window
     * (provider or resource).
     */
    ConflictBlocked: "This time is blocked by the provider or resource.",

    // --------------
    // Confirmations
    // --------------

    /**
     * Confirmation message shown when an operation is inside the organization’s
     * cancel/change window and requires an explicit override.
     */
    ConfirmCancelWindowOverride:
        "This is inside the organization’s change window. Override and proceed?",

    /**
     * Confirmation message shown when an operation is inside the organization’s
     * advance booking (lead-time) window and requires an explicit override.
     */
    ConfirmLeadTimeOverride:
        "This is inside the organization’s lead-time. Override and proceed?",

    /**
     * Confirmation message shown when a save would double-book a provider or resource.
     */
    ConfirmDoubleBook: "This overlaps another booking. Continue?",

    /**
     * Confirmation message shown when a save collides with a blocked window.
     */
    ConfirmBlocked: "This time is blocked by the provider or resource. Continue?",

    // ----------------
    // Toasts / notices
    // ----------------

    /**
     * Post-commit informational toast for overlap warnings (soft).
     */
    WarnDoubleBook: "Heads up: this overlaps another booking.",

    /**
     * Generic permission error shown in UI when the current principal lacks access.
     */
    PermissionDenied: "You don’t have permission to perform this action.",
} as const;
