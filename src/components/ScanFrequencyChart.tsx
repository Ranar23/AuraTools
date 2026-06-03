import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface ScanFrequencyChartProps {
  data: { dateStr: string; label: string; count: number }[];
  theme?: 'green-theme' | 'purple-theme' | 'blue-theme';
  onDayClick?: (dateStr: string) => void;
}

const THEME_COLORS = {
  'green-theme': {
    primary: '#10b981', // emerald-500
    secondary: '#059669', // emerald-600
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    dotStroke: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  'purple-theme': {
    primary: '#a855f7', // purple-500
    secondary: '#7c3aed', // violet-600
    accent: 'text-purple-400',
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-500/20',
    dotStroke: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.25)',
  },
  'blue-theme': {
    primary: '#3b82f6', // blue-500
    secondary: '#6366f1', // indigo-500
    accent: 'text-blue-400',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/20',
    dotStroke: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.25)',
  },
};

export default function ScanFrequencyChart({ data, theme = 'blue-theme', onDayClick }: ScanFrequencyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(400);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; count: number; active: boolean }>({
    x: 0,
    y: 0,
    label: '',
    count: 0,
    active: false,
  });

  const activeTheme = THEME_COLORS[theme] || THEME_COLORS['blue-theme'];

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setWidth(Math.max(entry.contentRect.width, 280));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const height = 160;
  const margin = { top: 15, right: 15, bottom: 25, left: 30 };
  const chartWidth = Math.max(width - margin.left - margin.right, 100);
  const chartHeight = Math.max(height - margin.top - margin.bottom, 50);

  // X scale (point scale over dates)
  const xScale = d3.scalePoint()
    .domain(data.map(d => d.label))
    .range([0, chartWidth]);

  // Y scale (linear scale bounded appropriately)
  const maxCount = d3.max(data, d => d.count) || 0;
  const yScale = d3.scaleLinear()
    .domain([0, Math.max(maxCount + 2, 5)])
    .nice()
    .range([chartHeight, 0]);

  // Generators for area & line
  const areaGenerator = d3.area<{ dateStr: string; label: string; count: number }>()
    .x(d => xScale(d.label) || 0)
    .y0(chartHeight)
    .y1(d => yScale(d.count))
    .curve(d3.curveMonotoneX);

  const lineGenerator = d3.line<{ dateStr: string; label: string; count: number }>()
    .x(d => xScale(d.label) || 0)
    .y(d => yScale(d.count))
    .curve(d3.curveMonotoneX);

  const areaPath = areaGenerator(data) || '';
  const linePath = lineGenerator(data) || '';
  const yTicks = yScale.ticks(4);

  return (
    <div className="relative mt-4 border border-slate-850 bg-slate-950/20 rounded-xl p-4 overflow-visible" ref={containerRef}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 selection:bg-transparent">
          <TrendingUp className={`w-3.5 h-3.5 ${activeTheme.accent}`} />
          7-Day Scan Frequency
        </span>
        <span className="text-[9px] font-mono text-slate-500 bg-slate-950/50 border border-slate-900 px-1.5 py-0.5 rounded uppercase">
          D3 Scale Mode
        </span>
      </div>

      <div className="relative overflow-visible">
        {/* Animated Framer-Motion SVG */}
        <motion.svg
          layout="position"
          className="overflow-visible block w-full h-[160px]"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%' }}
        >
          {/* Dynamic theme-based gradient definition inside layout */}
          <defs>
            <linearGradient id={`chartAreaGradient-${theme}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={activeTheme.primary} stopOpacity={0.25} />
              <stop offset="100%" stopColor={activeTheme.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`chartLineGradient-${theme}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={activeTheme.primary} />
              <stop offset="100%" stopColor={activeTheme.secondary} />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Draw Y horizontal ticks & helper gridlines */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={0}
                  x2={chartWidth}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  stroke="rgba(148, 163, 184, 0.05)"
                  strokeWidth={1}
                />
                <text
                  x={-8}
                  y={yScale(tick) + 3}
                  fill="#64748b"
                  fontSize="8px"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Draw X Base axis lines */}
            <line
              x1={0}
              x2={chartWidth}
              y1={chartHeight}
              y2={chartHeight}
              stroke="rgba(148, 163, 184, 0.15)"
            />

            {/* X Labels */}
            {data.map((d, i) => {
              const x = xScale(d.label) || 0;
              return (
                <text
                  key={i}
                  x={x}
                  y={chartHeight + 14}
                  fill="#64748b"
                  fontSize="8px"
                  fontFamily="var(--font-sans)"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              );
            })}

            {/* Area path morphing smoothly with Framer Motion when data updates */}
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ d: areaPath, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              fill={`url(#chartAreaGradient-${theme})`}
            />

            {/* Line path morphing smoothly with Framer Motion when data updates */}
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ d: linePath, pathLength: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              fill="none"
              stroke={`url(#chartLineGradient-${theme})`}
              strokeWidth={2}
            />

            {/* Hover indices & circles */}
            {data.map((d, i) => {
              const cx = xScale(d.label) || 0;
              const cy = yScale(d.count);
              const isHovered = hoveredIndex === i;

              return (
                <g key={i} className="cursor-pointer">
                  {/* Invisible broad mouse hit-target */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="transparent"
                    onMouseEnter={(event) => {
                      setHoveredIndex(i);
                      
                      const svgElement = event.currentTarget.ownerSVGElement;
                      if (!svgElement) return;
                      const rect = svgElement.getBoundingClientRect();
                      
                      const mx = event.clientX - rect.left;
                      const my = event.clientY - rect.top;
                      
                      // Safeguard tooltip: clamp X coordinate to prevent container overflow on narrow screens
                      const clampedX = Math.max(50, Math.min(width - 50, mx));
                      
                      setTooltip({
                        x: clampedX,
                        y: my - 12,
                        label: d.label,
                        count: d.count,
                        active: true,
                      });
                    }}
                    onMouseMove={(event) => {
                      const svgElement = event.currentTarget.ownerSVGElement;
                      if (!svgElement) return;
                      const rect = svgElement.getBoundingClientRect();
                      const mx = event.clientX - rect.left;
                      const my = event.clientY - rect.top;
                      
                      const clampedX = Math.max(50, Math.min(width - 50, mx));

                      setTooltip(prev => ({
                        ...prev,
                        x: clampedX,
                        y: my - 12,
                      }));
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setTooltip(prev => ({ ...prev, active: false }));
                    }}
                    onClick={() => {
                      if (onDayClick) {
                        onDayClick(d.dateStr);
                      }
                    }}
                  />

                  {/* Visual point and dynamic hover scale */}
                  <motion.circle
                     cx={cx}
                     cy={cy}
                     animate={{
                       r: isHovered ? 6 : 3,
                       fill: isHovered ? activeTheme.primary : '#020617',
                       stroke: isHovered ? '#ffffff' : activeTheme.dotStroke
                     }}
                     transition={{ duration: 0.15 }}
                     strokeWidth={1.5}
                     style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            })}
          </g>
        </motion.svg>

        {/* Floating Tooltip */}
        <AnimatePresence>
          {tooltip.active && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              className="absolute z-20 pointer-events-none bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 shadow-lg flex flex-col font-mono text-[9px] text-slate-200 select-none"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <span className="font-sans font-bold text-slate-500 text-[8px] leading-none mb-0.5 uppercase tracking-wide">{tooltip.label}</span>
              <span className="text-slate-100 text-[10px] font-bold leading-tight flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeTheme.accentBg} animate-pulse`} style={{ backgroundColor: activeTheme.primary }}></span>
                {tooltip.count} {tooltip.count === 1 ? 'Scan' : 'Scans'}
              </span>
              <span className="text-[7.5px] text-slate-500 font-sans mt-1">Click dot to filter list</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-900/60 pt-2 selection:bg-transparent">
        <span className="flex items-center gap-1 text-[8.5px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500"></span>
          Click coordinates to filter list by custom timestamps
        </span>
        <span className="text-slate-350 font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
          {data.reduce((sum, d) => sum + d.count, 0)} scans total
        </span>
      </div>
    </div>
  );
}
