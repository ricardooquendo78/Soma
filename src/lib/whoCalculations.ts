import { ChronologicalAge, Evaluation } from '../types';
import { calculateZScore, loadTable, lookupLms } from '@pedi-growth/core';

// Calculates the exact chronological age in years, months, and days
export function calculateChronologicalAge(birthdateStr: string, targetDateStr?: string): ChronologicalAge {
  const [bYear, bMonth, bDay] = birthdateStr.split('-').map(Number);
  const birthDate = new Date(bYear, bMonth - 1, bDay);

  let targetDate: Date;
  if (targetDateStr) {
    if (targetDateStr.includes('T')) {
      targetDate = new Date(targetDateStr);
    } else {
      const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
      targetDate = new Date(tYear, tMonth - 1, tDay);
    }
  } else {
    targetDate = new Date();
  }

  let years = targetDate.getFullYear() - birthDate.getFullYear();
  let months = targetDate.getMonth() - birthDate.getMonth();
  let days = targetDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    // Get days in the previous month of the target date
    const prevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days)
  };
}

export function ageToTotalMonths(age: ChronologicalAge): number {
  return age.years * 12 + age.months + age.days / 30.4375;
}

// User-provided tables for "Peso ideal para la talla" (Median Weight-for-Height)
// Table 1: Peso para la talla niñas 0 a 2 años
const idealWeightGirls0_2: Record<string, number> = {
  "45.0": 2.5, "45.5": 2.5, "46.0": 2.6, "46.5": 2.7, "47.0": 2.8, "47.5": 2.9,
  "48.0": 3.0, "48.5": 3.1, "49.0": 3.2, "49.5": 3.3, "50.0": 3.4, "50.5": 3.5,
  "51.0": 3.6, "51.5": 3.7, "52.0": 3.8, "52.5": 3.9, "53.0": 4.0, "53.5": 4.2,
  "54.0": 4.3, "54.5": 4.4, "55.0": 4.5, "55.5": 4.7, "56.0": 4.8, "56.5": 5.0,
  "57.0": 5.1, "57.5": 5.2, "58.0": 5.4, "58.5": 5.5, "59.0": 5.6, "59.5": 5.7,
  "60.0": 5.9, "60.5": 6.0, "61.0": 6.1, "61.5": 6.3, "62.0": 6.4, "62.5": 6.5,
  "63.0": 6.6, "63.5": 6.7, "64.0": 6.9, "64.5": 7.0, "65.0": 7.1, "65.5": 7.2,
  "66.0": 7.3, "66.5": 7.4, "67.0": 7.5, "67.5": 7.6, "68.0": 7.7, "68.5": 7.9,
  "69.0": 8.0, "69.5": 8.1, "70.0": 8.2, "70.5": 8.3, "71.0": 8.4, "71.5": 8.5,
  "72.0": 8.6, "72.5": 8.7, "73.0": 8.8, "73.5": 8.9, "74.0": 9.0, "74.5": 9.1,
  "75.0": 9.1, "75.5": 9.2, "76.0": 9.3, "76.5": 9.4, "77.0": 9.5, "77.5": 9.6,
  "78.0": 9.7, "78.5": 9.8, "79.0": 9.9, "79.5": 10.0, "80.0": 10.1, "80.5": 10.2,
  "81.0": 10.3, "81.5": 10.4, "82.0": 10.5, "82.5": 10.6, "83.0": 10.7, "83.5": 10.9,
  "84.0": 11.0, "84.5": 11.1, "85.0": 11.2, "85.5": 11.3, "86.0": 11.5, "86.5": 11.6,
  "87.0": 11.7, "87.5": 11.8, "88.0": 12.0, "88.5": 12.1, "89.0": 12.2, "89.5": 12.3,
  "90.0": 12.5, "90.5": 12.6, "91.0": 12.7, "91.5": 12.8, "92.0": 13.0, "92.5": 13.1,
  "93.0": 13.2, "93.5": 13.3, "94.0": 13.5, "94.5": 13.6, "95.0": 13.7, "95.5": 13.8,
  "96.0": 14.0, "96.5": 14.1, "97.0": 14.2, "97.5": 14.4, "98.0": 14.5, "98.5": 14.6,
  "99.0": 14.8, "99.5": 14.9, "100.0": 15.0, "100.5": 15.2, "101.0": 15.3, "101.5": 15.5,
  "102.0": 15.6, "102.5": 15.8, "103.0": 15.9, "103.5": 16.1, "104.0": 16.2, "104.5": 16.4,
  "105.0": 16.5, "105.5": 16.7, "106.0": 16.9, "106.5": 17.1, "107.0": 17.2, "107.5": 17.4,
  "108.0": 17.6, "108.5": 17.8, "109.0": 18.0, "109.5": 18.1, "110.0": 18.3
};

