import { useState } from "react";
import { Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQPFStore } from "@/hooks/useQPFStore";
import type { RealisedRainfallEntry } from "@/types";
import { getToday } from "@/lib/utils";
import * as XLSX from "xlsx";
import { normalizeQPFValue } from "@/lib/qpfParser";

const QPF_BASINS = [
  "Gandak Nepal",
  "Kosi Nepal",
  "Burhi Gandak Nepal",
  "Bagmati Adhwara Nepal",
  "Mahananda Nepal",
  "Gandak",
  "Bagmati Adhwara",
  "Kosi",
  "Mahananda",
  "Sone",
  "Punpun/Dhab Nadi",
  "Kiul",
  "Chandan",
  "North Koel",
];

export default function QPFRealisedEntryPage() {
  const { updateRealised, realisedEntries, bulkImportFromCSV } = useQPFStore();
  const [date, setDate] = useState(() => getToday());
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");

  const currentData = QPF_BASINS.map((subBasin) => {
    const existing = realisedEntries.find(
      (r) => r.date === date && r.subBasin === subBasin,
    );
    return existing || { date, basin: "Ganga", subBasin, realisedMM: null };
  });

  const handleManualSave = () => {
    currentData.forEach((row) =>
      updateRealised(date, row.subBasin, row.realisedMM),
    );
    alert("Realised data saved!");
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

      const newForecasts: any[] = [];
      const newRealised: RealisedRainfallEntry[] = [];

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

      data.forEach((row) => {
        const getCol = (r: any, ...keys: string[]) => {
          for (const k of keys) if (r[k] !== undefined) return r[k];
          return undefined;
        };

        const rowDate = getCol(row, "Date", "date");
        if (!rowDate) return;
        const subBasin = getCol(
          row,
          "Name of Sub-Basin",
          "Sub-Basin",
          "subBasin",
        );
        if (!subBasin) return;

        // Parse Realised
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

        // Parse QPF Forecasts in the same sheet
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
      alert(
        `Imported ${newRealised.length} realised rows and ${newForecasts.length} forecast rows.`,
      );
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveTab("manual")}
          variant={activeTab === "manual" ? "default" : "outline"}
          className={
            activeTab === "manual"
              ? "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
              : "border-[#1e3a5f] text-[#e2e8f0]"
          }
        >
          Manual Entry
        </Button>
        <Button
          onClick={() => setActiveTab("upload")}
          variant={activeTab === "upload" ? "default" : "outline"}
          className={
            activeTab === "upload"
              ? "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
              : "border-[#1e3a5f] text-[#e2e8f0]"
          }
        >
          Upload Excel/CSV
        </Button>
      </div>

      {activeTab === "manual" ? (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
              Realised Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] w-48"
            />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[#0d1f35]">
              <tr>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-semibold">
                  Sub-Basin
                </th>
                <th className="text-center px-4 py-3 text-[#94a3b8] font-semibold">
                  Realised Rainfall (mm)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a5f]">
              {currentData.map((row, i) => (
                <tr
                  key={row.subBasin}
                  className={i % 2 === 0 ? "bg-[#111d32]" : "bg-[#0f1929]"}
                >
                  <td className="px-4 py-2.5 text-[#e2e8f0]">{row.subBasin}</td>
                  <td className="px-4 py-2 text-center">
                    <Input
                      type="number"
                      step="0.1"
                      value={row.realisedMM ?? ""}
                      onChange={(e) =>
                        updateRealised(
                          date,
                          row.subBasin,
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className="w-32 mx-auto bg-[#0d1f35] border-[#1e3a5f] text-[#10b981] text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleManualSave}
              className="bg-[#10b981] hover:bg-[#059669] text-white"
            >
              <Save size={16} className="mr-2" /> Save Realised
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-8 text-center">
          <Upload size={48} className="mx-auto text-[#3b82f6] mb-4" />
          <h3 className="text-lg font-medium text-[#e2e8f0] mb-2">
            Upload Excel / CSV Data
          </h3>
          <p className="text-sm text-[#94a3b8] mb-6">
            File must contain columns: Date, Name of Basin, Name of Sub-Basin,
            Day-1..Day-7, Realised Rainfall
          </p>
          <div className="max-w-xs mx-auto">
            <Input
              type="file"
              accept=".csv, .xlsx"
              onChange={handleFileUpload}
              className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
