import React, { useState } from 'react';
import { User } from '../types';
import { calculateChronologicalAge } from '../lib/whoCalculations';
import { User as UserIcon, Save, Calendar, Phone, Mail, CheckCircle2, UserCheck, Shield, Camera, Trash2 } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const AVATARS = [
  '👩‍⚕️', '👨‍⚕️', '🩺', '🔬', '🌿', '🍎', '👶'
];

export default function ProfileView({ user, onUpdateUser }: ProfileViewProps) {
  const [nombre, setNombre] = useState(user.nombre);
  const [apellidos, setApellidos] = useState(user.apellidos);
  const [fechaNacimiento, setFechaNacimiento] = useState(user.fechaNacimiento || '');
  const [telefono, setTelefono] = useState(user.telefono || '');
  const [avatar, setAvatar] = useState(() => {
    // Basic deterministic avatar based on name or random
    const idx = (user.nombre.charCodeAt(0) + user.apellidos.charCodeAt(0)) % AVATARS.length;
    return AVATARS[idx];
  });
  const [imagenPerfil, setImagenPerfil] = useState(user.imagenPerfil || '');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Por favor selecciona una menor a 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImagenPerfil(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const age = fechaNacimiento ? calculateChronologicalAge(fechaNacimiento) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellidos,
          fechaNacimiento,
          telefono,
          imagenPerfil
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el perfil');
      }

      onUpdateUser(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id="profile_view_container">
      
      <div className="flex items-center space-x-2 text-blue-600 mb-8">
        <UserCheck className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-slate-500">Gestiona tus datos personales y credenciales de acceso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Profile Card Summary */}
        <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center space-y-4">
          <div className="relative inline-block mx-auto">
            <div className="h-24 w-24 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center text-5xl overflow-hidden relative shadow-inner">
              {imagenPerfil ? (
                <img src={imagenPerfil} alt="Perfil" className="h-full w-full object-cover" />
              ) : (
                avatar
              )}
            </div>
            {/* Camera icon overlay */}
            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md shadow-blue-300 border border-white flex items-center justify-center transition-all transform hover:scale-110 active:scale-95" title="Subir foto de perfil">
              <Camera className="h-3.5 w-3.5" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </label>
            {/* Delete custom photo button */}
            {imagenPerfil && (
              <button
                type="button"
                onClick={() => setImagenPerfil('')}
                className="absolute top-0 right-0 p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full cursor-pointer border border-white flex items-center justify-center transition-all transform hover:scale-110 shadow-sm"
                title="Eliminar foto de perfil"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-800 line-clamp-1">{user.nombre} {user.apellidos}</h2>
            <div className="flex items-center justify-center space-x-1.5 mt-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {user.rol === 'administrador' ? 'Administradora' : 'Nutricionista'}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-50 pt-4 space-y-2.5 text-left text-xs">
            <div className="flex items-center space-x-2 text-slate-500">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{user.correo}</span>
            </div>
            {telefono && (
              <div className="flex items-center space-x-2 text-slate-500">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{telefono}</span>
              </div>
            )}
            {age && (
              <div className="flex items-center space-x-2 text-slate-500">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{age.years} años de edad</span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4" id="profile_form">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-50 pb-2 mb-4">
              Información Personal
            </h3>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <span>Perfil actualizado correctamente.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Nombres
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Apellidos
                </label>
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Número de Celular / Contacto
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Fecha de Nacimiento
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="date"
                  required
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm space-x-2 cursor-pointer shadow-md shadow-blue-100"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
