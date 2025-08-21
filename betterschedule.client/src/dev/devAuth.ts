/**
 * Summary: Dev-only login utilities.
 * - attemptDevLogin: try email first, then username, against the current AuthContext.login.
 */
export type LoginFn = (identifier: string, password: string) => Promise<{ success: boolean } | { success?: boolean } | void>;

export async function attemptDevLogin(login: LoginFn, user: { email?: string; username?: string; password: string }): Promise<boolean> {
    const identifiers: string[] = [];
    if (user.email) identifiers.push(user.email);
    if (user.username && user.username !== user.email) identifiers.push(user.username);

    for (const id of identifiers) {
        // eslint-disable-next-line no-await-in-loop
        const res = await login(id, user.password);
        if ((res as any)?.success !== false) return true;
    }
    return false;
}
