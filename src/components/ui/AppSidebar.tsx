import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CloudSun,
  CloudRain,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  Cloud,
  Menu,
  X,
  Grid3X3,
  Palette,
  Sun,
  Moon,
  Droplets,
  Upload,
  Database,
} from "lucide-react";
import { useForecastStore } from "@/hooks/useForecastStore";
import { useState } from "react";

// Gradient Presets
const backgrounds = [
  {
    id: "default",
    color: "bg-slate-800",
    value: "default",
    label: "Default Dark",
  },
  {
    id: "sunset",
    color: "bg-gradient-to-tr from-[#ffecd2] to-[#fcb69f]",
    value: "linear-gradient(120deg, #ffecd2 0%, #fcb69f 100%)",
    mode: "light",
    label: "Sunrise",
  },
  {
    id: "ocean",
    color: "bg-gradient-to-r from-[#e0eafc] to-[#cfdef3]",
    value: "linear-gradient(to right, #e0eafc, #cfdef3)",
    mode: "light",
    label: "Ocean Breeze",
  },
  {
    id: "purple",
    color: "bg-gradient-to-r from-[#e2e2e2] to-[#c9d6ff]",
    value: "linear-gradient(to right, #e2e2e2, #c9d6ff)",
    mode: "light",
    label: "Soft Purple",
  },
  {
    id: "midnight",
    color: "bg-gradient-to-r from-[#0f2027] to-[#2c5364]",
    value: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
    mode: "dark",
    label: "Midnight",
  },
  {
    id: "aurora",
    color: "bg-gradient-to-r from-[#141E30] to-[#243B55]",
    value: "linear-gradient(to right, #141E30, #243B55)",
    mode: "dark",
    label: "Aurora",
  },
];

