/**
 * Lightweight CSS/SVG sparkline + KPI cards. No chart library — keeps the
 * bundle slim. Used on the Dashboard to show 30-day trends for revenue,
 * fuel sold, and outstanding debt.
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: number | string;
  series?: number[];
  unit?: string;
  color?: string;
  testid?: string;
  delta?: number;        // optional percentage delta vs previous period
  formatValue?: (v: number) => string;
}

export default function SparklineKPI({
  label, value, series = [], unit, color = '#22c55e', testid, delta, formatValue,
}: Props) {
  const path = useMemo(() => {
    if (series.length < 2) return '';
    const max = Math.max(...series, 1);
    const min = Math.min(...series, 0);
    const range = max - min || 1;
    const w = 120, h = 36;
    const step = w / (series.length - 1);
    return series.map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [series]);

  const last = series[series.length - 1] ?? 0;
  const prev = series.length >= 2 ? series[series.length - 2] : last;
  const computedDelta = delta ?? (prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0);
  const trendUp = computedDelta > 0.5;
  const trendDown = computedDelta < -0.5;

  const displayValue = typeof value === 'number'
    ? (formatValue ? formatValue(value) : value.toLocaleString())
    : value;

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 relative overflow-hidden" data-testid={testid || `sparkline-${label}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
        {(trendUp || trendDown) && (
          <span
            className={`text-[10px] font-bold flex items-center gap-0.5 ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}
            data-testid={`${testid || `sparkline-${label}`}-delta`}
          >
            {trendUp ? <TrendingUp size={10} /> : trendDown ? <TrendingDown size={10} /> : <Minus size={10} />}
            {Math.abs(computedDelta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-bold font-mono">
          {displayValue}{unit && <span className="text-xs text-gray-400 ml-1">{unit}</span>}
        </p>
        {path && (
          <svg width="120" height="36" viewBox="0 0 120 36" className="overflow-visible">
            <defs>
              <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${path} L 120 36 L 0 36 Z`} fill={`url(#g-${label})`} />
            <path d={path} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {series.length > 0 && (
              <circle cx={120} cy={36 - ((last - Math.min(...series)) / ((Math.max(...series) - Math.min(...series)) || 1)) * 36}
                      r={2.5} fill={color} />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
