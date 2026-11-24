import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';
import { sanitizeMojibake } from './utils/fixMojibake';

// 1. Global Axios Interceptor for API responses
axios.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      response.data = sanitizeMojibake(response.data);
    }
    return response;
  },
  (error) => {
    if (error && error.response && error.response.data) {
      error.response.data = sanitizeMojibake(error.response.data);
    }
    return Promise.reject(error);
  }
);

// 2. Global Fetch Interceptor for any native fetch calls
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const res = await originalFetch(...args);
    const originalJson = res.json.bind(res);
    res.json = async () => {
      const data = await originalJson();
      return sanitizeMojibake(data);
    };
    return res;
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
