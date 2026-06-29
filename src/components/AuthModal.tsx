import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, Mail, UserCheck, Phone, Calendar, ClipboardList, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import somaLogo from '@/assets/images/Logo-Soma.png';

interface AuthModalProps {
  onLoginSuccess: (user: User, token: string) => void;
  onClose?: () => void;
}

export default function AuthModal({ onLoginSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Info & Request, Step 2: Code Verification
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register Form
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  
  // Messaging
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugCode, setDebugCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!/^\d{4}$/.test(password)) {
      setError('La contraseña debe tener exactamente 4 números.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellidos,
          fechaNacimiento,
          correo: correo.toLowerCase().trim(),
          telefono,
          password
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al solicitar el código');
      }
      
      setSuccess('Solicitud recibida. Se ha generado un código de registro.');
      if (data.debugCode) {
        setDebugCode(data.debugCode);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.toLowerCase().trim(), codigo: code })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Código de verificación incorrecto');
      }

      setSuccess('¡Registro completado con éxito!');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" id="auth_container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <img src={somaLogo} alt="SOMA Logo" className="h-16 w-auto object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-800 tracking-tight">
          SOMA
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-sans">
          Sistema Clínico de Nutrición y Dietética Infantil (OMS 0-5 años)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md" id="auth_card">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-2xl sm:px-10">
          
          {/* Tabs */}
          {step === 1 && (
            <div className="flex border-b border-slate-100 mb-6">
              <button
                id="tab_login"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`w-1/2 pb-4 text-center text-sm font-semibold border-b-2 transition-colors ${isLogin ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Iniciar Sesión
              </button>
              <button
                id="tab_register"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`w-1/2 pb-4 text-center text-sm font-semibold border-b-2 transition-colors ${!isLogin ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Registrar Profesional
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-2 text-red-700 text-sm" id="auth_error">
              <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start space-x-2 text-blue-800 text-sm" id="auth_success">
              <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin && step === 1 && (
            <form onSubmit={handleLogin} className="space-y-4" id="login_form">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Contraseña (4 Números)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 tracking-widest font-mono transition-all"
                    placeholder="••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  id="btn_submit_login"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all text-sm flex justify-center items-center space-x-2"
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">Administradores Nativos:</span>
                <ul className="list-disc list-inside mt-1 space-y-1 font-mono">
                  <li>nataliahernandez3112@gmail.com (3112)</li>
                  <li>maria-i01@hotmail.com (2809)</li>
                </ul>
              </div>
            </form>
          )}

          {/* REGISTER FORM: STEP 1 */}
          {!isLogin && step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4" id="register_request_form">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre"
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
                    className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Apellidos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Fecha de Nacimiento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    required
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Número Celular
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="310 1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Clave (4 números)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                    className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-center text-sm font-mono tracking-widest text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Confirmación
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                    className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-center text-sm font-mono tracking-widest text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  id="btn_request_code"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm flex justify-center items-center space-x-2 cursor-pointer"
                >
                  {loading ? 'Procesando...' : 'Solicitar Código de Registro'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM: STEP 2 - CODE VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4" id="register_verify_form">
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Hemos registrado tu solicitud para <span className="font-semibold text-slate-800">{correo}</span>.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Un código de verificación ha sido generado. Comunícate con las administradoras <strong>Natalia o María</strong> para solicitar el código e ingresarlo a continuación:
                </p>
              </div>

              {debugCode && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4" id="debug_verification_code">
                  <span className="text-xs font-semibold text-amber-800 block mb-1">⚡ MODO PREVIEW / DESARROLLO</span>
                  <span className="text-xs text-amber-700 leading-normal">
                    El código generado es: <span className="font-mono font-bold bg-amber-100 px-2 py-0.5 rounded text-sm text-slate-900">{debugCode}</span>.
                    Puedes usarlo directamente para completar la prueba.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 text-center">
                  Código de Verificación
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  placeholder="Ingrese el código"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-2/3 mx-auto px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-center font-mono font-bold text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 transition-all"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 px-4 border border-slate-200 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition-all text-sm"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  id="btn_complete_register"
                  className="w-2/3 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm flex justify-center items-center space-x-2"
                >
                  {loading ? 'Comprobando...' : 'Completar Registro'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
