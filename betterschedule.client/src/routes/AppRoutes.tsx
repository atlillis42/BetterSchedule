import { Routes, Route } from "react-router-dom";
import MainLayout from "@layout/MainLayout";
import RequireAuth from "@/routes/RequireAuth";
import RequireManager from "@/routes/RequireManager";
import RequireManagerOrProvider from "@/routes/RequireManagerOrProvider";
import RequireOrganization from "@/routes/RequireOrganization";

// Public pages
import Login from "@auth/Login";
import RegisterPage from "@/pages/Register";

// Auth-but-no-org page
import JoinOrganizationPage from "@/pages/JoinOrganization";

// Org-scoped app pages
import Calendar from "@calendar/Calendar";
import CalendarResourcesPage from "@/pages/CalendarResources";

// Admin pages (Manager-only)
import AppointmentTypeManager from "@/components/admin/AppointmentTypeManager";
import ProviderAvailabilityManager from "@/components/admin/ProviderAvailabilityManager";
import OrgSettingsPage from "@/pages/OrgSettings";
import UserRolesPage from "@/pages/UserRoles";

// Provider self page (Manager or Provider)
import ProviderAvailabilitySelf from "@/components/provider/ProviderAvailabilitySelf";

/**
 * @summary Central SPA route map. Applies org gating using RequireOrganization
 * on all routes that require an active organization scope.
 *
 * @remarks
 * - "/join" is only RequireAuth (reachable when authenticated but org-less).
 * - All operational pages (calendar, admin, provider) are RequireAuth + RequireOrganization.
 */
export default function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated, but may be org-less */}
            <Route
                path="/join"
                element={
                    <RequireAuth>
                        <MainLayout>
                            <JoinOrganizationPage />
                        </MainLayout>
                    </RequireAuth>
                }
            />

            {/* Org-scoped: Calendar */}
            <Route
                path="/calendar"
                element={
                    <RequireAuth>
                        <RequireOrganization>
                            <MainLayout>
                                <Calendar />
                            </MainLayout>
                        </RequireOrganization>
                    </RequireAuth>
                }
            />

            {/* Org-scoped: Provider Availability (self) — Managers OR Providers */}
            <Route
                path="/provider/availability"
                element={
                    <RequireAuth>
                        <RequireOrganization>
                            <RequireManagerOrProvider>
                                <MainLayout>
                                    <ProviderAvailabilitySelf />
                                </MainLayout>
                            </RequireManagerOrProvider>
                        </RequireOrganization>
                    </RequireAuth>
                }
            />

            {/* Org-scoped: Admin (Manager-only) */}
            <Route
                path="/admin/provider-availability"
                element={
                    <RequireAuth>
                        <RequireOrganization>
                            <RequireManager>
                                <MainLayout>
                                    <ProviderAvailabilityManager />
                                </MainLayout>
                            </RequireManager>
                        </RequireOrganization>
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/appointment-types"
                element={
                    <RequireAuth>
                        <RequireOrganization>
                            <RequireManager>
                                <MainLayout>
                                    <AppointmentTypeManager />
                                </MainLayout>
                            </RequireManager>
                        </RequireOrganization>
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/resources"
                element={
                    <RequireAuth>
                        <RequireOrganization>
                            <RequireManager>
                                <MainLayout>
                                    <CalendarResourcesPage />
                                </MainLayout>
                            </RequireManager>
                        </RequireOrganization>
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/settings"
                element={
                    <RequireAuth>
                        <RequireOrganization>
                            <RequireManager>
                                <MainLayout>
                                    <OrgSettingsPage />
                                </MainLayout>
                            </RequireManager>
                        </RequireOrganization>
                    </RequireAuth>
                }
            />
            <Route
                path="/admin/users"
                element={
                    <RequireAuth>
                        <RequireOrganization>
                            <RequireManager>
                                <MainLayout>
                                    <UserRolesPage />
                                </MainLayout>
                            </RequireManager>
                        </RequireOrganization>
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
