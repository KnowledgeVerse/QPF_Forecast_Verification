import { useLocation } from "react-router-dom";
import {
  Bell,
  Calendar,
  CloudSun,
  CloudRain,
  FileText,
  PieChart,
  Settings as SettingsIcon,
  Cloud,
  Home,
  Droplets,
  Upload,
  ClipboardCheck,
  BarChart3,
  Grid3X3,
} from "lucide-react";
import { useForecastStore } from "@/hooks/useForecastStore";
import { formatDate, getToday } from "@/lib/utils";

const pageConfig: Record<string, { title: string; icon: React.ReactNode }> = {
  "/": {
    title: "Dashboard",
    icon: <CloudSun size={24} className="text-[#3b82f6] animate-bounce" />,
  },
  "/forecast": {
    title: "Forecast Entry",
    icon: <CloudSun size={24} className="text-[#10b981] animate-pulse" />,
  },
  "/realised": {
    title: "Realised Data",
    icon: <CloudRain size={24} className="text-[#0ea5e9] animate-bounce" />,
  },
  "/verification": {
    title: "Verification Report",
    icon: <FileText size={24} className="text-[#8b5cf6] animate-pulse" />,
  },
  "/charts": {
    title: "Analytics & Charts",
    icon: <PieChart size={24} className="text-[#f59e0b] animate-bounce" />,
  },
  "/contingency": {
    title: "Contingency Analysis",
    icon: <Grid3X3 size={24} className="text-[#34d399] animate-pulse" />,
  },
  "/settings": {
    title: "Settings",
    icon: <SettingsIcon size={24} className="text-[#94a3b8] animate-spin" />,
  },
  "/swfc/QPF_Forecast_Entry": {
    title: "QPF Forecast Entry",
    icon: <CloudRain size={24} className="text-[#3b82f6] animate-bounce" />,
  },
  "/swfc/QPF_Realised_Entry": {
    title: "QPF Realised Entry",
    icon: <Droplets size={24} className="text-[#0ea5e9] animate-pulse" />,
  },
  "/swfc/QPF_Upload_Data": {
    title: "QPF Upload Data",
    icon: <Upload size={24} className="text-[#8b5cf6] animate-bounce" />,
  },
  "/swfc/QPF_Verification_Report": {
    title: "QPF Verification Report",
    icon: <ClipboardCheck size={24} className="text-[#10b981] animate-pulse" />,
  },
  "/swfc/QPF_Analytics_Charts": {
    title: "QPF Analytics Charts",
    icon: <BarChart3 size={24} className="text-[#f59e0b] animate-bounce" />,
  },
};

export default function TopHeader() {
  const location = useLocation();
  const { settings } = useForecastStore();

  const config = pageConfig[location.pathname] || {
    title: "Rainfall Forecast",
    icon: <Cloud size={24} className="text-[#3b82f6]" />,
  };
  const today = formatDate(getToday(), settings.dateFormat);

  return (
    <header className="h-16 bg-[#0d1f35] border-b border-[#1e3a5f] flex items-center justify-between px-6 sticky top-[88px] z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-[#111d32] rounded-lg border border-[#1e3a5f] shadow-[0_0_10px_rgba(59,130,246,0.1)]">
          {config.icon}
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-[#e2e8f0] tracking-wide uppercase">
          {config.title}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {/* Main Home Button */}
        <a
          href="https://biharmausam.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-[#111d32] hover:bg-[#1a2d4a] border border-[#1e3a5f] hover:border-[#3b82f6]/50 text-[#94a3b8] hover:text-white rounded-lg transition-all duration-300 group shadow-sm"
        >
          <Home
            size={16}
            className="text-[#3b82f6] group-hover:scale-110 transition-transform"
          />
          <span className="font-semibold text-xs hidden sm:inline">
            Main Home
          </span>
        </a>

        <div className="hidden sm:flex items-center gap-2 text-sm text-[#94a3b8]">
          <Calendar size={16} />
          <span>{today}</span>
        </div>
        <button className="p-2 rounded-lg hover:bg-[#1a2d4a] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full" />
        </button>
      </div>
    </header>
  );
}