// Table 2: Peso para la talla niñas 2 a 5 años
const idealWeightGirls2_5: Record<string, number> = {
  "65.0": 7.2, "65.5": 7.4, "66.0": 7.5, "66.5": 7.6, "67.0": 7.7, "67.5": 7.8,
  "68.0": 7.9, "68.5": 8.0, "69.0": 8.1, "69.5": 8.2, "70.0": 8.3, "70.5": 8.4,
  "71.0": 8.5, "71.5": 8.6, "72.0": 8.7, "72.5": 8.8, "73.0": 8.9, "73.5": 9.0,
  "74.0": 9.1, "74.5": 9.2, "75.0": 9.3, "75.5": 9.4, "76.0": 9.5, "76.5": 9.6,
  "77.0": 9.6, "77.5": 9.7, "78.0": 9.8, "78.5": 9.9, "79.0": 10.0, "79.5": 10.1,
  "80.0": 10.2, "80.5": 10.3, "81.0": 10.4, "81.5": 10.6, "82.0": 10.7, "82.5": 10.8,
  "83.0": 10.9, "83.5": 11.0, "84.0": 11.1, "84.5": 11.3, "85.0": 11.4, "85.5": 11.5,
  "86.0": 11.6, "86.5": 11.8, "87.0": 11.9, "87.5": 12.0, "88.0": 12.1, "88.5": 12.3,
  "89.0": 12.4, "89.5": 12.5, "90.0": 12.6, "90.5": 12.8, "91.0": 12.9, "91.5": 13.0,
  "92.0": 13.1, "92.5": 13.3, "93.0": 13.4, "93.5": 13.5, "94.0": 13.6, "94.5": 13.8,
  "95.0": 13.9, "95.5": 14.0, "96.0": 14.1, "96.5": 14.3, "97.0": 14.4, "97.5": 14.5,
  "98.0": 14.7, "98.5": 14.8, "99.0": 14.9, "99.5": 15.1, "100.0": 15.2, "100.5": 15.4,
  "101.0": 15.5, "101.5": 15.7, "102.0": 15.8, "102.5": 16.0, "103.0": 16.1, "103.5": 16.3,
  "104.0": 16.4, "104.5": 16.6, "105.0": 16.8, "105.5": 16.9, "106.0": 17.1, "106.5": 17.3,
  "107.0": 17.5, "107.5": 17.7, "108.0": 17.8, "108.5": 18.0, "109.0": 18.2, "109.5": 18.4,
  "110.0": 18.6, "110.5": 18.8, "111.0": 19.0, "111.5": 19.2, "112.0": 19.4, "112.5": 19.6,
  "113.0": 19.8, "113.5": 20.0, "114.0": 20.2, "114.5": 20.5, "115.0": 20.7, "115.5": 20.9,
  "116.0": 21.1, "116.5": 21.3, "117.0": 21.5, "117.5": 21.7, "118.0": 22.0, "118.5": 22.2,
  "119.0": 22.4, "119.5": 22.6, "120.0": 22.8
};

