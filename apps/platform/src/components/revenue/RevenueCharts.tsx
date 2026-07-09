'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import type { TrendPoint } from '@/types/revenue';

const tooltipStyle = { background: '#0b101d', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 };
const axisTick = { fontSize: 10, fill: '#64748b' };
const PALETTE = ['#818cf8', '#34d399', '#f472b6', '#facc15', '#38bdf8', '#fb923c', '#a78bfa', '#2dd4bf'];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</p>
      <div className="h-56">{children}</div>
    </div>
  );
}

export function TrendAreaChart({ title, data, gradientId, color = '#818cf8' }: { title: string; data: TrendPoint[]; gradientId: string; color?: string }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} animationDuration={700} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RevenueByCountryChart({ data }: { data: { country: string; value: number }[] }) {
  return (
    <ChartCard title="Revenue by Country">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="country" tick={axisTick} axisLine={false} tickLine={false} width={90} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RevenueByPlanChart({ data }: { data: { plan: string; value: number }[] }) {
  return (
    <ChartCard title="Revenue by Plan">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="plan" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {data.slice(0, 6).map((d, i) => (
          <span key={d.plan} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} /> {d.plan}
          </span>
        ))}
      </div>
    </ChartCard>
  );
}

export function RevenueByGatewayChart({ data }: { data: { gateway: string; value: number }[] }) {
  const GATEWAY_LABEL: Record<string, string> = { stripe: 'Stripe', razorpay: 'Razorpay', paddle: 'Paddle', lemon_squeezy: 'Lemon Squeezy', manual: 'Manual' };
  const labeled = data.map((d) => ({ ...d, label: GATEWAY_LABEL[d.gateway] || d.gateway }));
  return (
    <ChartCard title="Revenue by Payment Gateway">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={labeled}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SubscriptionGrowthChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartCard title="Subscription Growth">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="#f472b6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
