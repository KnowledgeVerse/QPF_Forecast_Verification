import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: ReactNode;
  color: string;
}

export default function KPICard({ title, value, subtitle, trend, trendValue, icon, color }: KPICardProps) {
  return (
    <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5 hover:border-[#2a4a6f] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#e2e8f0] mt-2" style={{ color }}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-[#64748b] mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp size={14} className="text-[#10b981]" />
              ) : trend === 'down' ? (
                <TrendingDown size={14} className="text-[#ef4444]" />
              ) : (
                <Minus size={14} className="text-[#94a3b8]" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend === 'up'
                    ? 'text-[#10b981]'
                    : trend === 'down'
                    ? 'text-[#ef4444]'
                    : 'text-[#94a3b8]'
                }`}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div
          className="p-2.5 rounded-lg"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
