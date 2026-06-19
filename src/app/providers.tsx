'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';



function isProtectedRoute(pathname: string): boolean {
  const path = pathname.toLowerCase();
  
  if (path === '/predicciones' || path.startsWith('/predicciones/')) {
    return true;
  }
  
  if (path.startsWith('/predictions/')) {
    return true;
  }

  if (path === '/stats' || path.startsWith('/stats/') || path === '/ranking' || path.startsWith('/ranking/')) {
    return true;
  }

  if (path === '/perfil' || path.startsWith('/perfil/')) {
    return true;
  }
  
  const parts = path.split('/');
  if (parts[1] === 'liga' && parts[2]) {
    const tab = parts[3];
    if (tab && (tab.startsWith('predicciones') || tab.startsWith('posiciones') || tab.startsWith('simulacion'))) {
      return true;
    }
  }
  
  return false;
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
    // Si ya montamos en cliente y la autenticación terminó, redirigimos si no hay usuario y es ruta protegida
    if (mounted && !loading && !user && pathname !== '/login' && isProtectedRoute(pathname)) {
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

  // Evita parpadeos antes del redireccionamiento si la ruta está protegida
  if (!user && pathname !== '/login' && isProtectedRoute(pathname)) {
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
