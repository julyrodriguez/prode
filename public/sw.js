// Service Worker para recibir notificaciones push en segundo plano

self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const payload = event.data.json();
            const options = {
                body: payload.body,
                icon: payload.icon || '/favicon.svg',
                badge: payload.badge || '/favicon.svg',
                data: payload.data || {}
            };
            event.waitUntil(
                self.registration.showNotification(payload.title, options)
            );
        } catch (err) {
            console.error('Error parseando payload de notificación push:', err);
            event.waitUntil(
                self.registration.showNotification('Notificación de Vacas Locas Prode', {
                    body: event.data.text(),
                    icon: '/favicon.svg',
                    badge: '/favicon.svg'
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(windowClients) {
            // Intentar enfocar una ventana existente de la app
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Navegar al partido si el cliente soporta recibir mensajes
                    if ('navigate' in client) {
                        client.navigate(urlToOpen);
                    }
                    return client.focus();
                }
            }
            // Si no hay ventana abierta, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
