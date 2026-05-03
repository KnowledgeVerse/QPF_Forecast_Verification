import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  CATEGORIES,
  CATEGORY_VALUES,
  REGIONS,
  type ForecastEntry,
  type RealisedEntry,
  type ComputedScores,
  type CategoryScores,
} from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  dateStr: string,
  format: "DD/MM/YYYY" | "YYYY-MM-DD" = "DD/MM/YYYY",
): string {
  const d = new Date(dateStr + "T00:00:00");
  if (format === "YYYY-MM-DD") {
    return dateStr;
  }
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00Z");
  const d2 = new Date(b + "T00:00:00Z");
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAccuracyColor(accuracy: number): {
  bg: string;
  text: string;
} {
  if (accuracy >= 90) return { bg: "rgba(16,185,129,0.25)", text: "#34d399" };
  if (accuracy >= 70) return { bg: "rgba(59,130,246,0.25)", text: "#60a5fa" };
  if (accuracy >= 50) return { bg: "rgba(245,158,11,0.25)", text: "#fbbf24" };
  if (accuracy >= 25) return { bg: "rgba(249,115,22,0.25)", text: "#fb923c" };
  return { bg: "rgba(239,68,68,0.25)", text: "#f87171" };
}

export function getCategoryStyle(category: string): {
  bg: string;
  text: string;
} {
  switch (category) {
    case "DRY":
      return { bg: "#475569", text: "#e2e8f0" };
    case "ISOL":
      return { bg: "#1e40af", text: "#bfdbfe" };
    case "SCT":
      return { bg: "#2563eb", text: "#dbeafe" };
    case "FWS":
      return { bg: "#b45309", text: "#fef3c7" };
    case "WS":
      return { bg: "#b91c1c", text: "#fee2e2" };
    default:
      return { bg: "#475569", text: "#e2e8f0" };
  }
}

export function buildMatrix(
  forecastEntries: ForecastEntry[],
  realisedEntries: RealisedEntry[],
  leadDay: number,
): number[][] {
  const matrix = Array.from({ length: 6 }, () => Array(6).fill(0));

  realisedEntries.forEach((realised) => {
    const obsDate = realised.date;
    const issueDateNeeded = addDays(obsDate, -(leadDay - 1));

    const forecast = forecastEntries.find(
      (f) => f.issueDate === issueDateNeeded,
    );

    if (forecast && forecast.dates.includes(obsDate)) {
      REGIONS.forEach((region) => {
        const obsCat = realised.data[region];
        const fcstCat = forecast.data[obsDate]?.[region];

        if (obsCat && fcstCat) {
          const obsIdx = CATEGORY_VALUES[obsCat];
          const fcstIdx = CATEGORY_VALUES[fcstCat];

          matrix[obsIdx][fcstIdx]++;
          matrix[obsIdx][5]++;
          matrix[5][fcstIdx]++;
          matrix[5][5]++;
        }
      });
    }
  });
  return matrix;
}

export function computeSkillScores(matrix: number[][]): ComputedScores {
  const total = matrix[5][5];
  const initScores = (): CategoryScores => ({
    DRY: null,
    ISOL: null,
    SCT: null,
    FWS: null,
    WS: null,
  });

  if (total === 0) {
    return {
      PC: 0,
      HSS: 0,
      CSI: initScores(),
      POD: initScores(),
      FAR: initScores(),
      MR: initScores(),
      CNON: initScores(),
      BIAS: initScores(),
      TSS: initScores(),
      sampleSize: 0,
    };
  }

  let hits = 0;
  let expectedCorrect = 0;
  for (let i = 0; i < 5; i++) {
    hits += matrix[i][i];
    expectedCorrect += (matrix[i][5] * matrix[5][i]) / total;
  }

  const PC = (hits / total) * 100;
  const HSS =
    total === expectedCorrect
      ? 0
      : (hits - expectedCorrect) / (total - expectedCorrect);

  const CSI = initScores();
  const POD = initScores();
  const FAR = initScores();
  const MR = initScores();
  const CNON = initScores();
  const BIAS = initScores();
  const TSS = initScores();

  for (let i = 0; i < 5; i++) {
    const cat = CATEGORIES[i];
    const a = matrix[i][i];
    const b = matrix[i][5] - a;
    const c = matrix[5][i] - a;
    const d = total - a - b - c;

    if (a + b + c > 0) CSI[cat] = a / (a + b + c);
    if (a + b > 0) {
      POD[cat] = a / (a + b);
      MR[cat] = b / (a + b);
      BIAS[cat] = (a + c) / (a + b);
    }
    if (a + c > 0) FAR[cat] = c / (a + c);
    if (c + d > 0) CNON[cat] = d / (c + d);
    if (POD[cat] !== null && FAR[cat] !== null)
      TSS[cat] = POD[cat]! - FAR[cat]!;
  }
  return { PC, HSS, CSI, POD, FAR, MR, CNON, BIAS, TSS, sampleSize: total };
}

export function downloadChartAsImage(containerId: string, filename: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Handle Canvas (Chart.js)
  const canvas = container.querySelector("canvas");
  if (canvas) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#111d32"; // Match card bg
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, 0);
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = tempCanvas.toDataURL("image/png");
      link.click();
    }
    return;
  }

  // Handle SVG (Recharts)
  const svg = container.querySelector("svg");
  if (svg) {
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = svg.clientWidth * 2; // High Resolution
      tempCanvas.height = svg.clientHeight * 2;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#111d32";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = tempCanvas.toDataURL("image/png");
        link.click();
      }
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  }
}
