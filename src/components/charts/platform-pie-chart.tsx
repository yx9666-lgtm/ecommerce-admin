"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Shopee", value: 42, color: "#EE4D2D" },
  { name: "Lazada", value: 28, color: "#0F146D" },
  { name: "TikTok Shop", value: 20, color: "#25F4EE" },
  { name: "PG Mall", value: 10, color: "#E31837" },
];

export function PlatformPieChart() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value}%`, undefined]}
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 13%)',
                border: '1px solid hsl(0, 0%, 20%)',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#fff',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2 w-full">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.name}</span>
            <span className="text-xs font-semibold ml-auto">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
