import { Routes, Route } from "react-router-dom";
import Login from "@auth/Login";
import Calendar from "@calendar/Calendar";
import MainLayout from "@layout/MainLayout";
import RequireAuth from "@/routes/RequireAuth";
import RequireManager from "@/routes/RequireManager";
import RequireManagerOrProvider from "@/routes/RequireManagerOrProvider";

// Admin pages
import AppointmentTypeManager from "@/components/admin/AppointmentTypeManager";
import CalendarResourcesPage from "@/pages/CalendarResources";
import OrgSettingsPage from "@/pages/OrgSettings";
import UserRolesPage from "@/pages/UserRoles";
import ProviderAvailabilityManager from "@/components/admin/ProviderAvailabilityManager";

// Provider self page
import ProviderAvailabilitySelf from "@/components/provider/ProviderAvailabilitySelf";

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/" element={<Login />} />

            {/* Calendar */}
            <Route
                path="/calendar"
                element={
                    <RequireAuth>
                        <MainLayout>
                            <Calendar />
                        </MainLayout>
                    </RequireAuth>
                }
            />

            {/* Provider Availability (self) — Managers OR Providers */}
            <Route
                path="/provider/availability"
                element={
                    <RequireAuth>
                        <RequireManagerOrProvider>
                            <MainLayout>
                                <ProviderAvailabilitySelf />
                            </MainLayout>
                        </RequireManagerOrProvider>
                    </RequireAuth>
                }
            />

            {/* Provider Availability (manager only) */}
            <Route
                path="/admin/provider-availability"
                element={
                    <RequireAuth>
                        <RequireManager>
                            <MainLayout>
                                <ProviderAvailabilityManager />
                            </MainLayout>
                        </RequireManager>
                    </RequireAuth>
                }
            />

            {/* Appointment Types (manager only) */}
            <Route
                path="/admin/appointment-types"
                element={
                    <RequireAuth>
                        <RequireManager>
                            <MainLayout>
                                <AppointmentTypeManager />
                            </MainLayout>
                        </RequireManager>
                    </RequireAuth>
                }
            />

            {/* Resources (manager only) */}
            <Route
                path="/admin/resources"
                element={
                    <RequireAuth>
                        <RequireManager>
                            <MainLayout>
                                <CalendarResourcesPage />
                            </MainLayout>
                        </RequireManager>
                    </RequireAuth>
                }
            />

            {/* Organization Settings (manager only) */}
            <Route
                path="/admin/settings"
                element={
                    <RequireAuth>
                        <RequireManager>
                            <MainLayout>
                                <OrgSettingsPage />
                            </MainLayout>
                        </RequireManager>
                    </RequireAuth>
                }
            />

            {/* Users (manager only) */}
            <Route
                path="/admin/users"
                element={
                    <RequireAuth>
                        <RequireManager>
                            <MainLayout>
                                <UserRolesPage />
                            </MainLayout>
                        </RequireManager>
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
