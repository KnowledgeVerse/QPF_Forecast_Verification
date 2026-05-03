import { useState, useMemo } from "react";
import {
  Filter,
  Download,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BarChart as BarChartIcon,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  LineChart,
  Line,
  Brush,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AccuracyCell from "@/components/ui/AccuracyCell";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { useForecastStore } from "@/hooks/useForecastStore";
import { REGIONS, CATEGORIES, type Region } from "@/types";
import { formatDate, downloadChartAsImage } from "@/lib/utils";
import Footer from "@/components/Footer";

const PAGE_SIZE = 25;

export default function VerificationReportPage() {
  const { verifications, runVerification, settings, addToast } =
    useForecastStore();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [regionFilter, setRegionFilter] = useState<Region[]>([]);
  const [leadDayFilter, setLeadDayFilter] = useState<number[]>([
    1, 2, 3, 4, 5, 6, 7,
  ]);
  const [page, setPage] = useState(0);

  const toggleRegion = (r: Region) => {
    setRegionFilter((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
    setPage(0);
  };

  const toggleLeadDay = (d: number) => {
    setLeadDayFilter((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
    setPage(0);
  };

  const filtered = useMemo(() => {
    return verifications.filter((v) => {
      if (dateFrom && v.realisedDate < dateFrom) return false;
      if (dateTo && v.realisedDate > dateTo) return false;
      if (regionFilter.length > 0 && !regionFilter.includes(v.region))
        return false;
      if (!leadDayFilter.includes(v.leadDay)) return false;
      return true;
    });
  }, [verifications, dateFrom, dateTo, regionFilter, leadDayFilter]);

  const grouped = useMemo(() => {
    const map: Record<
      string,
      Record<number, Record<string, (typeof filtered)[0]>>
    > = {};
    filtered.forEach((v) => {
      if (!map[v.realisedDate]) map[v.realisedDate] = {};
      if (!map[v.realisedDate][v.leadDay]) map[v.realisedDate][v.leadDay] = {};
      map[v.realisedDate][v.leadDay][v.region] = v;
    });
    return map;
  }, [filtered]);

  const groupedEntries = useMemo(() => {
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [grouped]);

  const totalPages = Math.max(1, Math.ceil(groupedEntries.length / PAGE_SIZE));
  const pagedEntries = groupedEntries.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  // Summary stats
  const avgByLeadDay = useMemo(() => {
    const result: Record<number, { total: number; count: number }> = {};
    for (let i = 1; i <= 7; i++) result[i] = { total: 0, count: 0 };
    filtered.forEach((v) => {
      result[v.leadDay].total += v.accuracy;
      result[v.leadDay].count++;
    });
    return Object.entries(result).map(([day, data]) => ({
      leadDay: Number(day),
      avg: data.count > 0 ? Math.round(data.total / data.count) : 0,
      count: data.count,
    }));
  }, [filtered]);

  const avgByRegion = useMemo(() => {
    const result: Record<string, { total: number; count: number }> = {};
    filtered.forEach((v) => {
      if (!result[v.region]) result[v.region] = { total: 0, count: 0 };
      result[v.region].total += v.accuracy;
      result[v.region].count++;
    });
    return REGIONS.map((r) => ({
      region: r,
      avg: result[r]?.count ? Math.round(result[r].total / result[r].count) : 0,
      count: result[r]?.count || 0,
    }));
  }, [filtered]);

  const exportToJSON = () => {
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Report exported to JSON", "success");
  };

  // Task A: Accuracy Heatmap Matrix
  const heatmapData = useMemo(() => {
    const matrix: Record<string, Record<number, number[]>> = {};
    REGIONS.forEach((r) => {
      matrix[r] = {};
      for (let i = 1; i <= 7; i++) matrix[r][i] = [];
    });
    filtered.forEach((v) => {
      if (matrix[v.region]) matrix[v.region][v.leadDay].push(v.accuracy);
    });
    return REGIONS.map((region) => ({
      region,
      days: Array.from({ length: 7 }, (_, i) => {
        const arr = matrix[region][i + 1];
        return arr && arr.length > 0
          ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
          : null;
      }),
    }));
  }, [filtered]);

  // Task B: Category Distribution (Forecast vs Realised)
  const categoryDistData = useMemo(() => {
    return REGIONS.map((region) => {
      const regionVerifs = filtered.filter((v) => v.region === region);
      const data: any = { region: region.replace(" ", "\n") };
      CATEGORIES.forEach((c) => {
        data[`fcst_${c}`] = regionVerifs.filter(
          (v) => v.forecastValue === c,
        ).length;
        data[`real_${c}`] = regionVerifs.filter(
          (v) => v.realisedValue === c,
        ).length;
      });
      return data;
    });
  }, [filtered]);

  const CAT_COLORS: Record<string, string> = {
    DRY: "#94a3b8", // gray
    ISOL: "#3b82f6", // blue
    SCT: "#22c55e", // green
    FWS: "#eab308", // yellow
    WS: "#a855f7", // purple
  };

  // Task C: Lead Day Accuracy Degradation
  const degradationData = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7].map((day) => {
      const dayVerifs = filtered.filter((v) => v.leadDay === day);
      const data: any = { name: `Day-${day}` };
      REGIONS.forEach((region) => {
        const rv = dayVerifs.filter((v) => v.region === region);
        data[region] = rv.length
          ? Math.round(rv.reduce((a, b) => a + b.accuracy, 0) / rv.length)
          : null;
      });
      data.Overall = dayVerifs.length
        ? Math.round(
            dayVerifs.reduce((a, b) => a + b.accuracy, 0) / dayVerifs.length,
          )
        : null;
      return data;
    });
  }, [filtered]);

  const REGION_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
  ];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-[#3b82f6]" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">Regions</label>
            <div className="flex flex-wrap gap-1">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRegion(r)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    regionFilter.length === 0 || regionFilter.includes(r)
                      ? "bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/40"
                      : "bg-[#0d1f35] text-[#64748b] border border-[#1e3a5f]"
                  }`}
                >
                  {r.replace(" ", "\n")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#94a3b8] mb-1">
              Lead Days
            </label>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => toggleLeadDay(d)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    leadDayFilter.includes(d)
                      ? "bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40"
                      : "bg-[#0d1f35] text-[#64748b] border border-[#1e3a5f]"
                  }`}
                >
                  D{d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => runVerification()}
            variant="outline"
            size="sm"
            className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
          >
            <RefreshCw size={14} className="mr-1" />
            Re-run Verification
          </Button>
          <Button
            onClick={exportToJSON}
            variant="outline"
            size="sm"
            className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
          >
            <Download size={14} className="mr-1" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Shifted Top Charts & Heatmap */}
      {filtered.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* B) Forecast vs Realised Category Distribution */}
            <Card className="bg-[#111d32] border-[#1e3a5f]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#e2e8f0] flex items-center gap-2">
                    <BarChartIcon size={18} className="text-[#10b981]" />
                    Forecast vs Realised Category Distribution
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a]"
                    onClick={() =>
                      downloadChartAsImage(
                        "chart-category-dist",
                        "Category_Distribution",
                      )
                    }
                  >
                    <Download size={14} className="mr-1" /> Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80" id="chart-category-dist">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryDistData}
                      margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e3a5f"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="region"
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#111d32",
                          borderColor: "#1e3a5f",
                          color: "#e2e8f0",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "#e2e8f0" }}
                      />
                      <RechartsLegend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      />

                      {/* Forecast Stack */}
                      {CATEGORIES.map((c) => (
                        <Bar
                          key={`fcst_${c}`}
                          dataKey={`fcst_${c}`}
                          name={`Fcst ${c}`}
                          stackId="forecast"
                          fill={CAT_COLORS[c]}
                          radius={[0, 0, 0, 0]}
                        />
                      ))}
                      {/* Realised Stack */}
                      {CATEGORIES.map((c) => (
                        <Bar
                          key={`real_${c}`}
                          dataKey={`real_${c}`}
                          name={`Real ${c}`}
                          stackId="realised"
                          fill={CAT_COLORS[c]}
                          radius={[0, 0, 0, 0]}
                        />
                      ))}

                      <Brush
                        dataKey="region"
                        height={25}
                        stroke="#3b82f6"
                        fill="#0d1f35"
                        travellerWidth={12}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center text-[10px] text-[#64748b]">
                  Left Bar: Forecast | Right Bar: Realised
                </div>
              </CardContent>
            </Card>

            {/* C) Lead Day Accuracy Degradation */}
            <Card className="bg-[#111d32] border-[#1e3a5f]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#e2e8f0] flex items-center gap-2">
                    <Activity size={18} className="text-[#f59e0b]" />
                    Lead Day Accuracy Degradation by Region
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a]"
                    onClick={() =>
                      downloadChartAsImage(
                        "chart-lead-deg",
                        "Lead_Day_Degradation",
                      )
                    }
                  >
                    <Download size={14} className="mr-1" /> Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80" id="chart-lead-deg">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={degradationData}
                      margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e3a5f"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#111d32",
                          borderColor: "#1e3a5f",
                          color: "#e2e8f0",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "#e2e8f0", fontSize: "12px" }}
                      />
                      <RechartsLegend wrapperStyle={{ fontSize: "10px" }} />

                      {REGIONS.map((region, idx) => (
                        <Line
                          key={region}
                          type="monotone"
                          dataKey={region}
                          stroke={REGION_COLORS[idx]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: REGION_COLORS[idx] }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                      <Line
                        type="monotone"
                        dataKey="Overall"
                        stroke="#ffffff"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />

                      <Brush
                        dataKey="name"
                        height={25}
                        stroke="#f59e0b"
                        fill="#0d1f35"
                        travellerWidth={12}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* A) Accuracy Heatmap */}
          <Card className="bg-[#111d32] border-[#1e3a5f]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#e2e8f0] flex items-center gap-2">
                <Activity size={18} className="text-[#3b82f6]" />
                Accuracy Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-[#1e3a5f]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0d1f35]">
                      <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">
                        Region
                      </th>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <th
                          key={d}
                          className="text-center px-3 py-3 text-[#94a3b8] font-medium"
                        >
                          Day-{d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]">
                    {heatmapData.map((row) => (
                      <tr
                        key={row.region}
                        className="hover:bg-[#1a2d4a] transition-colors"
                      >
                        <td className="px-4 py-3 text-[#e2e8f0] text-xs font-medium">
                          {row.region}
                        </td>
                        {row.days.map((val, idx) => {
                          if (val === null) {
                            return (
                              <td
                                key={idx}
                                className="text-center px-3 py-3 text-[#475569]"
                              >
                                -
                              </td>
                            );
                          }
                          let bgColor = "bg-[#ef4444]"; // < 25%
                          if (val >= 75) bgColor = "bg-[#22c55e]";
                          else if (val >= 50) bgColor = "bg-[#f59e0b]";
                          else if (val >= 25) bgColor = "bg-[#f97316]";

                          return (
                            <td key={idx} className="text-center px-3 py-3">
                              <span
                                className={`inline-block px-2.5 py-1 rounded text-xs font-bold text-white shadow-sm min-w-[3rem] ${bgColor}`}
                              >
                                {val}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
            <h4 className="text-sm font-semibold text-[#e2e8f0] mb-3">
              Lead Day Summary
            </h4>
            <div className="space-y-2">
              {avgByLeadDay.map((ld) => (
                <div key={ld.leadDay} className="flex items-center gap-3">
                  <span className="text-xs text-[#94a3b8] w-14">
                    Day-{ld.leadDay}
                  </span>
                  <div className="flex-1 bg-[#0d1f35] rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${ld.avg}%`,
                        background:
                          ld.avg >= 70
                            ? "#10b981"
                            : ld.avg >= 50
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#e2e8f0] w-10 text-right">
                    {ld.avg}%
                  </span>
                  <span className="text-[10px] text-[#64748b] w-12 text-right">
                    {ld.count} samples
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
            <h4 className="text-sm font-semibold text-[#e2e8f0] mb-3">
              Region Summary
            </h4>
            <div className="space-y-2">
              {avgByRegion.map((r) => (
                <div key={r.region} className="flex items-center gap-3">
                  <span className="text-xs text-[#94a3b8] w-24 truncate">
                    {r.region}
                  </span>
                  <div className="flex-1 bg-[#0d1f35] rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${r.avg}%`,
                        background:
                          r.avg >= 70
                            ? "#10b981"
                            : r.avg >= 50
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#e2e8f0] w-10 text-right">
                    {r.avg}%
                  </span>
                  <span className="text-[10px] text-[#64748b] w-12 text-right">
                    {r.count} samples
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e3a5f] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">
            Verification Results ({filtered.length} entries)
          </h3>
          {groupedEntries.length > PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-[#1a2d4a] disabled:opacity-30 text-[#94a3b8]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-[#94a3b8]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-[#1a2d4a] disabled:opacity-30 text-[#94a3b8]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[#64748b]">
            <FileText size={32} className="mx-auto mb-3 opacity-50" />
            <p>No verification results match the current filters.</p>
            <p className="text-xs mt-1">
              Add forecasts and realised data, then run verification.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1f35]">
                  <th className="text-left px-3 py-3 text-[#94a3b8] font-medium sticky left-0 bg-[#0d1f35] z-10">
                    Date
                  </th>
                  <th className="text-left px-3 py-3 text-[#94a3b8] font-medium">
                    Region
                  </th>
                  <th className="text-center px-3 py-3 text-[#94a3b8] font-medium">
                    Realised
                  </th>
                  {[...leadDayFilter]
                    .sort((a, b) => a - b)
                    .map((d) => (
                      <th
                        key={d}
                        className="text-center px-3 py-3 text-[#94a3b8] font-medium text-xs"
                      >
                        Day-{d}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {pagedEntries.map(([rDate, leadDays]) => {
                  return REGIONS.map((region, rIdx) => {
                    // Check if this region has any data
                    const hasData = leadDayFilter.some(
                      (ld) => leadDays[ld]?.[region],
                    );
                    if (!hasData) return null;

                    const realisedVal = leadDayFilter
                      .map((ld) => leadDays[ld]?.[region]?.realisedValue)
                      .find((v) => v);

                    return (
                      <tr
                        key={`${rDate}-${region}`}
                        className="hover:bg-[#1a2d4a] transition-colors"
                      >
                        {rIdx === 0 && (
                          <td
                            rowSpan={REGIONS.length}
                            className="px-3 py-2 text-[#e2e8f0] font-mono text-xs font-medium sticky left-0 bg-[#111d32] z-10"
                          >
                            {formatDate(rDate, settings.dateFormat)}
                          </td>
                        )}
                        <td className="px-3 py-2 text-[#94a3b8] text-xs">
                          {region}
                        </td>
                        <td className="text-center px-3 py-2">
                          {realisedVal && (
                            <CategoryBadge category={realisedVal} size="sm" />
                          )}
                        </td>
                        {[...leadDayFilter]
                          .sort((a, b) => a - b)
                          .map((ld) => {
                            const v = leadDays[ld]?.[region];
                            return (
                              <td key={ld} className="text-center px-3 py-2">
                                {v ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <CategoryBadge
                                      category={v.forecastValue}
                                      size="sm"
                                    />
                                    <AccuracyCell accuracy={v.accuracy} />
                                  </div>
                                ) : (
                                  <span className="text-[#475569]">-</span>
                                )}
                              </td>
                            );
                          })}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
