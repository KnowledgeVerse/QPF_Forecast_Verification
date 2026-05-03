export default function Footer() {
  return (
    <footer className="mt-8 p-8 text-center border border-white/10 rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] bg-gradient-to-br from-slate-900/60 to-slate-800/80 backdrop-blur-md font-sans">
      <div className="max-w-[900px] mx-auto">
        <div className="mb-10">
          <span className="block text-[0.85rem] text-[#94a3b8] uppercase tracking-[2px] mb-[15px]">
            विश्लेषण एवं विकास
          </span>
          <div className="text-[1.1rem] leading-[1.8] text-[#f8fafc]">
            तैयार किया गया:{" "}
            <span className="text-[#f59e0b] font-bold text-[1.1rem] sm:text-[1.3rem] ml-[5px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              Lal Kamal
            </span>
            <br />
            <span className="text-[#94a3b8]">
              Meteorological Centre, Patna (IMD)
            </span>
          </div>
        </div>

        <div className="text-[0.9rem] text-[#94a3b8] border-t border-white/5 pt-[25px] mt-[20px]">
          डेटा स्रोत:{" "}
          <span className="text-[#f8fafc] font-semibold">
            India Meteorological Department (IMD)
          </span>
          <br />
          &copy; 2026 | All Rights Reserved
        </div>
      </div>
    </footer>
  );
}