// Table 3: Peso para la talla niños 0 a 2 años
const idealWeightBoys0_2: Record<string, number> = {
  "45.0": 2.4, "45.5": 2.5, "46.0": 2.6, "46.5": 2.7, "47.0": 2.8, "47.5": 2.9,
  "48.0": 2.9, "48.5": 3.0, "49.0": 3.1, "49.5": 3.2, "50.0": 3.3, "50.5": 3.4,
  "51.0": 3.5, "51.5": 3.6, "52.0": 3.8, "52.5": 3.9, "53.0": 4.0, "53.5": 4.1,
  "54.0": 4.3, "54.5": 4.4, "55.0": 4.5, "55.5": 4.7, "56.0": 4.8, "56.5": 5.0,
  "57.0": 5.1, "57.5": 5.3, "58.0": 5.4, "58.5": 5.6, "59.0": 5.7, "59.5": 5.9,
  "60.0": 6.0, "60.5": 6.1, "61.0": 6.3, "61.5": 6.4, "62.0": 6.5, "62.5": 6.7,
  "63.0": 6.8, "63.5": 6.9, "64.0": 7.0, "64.5": 7.1, "65.0": 7.3, "65.5": 7.4,
  "66.0": 7.5, "66.5": 7.6, "67.0": 7.7, "67.5": 7.9, "68.0": 8.0, "68.5": 8.1,
  "69.0": 8.2, "69.5": 8.3, "70.0": 8.4, "70.5": 8.5, "71.0": 8.6, "71.5": 8.8,
  "72.0": 8.9, "72.5": 9.0, "73.0": 9.1, "73.5": 9.2, "74.0": 9.3, "74.5": 9.4,
  "75.0": 9.5, "75.5": 9.6, "76.0": 9.7, "76.5": 9.8, "77.0": 9.9, "77.5": 10.0,
  "78.0": 10.1, "78.5": 10.2, "79.0": 10.3, "79.5": 10.4, "80.0": 10.4, "80.5": 10.5,
  "81.0": 10.6, "81.5": 10.7, "82.0": 10.8, "82.5": 10.9, "83.0": 11.0, "83.5": 11.2,
  "84.0": 11.3, "84.5": 11.4, "85.0": 11.5, "85.5": 11.6, "86.0": 11.7, "86.5": 11.9,
  "87.0": 12.0, "87.5": 12.1, "88.0": 12.2, "88.5": 12.4, "89.0": 12.5, "89.5": 12.6,
  "90.0": 12.7, "90.5": 12.8, "91.0": 13.0, "91.5": 13.1, "92.0": 13.2, "92.5": 13.3,
  "93.0": 13.4, "93.5": 13.5, "94.0": 13.7, "94.5": 13.8, "95.0": 13.9, "95.5": 14.0,
  "96.0": 14.1, "96.5": 14.3, "97.0": 14.4, "97.5": 14.5, "98.0": 14.6, "98.5": 14.8,
  "99.0": 14.9, "99.5": 15.0, "100.0": 15.2, "100.5": 15.3, "101.0": 15.4, "101.5": 15.6,
  "102.0": 15.7, "102.5": 15.9, "103.0": 16.0, "103.5": 16.2, "104.0": 16.3, "104.5": 16.5,
  "105.0": 16.6, "105.5": 16.8, "106.0": 16.9, "106.5": 17.1, "107.0": 17.3, "107.5": 17.4,
  "108.0": 17.6, "108.5": 17.8, "109.0": 17.9, "109.5": 18.1, "110.0": 18.3
};

