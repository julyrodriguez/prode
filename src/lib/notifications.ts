// Helper para gestionar notificaciones push en el frontend

const BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://apivacas.jariel.com.ar/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Solicita permiso al usuario para enviar notificaciones.
 * Si lo concede, registra el Service Worker y se suscribe al servidor de push.
 */
export async function requestAndRegisterNotifications(userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('Este navegador no soporta notificaciones push.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permiso de notificaciones denegado por el usuario.');
      return false;
    }

    console.log('Permiso de notificaciones concedido. Registrando Service Worker...');
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registrado con éxito:', registration);

    // Obtener la clave pública VAPID del backend
    const keyRes = await fetch(`${BASE_URL}/notifications/vapid-key`);
    if (!keyRes.ok) {
      throw new Error('No se pudo obtener la clave pública VAPID');
    }
    const { publicKey } = await keyRes.json();

    // Suscribirse a Push Manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // Guardar la suscripción en el backend para el usuario actual
    const subscribeRes = await fetch(`${BASE_URL}/notifications/subscribe/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subscription })
    });

    if (!subscribeRes.ok) {
      throw new Error('Error al registrar la suscripción en el backend');
    }

    console.log('🎉 Suscripción de notificaciones push registrada correctamente.');
    return true;
  } catch (error) {
    console.error('Error al configurar notificaciones push:', error);
    return false;
  }
}

/**
 * Verifica si el usuario actual ya está suscrito a las notificaciones en este navegador/dispositivo.
 */
export async function checkSubscriptionStatus(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Error al verificar estado de suscripción:', error);
    return false;
  }
}

/**
 * Activa/Desactiva notificaciones de un partido para un usuario.
 */
export async function toggleMatchNotification(userId: string, matchId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/notifications/toggle-match/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ matchId })
    });

    if (!res.ok) throw new Error('Error al alternar notificación de partido');
    const data = await res.json();
    return data.active; // true si se activó, false si se desactivó
  } catch (error) {
    console.error('Error al alternar notificación de partido:', error);
    return false;
  }
}

/**
 * Activa/Desactiva notificaciones de una competencia para un usuario.
 */
export async function toggleCompetitionNotification(userId: string, competitionId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/notifications/toggle-competition/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ competitionId })
    });

    if (!res.ok) throw new Error('Error al alternar notificación de competencia');
    const data = await res.json();
    return data.active;
  } catch (error) {
    console.error('Error al alternar notificación de competencia:', error);
    return false;
  }
}

/**
 * Obtiene la lista de preferencias de notificación del usuario actual.
 */
export async function getUserNotificationPreferences(userId: string): Promise<{ notifiedMatches: number[], notifiedCompetitions: number[] }> {
  try {
    const res = await fetch(`${BASE_URL}/notifications/preferences/${userId}`);
    if (!res.ok) throw new Error('Error al obtener preferencias de notificación');
    return await res.json();
  } catch (error) {
    console.error('Error al obtener preferencias de notificación:', error);
    return { notifiedMatches: [], notifiedCompetitions: [] };
  }
}

function arrayBuffersAreEqual(buf1: ArrayBuffer, buf2: ArrayBuffer): boolean {
  if (buf1.byteLength !== buf2.byteLength) return false;
  const dv1 = new Uint8Array(buf1);
  const dv2 = new Uint8Array(buf2);
  for (let i = 0; i < dv1.byteLength; i++) {
    if (dv1[i] !== dv2[i]) return false;
  }
  return true;
}

/**
 * Detecta si las credenciales VAPID del navegador no coinciden con las del servidor
 * y en ese caso suscribe nuevamente al usuario de forma transparente.
 */
export async function syncVapidSubscription(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const currentSub = await registration.pushManager.getSubscription();
      
      const keyRes = await fetch(`${BASE_URL}/notifications/vapid-key`);
      if (!keyRes.ok) return;
      const { publicKey } = await keyRes.json();
      const serverKey = urlBase64ToUint8Array(publicKey);

      if (!currentSub) {
        console.log('[PushSync] Permiso concedido pero sin suscripción activa. Creando suscripción...');
        const newSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: serverKey
        });

        await fetch(`${BASE_URL}/notifications/subscribe/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSub })
        });
        console.log('[PushSync] ✅ Suscripción push recreada con éxito.');
      } else {
        const subKey = currentSub.options.applicationServerKey;
        if (subKey && !arrayBuffersAreEqual(subKey, serverKey.buffer)) {
          console.log('[PushSync] Desajuste de clave VAPID detectado. Renovando suscripción...');
          await currentSub.unsubscribe();
          
          const newSub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: serverKey
          });

          await fetch(`${BASE_URL}/notifications/subscribe/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: newSub })
          });
          console.log('[PushSync] ✅ Suscripción push renovada con éxito con las nuevas claves VAPID.');
        }
      }
    }
  } catch (err) {
    console.error('[PushSync] Error sincronizando VAPID push:', err);
  }
}
