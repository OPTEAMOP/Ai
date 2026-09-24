import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PWAInstallProvider } from './components/PWAInstallProvider.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Log runtime errors cleanly without freezing the user interface
window.addEventListener('error', (event) => {
  console.error('[Omnisym Runtime Error]', event.error || event.message);
});

// Global cache clearing utility for critical recovery
(window as any).clearOmnisymCache = () => {
  try {
    localStorage.clear();
    sessionStorage.clear();
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    // Redirect to login instead of reloading
    window.location.href = '/login';
  } catch (e) {
    window.location.href = '/login';
  }
};

// Intercept unhandled Promise rejections and log them safely
window.addEventListener('unhandledrejection', (event) => {
  console.warn('[Omnisym Unhandled Rejection]', event.reason);
  // Prevent unhandled rejections from bubbling as uncaught crashes
  event.preventDefault?.();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration note: ', err);
    });
  });
}

// Standard Mounting Logic
const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <PWAInstallProvider>
            <App />
          </PWAInstallProvider>
        </ErrorBoundary>
      </StrictMode>
    );

    // Flag that the app is active
    (window as any).__OMNISYM_MOUNTED__ = true;

    // Remove the global loader after a short delay to allow React to paint the first frame
    setTimeout(() => {
      const loader = document.getElementById('omni-global-loader');
      if (loader) {
        loader.style.transition = 'opacity 0.4s ease';
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
      }
    }, 100);
  } catch (error) {
    console.error('[Omnisym Fatal Mount Error]', error);
    // Basic fallback if React mounting fails completely
    const loader = document.getElementById('omni-global-loader');
    if (loader) loader.remove();
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #ef4444;">Mount Failure</h2>
        <p>The application encountered a critical error during startup.</p>
        <button onclick="window.clearOmnisymCache()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer;">Reset & Retry</button>
      </div>
    `;
  }
}