// Table 4: Peso para la talla niños 2 a 5 años
const idealWeightBoys2_5: Record<string, number> = {
  "65.0": 7.4, "65.5": 7.6, "66.0": 7.7, "66.5": 7.8, "67.0": 7.9, "67.5": 8.0,
  "68.0": 8.1, "68.5": 8.2, "69.0": 8.4, "69.5": 8.5, "70.0": 8.6, "70.5": 8.7,
  "71.0": 8.8, "71.5": 8.9, "72.0": 9.0, "72.5": 9.1, "73.0": 9.2, "73.5": 9.3,
  "74.0": 9.4, "74.5": 9.5, "75.0": 9.6, "75.5": 9.7, "76.0": 9.8, "76.5": 9.9,
  "77.0": 10.0, "77.5": 10.1, "78.0": 10.2, "78.5": 10.3, "79.0": 10.4, "79.5": 10.5,
  "80.0": 10.6, "80.5": 10.7, "81.0": 10.8, "81.5": 10.9, "82.0": 11.0, "82.5": 11.1,
  "83.0": 11.2, "83.5": 11.3, "84.0": 11.4, "84.5": 11.5, "85.0": 11.7, "85.5": 11.8,
  "86.0": 11.9, "86.5": 12.0, "87.0": 12.2, "87.5": 12.3, "88.0": 12.4, "88.5": 12.5,
  "89.0": 12.6, "89.5": 12.8, "90.0": 12.9, "90.5": 13.0, "91.0": 13.1, "91.5": 13.2,
  "92.0": 13.4, "92.5": 13.5, "93.0": 13.6, "93.5": 13.7, "94.0": 13.8, "94.5": 13.9,
  "95.0": 14.1, "95.5": 14.2, "96.0": 14.3, "96.5": 14.4, "97.0": 14.6, "97.5": 14.7,
  "98.0": 14.8, "98.5": 14.9, "99.0": 15.1, "99.5": 15.2, "100.0": 15.4, "100.5": 15.5,
  "101.0": 15.6, "101.5": 15.8, "102.0": 15.9, "102.5": 16.1, "103.0": 16.2, "103.5": 16.4,
  "104.0": 16.5, "104.5": 16.7, "105.0": 16.8, "105.5": 17.0, "106.0": 17.2, "106.5": 17.3,
  "107.0": 17.5, "107.5": 17.7, "108.0": 17.8, "108.5": 18.0, "109.0": 18.2, "109.5": 18.3,
  "110.0": 18.5, "110.5": 18.7, "111.0": 18.9, "111.5": 19.1, "112.0": 19.2, "112.5": 19.4,
  "113.0": 19.6, "113.5": 19.8, "114.0": 20.0, "114.5": 20.2, "115.0": 20.4, "115.5": 20.6,
  "116.0": 20.8, "116.5": 21.0, "117.0": 21.2, "117.5": 21.4, "118.0": 21.6, "118.5": 21.8,
  "119.0": 22.0, "119.5": 22.2, "120.0": 22.4
};

// Utility to round height/talla to the nearest 0.5 for lookups
export function roundToNearestHalf(val: number): number {
  return Math.round(val * 2) / 2;
}

// Retrieves the WHO Ideal Weight for Talla based on gender and age
export function getIdealWeight(genero: 'niño' | 'niña', ageMonths: number, talla: number): number {
  const roundedTalla = roundToNearestHalf(talla);
  const tallaStr = roundedTalla.toFixed(1);

  if (genero === 'niña') {
    if (ageMonths < 24) {
      return idealWeightGirls0_2[tallaStr] || idealWeightGirls0_2["75.0"] || 9.1;
    } else {
      return idealWeightGirls2_5[tallaStr] || idealWeightGirls2_5["95.0"] || 13.9;
    }
  } else {
    if (ageMonths < 24) {
      return idealWeightBoys0_2[tallaStr] || idealWeightBoys0_2["75.0"] || 9.5;
    } else {
      return idealWeightBoys2_5[tallaStr] || idealWeightBoys2_5["95.0"] || 14.1;
    }
  }
}

