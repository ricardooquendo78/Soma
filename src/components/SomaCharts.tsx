import React from 'react';
import { Evaluation, Patient } from '../types';
import { ageToTotalMonths, calculateChronologicalAge } from '../lib/whoCalculations';
import { ShieldAlert, Sparkles, Heart, X, Maximize2, Scale, Activity, TrendingUp } from 'lucide-react';
import { loadTable, lookupLms } from '@pedi-growth/core';

interface SomaChartsProps {
  patient: Patient;
  evaluation: Evaluation;
  isPrintView?: boolean;
}

export default function SomaCharts({ patient, evaluation, isPrintView = false }: SomaChartsProps) {
  const [activeModalChart, setActiveModalChart] = React.useState<'pesoTalla' | 'tallaEdad' | 'perimetroCefalico' | null>(null);
  
  // LMS Tables States
  const [wflTable, setWflTable] = React.useState<any[] | null>(null);
  const [wfhTable, setWfhTable] = React.useState<any[] | null>(null);
  const [lhfaTable, setLhfaTable] = React.useState<any[] | null>(null);
  const [hcfaTable, setHcfaTable] = React.useState<any[] | null>(null);

  const age = calculateChronologicalAge(patient.fechaNacimiento, evaluation.fecha);
  const totalMonths = ageToTotalMonths(age);
  const isMale = patient.genero === 'niño';
  const isUnder2 = totalMonths < 24;

  React.useEffect(() => {
    Promise.all([
      loadTable(isMale ? 'wfl-boys' : 'wfl-girls'),
      loadTable(isMale ? 'wfh-boys' : 'wfh-girls'),
      loadTable(isMale ? 'lhfa-boys-0-5' : 'lhfa-girls-0-5'),
      loadTable(isMale ? 'hcfa-boys-0-5' : 'hcfa-girls-0-5')
    ]).then(([wfl, wfh, lhfa, hcfa]) => {
      setWflTable(wfl);
      setWfhTable(wfh);
      setLhfaTable(lhfa);
      setHcfaTable(hcfa);
    }).catch(err => {
      console.error('Error loading LMS tables for charts', err);
    });
  }, [isMale]);

  // Arm circumference alert (MUAC)
  const showArmAlert = evaluation.perimetroBrazo > 0 && evaluation.perimetroBrazo < 11.5;

  // Chart determination groups
  const chartGroup = isMale 
    ? (isUnder2 ? { pt: 1, te: 3, pc: 9 } : { pt: 2, te: 4, pc: 9 })
    : (isUnder2 ? { pt: 5, te: 7, pc: 10 } : { pt: 6, te: 8, pc: 10 });

  // Patient height (with WHO Anthro standing/recumbent adjustments applied in database)
  const pTalla = evaluation.tallaAjustada || evaluation.talla;

  // ----------------------------------------------------
  // UTILITIES & FORMULA
  // ----------------------------------------------------
  const getValueForZ = (lms: { L: number; M: number; S: number }, z: number) => {
    if (!lms) return 0;
    if (lms.L === 0) {
      return lms.M * Math.exp(lms.S * z);
    }
    const val = 1 + lms.L * lms.S * z;
    if (val <= 0) return 0.1;
    return lms.M * Math.pow(val, 1 / lms.L);
  };

  // Common plot dimensions
  // viewBox="0 0 650 520"
  // Margins: Left 60, Right 65, Top 50, Bottom 60.
  const xMin = 60;
  const xMax = 585; // Width = 525
  const yMin = 50;
  const yMax = 460; // Height = 410

  // ----------------------------------------------------
  // GRID & TICKS RENDERER
  // ----------------------------------------------------
  const renderAxesAndTicks = (
    xMajorTicks: number[],
    xMinorTicks: number[],
    yMajorTicks: number[],
    yMinorTicks: number[],
    xLabel: string,
    yLabel: string,
    toX: (x: number) => number,
    toY: (y: number) => number,
    formatXLabel?: (x: number) => string
  ) => {
    return (
      <g>
        {/* Background Plot Frame Grid area (White) */}
        <rect x={xMin} y={yMin} width={xMax - xMin} height={yMax - yMin} fill="#ffffff" />

        {/* Major Grid Lines */}
        {xMajorTicks.map(val => (
          <line key={`grid-x-${val}`} x1={toX(val)} y1={yMin} x2={toX(val)} y2={yMax} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        {yMajorTicks.map(val => (
          <line key={`grid-y-${val}`} x1={xMin} y1={toY(val)} x2={xMax} y2={toY(val)} stroke="#f1f5f9" strokeWidth="1" />
        ))}

        {/* Double Axis frame border */}
        <rect x={xMin} y={yMin} width={xMax - xMin} height={yMax - yMin} fill="none" stroke="#000000" strokeWidth="1.5" />

        {/* X Ticks (Bottom - Outward, Top - Inward) */}
        {xMajorTicks.map(val => {
          const x = toX(val);
          return (
            <g key={`xtick-maj-${val}`}>
              <line x1={x} y1={yMax} x2={x} y2={yMax + 8} stroke="#000000" strokeWidth="1.2" />
              <line x1={x} y1={yMin} x2={x} y2={yMin + 8} stroke="#000000" strokeWidth="1.2" />
              <text x={x} y={yMax + 20} fontSize="11" textAnchor="middle" fill="#000000" fontFamily="sans-serif">
                {formatXLabel ? formatXLabel(val) : val}
              </text>
            </g>
          );
        })}
        {xMinorTicks.map(val => {
          const x = toX(val);
          return (
            <g key={`xtick-min-${val}`}>
              <line x1={x} y1={yMax} x2={x} y2={yMax + 4} stroke="#000000" strokeWidth="0.8" />
              <line x1={x} y1={yMin} x2={x} y2={yMin + 4} stroke="#000000" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* Y Ticks (Left - Outward, Right - Inward) */}
        {yMajorTicks.map(val => {
          const y = toY(val);
          return (
            <g key={`ytick-maj-${val}`}>
              <line x1={xMin} y1={y} x2={xMin - 8} y2={y} stroke="#000000" strokeWidth="1.2" />
              <line x1={xMax} y1={y} x2={xMax - 8} y2={y} stroke="#000000" strokeWidth="1.2" />
              <text x={xMin - 12} y={y + 4} fontSize="11" textAnchor="end" fill="#000000" fontFamily="sans-serif">
                {val}
              </text>
            </g>
          );
        })}
        {yMinorTicks.map(val => {
          const y = toY(val);
          return (
            <g key={`ytick-min-${val}`}>
              <line x1={xMin} y1={y} x2={xMin - 4} y2={y} stroke="#000000" strokeWidth="0.8" />
              <line x1={xMax} y1={y} x2={xMax - 4} y2={y} stroke="#000000" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* Axes Titles */}
        <text x={(xMin + xMax) / 2} y={yMax + 40} fontSize="12" fontWeight="bold" textAnchor="middle" fill="#000000" fontFamily="sans-serif">
          {xLabel}
        </text>
        <text x="18" y={(yMin + yMax) / 2} fontSize="12" fontWeight="bold" textAnchor="middle" fill="#000000" fontFamily="sans-serif" transform={`rotate(-90, 18, ${(yMin + yMax) / 2})`}>
          {yLabel}
        </text>
      </g>
    );
  };

  // Loading indicator for tables
  if (!wflTable || !wfhTable || !lhfaTable || !hcfaTable) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
        <Sparkles className="h-7 w-7 animate-spin text-blue-500 mb-2.5" />
        <span className="text-sm font-semibold">Cargando estándares OMS y tablas LMS...</span>
      </div>
    );
  }

  // ----------------------------------------------------
  // CHART 1: PESO PARA LA TALLA (Weight-for-Height/Length)
  // ----------------------------------------------------
  const minH_pt = isUnder2 ? 45 : 65;
  const maxH_pt = isUnder2 ? 110 : 120;
  const minW_pt = isUnder2 ? 2 : 5;
  const maxW_pt = isUnder2 ? 24 : 30;
  const activeTable = isUnder2 ? wflTable : wfhTable;

  const toX_pt = (h: number) => xMin + ((h - minH_pt) / (maxH_pt - minH_pt)) * 525;
  const toY_pt = (w: number) => yMax - ((w - minW_pt) / (maxW_pt - minW_pt)) * 410;

  // Curves generator
  const getCurvePathWeightForHeight = (z: number) => {
    const points: string[] = [];
    const step = (maxH_pt - minH_pt) / 30;
    for (let i = 0; i <= 30; i++) {
      const h = minH_pt + i * step;
      const lms = lookupLms(activeTable, h);
      if (lms) {
        const val = getValueForZ(lms, z);
        points.push(`${toX_pt(h)} ${toY_pt(val)}`);
      }
    }
    return `M ${points.join(' L ')}`;
  };

  const getLabelYWeightForHeight = (z: number) => {
    const lms = lookupLms(activeTable, maxH_pt);
    if (lms) {
      const val = getValueForZ(lms, z);
      return toY_pt(val);
    }
    return 250;
  };

  const renderWeightForHeightSVG = () => {
    // Generate Ticks
    const xMajor_pt = isUnder2 ? [45, 50, 60, 70, 80, 90, 100, 110] : [65, 70, 80, 90, 100, 110, 120];
    const xMinor_pt: number[] = [];
    for (let h = minH_pt; h <= maxH_pt; h++) {
      if (!xMajor_pt.includes(h)) xMinor_pt.push(h);
    }

    const yMajor_pt = isUnder2 ? [2, 5, 10, 15, 20, 24] : [5, 10, 15, 20, 25, 30];
    const yMinor_pt: number[] = [];
    const yStep = 0.5;
    for (let w = minW_pt; w <= maxW_pt; w += yStep) {
      if (!yMajor_pt.includes(w)) yMinor_pt.push(w);
    }

    const curvesDef = [
      { z: 3, label: '+3DE', color: '#4b5563', width: '1.5' },
      { z: 2, label: '+2DE', color: '#ef4444', width: '1.5' },
      { z: 1, label: '+1DE', color: '#d97706', width: '1.2' },
      { z: 0, label: 'Mediana', color: '#16a34a', width: '2.5' },
      { z: -1, label: '-1DE', color: '#d97706', width: '1.2' },
      { z: -2, label: '-2DE', color: '#ef4444', width: '1.5' },
      { z: -3, label: '-3DE', color: '#4b5563', width: '1.5' }
    ];

    const clipId = `wfh-clip-${isUnder2 ? 'under2' : 'over2'}`;

    return (
      <svg viewBox="0 0 650 520" className="w-full h-auto">
        <defs>
          <clipPath id={clipId}>
            <rect x={xMin} y={yMin} width={xMax - xMin} height={yMax - yMin} />
          </clipPath>
        </defs>

        {/* Background, border, grid and ticks */}
        {renderAxesAndTicks(
          xMajor_pt,
          xMinor_pt,
          yMajor_pt,
          yMinor_pt,
          'Longitud / Talla (cm)',
          'Peso (kg)',
          toX_pt,
          toY_pt
        )}

        {/* Clipped Group for Curves and Crosshair Lines */}
        <g clipPath={`url(#${clipId})`}>
          {curvesDef.map(curve => (
            <path
              key={`wfh-path-${curve.z}`}
              d={getCurvePathWeightForHeight(curve.z)}
              fill="none"
              stroke={curve.color}
              strokeWidth={curve.width}
            />
          ))}

          {/* Red dotted crosshairs */}
          {evaluation.peso > 0 && evaluation.talla > 0 && (
            <g>
              <line x1={toX_pt(pTalla)} y1={yMin} x2={toX_pt(pTalla)} y2={yMax} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={xMin} y1={toY_pt(evaluation.peso)} x2={xMax} y2={toY_pt(evaluation.peso)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
            </g>
          )}
        </g>

        {/* Curve Labels (drawn outside clip so they are visible) */}
        {curvesDef.map(curve => {
          const yLabel = getLabelYWeightForHeight(curve.z);
          // Only show label if it's within the plot height limits
          if (yLabel >= yMin && yLabel <= yMax) {
            return (
              <text
                key={`wfh-lbl-${curve.z}`}
                x={xMax + 8}
                y={yLabel + 4}
                fontSize="10.5"
                fontWeight="bold"
                fill={curve.color}
                textAnchor="start"
                fontFamily="sans-serif"
              >
                {curve.label}
              </text>
            );
          }
          return null;
        })}

        {/* Plotted Patient Point & Tooltip (drawn outside clip so they display correctly) */}
        {evaluation.peso > 0 && evaluation.talla > 0 && (
          <g>
            {/* Target crosshair pointer */}
            <circle cx={toX_pt(pTalla)} cy={toY_pt(evaluation.peso)} r="6" fill="none" stroke="#4f46e5" strokeWidth="2" />
            <line x1={toX_pt(pTalla)} y1={toY_pt(evaluation.peso) - 6} x2={toX_pt(pTalla)} y2={toY_pt(evaluation.peso) + 6} stroke="#4f46e5" strokeWidth="1.5" />
            <line x1={toX_pt(pTalla) - 6} y1={toY_pt(evaluation.peso)} x2={toX_pt(pTalla) + 6} y2={toY_pt(evaluation.peso)} stroke="#4f46e5" strokeWidth="1.5" />

            {/* Legend Tooltip Box */}
            <rect x={xMin + 20} y={yMin + 20} width="220" height="42" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <line x1={xMin + 30} y1={yMin + 41} x2={xMin + 50} y2={yMin + 41} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x={xMin + 57} y={yMin + 44} fontSize="10.5" fontWeight="bold" fill="#000000" fontFamily="sans-serif">
              {`${isUnder2 ? 'Longitud' : 'Talla'}: ${evaluation.talla.toFixed(1)} cm, z: ${evaluation.pesoTallaZ?.toFixed(2).replace('.', ',')}`}
            </text>
          </g>
        )}
      </svg>
    );
  };

  const renderWeightForHeightChart = () => {
    return (
      <div 
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
  // CHART 2: TALLA PARA LA EDAD (Height-for-Age)
  // ----------------------------------------------------
  const minA_te = 0;
  const maxA_te = 60;
  const minH_te = 40;
  const maxH_te = 125;

  const toX_te = (a: number) => xMin + (a / 60) * 525;
  const toY_te = (h: number) => yMax - ((h - 40) / 85) * 410;

  // Curves generator with discontinuity at 24 months (recumbent vs standing)
  const getCurvePathHeightForAge = (z: number) => {
    const points1: string[] = [];
    // Section 1: 0 to 24 months (Length)
    for (let m = 0; m <= 24; m++) {
      const days = m === 24 ? 730 : m * 30.4375;
      const lms = lookupLms(lhfaTable, days);
      if (lms) {
        const val = getValueForZ(lms, z);
        points1.push(`${toX_te(m)} ${toY_te(val)}`);
      }
    }

    const points2: string[] = [];
    // Section 2: 24 to 60 months (Height)
    for (let m = 24; m <= 60; m++) {
      const days = m === 24 ? 731 : m * 30.4375;
      const lms = lookupLms(lhfaTable, days);
      if (lms) {
        const val = getValueForZ(lms, z);
        points2.push(`${toX_te(m)} ${toY_te(val)}`);
      }
    }

    const path1 = `M ${points1.join(' L ')}`;
    const path2 = `M ${points2.join(' L ')}`;
    return `${path1} ${path2}`;
  };

  const getLabelYHeightForAge = (z: number) => {
    const lms = lookupLms(lhfaTable, 60 * 30.4375);
    if (lms) {
      const val = getValueForZ(lms, z);
      return toY_te(val);
    }
    return 250;
  };

  const renderHeightForAgeSVG = () => {
    const xMajor_te = [0, 12, 24, 36, 48, 60];
    const xMinor_te: number[] = [];
    for (let m = 0; m <= 60; m++) {
      if (!xMajor_te.includes(m)) xMinor_te.push(m);
    }

    const yMajor_te = [40, 50, 60, 70, 80, 90, 100, 110, 120, 125];
    const yMinor_te: number[] = [];
    for (let h = 40; h <= 125; h++) {
      if (!yMajor_te.includes(h)) yMinor_te.push(h);
    }

    const curvesDef = [
      { z: 3, label: '+3DE', color: '#4b5563', width: '1.5' },
      { z: 2, label: '+2DE', color: '#ef4444', width: '1.5' },
      { z: 0, label: 'Mediana', color: '#16a34a', width: '2.5' },
      { z: -2, label: '-2DE', color: '#ef4444', width: '1.5' },
      { z: -3, label: '-3DE', color: '#4b5563', width: '1.5' }
    ];

    return (
      <svg viewBox="0 0 650 520" className="w-full h-auto">
        {/* Axes borders, ticks */}
        {renderAxesAndTicks(
          xMajor_te,
          xMinor_te,
          yMajor_te,
          yMinor_te,
          'Edad (meses)',
          'Longitud / Talla (cm)',
          toX_te,
          toY_te
        )}

        {/* 24-month vertical gray line (Longitud vs Talla transition) */}
        <line x1={toX_te(24)} y1={yMin} x2={toX_te(24)} y2={yMax} stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" />

        {/* Watermarks LONGITUD / TALLA */}
        <text x={toX_te(12)} y={yMax - 30} fontSize="17" fontWeight="bold" fill="#cbd5e1" textAnchor="middle" letterSpacing="2" opacity="0.75" fontFamily="sans-serif">
          LONGITUD
        </text>
        <text x={toX_te(42)} y={yMax - 30} fontSize="17" fontWeight="bold" fill="#cbd5e1" textAnchor="middle" letterSpacing="2" opacity="0.75" fontFamily="sans-serif">
          TALLA
        </text>

        {/* Standard WHO Curves */}
        {curvesDef.map(curve => (
          <g key={`hfa-curve-${curve.z}`}>
            <path
              d={getCurvePathHeightForAge(curve.z)}
              fill="none"
              stroke={curve.color}
              strokeWidth={curve.width}
            />
            {/* End label */}
            <text
              x={xMax + 8}
              y={getLabelYHeightForAge(curve.z) + 4}
              fontSize="10.5"
              fontWeight="bold"
              fill={curve.color}
              textAnchor="start"
              fontFamily="sans-serif"
            >
              {curve.label}
            </text>
          </g>
        ))}

        {/* Plotted Patient Point */}
        {evaluation.talla > 0 && (
          <g>
            {/* Red dotted crosshairs */}
            <line x1={toX_te(totalMonths)} y1={yMin} x2={toX_te(totalMonths)} y2={yMax} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={xMin} y1={toY_te(pTalla)} x2={xMax} y2={toY_te(pTalla)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />

            {/* Target crosshair pointer */}
            <circle cx={toX_te(totalMonths)} cy={toY_te(pTalla)} r="6" fill="none" stroke="#4f46e5" strokeWidth="2" />
            <line x1={toX_te(totalMonths)} y1={toY_te(pTalla) - 6} x2={toX_te(totalMonths)} y2={toY_te(pTalla) + 6} stroke="#4f46e5" strokeWidth="1.5" />
            <line x1={toX_te(totalMonths) - 6} y1={toY_te(pTalla)} x2={toX_te(totalMonths) + 6} y2={toY_te(pTalla)} stroke="#4f46e5" strokeWidth="1.5" />

            {/* Legend Tooltip Box */}
            <rect x={xMin + 20} y={yMin + 20} width="225" height="42" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <line x1={xMin + 30} y1={yMin + 41} x2={xMin + 50} y2={yMin + 41} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x={xMin + 57} y={yMin + 44} fontSize="10.5" fontWeight="bold" fill="#000000" fontFamily="sans-serif">
              {`Edad: ${age.years}a ${age.months}m (${Math.round(totalMonths)}m), z: ${evaluation.tallaEdadZ?.toFixed(2).replace('.', ',')}`}
            </text>
          </g>
        )}
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
            Talla para la Edad ({patient.genero === 'niño' ? 'Niños' : 'Niñas'} 0 a 5 años)
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
  // CHART 3: PERÍMETRO CEFÁLICO (Head Circumference-for-Age)
  // ----------------------------------------------------
  const minA_pc = 0;
  const maxA_pc = 60;
  const minC_pc = 30;
  const maxC_pc = 56;

  const toX_pc = (a: number) => xMin + (a / 60) * 525;
  const toY_pc = (c: number) => yMax - ((c - 30) / 26) * 410;

  // Curves generator
  const getCurvePathHeadCircumference = (z: number) => {
    const points: string[] = [];
    const step = 60 / 30;
    for (let m = 0; m <= 30; m++) {
      const currentMonth = m * step;
      const days = currentMonth * 30.4375;
      const lms = lookupLms(hcfaTable, days);
      if (lms) {
        const val = getValueForZ(lms, z);
        points.push(`${toX_pc(currentMonth)} ${toY_pc(val)}`);
      }
    }
    return `M ${points.join(' L ')}`;
  };

  const getLabelYHeadCircumference = (z: number) => {
    const lms = lookupLms(hcfaTable, 60 * 30.4375);
    if (lms) {
      const val = getValueForZ(lms, z);
      return toY_pc(val);
    }
    return 250;
  };

  const renderHeadCircumferenceSVG = () => {
    const xMajor_pc = [0, 12, 24, 36, 48, 60];
    const xMinor_pc: number[] = [];
    for (let m = 0; m <= 60; m++) {
      if (!xMajor_pc.includes(m)) xMinor_pc.push(m);
    }

    const yMajor_pc = [30, 35, 40, 45, 50, 55, 56];
    const yMinor_pc: number[] = [];
    for (let c = 30; c <= 56; c++) {
      if (!yMajor_pc.includes(c)) yMinor_pc.push(c);
    }

    const curvesDef = [
      { z: 3, label: '+3DE', color: '#4b5563', width: '1.5' },
      { z: 2, label: '+2DE', color: '#ef4444', width: '1.5' },
      { z: 1, label: '+1DE', color: '#d97706', width: '1.2' },
      { z: 0, label: 'Mediana', color: '#16a34a', width: '2.5' },
      { z: -1, label: '-1DE', color: '#d97706', width: '1.2' },
      { z: -2, label: '-2DE', color: '#ef4444', width: '1.5' },
      { z: -3, label: '-3DE', color: '#4b5563', width: '1.5' }
    ];

    return (
      <svg viewBox="0 0 650 520" className="w-full h-auto">
        {/* Background frame border, ticks */}
        {renderAxesAndTicks(
          xMajor_pc,
          xMinor_pc,
          yMajor_pc,
          yMinor_pc,
          'Edad (meses)',
          'Perímetro Cefálico (cm)',
          toX_pc,
          toY_pc
        )}

        {/* WHO Curves */}
        {curvesDef.map(curve => (
          <g key={`hcfa-curve-${curve.z}`}>
            <path
              d={getCurvePathHeadCircumference(curve.z)}
              fill="none"
              stroke={curve.color}
              strokeWidth={curve.width}
            />
            {/* End label */}
            <text
              x={xMax + 8}
              y={getLabelYHeadCircumference(curve.z) + 4}
              fontSize="10.5"
              fontWeight="bold"
              fill={curve.color}
              textAnchor="start"
              fontFamily="sans-serif"
            >
              {curve.label}
            </text>
          </g>
        ))}

        {/* Patient Plot */}
        {evaluation.perimetroCefalico > 0 && (
          <g>
            {/* Red dotted crosshairs */}
            <line x1={toX_pc(totalMonths)} y1={yMin} x2={toX_pc(totalMonths)} y2={yMax} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={xMin} y1={toY_pc(evaluation.perimetroCefalico)} x2={xMax} y2={toY_pc(evaluation.perimetroCefalico)} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />

            {/* Target crosshair pointer */}
            <circle cx={toX_pc(totalMonths)} cy={toY_pc(evaluation.perimetroCefalico)} r="6" fill="none" stroke="#4f46e5" strokeWidth="2" />
            <line x1={toX_pc(totalMonths)} y1={toY_pc(evaluation.perimetroCefalico) - 6} x2={toX_pc(totalMonths)} y2={toY_pc(evaluation.perimetroCefalico) + 6} stroke="#4f46e5" strokeWidth="1.5" />
            <line x1={toX_pc(totalMonths) - 6} y1={toY_pc(evaluation.perimetroCefalico)} x2={toX_pc(totalMonths) + 6} y2={toY_pc(evaluation.perimetroCefalico)} stroke="#4f46e5" strokeWidth="1.5" />

            {/* Legend Tooltip Box */}
            <rect x={xMin + 20} y={yMin + 20} width="225" height="42" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <line x1={xMin + 30} y1={yMin + 41} x2={xMin + 50} y2={yMin + 41} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x={xMin + 57} y={yMin + 44} fontSize="10.5" fontWeight="bold" fill="#000000" fontFamily="sans-serif">
              {`Edad: ${age.years}a ${age.months}m (${Math.round(totalMonths)}m), z: ${evaluation.perimetroCefalicoZ?.toFixed(2).replace('.', ',')}`}
            </text>
          </g>
        )}
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

      let median = evaluation.pesoIdealCalculado || 0;
      let valMin2SD = median - 2 * (median * (isUnder2 ? 0.11 : 0.12));
      let valPlus2SD = median + 2 * (median * (isUnder2 ? 0.11 : 0.12));

      const lms = lookupLms(activeTable, pTalla);
      if (lms) {
        median = lms.M;
        const lmsToValue = (z: number) => {
          if (lms.L === 0) {
            return lms.M * Math.exp(lms.S * z);
          }
          const val = 1 + lms.L * lms.S * z;
          if (val <= 0) return 0.1;
          return lms.M * Math.pow(val, 1 / lms.L);
        };
        valMin2SD = lmsToValue(-2);
        valPlus2SD = lmsToValue(2);
      }
      
      rangeText = `entre ${valMin2SD.toFixed(1)} kg y ${valPlus2SD.toFixed(1)} kg`;
      medianText = `${median.toFixed(1)} kg`;
      diffText = `${evaluation.peso >= median ? '+' : ''}${(evaluation.peso - median).toFixed(1)} kg`;
      clinicalAdvice = getClinicalInterpretation('pesoTalla', classification, zScore);
    } else if (activeModalChart === 'tallaEdad') {
      title = `Talla para la Edad (${isMale ? 'Niños' : 'Niñas'} 0 a 5 años)`;
      groupNum = chartGroup.te;
      classification = evaluation.tallaEdadClass || '';
      zScore = evaluation.tallaEdadZ || 0;
      svgRenderer = renderHeightForAgeSVG;

      // Lookup LMS values at patient age in days
      const days = totalMonths * 30.4375;
      const lms = lookupLms(lhfaTable, days);
      let valMin2SD = 0;
      let valMedian = 0;
      let valPlus2SD = 0;

      if (lms) {
        valMedian = lms.M;
        valMin2SD = getValueForZ(lms, -2);
        valPlus2SD = getValueForZ(lms, 2);
      }

      rangeText = `entre ${valMin2SD.toFixed(1)} cm y ${valPlus2SD.toFixed(1)} cm`;
      medianText = `${valMedian.toFixed(1)} cm`;
      diffText = `${pTalla >= valMedian ? '+' : ''}${(pTalla - valMedian).toFixed(1)} cm`;
      clinicalAdvice = getClinicalInterpretation('tallaEdad', classification, zScore);
    } else if (activeModalChart === 'perimetroCefalico') {
      title = `Perímetro Cefálico (${isMale ? 'Niños' : 'Niñas'} 0 a 5 años)`;
      groupNum = chartGroup.pc;
      classification = evaluation.perimetroCefalicoClass || '';
      zScore = evaluation.perimetroCefalicoZ || 0;
      svgRenderer = renderHeadCircumferenceSVG;

      const days = totalMonths * 30.4375;
      const lms = lookupLms(hcfaTable, days);
      let valMin2SD = 0;
      let valMedian = 0;
      let valPlus2SD = 0;

      if (lms) {
        valMedian = lms.M;
        valMin2SD = getValueForZ(lms, -2);
        valPlus2SD = getValueForZ(lms, 2);
      }

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
