import { useState, useMemo } from "react";
import {
  Download,
  Grid3X3,
  Target,
  TrendingUp,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForecastStore } from "@/hooks/useForecastStore";
import { CATEGORIES } from "@/types";
import { buildMatrix, computeSkillScores } from "@/lib/utils";
import KPICard from "@/components/ui/KPICard";
import Footer from "@/components/Footer";

export default function ContingencyAnalysisPage() {
  const { forecasts, realised } = useForecastStore();
  const [activeLeadDay, setActiveLeadDay] = useState<number>(1);

  const { matrix, scores } = useMemo(() => {
    const mat = buildMatrix(forecasts, realised, activeLeadDay);
    const sc = computeSkillScores(mat);
    return { matrix: mat, scores: sc };
  }, [forecasts, realised, activeLeadDay]);

  const exportCSV = () => {
    const csvRows = [];
    csvRows.push(`Contingency Matrix (Day-${activeLeadDay})`);
    csvRows.push(`OBSERVED \\ FORECAST,${CATEGORIES.join(",")},TOTAL`);

    CATEGORIES.forEach((cat, i) => {
      csvRows.push(`${cat},${matrix[i].join(",")}`);
    });
    csvRows.push(`TOTAL,${matrix[5].join(",")}`);

    csvRows.push("");
    csvRows.push(`Computed Values`);
    csvRows.push(`Parameter,${CATEGORIES.join(",")}`);
    csvRows.push(`Percentage Correct (PC),${scores.PC.toFixed(2)}`);
    csvRows.push(`Heidke Skill Score (HSS),${scores.HSS.toFixed(2)}`);

    const paramKeys = [
      { label: "Critical Success Index", key: "CSI" },
      { label: "Probability of Detection", key: "POD" },
      { label: "False Alarm Rate (FAR)", key: "FAR" },
      { label: "Missing Rate (MR)", key: "MR" },
      { label: "Correct Non-Occurrence", key: "CNON" },
      { label: "Bias For Occurrence", key: "BIAS" },
      { label: "True Skill Score (TSS)", key: "TSS" },
    ] as const;

    paramKeys.forEach(({ label, key }) => {
      const row: string[] = [label];
      CATEGORIES.forEach((cat) => {
        const val =
          scores[key as "CSI" | "POD" | "FAR" | "MR" | "CNON" | "BIAS" | "TSS"][
            cat
          ];
        row.push(val !== null ? val.toFixed(2) : "");
      });
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contingency_day${activeLeadDay}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  let bestCat = { name: "N/A", val: -1 };
  let worstCat = { name: "N/A", val: 2 };
  CATEGORIES.forEach((cat) => {
    const val = scores.CSI[cat];
    if (val !== null) {
      if (val > bestCat.val) bestCat = { name: cat, val };
      if (val < worstCat.val) worstCat = { name: cat, val };
    }
  });

  const formatScore = (val: number | null, isBias = false) => {
    if (val === null) {
      return (
        <td className="px-3 py-2 bg-slate-800/30 text-center border-l border-slate-600/50"></td>
      );
    }
    let colorClass = "text-slate-200";
    if (isBias && val > 1.0) colorClass = "text-blue-400 font-semibold";
    else if (val >= 0.75) colorClass = "text-green-400 font-semibold";
    else if (val >= 0.5) colorClass = "text-amber-400";
    else colorClass = "text-red-400";

    return (
      <td
        className={`px-3 py-2 text-center border-l border-slate-600/50 ${colorClass}`}
      >
        {val.toFixed(2)}
      </td>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#e2e8f0] flex items-center gap-2">
            <Grid3X3 className="text-amber-500" /> Contingency Analysis
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Auto-computed from forecast & realised entries
          </p>
        </div>
        <Button
          onClick={exportCSV}
          variant="outline"
          size="sm"
          disabled={scores.sampleSize === 0}
          className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
        >
          <Download size={16} className="mr-2" /> Export CSV
        </Button>
      </div>

      {/* Lead Day Selector */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setActiveLeadDay(d)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                  activeLeadDay === d
                    ? "bg-amber-500 text-black font-bold shadow-md"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                }`}
              >
                D{d}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-300 font-medium">
            Day-{activeLeadDay}{" "}
            <span className="text-slate-500">
              ({scores.sampleSize} samples)
            </span>
          </div>
        </div>
      </div>

      {scores.sampleSize === 0 ? (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-12 text-center text-[#64748b]">
          <Grid3X3 size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-slate-300">
            No verification data available for Day-{activeLeadDay}
          </p>
          <p className="text-sm mt-2">
            Enter forecast and realised data to compute contingency analysis
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard
              title="Overall PC"
              value={`${scores.PC.toFixed(2)}%`}
              icon={<Target size={22} />}
              color="#10b981"
            />
            <KPICard
              title="HSS Score"
              value={scores.HSS.toFixed(2)}
              icon={<TrendingUp size={22} />}
              color="#3b82f6"
            />
            <KPICard
              title="Best Category (CSI)"
              value={bestCat.name}
              subtitle={bestCat.val >= 0 ? `${bestCat.val.toFixed(2)}` : "N/A"}
              icon={<Trophy size={22} />}
              color="#f59e0b"
            />
            <KPICard
              title="Worst Category (CSI)"
              value={worstCat.name}
              subtitle={
                worstCat.val <= 1 && worstCat.val >= 0
                  ? `${worstCat.val.toFixed(2)}`
                  : "N/A"
              }
              icon={<AlertTriangle size={22} />}
              color="#ef4444"
            />
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* LEFT TABLE: Contingency Matrix */}
            <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto p-4">
                <div className="text-amber-500 font-bold mb-3 flex items-center justify-between">
                  <span>Day {activeLeadDay} :</span>
                  <span className="text-xs text-slate-400 font-normal border border-slate-600 px-2 py-1 rounded bg-slate-800">
                    Contingency Matrix
                  </span>
                </div>
                <table className="w-full text-sm border-collapse border border-slate-600">
                  <thead>
                    <tr>
                      <th className="bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-600 p-2 w-40 text-left">
                        OBSERVED ↓ / FORECAST →
                      </th>
                      {CATEGORIES.map((cat) => (
                        <th
                          key={`h-${cat}`}
                          className="bg-blue-900 text-white uppercase text-xs border border-slate-600 p-2 text-center w-16"
                        >
                          {cat}
                        </th>
                      ))}
                      <th className="bg-slate-700/80 text-amber-300 font-semibold text-xs border border-slate-600 p-2 text-center w-16">
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((obsCat, i) => (
                      <tr
                        key={`row-${obsCat}`}
                        className="hover:bg-slate-700/30 transition"
                      >
                        <td className="bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-600 p-2">
                          {obsCat}
                        </td>
                        {CATEGORIES.map((_fcstCat, j) => {
                          const val = matrix[i][j];
                          const isDiag = i === j;
                          const cellClass = isDiag
                            ? "bg-green-900/50 text-green-300 font-bold"
                            : val === 0
                              ? "text-slate-500 bg-slate-800"
                              : "text-slate-200 bg-slate-800";
                          return (
                            <td
                              key={`c-${i}-${j}`}
                              className={`border border-slate-600 p-2 text-center ${cellClass}`}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td className="bg-slate-700/80 text-amber-300 font-semibold border border-slate-600 p-2 text-center">
                          {matrix[i][5]}
                        </td>
                      </tr>
                    ))}
                    <tr className="hover:bg-slate-700/30 transition">
                      <td className="bg-slate-700/80 text-amber-300 font-semibold text-xs border border-slate-600 p-2">
                        TOTAL
                      </td>
                      {CATEGORIES.map((cat, j) => (
                        <td
                          key={`tf-${cat}`}
                          className="bg-slate-700/80 text-amber-300 font-semibold border border-slate-600 p-2 text-center"
                        >
                          {matrix[5][j]}
                        </td>
                      ))}
                      <td className="bg-slate-700/80 text-amber-300 font-bold border border-slate-600 p-2 text-center">
                        {matrix[5][5]}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT TABLE: Computed Skill Scores */}
            <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto p-4">
                <div className="text-amber-500 font-bold mb-3 flex items-center justify-between">
                  <span>Computed Values :</span>
                  <span className="text-xs text-slate-400 font-normal border border-slate-600 px-2 py-1 rounded bg-slate-800">
                    Skill Scores
                  </span>
                </div>
                <table className="w-full text-sm border-collapse border border-slate-600">
                  <thead>
                    <tr>
                      <th className="bg-slate-700 text-slate-300 font-medium text-xs border border-slate-600 p-2 text-left w-48">
                        Parameter
                      </th>
                      {CATEGORIES.map((cat) => (
                        <th
                          key={`s-h-${cat}`}
                          className="bg-blue-900 text-white uppercase text-xs border border-slate-600 p-2 text-center"
                        >
                          {cat}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600/50 border border-slate-600">
                    <tr className="bg-slate-800 hover:bg-slate-700/30 transition">
                      <td className="bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2">
                        Percentage Correct (PC)
                      </td>
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-center text-white font-bold text-base border-l border-slate-600/50"
                      >
                        {scores.PC.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-slate-800 hover:bg-slate-700/30 transition border-b border-slate-600">
                      <td className="bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2">
                        Heidke Skill Score (HSS)
                      </td>
                      <td
                        colSpan={5}
                        className="px-3 py-2 text-center text-white font-bold text-base border-l border-slate-600/50"
                      >
                        {scores.HSS.toFixed(2)}
                      </td>
                    </tr>

                    {[
                      { label: "Critical Success Index", key: "CSI" },
                      { label: "Probability of Detection", key: "POD" },
                      { label: "False Alarm Rate (FAR)", key: "FAR" },
                      { label: "Missing Rate (MR)", key: "MR" },
                      { label: "Correct Non-Occurrence", key: "CNON" },
                      {
                        label: "Bias For Occurrence",
                        key: "BIAS",
                        isBias: true,
                      },
                      { label: "True Skill Score (TSS)", key: "TSS" },
                    ].map((param) => (
                      <tr
                        key={param.key}
                        className="bg-slate-800 hover:bg-slate-700/30 transition"
                      >
                        <td className="bg-slate-700 text-slate-300 text-xs font-medium px-3 py-2">
                          {param.label}
                        </td>
                        {CATEGORIES.map((cat) =>
                          formatScore(
                            scores[
                              param.key as
                                | "CSI"
                                | "POD"
                                | "FAR"
                                | "MR"
                                | "CNON"
                                | "BIAS"
                                | "TSS"
                            ][cat],
                            param.isBias,
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
      <Footer />
    </div>
  );
}