// WHO standard curves data points for Talla-para-la-Edad (Height-for-Age)
// Format: monthly entries from 0 to 60. Values are [ -2SD, -1SD, Median(0SD), +1SD, +2SD ] in cm
// Extrapolated/interpolated from standard WHO charts
export const heightForAgeBoys: Record<number, number[]> = {
  0: [46.3, 48.0, 49.9, 51.8, 53.7],
  6: [64.8, 66.2, 67.6, 69.1, 70.5],
  12: [72.1, 73.9, 75.7, 77.5, 79.3],
  18: [78.6, 80.4, 82.3, 84.1, 86.0],
  24: [83.8, 85.8, 87.8, 89.8, 91.8], // 24m recostado
  25: [84.1, 86.0, 88.0, 90.0, 92.0],
  30: [87.7, 89.8, 91.9, 94.0, 96.1],
  36: [91.2, 93.6, 96.1, 98.6, 101.1],
  42: [94.5, 97.2, 99.9, 102.6, 105.3],
  48: [97.5, 100.4, 103.3, 106.2, 109.1],
  54: [100.4, 103.5, 106.7, 109.9, 113.1],
  60: [103.3, 106.6, 110.0, 113.4, 116.8]
};

export const heightForAgeGirls: Record<number, number[]> = {
  0: [45.4, 47.3, 49.1, 51.0, 52.9],
  6: [62.5, 64.1, 65.7, 67.3, 68.9],
  12: [69.7, 71.8, 74.0, 76.2, 78.4],
  18: [76.3, 78.5, 80.7, 82.9, 85.1],
  24: [81.5, 83.9, 86.4, 88.9, 91.4], // 24m recostado
  25: [81.7, 84.1, 86.6, 89.1, 91.6],
  30: [85.3, 88.0, 90.7, 93.4, 96.1],
  36: [88.7, 91.9, 95.1, 98.3, 101.5],
  42: [92.1, 95.5, 99.0, 102.5, 106.0],
  48: [95.2, 98.9, 102.7, 106.5, 110.3],
  54: [98.2, 102.2, 106.2, 110.2, 114.2],
  60: [101.1, 105.2, 109.4, 113.6, 117.8]
};

// Helper to interpolate array values for specific months
export function interpolateWHO(months: number, dataset: Record<number, number[]>): number[] {
  const keys = Object.keys(dataset).map(Number).sort((a, b) => a - b);
  
  if (months <= keys[0]) return dataset[keys[0]];
  if (months >= keys[keys.length - 1]) return dataset[keys[keys.length - 1]];

  // Find surrounding keys
  let lowerKey = keys[0];
  let upperKey = keys[keys.length - 1];

  for (let i = 0; i < keys.length - 1; i++) {
    if (months >= keys[i] && months <= keys[i + 1]) {
      lowerKey = keys[i];
      upperKey = keys[i + 1];
      break;
    }
  }

  const fraction = (months - lowerKey) / (upperKey - lowerKey);
  const lowerVals = dataset[lowerKey];
  const upperVals = dataset[upperKey];

  return lowerVals.map((val, idx) => val + fraction * (upperVals[idx] - val));
}

// WHO standard curves data points for Perimetro Cefalico para la Edad (Head Circumference-for-Age)
// Monthly entries 0 to 60. Values are [ -2SD, -1SD, Median(0SD), +1SD, +2SD ] in cm
export const headCircumferenceBoys: Record<number, number[]> = {
  0: [32.1, 33.3, 34.5, 35.7, 36.9],
  6: [41.0, 42.1, 43.3, 44.5, 45.7],
  12: [43.6, 44.8, 46.1, 47.4, 48.7],
  18: [45.1, 46.3, 47.6, 48.9, 50.2],
  24: [46.1, 47.2, 48.4, 49.6, 50.8],
  36: [47.1, 48.3, 49.5, 50.7, 51.9],
  48: [47.7, 49.0, 50.3, 51.6, 52.9],
  60: [48.2, 49.5, 50.8, 52.1, 53.4]
};

