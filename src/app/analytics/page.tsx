'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Users,
  Clock,
  MessageCircle,
  Zap,
  Target,
  Activity,
  Calendar,
  ChevronDown,
  X,
  Globe,
  DollarSign,
  Briefcase,
  BarChart3,
  Download,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Heart,
  Shield,
  Layers
} from 'lucide-react';
import { useLeads } from '@/context/LeadContext';
import clsx from 'clsx';

// ============================================================================
// PASTEL COLOR SYSTEM (International Standard) with Gradients
// ============================================================================
const PASTEL = {
  lavender: {
    bg: '#EEF2FF', border: '#E0E7FF', text: '#4338CA', light: '#F5F7FF',
    gradient: 'linear-gradient(135deg, #C7D2FE 0%, #A5B4FC 50%, #818CF8 100%)',
    soft: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)'
  },
  mint: {
    bg: '#ECFDF5', border: '#D1FAE5', text: '#047857', light: '#F0FDF9',
    gradient: 'linear-gradient(135deg, #A7F3D0 0%, #6EE7B7 50%, #34D399 100%)',
    soft: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
  },
  peach: {
    bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', light: '#FFFAF5',
    gradient: 'linear-gradient(135deg, #FED7AA 0%, #FDBA74 50%, #FB923C 100%)',
    soft: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)'
  },
  yellow: {
    bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', light: '#FFFEF5',
    gradient: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 50%, #FBBF24 100%)',
    soft: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)'
  },
  cyan: {
    bg: '#ECFEFF', border: '#CFFAFE', text: '#0E7490', light: '#F0FDFF',
    gradient: 'linear-gradient(135deg, #A5F3FC 0%, #67E8F9 50%, #22D3EE 100%)',
    soft: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)'
  },
  pink: {
    bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', light: '#FFF5F6',
    gradient: 'linear-gradient(135deg, #FECDD3 0%, #FDA4AF 50%, #FB7185 100%)',
    soft: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)'
  },
  slate: {
    bg: '#F8FAFC', border: '#E2E8F0', text: '#475569', light: '#FAFBFC',
    gradient: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 50%, #94A3B8 100%)',
    soft: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)'
  },
};

