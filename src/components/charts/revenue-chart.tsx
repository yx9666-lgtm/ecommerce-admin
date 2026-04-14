"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { date: "Mon", shopee: 4200, lazada: 2800, tiktok: 1800, pgmall: 900 },
  { date: "Tue", shopee: 3800, lazada: 3200, tiktok: 2100, pgmall: 1100 },
  { date: "Wed", shopee: 5100, lazada: 2600, tiktok: 2400, pgmall: 800 },
  { date: "Thu", shopee: 4600, lazada: 3400, tiktok: 1900, pgmall: 1200 },
  { date: "Fri", shopee: 6200, lazada: 3800, tiktok: 2800, pgmall: 1500 },
  { date: "Sat", shopee: 7400, lazada: 4200, tiktok: 3200, pgmall: 1800 },
  { date: "Sun", shopee: 6800, lazada: 3600, tiktok: 2600, pgmall: 1400 },
];

export function RevenueChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorShopee" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EE4D2D" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EE4D2D" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLazada" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F146D" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0F146D" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTiktok" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#25F4EE" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#25F4EE" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPgmall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E31837" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E31837" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(218, 196, 164, 0.3)" />
          <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(220, 9%, 46%)' }} />
          <YAxis className="text-xs" tick={{ fill: 'hsl(220, 9%, 46%)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 13%)',
              border: '1px solid hsl(0, 0%, 20%)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#fff',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
            }}
            formatter={(value: number) => [`RM ${value.toLocaleString()}`, undefined]}
          />
          <Area type="monotone" dataKey="shopee" stroke="#EE4D2D" fillOpacity={1} fill="url(#colorShopee)" strokeWidth={2} name="Shopee" />
          <Area type="monotone" dataKey="lazada" stroke="#0F146D" fillOpacity={1} fill="url(#colorLazada)" strokeWidth={2} name="Lazada" />
          <Area type="monotone" dataKey="tiktok" stroke="#25F4EE" fillOpacity={1} fill="url(#colorTiktok)" strokeWidth={2} name="TikTok" />
          <Area type="monotone" dataKey="pgmall" stroke="#E31837" fillOpacity={1} fill="url(#colorPgmall)" strokeWidth={2} name="PG Mall" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
