import React from 'react';
import { Evaluation, Patient } from '../types';
import { ageToTotalMonths, calculateChronologicalAge, interpolateWHO, heightForAgeBoys, heightForAgeGirls, headCircumferenceBoys, headCircumferenceGirls } from '../lib/whoCalculations';
import { ShieldAlert, TrendingUp, Sparkles, Heart } from 'lucide-react';

interface SomaChartsProps {
  patient: Patient;
  evaluation: Evaluation;
}

export default function SomaCharts({ patient, evaluation }: SomaChartsProps) {
  const age = calculateChronologicalAge(patient.fechaNacimiento, evaluation.fecha);
  const totalMonths = ageToTotalMonths(age);
  const isMale = patient.genero === 'niño';
  const isUnder2 = totalMonths < 24;

  // 1. ARM CIRCUMFERENCE ALERT (MUAC)
  const showArmAlert = evaluation.perimetroBrazo > 0 && evaluation.perimetroBrazo < 11.5;

  // 2. CHART DETERMINATION
  // Determine which chart IDs apply
  const chartGroup = isMale 
    ? (isUnder2 ? { pt: 1, te: 3, pc: 9 } : { pt: 2, te: 4, pc: 9 })
    : (isUnder2 ? { pt: 5, te: 7, pc: 10 } : { pt: 6, te: 8, pc: 10 });

  // Render SVG Weight-for-Height Chart
  const renderWeightForHeightChart = () => {
    const minH = isUnder2 ? 45 : 65;
    const maxH = isUnder2 ? 110 : 120;
    const minW = isUnder2 ? 1.5 : 5;
    const maxW = isUnder2 ? 22 : 25;

    // Define standard WHO curves for Weight-for-Height (approximated for visual parity)
    const dataPoints: { height: number; sd3Neg: number; sd2Neg: number; sd0: number; sd2Pos: number; sd3Pos: number }[] = [];
    const step = (maxH - minH) / 10;
    for (let i = 0; i <= 10; i++) {
      const h = minH + i * step;
      // Get Median Weight for Height
      const median = isMale 
        ? (isUnder2 ? (h * 0.24 - 8.3) : (h * 0.27 - 10.0))
        : (isUnder2 ? (h * 0.23 - 8.1) : (h * 0.28 - 11.0));
      const sdPercent = isUnder2 ? 0.11 : 0.12;
      const sd = median * sdPercent;
      dataPoints.push({
        height: h,
        sd3Neg: Math.max(0.5, median - 3 * sd),
        sd2Neg: Math.max(1.0, median - 2 * sd),
        sd0: median,
        sd2Pos: median + 2 * sd,
        sd3Pos: median + 3 * sd,
      });
    }

    // Convert values to SVG coordinate space
    const toX = (h: number) => 50 + ((h - minH) / (maxH - minH)) * 400;
    const toY = (w: number) => 250 - ((w - minW) / (maxW - minW)) * 200;

    // Construct SVG Paths
    const getPath = (key: 'sd3Neg' | 'sd2Neg' | 'sd0' | 'sd2Pos' | 'sd3Pos') => {
      return dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.height)} ${toY(p[key])}`).join(' ');
    };

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
        <div>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Gráfica {chartGroup.pt}
          </span>
          <h4 className="text-sm font-bold text-slate-800 mt-1">
            Peso para la Talla ({patient.genero === 'niño' ? 'Niños' : 'Niñas'} {isUnder2 ? '0 a 2 años' : '2 a 5 años'})
          </h4>
        </div>

        {/* SVG Container */}
        <div className="relative my-4 bg-slate-50/50 rounded-xl border border-slate-100/50 p-2 overflow-hidden">
          <svg viewBox="0 0 500 300" className="w-full h-auto">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
              const h = minH + i * ((maxH - minH) / 10);
              const w = minW + i * ((maxW - minW) / 10);
              return (
                <g key={i}>
                  {/* Vertical grid */}
                  <line x1={toX(h)} y1="50" x2={toX(h)} y2="250" stroke="#f1f5f9" strokeWidth="1" />
                  <text x={toX(h)} y="265" fontSize="8" textAnchor="middle" fill="#94a3b8" fontFamily="monospace">
                    {Math.round(h)}
                  </text>
                  {/* Horizontal grid */}
                  <line x1="50" y1={toY(w)} x2="450" y2={toY(w)} stroke="#f1f5f9" strokeWidth="1" />
                  <text x="35" y={toY(w) + 3} fontSize="8" textAnchor="end" fill="#94a3b8" fontFamily="monospace">
                    {Math.round(w)}
                  </text>
                </g>
              );
            })}

            {/* Standard Deviation Curves */}
            {/* +3 SD (Red) */}
            <path d={getPath('sd3Pos')} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x="455" y={toY(dataPoints[10].sd3Pos) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">+3</text>

            {/* +2 SD (Orange) */}
            <path d={getPath('sd2Pos')} fill="none" stroke="#f97316" strokeWidth="1.5" />
            <text x="455" y={toY(dataPoints[10].sd2Pos) + 3} fontSize="8" fill="#f97316" fontWeight="bold">+2</text>

            {/* Median / 0 SD (Green) */}
            <path d={getPath('sd0')} fill="none" stroke="#10b981" strokeWidth="2.5" />
            <text x="455" y={toY(dataPoints[10].sd0) + 3} fontSize="8" fill="#10b981" fontWeight="bold">0</text>

            {/* -2 SD (Orange) */}
            <path d={getPath('sd2Neg')} fill="none" stroke="#f97316" strokeWidth="1.5" />
            <text x="455" y={toY(dataPoints[10].sd2Neg) + 3} fontSize="8" fill="#f97316" fontWeight="bold">-2</text>

            {/* -3 SD (Red) */}
            <path d={getPath('sd3Neg')} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
            <text x="455" y={toY(dataPoints[10].sd3Neg) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">-3</text>

            {/* Patient plotted Point */}
            {evaluation.peso > 0 && evaluation.talla > 0 && (
              <g>
                <circle
                  cx={toX(evaluation.talla)}
                  cy={toY(evaluation.peso)}
                  r="6"
                  fill={isMale ? '#3b82f6' : '#ec4899'}
                  stroke="white"
                  strokeWidth="2"
                  className="animate-pulse"
                />
                <circle
                  cx={toX(evaluation.talla)}
                  cy={toY(evaluation.peso)}
                  r="12"
                  fill="none"
                  stroke={isMale ? '#3b82f6' : '#ec4899'}
                  strokeWidth="1.5"
                  opacity="0.4"
                  className="animate-ping"
                />
              </g>
            )}

            {/* Axes */}
            <line x1="50" y1="250" x2="450" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="50" y1="50" x2="50" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
            
            {/* Axis labels */}
            <text x="250" y="290" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold">Talla / Longitud (cm)</text>
            <text x="15" y="150" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold" transform="rotate(-90, 15, 150)">Peso (kg)</text>
          </svg>
        </div>

        {/* Diagnosis Card */}
        <div className="pt-3 border-t border-slate-50 mt-1">
          <span className="text-xs text-slate-400 uppercase tracking-wide block">Resultado:</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
              evaluation.pesoTallaClass?.includes('desnutrición') ? 'bg-red-50 text-red-700 border border-red-100' :
              evaluation.pesoTallaClass?.includes('sobrepeso') || evaluation.pesoTallaClass?.includes('obesidad') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
              'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              {evaluation.pesoTallaClass}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              (Z = {evaluation.pesoTallaZ?.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render SVG Height-for-Age Chart
  const renderHeightForAgeChart = () => {
    const minA = isUnder2 ? 0 : 24;
    const maxA = isUnder2 ? 24 : 60;
    const minH = isUnder2 ? 45 : 75;
    const maxH = isUnder2 ? 100 : 125;

    // Build curve lines dynamically from interpolation
    const dataPoints: { age: number; sd2Neg: number; sd1Neg: number; sd0: number; sd1Pos: number; sd2Pos: number }[] = [];
    const step = (maxA - minA) / 10;
    const dataset = isMale ? heightForAgeBoys : heightForAgeGirls;
    
    for (let i = 0; i <= 10; i++) {
      const ageVal = minA + i * step;
      const limits = interpolateWHO(ageVal, dataset); // [ -2SD, -1SD, Median, +1SD, +2SD ]
      dataPoints.push({
        age: ageVal,
        sd2Neg: limits[0],
        sd1Neg: limits[1],
        sd0: limits[2],
        sd1Pos: limits[3],
        sd2Pos: limits[4],
      });
    }

    const toX = (a: number) => 50 + ((a - minA) / (maxA - minA)) * 400;
    const toY = (h: number) => 250 - ((h - minH) / (maxH - minH)) * 200;

    const getPath = (idx: number) => {
      return dataPoints.map((p, i) => {
        const limits = interpolateWHO(p.age, dataset);
        return `${i === 0 ? 'M' : 'L'} ${toX(p.age)} ${toY(limits[idx])}`;
      }).join(' ');
    };

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
        <div>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Gráfica {chartGroup.te}
          </span>
          <h4 className="text-sm font-bold text-slate-800 mt-1">
            Talla para la Edad ({patient.genero === 'niño' ? 'Niños' : 'Niñas'} {isUnder2 ? '0 a 2 años' : '2 a 5 años'})
          </h4>
        </div>

        <div className="relative my-4 bg-slate-50/50 rounded-xl border border-slate-100/50 p-2 overflow-hidden">
          <svg viewBox="0 0 500 300" className="w-full h-auto">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
              const a = minA + i * ((maxA - minA) / 10);
              const h = minH + i * ((maxH - minH) / 10);
              return (
                <g key={i}>
                  <line x1={toX(a)} y1="50" x2={toX(a)} y2="250" stroke="#f1f5f9" strokeWidth="1" />
                  <text x={toX(a)} y="265" fontSize="8" textAnchor="middle" fill="#94a3b8" fontFamily="monospace">
                    {Math.round(a)}m
                  </text>
                  <line x1="50" y1={toY(h)} x2="450" y2={toY(h)} stroke="#f1f5f9" strokeWidth="1" />
                  <text x="35" y={toY(h) + 3} fontSize="8" textAnchor="end" fill="#94a3b8" fontFamily="monospace">
                    {Math.round(h)}
                  </text>
                </g>
              );
            })}

            {/* standard curves */}
            {/* +2 SD */}
            <path d={getPath(4)} fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[4]) + 3} fontSize="8" fill="#22c55e" fontWeight="bold">+2</text>
            
            {/* +1 SD */}
            <path d={getPath(3)} fill="none" stroke="#a3e635" strokeWidth="1.2" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[3]) + 3} fontSize="8" fill="#a3e635" fontWeight="bold">+1</text>

            {/* Median / 0 SD */}
            <path d={getPath(2)} fill="none" stroke="#10b981" strokeWidth="2.5" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[2]) + 3} fontSize="8" fill="#10b981" fontWeight="bold">0</text>

            {/* -1 SD */}
            <path d={getPath(1)} fill="none" stroke="#f97316" strokeWidth="1.2" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[1]) + 3} fontSize="8" fill="#f97316" fontWeight="bold">-1</text>

            {/* -2 SD */}
            <path d={getPath(0)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[0]) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">-2</text>

            {/* Plotted Point */}
            {evaluation.talla > 0 && (
              <g>
                <circle
                  cx={toX(totalMonths)}
                  cy={toY(evaluation.talla)}
                  r="6"
                  fill={isMale ? '#3b82f6' : '#ec4899'}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Axes */}
            <line x1="50" y1="250" x2="450" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="50" y1="50" x2="50" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
            
            <text x="250" y="290" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold">Edad (meses)</text>
            <text x="15" y="150" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold" transform="rotate(-90, 15, 150)">Talla (cm)</text>
          </svg>
        </div>

        <div className="pt-3 border-t border-slate-50 mt-1">
          <span className="text-xs text-slate-400 uppercase tracking-wide block">Resultado:</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
              evaluation.tallaEdadClass?.includes('adecuada') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
              evaluation.tallaEdadClass?.includes('riesgo') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
              'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {evaluation.tallaEdadClass}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              (Z = {evaluation.tallaEdadZ?.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render SVG Head Circumference-for-Age Chart
  const renderHeadCircumferenceChart = () => {
    const minA = 0;
    const maxA = 60;
    const minC = 30;
    const maxC = 56;

    const dataPoints: { age: number; sd2Neg: number; sd0: number; sd2Pos: number }[] = [];
    const step = 5;
    const dataset = isMale ? headCircumferenceBoys : headCircumferenceGirls;

    for (let i = 0; i <= 12; i++) {
      const ageVal = minA + i * step;
      const limits = interpolateWHO(ageVal, dataset);
      dataPoints.push({
        age: ageVal,
        sd2Neg: limits[0],
        sd0: limits[2],
        sd2Pos: limits[4],
      });
    }

    const toX = (a: number) => 50 + ((a - minA) / (maxA - minA)) * 400;
    const toY = (c: number) => 250 - ((c - minC) / (maxC - minC)) * 200;

    const getPath = (idx: number) => {
      return dataPoints.map((p, i) => {
        const limits = interpolateWHO(p.age, dataset);
        return `${i === 0 ? 'M' : 'L'} ${toX(p.age)} ${toY(limits[idx])}`;
      }).join(' ');
    };

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
        <div>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Gráfica {chartGroup.pc}
          </span>
          <h4 className="text-sm font-bold text-slate-800 mt-1">
            Perímetro Cefálico ({patient.genero === 'niño' ? 'Niños' : 'Niñas'} 0 a 5 años)
          </h4>
        </div>

        <div className="relative my-4 bg-slate-50/50 rounded-xl border border-slate-100/50 p-2 overflow-hidden">
          <svg viewBox="0 0 500 300" className="w-full h-auto">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map(i => {
              const a = i * 12; // years markers
              return (
                <g key={i}>
                  <line x1={toX(a)} y1="50" x2={toX(a)} y2="250" stroke="#f1f5f9" strokeWidth="1.2" />
                  <text x={toX(a)} y="265" fontSize="8" textAnchor="middle" fill="#64748b" fontWeight="semibold">
                    {i === 0 ? 'Nac.' : `${i} año${i > 1 ? 's' : ''}`}
                  </text>
                </g>
              );
            })}
            {[30, 35, 40, 45, 50, 55].map(c => {
              return (
                <g key={c}>
                  <line x1="50" y1={toY(c)} x2="450" y2={toY(c)} stroke="#f1f5f9" strokeWidth="1" />
                  <text x="35" y={toY(c) + 3} fontSize="8" textAnchor="end" fill="#94a3b8" fontFamily="monospace">
                    {c}
                  </text>
                </g>
              );
            })}

            {/* standard curves */}
            {/* +2 SD (Red as it represents hazard in neurodevelopment) */}
            <path d={getPath(4)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[4]) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">+2</text>

            {/* +1 SD (Yellow) */}
            <path d={getPath(3)} fill="none" stroke="#eab308" strokeWidth="1" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[3]) + 3} fontSize="8" fill="#eab308" fontWeight="bold">+1</text>

            {/* Median / 0 SD (Green) */}
            <path d={getPath(2)} fill="none" stroke="#10b981" strokeWidth="2.5" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[2]) + 3} fontSize="8" fill="#10b981" fontWeight="bold">0</text>

            {/* -1 SD */}
            <path d={getPath(1)} fill="none" stroke="#eab308" strokeWidth="1" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[1]) + 3} fontSize="8" fill="#eab308" fontWeight="bold">-1</text>

            {/* -2 SD */}
            <path d={getPath(0)} fill="none" stroke="#ef4444" strokeWidth="1.5" />
            <text x="455" y={toY(interpolateWHO(maxA, dataset)[0]) + 3} fontSize="8" fill="#ef4444" fontWeight="bold">-2</text>

            {/* Plotted Point */}
            {evaluation.perimetroCefalico > 0 && (
              <g>
                <circle
                  cx={toX(totalMonths)}
                  cy={toY(evaluation.perimetroCefalico)}
                  r="6"
                  fill={isMale ? '#3b82f6' : '#ec4899'}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Axes */}
            <line x1="50" y1="250" x2="450" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="50" y1="50" x2="50" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
            
            <text x="250" y="290" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold">Edad (Meses y años cumplidos)</text>
            <text x="15" y="150" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="semibold" transform="rotate(-90, 15, 150)">PC (cm)</text>
          </svg>
        </div>

        <div className="pt-3 border-t border-slate-50 mt-1">
          <span className="text-xs text-slate-400 uppercase tracking-wide block">Resultado:</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
              evaluation.perimetroCefalicoClass === 'Normal' 
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'bg-red-50 text-red-700 border border-red-100 font-semibold text-center'
            }`}>
              {evaluation.perimetroCefalicoClass}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              (Z = {evaluation.perimetroCefalicoZ?.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="soma_charts_container">
      
      {/* 1. ARM CIRCUMFERENCE ACUTE MALNUTRITION ALERT */}
      {showArmAlert && (
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="graphs_bento_grid">
        {/* Weight-for-height */}
        {renderWeightForHeightChart()}

        {/* Height-for-age */}
        {renderHeightForAgeChart()}

        {/* Head circumference */}
        {renderHeadCircumferenceChart()}
      </div>

    </div>
  );
}
