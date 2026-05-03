import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Trash2, Copy, Eraser, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForecastStore } from "@/hooks/useForecastStore";
import {
  REGIONS,
  type Category,
  type Region,
  type ForecastEntry,
} from "@/types";
import { formatDate, generateId, addDays, getToday } from "@/lib/utils";
import Footer from "@/components/Footer";
import { Checkbox } from "@/components/ui/checkbox";

const DISPLAY_OPTIONS = [
  { value: "DRY", label: "DRY – शुष्क", color: "#ffffff", text: "#000000" },
  {
    value: "ISOL",
    label: "ISOL (ONE OR TWO PLACES) – एक दो स्थानों पर",
    color: "#33cc33",
    text: "#ffffff",
  },
  {
    value: "SCT",
    label: "SCATTERED (FEW PLACES) – कुछ स्थानों पर",
    color: "#009900",
    text: "#ffffff",
  },
  {
    value: "FWS",
    label: "FAIRLY WIDESPREAD (MANY PLACES) – अनेक स्थानों पर",
    color: "#33ccff",
    text: "#000000",
  },
  {
    value: "WS",
    label: "WIDESPREAD (MOST PLACES) – अधिकांश स्थानों पर",
    color: "#0066ff",
    text: "#ffffff",
  },
];

export default function ForecastEntryPage() {
  const {
    forecasts,
    addForecast,
    updateForecast,
    deleteForecast,
    addToast,
    settings,
  } = useForecastStore();
  const [issueDate, setIssueDate] = useState(() => {
    return getToday();
  });
  const [tableData, setTableData] = useState<
    Record<string, Record<Region, Category>>
  >({});
  const [dates, setDates] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [bulkValue, setBulkValue] = useState<Category>("DRY");
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const isCtrlPressed = useRef(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Load existing forecast for selected date
  useEffect(() => {
    const existing = forecasts.find((f) => f.issueDate === issueDate);
    if (existing) {
      setDates(existing.dates);
      setTableData(existing.data);
      setIsEditing(true);
      setEditId(existing.id);
    } else {
      generateNewDates(issueDate);
      setIsEditing(false);
      setEditId(null);
    }
    setSelectedCells(new Set());
  }, [issueDate, forecasts]);

  const generateNewDates = (baseDate: string) => {
    const newDates: string[] = [];
    const newData: Record<string, Record<Region, Category>> = {};
    for (let i = 0; i < 7; i++) {
      const d = addDays(baseDate, i);
      newDates.push(d);
      const row: Record<string, Category> = {};
      REGIONS.forEach((r) => {
        row[r] = "DRY";
      });
      newData[d] = row as Record<Region, Category>;
    }
    setDates(newDates);
    setTableData(newData);
  };

  const handleCellChange = (date: string, region: Region, value: Category) => {
    setTableData((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [region]: value,
      },
    }));
  };

  const handleCellClick = (date: string, region: Region) => {
    const key = `${date}|${region}`;
    if (isCtrlPressed.current) {
      setSelectedCells((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    } else {
      setSelectedCells(new Set([key]));
    }
  };

  // Track Ctrl key
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) isCtrlPressed.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) isCtrlPressed.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleMouseDown = (date: string, region: Region) => {
    if (!isMultiSelectMode) return;
    setIsDragging(true);
    const key = `${date}|${region}`;
    setSelectedCells((prev) => new Set([...prev, key]));
  };

  const handleMouseEnter = (date: string, region: Region) => {
    if (!isDragging || !isMultiSelectMode) return;
    const key = `${date}|${region}`;
    setSelectedCells((prev) => new Set([...prev, key]));
  };

  const applyBulkEdit = () => {
    if (selectedCells.size === 0) return;
    const newData = { ...tableData };
    selectedCells.forEach((key) => {
      const [date, region] = key.split("|");
      if (newData[date]) {
        newData[date] = { ...newData[date], [region]: bulkValue };
      }
    });
    setTableData(newData);
    setSelectedCells(new Set());
    addToast(`Applied ${bulkValue} to ${selectedCells.size} cells`, "success");
  };

  const clearTable = () => {
    const empty: Record<string, Record<Region, Category>> = {};
    dates.forEach((d) => {
      const row: Record<string, Category> = {};
      REGIONS.forEach((r) => {
        row[r] = "DRY";
      });
      empty[d] = row as Record<Region, Category>;
    });
    setTableData(empty);
    setSelectedCells(new Set());
    addToast("Table cleared", "info");
  };

  const saveForecast = () => {
    const entry: ForecastEntry = {
      id: isEditing && editId ? editId : generateId(),
      issueDate,
      dates,
      data: tableData,
      createdAt:
        isEditing && editId
          ? (forecasts.find((f) => f.id === editId)?.createdAt ?? Date.now())
          : Date.now(),
      updatedAt: Date.now(),
    };

    if (isEditing && editId) {
      updateForecast(entry);
      addToast("Forecast updated successfully", "success");
    } else {
      addForecast(entry);
      addToast("Forecast saved successfully", "success");
      setIsEditing(true);
      setEditId(entry.id);
    }

    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 800);
  };

  const handleDelete = () => {
    if (editId) {
      deleteForecast(editId);
      setIsEditing(false);
      setEditId(null);
      generateNewDates(issueDate);
      addToast("Forecast deleted", "info");
    }
  };

  const duplicatePrevious = () => {
    const prevDate = addDays(issueDate, -1);
    const prev = forecasts.find((f) => f.issueDate === prevDate);
    if (prev) {
      const shiftedDates = prev.dates.map((_, i) => addDays(issueDate, i));
      const shiftedData: Record<string, Record<Region, Category>> = {};
      shiftedDates.forEach((d, i) => {
        const srcDate = prev.dates[i];
        shiftedData[d] =
          prev.data[srcDate] ||
          (Object.fromEntries(
            REGIONS.map((r) => [r, "DRY" as Category]),
          ) as Record<Region, Category>);
      });
      setDates(shiftedDates);
      setTableData(shiftedData);
      addToast("Previous forecast duplicated with shifted dates", "success");
    } else {
      addToast("No previous forecast found", "error");
    }
  };

  const selectAll = useCallback(() => {
    const all = new Set<string>();
    dates.forEach((d) => {
      REGIONS.forEach((r) => {
        all.add(`${d}|${r}`);
      });
    });
    setSelectedCells(all);
  }, [dates]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
              Forecast Issue Date
            </label>
            <Input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] w-full lg:w-56"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={selectAll}
              variant="outline"
              size="sm"
              className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
            >
              Select All
            </Button>

            <Button
              onClick={clearTable}
              variant="outline"
              size="sm"
              className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
            >
              <Eraser size={14} className="mr-1" />
              Clear
            </Button>

            <Button
              onClick={duplicatePrevious}
              variant="outline"
              size="sm"
              className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
            >
              <Copy size={14} className="mr-1" />
              Duplicate Prev
            </Button>

            {isEditing && (
              <Button
                onClick={handleDelete}
                variant="outline"
                size="sm"
                className="border-[#991b1b] text-[#ef4444] hover:bg-[#991b1b]/20"
              >
                <Trash2 size={14} className="mr-1" />
                Delete
              </Button>
            )}

            <Button
              onClick={saveForecast}
              className="bg-[#10b981] hover:bg-[#059669] text-white"
            >
              <Save size={14} className="mr-1" />
              {isEditing ? "Update Forecast" : "Save Forecast"}
            </Button>
          </div>
        </div>

        {isEditing && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3b82f6]/20 text-[#60a5fa]">
              Editing
            </span>
            <span className="text-xs text-[#64748b]">
              Forecast issued on {formatDate(issueDate, settings.dateFormat)}
            </span>
          </div>
        )}

        {/* NEW Multi-Select Toolbar */}
        <div className="bg-[#0d1f35] border border-[#1e3a5f] rounded-lg p-3 mt-4 flex flex-col sm:flex-row flex-wrap sm:items-center gap-4">
          <span className="text-sm font-semibold text-[#e2e8f0] min-w-[120px]">
            {selectedCells.size} cells selected
          </span>

          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <select
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value as Category)}
              className="w-full text-sm border border-black/20 shadow-sm rounded px-3 py-2 outline-none font-bold appearance-none cursor-pointer"
              style={{
                backgroundColor: DISPLAY_OPTIONS.find(
                  (o) => o.value === bulkValue,
                )?.color,
                color: DISPLAY_OPTIONS.find((o) => o.value === bulkValue)?.text,
              }}
            >
              {DISPLAY_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{ backgroundColor: opt.color, color: opt.text }}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={applyBulkEdit}
              className="bg-[#10b981] hover:bg-[#059669] text-white shadow-md"
              size="sm"
            >
              <Check size={16} className="mr-1" /> Apply
            </Button>
            <Button
              onClick={() => setSelectedCells(new Set())}
              variant="outline"
              size="sm"
              className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
            >
              <Eraser size={16} className="mr-1" /> Clear
            </Button>
          </div>

          <div className="sm:ml-auto flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-[#1e3a5f] pt-3 sm:pt-0 sm:pl-4">
            <Checkbox
              id="multiSelect"
              checked={isMultiSelectMode}
              onCheckedChange={(checked) =>
                setIsMultiSelectMode(checked as boolean)
              }
              className="border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
            />
            <label
              htmlFor="multiSelect"
              className="text-sm font-medium text-[#e2e8f0] cursor-pointer select-none"
            >
              Multiple Select
            </label>
          </div>
        </div>
      </div>

      {/* Forecast Table */}
      <div
        className={`bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden transition-all ${
          savedFlash ? "ring-2 ring-[#10b981]" : ""
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1f35]">
                <th className="text-left px-4 py-3 text-[#94a3b8] font-semibold min-w-[140px]">
                  DATE
                </th>
                {REGIONS.map((region) => (
                  <th
                    key={region}
                    className="text-center px-3 py-3 text-[#94a3b8] font-semibold min-w-[130px]"
                  >
                    {region}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a5f]">
              {dates.map((date, idx) => (
                <tr
                  key={date}
                  className={`transition-colors ${idx % 2 === 0 ? "bg-[#111d32]" : "bg-[#0f1929]"}`}
                >
                  <td className="px-4 py-2.5 text-[#e2e8f0] font-mono text-xs font-medium">
                    {formatDate(date, settings.dateFormat)}
                  </td>
                  {REGIONS.map((region) => {
                    const key = `${date}|${region}`;
                    const isSelected = selectedCells.has(key);
                    const value = tableData[date]?.[region] || "DRY";
                    const displayOption = DISPLAY_OPTIONS.find(
                      (o) => o.value === value,
                    );

                    return (
                      <td
                        key={key}
                        className={`px-2 py-2 text-center transition-all select-none ${
                          isSelected
                            ? "bg-[#3b82f6]/10 ring-2 ring-inset ring-[#3b82f6]"
                            : "hover:bg-[#1a2d4a]"
                        }`}
                        onMouseDown={() => handleMouseDown(date, region)}
                        onMouseEnter={() => handleMouseEnter(date, region)}
                        onClick={() => {
                          if (!isMultiSelectMode) handleCellClick(date, region);
                        }}
                      >
                        {isMultiSelectMode ? (
                          <div
                            className="w-full text-center text-xs py-1.5 px-1 rounded font-bold cursor-crosshair border border-black/10 shadow-sm"
                            style={{
                              backgroundColor: displayOption?.color,
                              color: displayOption?.text,
                            }}
                          >
                            {value}
                          </div>
                        ) : (
                          <select
                            value={value}
                            onChange={(e) =>
                              handleCellChange(
                                date,
                                region,
                                e.target.value as Category,
                              )
                            }
                            className="w-full text-center text-xs py-1.5 px-1 rounded border border-black/20 hover:border-black/40 focus:border-[#3b82f6] focus:outline-none cursor-pointer appearance-none font-bold shadow-sm"
                            style={{
                              backgroundColor: displayOption?.color,
                              color: displayOption?.text,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {DISPLAY_OPTIONS.map((opt) => (
                              <option
                                key={opt.value}
                                value={opt.value}
                                style={{
                                  backgroundColor: opt.color,
                                  color: opt.text,
                                }}
                              >
                                {opt.value}
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
      </div>

      {/* Saved Forecasts List */}
      {forecasts.length > 0 && (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e3a5f]">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">
              Saved Forecasts
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1f35]">
                  <th className="text-left px-4 py-2.5 text-[#94a3b8] font-medium">
                    Issue Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-[#94a3b8] font-medium">
                    Period
                  </th>
                  <th className="text-left px-4 py-2.5 text-[#94a3b8] font-medium">
                    Created
                  </th>
                  <th className="text-center px-4 py-2.5 text-[#94a3b8] font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {[...forecasts]
                  .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
                  .map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-[#1a2d4a] transition-colors"
                    >
                      <td className="px-4 py-2.5 text-[#e2e8f0] font-mono text-xs">
                        {formatDate(f.issueDate, settings.dateFormat)}
                      </td>
                      <td className="px-4 py-2.5 text-[#94a3b8] text-xs">
                        {formatDate(f.dates[0], settings.dateFormat)} -{" "}
                        {formatDate(
                          f.dates[f.dates.length - 1],
                          settings.dateFormat,
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#64748b] text-xs">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => {
                            setIssueDate(f.issueDate);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-xs text-[#3b82f6] hover:text-[#60a5fa] font-medium transition-colors"
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
      )}

      <Footer />
    </div>
  );
}
