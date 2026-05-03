import { QPF_CATEGORIES } from "@/types";
import type { QPFRow } from "./qpfParser";

export type DayVerification = {
  day: number;
  totalCases: number;
  matrix: number[][]; // 6x6
  pc: number;
  usable: number;
  hss: number;
  csiPerCategory: (number | null)[];
  farPerCategory: (number | null)[];
};

export function categorizeMM(mm: number | null): string {
  if (mm === null) return "";
  if (mm === 0) return "0";
  if (mm > 0 && mm <= 10) return "0.1-10";
  if (mm > 10 && mm <= 25) return "11-25";
  if (mm > 25 && mm <= 50) return "26-50";
  if (mm > 50 && mm <= 100) return "51-100";
  if (mm > 100) return ">100";
  return "";
}

export function addDaysToDDMon(dateStr: string, daysToAdd: number): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = dateStr.split("-");
  if (parts.length !== 2) return dateStr;
  
  const day = parseInt(parts[0], 10);
  const monthIdx = months.indexOf(parts[1]);
  if (isNaN(day) || monthIdx === -1) return dateStr;

  // Using a leap year (2024) to safely compute date arithmetic
  const date = new Date(2024, monthIdx, day);
  date.setDate(date.getDate() + daysToAdd);

  const outDay = String(date.getDate()).padStart(2, "0");
  const outMonth = months[date.getMonth()];
  return `${outDay}-${outMonth}`;
}

export function buildVerificationData(rows: QPFRow[]): DayVerification[] {
  const realisedMap = new Map<string, string>();
  
  // Map actual observed rainfall by specific date + sub-basin
  rows.forEach((r) => {
    if (r.realised !== null) {
      realisedMap.set(`${r.date}|${r.subBasin}`, categorizeMM(r.realised));
    }
  });

  const results: DayVerification[] = [];

  for (let day = 1; day <= 7; day++) {
    const pairs: { forecast: string; observed: string }[] = [];
    const dayKey = `day${day}` as keyof QPFRow;

    rows.forEach((r) => {
      const forecastRaw = r[dayKey];
      if (typeof forecastRaw !== "string" || !forecastRaw) return;
      if (!QPF_CATEGORIES.includes(forecastRaw as any)) return; // Skip invalid

      // Find what the actual weather was on the target day for this sub-basin
      const targetDate = addDaysToDDMon(r.date, day);
      const observedCat = realisedMap.get(`${targetDate}|${r.subBasin}`);

      if (observedCat && QPF_CATEGORIES.includes(observedCat as any)) {
        pairs.push({ forecast: forecastRaw, observed: observedCat });
      }
    });

    results.push({ day, ...computeMetrics(pairs) });
  }
  return results;
}

function computeMetrics(pairs: { forecast: string; observed: string }[]): Omit<DayVerification, "day"> {
  const n = pairs.length;
  const matrix = Array.from({ length: 6 }, () => Array(6).fill(0));
  if (n === 0) return { totalCases: 0, matrix, pc: 0, usable: 0, hss: 0, csiPerCategory: Array(6).fill(null), farPerCategory: Array(6).fill(null) };

  let correct = 0;
  let usableCount = 0;

  pairs.forEach((p) => {
    const oIdx = QPF_CATEGORIES.indexOf(p.observed as any);
    const fIdx = QPF_CATEGORIES.indexOf(p.forecast as any);
    if (oIdx !== -1 && fIdx !== -1) {
      matrix[oIdx][fIdx]++;
      if (oIdx === fIdx) correct++;
      if (Math.abs(oIdx - fIdx) <= 1) usableCount++;
    }
  });

  const pc = (correct / n) * 100;
  const usable = (usableCount / n) * 100;
  let expected = 0;
  const csiPerCategory: (number | null)[] = [];
  const farPerCategory: (number | null)[] = [];

  for (let i = 0; i < 6; i++) {
    let rowTotal = 0; let colTotal = 0;
    for (let j = 0; j < 6; j++) { rowTotal += matrix[i][j]; colTotal += matrix[j][i]; }
    expected += (rowTotal * colTotal) / n;
    
    const hits = matrix[i][i];
    const falseAlarms = colTotal - hits;
    const misses = rowTotal - hits;
    csiPerCategory.push(hits + misses + falseAlarms > 0 ? hits / (hits + misses + falseAlarms) : null);
    farPerCategory.push(hits + falseAlarms > 0 ? falseAlarms / (hits + falseAlarms) : null);
  }

  const hss = n === expected ? 0 : (correct - expected) / (n - expected);
  return { totalCases: n, matrix, pc, usable, hss, csiPerCategory, farPerCategory };
}