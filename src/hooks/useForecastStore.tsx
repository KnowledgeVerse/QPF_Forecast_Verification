import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  ForecastEntry,
  RealisedEntry,
  VerificationResult,
  AppSettings,
  AppUser,
  Toast,
  Category,
  Region,
} from "@/types";
import { CATEGORY_VALUES } from "@/types";

interface ForecastStore {
  forecasts: ForecastEntry[];
  realised: RealisedEntry[];
  verifications: VerificationResult[];
  settings: AppSettings;
  users: AppUser[];
  currentUser: AppUser | null;
  toasts: Toast[];
  addForecast: (entry: ForecastEntry) => void;
  updateForecast: (entry: ForecastEntry) => void;
  deleteForecast: (id: string) => void;
  addRealised: (entry: RealisedEntry) => void;
  updateRealised: (entry: RealisedEntry) => void;
  deleteRealised: (id: string) => void;
  runVerification: (realisedDate?: string) => void;
  getForecastForDate: (date: string) => ForecastEntry | undefined;
  getRealisedForDate: (date: string) => RealisedEntry | undefined;
  getVerificationForDate: (date: string) => VerificationResult[];
  getLeadDayAccuracy: () => {
    leadDay: number;
    averageAccuracy: number;
    count: number;
  }[];
  getRegionAccuracy: () => {
    region: Region;
    averageAccuracy: number;
    count: number;
  }[];
  getDailyAccuracy: () => {
    date: string;
    leadDayAccuracies: Record<number, number>;
    overallAccuracy: number;
  }[];
  updateSettings: (settings: Partial<AppSettings>) => void;
  login: (name: string, password: string) => boolean;
  logout: () => void;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  clearAllData: () => void;
  syncAllToDatabase: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: "dark",
  language: "en",
  autoVerify: true,
  autoBackup: false,
  dateFormat: "DD/MM/YYYY",
  matchingWeights: { 0: 100, 1: 75, 2: 50, 3: 25, 4: 0 },
  appBackground: "default",
};

const defaultUsers: AppUser[] = [
  { id: "1", name: "Kamal", role: "admin", password: "Kamal@007" },
  { id: "2", name: "42492", role: "operator", password: "42492" },
];

