import { useNavigate } from "react-router-dom";
import {
  CloudSun,
  CloudRain,
  Target,
  CalendarDays,
  ArrowRight,
  FileText,
  Download,
} from "lucide-react";
import KPICard from "@/components/ui/KPICard";
import AccuracyCell from "@/components/ui/AccuracyCell";
import { useForecastStore } from "@/hooks/useForecastStore";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    forecasts,
    realised,
    getDailyAccuracy,
    getLeadDayAccuracy,
    settings,
  } = useForecastStore();
  const dailyAccuracy = getDailyAccuracy();
  const leadDayAccuracy = getLeadDayAccuracy();

  const totalForecasts = forecasts.length;
  const totalRealised = realised.length;

  // Calculate overall accuracy
  const allAccuracies = dailyAccuracy.map((d) => d.overallAccuracy);
  const overallAccuracy =
    allAccuracies.length > 0
      ? Math.round(
          allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length,
        )
      : 0;

  // Find best lead day
  const bestLeadDay = leadDayAccuracy.reduce(
    (best, curr) => (curr.averageAccuracy > best.averageAccuracy ? curr : best),
    { leadDay: 0, averageAccuracy: 0, count: 0 },
  );

  // Recent 7 days
  const recentDays = dailyAccuracy.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Forecasts"
          value={totalForecasts}
          subtitle="Forecasts issued"
          trend="up"
          trendValue={`+${totalForecasts > 0 ? totalForecasts : 0} total`}
          icon={<CloudSun size={22} />}
          color="#3b82f6"
        />
        <KPICard
          title="Overall Accuracy"
          value={`${overallAccuracy}%`}
          subtitle="Average across all days"
          trend={
            overallAccuracy >= 70
              ? "up"
              : overallAccuracy >= 50
                ? "neutral"
                : "down"
          }
          trendValue={
            overallAccuracy >= 70
              ? "Good"
              : overallAccuracy >= 50
                ? "Average"
                : "Needs Improvement"
          }
          icon={<Target size={22} />}
          color={
            overallAccuracy >= 70
              ? "#10b981"
              : overallAccuracy >= 50
                ? "#f59e0b"
                : "#ef4444"
          }
        />
        <KPICard
          title="Best Lead Day"
          value={bestLeadDay.leadDay > 0 ? `Day-${bestLeadDay.leadDay}` : "N/A"}
          subtitle={`${bestLeadDay.averageAccuracy}% accuracy`}
          icon={<CalendarDays size={22} />}
          color="#8b5cf6"
        />
        <KPICard
          title="Realised Entries"
          value={totalRealised}
          subtitle="Days recorded"
          trend="up"
          trendValue={`${totalRealised} entries`}
          icon={<CloudRain size={22} />}
          color="#06b6d4"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/forecast")}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
          >
            <CloudSun size={16} className="mr-2" />
            New Forecast
          </Button>
          <Button
            onClick={() => navigate("/realised")}
            variant="outline"
            className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a] hover:text-[#e2e8f0]"
          >
            <CloudRain size={16} className="mr-2" />
            Enter Realised Data
          </Button>
          <Button
            onClick={() => navigate("/verification")}
            variant="outline"
            className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a] hover:text-[#e2e8f0]"
          >
            <FileText size={16} className="mr-2" />
            View Report
          </Button>
          <Button
            onClick={() => navigate("/charts")}
            variant="outline"
            className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a] hover:text-[#e2e8f0]"
          >
            <Download size={16} className="mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Recent Accuracy Summary */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e3a5f] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#e2e8f0]">
            Recent Verification Results
          </h2>
          <button
            onClick={() => navigate("/verification")}
            className="text-sm text-[#3b82f6] hover:text-[#60a5fa] flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight size={14} />
          </button>
        </div>

        {recentDays.length === 0 ? (
          <div className="p-8 text-center text-[#64748b]">
            <FileText size={32} className="mx-auto mb-3 opacity-50" />
            <p>
              No verification data yet. Add forecasts and realised data to see
              results.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d1f35]">
                  <th className="text-left px-4 py-3 text-[#94a3b8] font-medium">
                    Date
                  </th>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <th
                      key={d}
                      className="text-center px-3 py-3 text-[#94a3b8] font-medium"
                    >
                      Day-{d}
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 text-[#94a3b8] font-medium">
                    Overall
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {recentDays.map((day) => (
                  <tr
                    key={day.date}
                    className="hover:bg-[#1a2d4a] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#e2e8f0] font-mono">
                      {formatDate(day.date, settings.dateFormat)}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7].map((ld) => (
                      <td key={ld} className="text-center px-3 py-3">
                        {day.leadDayAccuracies[ld] > 0 ? (
                          <AccuracyCell accuracy={day.leadDayAccuracies[ld]} />
                        ) : (
                          <span className="text-[#475569]">-</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center px-4 py-3">
                      {day.overallAccuracy > 0 ? (
                        <AccuracyCell accuracy={day.overallAccuracy} />
                      ) : (
                        <span className="text-[#475569]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Day Summary Mini */}
      {leadDayAccuracy.some((l) => l.count > 0) && (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
          <h2 className="text-base font-semibold text-[#e2e8f0] mb-4">
            Lead Day Accuracy Summary
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {leadDayAccuracy.map((ld) => (
              <div
                key={ld.leadDay}
                className="text-center p-3 rounded-lg bg-[#0d1f35] border border-[#1e3a5f]"
              >
                <p className="text-xs text-[#94a3b8] mb-1">Day-{ld.leadDay}</p>
                <p
                  className="text-lg font-bold"
                  style={{
                    color:
                      ld.averageAccuracy >= 70
                        ? "#10b981"
                        : ld.averageAccuracy >= 50
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {ld.averageAccuracy}%
                </p>
                <p className="text-[10px] text-[#64748b]">{ld.count} samples</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
