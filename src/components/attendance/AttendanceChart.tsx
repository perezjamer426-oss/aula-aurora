import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  day: string;
  attendance_pct: number;
  total_records: number;
}

/** Gráfico simple de asistencia últimos 7 días. */
export function AttendanceChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.day + "T00:00:00").toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
    }),
  }));

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="pctGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
              padding: "8px 12px",
            }}
            formatter={(v: number) => [`${v}%`, "Asistencia"]}
            labelStyle={{ fontWeight: 500 }}
          />
          <Area
            type="monotone"
            dataKey="attendance_pct"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#pctGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