export const headCircumferenceGirls: Record<number, number[]> = {
  0: [31.5, 32.7, 33.9, 35.1, 36.3],
  6: [39.7, 40.8, 42.0, 43.2, 44.4],
  12: [42.4, 43.7, 45.0, 46.3, 47.6],
  18: [43.9, 45.1, 46.4, 47.7, 49.0],
  24: [44.8, 46.0, 47.2, 48.4, 49.6],
  36: [45.8, 47.0, 48.3, 49.6, 50.9],
  48: [46.5, 47.8, 49.1, 50.4, 51.7],
  60: [47.0, 48.3, 49.6, 50.9, 52.2]
};

// Calculates Z-score and provides classification for: Perimetro Cefalico para la Edad
export async function evaluateHeadCircumference(
  genero: 'niño' | 'niña',
  ageInDays: number,
  perimetroCefalico: number
): Promise<{ zScore: number; classification: string }> {
  const result = await calculateZScore({
    indicator: 'head-circumference-for-age',
    sex: genero === 'niño' ? 'male' : 'female',
    ageInDays,
    measurement: perimetroCefalico
  });
  
  const zScore = result ? result.zScore : 0;

  let classification = 'Normal';
  if (zScore > 2 || zScore < -2) {
    classification = 'factor de riesgo para el neurodesarrollo';
  }

  return { zScore, classification };
}

// Calculates Z-score and classification for: Talla para la Edad
export async function evaluateHeightForAge(
  genero: 'niño' | 'niña',
  ageInDays: number,
  talla: number
): Promise<{ zScore: number; classification: string }> {
  const result = await calculateZScore({
    indicator: 'length-height-for-age',
    sex: genero === 'niño' ? 'male' : 'female',
    ageInDays,
    measurement: talla
  });
  
  const zScore = result ? result.zScore : 0;

  let classification = 'talla adecuada para la edad';
  if (zScore >= -1) {
    classification = 'talla adecuada para la edad';
  } else if (zScore >= -2 && zScore < -1) {
    classification = 'riesgo de talla baja';
  } else {
    classification = 'talla baja para la edad o retraso en talla';
  }

  return { zScore, classification };
}

// Calculates Z-score and classification for: Peso para la Talla
export async function evaluateWeightForHeight(
  genero: 'niño' | 'niña',
  ageInDays: number,
  talla: number,
  peso: number
): Promise<{ zScore: number; classification: string; idealWeight: number }> {
  const sex = genero === 'niño' ? 'male' : 'female';
  const isUnder2 = ageInDays < 730.5;
  const indicator = isUnder2 ? 'weight-for-length' : 'weight-for-height';

  const result = await calculateZScore({
    indicator,
    sex,
    lengthHeight: talla,
    measurement: peso
  });
  
  const zScore = result ? result.zScore : 0;

  const tableName = isUnder2 
    ? (sex === 'male' ? 'wfl-boys' : 'wfl-girls') 
    : (sex === 'male' ? 'wfh-boys' : 'wfh-girls');
    
  let idealWeight = 0;
  try {
    const table = await loadTable(tableName);
    const lms = lookupLms(table, talla);
    if (lms) {
      idealWeight = lms.M;
    }
  } catch (err) {
    console.error('Error loading LMS table for weight ideal calculation', err);
  }

  if (idealWeight === 0) {
    idealWeight = getIdealWeight(genero, ageInDays / 30.4375, talla);
  }

  let classification = 'peso adecuado para la talla';
  if (zScore > 3) {
    classification = 'obesidad';
  } else if (zScore > 2 && zScore <= 3) {
    classification = 'sobrepeso';
  } else if (zScore > 1 && zScore <= 2) {
    classification = 'riesgo de sobrepeso';
  } else if (zScore >= -1 && zScore <= 1) {
    classification = 'peso adecuado para la talla';
  } else if (zScore >= -2 && zScore < -1) {
    classification = 'riesgo desnutrición aguda';
  } else if (zScore >= -3 && zScore < -2) {
    classification = 'desnutrición aguda moderada';
  } else {
    classification = 'desnutrición aguda severa';
  }

  return { zScore, classification, idealWeight };
}

