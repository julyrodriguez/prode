'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';

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
