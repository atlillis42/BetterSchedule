export const isManager = (roles: string[]) => roles.includes("Manager");
export const isProvider = (roles: string[]) => roles.includes("ServiceProvider");
export const isClient = (roles: string[]) => roles.includes("Client");