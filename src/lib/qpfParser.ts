export type QPFRow = {
  date: string;
  basin: string;
  subBasin: string;
  day1: string;
  day2: string;
  day3: string;
  day4: string;
  day5: string;
  day6: string;
  day7: string;
  realised: number | null;
};

export type CorrectionLog = {
  "25-Nov": number;
  "26-37": number;
  "38-50": number;
  "51-75": number;
  "76-100": number;
  total: number;
};

export function normalizeQPFValue(raw: string, log?: CorrectionLog): string {
  const trimmed = raw.trim();
  const map: Record<string, string> = {
    "25-Nov": "11-25",
    "26-37": "26-50",
    "38-50": "26-50",
    "51-75": "51-100",
    "76-100": "51-100",
  };
  
  if (map[trimmed]) {
    if (log) {
      log[trimmed as keyof CorrectionLog]++;
      log.total++;
    }
    return map[trimmed];
  }
  return trimmed;
}

export function parseQPFCSV(csvText: string): { rows: QPFRow[]; correctionCounts: CorrectionLog } {
  const log: CorrectionLog = { "25-Nov": 0, "26-37": 0, "38-50": 0, "51-75": 0, "76-100": 0, total: 0 };
  const rows: QPFRow[] = [];
  const lines = csvText.split(/\r?\n/);

  // Start from index 1 to skip header
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const parts = lines[i].split(",");
    if (parts.length < 10) continue;

    const date = parts[0].trim();
    const basin = parts[1].trim();
    const subBasin = parts[2].trim();
    const days = [3, 4, 5, 6, 7, 8, 9].map((idx) => normalizeQPFValue(parts[idx] || "", log));
    const realRaw = parts[10] ? parts[10].trim() : "";
    const realised = realRaw === "" || isNaN(Number(realRaw)) ? null : Number(realRaw);

    rows.push({ date, basin, subBasin, day1: days[0], day2: days[1], day3: days[2], day4: days[3], day5: days[4], day6: days[5], day7: days[6], realised });
  }
  return { rows, correctionCounts: log };
}