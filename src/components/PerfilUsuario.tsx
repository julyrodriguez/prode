import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface Usuario {
  _id: string;
  name: string;
  avatarUrl: string;
}

interface PerfilUsuarioProps {
  usuarioActual: Usuario;
  onUpdateSuccess?: (usuarioActualizado: Usuario) => void;
}

export const PerfilUsuario: React.FC<PerfilUsuarioProps> = ({ usuarioActual, onUpdateSuccess }) => {
  const [name, setName] = useState(usuarioActual.name || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Usamos el id del usuario para buscar en la carpeta del backend y evitamos caché temporal
  const currentAvatarUrl = `https://apivacas.jariel.com.ar/users/${usuarioActual._id}.webp?v=${new Date().getTime()}`;

  useEffect(() => {
    // Limpiamos el object URL para evitar fugas de memoria si se desmonta o cambia la vista previa
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStatus(null); // Ocultar mensajes previos si el usuario hace cambios
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('name', name);

      if (imageFile) {
        // MUY IMPORTANTE: La clave debe ser exactamente 'avatar'
        formData.append('avatar', imageFile);
      }

      // Enviar formData completo directamente al backend
      const backendRes = await fetch(`https://apivacas.jariel.com.ar/api/users/${usuarioActual._id}/profile`, {
        method: 'PUT',
        // ¡REGLA DE ORO! NO setear 'Content-Type'. Dejar que el navegador calcule el boundary form-data.
        body: formData,
      });

      if (!backendRes.ok) {
        let errorMsg = 'Error al actualizar el perfil en el servidor';
        try {
          const errData = await backendRes.json();
          if (errData.message) errorMsg = errData.message;
        } catch (_) { }
        throw new Error(errorMsg);
      }

      const responseData = await backendRes.json();

      // Tomamos la nueva URL que el backend debería devolver (o construimos la manual en base a la ID si la omite)
      const finalAvatarUrl = responseData.avatarUrl || responseData.user?.avatarUrl || `https://apivacas.jariel.com.ar/users/${usuarioActual._id}.webp`;

      // Actualizar perfil en Firebase para que useAuth() lo refresque visualmente
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name,
          photoURL: finalAvatarUrl
        });
      }

      setStatus({ type: 'success', message: '¡Perfil actualizado con éxito!' });

      // Notificar al componente padre de ser necesario
      if (onUpdateSuccess) {
        onUpdateSuccess({ ...usuarioActual, name, avatarUrl: finalAvatarUrl });
      }

      // Reiniciar estado de imagen nueva tras actualización exitosa
      setImageFile(null);
      setImagePreview(null);

    } catch (error: any) {
      console.error('Error en el flujo de actualización de perfil:', error);
      setStatus({ type: 'error', message: error.message || 'Error inesperado al intentar guardar los cambios.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
      <h2 className="text-2xl font-black mb-6 text-white text-center">Editar Perfil</h2>

      {status && (
        <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500/30 shadow-lg mb-4 bg-indigo-500/20 flex items-center justify-center">
            {imagePreview ? (
              <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover relative z-10" />
            ) : (
              <>
                <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-indigo-300 z-0">
                  {name?.slice(0, 1).toUpperCase() || '?'}
                </div>
                <img
                  src={currentAvatarUrl}
                  alt="Avatar actual"
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </>
            )}
          </div>

          <label className="cursor-pointer bg-white/5 text-slate-300 px-4 py-2 rounded-full font-medium hover:bg-white/10 hover:text-white transition-colors text-sm shadow-sm border border-white/10">
            Toca para Elegir Foto
            <input
              type="file"
              accept="image/jpeg, image/png, image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-300 mb-1">
            Nombre
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus(null);
            }}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
            placeholder="Tu nombre completo"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-xl shadow-lg mt-2 text-white font-black bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b1015] focus:ring-indigo-500 transition-all uppercase tracking-wider text-sm
            ${loading ? 'opacity-70 cursor-not-allowed scale-[0.99]' : 'active:scale-95'}
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando cambios...
            </span>
          ) : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
};

export default PerfilUsuario;
