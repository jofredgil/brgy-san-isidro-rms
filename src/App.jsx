import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingScreen from './pages/LandingScreen';
import AdminDashboard from './pages/AdminDashboard';
import ResidentDashboard from './pages/ResidentDashboard';

function MainRouter() {
  const { currentUser } = useAuth();

  // If no one is logged in, show the landing page/auth modals
  if (!currentUser) {
    return <LandingScreen />;
  }

  // If the user has an admin role, show the Admin Dashboard
  if (currentUser.role === 'admin') {
    return <AdminDashboard currentUser={currentUser} />;
  }

  // Otherwise, default to the Resident Portal
  return <ResidentDashboard user={currentUser} />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}