import React from "react";
import {
  type ContingencyData,
  calculatePOD,
  calculateFAR,
  calculateMR,
  calculateCSI,
  calculateBIAS,
  calculatePC,
  calculateTSS,
  calculateHSS,
} from "@/lib/skillScore";

interface SkillScoreTableProps {
  categories: (ContingencyData & { label: string })[];
}

const skillScores = [
  { name: "POD", calculator: calculatePOD },
  { name: "FAR", calculator: calculateFAR },
  { name: "MR", calculator: calculateMR },
  { name: "CSI", calculator: calculateCSI },
  { name: "BIAS", calculator: calculateBIAS },
  { name: "PC", calculator: calculatePC },
  { name: "TSS", calculator: calculateTSS },
  { name: "HSS", calculator: calculateHSS },
];

const SkillScoreTable: React.FC<SkillScoreTableProps> = ({ categories }) => {
  return (
    <div className="bg-[#111d32] rounded-xl shadow-md p-4 border border-[#1e3a5f] overflow-x-auto">
      <h2 className="text-xl font-bold text-center text-[#c8d2e0] mb-4">
        Skill Score Verification
      </h2>
      <table className="w-full min-w-[600px] text-center border-collapse">
        <thead>
          <tr className="border-b-2 border-[#3b82f6]">
            <th className="p-3 text-sm font-semibold text-left text-[#94a3b8]">
              Skill Score
            </th>
            {categories.map((cat) => (
              <th
                key={cat.label}
                className="p-3 text-sm font-semibold text-[#94a3b8]"
              >
                {cat.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skillScores.map((score) => (
            <tr
              key={score.name}
              className="border-b border-[#1e3a5f] last:border-b-0"
            >
              <td className="p-3 font-bold text-left text-[#a7b2c1]">
                {score.name}
              </td>
              {categories.map((cat) => (
                <td key={cat.label} className="p-3 font-mono text-[#e2e8f0]">
                  {score.calculator(cat).toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkillScoreTable;
