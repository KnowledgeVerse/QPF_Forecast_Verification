import { useState, useEffect } from "react";
import { Save, Trash2, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { useForecastStore } from "@/hooks/useForecastStore";
import {
  REGIONS,
  type Category,
  type Region,
  type RealisedEntry,
} from "@/types";
import { formatDate, generateId, addDays, getToday } from "@/lib/utils";
import Footer from "@/components/Footer";

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

export default function RealisedEntryPage() {
  const {
    realised,
    addRealised,
    updateRealised,
    deleteRealised,
    updateSettings,
    settings,
    addToast,
  } = useForecastStore();
  const [date, setDate] = useState(() => {
    return getToday();
  });
  const [multiMode, setMultiMode] = useState(false);
  const [multiDates, setMultiDates] = useState<string[]>(() => {
    return [getToday()];
  });
  const [data, setData] = useState<Record<string, Record<Region, Category>>>(
    {},
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Load existing realised data for selected date(s)
  useEffect(() => {
    const targets = multiMode ? multiDates : [date];
    const newData: Record<string, Record<Region, Category>> = {};

    targets.forEach((d) => {
      const existing = realised.find((r) => r.date === d);
      if (existing) {
        newData[d] = existing.data;
      } else {
        const row: Record<string, Category> = {};
        REGIONS.forEach((r) => {
          row[r] = "DRY";
        });
        newData[d] = row as Record<Region, Category>;
      }
    });

    setData(newData);

    // Check if editing
    const firstExisting = realised.find(
      (r) => r.date === (multiMode ? multiDates[0] : date),
    );
    if (firstExisting) {
      setIsEditing(true);
      setEditId(firstExisting.id);
    } else {
      setIsEditing(false);
      setEditId(null);
    }
  }, [date, multiMode, multiDates, realised]);

  const handleCellChange = (
    targetDate: string,
    region: Region,
    value: Category,
  ) => {
    setData((prev) => ({
      ...prev,
      [targetDate]: {
        ...prev[targetDate],
        [region]: value,
      },
    }));
  };

  const addMultiDate = () => {
    const lastDate = multiDates[multiDates.length - 1];
    if (lastDate) {
      const newDate = addDays(lastDate, 1);
      if (!multiDates.includes(newDate)) {
        setMultiDates([...multiDates, newDate]);
      }
    }
  };

  const removeMultiDate = (idx: number) => {
    setMultiDates((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveData = () => {
    Object.entries(data).forEach(([targetDate, rowData]) => {
      const existing = realised.find((r) => r.date === targetDate);
      const entry: RealisedEntry = {
        id: existing?.id || generateId(),
        date: targetDate,
        data: rowData,
        createdAt: existing?.createdAt || Date.now(),
      };

      if (existing) {
        updateRealised(entry);
      } else {
        addRealised(entry);
      }
    });

    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 800);

    if (settings.autoVerify) {
      addToast("Realised data saved & auto-verification queued", "success");
    } else {
      addToast("Realised data saved", "success");
    }

    setIsEditing(true);
  };

  const handleDelete = () => {
    if (editId) {
      deleteRealised(editId);
      setIsEditing(false);
      setEditId(null);
      const empty: Record<string, Record<Region, Category>> = {};
      const targets = multiMode ? multiDates : [date];
      targets.forEach((d) => {
        const row: Record<string, Category> = {};
        REGIONS.forEach((r) => {
          row[r] = "DRY";
        });
        empty[d] = row as Record<Region, Category>;
      });
      setData(empty);
      addToast("Realised data deleted", "info");
    }
  };

  const clearAll = () => {
    const empty: Record<string, Record<Region, Category>> = {};
    const targets = multiMode ? multiDates : [date];
    targets.forEach((d) => {
      const row: Record<string, Category> = {};
      REGIONS.forEach((r) => {
        row[r] = "DRY";
      });
      empty[d] = row as Record<Region, Category>;
    });
    setData(empty);
    addToast("Data cleared", "info");
  };

  const renderTable = (targetDate: string, idx?: number) => (
    <div key={targetDate} className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#e2e8f0]">
          {formatDate(targetDate, settings.dateFormat)}
        </h3>
        {multiMode && idx !== undefined && multiDates.length > 1 && (
          <button
            onClick={() => removeMultiDate(idx)}
            className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0d1f35]">
              <th className="text-left px-4 py-2.5 text-[#94a3b8] font-semibold min-w-[140px]">
                DATE
              </th>
              {REGIONS.map((region) => (
                <th
                  key={region}
                  className="text-center px-3 py-2.5 text-[#94a3b8] font-semibold min-w-[130px]"
                >
                  {region}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#111d32]">
              <td className="px-4 py-2.5 text-[#e2e8f0] font-mono text-xs font-medium">
                {formatDate(targetDate, settings.dateFormat)}
              </td>
              {REGIONS.map((region) => {
                const value = data[targetDate]?.[region] || "DRY";
                const displayOption = DISPLAY_OPTIONS.find(
                  (o) => o.value === value,
                );
                return (
                  <td key={region} className="px-2 py-2 text-center">
                    <select
                      value={value}
                      onChange={(e) =>
                        handleCellChange(
                          targetDate,
                          region,
                          e.target.value as Category,
                        )
                      }
                      className="w-full text-center text-xs py-1.5 px-1 rounded border border-black/20 hover:border-black/40 focus:border-[#3b82f6] focus:outline-none cursor-pointer appearance-none font-bold shadow-sm"
                      style={{
                        backgroundColor: displayOption?.color,
                        color: displayOption?.text,
                      }}
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
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Realised Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={multiMode}
                className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] w-full sm:w-56 disabled:opacity-40"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={multiMode}
                  onCheckedChange={setMultiMode}
                  className="data-[state=checked]:bg-[#3b82f6]"
                />
                <label className="text-sm text-[#94a3b8]">
                  Multi-Date Mode
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.autoVerify}
                  onCheckedChange={(v) => updateSettings({ autoVerify: v })}
                  className="data-[state=checked]:bg-[#10b981]"
                />
                <label className="text-sm text-[#94a3b8]">Auto-Verify</label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={clearAll}
              variant="outline"
              size="sm"
              className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
            >
              <Eraser size={14} className="mr-1" />
              Clear
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
              onClick={saveData}
              className="bg-[#10b981] hover:bg-[#059669] text-white"
            >
              <Save size={14} className="mr-1" />
              Save Realised Data
            </Button>
          </div>
        </div>
      </div>

      {/* Multi-date inputs */}
      {multiMode && (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            {multiDates.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-1 bg-[#0d1f35] rounded-lg px-2 py-1.5 border border-[#1e3a5f]"
              >
                <Input
                  type="date"
                  value={d}
                  onChange={(e) => {
                    const next = [...multiDates];
                    next[i] = e.target.value;
                    setMultiDates(next);
                  }}
                  className="bg-transparent border-none text-[#e2e8f0] text-xs py-0 px-1 h-7 w-auto"
                />
                {multiDates.length > 1 && (
                  <button
                    onClick={() => removeMultiDate(i)}
                    className="text-[#64748b] hover:text-[#ef4444]"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {multiDates.length < 7 && (
              <Button
                onClick={addMultiDate}
                variant="outline"
                size="sm"
                className="border-dashed border-[#2a4a6f] text-[#94a3b8] hover:bg-[#1a2d4a]"
              >
                + Add Date
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Realised Data Table */}
      <div
        className={`bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden p-4 transition-all ${
          savedFlash ? "ring-2 ring-[#10b981]" : ""
        }`}
      >
        {multiMode
          ? multiDates.map((d, i) => renderTable(d, i))
          : renderTable(date)}
      </div>

      {/* Saved Realised Data List */}
      {realised.length > 0 && (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e3a5f]">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">
              Saved Realised Entries
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1f35]">
                  <th className="text-left px-4 py-2.5 text-[#94a3b8] font-medium">
                    Date
                  </th>
                  {REGIONS.map((r) => (
                    <th
                      key={r}
                      className="text-center px-3 py-2.5 text-[#94a3b8] font-medium text-xs"
                    >
                      {r}
                    </th>
                  ))}
                  <th className="text-center px-4 py-2.5 text-[#94a3b8] font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {[...realised]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 10)
                  .map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-[#1a2d4a] transition-colors"
                    >
                      <td className="px-4 py-2 text-[#e2e8f0] font-mono text-xs">
                        {formatDate(r.date, settings.dateFormat)}
                      </td>
                      {REGIONS.map((region) => (
                        <td key={region} className="text-center px-3 py-2">
                          <CategoryBadge category={r.data[region]} size="sm" />
                        </td>
                      ))}
                      <td className="text-center px-4 py-2">
                        <button
                          onClick={() => {
                            setDate(r.date);
                            setMultiMode(false);
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
