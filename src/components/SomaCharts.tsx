import React from 'react';
import { Evaluation, Patient } from '../types';
import { ageToTotalMonths, calculateChronologicalAge, interpolateWHO, heightForAgeBoys, heightForAgeGirls, headCircumferenceBoys, headCircumferenceGirls } from '../lib/whoCalculations';
import { ShieldAlert, TrendingUp, Sparkles, Heart, X, Maximize2, Scale, Calendar, Activity } from 'lucide-react';

interface SomaChartsProps {
  patient: Patient;
  evaluation: Evaluation;
  isPrintView?: boolean;
}

export default function SomaCharts({ patient, evaluation, isPrintView = false }: SomaChartsProps) {
  const [activeModalChart, setActiveModalChart] = React.useState<'pesoTalla' | 'tallaEdad' | 'perimetroCefalico' | null>(null);

  const age = calculateChronologicalAge(patient.fechaNacimiento, evaluation.fecha);
  const totalMonths = ageToTotalMonths(age);
  const isMale = patient.genero === 'niño';
  const isUnder2 = totalMonths < 24;

  // 1. ARM CIRCUMFERENCE ALERT (MUAC)
  const showArmAlert = evaluation.perimetroBrazo > 0 && evaluation.perimetroBrazo < 11.5;

  // 2. CHART DETERMINATION
  const chartGroup = isMale 
    ? (isUnder2 ? { pt: 1, te: 3, pc: 9 } : { pt: 2, te: 4, pc: 9 })
    : (isUnder2 ? { pt: 5, te: 7, pc: 10 } : { pt: 6, te: 8, pc: 10 });

  // ----------------------------------------------------
  // CALCULATIONS AND COORDINATES FOR CHART 1: PESO PARA LA TALLA
  // ----------------------------------------------------
  const minH_pt = isUnder2 ? 45 : 65;
  const maxH_pt = isUnder2 ? 110 : 120;
  const minW_pt = isUnder2 ? 1.5 : 5;
  const maxW_pt = isUnder2 ? 22 : 25;

  const dataPoints_pt: { height: number; sd3Neg: number; sd2Neg: number; sd0: number; sd2Pos: number; sd3Pos: number }[] = [];
  const step_pt = (maxH_pt - minH_pt) / 10;
  for (let i = 0; i <= 10; i++) {
    const h = minH_pt + i * step_pt;
    const median = isMale 
      ? (isUnder2 ? (h * 0.24 - 8.3) : (h * 0.27 - 10.0))
      : (isUnder2 ? (h * 0.23 - 8.1) : (h * 0.28 - 11.0));
    const sdPercent = isUnder2 ? 0.11 : 0.12;
    const sd = median * sdPercent;
    dataPoints_pt.push({
      height: h,
      sd3Neg: Math.max(0.5, median - 3 * sd),
      sd2Neg: Math.max(1.0, median - 2 * sd),
      sd0: median,
      sd2Pos: median + 2 * sd,
      sd3Pos: median + 3 * sd,
    });
  }

  const toX_pt = (h: number) => 50 + ((h - minH_pt) / (maxH_pt - minH_pt)) * 400;
  const toY_pt = (w: number) => 250 - ((w - minW_pt) / (maxW_pt - minW_pt)) * 200;

  const getPath_pt = (key: 'sd3Neg' | 'sd2Neg' | 'sd0' | 'sd2Pos' | 'sd3Pos') => {
    return dataPoints_pt.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX_pt(p.height)} ${toY_pt(p[key])}`).join(' ');
  };

  const renderWeightForHeightSVG = () => {
    return (
      <svg viewBox="0 0 500 300" className="w-full h-auto">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
          const h = minH_pt + i * ((maxH_pt - minH_pt) / 10);
          const w = minW_pt + i * ((maxW_pt - minW_pt) / 10);
          return (
            <g key={i}>
              <line x1={toX_pt(h)} y1="50" x2={toX_pt(h)} y2="250" stroke="#f1f5f9" strokeWidth="1" />
              <text x={toX_pt(h)} y="265" fontSize="8" textAnchor="middle" fill="#94a3b8" fontFamily="monospace">
                {Math.round(h)}
              </text>
              <line x1="50" y1={toY_pt(w)} x2="450" y2={toY_pt(w)} stroke="#f1f5f9" strokeWidth="1" />
              <text x="35" y={toY_pt(w) + 3} fontSize="8" textAnchor="end" fill="#94a3b8" fontFamily="monospace">
                {Math.round(w)}
              </text>
            </g>
          );
        })}

        {/* Standard Deviation Curves */}
        <path d={getPath_pt('sd3Pos')} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
        <text x="455" y={toY_pt(dataPoints_pt[10].sd3Pos) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">+3</text>

        <path d={getPath_pt('sd2Pos')} fill="none" stroke="#f97316" strokeWidth="1.5" />
        <text x="455" y={toY_pt(dataPoints_pt[10].sd2Pos) + 3} fontSize="8" fill="#f97316" fontWeight="bold">+2</text>

        <path d={getPath_pt('sd0')} fill="none" stroke="#10b981" strokeWidth="2.5" />
        <text x="455" y={toY_pt(dataPoints_pt[10].sd0) + 3} fontSize="8" fill="#10b981" fontWeight="bold">0</text>

        <path d={getPath_pt('sd2Neg')} fill="none" stroke="#f97316" strokeWidth="1.5" />
        <text x="455" y={toY_pt(dataPoints_pt[10].sd2Neg) + 3} fontSize="8" fill="#f97316" fontWeight="bold">-2</text>

        <path d={getPath_pt('sd3Neg')} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
        <text x="455" y={toY_pt(dataPoints_pt[10].sd3Neg) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">-3</text>

        {/* Patient plotted Point */}
        {evaluation.peso > 0 && evaluation.talla > 0 && (
          <g>
            <circle
              cx={toX_pt(evaluation.talla)}
              cy={toY_pt(evaluation.peso)}
              r="6"
              fill={isMale ? '#3b82f6' : '#ec4899'}
              stroke="white"
              strokeWidth="2"
              className={isPrintView ? '' : 'animate-pulse'}
            />
            {!isPrintView && (
              <circle
                cx={toX_pt(evaluation.talla)}
                cy={toY_pt(evaluation.peso)}
                r="12"
                fill="none"
                stroke={isMale ? '#3b82f6' : '#ec4899'}
                strokeWidth="1.5"
                opacity="0.4"
                className="animate-ping"
              />
            )}
          </g>
        )}

        {/* Axes */}
        <line x1="50" y1="250" x2="450" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="50" y1="50" x2="50" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
        
        <text x="250" y="290" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold">Talla / Longitud (cm)</text>
        <text x="15" y="150" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold" transform="rotate(-90, 15, 150)">Peso (kg)</text>
      </svg>
    );
  };

  const renderWeightForHeightChart = () => {
    return (      <div 
        onClick={isPrintView ? undefined : () => setActiveModalChart('pesoTalla')}
        className={`flex flex-col justify-between h-full transition-all group relative ${isPrintView ? 'p-1 bg-transparent border-none shadow-none' : 'bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200'}`}
      >
        {!isPrintView && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 p-1.5 rounded-lg text-slate-400 hover:text-blue-500">
            <Maximize2 className="h-4 w-4" />
          </div>
        )}
        <div>
          {!isPrintView && (
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Gráfica {chartGroup.pt}
            </span>
          )}
          <h4 className={`font-bold text-slate-800 ${isPrintView ? 'text-[11px] leading-tight' : 'text-sm mt-1'}`}>
            Peso para la Talla ({patient.genero === 'niño' ? 'Niños' : 'Niñas'} {isUnder2 ? '0 a 2 años' : '2 a 5 años'})
          </h4>
        </div>

        <div className={`relative overflow-hidden ${isPrintView ? 'my-1 p-0.5' : 'my-4 bg-slate-50/50 rounded-xl border border-slate-100/50 p-2'}`}>
          {renderWeightForHeightSVG()}
        </div>

        <div className={`${isPrintView ? 'border-none pt-1 mt-0.5' : 'border-t border-slate-50 pt-3 mt-1'}`}>
          <span className={`text-slate-400 uppercase tracking-wide block ${isPrintView ? 'text-[9px]' : 'text-xs'}`}>Resultado:</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center rounded-xl font-bold uppercase tracking-wider ${isPrintView ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-xs'} ${
              evaluation.pesoTallaClass?.includes('desnutrición') ? 'bg-red-50 text-red-700 border border-red-100' :
              evaluation.pesoTallaClass?.includes('sobrepeso') || evaluation.pesoTallaClass?.includes('obesidad') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
              'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              {evaluation.pesoTallaClass}
            </span>
            <span className={`text-slate-505 font-mono ${isPrintView ? 'text-[9px]' : 'text-xs'}`}>
              (Z = {evaluation.pesoTallaZ?.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // CALCULATIONS AND COORDINATES FOR CHART 2: TALLA PARA LA EDAD
  // ----------------------------------------------------
  const minA_te = isUnder2 ? 0 : 24;
  const maxA_te = isUnder2 ? 24 : 60;
  const minH_te = isUnder2 ? 45 : 75;
  const maxH_te = isUnder2 ? 100 : 125;

  const dataPoints_te: { age: number; sd2Neg: number; sd1Neg: number; sd0: number; sd1Pos: number; sd2Pos: number }[] = [];
  const step_te = (maxA_te - minA_te) / 10;
  const dataset_te = isMale ? heightForAgeBoys : heightForAgeGirls;
  
  for (let i = 0; i <= 10; i++) {
    const ageVal = minA_te + i * step_te;
    const limits = interpolateWHO(ageVal, dataset_te);
    dataPoints_te.push({
      age: ageVal,
      sd2Neg: limits[0],
      sd1Neg: limits[1],
      sd0: limits[2],
      sd1Pos: limits[3],
      sd2Pos: limits[4],
    });
  }

  const toX_te = (a: number) => 50 + ((a - minA_te) / (maxA_te - minA_te)) * 400;
  const toY_te = (h: number) => 250 - ((h - minH_te) / (maxH_te - minH_te)) * 200;

  const getPath_te = (idx: number) => {
    return dataPoints_te.map((p, i) => {
      const limits = interpolateWHO(p.age, dataset_te);
      return `${i === 0 ? 'M' : 'L'} ${toX_te(p.age)} ${toY_te(limits[idx])}`;
    }).join(' ');
  };

  const renderHeightForAgeSVG = () => {
    return (
      <svg viewBox="0 0 500 300" className="w-full h-auto">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
          const a = minA_te + i * ((maxA_te - minA_te) / 10);
          const h = minH_te + i * ((maxH_te - minH_te) / 10);
          return (
            <g key={i}>
              <line x1={toX_te(a)} y1="50" x2={toX_te(a)} y2="250" stroke="#f1f5f9" strokeWidth="1" />
              <text x={toX_te(a)} y="265" fontSize="8" textAnchor="middle" fill="#94a3b8" fontFamily="monospace">
                {Math.round(a)}m
              </text>
              <line x1="50" y1={toY_te(h)} x2="450" y2={toY_te(h)} stroke="#f1f5f9" strokeWidth="1" />
              <text x="35" y={toY_te(h) + 3} fontSize="8" textAnchor="end" fill="#94a3b8" fontFamily="monospace">
                {Math.round(h)}
              </text>
            </g>
          );
        })}

        {/* standard curves */}
        <path d={getPath_te(4)} fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
        <text x="455" y={toY_te(interpolateWHO(maxA_te, dataset_te)[4]) + 3} fontSize="8" fill="#22c55e" fontWeight="bold">+2</text>
        
        <path d={getPath_te(3)} fill="none" stroke="#a3e635" strokeWidth="1.2" />
        <text x="455" y={toY_te(interpolateWHO(maxA_te, dataset_te)[3]) + 3} fontSize="8" fill="#a3e635" fontWeight="bold">+1</text>

        <path d={getPath_te(2)} fill="none" stroke="#10b981" strokeWidth="2.5" />
        <text x="455" y={toY_te(interpolateWHO(maxA_te, dataset_te)[2]) + 3} fontSize="8" fill="#10b981" fontWeight="bold">0</text>

        <path d={getPath_te(1)} fill="none" stroke="#f97316" strokeWidth="1.2" />
        <text x="455" y={toY_te(interpolateWHO(maxA_te, dataset_te)[1]) + 3} fontSize="8" fill="#f97316" fontWeight="bold">-1</text>

        <path d={getPath_te(0)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
        <text x="455" y={toY_te(interpolateWHO(maxA_te, dataset_te)[0]) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">-2</text>

        {/* Plotted Point */}
        {evaluation.talla > 0 && (
          <g>
            <circle
              cx={toX_te(totalMonths)}
              cy={toY_te(evaluation.talla)}
              r="6"
              fill={isMale ? '#3b82f6' : '#ec4899'}
              stroke="white"
              strokeWidth="2"
              className={isPrintView ? '' : 'animate-pulse'}
            />
            {!isPrintView && (
              <circle
                cx={toX_te(totalMonths)}
                cy={toY_te(evaluation.talla)}
                r="12"
                fill="none"
                stroke={isMale ? '#3b82f6' : '#ec4899'}
                strokeWidth="1.5"
                opacity="0.4"
                className="animate-ping"
              />
            )}
          </g>
        )}

        {/* Axes */}
        <line x1="50" y1="250" x2="450" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="50" y1="50" x2="50" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
        
        <text x="250" y="290" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold">Edad (meses)</text>
        <text x="15" y="150" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold" transform="rotate(-90, 15, 150)">Talla (cm)</text>
      </svg>
    );
  };

  const renderHeightForAgeChart = () => {
    return (
      <div 
        onClick={isPrintView ? undefined : () => setActiveModalChart('tallaEdad')}
        className={`flex flex-col justify-between h-full transition-all group relative ${isPrintView ? 'p-1 bg-transparent border-none shadow-none' : 'bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200'}`}
      >
        {!isPrintView && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 p-1.5 rounded-lg text-slate-400 hover:text-blue-500">
            <Maximize2 className="h-4 w-4" />
          </div>
        )}
        <div>
          {!isPrintView && (
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Gráfica {chartGroup.te}
            </span>
          )}
          <h4 className={`font-bold text-slate-800 ${isPrintView ? 'text-[11px] leading-tight' : 'text-sm mt-1'}`}>
            Talla para la Edad ({patient.genero === 'niño' ? 'Niños' : 'Niñas'} {isUnder2 ? '0 a 2 años' : '2 a 5 años'})
          </h4>
        </div>

        <div className={`relative overflow-hidden ${isPrintView ? 'my-1 p-0.5' : 'my-4 bg-slate-50/50 rounded-xl border border-slate-100/50 p-2'}`}>
          {renderHeightForAgeSVG()}
        </div>

        <div className={`${isPrintView ? 'border-none pt-1 mt-0.5' : 'border-t border-slate-50 pt-3 mt-1'}`}>
          <span className={`text-slate-400 uppercase tracking-wide block ${isPrintView ? 'text-[9px]' : 'text-xs'}`}>Resultado:</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center rounded-xl font-bold uppercase tracking-wider ${isPrintView ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-xs'} ${
              evaluation.tallaEdadClass?.includes('adecuada') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
              evaluation.tallaEdadClass?.includes('riesgo') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
              'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {evaluation.tallaEdadClass}
            </span>
            <span className={`text-slate-505 font-mono ${isPrintView ? 'text-[9px]' : 'text-xs'}`}>
              (Z = {evaluation.tallaEdadZ?.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // CALCULATIONS AND COORDINATES FOR CHART 3: PERÍMETRO CEFÁLICO
  // ----------------------------------------------------
  const minA_pc = 0;
  const maxA_pc = 60;
  const minC_pc = 30;
  const maxC_pc = 56;

  const dataPoints_pc: { age: number; sd2Neg: number; sd0: number; sd2Pos: number }[] = [];
  const step_pc = 5;
  const dataset_pc = isMale ? headCircumferenceBoys : headCircumferenceGirls;

  for (let i = 0; i <= 12; i++) {
    const ageVal = minA_pc + i * step_pc;
    const limits = interpolateWHO(ageVal, dataset_pc);
    dataPoints_pc.push({
      age: ageVal,
      sd2Neg: limits[0],
      sd0: limits[2],
      sd2Pos: limits[4],
    });
  }

  const toX_pc = (a: number) => 50 + ((a - minA_pc) / (maxA_pc - minA_pc)) * 400;
  const toY_pc = (c: number) => 250 - ((c - minC_pc) / (maxC_pc - minC_pc)) * 200;

  const getPath_pc = (idx: number) => {
    return dataPoints_pc.map((p, i) => {
      const limits = interpolateWHO(p.age, dataset_pc);
      return `${i === 0 ? 'M' : 'L'} ${toX_pc(p.age)} ${toY_pc(limits[idx])}`;
    }).join(' ');
  };

  const renderHeadCircumferenceSVG = () => {
    return (
      <svg viewBox="0 0 500 300" className="w-full h-auto">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5].map(i => {
          const a = i * 12;
          return (
            <g key={i}>
              <line x1={toX_pc(a)} y1="50" x2={toX_pc(a)} y2="250" stroke="#f1f5f9" strokeWidth="1.2" />
              <text x={toX_pc(a)} y="265" fontSize="8" textAnchor="middle" fill="#64748b" fontWeight="semibold">
                {i === 0 ? 'Nac.' : `${i} año${i > 1 ? 's' : ''}`}
              </text>
            </g>
          );
        })}
        {[30, 35, 40, 45, 50, 55].map(c => {
          return (
            <g key={c}>
              <line x1="50" y1={toY_pc(c)} x2="450" y2={toY_pc(c)} stroke="#f1f5f9" strokeWidth="1" />
              <text x="35" y={toY_pc(c) + 3} fontSize="8" textAnchor="end" fill="#94a3b8" fontFamily="monospace">
                {c}
              </text>
            </g>
          );
        })}

        {/* standard curves */}
        <path d={getPath_pc(4)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
        <text x="455" y={toY_pc(interpolateWHO(maxA_pc, dataset_pc)[4]) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">+2</text>

        <path d={getPath_pc(3)} fill="none" stroke="#eab308" strokeWidth="1" />
        <text x="455" y={toY_pc(interpolateWHO(maxA_pc, dataset_pc)[3]) + 3} fontSize="8" fill="#eab308" fontWeight="bold">+1</text>

        <path d={getPath_pc(2)} fill="none" stroke="#10b981" strokeWidth="2.5" />
        <text x="455" y={toY_pc(interpolateWHO(maxA_pc, dataset_pc)[2]) + 3} fontSize="8" fill="#10b981" fontWeight="bold">0</text>

        <path d={getPath_pc(1)} fill="none" stroke="#eab308" strokeWidth="1" />
        <text x="455" y={toY_pc(interpolateWHO(maxA_pc, dataset_pc)[1]) + 3} fontSize="8" fill="#eab308" fontWeight="bold">-1</text>

        <path d={getPath_pc(0)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
        <text x="455" y={toY_pc(interpolateWHO(maxA_pc, dataset_pc)[0]) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">-2</text>

        {/* Plotted Point */}
        {evaluation.perimetroCefalico > 0 && (
          <g>
            <circle
              cx={toX_pc(totalMonths)}
              cy={toY_pc(evaluation.perimetroCefalico)}
              r="6"
              fill={isMale ? '#3b82f6' : '#ec4899'}
              stroke="white"
              strokeWidth="2"
              className={isPrintView ? '' : 'animate-pulse'}
            />
            {!isPrintView && (
              <circle
                cx={toX_pc(totalMonths)}
                cy={toY_pc(evaluation.perimetroCefalico)}
                r="12"
                fill="none"
                stroke={isMale ? '#3b82f6' : '#ec4899'}
                strokeWidth="1.5"
                opacity="0.4"
                className="animate-ping"
              />
            )}
          </g>
        )}

        {/* Axes */}
        <line x1="50" y1="250" x2="450" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="50" y1="50" x2="50" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
        
        <text x="250" y="290" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold">Edad (Meses y años cumplidos)</text>
        <text x="15" y="150" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold" transform="rotate(-90, 15, 150)">PC (cm)</text>
      </svg>
    );
  };

  const renderHeadCircumferenceChart = () => {
    return (
      <div 
        onClick={isPrintView ? undefined : () => setActiveModalChart('perimetroCefalico')}
        className={`flex flex-col justify-between h-full transition-all group relative ${isPrintView ? 'p-1 bg-transparent border-none shadow-none' : 'bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200'}`}
      >
        {!isPrintView && (
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 p-1.5 rounded-lg text-slate-400 hover:text-blue-500">
            <Maximize2 className="h-4 w-4" />
          </div>
        )}
        <div>
          {!isPrintView && (
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Gráfica {chartGroup.pc}
            </span>
          )}
          <h4 className={`font-bold text-slate-800 ${isPrintView ? 'text-[11px] leading-tight' : 'text-sm mt-1'}`}>
            Perímetro Cefálico ({patient.genero === 'niño' ? 'Niños' : 'Niñas'} 0 a 5 años)
          </h4>
        </div>

        <div className={`relative overflow-hidden ${isPrintView ? 'my-1 p-0.5' : 'my-4 bg-slate-50/50 rounded-xl border border-slate-100/50 p-2'}`}>
          {renderHeadCircumferenceSVG()}
        </div>

        <div className={`${isPrintView ? 'border-none pt-1 mt-0.5' : 'border-t border-slate-50 pt-3 mt-1'}`}>
          <span className={`text-slate-400 uppercase tracking-wide block ${isPrintView ? 'text-[9px]' : 'text-xs'}`}>Resultado:</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center rounded-xl font-bold uppercase tracking-wider ${isPrintView ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-xs'} ${
              evaluation.perimetroCefalicoClass === 'Normal' 
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'bg-red-50 text-red-700 border border-red-100 font-semibold text-center'
            }`}>
              {evaluation.perimetroCefalicoClass}
            </span>
            <span className={`text-slate-505 font-mono ${isPrintView ? 'text-[9px]' : 'text-xs'}`}>
              (Z = {evaluation.perimetroCefalicoZ?.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // CLINICAL ASSESSMENT ADVICE AND TEXT INTERPRETATION
  // ----------------------------------------------------
  const getClinicalInterpretation = (
    type: 'pesoTalla' | 'tallaEdad' | 'perimetroCefalico',
    classification: string,
    z: number
  ): string => {
    if (type === 'pesoTalla') {
      if (z > 2) {
        return 'El paciente se encuentra en rango de sobrepeso u obesidad para su estatura. Se recomienda revisar el consumo calórico diario, priorizar el peso ideal para la planificación dietética, evitar alimentos ultraprocesados y grasas saturadas, y aumentar la actividad física activa diaria.';
      } else if (z > 1) {
        return 'El paciente presenta riesgo de sobrepeso. Se aconseja monitorear las porciones de carbohidratos simples y grasas en el FCA y fomentar hábitos saludables de alimentación complementaria o familiar.';
      } else if (z < -2) {
        return '¡Alerta clínica! El paciente presenta desnutrición aguda moderada o severa. Requiere seguimiento médico/nutricional prioritario. Se aconseja iniciar pauta de recuperación nutricional y evaluar la ingesta calórica y la frecuencia de tomas/comidas.';
      } else if (z < -1) {
        return 'El paciente presenta riesgo de desnutrición aguda. Es importante revisar la ingesta energética diaria, la aceptación de alimentos sólidos y la presencia de episodios infecciosos recientes.';
      } else {
        return 'Relación peso/talla adecuada. El desarrollo ponderal se encuentra dentro del rango de normalidad de la OMS. Se aconseja mantener el plan de alimentación actual y las visitas de control de crecimiento.';
      }
    } else if (type === 'tallaEdad') {
      if (z < -2) {
        return '¡Alerta clínica! El paciente presenta talla baja o retraso en el crecimiento lineal. Se aconseja evaluar deficiencias de micronutrientes (como zinc o hierro), investigar causas secundarias y fortificar la alimentación.';
      } else if (z < -1) {
        return 'El paciente presenta riesgo de talla baja. Se recomienda vigilar la velocidad de crecimiento, asegurar una ingesta de proteínas de alto valor biológico y micronutrientes esenciales, y repetir la medición en el próximo control.';
      } else {
        return 'Crecimiento en talla adecuado para la edad. El desarrollo lineal del paciente se encuentra dentro de los parámetros esperados de la OMS.';
      }
    } else {
      if (z > 2) {
        return 'El perímetro cefálico está por encima de la media (+2 SD), lo que puede representar macrocefalia. Se sugiere valoración por pediatría para descartar anomalías estructurales o variantes familiares.';
      } else if (z < -2) {
        return 'El perímetro cefálico se encuentra por debajo de la media (-2 SD), lo que puede indicar microcefalia o restricción del desarrollo craneal. Se sugiere remitir a valoración pediátrica especializada y estimulación oportuna.';
      } else {
        return 'Perímetro cefálico normal. El desarrollo craneal y del sistema nervioso se encuentra dentro de los rangos esperados de la OMS.';
      }
    }
  };

  // ----------------------------------------------------
  // EXPANDED MODAL PORTAL/CONTAINER
  // ----------------------------------------------------
  const renderModal = () => {
    if (!activeModalChart) return null;

    let title = '';
    let groupNum = 0;
    let classification = '';
    let zScore = 0;
    let svgRenderer: () => React.JSX.Element = () => <svg />;
    let rangeText = '';
    let medianText = '';
    let diffText = '';
    let clinicalAdvice = '';

    if (activeModalChart === 'pesoTalla') {
      title = `Peso para la Talla (${isMale ? 'Niños' : 'Niñas'} ${isUnder2 ? '0 a 2 años' : '2 a 5 años'})`;
      groupNum = chartGroup.pt;
      classification = evaluation.pesoTallaClass || '';
      zScore = evaluation.pesoTallaZ || 0;
      svgRenderer = renderWeightForHeightSVG;

      const h = evaluation.talla;
      const median = isMale 
        ? (isUnder2 ? (h * 0.24 - 8.3) : (h * 0.27 - 10.0))
        : (isUnder2 ? (h * 0.23 - 8.1) : (h * 0.28 - 11.0));
      const sdPercent = isUnder2 ? 0.11 : 0.12;
      const sd = median * sdPercent;
      const valMin2SD = median - 2 * sd;
      const valPlus2SD = median + 2 * sd;
      
      rangeText = `entre ${valMin2SD.toFixed(1)} kg y ${valPlus2SD.toFixed(1)} kg`;
      medianText = `${median.toFixed(1)} kg`;
      diffText = `${evaluation.peso >= median ? '+' : ''}${(evaluation.peso - median).toFixed(1)} kg`;
      clinicalAdvice = getClinicalInterpretation('pesoTalla', classification, zScore);
    } else if (activeModalChart === 'tallaEdad') {
      title = `Talla para la Edad (${isMale ? 'Niños' : 'Niñas'} ${isUnder2 ? '0 a 2 años' : '2 a 5 años'})`;
      groupNum = chartGroup.te;
      classification = evaluation.tallaEdadClass || '';
      zScore = evaluation.tallaEdadZ || 0;
      svgRenderer = renderHeightForAgeSVG;

      const limits = interpolateWHO(totalMonths, dataset_te);
      const valMin2SD = limits[0];
      const valMedian = limits[2];
      const valPlus2SD = limits[4];

      rangeText = `entre ${valMin2SD.toFixed(1)} cm y ${valPlus2SD.toFixed(1)} cm`;
      medianText = `${valMedian.toFixed(1)} cm`;
      diffText = `${evaluation.talla >= valMedian ? '+' : ''}${(evaluation.talla - valMedian).toFixed(1)} cm`;
      clinicalAdvice = getClinicalInterpretation('tallaEdad', classification, zScore);
    } else if (activeModalChart === 'perimetroCefalico') {
      title = `Perímetro Cefálico (${isMale ? 'Niños' : 'Niñas'} 0 a 5 años)`;
      groupNum = chartGroup.pc;
      classification = evaluation.perimetroCefalicoClass || '';
      zScore = evaluation.perimetroCefalicoZ || 0;
      svgRenderer = renderHeadCircumferenceSVG;

      const limits = interpolateWHO(totalMonths, dataset_pc);
      const valMin2SD = limits[0];
      const valMedian = limits[2];
      const valPlus2SD = limits[4];

      rangeText = `entre ${valMin2SD.toFixed(1)} cm y ${valPlus2SD.toFixed(1)} cm`;
      medianText = `${valMedian.toFixed(1)} cm`;
      diffText = `${evaluation.perimetroCefalico >= valMedian ? '+' : ''}${(evaluation.perimetroCefalico - valMedian).toFixed(1)} cm`;
      clinicalAdvice = getClinicalInterpretation('perimetroCefalico', classification, zScore);
    }

    const pinPosition = Math.min(95, Math.max(5, ((zScore + 3) / 6) * 100));

    const badgeColor = 
      classification.includes('desnutrición') || classification.includes('riesgo desnutrición') || classification.includes('baja') || classification.includes('riesgo para el neurodesarrollo')
        ? 'bg-red-50 text-red-700 border-red-100'
        : classification.includes('sobrepeso') || classification.includes('obesidad') || classification.includes('riesgo de sobrepeso')
          ? 'bg-amber-50 text-amber-700 border-amber-100'
          : 'bg-emerald-50 text-emerald-700 border-emerald-100';

    return (
      <div 
        onClick={() => setActiveModalChart(null)}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-100 relative flex flex-col animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-start p-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Gráfica {groupNum} (Vista Ampliada)
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-1.5">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Paciente: <span className="font-semibold text-slate-600">{patient.nombre}</span> • Edad: <span className="font-semibold text-slate-600">{age.years}a {age.months}m {age.days}d</span>
              </p>
            </div>
            <button 
              onClick={() => setActiveModalChart(null)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex flex-col md:flex-row gap-6 p-6 overflow-y-auto">
            {/* Left Column: Enlarged Chart */}
            <div className="w-full md:w-3/5 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col justify-center">
              {svgRenderer()}
            </div>

            {/* Right Column: Interpretation */}
            <div className="w-full md:w-2/5 space-y-5">
              {/* Measurements Card */}
              <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-blue-500" /> Mediciones del Paciente
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-2.5">
                    <Scale className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium leading-none">Peso Actual</p>
                      <p className="text-sm font-bold text-slate-700 mt-1">{evaluation.peso} kg</p>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-2.5">
                    <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium leading-none">Talla Actual</p>
                      <p className="text-sm font-bold text-slate-700 mt-1">{evaluation.talla} cm</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Z-Score and Classification Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Clasificación y Puntuación Z
                  </h4>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-3xl font-extrabold text-slate-800">{zScore > 0 ? '+' : ''}{zScore.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 font-mono">(Puntuación Z)</span>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${badgeColor}`}>
                      {classification}
                    </span>
                  </div>
                </div>

                {/* Z-Score Visual Gauge */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>Deficiente</span>
                    <span>Normal</span>
                    <span>Exceso</span>
                  </div>
                  <div className="relative pt-1">
                    {/* Visual Meter Bar */}
                    <div className="relative h-2 bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-yellow-400 to-red-500 rounded-full">
                      {/* Indicator pin */}
                      <div 
                        className="absolute top-0 h-4 w-4 bg-white border-2 border-slate-800 rounded-full shadow-md -mt-1 transform -translate-x-1/2 transition-all duration-500"
                        style={{ left: `${pinPosition}%` }}
                      />
                    </div>
                    {/* Tick labels */}
                    <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1.5">
                      <span>-3 SD</span>
                      <span>-2 SD</span>
                      <span>0 SD</span>
                      <span>+2 SD</span>
                      <span>+3 SD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Interpretation Guidance */}
              <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-blue-800/80 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-blue-600" /> Interpretación Clínica
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-sans mt-1">
                  {clinicalAdvice}
                </p>
              </div>

              {/* WHO References Summary */}
              <div className="bg-slate-50/20 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Valores de Referencia OMS
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600 font-sans">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Rango Normal (±2 SD):</span>
                    <span className="font-semibold text-slate-700">{rangeText}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Mediana (0 SD):</span>
                    <span className="font-semibold text-slate-700">{medianText}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Desviación del paciente:</span>
                    <span className={`font-bold ${zScore > 0 ? 'text-amber-600' : zScore < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {diffText} de la mediana
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="soma_charts_container">
      
      {/* 1. ARM CIRCUMFERENCE ACUTE MALNUTRITION ALERT */}
      {showArmAlert && !isPrintView && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start space-x-4 shadow-sm animate-pulse" id="alert_muac_severe">
          <div className="bg-red-100 p-2.5 rounded-xl">
            <ShieldAlert className="h-6 w-6 text-red-600 shrink-0" />
          </div>
          <div>
            <h4 className="text-red-900 font-extrabold text-base uppercase tracking-wider">
              ¡ALERTA MÉDICA GENERAL!
            </h4>
            <p className="text-red-700 text-sm font-bold mt-1 uppercase">
              Lineamiento de atención integrada a la desnutrición aguda
            </p>
            <p className="text-red-600 text-xs mt-1.5 leading-relaxed font-sans">
              El paciente cuenta con un Perímetro de Brazo de <strong className="text-red-900 text-sm font-bold">{evaluation.perimetroBrazo} cm</strong> (umbral crítico: menor a 11.5 cm), lo cual indica desnutrición aguda severa o riesgo inminente según el protocolo nacional clínico de la OMS. Se requiere intervención diagnóstica y terapéutica prioritaria.
            </p>
          </div>
        </div>
      )}

      {/* 2. THREE GRAPHS GRID (Responsive Single View) */}
      <div className={`grid gap-4 ${isPrintView ? 'grid-cols-3' : 'grid-cols-1 lg:grid-cols-3'}`} id="graphs_bento_grid">
        {/* Weight-for-height */}
        {renderWeightForHeightChart()}

        {/* Height-for-age */}
        {renderHeightForAgeChart()}

        {/* Head circumference */}
        {renderHeadCircumferenceChart()}
      </div>

      {/* 3. CHART ZOOM MODAL */}
      {renderModal()}

    </div>
  );
}
