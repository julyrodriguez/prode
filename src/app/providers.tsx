'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';

// ── Global API Cache Interceptor ──
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  const fetchCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 30000; // 30 segundos de caché

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const method = (init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input.toString();

    // Limpiar caché ante escrituras (POST, PUT, DELETE)
    if (method !== 'GET' && method !== 'HEAD') {
      fetchCache.clear();
      return originalFetch(input, init);
    }

    // Caché para las consultas de la API
    if (method === 'GET' && url.includes('/api/')) {
      const cacheKey = url;
      const cached = fetchCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'x-from-cache': 'true' }
        });
      }

      try {
        const response = await originalFetch(input, init);
        if (response.ok) {
          const responseClone = response.clone();
          responseClone.json().then(data => {
            fetchCache.set(cacheKey, { data, timestamp: Date.now() });
          }).catch(() => {});
        }
        return response;
      } catch (err) {
        if (cached) {
          return new Response(JSON.stringify(cached.data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'x-from-cache': 'true', 'x-cache-fallback': 'true' }
          });
        }
        throw err;
      }
    }

    return originalFetch(input, init);
  };
}

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Si ya montamos en cliente y la autenticación terminó, redirigimos si no hay usuario
    if (mounted && !loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, loading, pathname, router, mounted]);

  // Si no está montado en el cliente o está cargando el auth, muestra spinner
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-t-2 border-cyan-400 rounded-full"></div>
      </div>
    );
  }

  // Evita parpadeos antes del redireccionamiento
  if (!user && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
