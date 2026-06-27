import React, { useState, useEffect } from 'react';
import { User, Patient } from './types';
import AuthModal from './components/AuthModal';
import PatientsView from './components/PatientsView';
import PatientDetails from './components/PatientDetails';
import ProfileView from './components/ProfileView';
import HistoryView from './components/HistoryView';
import ConfigView from './components/ConfigView';
import { UserCheck, Baby, History, Settings, LogOut, Shield } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'perfil' | 'pacientes' | 'historial' | 'configuracion'>('pacientes');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const [loading, setLoading] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('soma_user');
    const storedToken = localStorage.getItem('soma_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  // Fetch patients list
  const fetchPatients = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      if (res.ok) {
        setPatients(data);
        
        // Keep selected patient reference fresh if viewing one
        if (selectedPatient) {
          const fresh = data.find((p: Patient) => p.id === selectedPatient.id);
          if (fresh) setSelectedPatient(fresh);
        }
      }
    } catch (e) {
      console.error('Error fetching patients:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchPatients();
    }
  }, [user, token]);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem('soma_user', JSON.stringify(loggedInUser));
    localStorage.setItem('soma_token', sessionToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setSelectedPatient(null);
    localStorage.removeItem('soma_user');
    localStorage.removeItem('soma_token');
  };

  const handlePatientCreated = (newPatient: Patient) => {
    setPatients([newPatient, ...patients]);
    setSelectedPatient(newPatient);
    setActiveTab('pacientes');
  };

  const handlePatientUpdated = (updatedPatient: Patient) => {
    setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    setSelectedPatient(updatedPatient);
  };

  const handleSelectPatientAndOpen = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab('pacientes');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('soma_user', JSON.stringify(updatedUser));
  };

  if (!user || !token) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="soma_app">
      
      {/* GLOBAL CLINCAL APPMET BAR */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40" id="global_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo brand */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-100">
                S
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-800 font-sans">SOMA</span>
                <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-slate-400 border-l border-slate-200 pl-2">
                  Nutrición Infantil
                </span>
              </div>
            </div>

            {/* Navigation links for tabs */}
            <nav className="hidden md:flex space-x-1" id="desktop_navbar">
              {[
                { id: 'pacientes', label: 'Pacientes', icon: Baby },
                { id: 'historial', label: 'Historial', icon: History },
                { id: 'perfil', label: 'Perfil', icon: UserCheck },
                { id: 'configuracion', label: 'Configuración', icon: Settings }
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      if (item.id !== 'pacientes') setSelectedPatient(null);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Active Professional user dropdown with Log out */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-right">
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">
                    {user.nombre} {user.apellidos.charAt(0)}.
                  </span>
                  <span className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide flex items-center justify-end">
                    <Shield className="h-2.5 w-2.5 mr-0.5" />
                    {user.rol}
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                  {user.nombre.charAt(0)}
                </div>
              </div>

              <button
                onClick={handleLogout}
                id="btn_logout"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* MOBILE NAV BOTTOM BAR (Responsive) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 py-2 px-4 shadow-lg flex justify-around" id="mobile_navbar">
        {[
          { id: 'pacientes', label: 'Pacientes', icon: Baby },
          { id: 'historial', label: 'Historial', icon: History },
          { id: 'perfil', label: 'Perfil', icon: UserCheck },
          { id: 'configuracion', label: 'Configuración', icon: Settings }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                if (item.id !== 'pacientes') setSelectedPatient(null);
              }}
              className={`flex flex-col items-center space-y-0.5 py-1 px-3 rounded-xl cursor-pointer ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* CORE BODY CONTAINER */}
      <main className="flex-grow pb-24 md:pb-8" id="soma_body">
        
        {/* Render Patients Directory with Sub-Views */}
        {activeTab === 'pacientes' && (
          selectedPatient ? (
            <PatientDetails
              patient={selectedPatient}
              onBack={() => setSelectedPatient(null)}
              onUpdatePatient={handlePatientUpdated}
            />
          ) : (
            <PatientsView
              patients={patients}
              onSelectPatient={setSelectedPatient}
              onPatientCreated={handlePatientCreated}
            />
          )
        )}

        {/* History Tab */}
        {activeTab === 'historial' && (
          <HistoryView
            patients={patients}
            onSelectPatient={handleSelectPatientAndOpen}
          />
        )}

        {/* Profile Tab */}
        {activeTab === 'perfil' && (
          <ProfileView
            user={user}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {/* Configuration Tab */}
        {activeTab === 'configuracion' && (
          <ConfigView
            currentUser={user}
          />
        )}

      </main>

    </div>
  );
}
