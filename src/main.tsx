import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './AuthContext'
import { BrowserRouter } from 'react-router-dom'

/**
 * Entry Point
 * 
 * This is the starting point of the entire React application.
 * We wrap the <App /> with <AuthProvider> so that every component 
 * in our app can access the authentication state.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
