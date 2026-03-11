import React, { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * User Interface
 * 
 * This defines the shape of the User object we expect from the backend.
 * It helps TypeScript provide better autocompletion and error checking.
 */
interface User {
  id: string;
  email: string;
  roles: string[];
}

/**
 * AuthContextType
 * 
 * This interface defines the data and functions that our AuthContext 
 * will make available to any component in the app.
 */
interface AuthContextType {
  user: User | null; // The currently logged-in user, or null if logged out.
  login: (userData: User) => void; // A function to set the user state.
  logout: () => void; // A function to clear the user state.
  isAuthenticated: boolean; // A helper to check if someone is logged in.
}

// Create the context where the state will live.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 * 
 * This component "provides" the authentication state to the entire app.
 * It's wrapped around the <App /> component in main.tsx.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize user state. We check localStorage first so the user 
  // stays logged in even if they refresh the page.
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  /**
   * Sets the logged-in user and saves it to localStorage.
   * @param userData The user data received from the backend.
   */
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  /**
   * Clears the user state and removes it from localStorage.
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Simple boolean to track if the user is currently authenticated.
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * 
 * This is a custom hook that any component can use to access the 
 * authentication data. For example: const { user, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
