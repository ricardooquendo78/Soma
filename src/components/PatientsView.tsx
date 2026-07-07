import React, { useState } from 'react';
import { Patient } from '../types';
import { calculateChronologicalAge } from '../lib/whoCalculations';
import { Search, Plus, Calendar, User, Baby, ArrowRight, UserPlus, X, Heart } from 'lucide-react';

interface PatientsViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onPatientCreated: (newPatient: Patient) => void;
}

export default function PatientsView({ patients, onSelectPatient, onPatientCreated }: PatientsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState<'niño' | 'niña'>('niña');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [documento, setDocumento] = useState('');
  const [nombreAcudiente, setNombreAcudiente] = useState('');
  const [parentescoAcudiente, setParentescoAcudiente] = useState('');
  const [celularAcudiente, setCelularAcudiente] = useState('');
  const [direccionAcudiente, setDireccionAcudiente] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!nombre.trim()) {
      setError('El nombre del paciente es obligatorio.');
      return;
    }
    if (!fechaNacimiento) {
      setError('La fecha de nacimiento es obligatoria.');
      return;
    }

    // Verify age constraints (0-5 years as specified)
    const age = calculateChronologicalAge(fechaNacimiento);
    if (age.years > 5) {
      setError('Este sistema en su primera versión está diseñado exclusivamente para niños de 0 a 5 años.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nombre.trim(), 
          genero, 
          fechaNacimiento,
          documento: documento.trim(),
          nombreAcudiente: nombreAcudiente.trim(),
          parentescoAcudiente,
          celularAcudiente: celularAcudiente.trim(),
          direccionAcudiente: direccionAcudiente.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el paciente');
      }

      onPatientCreated(data);
      setNombre('');
      setFechaNacimiento('');
      setDocumento('');
      setNombreAcudiente('');
      setParentescoAcudiente('');
      setCelularAcudiente('');
      setDireccionAcudiente('');
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="patients_view">
      
      {/* Header and Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Directorio de Pacientes</h1>
          <p className="text-sm text-slate-500 mt-1">Registra, evalúa y haz seguimiento del estado nutricional infantil</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          id="btn_new_patient_trigger"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-100 transition-all text-sm space-x-2 cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-5 w-5" />
          <span>Nuevo Paciente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex items-center space-x-3">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            id="patient_search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar paciente por nombre..."
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
          />
        </div>
        <div className="text-xs font-mono text-slate-400 hidden sm:block">
          Total: {filteredPatients.length} pacientes
        </div>
      </div>

      {/* Patient Grid */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm" id="empty_patients">
          <Baby className="h-16 w-16 text-slate-300 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-700">No se encontraron pacientes</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
            {searchTerm ? 'Prueba refinando los criterios de búsqueda' : 'Registra tu primer paciente utilizando el botón de \"Nuevo Paciente\" para comenzar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="patients_grid">
          {filteredPatients.map(patient => {
            const lastEval = patient.evaluaciones[patient.evaluaciones.length - 1];
            const age = calculateChronologicalAge(patient.fechaNacimiento);
            const isMale = patient.genero === 'niño';

            return (
              <div
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/30 transition-all duration-300 p-6 flex flex-col justify-between cursor-pointer relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${isMale ? 'bg-blue-400' : 'bg-pink-400'}`} />

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${isMale ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                      {patient.genero}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(patient.fechaNacimiento).toLocaleDateString('es-CO')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1">
                    {patient.nombre}
                  </h3>
                  {patient.documento && (
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Doc: {patient.documento}
                    </p>
                  )}

                  <p className="text-sm text-slate-500 mt-1 font-sans">
                    Edad: <span className="font-medium text-slate-700">{age.years} años, {age.months} meses y {age.days} días</span>
                  </p>

                  {/* Assessment Summary if available */}
                  {lastEval ? (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100/50 text-xs">
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Última evaluación:</span>
                        <span>{new Date(lastEval.fecha).toLocaleDateString('es-CO')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <span className="text-slate-400 block">Peso / Talla:</span>
                          <span className={`font-semibold capitalize truncate block ${
                            lastEval.pesoTallaClass?.includes('desnutrición') ? 'text-red-600 font-bold' : 
                            lastEval.pesoTallaClass?.includes('sobrepeso') || lastEval.pesoTallaClass?.includes('obesidad') ? 'text-amber-600' : 'text-blue-600'
                          }`}>
                            {lastEval.pesoTallaClass}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Requerimiento:</span>
                          <span className="font-semibold text-slate-700 block">
                            {lastEval.caloriasRecomendadas} kcal
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                      Sin evaluaciones registradas
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-sm text-slate-400 group-hover:text-emerald-600 transition-colors">
                  <span className="font-medium">Abrir Expediente</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD PACIENTE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="add_patient_modal">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-transform">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 text-blue-600">
                <UserPlus className="h-6 w-6" />
                <h2 className="text-lg font-bold text-slate-800">Registrar Nuevo Paciente</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <span className="font-semibold">Error:</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Nombre Completo del Paciente
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    id="new_patient_nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombres y Apellidos"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Género
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setGenero('niña')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                      genero === 'niña'
                        ? 'border-pink-200 bg-pink-50 text-pink-700 shadow-inner'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-400 block" />
                    <span>Niña</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenero('niño')}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                      genero === 'niño'
                        ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-inner'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 block" />
                    <span>Niño</span>
                  </button>
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
                    id="new_patient_birthdate"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                  />
                </div>
                <span className="text-xs text-slate-400 mt-1 block">Rango permitido: de 0 a 5 años</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Número de Documento (Opcional)
                </label>
                <input
                  type="text"
                  id="new_patient_documento"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="Ej. Registro Civil o NUIP"
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Datos del Acudiente</h3>
                
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Nombre del Acudiente
                  </label>
                  <input
                    type="text"
                    id="new_patient_acudiente_nombre"
                    value={nombreAcudiente}
                    onChange={(e) => setNombreAcudiente(e.target.value)}
                    placeholder="Nombre completo"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Parentesco
                    </label>
                    <select
                      id="new_patient_acudiente_parentesco"
                      value={parentescoAcudiente}
                      onChange={(e) => setParentescoAcudiente(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Madre">Madre</option>
                      <option value="Padre">Padre</option>
                      <option value="Abuelo/a">Abuelo/a</option>
                      <option value="Tío/a">Tío/a</option>
                      <option value="Tutor">Tutor / Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Celular
                    </label>
                    <input
                      type="tel"
                      id="new_patient_acudiente_celular"
                      value={celularAcudiente}
                      onChange={(e) => setCelularAcudiente(e.target.value)}
                      placeholder="Ej. 3001234567"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Dirección de Residencia
                  </label>
                  <input
                    type="text"
                    id="new_patient_acudiente_direccion"
                    value={direccionAcudiente}
                    onChange={(e) => setDireccionAcudiente(e.target.value)}
                    placeholder="Dirección completa"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 px-4 border border-slate-200 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  id="btn_submit_patient"
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md shadow-blue-100 transition-all text-sm flex justify-center items-center space-x-2 cursor-pointer"
                >
                  {loading ? 'Creando...' : 'Crear Expediente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
