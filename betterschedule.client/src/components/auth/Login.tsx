/**
 * @file Full login wrapper.
 * @summary Renders LoginBase in "full" variant (standard login/register enabled).
 */

import React from "react";
import LoginBase from "./LoginBase";

/** Full login page */
const Login: React.FC = () => {
    return <LoginBase variant="full" />;
};

export default Login;
