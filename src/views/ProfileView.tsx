"use client";
import { useAuth } from '../context/AuthContext';
import { PerfilUsuario } from '../components/PerfilUsuario';

export default function ProfileView() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center text-slate-400">
        Debes iniciar sesión para editar tu perfil.
      </div>
    );
  }

  // Preparamos el usuarioActual a partir de Firebase Auth.
  const usuarioActual = {
    _id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || '',
    avatarUrl: user.photoURL || ''
  };

  return (
    <div className="w-full flex justify-center items-center py-10 animate-fade-in relative z-10">
      <div className="w-full max-w-lg">
        {/* Usamos el componente creado pasándole las props necesarias */}
        <PerfilUsuario 
          usuarioActual={usuarioActual} 
          onUpdateSuccess={() => {
            // Opcionalmente podemos navegar al home si es deseado luego de guardar:
            // router.push('/');
          }}
        />
      </div>
    </div>
  );
}
