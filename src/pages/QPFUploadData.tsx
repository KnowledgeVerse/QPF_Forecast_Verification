import { useState } from "react";
import {
  Database,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQPFStore } from "@/hooks/useQPFStore";
import { normalizeQPFValue } from "@/lib/qpfParser";
import type { RealisedRainfallEntry, QPFForecastEntry } from "@/types";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

export default function QPFUploadDataPage() {
  const { qpfSessions, realisedEntries, bulkImportFromCSV } = useQPFStore();
  const navigate = useNavigate();

  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

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

    setIsLoading(true);
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
        setMessage(
          `Successfully imported ${newRealised.length} realised records and ${newForecasts.length} forecasts from ${file.name}.`,
        );
        setIsSuccess(true);
      } catch (error) {
        alert("Error parsing file. Please check the format.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const loadDefaultData = async () => {
    setIsLoading(true);
    try {
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

      bulkImportFromCSV(newForecasts, newRealised);
      setMessage("Default Backup 'QPF varifiacation.csv' loaded successfully!");
      setIsSuccess(true);
    } catch (error) {
      alert(
        `Could not load default data. Error: ${(error as Error).message}\nPlease ensure the file is in the 'public/Backup' folder.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pt-6 animate-in fade-in duration-500">
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-8 text-center shadow-lg">
        <Database size={64} className="mx-auto text-[#3b82f6] mb-6" />
        <h2 className="text-3xl font-bold text-[#e2e8f0] mb-2">
          Upload QPF Data
        </h2>
        <p className="text-[#94a3b8] mb-8 max-w-lg mx-auto">
          Upload your QPF Verification CSV or Excel file here, or load the
          default backup to populate the database for reports and charts.
        </p>

        {!isSuccess ? (
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto justify-center">
            <Button
              onClick={loadDefaultData}
              disabled={isLoading}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white flex-1 py-6 text-base font-semibold shadow-md transition-all"
            >
              <Database size={20} className="mr-2" />{" "}
              {isLoading ? "Loading..." : "Load Default Backup"}
            </Button>
            <div className="relative flex-1">
              <Input
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button
                variant="outline"
                className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a] w-full py-6 text-base font-semibold"
              >
                <Upload size={20} className="mr-2" /> Upload Manual File
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] p-4 rounded-lg flex items-center justify-center gap-3">
              <CheckCircle2 size={24} />
              <span className="font-semibold text-lg">{message}</span>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => navigate("/QPF_Verification_Report")}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
              >
                <ClipboardCheck size={18} className="mr-2" /> Go to Verification
                Report
              </Button>
              <Button
                onClick={() => navigate("/QPF_Analytics_Charts")}
                className="bg-[#10b981] hover:bg-[#059669] text-white"
              >
                <BarChart3 size={18} className="mr-2" /> Go to Analytics Charts
              </Button>
            </div>
            <div className="pt-4 mt-4 border-t border-[#1e3a5f]">
              <Button
                variant="ghost"
                onClick={() => setIsSuccess(false)}
                className="text-[#94a3b8] hover:text-[#e2e8f0]"
              >
                Upload another file
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0d1f35] border border-[#1e3a5f] p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#94a3b8] uppercase">
              Total QPF Sessions
            </p>
            <p className="text-3xl font-black text-[#e2e8f0] mt-1">
              {qpfSessions.length}
            </p>
          </div>
          <FileSpreadsheet size={40} className="text-[#3b82f6] opacity-50" />
        </div>
        <div className="bg-[#0d1f35] border border-[#1e3a5f] p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#94a3b8] uppercase">
              Total Realised Entries
            </p>
            <p className="text-3xl font-black text-[#e2e8f0] mt-1">
              {realisedEntries.length}
            </p>
          </div>
          <Database size={40} className="text-[#10b981] opacity-50" />
        </div>
      </div>
    </div>
  );
}