const ForecastContext = createContext<ForecastStore | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// नया MongoDB Save फंक्शन (बैकएंड को डेटा भेजने के लिए)
async function saveToDatabase(type: string, value: unknown) {
  try {
    await fetch("http://localhost:5000/api/save-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: type,
        date: new Date().toISOString(),
        data: value,
      }),
    });
  } catch (error) {
    console.error("MongoDB Save Error:", error);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00Z");
  const d2 = new Date(b + "T00:00:00Z");
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

import defaultBackup from "../../Backup/Default-backup.json";

function seedDemoData() {
  return {
    forecasts: defaultBackup.forecasts as unknown as ForecastEntry[],
    realised: defaultBackup.realised as unknown as RealisedEntry[],
    verifications:
      defaultBackup.verifications as unknown as VerificationResult[],
  };
}

import { REGIONS } from "@/types";

export function ForecastProvider({ children }: { children: React.ReactNode }) {
  const [forecasts, setForecasts] = useState<ForecastEntry[]>(() => {
    const stored = loadFromStorage<ForecastEntry[]>("rfad_forecasts", []);
    if (stored.length === 0) {
      const demo = seedDemoData();
      saveToStorage("rfad_forecasts", demo.forecasts);
      saveToStorage("rfad_realised", demo.realised);
      saveToStorage("rfad_verifications", demo.verifications);
      return demo.forecasts;
    }

    // Auto-Repair old data saved with the previous buggy date logic
    let migrated = false;
    const fixedForecasts = stored.map((f) => {
      if (f.dates[0] !== f.issueDate) {
        migrated = true;
        const newDates: string[] = [];
        const newData: Record<string, Record<Region, Category>> = {};

        for (let i = 0; i < 7; i++) {
          const newD = addDays(f.issueDate, i);
          newDates.push(newD);
          newData[newD] = f.data[newD] || {
            "NORTH CENTRAL": "DRY",
            "NORTH EAST": "DRY",
            "NORTH WEST": "DRY",
            "SOUTH CENTRAL": "DRY",
            "SOUTH EAST": "DRY",
            "SOUTH WEST": "DRY",
          };
        }
        return { ...f, dates: newDates, data: newData };
      }
      return f;
    });

    if (migrated) saveToStorage("rfad_forecasts", fixedForecasts);
    return fixedForecasts;
  });

  const [realised, setRealised] = useState<RealisedEntry[]>(() =>
    loadFromStorage<RealisedEntry[]>("rfad_realised", []),
  );

  const [verifications, setVerifications] = useState<VerificationResult[]>(() =>
    loadFromStorage<VerificationResult[]>("rfad_verifications", []),
  );

  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage<AppSettings>("rfad_settings", defaultSettings),
  );

  const [users] = useState<AppUser[]>(() =>
    loadFromStorage<AppUser[]>("rfad_users", defaultUsers),
  );

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem("rfad_currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    saveToStorage("rfad_forecasts", forecasts);
    if (forecasts.length > 0) saveToDatabase("Forecast_Data", forecasts);
  }, [forecasts]);

  useEffect(() => {
    saveToStorage("rfad_realised", realised);
    if (realised.length > 0) saveToDatabase("Realised_Data", realised);
  }, [realised]);

  useEffect(() => {
    saveToStorage("rfad_verifications", verifications);
  }, [verifications]);

  useEffect(() => {
    saveToStorage("rfad_settings", settings);
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("rfad_currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("rfad_currentUser");
    }
  }, [currentUser]);

  // Auto-run full verification when data changes to ensure complete consistency
  useEffect(() => {
    if (settings.autoVerify) {
      const timeout = setTimeout(() => {
        runVerification();
      }, 300);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecasts, realised, settings.matchingWeights, settings.autoVerify]);

  const addForecast = useCallback((entry: ForecastEntry) => {
    setForecasts((prev) => [...prev, entry]);
  }, []);

  const updateForecast = useCallback((entry: ForecastEntry) => {
    setForecasts((prev) => prev.map((f) => (f.id === entry.id ? entry : f)));
  }, []);

  const deleteForecast = useCallback((id: string) => {
    setForecasts((prev) => prev.filter((f) => f.id !== id));
    setVerifications((prev) => prev.filter((v) => v.forecastId !== id));
  }, []);

  const addRealised = useCallback((entry: RealisedEntry) => {
    setRealised((prev) => {
      const filtered = prev.filter((r) => r.date !== entry.date);
      return [...filtered, entry];
    });
  }, []);

  const updateRealised = useCallback((entry: RealisedEntry) => {
    setRealised((prev) => prev.map((r) => (r.id === entry.id ? entry : r)));
  }, []);

  const deleteRealised = useCallback((id: string) => {
    setRealised((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const runVerification = useCallback(
    (realisedDate?: string) => {
      const targets = realisedDate
        ? realised.filter((r) => r.date === realisedDate)
        : realised;

      const newVerifications: VerificationResult[] = [];

      targets.forEach((realEntry) => {
        // Find all forecasts that cover this realised date
        const applicableForecasts = forecasts.filter((f) => {
          const leadDay = daysBetween(f.issueDate, realEntry.date) + 1;
          return (
            leadDay >= 1 && leadDay <= 7 && f.dates.includes(realEntry.date)
          );
        });

        applicableForecasts.forEach((forecast) => {
          const leadDay = daysBetween(forecast.issueDate, realEntry.date) + 1;

          REGIONS.forEach((region) => {
            const forecastValue = forecast.data[realEntry.date]?.[region];
            const realisedValue = realEntry.data[region];

            if (!forecastValue || !realisedValue) return;

            const fIndex = CATEGORY_VALUES[forecastValue];
            const rIndex = CATEGORY_VALUES[realisedValue];
            const stepDiff = Math.abs(fIndex - rIndex);
            const accuracy = settings.matchingWeights[stepDiff] ?? 0;

            newVerifications.push({
              id: generateId(),
              realisedDate: realEntry.date,
              forecastId: forecast.id,
              leadDay,
              region,
              forecastValue,
              realisedValue,
              accuracy,
            });
          });
        });
      });

      // Remove old verifications for the same realised dates and add new ones
      const targetDates = new Set(targets.map((t) => t.date));
      setVerifications((prev) => [
        ...prev.filter((v) => !targetDates.has(v.realisedDate)),
        ...newVerifications,
      ]);
    },
    [forecasts, realised, settings.matchingWeights],
  );

  const getForecastForDate = useCallback(
    (date: string) => {
      return forecasts.find((f) => f.issueDate === date);
    },
    [forecasts],
  );

  const getRealisedForDate = useCallback(
    (date: string) => {
      return realised.find((r) => r.date === date);
    },
    [realised],
  );

  const getVerificationForDate = useCallback(
    (date: string) => {
      return verifications.filter((v) => v.realisedDate === date);
    },
    [verifications],
  );

  const getLeadDayAccuracy = useCallback(() => {
    const result: { leadDay: number; totalAccuracy: number; count: number }[] =
      [];
    for (let i = 1; i <= 7; i++) {
      result.push({ leadDay: i, totalAccuracy: 0, count: 0 });
    }

    verifications.forEach((v) => {
      const entry = result[v.leadDay - 1];
      if (entry) {
        entry.totalAccuracy += v.accuracy;
        entry.count++;
      }
    });

    return result.map((r) => ({
      leadDay: r.leadDay,
      averageAccuracy: r.count > 0 ? Math.round(r.totalAccuracy / r.count) : 0,
      count: r.count,
    }));
  }, [verifications]);

  const getRegionAccuracy = useCallback(() => {
    const result: Record<string, { totalAccuracy: number; count: number }> = {};

    verifications.forEach((v) => {
      if (!result[v.region]) {
        result[v.region] = { totalAccuracy: 0, count: 0 };
      }
      result[v.region].totalAccuracy += v.accuracy;
      result[v.region].count++;
    });

    return REGIONS.map((region) => ({
      region,
      averageAccuracy:
        result[region]?.count > 0
          ? Math.round(result[region].totalAccuracy / result[region].count)
          : 0,
      count: result[region]?.count ?? 0,
    }));
  }, [verifications]);

  const getDailyAccuracy = useCallback(() => {
    const dateMap: Record<
      string,
      { leadDayAccuracies: Record<number, number[]>; overall: number[] }
    > = {};

    verifications.forEach((v) => {
      if (!dateMap[v.realisedDate]) {
        dateMap[v.realisedDate] = { leadDayAccuracies: {}, overall: [] };
      }
      if (!dateMap[v.realisedDate].leadDayAccuracies[v.leadDay]) {
        dateMap[v.realisedDate].leadDayAccuracies[v.leadDay] = [];
      }
      dateMap[v.realisedDate].leadDayAccuracies[v.leadDay].push(v.accuracy);
      dateMap[v.realisedDate].overall.push(v.accuracy);
    });

    return Object.entries(dateMap)
      .map(([date, data]) => {
        const leadDayAccuracies: Record<number, number> = {};
        for (let i = 1; i <= 7; i++) {
          const arr = data.leadDayAccuracies[i];
          leadDayAccuracies[i] =
            arr && arr.length > 0
              ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
              : 0;
        }
        const overallAccuracy =
          data.overall.length > 0
            ? Math.round(
                data.overall.reduce((a, b) => a + b, 0) / data.overall.length,
              )
            : 0;
        return { date, leadDayAccuracies, overallAccuracy };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [verifications]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const login = useCallback(
    (name: string, password: string) => {
      const user = users.find(
        (u) => u.name === name && u.password === password,
      );
      if (user) {
        setCurrentUser(user);
        return true;
      }
      return false;
    },
    [users],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const exportData = useCallback(() => {
    const data = {
      forecasts,
      realised,
      verifications,
      settings,
      users,
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [forecasts, realised, verifications, settings, users]);

  const importData = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.forecasts) setForecasts(data.forecasts);
      if (data.realised) setRealised(data.realised);
      if (data.verifications) setVerifications(data.verifications);
      if (data.settings) setSettings(data.settings);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAllData = useCallback(() => {
    setForecasts([]);
    setRealised([]);
    setVerifications([]);
  }, []);

  const syncAllToDatabase = useCallback(async () => {
    addToast("Syncing data to MongoDB...", "info");
    try {
      if (forecasts.length > 0)
        await saveToDatabase("Forecast_Data", forecasts);
      if (realised.length > 0) await saveToDatabase("Realised_Data", realised);
      if (verifications.length > 0)
        await saveToDatabase("Verification_Data", verifications);
      await saveToDatabase("Settings_Data", settings);
      await saveToDatabase("Users_Data", users);
      addToast("All data successfully synced to MongoDB! ✅", "success");
    } catch (error) {
      addToast("Failed to sync data to MongoDB ❌", "error");
      console.error(error);
    }
  }, [forecasts, realised, verifications, settings, users, addToast]);

  return (
    <ForecastContext.Provider
      value={{
        forecasts,
        realised,
        verifications,
        settings,
        users,
        currentUser,
        toasts,
        addForecast,
        updateForecast,
        deleteForecast,
        addRealised,
        updateRealised,
        deleteRealised,
        runVerification,
        getForecastForDate,
        getRealisedForDate,
        getVerificationForDate,
        getLeadDayAccuracy,
        getRegionAccuracy,
        getDailyAccuracy,
        updateSettings,
        login,
        logout,
        addToast,
        removeToast,
        exportData,
        importData,
        clearAllData,
        syncAllToDatabase,
      }}
    >
      {children}
    </ForecastContext.Provider>
  );
}

export function useForecastStore(): ForecastStore {
  const ctx = useContext(ForecastContext);
  if (!ctx)
    throw new Error("useForecastStore must be used within ForecastProvider");
  return ctx;
}
