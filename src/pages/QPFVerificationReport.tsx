import { useState, useMemo, useRef, useEffect } from "react";
import { Database, Download, Calendar, Upload, BarChart3 } from "lucide-react";
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
} from "recharts";

export default function QPFVerificationReport() {
  const { qpfSessions, realisedEntries, bulkImportFromCSV } = useQPFStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSubBasin, setSelectedSubBasin] = useState<string>("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeDay, setActiveDay] = useState<number>(1);
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

      if (newForecasts.length === 0 && newRealised.length === 0) {
        alert(
          "Data upload failed! Please check your CSV column names (Date, Name of Sub-Basin, QPF issued valid for Day-1, Realized Rainfall in mm).",
        );
        return;
      }

      bulkImportFromCSV(newForecasts, newRealised);
      alert(`Successfully imported data from ${file.name}`);
    };
    reader.readAsBinaryString(file);
  };

  const loadDefaultData = async () => {
    try {
      // Fix path for Hostinger / production
      const fileUrl = import.meta.env.BASE_URL + "Backup/QPF varifiacation.csv";
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Default backup file not found.");
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array", raw: true });
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

      if (newForecasts.length === 0 && newRealised.length === 0) {
        alert(
          "Default data loaded, but columns did not match. Please verify your CSV headers.",
        );
        return;
      }

      bulkImportFromCSV(newForecasts, newRealised);
      alert("Default Backup loaded successfully! Report and Charts are ready.");
    } catch (error) {
      alert(
        `Could not load default data. Error: ${(error as Error).message}\nPlease ensure the file is in the 'public/Backup' folder.`,
      );
    }
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
      if (m !== -1) {
        return new Date(
          new Date().getFullYear(),
          m,
          parseInt(parts[0], 10),
        ).getTime();
      }
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
      const matchesDate =
        (!fromDate || rTs >= fromTs) && (!toDate || rTs <= toTs);
      return matchesBasin && matchesDate;
    });
  }, [allRows, selectedSubBasin, fromDate, toDate]);

  const verificationData = useMemo(
    () => buildVerificationData(filteredRows),
    [filteredRows],
  );

  const multiDayData = useMemo(() => {
    if (!verificationData) return [];
    return verificationData.map((d) => ({
      name: `Day-${d.day}`,
      PC: parseFloat(d.pc.toFixed(2)),
      Usable: parseFloat(d.usable.toFixed(2)),
      HSS: parseFloat((d.hss * 100).toFixed(2)),
    }));
  }, [verificationData]);

  const categoryData = useMemo(() => {
    if (!verificationData) return [];
    return QPF_CATEGORIES.map((cat, i) => {
      let totalCsi = 0,
        csiCount = 0,
        totalFar = 0,
        farCount = 0;
      verificationData.forEach((d) => {
        if (d.csiPerCategory[i] !== null) {
          totalCsi += d.csiPerCategory[i]!;
          csiCount++;
        }
        if (d.farPerCategory[i] !== null) {
          totalFar += d.farPerCategory[i]!;
          farCount++;
        }
      });
      return {
        subject: cat,
        CSI: csiCount > 0 ? parseFloat((totalCsi / csiCount).toFixed(3)) : 0,
        FAR: farCount > 0 ? parseFloat((totalFar / farCount).toFixed(3)) : 0,
      };
    });
  }, [verificationData]);

  const activeData = verificationData?.find((d) => d.day === activeDay);
  const maxDiag = activeData
    ? Math.max(...activeData.matrix.map((row, i) => row[i]))
    : 1;
  const maxOffDiag = activeData
    ? Math.max(
        ...activeData.matrix.flatMap((row, i) => row.filter((_, j) => i !== j)),
      )
    : 1;

  const getCellColor = (val: number, max: number, isDiag: boolean) => {
    if (val === 0) return "bg-[#0d1f35]";
    const ratio = val / (max || 1);
    if (isDiag) {
      if (ratio > 0.75) return "bg-[#16a34a] text-white";
      if (ratio > 0.5) return "bg-[#22c55e] text-white";
      if (ratio > 0.25) return "bg-[#86efac] text-black";
      return "bg-[#dcfce3] text-black";
    } else {
      if (ratio > 0.75) return "bg-[#ef4444] text-white";
      if (ratio > 0.5) return "bg-[#f87171] text-black";
      if (ratio > 0.25) return "bg-[#fca5a5] text-black";
      return "bg-[#fef2f2] text-black";
    }
  };

  // NEW: Detailed Metrics Calculation
  const detailedMetrics = useMemo(() => {
    if (!activeData) return [];
    return QPF_CATEGORIES.map((cat, i) => {
      const hits = activeData.matrix[i][i];
      const observed = activeData.matrix[i].reduce((sum, val) => sum + val, 0);
      const forecasted = activeData.matrix.reduce(
        (sum, row) => sum + row[i],
        0,
      );
      const misses = observed - hits;
      const falseAlarms = forecasted - hits;

      const pod = observed > 0 ? hits / observed : 0;
      const bias =
        observed > 0 ? forecasted / observed : forecasted > 0 ? 5 : 0; // 5 acts as infinity cap for charts
      const far =
        activeData.farPerCategory[i] !== null
          ? activeData.farPerCategory[i]
          : 0;
      const csi =
        activeData.csiPerCategory[i] !== null
          ? activeData.csiPerCategory[i]
          : 0;

      return {
        category: cat,
        observed,
        forecasted,
        hits,
        misses,
        falseAlarms,
        pod: pod.toFixed(3),
        podNumeric: parseFloat(pod.toFixed(3)),
        far: typeof far === "number" ? far.toFixed(3) : "-",
        csi: typeof csi === "number" ? csi.toFixed(3) : "-",
        bias: observed === 0 && forecasted > 0 ? ">999" : bias.toFixed(3),
        biasNumeric: parseFloat(bias.toFixed(3)),
      };
    });
  }, [activeData]);

  const handleExportCSV = () => {
    if (!activeData) return;
    let csv = `QPF Verification Report - Day ${activeDay}\n`;
    csv += `Sub-Basin Filter: ${selectedSubBasin}\n`;
    csv += `Date Range: ${fromDate || "All"} to ${toDate || "All"}\n\n`;
    csv += "Observed \\ Forecast," + QPF_CATEGORIES.join(",") + ",Total\n";

    activeData.matrix.forEach((row, i) => {
      const rowTotal = row.reduce((a, b) => a + b, 0);
      csv += QPF_CATEGORIES[i] + "," + row.join(",") + "," + rowTotal + "\n";
    });

    csv += "\nMetrics,Value\n";
    csv += `Percentage Correct (PC),${activeData.pc.toFixed(2)}%\n`;
    csv += `Usable Forecast (±1 Cat),${activeData.usable.toFixed(2)}%\n`;
    csv += `Heidke Skill Score (HSS),${activeData.hss.toFixed(3)}\n\n`;

    csv +=
      "Category,Observed,Forecasted,Hits,Misses,False Alarms,POD,FAR,CSI,BIAS\n";
    detailedMetrics.forEach((row) => {
      csv += `${row.category},${row.observed},${row.forecasted},${row.hits},${row.misses},${row.falseAlarms},${row.pod},${row.far},${row.csi},${row.bias}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `QPF_Verification_Day${activeDay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!allRows.length) {
    return (
      <div className="flex flex-col items-center justify-center h-auto min-h-[400px] bg-[#111d32] border border-[#1e3a5f] rounded-xl text-[#94a3b8] p-8 text-center shadow-md">
        <Database size={64} className="mb-4 text-[#3b82f6]" />
        <h2 className="text-2xl font-bold text-[#e2e8f0]">
          No QPF Data Available
        </h2>
        <p className="mt-3 text-sm mb-8 max-w-md">
          Please upload your Verification CSV/Excel file or load the default
          backup to view the report and analysis charts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto justify-center">
          <Button
            onClick={loadDefaultData}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white flex-1 py-6"
          >
            <Database size={18} className="mr-2" /> Load Default Data
          </Button>
          <div className="relative flex-1">
            <Input
              type="file"
              accept=".csv, .xlsx"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button
              variant="outline"
              className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a] w-full py-6 pointer-events-none"
            >
              <Upload size={18} className="mr-2" /> Upload Manual CSV
            </Button>
          </div>
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
          <Button
            onClick={handleExportCSV}
            className="bg-[#10b981] hover:bg-[#059669] text-white"
          >
            <Download size={16} className="mr-2" /> Save / Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden shadow-md flex flex-col">
        <div className="flex flex-wrap bg-[#0d1f35] border-b border-[#1e3a5f]">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const vd = verificationData?.find((v) => v.day === d);
            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${activeDay === d ? "bg-[#1a2d4a] border-[#3b82f6] text-[#3b82f6]" : "border-transparent text-[#94a3b8] hover:text-[#e2e8f0]"}`}
              >
                Day-{d} {vd ? `(${Math.round(vd.pc)}%)` : ""}
              </button>
            );
          })}
        </div>

        {activeData && (
          <div className="p-6 overflow-auto">
            <div className="mb-6 flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-xs text-[#94a3b8] mb-1">
                  Total Verified Pairs
                </p>
                <p className="text-xl font-black text-[#e2e8f0]">
                  {activeData.totalCases}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] mb-1">
                  Percentage Correct
                </p>
                <p className="text-xl font-black text-[#10b981]">
                  {activeData.pc.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] mb-1">Usable (±1 Cat)</p>
                <p className="text-xl font-black text-[#f59e0b]">
                  {activeData.usable.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] mb-1">
                  Heidke Skill Score
                </p>
                <p
                  className={`text-xl font-black ${activeData.hss > 0.3 ? "text-[#10b981]" : activeData.hss > 0.1 ? "text-[#facc15]" : "text-[#ef4444]"}`}
                >
                  {activeData.hss.toFixed(3)}
                </p>
              </div>
            </div>

            <h4 className="text-xs font-bold text-[#94a3b8] uppercase mb-3">
              Confusion Matrix (Observed × Forecast)
            </h4>
            <div className="overflow-x-auto rounded-lg border border-[#1e3a5f] mb-8">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-[#0d1f35] border-b border-[#1e3a5f]">
                  <tr>
                    <th className="p-3 border-r border-[#1e3a5f] text-left">
                      Obs \ Fcst
                    </th>
                    {QPF_CATEGORIES.map((c) => (
                      <th
                        key={c}
                        className="p-3 border-r border-[#1e3a5f] font-mono"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeData.matrix.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#1e3a5f] last:border-0"
                    >
                      <td className="p-3 font-mono bg-[#0d1f35] border-r border-[#1e3a5f] font-bold text-left">
                        {QPF_CATEGORIES[i]}
                      </td>
                      {row.map((val, j) => {
                        const isDiag = i === j;
                        return (
                          <td
                            key={j}
                            className={`p-3 border-r border-[#1e3a5f] transition-colors ${getCellColor(val, isDiag ? maxDiag : maxOffDiag, isDiag)}`}
                          >
                            {val > 0 ? val : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="text-xs font-bold text-[#94a3b8] uppercase mb-3">
              Category-wise Analysis
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {QPF_CATEGORIES.map((cat, i) => (
                <div
                  key={cat}
                  className="bg-[#0d1f35] border border-[#1e3a5f] p-3 rounded-lg text-center shadow-sm"
                >
                  <p className="text-sm font-bold text-[#e2e8f0] mb-2">{cat}</p>
                  <div className="flex justify-between px-2 mb-1">
                    <span className="text-[10px] text-[#94a3b8]">CSI</span>
                    <span className="text-xs font-mono text-[#3b82f6]">
                      {activeData.csiPerCategory[i] !== null
                        ? (activeData.csiPerCategory[i] as number).toFixed(3)
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between px-2">
                    <span className="text-[10px] text-[#94a3b8]">FAR</span>
                    <span className="text-xs font-mono text-[#ef4444]">
                      {activeData.farPerCategory[i] !== null
                        ? (activeData.farPerCategory[i] as number).toFixed(3)
                        : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* NEW: Detailed Metrics Table */}
            <h4 className="text-xs font-bold text-[#94a3b8] uppercase mt-8 mb-3">
              Detailed Metrics Breakdown (Day-{activeDay})
            </h4>
            <div className="overflow-x-auto rounded-lg border border-[#1e3a5f] mb-8">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-[#0d1f35] border-b border-[#1e3a5f] text-[#94a3b8]">
                  <tr>
                    <th className="p-3 border-r border-[#1e3a5f] text-left">
                      Category
                    </th>
                    <th className="p-3 border-r border-[#1e3a5f]">Observed</th>
                    <th className="p-3 border-r border-[#1e3a5f]">
                      Forecasted
                    </th>
                    <th className="p-3 border-r border-[#1e3a5f] text-[#10b981]">
                      Hits
                    </th>
                    <th className="p-3 border-r border-[#1e3a5f] text-[#ef4444]">
                      Misses
                    </th>
                    <th className="p-3 border-r border-[#1e3a5f] text-[#f59e0b]">
                      False Alarms
                    </th>
                    <th
                      className="p-3 border-r border-[#1e3a5f]"
                      title="Probability of Detection (Hits / Observed)"
                    >
                      POD
                    </th>
                    <th className="p-3 border-r border-[#1e3a5f]">FAR</th>
                    <th className="p-3 border-r border-[#1e3a5f]">CSI</th>
                    <th
                      className="p-3"
                      title="Bias Score (Forecasted / Observed)"
                    >
                      BIAS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailedMetrics.map((row) => (
                    <tr
                      key={row.category}
                      className="border-b border-[#1e3a5f] last:border-0 hover:bg-[#1a2d4a]/30 transition-colors"
                    >
                      <td className="p-3 font-mono bg-[#0d1f35] border-r border-[#1e3a5f] font-bold text-left text-[#e2e8f0]">
                        {row.category}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] text-[#e2e8f0]">
                        {row.observed}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] text-[#e2e8f0]">
                        {row.forecasted}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] font-bold text-[#10b981]">
                        {row.hits}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] text-[#ef4444]">
                        {row.misses}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] text-[#f59e0b]">
                        {row.falseAlarms}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] font-mono text-[#3b82f6]">
                        {row.pod}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] font-mono text-[#ef4444]">
                        {row.far}
                      </td>
                      <td className="p-3 border-r border-[#1e3a5f] font-mono text-[#10b981]">
                        {row.csi}
                      </td>
                      <td className="p-3 font-mono text-[#8b5cf6]">
                        {row.bias}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* NEW: CHARTS ADDED DIRECTLY TO REPORT PAGE */}
            <div className="mt-10 border-t border-[#1e3a5f] pt-8">
              <h4 className="text-sm font-bold text-[#e2e8f0] uppercase mb-6 flex items-center gap-2">
                <BarChart3 size={18} className="text-[#3b82f6]" /> Performance
                Charts Overview
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-4 shadow-sm h-[350px]">
                  <h5 className="text-[10px] font-bold text-[#94a3b8] mb-4 text-center uppercase tracking-wider">
                    Multi-Day Accuracy & Skill Scores
                  </h5>
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
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                      />
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
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      />
                      <Bar
                        dataKey="PC"
                        name="Percentage Correct"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Usable"
                        name="Usable Forecast"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="HSS"
                        name="HSS × 100"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-4 shadow-sm h-[350px]">
                  <h5 className="text-[10px] font-bold text-[#94a3b8] mb-4 text-center uppercase tracking-wider">
                    Average CSI & FAR by Category
                  </h5>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
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
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      />
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
              </div>

              {/* NEW: Detailed Meteorological Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-4 shadow-sm h-[350px]">
                  <h5 className="text-[10px] font-bold text-[#94a3b8] mb-4 text-center uppercase tracking-wider">
                    Observed vs Forecasted Frequency
                  </h5>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={detailedMetrics}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e3a5f"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="category"
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
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      />
                      <Bar
                        dataKey="observed"
                        name="Observed Count"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="forecasted"
                        name="Forecasted Count"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-4 shadow-sm h-[350px]">
                  <h5 className="text-[10px] font-bold text-[#94a3b8] mb-4 text-center uppercase tracking-wider">
                    Probability of Detection (POD) & Bias Score
                  </h5>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={detailedMetrics}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e3a5f"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="category"
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
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="podNumeric"
                        name="POD (Hit Rate)"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="biasNumeric"
                        name="Bias Score"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
