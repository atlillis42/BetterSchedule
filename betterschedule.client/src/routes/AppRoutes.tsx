import { Routes, Route } from "react-router-dom";
import Login from "@auth/Login";
import Calendar from "@calendar/Calendar";
import MainLayout from "@layout/MainLayout";
import RequireAuth from "@/routes/RequireAuth";
import RequireManager from "@/routes/RequireManager";
import RequireManagerOrProvider from "@/routes/RequireManagerOrProvider";
import RequireOrganization from "@/routes/RequireOrganization";

import JoinOrganizationPage from "@/pages/JoinOrganization";
import RegisterPage from "@/pages/Register";

import AppointmentTypeManager from "@/components/admin/AppointmentTypeManager";
import CalendarResourcesPage from "@/pages/CalendarResources";
import OrgSettingsPage from "@/pages/OrgSettings";
import UserRolesPage from "@/pages/UserRoles";
import ProviderAvailabilityManager from "@/components/admin/ProviderAvailabilityManager";
import ProviderAvailabilitySelf from "@/components/provider/ProviderAvailabilitySelf";



export default function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Join (auth but no org yet) */}
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

            {/* Calendar (auth + org) */}
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

            {/* Provider self (auth + org) */}
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

            {/* Admin (auth + org + manager) */}
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
