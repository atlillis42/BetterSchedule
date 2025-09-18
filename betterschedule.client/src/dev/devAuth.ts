import type { DevUser } from "./devUsers";

export async function attemptDevLogin(
    login: (identifier: string, password: string) => Promise<{ success: boolean } | void>,
    user: DevUser
): Promise<boolean> {
    const res: any = await login(user.identifier, user.password);
    return !!res && res.success === true;
}
