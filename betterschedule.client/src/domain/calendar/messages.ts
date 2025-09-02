/**
 * Short labels and prompts used by calendar UI glue.
 * Extracted for testability and consistency across entry points.
 */
export const Messages = {
    // Shading tooltips
    OutsideProviderAvailability: "Outside provider availability",
    OutsideOrgBusinessHours: "Outside organization business hours",

    // Preflight validations
    SelectionOutsideAvailability: "Selected time is outside provider availability.",

    // Confirmations
    ConfirmOutsideAvailability: "This is outside provider availability. Proceed anyway?",
    ConfirmCancelWindowOverride: "This is inside the organization’s change window. Override and proceed?",

    // Toasts
    PermissionDenied: "You don’t have permission to perform this action.",
};
