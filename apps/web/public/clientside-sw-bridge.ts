// Service Worker Bridge
// This file bridges client-side code with the service worker

// Register service worker if supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((err) => {
        console.log('SW registration failed:', err);
      });
  });
}

export {};
