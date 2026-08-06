import { Route, Routes } from "react-router";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateTripPage } from "./pages/CreateTripPage";
import { EditTripPage } from "./pages/EditTripPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { InvitationPage } from "./pages/InvitationPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { TripsPage } from "./pages/TripsPage";
import { TripWorkspacePage } from "./pages/TripWorkspacePage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invitations/:token" element={<InvitationPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/trips/new" element={<CreateTripPage />} />
        <Route path="/trips/:tripId/edit" element={<EditTripPage />} />
        <Route path="/trips/:tripId" element={<TripWorkspacePage mode="overview" />} />
        <Route path="/trips/:tripId/itinerary" element={<TripWorkspacePage mode="itinerary" />} />
        <Route path="/trips/:tripId/expenses" element={<TripWorkspacePage mode="expenses" />} />
        <Route path="/trips/:tripId/members" element={<TripWorkspacePage mode="members" />} />
        <Route path="/trips/:tripId/settings" element={<TripWorkspacePage mode="settings" />} />
      </Route>
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