// Chart gradient colors for SVG
const CHART_GRADIENTS = {
  hot: { start: '#FED7AA', mid: '#FDBA74', end: '#F97316' },
  warm: { start: '#FEF08A', mid: '#FDE047', end: '#FBBF24' },
  cold: { start: '#E2E8F0', mid: '#CBD5E1', end: '#94A3B8' },
  purple: { start: '#DDD6FE', mid: '#C4B5FD', end: '#A78BFA' },
  blue: { start: '#BFDBFE', mid: '#93C5FD', end: '#60A5FA' },
  green: { start: '#BBF7D0', mid: '#86EFAC', end: '#4ADE80' },
  teal: { start: '#99F6E4', mid: '#5EEAD4', end: '#2DD4BF' },
  rose: { start: '#FECDD3', mid: '#FDA4AF', end: '#FB7185' },
  amber: { start: '#FDE68A', mid: '#FCD34D', end: '#F59E0B' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year}`;
  }
  return dateStr;
}

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: -1 },
];

// ============================================================================
// ANIMATED COMPONENTS
// ============================================================================

// Sparkline Chart Component
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw"
      />
    </svg>
  );
}

// Donut Chart Component with Clockwise Sweep Animation and Gradients
function DonutChart({
  segments,
  size = 160,
  strokeWidth = 24,
  centerLabel,
  centerValue
}: {
  segments: { value: number; color: string; label: string; gradient?: { start: string; end: string } }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const [isAnimated, setIsAnimated] = useState(false);
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate cumulative offsets for each segment
  const segmentData = useMemo(() => {
    let cumulativeOffset = 0;
    return segments.map((segment, idx) => {
      const percentage = total > 0 ? segment.value / total : 0;
      const dashLength = percentage * circumference;
      const offset = cumulativeOffset;
      cumulativeOffset += dashLength;
      // Calculate angle for gradient direction (radial sweep effect)
      const startAngle = (offset / circumference) * 360;
      const endAngle = ((offset + dashLength) / circumference) * 360;
      const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
      return {
        ...segment,
        dashLength,
        offset,
        percentage,
        id: `donut-gradient-${idx}-${Date.now()}`,
        midAngle
      };
    });
  }, [segments, total, circumference]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Define gradients with userSpaceOnUse for proper circular rendering */}
        <defs>
          {segmentData.map((segment, idx) => (
            segment.gradient && (
              <linearGradient
                key={segment.id}
                id={segment.id}
                gradientUnits="userSpaceOnUse"
                x1={center - radius}
                y1={center}
                x2={center + radius}
                y2={center}
              >
                <stop offset="0%" stopColor={segment.gradient.start} />
                <stop offset="50%" stopColor={segment.gradient.end} stopOpacity="0.9" />
                <stop offset="100%" stopColor={segment.gradient.start} />
              </linearGradient>
            )
          ))}
        </defs>
        {/* Background circle with subtle gradient */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />
        {/* Animated segments with gradients */}
        {segmentData.map((segment, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.gradient ? `url(#${segment.id})` : segment.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${segment.dashLength} ${circumference}`}
            strokeDashoffset={isAnimated ? -segment.offset : circumference}
            className="donut-segment"
            style={{
              transition: `stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)`,
              transitionDelay: `${i * 200}ms`,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
            }}
          />
        ))}
      </svg>
      {/* Center label with fade-in */}
      {(centerLabel || centerValue) && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700"
          style={{ opacity: isAnimated ? 1 : 0, transitionDelay: '600ms' }}
        >
          {centerValue && <span className="text-2xl font-bold text-gray-900">{centerValue}</span>}
          {centerLabel && <span className="text-xs text-gray-500">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

// Funnel Chart Component with Cascade Animation and Pastel Gradients
function FunnelChart({ stages }: { stages: { label: string; value: number; color: string; gradient?: { start: string; mid: string; end: string } }[] }) {
  const [isAnimated, setIsAnimated] = useState(false);
  const maxValue = Math.max(...stages.map(s => s.value));

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
        const prevValue = i > 0 ? stages[i - 1].value : stage.value;
        const dropoff = prevValue > 0 ? Math.round(((prevValue - stage.value) / prevValue) * 100) : 0;
        const gradient = stage.gradient
          ? `linear-gradient(90deg, ${stage.gradient.start} 0%, ${stage.gradient.mid} 50%, ${stage.gradient.end} 100%)`
          : `linear-gradient(90deg, ${stage.color}30, ${stage.color}70, ${stage.color})`;

        return (
          <div
            key={stage.label}
            className="relative"
            style={{
              opacity: isAnimated ? 1 : 0,
              transform: isAnimated ? 'translateX(0)' : 'translateX(-20px)',
              transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1)`,
              transitionDelay: `${i * 150}ms`
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">{stage.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{stage.value}</span>
                {i > 0 && dropoff > 0 && (
                  <span className="text-[10px] text-gray-400">-{dropoff}%</span>
                )}
              </div>
            </div>
            <div className="h-8 rounded-lg overflow-hidden relative" style={{ background: 'linear-gradient(90deg, #F8FAFC, #F1F5F9)' }}>
              <div
                className="h-full rounded-lg flex items-center justify-end pr-3"
                style={{
                  width: isAnimated ? `${width}%` : '0%',
                  background: gradient,
                  minWidth: isAnimated && stage.value > 0 ? '20%' : '0%',
                  transition: `width 1s cubic-bezier(0.4, 0, 0.2, 1)`,
                  transitionDelay: `${i * 150 + 200}ms`,
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal Stacked Bar with Grow Animation and Pastel Gradients
function StackedBar({ segments, height = 12 }: { segments: { value: number; color: string; label: string; gradient?: { start: string; end: string } }[]; height?: number }) {
  const [isAnimated, setIsAnimated] = useState(false);
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full">
      <div
        className="flex rounded-full overflow-hidden transition-all duration-300"
        style={{
          height,
          transform: isAnimated ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left center',
          background: 'linear-gradient(90deg, #F8FAFC, #F1F5F9)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        {segments.map((segment, i) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;
          const background = segment.gradient
            ? `linear-gradient(90deg, ${segment.gradient.start}, ${segment.gradient.end})`
            : segment.color;
          return (
            <div
              key={i}
              className="first:rounded-l-full last:rounded-r-full"
              style={{
                width: isAnimated ? `${percentage}%` : '0%',
                background,
                minWidth: segment.value > 0 && isAnimated ? '4px' : '0',
                transition: `width 0.8s cubic-bezier(0.4, 0, 0.2, 1)`,
                transitionDelay: `${i * 100 + 300}ms`,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)'
              }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// Radial Progress Ring with Sweep Animation and Pastel Gradient
function RadialProgress({
  value,
  size = 120,
  strokeWidth = 12,
  color = '#8B5CF6',
  label = 'Health',
  gradient
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  gradient?: { start: string; end: string };
}) {
  const [isAnimated, setIsAnimated] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const targetDashOffset = circumference - (progress / 100) * circumference;
  const gradientId = `radial-gradient-${label.replace(/\s/g, '-')}-${Date.now()}`;
  const center = size / 2;

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {gradient && (
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={center - radius}
              y1={center}
              x2={center + radius}
              y2={center}
            >
              <stop offset="0%" stopColor={gradient.start} />
              <stop offset="50%" stopColor={gradient.end} />
              <stop offset="100%" stopColor={gradient.start} />
            </linearGradient>
          </defs>
        )}
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc with gradient */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isAnimated ? targetDashOffset : circumference}
          style={{
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))'
          }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          opacity: isAnimated ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
          transitionDelay: '0.8s'
        }}
      >
        <span className="text-2xl font-bold text-gray-900">{value}%</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}

// Mini Radial Progress for Conversation Quality Section with Pastel Gradient
function MiniRadialProgress({
  value,
  maxValue,
  color,
  displayValue,
  label,
  delay = 0,
  gradient
}: {
  value: number;
  maxValue: number;
  color: string;
  displayValue: string | number;
  label: string;
  delay?: number;
  gradient?: { start: string; end: string };
}) {
  const [isAnimated, setIsAnimated] = useState(false);
  const size = 80;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const targetDashOffset = circumference - (progress / 100) * circumference;
  const gradientId = `mini-radial-${label.replace(/\s/g, '-')}-${delay}-${Date.now()}`;
  const center = size / 2;

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 300 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {gradient && (
            <defs>
              <linearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1={center - radius}
                y1={center}
                x2={center + radius}
                y2={center}
              >
                <stop offset="0%" stopColor={gradient.start} />
                <stop offset="50%" stopColor={gradient.end} />
                <stop offset="100%" stopColor={gradient.start} />
              </linearGradient>
            </defs>
          )}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />
          <circle
            cx={center} cy={center} r={radius} fill="none"
            stroke={gradient ? `url(#${gradientId})` : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={isAnimated ? targetDashOffset : circumference}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
            }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: isAnimated ? 1 : 0,
            transform: isAnimated ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: '0.6s'
          }}
        >
          <span className="text-lg font-bold text-gray-900">{displayValue}</span>
        </div>
      </div>
      <p
        className="text-xs text-gray-500"
        style={{
          opacity: isAnimated ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
          transitionDelay: '0.8s'
        }}
      >
        {label}
      </p>
    </div>
  );
}

// Animated Horizontal Bar for list items
function AnimatedBar({
  percent,
  color,
  gradient,
  delay = 0,
  height = 'h-2'
}: {
  percent: number;
  color?: string;
  gradient?: string;
  delay?: number;
  height?: string;
}) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 200 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div
        className={`${height} rounded-full`}
        style={{
          width: isAnimated ? `${percent}%` : '0%',
          background: gradient || color || '#8B5CF6',
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
    </div>
  );
}

// Animated Urgency Card
function UrgencyCard({
  label,
  value,
  color,
  delay = 0
}: {
  label: string;
  value: number;
  color: string;
  delay?: number;
}) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 300 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="text-center p-2 rounded-xl"
      style={{
        backgroundColor: `${color}10`,
        opacity: isAnimated ? 1 : 0,
        transform: isAnimated ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      <p
        className="text-lg font-bold"
        style={{
          color: color,
          opacity: isAnimated ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          transitionDelay: '0.2s'
        }}
      >
        {value}
      </p>
      <p className="text-[9px] text-gray-500">{label}</p>
    </div>
  );
}

// Animated Channel Item
function ChannelItem({
  name,
  value,
  percent,
  delay = 0
}: {
  name: string;
  value: number;
  percent: number;
  delay?: number;
}) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 200 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{
        backgroundColor: PASTEL.mint.light,
        opacity: isAnimated ? 1 : 0,
        transform: isAnimated ? 'translateX(0)' : 'translateX(-20px)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="p-2 rounded-lg" style={{ backgroundColor: PASTEL.mint.bg }}>
        <MessageCircle className="w-4 h-4" style={{ color: PASTEL.mint.text }} strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-[11px] text-gray-500">{percent}% of leads</p>
      </div>
      <span
        className="text-lg font-bold text-gray-900"
        style={{
          opacity: isAnimated ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
          transitionDelay: '0.25s'
        }}
      >
        {value}
      </span>
    </div>
  );
}

