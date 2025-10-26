/**
 * React-Select inline styles that read BetterSchedule CSS variables.
 * This ensures dark mode applies even to inline styles set by react-select.
 *
 * Tokens (declared in react-select-overrides.css):
 *  --rs-bg, --rs-fg, --rs-muted, --rs-border, --rs-hover,
 *  --rs-focus, --rs-option-selected-bg, --rs-option-selected-fg, --rs-shadow
 */

import type { StylesConfig, GroupBase } from "react-select";

/**
 * Build a StylesConfig bound to our CSS variables so dark mode toggles “just work”.
 * @typeParam Option - The option type used in the Select.
 * @typeParam Group - The group type (defaults to GroupBase).
 * @returns StylesConfig usable in the `styles` prop of react-select.
 */
export function buildReactSelectStyles<
    Option,
    Group extends GroupBase<Option> = GroupBase<Option>
>(): StylesConfig<Option, false, Group> {
    return {
        container: (base) => ({
            ...base,
            fontSize: "0.875rem", // 14px to match inputs
        }),
        control: (base, state) => ({
            ...base,
            minHeight: 40,
            borderRadius: 10,
            backgroundColor: "var(--rs-bg)",
            borderColor: state.isFocused ? "var(--rs-focus)" : "var(--rs-border)",
            boxShadow: state.isFocused
                ? "0 0 0 2px color-mix(in srgb, var(--rs-focus) 35%, transparent)"
                : "none",
            ":hover": {
                borderColor: state.isFocused
                    ? "var(--rs-focus)"
                    : "color-mix(in srgb, var(--rs-border) 60%, var(--rs-focus) 40%)",
            },
            cursor: state.isDisabled ? "not-allowed" : "default",
            opacity: state.isDisabled ? 0.85 : 1,
        }),
        valueContainer: (base) => ({
            ...base,
            padding: "2px 10px",
            color: "var(--rs-fg)",
        }),
        singleValue: (base) => ({
            ...base,
            color: "var(--rs-fg)",
        }),
        placeholder: (base) => ({
            ...base,
            color: "var(--rs-muted)",
        }),
        input: (base) => ({
            ...base,
            color: "var(--rs-fg)",
        }),
        indicatorSeparator: () => ({ display: "none" }),
        dropdownIndicator: (base) => ({
            ...base,
            color: "var(--rs-muted)",
            ":hover": { color: "var(--rs-fg)" },
        }),
        clearIndicator: (base) => ({
            ...base,
            color: "var(--rs-muted)",
            ":hover": { color: "var(--rs-fg)" },
        }),
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999,
            color: "var(--rs-fg)",
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: "var(--rs-bg)",
            border: "1px solid var(--rs-border)",
            borderRadius: 10,
            marginTop: 6,
            boxShadow: "var(--rs-shadow)",
            overflow: "hidden",
            zIndex: 60,
        }),
        menuList: (base) => ({
            ...base,
            paddingTop: 6,
            paddingBottom: 6,
            backgroundColor: "var(--rs-bg)",
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
                ? "var(--rs-option-selected-bg)"
                : state.isFocused
                    ? "var(--rs-hover)"
                    : "var(--rs-bg)",
            color: state.isSelected
                ? "var(--rs-option-selected-fg)"
                : "var(--rs-fg)",
            cursor: state.isDisabled ? "not-allowed" : "pointer",
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: "color-mix(in srgb, var(--rs-hover) 80%, var(--rs-bg))",
            borderRadius: 6,
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "var(--rs-fg)",
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "var(--rs-muted)",
            ":hover": { color: "var(--rs-fg)", backgroundColor: "transparent" },
        }),
    };
}
