import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

/**
 * ProtectedRoute Component
 * 
 * This component acts as a security guard for specific pages. 
 * If a user is not logged in, it redirects them to the /login page.
 * If they are logged in, it shows the requested content.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

/**
 * PublicRoute Component
 * 
 * Use this for pages like Login and Register. 
 * If a user is ALREADY logged in, we don't want them to see the login page again.
 * Instead, we redirect them to the home page (/).
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" /> : <>{children}</>;
};

/**
 * App Main Component
 * 
 * This is the central hub for routing. It maps URLs to specific components.
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* The /login path: Only for visitors who are NOT logged in. */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        
        {/* The /register path: Only for visitors who are NOT logged in. */}
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        
        {/* The root path (/): This is the main dashboard, which requires a login. */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