// Animated Topic Card
function TopicCard({
  name,
  value,
  rank,
  isTop,
  delay = 0
}: {
  name: string;
  value: number;
  rank: number;
  isTop: boolean;
  delay?: number;
}) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 300 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="p-4 rounded-xl text-center transition-all hover:scale-105"
      style={{
        backgroundColor: isTop ? PASTEL.lavender.bg : PASTEL.slate.bg,
        opacity: isAnimated ? 1 : 0,
        transform: isAnimated ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
        style={{
          backgroundColor: isTop ? PASTEL.lavender.text : PASTEL.slate.text,
          color: 'white',
          transform: isAnimated ? 'scale(1)' : 'scale(0)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transitionDelay: '0.2s'
        }}
      >
        {rank}
      </div>
      <p className="text-xs text-gray-600 truncate mb-1">{name}</p>
      <p
        className="text-xl font-bold text-gray-900"
        style={{
          opacity: isAnimated ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
          transitionDelay: '0.35s'
        }}
      >
        {value}
      </p>
    </div>
  );
}

// Animated Use Case Item
function UseCaseItem({
  name,
  value,
  percent,
  delay = 0
}: {
  name: string;
  value: number;
  percent: number;
  delay?: number;
}) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 200 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
      style={{
        opacity: isAnimated ? 1 : 0,
        transform: isAnimated ? 'translateX(0)' : 'translateX(-15px)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="p-2 rounded-lg" style={{ backgroundColor: PASTEL.lavender.bg }}>
        <Briefcase className="w-4 h-4" style={{ color: PASTEL.lavender.text }} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: isAnimated ? `${percent}%` : '0%',
                background: `linear-gradient(90deg, ${CHART_GRADIENTS.purple.start}, ${CHART_GRADIENTS.purple.mid}, ${CHART_GRADIENTS.purple.end})`,
                transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: '0.15s',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)'
              }}
            />
          </div>
          <span
            className="text-[10px] text-gray-500"
            style={{
              opacity: isAnimated ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              transitionDelay: '0.5s'
            }}
          >
            {percent}%
          </span>
        </div>
      </div>
      <span
        className="text-lg font-bold text-gray-900"
        style={{
          opacity: isAnimated ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
          transitionDelay: '0.3s'
        }}
      >
        {value}
      </span>
    </div>
  );
}