// Calculates daily calorie requirements according to user specified formulas
export function calculateEnergyRequirements(
  genero: 'niño' | 'niña',
  pesoActual: number,
  pesoIdeal: number,
  pesoClassification: string
): { calories: number; usedWeight: number; weightType: 'actual' | 'ideal' } {
  const useIdeal = ['riesgo de sobrepeso', 'sobrepeso', 'obesidad'].includes(pesoClassification);
  const usedWeight = useIdeal ? pesoIdeal : pesoActual;
  const weightType = useIdeal ? 'ideal' : 'actual';

  let calories = 0;
  if (genero === 'niño') {
    calories = 310.2 + (63.3 * usedWeight) - (0.263 * Math.pow(usedWeight, 2));
  } else {
    calories = 263.4 + (65.3 * usedWeight) - (0.454 * Math.pow(usedWeight, 2));
  }

  return {
    calories: Math.round(calories * 10) / 10,
    usedWeight,
    weightType
  };
}

// Unified orchestrator to run full evaluations on patient measurements
export async function calculateEvaluation(
  birthdateStr: string,
  genero: 'niño' | 'niña',
  peso: number,
  talla: number,
  perimetroCefalico: number,
  perimetroBrazo: number,
  medicionTipo?: 'acostado' | 'parado',
  targetDateStr?: string
): Promise<Evaluation> {
  const age = calculateChronologicalAge(birthdateStr, targetDateStr);
  const totalMonths = ageToTotalMonths(age);
  
  const [bYear, bMonth, bDay] = birthdateStr.split('-').map(Number);
  const birthDate = new Date(bYear, bMonth - 1, bDay);

  let targetDate: Date;
  if (targetDateStr) {
    if (targetDateStr.includes('T')) {
      targetDate = new Date(targetDateStr);
    } else {
      const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
      targetDate = new Date(tYear, tMonth - 1, tDay);
    }
  } else {
    targetDate = new Date();
  }

  // Normalize target date to midnight local time
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  const msDiff = targetMidnight.getTime() - birthDate.getTime();
  const ageInDays = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));

  // Adjustment of length/height based on measurement position (acostado vs. parado) as per WHO standards
  let adjustedTalla = talla;
  if (medicionTipo === 'parado' && ageInDays < 730.5) {
    // Under 2 years measured standing -> convert to recumbent length by adding 0.7 cm
    adjustedTalla = talla + 0.7;
  } else if (medicionTipo === 'acostado' && ageInDays >= 730.5) {
    // 2 years or older measured lying down -> convert to standing height by subtracting 0.7 cm
    adjustedTalla = talla - 0.7;
  }

  const hcResult = await evaluateHeadCircumference(genero, ageInDays, perimetroCefalico);
  const hfaResult = await evaluateHeightForAge(genero, ageInDays, adjustedTalla);
  const wfhResult = await evaluateWeightForHeight(genero, ageInDays, adjustedTalla, peso);
  const energyResult = calculateEnergyRequirements(genero, peso, wfhResult.idealWeight, wfhResult.classification);

  return {
    id: `eval_calc_${Date.now()}`,
    fecha: targetDateStr || new Date().toISOString(),
    peso,
    talla,
    medicionTipo,
    tallaAjustada: adjustedTalla,
    pliegueSubescapular: 0,
    pliegueTricipital: 0,
    perimetroBrazo,
    perimetroCefalico,
    
    perimetroCefalicoZ: hcResult.zScore,
    perimetroCefalicoClass: hcResult.classification,
    pesoTallaZ: wfhResult.zScore,
    pesoTallaClass: wfhResult.classification,
    tallaEdadZ: hfaResult.zScore,
    tallaEdadClass: hfaResult.classification,
    
    caloriasRecomendadas: energyResult.calories,
    pesoUsadoParaFormula: energyResult.weightType,
    pesoIdealCalculado: wfhResult.idealWeight
  };
}



