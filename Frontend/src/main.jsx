import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom';
import { FastLoadProvider } from 'react-fastload';
import { initPerformanceTelemetry } from './lib/performanceTelemetry.js';

initPerformanceTelemetry();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <FastLoadProvider strategy="adaptive" concurrency={4} preloadDistance={1000}>
        <App />
      </FastLoadProvider>
    </BrowserRouter>
  </StrictMode>,
)

