'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestAndRegisterNotifications, checkSubscriptionStatus, syncVapidSubscription } from '../lib/notifications';
import { Bell, X, CheckCircle } from 'lucide-react';

export default function NotificationBanner() {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      syncVapidSubscription(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Verificar si el navegador soporta notificaciones
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Si ya concedió o denegó el permiso, no mostramos el banner
    if (Notification.permission !== 'default') {
      return;
    }

    // Si el usuario ya lo rechazó temporalmente, no volver a molestar
    const dismissed = localStorage.getItem('push_notifications_prompt_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Verificar si ya existe una suscripción activa
    checkSubscriptionStatus().then((isSubscribed) => {
      if (!isSubscribed) {
        setShowBanner(true);
      }
    });
  }, [user]);

  const handleEnable = async () => {
    if (!user) return;
    const success = await requestAndRegisterNotifications(user.uid);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setShowBanner(false);
      }, 3000);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_notifications_prompt_dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="mb-6 mx-auto max-w-4xl relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-4 md:p-6 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:border-cyan-500/50">
      {/* Fondo con brillo sutil */}
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl"></div>
      <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl"></div>

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center text-center py-2 animate-fade-in">
          <CheckCircle className="h-10 w-10 text-emerald-400 mb-2 animate-bounce" />
          <h4 className="text-lg font-bold text-emerald-400">¡Notificaciones Activas!</h4>
          <p className="text-sm text-slate-300 mt-1">Te avisaremos al instante cuando haya goles o comience un partido.</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                ¿Quieres recibir notificaciones de goles en tiempo real?
              </h4>
              <p className="text-sm text-slate-300 mt-1">
                Entérate al instante de los inicios de partidos, goles y resultados finales de tus partidos y competencias favoritas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer rounded-xl border border-slate-700/50 hover:bg-slate-800/30 whitespace-nowrap"
            >
              Quizás más tarde
            </button>
            <button
              onClick={handleEnable}
              className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md shadow-cyan-500/25 transition-all duration-150 cursor-pointer rounded-xl hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              Activar Notificaciones
            </button>
          </div>
        </div>
      )}

      {!isSuccess && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors duration-150 cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