const navSections = [
  {
    title: "Categorical Forecast",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      {
        to: "/swfc/Rainfall_Forecast_Verification/forecast",
        label: "Forecast Entry",
        icon: CloudSun,
      },
      {
        to: "/swfc/Rainfall_Forecast_Verification/realised",
        label: "Realised Entry",
        icon: CloudRain,
      },
      {
        to: "/verification",
        label: "Verification Report",
        icon: ClipboardCheck,
      },
      { to: "/charts", label: "Analytics Charts", icon: BarChart3 },
      { to: "/contingency", label: "Contingency", icon: Grid3X3 },
    ],
  },
  {
    title: "QPF Forecast",
    items: [
      { to: "/swfc/QPF_Forecast_Entry", label: "QPF Entry", icon: CloudRain },
      {
        to: "/swfc/QPF_Realised_Entry",
        label: "Realised Entry",
        icon: Droplets,
      },
      { to: "/swfc/QPF_Upload_Data", label: "Upload Data", icon: Upload },
      {
        to: "/swfc/QPF_Verification_Report",
        label: "Verification Report",
        icon: ClipboardCheck,
        requiresData: true,
      },
      {
        to: "/swfc/QPF_Analytics_Charts",
        label: "Analytics Charts",
        icon: BarChart3,
        requiresData: true,
      },
      {
        to: "/swfc/QPF_Contingency",
        label: "Contingency",
        icon: Grid3X3,
        requiresData: true,
      },
    ],
  },
  {
    title: "General",
    items: [
      { to: "/database", label: "Database Sync", icon: Database },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { currentUser, logout, settings, updateSettings, verifications } =
    useForecastStore();
  const hasData = verifications && verifications.length > 0;
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const toggleTheme = () => {
    updateSettings({
      theme: settings.theme === "dark" ? "light" : "dark",
      appBackground: "default",
    });
  };

  // Dynamic CSS injector for advanced backgrounds and light glassmorphism
  const dynamicStyles = `
    body {
      background: ${settings.appBackground && settings.appBackground !== "default" ? settings.appBackground : settings.theme === "light" ? "#f8fafc" : "#0a1628"} !important;
      background-attachment: fixed !important;
      background-size: cover !important;
      transition: background 0.5s ease;
    }

    ${
      settings.theme === "light"
        ? `
      /* Light Mode Glassmorphism Overrides */
      .bg-\\[\\#0a1628\\] { background: transparent !important; }
      .bg-\\[\\#111d32\\], .bg-\\[\\#0d1f35\\], .bg-\\[\\#1a2d4a\\] {
        background-color: rgba(255, 255, 255, 0.6) !important;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-color: rgba(255, 255, 255, 0.4) !important;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07) !important;
        color: #0f172a !important;
      }
      
      .text-\\[\\#e2e8f0\\] { color: #0f172a !important; }
      .text-\\[\\#94a3b8\\] { color: #475569 !important; }
      .text-\\[\\#64748b\\] { color: #64748b !important; }
      
      .border-\\[\\#1e3a5f\\] { border-color: rgba(0,0,0,0.1) !important; }
      .divide-\\[\\#1e3a5f\\] > :not([hidden]) ~ :not([hidden]) { border-color: rgba(0,0,0,0.1) !important; }
      
      .hover\\:bg-\\[\\#1a2d4a\\]:hover { background-color: rgba(255,255,255,0.8) !important; color: #0f172a !important; }
      .hover\\:text-\\[\\#e2e8f0\\]:hover { color: #0f172a !important; }
      
      input.bg-\\[\\#0d1f35\\], select.bg-\\[\\#0d1f35\\] {
         background-color: rgba(255, 255, 255, 0.8) !important;
         color: #0f172a !important;
      }
      
      .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line, .recharts-polar-grid-angle line, .recharts-polar-grid-concentric polygon {
         stroke: rgba(0,0,0,0.1) !important;
      }
      .recharts-text { fill: #475569 !important; }
      .recharts-tooltip-wrapper .recharts-default-tooltip {
         background-color: rgba(255, 255, 255, 0.9) !important;
         border-color: rgba(0,0,0,0.1) !important;
         color: #0f172a !important;
      }
      
      tbody tr:nth-child(even).bg-\\[\\#0f1929\\] {
         background-color: rgba(255, 255, 255, 0.3) !important;
      }
    `
        : ""
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-[104px] left-4 z-50 p-2 rounded-lg bg-[#1a2d4a] border border-[#1e3a5f] text-[#e2e8f0] lg:hidden shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-[88px] bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-[88px] h-[calc(100vh-88px)] bg-[#0d1f35] border-r border-[#1e3a5f] z-40 transition-all duration-300 flex flex-col
          ${collapsed ? "w-16" : "w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo & Toggle */}
        <div
          className={`flex items-center h-16 border-b border-[#1e3a5f] ${collapsed ? "justify-center" : "px-4 justify-between"}`}
        >
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden pr-2">
              <Cloud className="text-[#3b82f6] flex-shrink-0" size={24} />
              <span className="font-bold text-xs text-[#e2e8f0] leading-tight">
                Rainfall Forecast Verification
              </span>
            </div>
          ) : null}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-[#1a2d4a] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu
              size={20}
              className={`transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
            />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.to);
                  const Icon = item.icon;
                  // Check if the item requires data and data is not yet uploaded
                  const disabled =
                    "requiresData" in item && item.requiresData && !hasData;

                  return (
                    <NavLink
                      key={item.to}
                      to={disabled ? "#" : item.to}
                      onClick={(e) => {
                        if (disabled) {
                          e.preventDefault();
                          return;
                        }
                        setMobileOpen(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                        ${
                          disabled
                            ? "opacity-50 cursor-not-allowed text-[#64748b]"
                            : active
                              ? "bg-[#1a2d4a] text-[#3b82f6] border-l-2 border-[#3b82f6]"
                              : "text-[#94a3b8] hover:bg-[#1a2d4a] hover:text-[#e2e8f0]"
                        }
                        ${collapsed ? "justify-center" : ""}
                      `}
                      title={disabled ? "Please upload data first" : item.label}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Advanced Theme Toggle */}
        <div className="border-t border-[#1e3a5f] p-3">
          {!collapsed ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                  Appearance
                </span>
                <button
                  onClick={() => setShowPalette(!showPalette)}
                  className={`p-1.5 rounded-lg transition-colors ${showPalette ? "bg-[#3b82f6] text-white" : "text-[#94a3b8] hover:bg-[#1a2d4a]"}`}
                  title="Background Themes"
                >
                  <Palette size={14} />
                </button>
              </div>

              {/* Interactive Sliding Toggle */}
              <div
                onClick={toggleTheme}
                className="relative w-full h-8 bg-[#0a1628] rounded-full border border-[#1e3a5f] cursor-pointer flex items-center p-1 shadow-inner"
              >
                <div
                  className={`absolute w-[calc(50%-4px)] h-6 bg-[#3b82f6] rounded-full shadow-md transition-transform duration-300 ease-in-out ${settings.theme === "light" ? "translate-x-[100%]" : "translate-x-0"}`}
                />
                <div className="relative z-10 w-1/2 flex items-center justify-center gap-1.5 text-xs font-bold text-white">
                  <Moon
                    size={12}
                    className={
                      settings.theme === "dark"
                        ? "text-white"
                        : "text-[#94a3b8]"
                    }
                  />
                  <span
                    className={
                      settings.theme === "dark"
                        ? "text-white"
                        : "text-[#94a3b8]"
                    }
                  >
                    Dark
                  </span>
                </div>
                <div className="relative z-10 w-1/2 flex items-center justify-center gap-1.5 text-xs font-bold text-white">
                  <Sun
                    size={12}
                    className={
                      settings.theme === "light"
                        ? "text-white"
                        : "text-[#94a3b8]"
                    }
                  />
                  <span
                    className={
                      settings.theme === "light"
                        ? "text-white"
                        : "text-[#94a3b8]"
                    }
                  >
                    Light
                  </span>
                </div>
              </div>

              {/* Gradient Color Picker */}
              {showPalette && (
                <div className="grid grid-cols-3 gap-2 mt-1 animate-in fade-in zoom-in duration-200">
                  {backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() =>
                        updateSettings({
                          appBackground: bg.value,
                          theme:
                            (bg.mode as "light" | "dark") || settings.theme,
                        })
                      }
                      className={`h-8 rounded-md border-2 transition-all ${bg.color} ${settings.appBackground === bg.value ? "border-white scale-105 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "border-transparent hover:scale-105 opacity-80 hover:opacity-100"}`}
                      title={bg.label}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setCollapsed(false);
                setShowPalette(true);
              }}
              className="w-full flex justify-center p-2 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1a2d4a] rounded-lg transition-colors"
              title="Appearance"
            >
              <Palette size={18} />
            </button>
          )}
        </div>

        {/* User / Bottom */}
        <div className="border-t border-[#1e3a5f] p-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                {currentUser.name[0].toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e2e8f0] truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-[#64748b] capitalize">
                    {currentUser.role}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={logout}
                  className="p-1.5 rounded hover:bg-[#1a2d4a] text-[#94a3b8] hover:text-[#ef4444] transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94a3b8] hover:bg-[#1a2d4a] hover:text-[#e2e8f0] transition-all"
            >
              <LogOut size={18} />
              {!collapsed && <span>Login</span>}
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}
