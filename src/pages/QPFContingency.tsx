import { useState, useEffect, useMemo } from "react";
import ContingencyTable from "@/components/ContingencyTable";
import SkillScoreTable from "@/components/SkillScoreTable";
import { useQPFStore } from "@/hooks/useQPFStore";
import { Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { normalizeQPFValue } from "@/lib/qpfParser";
import type { RealisedRainfallEntry, QPFForecastEntry } from "@/types";
import {
  calculatePOD,
  calculateFAR,
  calculateMR,
  calculateCSI,
  calculateBIAS,
  calculatePC,
  calculateTSS,
  calculateHSS,
} from "@/lib/skillScore";

const CATEGORIES = ["0", "0.1-10", "11-25", "26-50", "51-100", ">100"];
const LEAD_DAYS = [1, 2, 3, 4, 5, 6, 7];

const getRealisedCategory = (mm: number) => {
  if (mm === 0) return "0";
  if (mm <= 10) return "0.1-10";
  if (mm <= 25) return "11-25";
  if (mm <= 50) return "26-50";
  if (mm <= 100) return "51-100";
  return ">100";
};

const parseDate = (dateStr: any): string => {
  if (!dateStr) return "";
  const str = String(dateStr).trim();

  // Handle Excel serial numbers (jaise 45000)
  if (!isNaN(Number(str)) && str !== "") {
    const date = new Date(Math.round((Number(str) - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split(/[-/\sT]/);
    const p1 = Number(parts[0]);
    const p2 = Number(parts[1]);
    const year = parts[2];
    let day = parts[0],
      month = parts[1];
    if (p1 > 12) {
      day = parts[0];
      month = parts[1];
    } else if (p2 > 12) {
      month = parts[0];
      day = parts[1];
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Handle DD-MM-YY or DD/MM/YY (2-digit year)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(str)) {
    const parts = str.split(/[-/\sT]/);
    const p1 = Number(parts[0]);
    const p2 = Number(parts[1]);
    let year = Number(parts[2]);
    year = year < 50 ? 2000 + year : 1900 + year; // Convert 26 to 2026
    let day = parts[0],
      month = parts[1];
    if (p1 > 12) {
      day = parts[0];
      month = parts[1];
    } else if (p2 > 12) {
      month = parts[0];
      day = parts[1];
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Handle YYYY-MM-DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/\sT]/);
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].substring(0, 2).padStart(2, "0")}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return str;
};

const getShiftedDate = (baseDate: string, days: number) => {
  const date = new Date(baseDate + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
};

const QPFContingency = () => {
  const { qpfSessions, realisedEntries, bulkImportFromCSV } = useQPFStore();

  // Initialize dates with the min and max of actual uploaded realised data
  const [startDate, setStartDate] = useState<string>(() => {
    const dates =
      realisedEntries
        ?.map((v) => parseDate(v.date))
        .filter(Boolean)
        .sort() || [];
    return dates.length > 0 ? dates[0] : new Date().toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const dates =
      realisedEntries
        ?.map((v) => parseDate(v.date))
        .filter(Boolean)
        .sort() || [];
    return dates.length > 0
      ? dates[dates.length - 1]
      : new Date().toISOString().split("T")[0];
  });

  // State for Multi-Select Lead Days
  const [selectedDays, setSelectedDays] = useState<number[]>(LEAD_DAYS);

  const [selectedSubBasin, setSelectedSubBasin] =
    useState<string>("All Basins");

  // Extract unique sub-basins from data
  const subBasins = useMemo(() => {
    const basins = new Set<string>();
    (qpfSessions as any[])?.forEach((session) => {
      session.forecasts?.forEach((f: any) => {
        if (f.subBasin) basins.add(f.subBasin);
      });
    });
    realisedEntries?.forEach((r) => r.subBasin && basins.add(r.subBasin));
    return Array.from(basins).sort();
  }, [qpfSessions, realisedEntries]);

  // --- File Upload Logic (from QPFUploadData) ---
  const safeQPF = (val: any) => {
    let s = String(val || "").toLowerCase();
    s = s.replace(/\s+/g, "").replace(/[-–—_]/g, "-");
    if (
      s === "0.1-10" ||
      s === ".1-10" ||
      s === "1-10" ||
      s.includes("oct") ||
      s.includes("jan") ||
      s.startsWith("0.1") ||
      s.startsWith(".1")
    )
      return "0.1-10";
    if (s === "11-25" || s.includes("nov")) return "11-25";
    if (s === "26-50" || s.includes("26-37") || s.includes("38-50"))
      return "26-50";
    if (s === "51-100" || s.includes("51-75") || s.includes("76-100"))
      return "51-100";
    if (s === "0" || s === "dry" || s === "nil" || s === "0.0") return "0";
    if (s === ">100" || s.includes(">") || s === "100") return ">100";
    return normalizeQPFValue(String(val));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", raw: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newForecasts: QPFForecastEntry[] = [];
        const newRealised: RealisedRainfallEntry[] = [];

        const getCol = (r: any, ...keys: string[]) => {
          const normalizedRow: Record<string, any> = {};
          for (const key in r) {
            const normKey = key.replace(/\s+/g, " ").trim().toLowerCase();
            normalizedRow[normKey] = r[key];
          }
          for (const k of keys) {
            const normK = k.replace(/\s+/g, " ").trim().toLowerCase();
            if (
              normalizedRow[normK] !== undefined &&
              normalizedRow[normK] !== ""
            ) {
              return normalizedRow[normK];
            }
          }
          return undefined;
        };

        data.forEach((row) => {
          const rowDateRaw = getCol(row, "Date", "date");
          if (!rowDateRaw) return;
          const rowDate = parseDate(rowDateRaw);
          const subBasin = getCol(
            row,
            "Name of Sub-Basin",
            "Sub-Basin",
            "subBasin",
          );
          if (!subBasin) return;

          const realVal = getCol(
            row,
            "Realised Rainfall",
            "Realized Rainfall in mm",
            "Realised Rainfall in mm",
            "Realized Rainfall",
          );
          if (realVal !== undefined) {
            newRealised.push({
              date: rowDate,
              basin: getCol(row, "Name of Basin", "Basin") || "Ganga",
              subBasin,
              realisedMM: Number(realVal) || 0,
            });
          }

          const d1 = getCol(row, "Day-1", "QPF issued valid for Day-1");
          if (d1 !== undefined) {
            newForecasts.push({
              issueDate: rowDate,
              basin: getCol(row, "Name of Basin", "Basin") || "Ganga",
              subBasin,
              day1: safeQPF(d1),
              day2: safeQPF(getCol(row, "Day-2", "QPF issued valid for Day-2")),
              day3: safeQPF(getCol(row, "Day-3", "QPF issued valid for Day-3")),
              day4: safeQPF(getCol(row, "Day-4", "QPF issued valid for Day-4")),
              day5: safeQPF(getCol(row, "Day-5", "QPF issued valid for Day-5")),
              day6: safeQPF(getCol(row, "Day-6", "QPF issued valid for Day-6")),
              day7: safeQPF(getCol(row, "Day-7", "QPF issued valid for Day-7")),
            });
          }
        });

        bulkImportFromCSV(newForecasts, newRealised);
        alert(`Successfully imported data from ${file.name}`);
      } catch (error) {
        alert("Error parsing file. Please check the format.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; // reset file input
  };

  const exportToCSV = () => {
    const rows: string[] = [];
    rows.push("QPF Contingency Analysis");
    rows.push(`Sub-Basin: ${selectedSubBasin}`);
    rows.push(`Date Range: ${startDate} to ${endDate}`);
    rows.push("");

    LEAD_DAYS.filter((day) => selectedDays.includes(day)).forEach((day) => {
      const metrics = getMetricsForLeadDay(day);

      rows.push(`DAY ${day} CONTINGENCY TABLE`);
      rows.push(
        `Category,Hits (a),False Alarms (b),Misses (c),Correct Negatives (d)`,
      );
      metrics.forEach((m) => {
        rows.push(`${m.label},${m.a},${m.b},${m.c},${m.d}`);
      });
      rows.push("");

      rows.push(`DAY ${day} SKILL SCORES`);
      rows.push(`Score,${CATEGORIES.join(",")}`);

      const scores = [
        { name: "POD", calc: calculatePOD },
        { name: "FAR", calc: calculateFAR },
        { name: "MR", calc: calculateMR },
        { name: "CSI", calc: calculateCSI },
        { name: "BIAS", calc: calculateBIAS },
        { name: "PC", calc: calculatePC },
        { name: "TSS", calc: calculateTSS },
        { name: "HSS", calc: calculateHSS },
      ];

      scores.forEach((s) => {
        const rowData = [s.name];
        metrics.forEach((m) => {
          rowData.push(s.calc(m as any).toFixed(3));
        });
        rows.push(rowData.join(","));
      });
      rows.push("");
      rows.push("");
    });

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `QPF_Contingency_${selectedSubBasin}_${startDate}_to_${endDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Jab bhi naya CSV upload hoga, ye automatically dates set kar dega
  useEffect(() => {
    if (realisedEntries && realisedEntries.length > 0) {
      const dates = realisedEntries
        .map((v) => parseDate(v.date))
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }
    }
  }, [realisedEntries]);

  // Day toggle logic
  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleToggleAll = () => {
    if (selectedDays.length === LEAD_DAYS.length) setSelectedDays([]);
    else setSelectedDays([...LEAD_DAYS]);
  };

  // Calculate data dynamically from QPF sessions and realised entries
  // Performance Fix: Pre-process and index QPF Sessions for instant (O(1)) lookup
  const forecastMap = useMemo(() => {
    const map = new Map<string, any>();
    (qpfSessions as any[])?.forEach((session) => {
      session.forecasts?.forEach((f: any) => {
        const issueDate = parseDate(f.issueDate);
        const basin = String(f.basin || "")
          .trim()
          .toLowerCase();
        const subBasin = String(f.subBasin || "")
          .trim()
          .toLowerCase();
        const key = `${issueDate}_${basin}_${subBasin}`;
        map.set(key, f);
      });
    });
    return map;
  }, [qpfSessions]);

  // Performance Fix: Pre-process and parse Realised Entries to avoid repeating logic
  const parsedRealisedEntries = useMemo(() => {
    return (
      realisedEntries?.map((r) => ({
        ...r,
        parsedDate: parseDate(r.date),
        basinKey: String(r.basin || "")
          .trim()
          .toLowerCase(),
        subBasinKey: String(r.subBasin || "")
          .trim()
          .toLowerCase(),
        realCategory: getRealisedCategory(r.realisedMM ?? 0),
      })) || []
    );
  }, [realisedEntries]);

  // Calculate data dynamically from QPF sessions and realised entries
  const getMetricsForLeadDay = (leadDay: number) => {
    const targetSubBasin = selectedSubBasin.trim().toLowerCase();

    const filteredRealised = parsedRealisedEntries.filter((r) => {
      const inDate = r.parsedDate >= startDate && r.parsedDate <= endDate;
      const inBasin =
        selectedSubBasin === "All Basins" || r.subBasinKey === targetSubBasin;
      return inDate && inBasin;
    });

    const realisedWithForecast = filteredRealised
      .map((realised) => {
        const targetIssueDate = getShiftedDate(realised.parsedDate, -leadDay);
        const key = `${targetIssueDate}_${realised.basinKey}_${realised.subBasinKey}`;
        const forecast = forecastMap.get(key);

        if (forecast) {
          // @ts-ignore
          const fcstVal = String(forecast[`day${leadDay}`] || "").trim();
          return { fcstVal, realVal: realised.realCategory };
        }
        return null;
      })
      .filter(Boolean) as { fcstVal: string; realVal: string }[];

    return CATEGORIES.map((cat) => {
      let a = 0,
        b = 0,
        c = 0,
        d = 0;

      realisedWithForecast.forEach(({ fcstVal, realVal }) => {
        const isFcst = fcstVal === cat;
        const isReal = realVal === cat;

        if (isFcst && isReal) a++;
        else if (isFcst && !isReal) b++;
        else if (!isFcst && isReal) c++;
        else if (!isFcst && !isReal) d++;
      });

      return { label: cat, a, b, c, d };
    });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header, Date Range & Lead Day Multi-Selector */}
      <div className="bg-[#111d32] rounded-xl shadow-md p-5 border border-[#1e3a5f] flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-[#94a3b8] mb-1">
                Filter Sub-Basin
              </label>
              <select
                value={selectedSubBasin}
                onChange={(e) => setSelectedSubBasin(e.target.value)}
                className="bg-[#0d1f35] text-[#e2e8f0] border border-[#1e3a5f] rounded-md px-3 py-2 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] min-w-[150px]"
              >
                <option value="All Basins">All Basins</option>
                {subBasins.map((sb) => (
                  <option key={sb} value={sb}>
                    {sb}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-[#94a3b8] mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#0d1f35] text-[#e2e8f0] border border-[#1e3a5f] rounded-md px-3 py-2 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-[#94a3b8] mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#0d1f35] text-[#e2e8f0] border border-[#1e3a5f] rounded-md px-3 py-2 outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-md font-semibold text-sm transition-all duration-200 flex items-center gap-2 shadow-md">
                <Upload size={16} /> Upload CSV/Excel
              </button>
            </div>
            <button
              onClick={exportToCSV}
              className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-md font-semibold text-sm transition-all duration-200 flex items-center gap-2 shadow-md"
            >
              <Download size={16} /> Save / Export CSV
            </button>
          </div>
        </div>

        {/* Multi-Select Day Buttons */}
        <div className="border-t border-[#1e3a5f] pt-5">
          <label className="text-sm font-semibold text-[#94a3b8] mb-3 block">
            Select Lead Days to Analyze
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleToggleAll}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                selectedDays.length === LEAD_DAYS.length
                  ? "bg-[#3b82f6] text-white shadow-[0_0_10px_rgba(59,130,246,0.4)] border-transparent"
                  : "bg-[#0a1628] text-[#94a3b8] border border-[#1e3a5f] hover:bg-[#1a2d4a] hover:text-[#e2e8f0]"
              }`}
            >
              All Days
            </button>

            {LEAD_DAYS.map((day) => (
              <button
                key={`btn-day-${day}`}
                onClick={() => handleToggleDay(day)}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                  selectedDays.includes(day)
                    ? "bg-[#10b981] text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] border-transparent"
                    : "bg-[#0a1628] text-[#94a3b8] border border-[#1e3a5f] hover:bg-[#1a2d4a] hover:text-[#e2e8f0]"
                }`}
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedDays.length === 0 && (
        <div className="text-center py-12 text-[#64748b] bg-[#111d32] rounded-xl border border-[#1e3a5f]">
          Please select at least one Lead Day to view the contingency analysis.
        </div>
      )}

      {/* Iterate over selected Days only */}
      {LEAD_DAYS.filter((day) => selectedDays.includes(day)).map((day) => {
        const dayCategories = getMetricsForLeadDay(day);
        const totalSamples =
          dayCategories[0].a +
          dayCategories[0].b +
          dayCategories[0].c +
          dayCategories[0].d;

        return (
          <div
            key={`lead-day-${day}`}
            className="relative p-6 border border-[#1e3a5f] rounded-2xl bg-[#0a1628]/40 shadow-inner mt-10"
          >
            {/* Day Badge */}
            <div className="absolute -top-4 left-6 bg-[#3b82f6] text-white px-5 py-1.5 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(59,130,246,0.4)] tracking-wide flex items-center gap-2">
              DAY {day}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {totalSamples} Samples
              </span>
            </div>

            <div className="mt-4">
              <h2 className="text-xl font-bold text-center text-[#c8d2e0] mb-6 uppercase tracking-wider">
                2x2 Contingency Tables
              </h2>

              {totalSamples === 0 ? (
                <div className="text-center py-8 text-[#64748b] bg-[#111d32] rounded-xl border border-[#1e3a5f]">
                  No verification data available for Day {day} in the selected
                  date range.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {dayCategories.map((cat) => (
                      <ContingencyTable
                        key={cat.label}
                        title={`For ${cat.label}`}
                        data={{ a: cat.a, b: cat.b, c: cat.c, d: cat.d }}
                      />
                    ))}
                  </div>
                  <SkillScoreTable categories={dayCategories} />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QPFContingency;
