import { useState, useEffect, useRef } from "react";
import {
  Save,
  Trash2,
  Copy,
  Eraser,
  Check,
  Map as MapIcon,
  DownloadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQPFStore } from "@/hooks/useQPFStore";
import type { QPFForecastEntry } from "@/types";
import { getToday } from "@/lib/utils";
import MapMultiSelect from "@/components/MapMultiSelect";
import html2canvas from "html2canvas";

const QPF_COLORS: Record<string, { bg: string; text: string }> = {
  "0": { bg: "#ffffff", text: "#1f2937" },
  "0.1-10": { bg: "#bbf7d0", text: "#14532d" },
  "11-25": { bg: "#22c55e", text: "#ffffff" },
  "26-50": { bg: "#facc15", text: "#111827" },
  "51-100": { bg: "#f97316", text: "#ffffff" },
  ">100": { bg: "#dc2626", text: "#ffffff" },
};

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

export default function QPFForecastEntryPage() {
  const {
    qpfSessions,
    saveCurrentSession,
    getSessionByDate,
    deleteSession,
    duplicatePrevSession,
  } = useQPFStore();
  const [issueDate, setIssueDate] = useState(() => getToday());
  const [grid, setGrid] = useState<QPFForecastEntry[]>([]);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [bulkValue, setBulkValue] = useState<string>("0");
  const [isEditing, setIsEditing] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const isCtrlPressed = useRef(false);

  // Map mode states
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedMapBasins, setSelectedMapBasins] = useState<string[]>([]);
  const [selectedMapDays, setSelectedMapDays] = useState<Set<string>>(
    new Set(["day1"]),
  );
  const [mapViewDays, setMapViewDays] = useState<Set<string>>(
    new Set(["day1"]),
  );
  const [mapLayer, setMapLayer] = useState("m"); // 'm' = street, 's' = satellite, 'p' = terrain
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const days = [
    "day1",
    "day2",
    "day3",
    "day4",
    "day5",
    "day6",
    "day7",
  ] as const;

  useEffect(() => {
    const existing = getSessionByDate(issueDate);
    if (existing) {
      setGrid(existing.forecasts);
      setIsEditing(true);
    } else {
      setGrid(
        QPF_BASINS.map((b) => ({
          issueDate,
          basin: "Ganga",
          subBasin: b,
          day1: "0",
          day2: "0",
          day3: "0",
          day4: "0",
          day5: "0",
          day6: "0",
          day7: "0",
        })),
      );
      setIsEditing(false);
    }
    setSelectedCells(new Set());
  }, [issueDate, getSessionByDate]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) isCtrlPressed.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) isCtrlPressed.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mouseup", () => setIsDragging(false));
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const handleCellClick = (subBasin: string, day: string) => {
    const key = `${subBasin}|${day}`;
    if (isCtrlPressed.current) {
      setSelectedCells((prev) => {
        const n = new Set(prev);
        n.has(key) ? n.delete(key) : n.add(key);
        return n;
      });
    } else {
      setSelectedCells(new Set([key]));
    }
  };

  const applyBulkEdit = () => {
    setGrid((prev) =>
      prev.map((row) => {
        const updatedRow = { ...row };
        days.forEach((d) => {
          if (selectedCells.has(`${row.subBasin}|${d}`))
            updatedRow[d] = bulkValue;
        });
        return updatedRow;
      }),
    );
    setSelectedCells(new Set());
  };

  // Sequence Image Downloader (html2canvas)
  const handleDownloadAllImages = async () => {
    setIsGeneratingImages(true);
    // Give maps 3 seconds to fully mount and download Google Web Tiles
    setTimeout(async () => {
      try {
        const daysToPrint = [
          "day1",
          "day2",
          "day3",
          "day4",
          "day5",
          "day6",
          "day7",
          "legend",
        ];
        for (const d of daysToPrint) {
          const el = document.getElementById(`export-map-${d}`);
          if (el) {
            const canvas = await html2canvas(el, {
              useCORS: true,
              allowTaint: true,
              scale: 2,
              backgroundColor: "#ffffff",
            });
            const link = document.createElement("a");
            link.download = `QPF_Forecast_${d}_${issueDate}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            // Prevent browser from blocking mass downloads
            await new Promise((res) => setTimeout(res, 800));
          }
        }
      } catch (err) {
        console.error("Image Export Error:", err);
        alert("Failed to export some images. Please check console.");
      } finally {
        setIsGeneratingImages(false);
      }
    }, 3000);
  };

  const applyMapBulkEdit = () => {
    if (selectedMapBasins.length === 0 || selectedMapDays.size === 0) return;
    setGrid((prev) =>
      prev.map((row) => {
        if (selectedMapBasins.includes(row.subBasin)) {
          const updatedRow = { ...row };
          selectedMapDays.forEach((d) => {
            (updatedRow as any)[d] = bulkValue;
          });
          return updatedRow;
        }
        return row;
      }),
    );
  };

  const handleSave = () => {
    saveCurrentSession(issueDate, grid);
    setIsEditing(true);
  };

  // Hidden report container print handler
  const handlePrintReport = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 1500); // Give maps 1.5s to render tiles before opening print dialog
  };

  // Date Formatting Helper (Calculates exact date for Day 1 to Day 7)
  const formatPrintDate = (baseDate: string, dStr: string) => {
    if (dStr === "legend") return "Sub-Basin Reference Legend";
    const dayOffset = parseInt(dStr.replace("day", ""));

    const parts = baseDate.split("-");
    const dateObj = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
    dateObj.setDate(dateObj.getDate() + (dayOffset - 1)); // Day 1 = +0 days, Day 2 = +1 days

    const dd = String(dateObj.getDate()).padStart(2, "0");
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const yyyy = dateObj.getFullYear();
    const issueFormatted =
      parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : baseDate;

    return `QPF Forecast Date: ${issueFormatted} | Day ${dayOffset} (${dd}-${mm}-${yyyy})`;
  };

  return (
    <div
      className={
        viewMode === "map" ? "flex flex-col lg:flex-row gap-4" : "space-y-4"
      }
    >
      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report { position: absolute; left: 0; top: 0; width: 100%; display: flex; flex-direction: column; align-items: center; margin: 0; padding: 0; background: white; }
          body { -webkit-print-color-adjust: exact; margin: 0; background: white; }
          .page-break { page-break-after: always; }
          .leaflet-container { background: #fff !important; }
        }
        @media screen {
          .print-container { position: fixed; top: -9999px; left: -9999px; width: 1024px; }
        }
      `}</style>

      {/* LEFT COMPARTMENT (Grid or Multi-Maps) */}
      <div
        className={`print:hidden ${viewMode === "map" ? "flex-1 flex flex-col gap-4" : ""}`}
      >
        {/* Toolbar (Only show here if Grid Mode) */}
        {viewMode === "grid" && (
          <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Issue Date
                </label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] w-48"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    setViewMode((prev) => (prev === "grid" ? "map" : "grid"))
                  }
                  variant="outline"
                  size="sm"
                  className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
                >
                  <MapIcon size={14} className="mr-1" /> Select via Map
                </Button>
                <Button
                  onClick={() => {
                    const all = new Set<string>();
                    QPF_BASINS.forEach((b) =>
                      days.forEach((d) => all.add(`${b}|${d}`)),
                    );
                    setSelectedCells(all);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
                >
                  Select All
                </Button>
                <Button
                  onClick={() => setSelectedCells(new Set())}
                  variant="outline"
                  size="sm"
                  className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
                >
                  <Eraser size={14} className="mr-1" /> Clear Sel
                </Button>
                <Button
                  onClick={() => {
                    const prev = duplicatePrevSession(issueDate);
                    if (prev) setGrid(prev);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
                >
                  <Copy size={14} className="mr-1" /> Dup Prev
                </Button>
                {isEditing && (
                  <Button
                    onClick={() => {
                      deleteSession(getSessionByDate(issueDate)?.id || "");
                      setIsEditing(false);
                      setGrid(
                        QPF_BASINS.map((b) => ({
                          issueDate,
                          basin: "Ganga",
                          subBasin: b,
                          day1: "0",
                          day2: "0",
                          day3: "0",
                          day4: "0",
                          day5: "0",
                          day6: "0",
                          day7: "0",
                        })),
                      );
                    }}
                    variant="outline"
                    size="sm"
                    className="border-[#991b1b] text-[#ef4444] hover:bg-[#991b1b]/20"
                  >
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  className="bg-[#10b981] hover:bg-[#059669] text-white"
                >
                  <Save size={14} className="mr-1" />{" "}
                  {isEditing ? "Update" : "Save"}
                </Button>
              </div>
            </div>

            {/* Multi-select or Map Controls conditionally rendered */}
            <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-lg p-3 flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold text-[#e2e8f0]">
                {selectedCells.size} selected
              </span>
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="text-sm border border-black/20 rounded px-3 py-1.5 outline-none font-bold"
                style={{
                  backgroundColor: QPF_COLORS[bulkValue]?.bg,
                  color: QPF_COLORS[bulkValue]?.text,
                }}
              >
                {Object.keys(QPF_COLORS).map((k) => (
                  <option
                    key={k}
                    value={k}
                    style={{
                      backgroundColor: QPF_COLORS[k].bg,
                      color: QPF_COLORS[k].text,
                    }}
                  >
                    {k}
                  </option>
                ))}
              </select>
              <Button
                onClick={applyBulkEdit}
                className="bg-[#10b981] hover:bg-[#059669] text-white"
                size="sm"
              >
                <Check size={16} className="mr-1" /> Apply
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Checkbox
                  id="multi"
                  checked={isMultiSelectMode}
                  onCheckedChange={(c) => setIsMultiSelectMode(!!c)}
                  className="border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
                />
                <label
                  htmlFor="multi"
                  className="text-sm text-[#e2e8f0] select-none"
                >
                  Multi Select
                </label>
              </div>
            </div>
          </div>
        )}

        {viewMode === "map" && (
          <div
            className={`grid grid-cols-1 ${mapViewDays.size === 1 ? "" : "md:grid-cols-2"} gap-4`}
          >
            {Array.from(mapViewDays)
              .sort()
              .map((d) => (
                <MapMultiSelect
                  key={`map-${d}`}
                  selectedBasins={selectedMapBasins}
                  onChange={setSelectedMapBasins}
                  grid={grid}
                  mapViewDay={d}
                  title={`Forecast: ${d.replace("day", "Day ")}`}
                  mapLayer={mapLayer}
                />
              ))}
            {mapViewDays.size === 0 && (
              <div className="col-span-full h-[400px] flex items-center justify-center border-2 border-dashed border-[#1e3a5f] rounded-xl text-[#94a3b8]">
                Select a "Map View Day" from the right panel to show maps.
              </div>
            )}
          </div>
        )}

        {/* Grid */}
        <div
          className={`bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden ${viewMode === "map" ? "hidden" : ""}`}
        >
          <table className="w-full text-sm">
            <thead className="bg-[#0d1f35]">
              <tr>
                <th className="text-left px-4 py-3 text-[#94a3b8] font-semibold">
                  Sub-Basin
                </th>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <th
                    key={d}
                    className="text-center px-3 py-3 text-[#94a3b8] font-semibold"
                  >
                    Day-{d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a5f]">
              {grid.map((row, idx) => (
                <tr
                  key={row.subBasin}
                  className={idx % 2 === 0 ? "bg-[#111d32]" : "bg-[#0f1929]"}
                >
                  <td className="px-4 py-2.5 text-[#e2e8f0] text-xs font-medium">
                    {row.subBasin}
                  </td>
                  {days.map((d) => {
                    const isSelected = selectedCells.has(
                      `${row.subBasin}|${d}`,
                    );
                    const val = row[d as keyof QPFForecastEntry] as string;
                    return (
                      <td
                        key={d}
                        className={`px-2 py-2 text-center select-none cursor-pointer ${isSelected ? "ring-2 ring-inset ring-[#3b82f6] bg-[#3b82f6]/10" : ""}`}
                        onMouseDown={() => {
                          if (isMultiSelectMode) {
                            setIsDragging(true);
                            setSelectedCells(
                              new Set([
                                ...selectedCells,
                                `${row.subBasin}|${d}`,
                              ]),
                            );
                          }
                        }}
                        onMouseEnter={() => {
                          if (isDragging && isMultiSelectMode)
                            setSelectedCells(
                              new Set([
                                ...selectedCells,
                                `${row.subBasin}|${d}`,
                              ]),
                            );
                        }}
                        onClick={() =>
                          !isMultiSelectMode && handleCellClick(row.subBasin, d)
                        }
                      >
                        {isMultiSelectMode ? (
                          <div
                            className="py-1.5 px-1 rounded text-xs font-bold border border-black/10 shadow-sm"
                            style={{
                              backgroundColor: QPF_COLORS[val]?.bg || "#fff",
                              color: QPF_COLORS[val]?.text || "#000",
                            }}
                          >
                            {val}
                          </div>
                        ) : (
                          <select
                            value={val}
                            onChange={(e) => {
                              setGrid((prev) =>
                                prev.map((r) =>
                                  r.subBasin === row.subBasin
                                    ? { ...r, [d]: e.target.value }
                                    : r,
                                ),
                              );
                            }}
                            className="w-full text-center text-xs py-1.5 px-1 rounded font-bold"
                            style={{
                              backgroundColor: QPF_COLORS[val]?.bg || "#fff",
                              color: QPF_COLORS[val]?.text || "#000",
                            }}
                          >
                            {Object.keys(QPF_COLORS).map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Saved */}
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">
            Saved QPF Forecasts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0d1f35]">
                <tr>
                  <th className="text-left px-4 py-2 text-[#94a3b8]">
                    Issue Date
                  </th>
                  <th className="text-left px-4 py-2 text-[#94a3b8]">
                    Created
                  </th>
                  <th className="text-center px-4 py-2 text-[#94a3b8]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {qpfSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#1a2d4a]">
                    <td className="px-4 py-2 text-[#e2e8f0]">{s.issueDate}</td>
                    <td className="px-4 py-2 text-[#94a3b8]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => setIssueDate(s.issueDate)}
                        className="text-[#3b82f6] text-xs"
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR (Only in Map Mode) */}
      {viewMode === "map" && (
        <div className="print:hidden w-full lg:w-80 shrink-0 bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5 shadow-lg flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500">
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setViewMode("grid")}
              variant="outline"
              className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a] w-full"
            >
              Back to Grid View
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#10b981] hover:bg-[#059669] text-white w-full shadow-md"
            >
              <Save size={16} className="mr-2" />{" "}
              {isEditing ? "Update Session" : "Save Session"}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              Issue Date
            </label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] w-full"
            />
          </div>

          <div className="border-t border-[#1e3a5f] pt-4 flex flex-col gap-2">
            <label className="text-xs font-bold text-[#3b82f6] uppercase tracking-wider">
              Show Maps For (View)
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {days.map((d) => (
                <label
                  key={`view-${d}`}
                  className="flex items-center gap-2 text-sm text-[#e2e8f0] cursor-pointer hover:text-white bg-[#0d1f35] border border-[#1e3a5f] p-2 rounded"
                >
                  <Checkbox
                    checked={mapViewDays.has(d)}
                    onCheckedChange={(c) => {
                      const n = new Set(mapViewDays);
                      c ? n.add(d) : n.delete(d);
                      setMapViewDays(n);
                    }}
                    className="border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
                  />
                  {d.replace("day", "Day ")}
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-[#1e3a5f] pt-4 flex flex-col gap-2">
            <label className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">
              Map Background (Universal)
            </label>
            <select
              value={mapLayer}
              onChange={(e) => setMapLayer(e.target.value)}
              className="bg-[#0d1f35] border border-[#1e3a5f] text-sm text-[#e2e8f0] rounded px-3 py-2 outline-none w-full shadow-sm"
            >
              <option value="m">Standard Street Map</option>
              <option value="s">Satellite Imagery Map</option>
              <option value="p">Physical Terrain Map</option>
            </select>
          </div>

          <div className="border-t border-[#1e3a5f] pt-4 flex flex-col gap-2 bg-[#0d1f35] p-3 rounded-lg border">
            <label className="text-xs font-bold text-[#10b981] uppercase tracking-wider">
              Apply Forecast (Edit)
            </label>
            <span className="text-xs text-[#94a3b8] mb-1">
              {selectedMapBasins.length} Basins Selected on Map
            </span>

            <div className="flex flex-wrap gap-2 mb-2">
              {days.map((d) => (
                <label
                  key={`target-${d}`}
                  className="flex items-center gap-1.5 text-xs text-[#e2e8f0] cursor-pointer hover:text-[#10b981]"
                >
                  <Checkbox
                    checked={selectedMapDays.has(d)}
                    onCheckedChange={(c) => {
                      const n = new Set(selectedMapDays);
                      c ? n.add(d) : n.delete(d);
                      setSelectedMapDays(n);
                    }}
                    className="border-[#10b981] data-[state=checked]:bg-[#10b981] h-3.5 w-3.5"
                  />
                  {d.replace("day", "D")}
                </label>
              ))}
            </div>

            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="text-sm border border-black/20 rounded px-3 py-2 outline-none font-bold w-full mb-2"
              style={{
                backgroundColor: QPF_COLORS[bulkValue]?.bg,
                color: QPF_COLORS[bulkValue]?.text,
              }}
            >
              {Object.keys(QPF_COLORS).map((k) => (
                <option
                  key={k}
                  value={k}
                  style={{
                    backgroundColor: QPF_COLORS[k].bg,
                    color: QPF_COLORS[k].text,
                  }}
                >
                  {k}
                </option>
              ))}
            </select>

            <Button
              onClick={applyMapBulkEdit}
              className="bg-[#10b981] hover:bg-[#059669] text-white w-full"
            >
              <Check size={16} className="mr-1" /> Apply to Map
            </Button>

            <div className="border-t border-[#1e3a5f] pt-4 mt-4 flex flex-col gap-3">
              <Button
                onClick={handlePrintReport}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-lg"
              >
                <DownloadCloud size={16} className="mr-2" /> Download PDF (2
                Maps/Page)
              </Button>
              <Button
                onClick={handleDownloadAllImages}
                disabled={isGeneratingImages}
                className="w-full bg-[#ec4899] hover:bg-[#db2777] text-white shadow-lg"
              >
                <DownloadCloud size={16} className="mr-2" />
                {isGeneratingImages
                  ? "Generating 8 Images..."
                  : "Download Images (1-by-1)"}
              </Button>
              <p className="text-[10px] text-[#94a3b8] text-center mt-1 leading-tight">
                "PDF" merges maps into a 4-page file (2 per page). "Images"
                downloads 8 separate PNG files.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT CONTAINER (Generates a 4-page PDF with 2 maps per page) */}
      {isPrinting && (
        <div id="print-report" className="print-container">
          <div className="bg-white p-0 w-full text-black">
            {[
              ["day1", "day2"],
              ["day3", "day4"],
              ["day5", "day6"],
              ["day7", "legend"],
            ].map((pair, idx) => (
              <div
                key={`print-page-${idx}`}
                className="page-break flex flex-col justify-between py-6 px-4 box-border mx-auto"
                style={{ width: "210mm", height: "297mm" }}
              >
                {pair.map((d) => (
                  <div
                    key={`print-${d}`}
                    className="flex flex-col w-full h-[130mm] items-center justify-center gap-2"
                  >
                    <h1 className="text-2xl font-bold text-center text-black border-b-2 border-gray-300 pb-2 w-[95%] mx-auto shrink-0">
                      {formatPrintDate(issueDate, d)}
                    </h1>
                    <div className="flex-1 w-[95%] mx-auto relative">
                      <MapMultiSelect
                        selectedBasins={[]}
                        onChange={() => {}}
                        grid={grid}
                        mapViewDay={d !== "legend" ? d : undefined}
                        title={
                          d === "legend"
                            ? "Reference Legend"
                            : `Forecast: ${d.replace("day", "Day ")}`
                        }
                        legendMode={d === "legend"}
                        mapLayer={mapLayer}
                        heightClass="h-[115mm] w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIDDEN CONTAINER FOR IMAGE EXPORT (html2canvas) */}
      {isGeneratingImages && (
        <div className="fixed top-[-9999px] left-[-9999px] z-[-9999]">
          {[
            "day1",
            "day2",
            "day3",
            "day4",
            "day5",
            "day6",
            "day7",
            "legend",
          ].map((d) => (
            <div
              key={`export-${d}`}
              id={`export-map-${d}`}
              className="bg-white p-8 w-[1200px] h-[900px] flex flex-col gap-4 text-black items-center justify-center box-border mx-auto"
            >
              <h1 className="text-4xl font-bold text-center border-b-4 border-gray-300 pb-4 w-[95%] mx-auto shrink-0">
                {formatPrintDate(issueDate, d)}
              </h1>
              <div className="flex-1 w-[95%] mx-auto relative">
                <MapMultiSelect
                  selectedBasins={[]}
                  onChange={() => {}}
                  grid={grid}
                  mapViewDay={d !== "legend" ? d : undefined}
                  title={
                    d === "legend"
                      ? "Reference Legend"
                      : `Forecast: ${d.replace("day", "Day ")}`
                  }
                  legendMode={d === "legend"}
                  mapLayer={mapLayer}
                  heightClass="h-full w-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
