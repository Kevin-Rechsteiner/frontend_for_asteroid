import axios from 'axios';

/**
 * Axios Instance Configuration
 * 
 * This file creates a reusable 'api' object that is configured to communicate 
 * with our Spring Boot backend. Instead of typing the full URL every time, 
 * we can just use this instance.
 */
const api = axios.create({
  // The base URL of our Spring Boot API
  baseURL: 'http://localhost:8080',
  
  // This ensures that browser cookies (like session tokens) are sent
  // automatically with every request to the backend.
  withCredentials: true,
});

export default api;
