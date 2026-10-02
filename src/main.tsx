import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Применяем тему ДО рендера, чтобы не было мерцания
try {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get('luxflow_state', (data) => {
      const theme = data?.luxflow_state?.theme || 'light';
      document.documentElement.setAttribute('data-theme', theme);
    });
  }
} catch {}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);