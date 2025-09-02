import React from "react";
import RequireRole from "./RequireRole";

/** Gates content to Managers only. */
export default function RequireManager({ children }: { children: React.ReactNode }) {
    return <RequireRole allow={["Manager"]}>{children}</RequireRole>;
}