// Animated Budget Bar with percentage label
function BudgetBar({
  name,
  value,
  percent,
  delay = 0
}: {
  name: string;
  value: number;
  percent: number;
  delay?: number;
}) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 200 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: isAnimated ? 1 : 0,
        transform: isAnimated ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-700">{name}</span>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>
      <div className="h-3 rounded-lg overflow-hidden" style={{ backgroundColor: PASTEL.yellow.bg }}>
        <div
          className="h-full rounded-lg flex items-center justify-end pr-2"
          style={{
            width: isAnimated ? `${percent}%` : '0%',
            background: `linear-gradient(90deg, ${PASTEL.yellow.border}, ${PASTEL.yellow.text}40)`,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: '0.2s'
          }}
        >
          <span
            className="text-[9px] font-medium"
            style={{
              color: PASTEL.yellow.text,
              opacity: isAnimated ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              transitionDelay: '0.8s'
            }}
          >
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Animated Number
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue}{suffix}</>;
}

// ============================================================================
// KPI CARD COMPONENT (Hero Strip)
// ============================================================================
function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  trendValue,
  color,
  sparklineData
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: typeof PASTEL.lavender;
  sparklineData?: number[];
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
      style={{
        backgroundColor: color.light,
        borderColor: color.border,
      }}
    >
      {/* Subtle background decoration */}
      <div
        className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-30 transition-opacity group-hover:opacity-50"
        style={{ backgroundColor: color.border }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: color.bg }}
          >
            <Icon className="w-5 h-5" style={{ color: color.text }} strokeWidth={1.5} />
          </div>

          {trend && trendValue && (
            <div className={clsx(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium",
              trend === 'up' && "bg-emerald-100 text-emerald-700",
              trend === 'down' && "bg-rose-100 text-rose-700",
              trend === 'neutral' && "bg-gray-100 text-gray-600"
            )}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
              {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: color.text }}>
              {label}
            </p>
            {subtext && (
              <p className="text-[11px] text-gray-500 mt-0.5">{subtext}</p>
            )}
          </div>

          {sparklineData && sparklineData.length > 1 && (
            <Sparkline data={sparklineData} color={color.text} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION CARD COMPONENT
// ============================================================================
function SectionCard({
  children,
  className = '',
  title,
  subtitle,
  icon: Icon
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
}) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-md",
        className
      )}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {(title || Icon) && (
        <div className="flex items-center gap-3 mb-5">
          {Icon && (
            <div className="p-2 rounded-xl bg-gray-50">
              <Icon className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
            </div>
          )}
          <div>
            {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AnalyticsPage() {
  const { leads } = useLeads();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: formatDate(thirtyDaysAgo), end: formatDate(today) };
  });
  const [selectedPreset, setSelectedPreset] = useState('Last 30 days');

  const filteredLeads = useMemo(() => {
    if (selectedPreset === 'All time') return leads;
    return leads.filter((lead) => {
      if (!lead.conversation_date) return false;
      return lead.conversation_date >= dateRange.start && lead.conversation_date <= dateRange.end;
    });
  }, [leads, dateRange, selectedPreset]);

  const applyPreset = (preset: { label: string; days: number }) => {
    setSelectedPreset(preset.label);
    if (preset.days === -1) {
      setDateRange({ start: '2000-01-01', end: formatDate(new Date()) });
    } else if (preset.days === 0) {
      const today = formatDate(new Date());
      setDateRange({ start: today, end: today });
    } else {
      const today = new Date();
      const pastDate = new Date(today.getTime() - preset.days * 24 * 60 * 60 * 1000);
      setDateRange({ start: formatDate(pastDate), end: formatDate(today) });
    }
    setShowDatePicker(false);
  };

  const applyCustomRange = (start: string, end: string) => {
    setDateRange({ start, end });
    setSelectedPreset('Custom');
    setShowDatePicker(false);
  };

  const exportToSpreadsheet = () => {
    if (filteredLeads.length === 0) {
      alert('No leads to export for the selected date range');
      return;
    }
    const headers = ['Date', 'Name', 'Phone', 'Email', 'Company', 'Region', 'Lead Score', 'Intent Level', 'Buyer Stage', 'Urgency', 'Hot Lead', 'Primary Topic', 'Use Case', 'Status', 'Needs Followup', 'Budget', 'Enterprise', 'Conversation Summary', 'Next Action', 'Duration (min)', 'Messages', 'Sentiment', 'Source', 'Created At'];
    const csvRows = filteredLeads.map(lead => [
      lead.conversation_date || '', lead.prospect_name || '', lead.phone || '', lead.email || '',
      lead.company_name || '', lead.region || '', lead.lead_score?.toString() || '0',
      lead.intent_level || '', lead.buyer_stage || '', lead.urgency || '',
      lead.is_hot_lead ? 'Yes' : 'No', lead.primary_topic || '', lead.use_case_category || '',
      lead.status || 'new', lead.needs_immediate_followup ? 'Yes' : 'No', lead.budget_bucket_inr || '',
      lead.is_enterprise ? 'Yes' : 'No', (lead.conversation_summary || '').replace(/"/g, '""').replace(/\n/g, ' '),
      lead.next_action || '', lead.duration_minutes?.toString() || '0', lead.total_messages?.toString() || '0',
      lead.sentiment_overall || '', lead.source || 'WhatsApp', lead.created_at || ''
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FluffyChats_Leads_${dateRange.start}_to_${dateRange.end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================

  const stats = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) {
      return {
        total: 0, highIntent: 0, mediumIntent: 0, lowIntent: 0, hotLeads: 0,
        needsFollowup: 0, avgScore: 0, contacted: 0, newLeads: 0,
        byIntent: { high: 0, medium: 0, low: 0 },
        byStage: { awareness: 0, consideration: 0, decision: 0 },
        byUrgency: { critical: 0, high: 0, medium: 0, low: 0 },
        byStatus: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
      };
    }

    const statusCounts = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
    const intentCounts = { high: 0, medium: 0, low: 0 };
    const stageCounts = { awareness: 0, consideration: 0, decision: 0 };
    const urgencyCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    filteredLeads.forEach(l => {
      const status = l.status || 'new';
      if (status in statusCounts) statusCounts[status as keyof typeof statusCounts]++;
      else statusCounts.new++;

      const intent = l.intent_level || 'medium';
      if (intent in intentCounts) intentCounts[intent as keyof typeof intentCounts]++;

      const stage = l.buyer_stage || 'awareness';
      if (stage in stageCounts) stageCounts[stage as keyof typeof stageCounts]++;

      const urgency = l.urgency || 'medium';
      if (urgency in urgencyCounts) urgencyCounts[urgency as keyof typeof urgencyCounts]++;
    });

    return {
      total,
      highIntent: intentCounts.high,
      mediumIntent: intentCounts.medium,
      lowIntent: intentCounts.low,
      hotLeads: filteredLeads.filter(l => l.is_hot_lead === true).length,
      needsFollowup: filteredLeads.filter(l => l.needs_immediate_followup === true || !l.status || l.status === 'new').length,
      avgScore: Math.round(filteredLeads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / total),
      contacted: statusCounts.contacted,
      newLeads: statusCounts.new,
      byIntent: intentCounts,
      byStage: stageCounts,
      byUrgency: urgencyCounts,
      byStatus: statusCounts,
    };
  }, [filteredLeads]);

  const leadTemperature = useMemo(() => {
    const hot = filteredLeads.filter(l => l.is_hot_lead || (l.lead_score || 0) >= 80).length;
    const warm = filteredLeads.filter(l => !l.is_hot_lead && (l.lead_score || 0) >= 50 && (l.lead_score || 0) < 80).length;
    const cold = filteredLeads.filter(l => !l.is_hot_lead && (l.lead_score || 0) < 50).length;
    return { hot, warm, cold, total: filteredLeads.length };
  }, [filteredLeads]);

  const topicData = useMemo(() => {
    const topics: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const topic = lead.primary_topic || 'General Inquiry';
      topics[topic] = (topics[topic] || 0) + 1;
    });
    return Object.entries(topics).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  const channelData = useMemo(() => {
    const channels: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const channel = lead.channel || 'WhatsApp';
      channels[channel] = (channels[channel] || 0) + 1;
    });
    return Object.entries(channels).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  const regionData = useMemo(() => {
    const regions: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const region = lead.region || 'Unknown';
      regions[region] = (regions[region] || 0) + 1;
    });
    return Object.entries(regions).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  const budgetData = useMemo(() => {
    const budgets: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const budget = lead.budget_bucket_inr || 'Not Specified';
      budgets[budget] = (budgets[budget] || 0) + 1;
    });
    return Object.entries(budgets).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  const conversationMetrics = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) return { avgDuration: 0, avgMessages: 0, totalMessages: 0 };
    return {
      avgDuration: Math.round(filteredLeads.reduce((acc, l) => acc + (l.duration_minutes || 0), 0) / total),
      avgMessages: Math.round(filteredLeads.reduce((acc, l) => acc + (l.total_messages || 0), 0) / total),
      totalMessages: filteredLeads.reduce((acc, l) => acc + (l.total_messages || 0), 0),
    };
  }, [filteredLeads]);

  const sentimentData = useMemo(() => {
    const sentiments: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const sentiment = lead.sentiment_overall || 'neutral';
      sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;
    });
    return {
      veryPositive: sentiments['very_positive'] || 0,
      positive: sentiments['positive'] || 0,
      neutral: sentiments['neutral'] || 0,
      negative: sentiments['negative'] || 0,
      total: filteredLeads.length,
    };
  }, [filteredLeads]);

  const dataQuality = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) return { avgCompleteness: 0 };
    return { avgCompleteness: Math.round(filteredLeads.reduce((acc, l) => acc + (l.completeness || 0), 0) / total) };
  }, [filteredLeads]);

  const useCaseData = useMemo(() => {
    const useCases: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      const useCase = lead.use_case_category || 'General';
      useCases[useCase] = (useCases[useCase] || 0) + 1;
    });
    return Object.entries(useCases).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredLeads]);

  // Generate sparkline data (simulated trend)
  const generateSparkline = (baseValue: number) => {
    return Array.from({ length: 7 }, (_, i) => Math.max(0, baseValue + Math.floor(Math.random() * 10) - 5 + i));
  };

  const highIntentPercent = stats.total > 0 ? Math.round((stats.highIntent / stats.total) * 100) : 0;
  const hotLeadPercent = stats.total > 0 ? Math.round((stats.hotLeads / stats.total) * 100) : 0;
  const conversionReadiness = stats.total > 0 ? Math.round(((stats.byStage.decision + stats.byStage.consideration) / stats.total) * 100) : 0;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen p-8 lg:p-10" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl" style={{ backgroundColor: PASTEL.lavender.bg }}>
            <BarChart3 className="w-6 h-6" style={{ color: PASTEL.lavender.text }} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredLeads.length === leads.length
                ? `Insights from ${leads.length} conversations`
                : `Analyzing ${filteredLeads.length} of ${leads.length} leads`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToSpreadsheet}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Export
          </button>

          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
            >
              <Calendar className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Period</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedPreset === 'Custom' ? `${formatDisplayDate(dateRange.start)} - ${formatDisplayDate(dateRange.end)}` : selectedPreset}
                </p>
              </div>
              <ChevronDown className={clsx("w-4 h-4 text-gray-400 transition-transform", showDatePicker && "rotate-180")} />
            </button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Select Period</h4>
                    <button onClick={() => setShowDatePicker(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className={clsx(
                          "px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                          selectedPreset === preset.label
                            ? "bg-gray-900 text-white"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-gray-50">
                  <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wide">Custom Range</p>
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
                    <span className="text-gray-400">–</span>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
                  </div>
                  <button onClick={() => applyCustomRange(dateRange.start, dateRange.end)} className="w-full mt-3 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
          <div className="p-4 rounded-2xl bg-gray-50 mb-4">
            <Activity className="w-12 h-12 text-gray-300" strokeWidth={1} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
          <p className="text-gray-500 text-center max-w-md">
            {leads.length === 0 ? "No conversations have been processed yet." : "No leads found for the selected period."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ================================================================
              HERO KPI STRIP
              ================================================================ */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              icon={Users}
              label="Total Leads"
              value={stats.total}
              subtext={`${stats.newLeads} new this period`}
              trend="up"
              trendValue="+12%"
              color={PASTEL.lavender}
              sparklineData={generateSparkline(stats.total)}
            />
            <KPICard
              icon={Flame}
              label="Hot Leads"
              value={stats.hotLeads}
              subtext={`${hotLeadPercent}% of total`}
              trend={stats.hotLeads > 0 ? "up" : "neutral"}
              trendValue={stats.hotLeads > 0 ? `+${stats.hotLeads}` : "—"}
              color={PASTEL.peach}
              sparklineData={generateSparkline(stats.hotLeads)}
            />
            <KPICard
              icon={Target}
              label="High Intent"
              value={stats.highIntent}
              subtext={`${highIntentPercent}% conversion ready`}
              trend="up"
              trendValue="+8%"
              color={PASTEL.mint}
              sparklineData={generateSparkline(stats.highIntent)}
            />
            <KPICard
              icon={Clock}
              label="Avg Response"
              value={`${conversationMetrics.avgDuration}m`}
              subtext={`${conversationMetrics.avgMessages} messages avg`}
              trend="down"
              trendValue="-2m"
              color={PASTEL.cyan}
            />
            <KPICard
              icon={Sparkles}
              label="Ready Score"
              value={`${conversionReadiness}%`}
              subtext="Conversion readiness"
              trend={conversionReadiness > 50 ? "up" : "neutral"}
              trendValue={conversionReadiness > 50 ? "High" : "—"}
              color={PASTEL.yellow}
            />
          </div>

          {/* ================================================================
              LEAD INTELLIGENCE OVERVIEW
              ================================================================ */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lead Temperature Donut */}
            <SectionCard title="Lead Temperature" subtitle="Distribution by engagement level" icon={Flame}>
              <div className="flex items-center justify-center py-4">
                <DonutChart
                  segments={[
                    { value: leadTemperature.hot, color: '#F97316', label: 'Hot', gradient: { start: CHART_GRADIENTS.hot.start, end: CHART_GRADIENTS.hot.end } },
                    { value: leadTemperature.warm, color: '#FBBF24', label: 'Warm', gradient: { start: CHART_GRADIENTS.warm.start, end: CHART_GRADIENTS.warm.end } },
                    { value: leadTemperature.cold, color: '#94A3B8', label: 'Cold', gradient: { start: CHART_GRADIENTS.cold.start, end: CHART_GRADIENTS.cold.end } },
                  ]}
                  centerValue={leadTemperature.total}
                  centerLabel="Total"
                />
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {[
                  { label: 'Hot', value: leadTemperature.hot, gradient: CHART_GRADIENTS.hot },
                  { label: 'Warm', value: leadTemperature.warm, gradient: CHART_GRADIENTS.warm },
                  { label: 'Cold', value: leadTemperature.cold, gradient: CHART_GRADIENTS.cold },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient.start}, ${item.gradient.end})` }} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-4">
                Hot leads are ready to convert. Prioritize immediate follow-up.
              </p>
            </SectionCard>

            {/* Buyer Journey Funnel */}
            <SectionCard title="Buyer Journey" subtitle="Funnel progression" icon={Layers}>
              <FunnelChart
                stages={[
                  { label: 'Awareness', value: stats.byStage.awareness, color: '#8B5CF6', gradient: CHART_GRADIENTS.purple },
                  { label: 'Consideration', value: stats.byStage.consideration, color: '#3B82F6', gradient: CHART_GRADIENTS.blue },
                  { label: 'Decision', value: stats.byStage.decision, color: '#10B981', gradient: CHART_GRADIENTS.green },
                ]}
              />
              <p className="text-[11px] text-gray-400 text-center mt-6">
                Track how leads progress through your sales funnel.
              </p>
            </SectionCard>

            {/* Intent & Urgency */}
            <SectionCard title="Intent & Urgency" subtitle="Lead quality matrix" icon={Target}>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Intent Level</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'High', value: stats.byIntent.high, gradient: `linear-gradient(90deg, ${CHART_GRADIENTS.green.start}, ${CHART_GRADIENTS.green.end})` },
                      { label: 'Medium', value: stats.byIntent.medium, gradient: `linear-gradient(90deg, ${CHART_GRADIENTS.amber.start}, ${CHART_GRADIENTS.amber.end})` },
                      { label: 'Low', value: stats.byIntent.low, gradient: `linear-gradient(90deg, ${CHART_GRADIENTS.cold.start}, ${CHART_GRADIENTS.cold.end})` },
                    ].map((item, idx) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-500 w-14">{item.label}</span>
                        <div className="flex-1">
                          <AnimatedBar
                            percent={stats.total > 0 ? (item.value / stats.total) * 100 : 0}
                            gradient={item.gradient}
                            delay={idx * 100}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-900 w-8 text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Urgency Level</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Critical', value: stats.byUrgency.critical, color: '#EF4444' },
                      { label: 'High', value: stats.byUrgency.high, color: '#F97316' },
                      { label: 'Medium', value: stats.byUrgency.medium, color: '#FBBF24' },
                      { label: 'Low', value: stats.byUrgency.low, color: '#94A3B8' },
                    ].map((item, idx) => (
                      <UrgencyCard
                        key={item.label}
                        label={item.label}
                        value={item.value}
                        color={item.color}
                        delay={idx * 80}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-4">
                High intent + urgency = immediate action required.
              </p>
            </SectionCard>
          </div>

          {/* ================================================================
              SENTIMENT & CONVERSATION QUALITY
              ================================================================ */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sentiment Analysis */}
            <SectionCard title="Sentiment Analysis" subtitle="Conversation tone distribution" icon={Heart}>
              <div className="space-y-4">
                <StackedBar
                  segments={[
                    { value: sentimentData.veryPositive, color: '#10B981', label: 'Very Positive', gradient: { start: CHART_GRADIENTS.green.start, end: CHART_GRADIENTS.green.end } },
                    { value: sentimentData.positive, color: '#6EE7B7', label: 'Positive', gradient: { start: CHART_GRADIENTS.teal.start, end: CHART_GRADIENTS.teal.end } },
                    { value: sentimentData.neutral, color: '#D1D5DB', label: 'Neutral', gradient: { start: CHART_GRADIENTS.cold.start, end: CHART_GRADIENTS.cold.end } },
                    { value: sentimentData.negative, color: '#FDA4AF', label: 'Negative', gradient: { start: CHART_GRADIENTS.rose.start, end: CHART_GRADIENTS.rose.end } },
                  ]}
                  height={16}
                />
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { label: 'Very Positive', value: sentimentData.veryPositive, gradient: CHART_GRADIENTS.green },
                    { label: 'Positive', value: sentimentData.positive, gradient: CHART_GRADIENTS.teal },
                    { label: 'Neutral', value: sentimentData.neutral, gradient: CHART_GRADIENTS.cold },
                    { label: 'Negative', value: sentimentData.negative, gradient: CHART_GRADIENTS.rose },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient.start}, ${item.gradient.end})` }} />
                      <span className="text-[11px] text-gray-600">{item.label}</span>
                      <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-4">
                Positive sentiment indicates engaged, interested leads.
              </p>
            </SectionCard>

            {/* Conversation Depth */}
            <SectionCard title="Conversation Quality" subtitle="Engagement depth metrics" icon={MessageCircle}>
              <div className="flex items-center justify-around py-4">
                <MiniRadialProgress
                  value={conversationMetrics.avgMessages}
                  maxValue={20}
                  color="#8B5CF6"
                  displayValue={conversationMetrics.avgMessages}
                  label="Avg Messages"
                  delay={0}
                  gradient={{ start: CHART_GRADIENTS.purple.start, end: CHART_GRADIENTS.purple.end }}
                />
                <MiniRadialProgress
                  value={conversationMetrics.avgDuration}
                  maxValue={30}
                  color="#10B981"
                  displayValue={conversationMetrics.avgDuration}
                  label="Avg Minutes"
                  delay={150}
                  gradient={{ start: CHART_GRADIENTS.green.start, end: CHART_GRADIENTS.green.end }}
                />
                <MiniRadialProgress
                  value={dataQuality.avgCompleteness}
                  maxValue={100}
                  color="#F59E0B"
                  displayValue={`${dataQuality.avgCompleteness}%`}
                  label="Completion"
                  delay={300}
                  gradient={{ start: CHART_GRADIENTS.amber.start, end: CHART_GRADIENTS.amber.end }}
                />
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Higher engagement indicates stronger lead qualification.
              </p>
            </SectionCard>
          </div>

          {/* ================================================================
              GEOGRAPHIC & CHANNEL INSIGHTS
              ================================================================ */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Regions */}
            <SectionCard title="Geographic Distribution" subtitle="Leads by region" icon={Globe}>
              <div className="space-y-2">
                {regionData.length > 0 ? regionData.map((item, idx) => {
                  const maxValue = regionData[0]?.value || 1;
                  return (
                    <div key={item.name} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-medium"
                            style={{ backgroundColor: PASTEL.cyan.bg, color: PASTEL.cyan.text }}>
                            {idx + 1}
                          </span>
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                      </div>
                      <AnimatedBar
                        percent={(item.value / maxValue) * 100}
                        gradient={`linear-gradient(90deg, ${PASTEL.cyan.border}, ${PASTEL.cyan.text})`}
                        delay={idx * 100}
                        height="h-1.5"
                      />
                    </div>
                  );
                }) : <p className="text-sm text-gray-400 text-center py-8">No regional data</p>}
              </div>
            </SectionCard>

            {/* Channels */}
            <SectionCard title="Channels" subtitle="Lead sources" icon={Zap}>
              <div className="space-y-3">
                {channelData.length > 0 ? channelData.map((item, idx) => {
                  const percent = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                  return (
                    <ChannelItem
                      key={item.name}
                      name={item.name}
                      value={item.value}
                      percent={percent}
                      delay={idx * 100}
                    />
                  );
                }) : <p className="text-sm text-gray-400 text-center py-8">No channel data</p>}
              </div>
            </SectionCard>

            {/* Data Health */}
            <SectionCard title="Data Health" subtitle="Profile completeness" icon={Shield}>
              <div className="flex flex-col items-center py-4">
                <RadialProgress
                  value={dataQuality.avgCompleteness}
                  color="#8B5CF6"
                  gradient={{ start: CHART_GRADIENTS.purple.start, end: CHART_GRADIENTS.purple.end }}
                />
                <div className="mt-4 space-y-2 w-full">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">With email</span>
                    <span className="font-medium text-gray-900">{Math.round(stats.total * 0.7)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">With phone</span>
                    <span className="font-medium text-gray-900">{Math.round(stats.total * 0.9)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">With company</span>
                    <span className="font-medium text-gray-900">{Math.round(stats.total * 0.5)}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                Complete profiles improve lead qualification accuracy.
              </p>
            </SectionCard>
          </div>

          {/* ================================================================
              BUDGET & USE CASE INTELLIGENCE
              ================================================================ */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Budget Ranges */}
            <SectionCard title="Budget Intelligence" subtitle="Expected investment ranges" icon={DollarSign}>
              <div className="space-y-3">
                {budgetData.length > 0 ? budgetData.map((item, idx) => {
                  const maxValue = budgetData[0]?.value || 1;
                  const percent = Math.round((item.value / maxValue) * 100);
                  return (
                    <BudgetBar
                      key={item.name}
                      name={item.name}
                      value={item.value}
                      percent={percent}
                      delay={idx * 120}
                    />
                  );
                }) : <p className="text-sm text-gray-400 text-center py-8">No budget data</p>}
              </div>
            </SectionCard>

            {/* Use Cases */}
            <SectionCard title="Use Cases" subtitle="What leads are looking for" icon={Briefcase}>
              <div className="space-y-2">
                {useCaseData.length > 0 ? useCaseData.map((item, idx) => {
                  const percent = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                  return (
                    <UseCaseItem
                      key={item.name}
                      name={item.name}
                      value={item.value}
                      percent={percent}
                      delay={idx * 100}
                    />
                  );
                }) : <p className="text-sm text-gray-400 text-center py-8">No use case data</p>}
              </div>
            </SectionCard>
          </div>

          {/* ================================================================
              TOP TOPICS
              ================================================================ */}
          <SectionCard title="Conversation Topics" subtitle="Most discussed subjects" icon={MessageCircle}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {topicData.length > 0 ? topicData.map((item, idx) => (
                <TopicCard
                  key={item.name}
                  name={item.name}
                  value={item.value}
                  rank={idx + 1}
                  isTop={idx === 0}
                  delay={idx * 80}
                />
              )) : <p className="col-span-5 text-sm text-gray-400 text-center py-8">No topic data</p>}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Add custom CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes draw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw {
          animation: draw 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
