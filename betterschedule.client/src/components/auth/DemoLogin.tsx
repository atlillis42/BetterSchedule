/**
 * @file Demo-only login wrapper.
 * @summary Renders LoginBase in "demo" variant (only sandbox flow enabled).
 */

import React from "react";
import LoginBase from "./LoginBase";

/** Demo login page (sandbox only). */
const DemoLogin: React.FC = () => {
    return <LoginBase variant="demo" />;
};

export default DemoLogin;
