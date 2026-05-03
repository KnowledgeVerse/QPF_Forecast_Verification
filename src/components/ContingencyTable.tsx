import React from "react";
import type { ContingencyData } from "@/lib/skillScore";

interface ContingencyTableProps {
  title: string;
  data: ContingencyData;
}

const ContingencyTable: React.FC<ContingencyTableProps> = ({ title, data }) => {
  const { a, b, c, d } = data;

  return (
    <div className="bg-[#111d32] rounded-xl shadow-md p-4 border border-[#1e3a5f]">
      <h3 className="text-lg font-bold text-center text-[#a7b2c1] mb-3">
        {title}
      </h3>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="border-b border-[#1e3a5f]">
            <th className="p-2 border-r border-[#1e3a5f]"></th>
            <th className="p-2 text-sm font-semibold text-[#94a3b8]">
              Forecast Yes
            </th>
            <th className="p-2 text-sm font-semibold text-[#94a3b8]">
              Forecast No
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#1e3a5f]">
            <td className="p-2 font-semibold text-sm text-left text-[#94a3b8] border-r border-[#1e3a5f]">
              Yes
            </td>
            <td className="p-2 text-lg font-mono text-green-400">{a}</td>
            <td className="p-2 text-lg font-mono text-yellow-400">{b}</td>
          </tr>
          <tr>
            <td className="p-2 font-semibold text-sm text-left text-[#94a3b8] border-r border-[#1e3a5f]">
              No
            </td>
            <td className="p-2 text-lg font-mono text-red-400">{c}</td>
            <td className="p-2 text-lg font-mono text-blue-400">{d}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ContingencyTable;
