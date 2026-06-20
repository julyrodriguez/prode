"use client";
import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginView() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    const emailToUse = username.trim().toLowerCase() + '@equipo.local';

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, emailToUse, password);
      } else {
        await signInWithEmailAndPassword(auth, emailToUse, password);
      }
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
         setError('Contraseña o correo incorrectos');
      } else if (err.code === 'auth/email-already-in-use') {
         setError('El correo ya está registrado');
      } else {
         setError(err.message || 'Error de autenticación');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vh] bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vh] bg-emerald-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 z-10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center mb-8">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
             VL
           </div>
        </div>
        
        <h2 className="text-2xl font-black text-center mb-2">Ingresar a Vacas Locas</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Inicia sesión para registrar tus predicciones del Prode</p>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input 
              type="text" 
              placeholder="Nombre de Usuario (ej: elpulpo)" 
              className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Contraseña" 
              className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-emerald-500/50 focus:bg-white/5 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          <button 
             type="submit" 
             disabled={processing}
             className="w-full bg-gradient-to-r flex justify-center items-center gap-2 from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold py-3 mt-4 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
               <div className="animate-spin w-5 h-5 rounded-full border-t-2 border-black border-r-2 border-transparent"></div>
            ) : isRegister ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
