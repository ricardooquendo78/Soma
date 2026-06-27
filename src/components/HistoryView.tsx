import React, { useState } from 'react';
import { Patient } from '../types';
import { calculateChronologicalAge } from '../lib/whoCalculations';
import { Search, History, FileText, ArrowRight, Activity, Calendar, FileSpreadsheet, Apple, ClipboardList } from 'lucide-react';

interface HistoryViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export default function HistoryView({ patients, onSelectPatient }: HistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="history_view_panel">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-blue-600">
          <History className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Historial Clínico Integral</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Visualiza de forma consolidada todos los documentos, valoraciones y planes generados por paciente
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre del paciente..."
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 transition-all"
          />
        </div>
      </div>

      {/* consolidated list */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
          <FileText className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium">No se encontraron registros clínicos</p>
        </div>
      ) : (
        <div className="space-y-6" id="history_patient_records">
          {filteredPatients.map(p => {
            const age = calculateChronologicalAge(p.fechaNacimiento);
            const totalEvals = p.evaluaciones?.length || 0;
            const hasFca = p.fca && p.fca.some(ff => ff.frecuencia !== '');
            const recallsCount = p.recordatorios?.length || 0;
            const hasPlan = p.planesAlimentacion?.length > 0;

            return (
              <div
                key={p.id}
                onClick={() => onSelectPatient(p)}
                className="bg-white rounded-3xl border border-slate-100 hover:border-blue-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-4 mb-4 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {p.nombre}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Edad: <span className="text-slate-600 font-semibold">{age.years} años, {age.months} meses y {age.days} días</span> | Registrado: {new Date(p.fechaRegistro).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <span className="inline-flex items-center text-xs text-blue-600 font-medium group-hover:underline self-start sm:self-auto">
                    Ver expediente <ArrowRight className="h-3.5 w-3.5 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                {/* Grid of clinical outputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Anthropometries */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 flex items-start space-x-2.5">
                    <Activity className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Valoraciones</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {totalEvals} realizadas
                      </span>
                    </div>
                  </div>

                  {/* FCA */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 flex items-start space-x-2.5">
                    <Apple className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Cuestionario FCA</span>
                      <span className={`text-xs font-bold block mt-0.5 ${hasFca ? 'text-blue-700' : 'text-slate-400'}`}>
                        {hasFca ? 'Completado' : 'Sin Diligenciar'}
                      </span>
                    </div>
                  </div>

                  {/* Recordatorios */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 flex items-start space-x-2.5">
                    <ClipboardList className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Recordatorios 24H</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {recallsCount} registros
                      </span>
                    </div>
                  </div>

                  {/* Diet Plans */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 flex items-start space-x-2.5">
                    <FileSpreadsheet className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Plan de Dieta</span>
                      <span className={`text-xs font-bold block mt-0.5 ${hasPlan ? 'text-blue-700' : 'text-slate-400'}`}>
                        {hasPlan ? 'Activo' : 'Sin Programar'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
