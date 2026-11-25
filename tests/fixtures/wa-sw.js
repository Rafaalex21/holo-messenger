// Service worker vazio do WhatsApp de mentira: só existe para a página
// mostrar notificação por registration.showNotification, como o WhatsApp pode fazer.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
