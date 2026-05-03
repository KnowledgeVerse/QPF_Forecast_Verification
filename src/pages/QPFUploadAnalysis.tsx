import { useState, useMemo } from "react";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseQPFCSV, type QPFRow, type CorrectionLog } from "@/lib/qpfParser";
import { buildVerificationData, type DayVerification } from "@/lib/qpfVerification";
import { QPF_CATEGORIES, QPF_BASINS } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

export default function QPFUploadAnalysis() {
  const [uploadedRows, setUploadedRows] = useState<QPFRow[]>([]);
  const [correctionLog, setCorrectionLog] = useState<CorrectionLog | null>(null);
  const [verificationData, setVerificationData] = useState<DayVerification[] | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubBasin, setSelectedSubBasin] = useState<string>("All");
  const [activeDay, setActiveDay] = useState<number>(1);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const { rows, correctionCounts } = parseQPFCSV(text);
        setUploadedRows(rows);
        setCorrectionLog(correctionCounts);
        setVerificationData(buildVerificationData(rows));
      }
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleApplyFilter = () => {
    setIsLoading(true);
    const filtered = uploadedRows.filter(r => selectedSubBasin === "All" || r.subBasin === selectedSubBasin);
    setVerificationData(buildVerificationData(filtered));
    setIsLoading(false);
  };

  const summaryStats = useMemo(() => {
    if (!uploadedRows.length) return null;
    const dates = Array.from(new Set(uploadedRows.map(r => r.date)));
    const expectedCells = dates.length * 8 * 7;
    let validCells = 0;
    uploadedRows.forEach(r => {
      ["day1","day2","day3","day4","day5","day6","day7"].forEach(d => {
        if (QPF_CATEGORIES.includes(r[d as keyof QPFRow] as any)) validCells++;
      });
    });
    const totalPairs = verificationData?.reduce((acc, curr) => acc + curr.totalCases, 0) || 0;
    
    return {
      totalDates: dates.length,
      dateRange: dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : "",
      completeness: expectedCells > 0 ? ((validCells / expectedCells) * 100).toFixed(1) : "0",
      totalPairs
    };
  }, [uploadedRows, verificationData]);

  const chartData = useMemo(() => {
    if (!verificationData) return [];
    return verificationData.map(d => ({
      name: `Day-${d.day}`,
      PC: parseFloat(d.pc.toFixed(2)),
      Usable: parseFloat(d.usable.toFixed(2)),
      HSS: parseFloat((d.hss * 100).toFixed(2))
    }));
  }, [verificationData]);

  const getCellColor = (val: number, max: number, isDiag: boolean) => {
    if (val === 0) return "bg-[#0d1f35]";
    const ratio = val / (max || 1);
    if (isDiag) {
      if (ratio > 0.75) return "bg-[#16a34a] text-white"; // green-600
      if (ratio > 0.50) return "bg-[#22c55e] text-white"; // green-500
      if (ratio > 0.25) return "bg-[#86efac] text-black"; // green-300
      return "bg-[#dcfce3] text-black";                   // green-100
    } else {
      if (ratio > 0.75) return "bg-[#ef4444] text-white"; // red-500
      if (ratio > 0.50) return "bg-[#f87171] text-black"; // red-400
      if (ratio > 0.25) return "bg-[#fca5a5] text-black"; // red-300
      return "bg-[#fef2f2] text-black";                   // red-50
    }
  };

  const activeData = verificationData?.find(d => d.day === activeDay);
  const maxDiag = activeData ? Math.max(...activeData.matrix.map((row, i) => row[i])) : 1;
  const maxOffDiag = activeData ? Math.max(...activeData.matrix.flatMap((row, i) => row.filter((_, j) => i !== j))) : 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Upload Section */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-8 text-center shadow-md">
        <FileSpreadsheet size={48} className="mx-auto text-[#3b82f6] mb-4"/>
        <h3 className="text-lg font-medium text-[#e2e8f0] mb-2">Upload QPF Verification CSV</h3>
        <p className="text-sm text-[#94a3b8] mb-6">File must contain exact standard 11 columns starting with "Date" and ending with "Realized Rainfall".</p>
        <div className="max-w-sm mx-auto">
          <Input type="file" accept=".csv" onChange={handleFileUpload} disabled={isLoading} className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] file:bg-[#1a2d4a] file:text-white file:border-0 file:rounded file:px-4 file:py-1 cursor-pointer" />
        </div>
      </div>

      {isLoading && <div className="text-center py-4 text-[#3b82f6] animate-pulse">Processing Analysis...</div>}

      {uploadedRows.length > 0 && !isLoading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Corruption Banner */}
          {correctionLog && correctionLog.total > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-4 flex items-start gap-4">
              <AlertTriangle className="text-yellow-500 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-500 font-bold mb-1 text-sm">⚠ Data Auto-Corrected: Excel had corrupted {correctionLog.total} QPF values</h4>
                <p className="text-yellow-200/80 text-xs">
                  (25-Nov→11-25: <b>{correctionLog["25-Nov"]}</b>), 
                  (26-37→26-50: <b>{correctionLog["26-37"]}</b>), 
                  (38-50→26-50: <b>{correctionLog["38-50"]}</b>), 
                  (51-75→51-100: <b>{correctionLog["51-75"]}</b>), 
                  (76-100→51-100: <b>{correctionLog["76-100"]}</b>).
                  These anomalies were fixed before calculating verification metrics.
                </p>
              </div>
            </div>
          )}

          {/* Filtering */}
          <div className="bg-[#111d32] border border-[#1e3a5f] p-4 rounded-xl flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">Filter Sub-Basin</label>
              <select value={selectedSubBasin} onChange={(e) => setSelectedSubBasin(e.target.value)} className="bg-[#0d1f35] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded-md px-3 py-2 outline-none">
                <option value="All">All Basins (Combined)</option>
                {QPF_BASINS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <Button onClick={handleApplyFilter} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Apply Filter</Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111d32] border border-[#1e3a5f] p-5 rounded-xl text-center shadow-md">
              <p className="text-xs text-[#94a3b8] uppercase font-bold tracking-wide">Total Dates</p>
              <p className="text-2xl font-bold text-[#3b82f6] mt-1">{summaryStats?.totalDates}</p>
            </div>
            <div className="bg-[#111d32] border border-[#1e3a5f] p-5 rounded-xl text-center shadow-md">
              <p className="text-xs text-[#94a3b8] uppercase font-bold tracking-wide">Season Range</p>
              <p className="text-sm font-bold text-[#10b981] mt-3">{summaryStats?.dateRange}</p>
            </div>
            <div className="bg-[#111d32] border border-[#1e3a5f] p-5 rounded-xl text-center shadow-md">
              <p className="text-xs text-[#94a3b8] uppercase font-bold tracking-wide">Verified Pairs</p>
              <p className="text-2xl font-bold text-[#f59e0b] mt-1">{summaryStats?.totalPairs}</p>
            </div>
            <div className="bg-[#111d32] border border-[#1e3a5f] p-5 rounded-xl text-center shadow-md">
              <p className="text-xs text-[#94a3b8] uppercase font-bold tracking-wide">Data Completeness</p>
              <p className="text-2xl font-bold text-[#8b5cf6] mt-1">{summaryStats?.completeness}%</p>
            </div>
          </div>

          {/* Main Visualizations */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Day Verification Panel */}
            <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden shadow-md flex flex-col">
              <div className="flex flex-wrap bg-[#0d1f35] border-b border-[#1e3a5f]">
                {[1,2,3,4,5,6,7].map(d => {
                  const vd = verificationData?.find(v => v.day === d);
                  return (
                    <button key={d} onClick={() => setActiveDay(d)} className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${activeDay === d ? "bg-[#1a2d4a] border-[#3b82f6] text-[#3b82f6]" : "border-transparent text-[#94a3b8] hover:text-[#e2e8f0]"}`}>
                      Day-{d} {vd ? `(${Math.round(vd.pc)}%)` : ""}
                    </button>
                  );
                })}
              </div>

              {activeData && (
                <div className="p-6 flex-1 overflow-auto">
                  <div className="mb-6 flex justify-between">
                    <div><p className="text-xs text-[#94a3b8] mb-1">Percentage Correct</p><p className="text-xl font-black text-[#10b981]">{activeData.pc.toFixed(2)}%</p></div>
                    <div><p className="text-xs text-[#94a3b8] mb-1">Usable (±1 Cat)</p><p className="text-xl font-black text-[#f59e0b]">{activeData.usable.toFixed(2)}%</p></div>
                    <div>
                      <p className="text-xs text-[#94a3b8] mb-1">Heidke Skill Score</p>
                      <p className={`text-xl font-black ${activeData.hss > 0.3 ? 'text-[#10b981]' : activeData.hss > 0.1 ? 'text-[#facc15]' : 'text-[#ef4444]'}`}>
                        {activeData.hss.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-[#94a3b8] uppercase mb-3">Confusion Matrix (Observed × Forecast)</h4>
                  <div className="overflow-x-auto rounded-lg border border-[#1e3a5f]">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead className="bg-[#0d1f35] border-b border-[#1e3a5f]">
                        <tr>
                          <th className="p-2 border-r border-[#1e3a5f] text-left">Obs \ Fcst</th>
                          {QPF_CATEGORIES.map(c => <th key={c} className="p-2 border-r border-[#1e3a5f] font-mono">{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {activeData.matrix.map((row, i) => (
                          <tr key={i} className="border-b border-[#1e3a5f] last:border-0">
                            <td className="p-2 font-mono bg-[#0d1f35] border-r border-[#1e3a5f] font-bold text-left">{QPF_CATEGORIES[i]}</td>
                            {row.map((val, j) => {
                              const isDiag = i === j;
                              return (
                                <td key={j} className={`p-2 border-r border-[#1e3a5f] transition-colors ${getCellColor(val, isDiag ? maxDiag : maxOffDiag, isDiag)}`}>
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-xs font-bold text-[#94a3b8] uppercase mb-3">Category Analysis</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {QPF_CATEGORIES.map((cat, i) => (
                        <div key={cat} className="bg-[#0d1f35] border border-[#1e3a5f] p-2.5 rounded">
                          <p className="text-[10px] text-[#94a3b8] font-bold mb-1">CSI: {cat}</p>
                          <p className="text-sm font-mono text-[#e2e8f0]">
                            {activeData.csiPerCategory[i] !== null ? (activeData.csiPerCategory[i] as number).toFixed(3) : "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Season Charts Panel */}
            <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-md flex flex-col">
              <h3 className="text-sm font-bold text-[#e2e8f0] mb-6">Multi-Day Performance Metrics</h3>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e3a5f', color: '#e2e8f0', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="PC" name="Percentage Correct (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Usable" name="Usable Forecast (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="HSS" name="HSS × 100" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}