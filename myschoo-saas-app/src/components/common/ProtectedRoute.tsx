import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../App'; // Adjust path as necessary

interface ProtectedRouteProps {
  allowedRoles?: string[]; // e.g., ['admin', 'teacher']
  children?: React.ReactNode; // Allow children for element-based protection
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // You might want a more sophisticated loading spinner here
    return <div className="flex justify-center items-center min-h-screen"><p>Loading session...</p></div>;
  }

  if (!session || !profile) {
    // User not logged in, redirect to login page
    // Pass the current location to redirect back after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If allowedRoles are specified, check if the user's role is among them
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = profile.role; // Assuming 'role' is part of your UserProfile type
    if (!userRole || !allowedRoles.includes(userRole)) {
      // User does not have the required role, redirect to an unauthorized page or home
      // For simplicity, redirecting to home/dashboard. A dedicated /unauthorized page is better.
      console.warn(`User with role '${userRole}' attempted to access a route restricted to roles: ${allowedRoles.join(', ')}`);
      return <Navigate to="/" state={{ from: location }} replace />; 
    }
  }

  // If children are provided, render them (for element-based protection)
  // Otherwise, render the Outlet (for route-based protection where this component wraps child routes)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
