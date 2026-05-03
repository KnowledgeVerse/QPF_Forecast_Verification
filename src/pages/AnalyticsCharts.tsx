import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  BarChart3,
  TrendingUp,
  Map,
  PieChart,
  Target,
  Trophy,
  AlertOctagon,
  TrendingDown,
  Activity,
  Download,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Brush as RechartsBrush,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useForecastStore } from "@/hooks/useForecastStore";
import { REGIONS, CATEGORIES } from "@/types";
import { getAccuracyColor, downloadChartAsImage } from "@/lib/utils";
import Footer from "@/components/Footer";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

export default function AnalyticsChartsPage() {
  const { getLeadDayAccuracy, getRegionAccuracy, verifications } =
    useForecastStore();
  const leadDayData = getLeadDayAccuracy();
  const regionData = getRegionAccuracy();

  // Chart 1: Lead Day Accuracy (Bar)
  const leadDayChart = useMemo(() => {
    const labels = leadDayData.map((d) => `Day-${d.leadDay}`);
    const values = leadDayData.map((d) => d.averageAccuracy);
    const colors = values.map((v) =>
      v >= 70 ? "#10b981" : v >= 50 ? "#f59e0b" : "#ef4444",
    );

    return {
      data: {
        labels,
        datasets: [
          {
            label: "Accuracy %",
            data: values,
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false as const,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111d32",
            titleColor: "#e2e8f0",
            bodyColor: "#94a3b8",
            borderColor: "#1e3a5f",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: "#1e3a5f" },
            ticks: { color: "#94a3b8" },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#94a3b8" },
          },
        },
      },
    };
  }, [leadDayData]);

  // Chart 2: Region-wise Heatmap (Horizontal Bar)
  const regionChart = useMemo(() => {
    const labels = regionData.map((r) => r.region);
    const values = regionData.map((r) => r.averageAccuracy);

    return {
      data: {
        labels,
        datasets: [
          {
            label: "Avg Accuracy %",
            data: values,
            backgroundColor: values.map((v) =>
              v >= 70
                ? "rgba(16,185,129,0.7)"
                : v >= 50
                  ? "rgba(245,158,11,0.7)"
                  : "rgba(239,68,68,0.7)",
            ),
            borderRadius: 6,
            borderSkipped: false as const,
          },
        ],
      },
      options: {
        indexAxis: "y" as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#111d32",
            titleColor: "#e2e8f0",
            bodyColor: "#94a3b8",
            borderColor: "#1e3a5f",
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            grid: { color: "#1e3a5f" },
            ticks: { color: "#94a3b8" },
          },
          y: {
            grid: { display: false },
            ticks: { color: "#94a3b8" },
          },
        },
      },
    };
  }, [regionData]);

  // Chart 3: Monthly Trend (Line)
  const monthlyChart = useMemo(() => {
    const monthly: Record<string, Record<number, number[]>> = {};
    verifications.forEach((v) => {
      const month = v.realisedDate.substring(0, 7); // YYYY-MM
      if (!monthly[month]) monthly[month] = {};
      if (!monthly[month][v.leadDay]) monthly[month][v.leadDay] = [];
      monthly[month][v.leadDay].push(v.accuracy);
    });

    const months = Object.keys(monthly).sort();
    const monthLabels = months.map((m) => {
      const [y, mn] = m.split("-");
      return `${mn}/${y}`;
    });

    const datasets = [1, 3, 5, 7].map((ld, idx) => {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
      return {
        label: `Day-${ld}`,
        data: months.map((m) => {
          const arr = monthly[m][ld];
          return arr
            ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
            : 0;
        }),
        borderColor: colors[idx],
        backgroundColor: colors[idx] + "20",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: colors[idx],
      };
    });

    return {
      data: { labels: monthLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#94a3b8" },
          },
          tooltip: {
            backgroundColor: "#111d32",
            titleColor: "#e2e8f0",
            bodyColor: "#94a3b8",
            borderColor: "#1e3a5f",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: "#1e3a5f" },
            ticks: { color: "#94a3b8" },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#94a3b8" },
          },
        },
      },
    };
  }, [verifications]);

  // Chart 4: Region Heatmap Matrix
  const regionHeatmap = useMemo(() => {
    const matrix: Record<string, Record<number, number[]>> = {};
    REGIONS.forEach((r) => {
      matrix[r] = {};
      for (let i = 1; i <= 7; i++) matrix[r][i] = [];
    });

    verifications.forEach((v) => {
      if (matrix[v.region]) {
        matrix[v.region][v.leadDay].push(v.accuracy);
      }
    });

    return REGIONS.map((region) => ({
      region,
      days: Array.from({ length: 7 }, (_, i) => {
        const arr = matrix[region][i + 1];
        return arr && arr.length > 0
          ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
          : 0;
      }),
    }));
  }, [verifications]);

  // Task D: Radar Chart Data
  const radarData = useMemo(() => {
    return REGIONS.map((region) => {
      const data: any = { region: region.replace(" ", "\n") };
      [1, 2, 3, 4, 5, 6, 7].forEach((day) => {
        const rv = verifications.filter(
          (v) => v.region === region && v.leadDay === day,
        );
        data[`D${day}`] = rv.length
          ? Math.round(rv.reduce((a, b) => a + b.accuracy, 0) / rv.length)
          : 0;
      });
      return data;
    });
  }, [verifications]);

  // Task E: Best vs Worst Region KPI Data
  const { bestRegion, worstRegion } = useMemo(() => {
    const stats = REGIONS.map((region) => {
      const rv = verifications.filter((v) => v.region === region);
      const acc = rv.length
        ? rv.reduce((a, b) => a + b.accuracy, 0) / rv.length
        : 0;

      // Trend mock calculation (current vs previous 30 items)
      const sorted = [...rv].sort((a, b) =>
        b.realisedDate.localeCompare(a.realisedDate),
      );
      const current = sorted.slice(0, Math.floor(sorted.length / 2));
      const previous = sorted.slice(Math.floor(sorted.length / 2));

      const currAcc = current.length
        ? current.reduce((a, b) => a + b.accuracy, 0) / current.length
        : 0;
      const prevAcc = previous.length
        ? previous.reduce((a, b) => a + b.accuracy, 0) / previous.length
        : 0;

      return {
        region,
        acc: Math.round(acc),
        trend: Math.round(currAcc - prevAcc),
      };
    })
      .filter((s) => s.acc > 0)
      .sort((a, b) => b.acc - a.acc);

    return {
      bestRegion: stats[0] || { region: "N/A", acc: 0, trend: 0 },
      worstRegion: stats[stats.length - 1] || {
        region: "N/A",
        acc: 0,
        trend: 0,
      },
    };
  }, [verifications]);

  // Task F: Category-wise Accuracy Breakdown (Grouped Bar)
  const catAccuracyData = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const data: any = { category: cat };
      [1, 2, 3, 4, 5, 6, 7].forEach((day) => {
        const cv = verifications.filter(
          (v) => v.forecastValue === cat && v.leadDay === day,
        );
        data[`D${day}`] = cv.length
          ? Math.round(cv.reduce((a, b) => a + b.accuracy, 0) / cv.length)
          : 0;
      });
      return data;
    });
  }, [verifications]);

  const LEAD_DAY_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#ef4444",
  ];

  return (
    <div className="space-y-6">
      {/* Shifted Top Charts: D & F Side-by-side */}
      {verifications.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* D) Region Performance Radar */}
          <Card className="bg-[#111d32] border-[#1e3a5f]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#e2e8f0] flex items-center gap-2">
                  <Target size={18} className="text-[#8b5cf6]" />
                  Region Performance Radar
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a]"
                  onClick={() =>
                    downloadChartAsImage("chart-radar", "Region_Radar")
                  }
                >
                  <Download size={14} className="mr-1" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96" id="chart-radar">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="65%"
                    data={radarData}
                  >
                    <PolarGrid stroke="#1e3a5f" />
                    <PolarAngleAxis
                      dataKey="region"
                      tick={{ fill: "#e2e8f0", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: "#64748b" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111d32",
                        borderColor: "#1e3a5f",
                        color: "#e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <RechartsLegend wrapperStyle={{ fontSize: "11px" }} />

                    {[1, 2, 3, 4, 5, 6, 7].map((day, idx) => (
                      <Radar
                        key={day}
                        name={`Day ${day}`}
                        dataKey={`D${day}`}
                        stroke={LEAD_DAY_COLORS[idx]}
                        fill={LEAD_DAY_COLORS[idx]}
                        fillOpacity={0.15}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* F) Category-wise Accuracy Breakdown */}
          <Card className="bg-[#111d32] border-[#1e3a5f]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#e2e8f0] flex items-center gap-2">
                  <Activity size={18} className="text-[#06b6d4]" />
                  Category-wise Accuracy by Lead Day
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a]"
                  onClick={() =>
                    downloadChartAsImage("chart-cat-acc", "Category_Accuracy")
                  }
                >
                  <Download size={14} className="mr-1" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96" id="chart-cat-acc">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={catAccuracyData}
                    margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                  >
                    <RechartsCartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e3a5f"
                      vertical={false}
                    />
                    <RechartsXAxis
                      dataKey="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsYAxis
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
                    />
                    <RechartsLegend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    />

                    {[1, 2, 3, 4, 5, 6, 7].map((day, idx) => (
                      <RechartsBar
                        key={day}
                        dataKey={`D${day}`}
                        name={`Day ${day}`}
                        fill={LEAD_DAY_COLORS[idx]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}

                    <RechartsBrush
                      dataKey="category"
                      height={25}
                      stroke="#06b6d4"
                      fill="#0d1f35"
                      travellerWidth={12}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart 1: Lead Day Accuracy */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#3b82f6]" />
            <h3 className="text-base font-semibold text-[#e2e8f0]">
              Lead Day Accuracy
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a]"
            onClick={() =>
              downloadChartAsImage("chart-lead-day", "Lead_Day_Accuracy")
            }
          >
            <Download size={14} className="mr-1" /> Export
          </Button>
        </div>
        <div className="h-72" id="chart-lead-day">
          <Bar data={leadDayChart.data} options={leadDayChart.options} />
        </div>
      </div>

      {/* Charts 2 & 3 side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Map size={18} className="text-[#10b981]" />
              <h3 className="text-base font-semibold text-[#e2e8f0]">
                Region-wise Accuracy
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a]"
              onClick={() =>
                downloadChartAsImage("chart-region-acc", "Region_Accuracy")
              }
            >
              <Download size={14} className="mr-1" /> Export
            </Button>
          </div>
          <div className="h-72" id="chart-region-acc">
            <Bar data={regionChart.data} options={regionChart.options} />
          </div>
        </div>

        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#f59e0b]" />
              <h3 className="text-base font-semibold text-[#e2e8f0]">
                Monthly Trend (Selected Lead Days)
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a]"
              onClick={() =>
                downloadChartAsImage("chart-monthly-trend", "Monthly_Trend")
              }
            >
              <Download size={14} className="mr-1" /> Export
            </Button>
          </div>
          <div className="h-72" id="chart-monthly-trend">
            <Line data={monthlyChart.data} options={monthlyChart.options} />
          </div>
        </div>
      </div>

      {/* Chart 4: Heatmap Matrix */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={18} className="text-[#8b5cf6]" />
          <h3 className="text-base font-semibold text-[#e2e8f0]">
            Region × Lead Day Heatmap
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-[#94a3b8] font-medium">
                  Region
                </th>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <th
                    key={d}
                    className="text-center px-3 py-2 text-[#94a3b8] font-medium text-xs"
                  >
                    Day-{d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a5f]">
              {regionHeatmap.map(({ region, days }) => (
                <tr
                  key={region}
                  className="hover:bg-[#1a2d4a] transition-colors"
                >
                  <td className="px-3 py-2 text-[#e2e8f0] text-xs font-medium">
                    {region}
                  </td>
                  {days.map((val, idx) => {
                    const { bg, text } = getAccuracyColor(val);
                    return (
                      <td key={idx} className="text-center px-3 py-2">
                        <span
                          className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold min-w-[48px]"
                          style={{ background: bg, color: text }}
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
      </div>

      {/* Divider */}
      {verifications.length > 0 && <div className="h-px bg-[#1e3a5f] my-8" />}

      {/* TASK 2: New Analytics Sections */}
      {verifications.length > 0 && (
        <div className="space-y-6">
          {/* E) Best vs Worst Region KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#111d32] border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                    Best Region 🏆
                  </p>
                  <h3 className="text-2xl font-bold text-[#e2e8f0]">
                    {bestRegion.region}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl font-mono text-[#22c55e]">
                      {bestRegion.acc}%
                    </span>
                    {bestRegion.trend !== 0 && (
                      <span
                        className={`text-xs flex items-center ${bestRegion.trend > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                      >
                        {bestRegion.trend > 0 ? (
                          <TrendingUp size={14} className="mr-1" />
                        ) : (
                          <TrendingDown size={14} className="mr-1" />
                        )}
                        {Math.abs(bestRegion.trend)}% vs prev
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Trophy size={28} className="text-[#22c55e]" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111d32] border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">
                    Needs Attention ⚠️
                  </p>
                  <h3 className="text-2xl font-bold text-[#e2e8f0]">
                    {worstRegion.region}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl font-mono text-[#ef4444]">
                      {worstRegion.acc}%
                    </span>
                    {worstRegion.trend !== 0 && (
                      <span
                        className={`text-xs flex items-center ${worstRegion.trend > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                      >
                        {worstRegion.trend > 0 ? (
                          <TrendingUp size={14} className="mr-1" />
                        ) : (
                          <TrendingDown size={14} className="mr-1" />
                        )}
                        {Math.abs(worstRegion.trend)}% vs prev
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertOctagon size={28} className="text-[#ef4444]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
