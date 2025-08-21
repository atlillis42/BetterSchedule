import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "@auth/Login";
import Calendar from "@calendar/Calendar";
import MainLayout from "@layout/MainLayout";
import RequireAuth from "@/routes/RequireAuth";
import RequireAdmin from "@/routes/RequireAdmin";
import RequireManagerOrProvider from "@/routes/RequireManagerOrProvider";
import AppointmentTypeManager from "@/components/admin/AppointmentTypeManager";
import CalendarResourcesPage from "@/pages/CalendarResources";
import OrgSettingsPage from "@/pages/OrgSettings";
import ProviderAvailabilityPage from "@/pages/ProviderAvailability";

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

            {/* Appointment Types (manager only) */}
            <Route
                path="/admin/appointment-types"
                element={
                    <RequireAuth>
                        <RequireAdmin>
                            <MainLayout>
                                <AppointmentTypeManager />
                            </MainLayout>
                        </RequireAdmin>
                    </RequireAuth>
                }
            />

            {/* Resources (manager only) */}
            <Route
                path="/admin/resources"
                element={
                    <RequireAuth>
                        <RequireAdmin>
                            <MainLayout>
                                <CalendarResourcesPage />
                            </MainLayout>
                        </RequireAdmin>
                    </RequireAuth>
                }
            />

            {/* Provider Availability (manager or provider) */}
            <Route
                path="/admin/provider-availability"
                element={
                    <RequireAuth>
                        <RequireManagerOrProvider>
                            <MainLayout>
                                <ProviderAvailabilityPage />
                            </MainLayout>
                        </RequireManagerOrProvider>
                    </RequireAuth>
                }
            />

            {/* Organization Settings (manager only) */}
            <Route
                path="/admin/settings"
                element={
                    <RequireAuth>
                        <RequireAdmin>
                            <MainLayout>
                                <OrgSettingsPage />
                            </MainLayout>
                        </RequireAdmin>
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
