import { useState, useMemo, useRef, useEffect } from "react";
import { Database, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQPFStore } from "@/hooks/useQPFStore";
import { buildVerificationData } from "@/lib/qpfVerification";
import { QPF_CATEGORIES, QPF_BASINS } from "@/types";
import type { QPFRow } from "@/lib/qpfParser";
import { normalizeQPFValue } from "@/lib/qpfParser";
import type { RealisedRainfallEntry, QPFForecastEntry } from "@/types";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Area,
} from "recharts";

export default function QPFAnalyticsCharts() {
  const { qpfSessions, realisedEntries, bulkImportFromCSV } = useQPFStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSubBasin, setSelectedSubBasin] = useState<string>("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isInitialDateSet, setIsInitialDateSet] = useState(false);

  const safeQPF = (val: any) => {
    let s = String(val || "").toLowerCase();
    // Remove all spaces and normalize dashes/hyphens
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
        const rowDate = getCol(row, "Date", "date");
        if (!rowDate) return;
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
    };
    reader.readAsBinaryString(file);
  };

  const getTimestamp = (dStr: string) => {
    if (!dStr) return 0;
    if (dStr.includes("-") && dStr.split("-")[0].length === 4) {
      const [y, m, d] = dStr.split("-").map(Number);
      return new Date(y, m - 1, d).getTime();
    }
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const parts = dStr.split("-");
    if (parts.length === 2) {
      const m = months.findIndex((mon) =>
        parts[1].toLowerCase().startsWith(mon.toLowerCase()),
      );
      if (m !== -1)
        return new Date(
          new Date().getFullYear(),
          m,
          parseInt(parts[0], 10),
        ).getTime();
    }
    const dt = new Date(dStr);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime();
  };

  const allRows = useMemo(() => {
    const rowMap = new Map<string, QPFRow>();
    qpfSessions.forEach((session) => {
      session.forecasts.forEach((f) => {
        const key = `${f.issueDate}|${f.subBasin}`;
        rowMap.set(key, { ...f, date: f.issueDate, realised: null });
      });
    });
    realisedEntries.forEach((r) => {
      const key = `${r.date}|${r.subBasin}`;
      if (rowMap.has(key)) rowMap.get(key)!.realised = r.realisedMM;
      else
        rowMap.set(key, {
          date: r.date,
          basin: r.basin,
          subBasin: r.subBasin,
          day1: "",
          day2: "",
          day3: "",
          day4: "",
          day5: "",
          day6: "",
          day7: "",
          realised: r.realisedMM,
        });
    });
    return Array.from(rowMap.values()).sort(
      (a, b) => getTimestamp(a.date) - getTimestamp(b.date),
    );
  }, [qpfSessions, realisedEntries]);

  useEffect(() => {
    if (allRows.length > 0 && !isInitialDateSet) {
      const timestamps = allRows
        .map((r) => getTimestamp(r.date))
        .filter((t) => t > 0 && !isNaN(t));
      if (timestamps.length > 0) {
        const minT = Math.min(...timestamps);
        const maxT = Math.max(...timestamps);

        const formatDate = (ts: number) => {
          const d = new Date(ts);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        };
        setFromDate(formatDate(minT));
        setToDate(formatDate(maxT));
        setIsInitialDateSet(true);
      }
    }
  }, [allRows, isInitialDateSet]);

  const filteredRows = useMemo(() => {
    const fromTs = fromDate ? getTimestamp(fromDate) : 0;
    const toTs = toDate ? getTimestamp(toDate) : Infinity;
    return allRows.filter((r) => {
      const rTs = getTimestamp(r.date);
      const matchesBasin =
        selectedSubBasin === "All" || r.subBasin === selectedSubBasin;
      return (
        matchesBasin && (!fromDate || rTs >= fromTs) && (!toDate || rTs <= toTs)
      );
    });
  }, [allRows, selectedSubBasin, fromDate, toDate]);

  const verificationData = useMemo(
    () => buildVerificationData(filteredRows),
    [filteredRows],
  );

  // 1. Performance Over Days Data
  const multiDayData = useMemo(() => {
    return verificationData.map((d) => ({
      name: `Day-${d.day}`,
      PC: parseFloat(d.pc.toFixed(2)),
      Usable: parseFloat(d.usable.toFixed(2)),
      HSS: parseFloat((d.hss * 100).toFixed(2)),
    }));
  }, [verificationData]);

  // 2. Average CSI & FAR by Category Data (Radar and Line Chart)
  const categoryData = useMemo(() => {
    if (!verificationData) return [];
    return QPF_CATEGORIES.map((cat, i) => {
      let totalCsi = 0,
        csiCount = 0;
      let totalFar = 0,
        farCount = 0;
      let totalObserved = 0;
      let totalForecasted = 0;
      let totalHits = 0;

      verificationData.forEach((d) => {
        if (d.csiPerCategory[i] !== null) {
          totalCsi += d.csiPerCategory[i]!;
          csiCount++;
        }
        if (d.farPerCategory[i] !== null) {
          totalFar += d.farPerCategory[i]!;
          farCount++;
        }

        const hits = d.matrix[i][i];
        const observed = d.matrix[i].reduce((sum, val) => sum + val, 0);
        const forecasted = d.matrix.reduce((sum, row) => sum + row[i], 0);

        totalHits += hits;
        totalObserved += observed;
        totalForecasted += forecasted;
      });

      const misses = totalObserved - totalHits;
      const falseAlarms = totalForecasted - totalHits;
      const pod = totalObserved > 0 ? totalHits / totalObserved : 0;
      const bias =
        totalObserved > 0
          ? totalForecasted / totalObserved
          : totalForecasted > 0
            ? 5
            : 0; // 5 is a cap for infinity

      return {
        subject: cat,
        CSI: csiCount > 0 ? parseFloat((totalCsi / csiCount).toFixed(3)) : 0,
        FAR: farCount > 0 ? parseFloat((totalFar / farCount).toFixed(3)) : 0,
        Observed: totalObserved,
        Forecasted: totalForecasted,
        Hits: totalHits,
        Misses: misses,
        FalseAlarms: falseAlarms,
        POD: parseFloat(pod.toFixed(3)),
        BIAS: parseFloat(bias.toFixed(3)),
      };
    });
  }, [verificationData]);

  if (!allRows.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#111d32] border border-[#1e3a5f] rounded-xl text-[#94a3b8] p-6 text-center">
        <Database size={48} className="mb-4 text-[#3b82f6]" />
        <h2 className="text-xl font-bold text-[#e2e8f0]">
          No QPF Data Available
        </h2>
        <p className="mt-2 text-sm mb-6">
          Please upload your Verification CSV or Excel file to view charts.
        </p>
        <div className="max-w-xs w-full">
          <Input
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileUpload}
            className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] file:bg-[#1a2d4a] file:text-white file:border-0 file:rounded file:px-4 file:py-1 cursor-pointer"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-end gap-4 bg-[#111d32] border border-[#1e3a5f] p-4 rounded-xl">
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Filter Sub-Basin
          </label>
          <select
            value={selectedSubBasin}
            onChange={(e) => setSelectedSubBasin(e.target.value)}
            className="bg-[#0d1f35] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded-md px-3 py-2 outline-none w-48"
          >
            <option value="All">All Basins</option>
            {QPF_BASINS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            <Calendar size={12} className="inline mr-1" />
            From Date
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            <Calendar size={12} className="inline mr-1" />
            To Date
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <input
            type="file"
            accept=".csv, .xlsx"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
          >
            <Upload size={16} className="mr-2" /> Upload CSV/Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Performance by Day (Bar) */}
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-md h-[400px] lg:col-span-2">
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-4">
            Multi-Day Accuracy & Skill Scores (PC, Usable, HSS)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={multiDayData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e3a5f"
                vertical={false}
              />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e3a5f",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar
                dataKey="PC"
                name="Percentage Correct (%)"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Usable"
                name="Usable Forecast (%)"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="HSS"
                name="Heidke Skill Score × 100"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Average CSI & FAR by Category (Line) */}
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-md h-[350px]">
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-4">
            Average Critical Success Index (CSI) & False Alarm Rate (FAR)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={categoryData}
              margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e3a5f"
                vertical={false}
              />
              <XAxis
                dataKey="subject"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e3a5f",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Line
                type="monotone"
                dataKey="CSI"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="FAR"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* NEW Chart 3: Probability of Detection (POD) & Bias Score */}
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-md h-[350px]">
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-4">
            Probability of Detection (POD) & Bias Score
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={categoryData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorPod" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e3a5f"
                vertical={false}
              />
              <XAxis
                dataKey="subject"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e3a5f",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Area
                type="monotone"
                dataKey="POD"
                name="POD (Hit Rate)"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorPod)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="BIAS"
                name="Bias Score"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* NEW Chart 4: Breakdown of Hits, Misses & False Alarms (Stacked Bar) */}
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-md h-[400px] lg:col-span-2">
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-4">
            Prediction Breakdown: Hits, Misses & False Alarms
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e3a5f"
                vertical={false}
              />
              <XAxis
                dataKey="subject"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e3a5f",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="Hits" stackId="a" fill="#10b981" />
              <Bar dataKey="Misses" stackId="a" fill="#ef4444" />
              <Bar
                dataKey="FalseAlarms"
                name="False Alarms"
                stackId="a"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* NEW Chart 5: Total Observed vs Forecasted Frequency */}
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-md h-[350px] lg:col-span-2">
          <h3 className="text-sm font-bold text-[#e2e8f0] mb-4">
            Total Observed vs Forecasted Frequency
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e3a5f"
                vertical={false}
              />
              <XAxis
                dataKey="subject"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e3a5f",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar
                dataKey="Observed"
                name="Observed Total"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Forecasted"
                name="Forecasted Total"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
