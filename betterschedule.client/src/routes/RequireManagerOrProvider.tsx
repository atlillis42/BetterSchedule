import React from "react";
import RequireRole from "./RequireRole";

/** Gates content to Managers OR ServiceProviders. */
export default function RequireManagerOrProvider({
    children,
}: {
        children: React.ReactNode;
}) {
    return <RequireRole allow={["Manager", "ServiceProvider"]}>{children}</RequireRole>;
}
