
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Load Google Charts asynchronously after app mount to prevent blocking
if (typeof window !== 'undefined') {
    const loadCharts = () => {
        if ((window as any).google?.charts) {
            (window as any).google.charts.load('current', { 'packages': ['corechart'] });
        }
    };

    if ((window as any).google?.charts) {
        loadCharts();
    } else {
        // Check if script already exists to avoid duplicates
        if (!document.querySelector('script[src*="gstatic.com/charts/loader.js"]')) {
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/charts/loader.js';
            script.async = true;
            script.onload = loadCharts;
            document.head.appendChild(script);
        }
    }
}
