import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationForm from './RegistrationForm';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';
import './App.css';

function AdminRouteWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem('adminToken')
  );

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard companyName="AMAGix Technologies" onLogout={handleLogout} />;
}

export default function App() {
  useEffect(() => {
    // Silent wake-up ping to Render backend to counter free tier sleep mode
    fetch("https://amagix-registration.onrender.com")
      .catch(() => {
        // Silently catch error since backend will wake up on ping
      });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route for Students */}
        <Route 
          path="/" 
          element={<RegistrationForm companyName="Tech_Camp@AMAGix Technologies" logoUrl="/amagix.png" />} 
        />
        
        {/* Protected Secret Admin Route */}
        <Route path="/admin" element={<AdminRouteWrapper />} />

        {/* Fallback redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}