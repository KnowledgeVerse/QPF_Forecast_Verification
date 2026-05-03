import { useState, useEffect, useRef } from "react";
import { Save, Trash2, Copy, Eraser, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useQPFStore } from "@/hooks/useQPFStore";
import { QPF_BASINS, type QPFForecastEntry } from "@/types";
import { getToday } from "@/lib/utils";

const QPF_COLORS: Record<string, { bg: string; text: string }> = {
  "0": { bg: "#ffffff", text: "#1f2937" },
  "0.1-10": { bg: "#bbf7d0", text: "#14532d" },
  "11-25": { bg: "#22c55e", text: "#ffffff" },
  "26-50": { bg: "#facc15", text: "#111827" },
  "51-100": { bg: "#f97316", text: "#ffffff" },
  ">100": { bg: "#dc2626", text: "#ffffff" },
};

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

  const handleSave = () => {
    saveCurrentSession(issueDate, grid);
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
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

        {/* Multi-select bar */}
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

      {/* Grid */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden">
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
                  const isSelected = selectedCells.has(`${row.subBasin}|${d}`);
                  const val = row[d as keyof QPFForecastEntry] as string;
                  return (
                    <td
                      key={d}
                      className={`px-2 py-2 text-center select-none cursor-pointer ${isSelected ? "ring-2 ring-inset ring-[#3b82f6] bg-[#3b82f6]/10" : ""}`}
                      onMouseDown={() => {
                        if (isMultiSelectMode) {
                          setIsDragging(true);
                          setSelectedCells(
                            new Set([...selectedCells, `${row.subBasin}|${d}`]),
                          );
                        }
                      }}
                      onMouseEnter={() => {
                        if (isDragging && isMultiSelectMode)
                          setSelectedCells(
                            new Set([...selectedCells, `${row.subBasin}|${d}`]),
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
                <th className="text-left px-4 py-2 text-[#94a3b8]">Created</th>
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
  );
}
