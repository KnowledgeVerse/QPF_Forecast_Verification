import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  SavedQPFSession,
  RealisedRainfallEntry,
  QPFForecastEntry,
} from "@/types";

interface QPFStore {
  qpfSessions: SavedQPFSession[];
  realisedEntries: RealisedRainfallEntry[];
  saveCurrentSession: (
    issueDate: string,
    forecasts: QPFForecastEntry[],
  ) => void;
  deleteSession: (id: string) => void;
  getSessionByDate: (date: string) => SavedQPFSession | undefined;
  duplicatePrevSession: (currentIssueDate: string) => QPFForecastEntry[] | null;
  updateRealised: (
    date: string,
    subBasin: string,
    value: number | null,
  ) => void;
  bulkImportFromCSV: (
    forecastRows: QPFForecastEntry[],
    realisedRows: RealisedRainfallEntry[],
  ) => void;
  syncAllToDatabase: () => Promise<void>;
}

const QPFContext = createContext<QPFStore | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
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

export function QPFProvider({ children }: { children: React.ReactNode }) {
  const [qpfSessions, setQpfSessions] = useState<SavedQPFSession[]>(() =>
    loadFromStorage<SavedQPFSession[]>("qpf_sessions", []),
  );

  const [realisedEntries, setRealisedEntries] = useState<
    RealisedRainfallEntry[]
  >(() => loadFromStorage<RealisedRainfallEntry[]>("qpf_realised", []));

  useEffect(() => {
    saveToStorage("qpf_sessions", qpfSessions);
    if (qpfSessions.length > 0) saveToDatabase("QPF_Sessions", qpfSessions);
  }, [qpfSessions]);

  useEffect(() => {
    saveToStorage("qpf_realised", realisedEntries);
    if (realisedEntries.length > 0)
      saveToDatabase("QPF_Realised", realisedEntries);
  }, [realisedEntries]);

  const saveCurrentSession = useCallback(
    (issueDate: string, forecasts: QPFForecastEntry[]) => {
      setQpfSessions((prev) => {
        const filtered = prev.filter((s) => s.issueDate !== issueDate);
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            issueDate,
            createdAt: new Date().toISOString(),
            forecasts,
          },
        ];
      });
    },
    [],
  );

  const deleteSession = useCallback((id: string) => {
    setQpfSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getSessionByDate = useCallback(
    (date: string) => {
      return qpfSessions.find((s) => s.issueDate === date);
    },
    [qpfSessions],
  );

  const duplicatePrevSession = useCallback(
    (currentIssueDate: string) => {
      const prevDate = new Date(new Date(currentIssueDate).getTime() - 86400000)
        .toISOString()
        .split("T")[0];
      const prevSession = qpfSessions.find((s) => s.issueDate === prevDate);
      if (!prevSession) return null;

      return prevSession.forecasts.map((f) => ({
        ...f,
        issueDate: currentIssueDate,
      }));
    },
    [qpfSessions],
  );

  const updateRealised = useCallback(
    (date: string, subBasin: string, value: number | null) => {
      setRealisedEntries((prev) => {
        const filtered = prev.filter(
          (r) => !(r.date === date && r.subBasin === subBasin),
        );
        return [
          ...filtered,
          { date, basin: "Ganga", subBasin, realisedMM: value },
        ];
      });
    },
    [],
  );

  const bulkImportFromCSV = useCallback(
    (
      forecastRows: QPFForecastEntry[],
      newRealised: RealisedRainfallEntry[],
    ) => {
      // Merge Forecasts grouped by Issue Date
      setQpfSessions((prev) => {
        const updatedSessions = [...prev];

        const grouped = forecastRows.reduce(
          (acc, row) => {
            if (!acc[row.issueDate]) acc[row.issueDate] = [];
            acc[row.issueDate].push(row);
            return acc;
          },
          {} as Record<string, QPFForecastEntry[]>,
        );

        Object.entries(grouped).forEach(([issueDate, forecasts]) => {
          const existingIdx = updatedSessions.findIndex(
            (s) => s.issueDate === issueDate,
          );
          if (existingIdx >= 0) {
            updatedSessions[existingIdx] = {
              ...updatedSessions[existingIdx],
              forecasts,
            };
          } else {
            updatedSessions.push({
              id: Date.now().toString() + Math.random(),
              issueDate,
              createdAt: new Date().toISOString(),
              forecasts,
            });
          }
        });
        return updatedSessions;
      });

      // Merge Realised Data
      setRealisedEntries((prev) => {
        const map = new Map(prev.map((r) => [`${r.date}|${r.subBasin}`, r]));
        newRealised.forEach((r) => map.set(`${r.date}|${r.subBasin}`, r));
        return Array.from(map.values());
      });
    },
    [],
  );

  const syncAllToDatabase = useCallback(async () => {
    try {
      if (qpfSessions.length > 0)
        await saveToDatabase("QPF_Sessions", qpfSessions);
      if (realisedEntries.length > 0)
        await saveToDatabase("QPF_Realised", realisedEntries);
    } catch (error) {
      console.error("QPF Sync Error", error);
    }
  }, [qpfSessions, realisedEntries]);

  return (
    <QPFContext.Provider
      value={{
        qpfSessions,
        realisedEntries,
        saveCurrentSession,
        deleteSession,
        getSessionByDate,
        duplicatePrevSession,
        updateRealised,
        bulkImportFromCSV,
        syncAllToDatabase,
      }}
    >
      {children}
    </QPFContext.Provider>
  );
}

export function useQPFStore() {
  const ctx = useContext(QPFContext);
  if (!ctx) throw new Error("useQPFStore must be used within QPFProvider");
  return ctx;
}
