export type Category = "DRY" | "ISOL" | "SCT" | "FWS" | "WS";

export const CATEGORIES: Category[] = ["DRY", "ISOL", "SCT", "FWS", "WS"];

export const CATEGORY_VALUES: Record<Category, number> = {
  DRY: 0,
  ISOL: 1,
  SCT: 2,
  FWS: 3,
  WS: 4,
};

export const REGIONS = [
  "NORTH CENTRAL",
  "NORTH EAST",
  "NORTH WEST",
  "SOUTH CENTRAL",
  "SOUTH EAST",
  "SOUTH WEST",
] as const;
export type Region = (typeof REGIONS)[number];

export const QPF_CATEGORIES = [
  "0",
  "0.1-10",
  "11-25",
  "26-50",
  "51-100",
  ">100",
] as const;
export type QPFCategory = (typeof QPF_CATEGORIES)[number];

export const QPF_BASINS = [
  "KOSI/MAHANANDA",
  "BAGMATI/ADHWARA",
  "GANDAK",
  "SON",
  "PUNPUN/DHAB NADI",
  "NORTH KOEL",
  "KANHAR",
  "UPPER SON",
] as const;
export type QPFBasin = (typeof QPF_BASINS)[number];

export type QPFForecastEntry = {
  issueDate: string;
  basin: string;
  subBasin: string;
  day1: string;
  day2: string;
  day3: string;
  day4: string;
  day5: string;
  day6: string;
  day7: string;
};

export type RealisedRainfallEntry = {
  date: string;
  basin: string;
  subBasin: string;
  realisedMM: number | null;
};

export type SavedQPFSession = {
  id: string;
  issueDate: string;
  createdAt: string;
  forecasts: QPFForecastEntry[];
};

export interface ForecastEntry {
  id: string;
  issueDate: string;
  dates: string[];
  data: Record<string, Record<Region, Category>>;
  createdAt: number;
  updatedAt: number;
}

export interface RealisedEntry {
  id: string;
  date: string;
  data: Record<Region, Category>;
  createdAt: number;
}

export interface VerificationResult {
  id: string;
  realisedDate: string;
  forecastId: string;
  leadDay: number;
  region: Region;
  forecastValue: Category;
  realisedValue: Category;
  accuracy: number;
}

export interface LeadDayAccuracy {
  leadDay: number;
  averageAccuracy: number;
  count: number;
}

export interface RegionAccuracy {
  region: Region;
  averageAccuracy: number;
  count: number;
}

export interface DailyAccuracy {
  date: string;
  leadDayAccuracies: Record<number, number>;
  overallAccuracy: number;
}

export interface AppSettings {
  theme: "dark" | "light";
  language: "en" | "hi";
  autoVerify: boolean;
  autoBackup: boolean;
  dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD";
  matchingWeights: Record<number, number>;
  appBackground?: string;
}

export interface AppUser {
  id: string;
  name: string;
  role: "admin" | "operator";
  password: string;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export type RainfallCategory = "DRY" | "ISOL" | "SCT" | "FWS" | "WS";

export interface CategoryScores {
  DRY: number | null;
  ISOL: number | null;
  SCT: number | null;
  FWS: number | null;
  WS: number | null;
}

export interface ComputedScores {
  PC: number;
  HSS: number;
  CSI: CategoryScores;
  POD: CategoryScores;
  FAR: CategoryScores;
  MR: CategoryScores;
  CNON: CategoryScores;
  BIAS: CategoryScores;
  TSS: CategoryScores;
  sampleSize: number;
}

export interface DayContingencyData {
  leadDay: number;
  matrix: number[][];
  scores: ComputedScores;
}
