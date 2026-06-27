import React, { useState, useEffect } from 'react';
import { User, VerificationCode } from '../types';
import { Settings, Shield, Key, Database, Users, Trash2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

interface ConfigViewProps {
  currentUser: User;
}

export default function ConfigView({ currentUser }: ConfigViewProps) {
  const [dbStatus, setDbStatus] = useState({ database: 'Cargando...', status: 'loading' });
  const [users, setUsers] = useState<User[]>([]);
  const [pendingCodes, setPendingCodes] = useState<VerificationCode[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isAdmin = currentUser.rol === 'administrador';

  const fetchDatabaseStatus = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setDbStatus({
        database: data.database,
        status: 'ok'
      });
    } catch (e) {
      setDbStatus({
        database: 'Error al conectar',
        status: 'error'
      });
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPendingCodes = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/auth/pending-codes');
      const data = await res.json();
      if (res.ok) {
        setPendingCodes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDatabaseStatus();
    if (isAdmin) {
      fetchUsers();
      fetchPendingCodes();
    }
  }, [currentUser]);

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === currentUser.correo) {
      setError('No puedes eliminar tu propia cuenta de administrador activo.');
      return;
    }
    if (!window.confirm(`¿Está seguro de eliminar de forma permanente la cuenta de ${email}?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar usuario');
      }

      setSuccessMsg(`Cuenta de ${email} eliminada correctamente.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyCodeToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="config_view_panel">
      
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-blue-600">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Configuración del Sistema</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Supervisa el estado del servidor, bases de datos y gestiona el acceso de profesionales
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: DIAGNOSTICS */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-50 pb-2 flex items-center space-x-1.5">
              <Database className="h-4 w-4 text-blue-600" />
              <span>Infraestructura</span>
            </h3>

            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Servicio de Datos Activo:</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${dbStatus.status === 'ok' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'} block`} />
                <span className="text-sm font-bold text-slate-700">{dbStatus.database}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-normal font-sans">
              <strong>Nota técnica:</strong> El sistema sincroniza con MongoDB Atlas cuando está configurada la variable <code>MONGODB_URI</code>. En su defecto, opera con un archivo local autogestionado con resiliencia total contra fallas de red.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ADMINISTRATOR ACTIONS */}
        <div className="space-y-6 lg:col-span-2">
          
          {isAdmin ? (
            <div className="space-y-6">
              
              {/* 1. PENDING CODES PANEL */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Key className="h-4 w-4 text-blue-600" />
                    <span>Códigos de Registro Pendientes</span>
                  </h3>
                  <button
                    onClick={fetchPendingCodes}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Actualizar
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-normal font-sans">
                  Cuando un profesional solicita registrarse, su solicitud aparece aquí. Como administradora, puedes consultar el código para dárselo y habilitar su cuenta.
                </p>

                {pendingCodes.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                    No hay solicitudes de registro pendientes en este momento.
                  </div>
                ) : (
                  <div className="space-y-2.5" id="pending_codes_list">
                    {pendingCodes.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-blue-50/20 border border-blue-100/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {item.nombre} {item.apellidos}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            Correo: {item.correo} | Tel: {item.telefono}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 self-start sm:self-auto">
                          <span className="text-xs text-slate-400">Código de acceso:</span>
                          <span className="font-mono font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-xl text-sm tracking-widest">
                            {item.codigo}
                          </span>
                          <button
                            onClick={() => copyCodeToClipboard(item.codigo, item.id)}
                            className="p-1.5 hover:bg-blue-100/50 rounded-lg text-blue-600 transition-all"
                            title="Copiar código"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. REGISTERED USERS DIRECTORY */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>Directorio de Profesionales de Nutrición</span>
                  </h3>
                  <button
                    onClick={fetchUsers}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Actualizar
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs flex items-center space-x-1.5">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-xl text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {loadingUsers ? (
                  <div className="text-center py-6 text-xs text-slate-400">Cargando profesionales...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-2">Profesional</th>
                          <th className="pb-2">Correo</th>
                          <th className="pb-2">Rol</th>
                          <th className="pb-2 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-bold text-slate-700">{u.nombre} {u.apellidos}</td>
                            <td className="py-3 text-slate-500">{u.correo}</td>
                            <td className="py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.rol === 'administrador' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {u.rol}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleDeleteUser(u.id, u.correo)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar cuenta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* NON-ADMIN EXPLANATION BOX */
            <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6 text-center space-y-3">
              <Shield className="h-10 w-10 text-amber-500 mx-auto animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Módulo de Administración Restringido</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-sans">
                La administración de cuentas de usuario, autorización de nuevos profesionales y visualización de códigos de verificación está restringida exclusivamente a las cuentas nativas autorizadas (Natalia Hernández y María Ibarra).
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
