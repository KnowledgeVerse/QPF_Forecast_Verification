import { type ReactNode, useState } from "react";
import Sidebar from "./AppSidebar";
import TopHeader from "./TopHeader";
import ToastContainer from "./Toast";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  // Vite ke BASE_URL ka use karke absolute path generate kiya hai
  const logo1 = import.meta.env.BASE_URL + "logo/logo.png";
  const logo2 = import.meta.env.BASE_URL + "logo/IMD_150_Year_Logo.png";

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a1628] pt-[88px]">
      {/* IMD Global Top Header */}
      <header className="fixed top-0 left-0 w-full h-[88px] bg-gradient-to-b from-[#091425] to-[#0d1f35] border-b-2 border-[#3b82f6] z-50 flex items-center justify-between px-2 sm:px-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 group cursor-pointer shrink-0">
          <img
            src={logo1}
            alt="IMD Logo"
            className="h-12 sm:h-16 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500"
          />
        </div>

        <div className="text-center flex-1 px-2 cursor-default flex flex-col justify-center">
          <h2 className="text-[#e2e8f0] font-bold text-[10px] sm:text-sm tracking-[0.1em] sm:tracking-[0.15em] mb-0.5 opacity-90 leading-tight">
            भारत सरकार | Government of India
          </h2>
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] font-black text-[12px] sm:text-xl lg:text-2xl uppercase tracking-wider sm:tracking-widest drop-shadow-sm leading-tight">
            India Meteorological Department
          </h1>
          <h3 className="text-[#94a3b8] font-bold text-[9px] sm:text-sm tracking-wider sm:tracking-widest mt-0.5 leading-tight">
            Meteorological Centre, Patna
          </h3>
        </div>

        <div className="flex items-center gap-2 group cursor-pointer shrink-0">
          <img
            src={logo2}
            alt="IMD 150 Years"
            className="h-12 sm:h-16 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500"
          />
        </div>
      </header>

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className={`min-h-[calc(100vh-88px)] flex flex-col transition-all duration-300 ${
          collapsed ? "lg:ml-16" : "lg:ml-60"
        }`}
      >
        <TopHeader />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
