import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  day: string;
  attendance_pct: number;
  total_records: number;
}

/** Gráfico premium de asistencia últimos 7 días. */
export function AttendanceChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.day + "T00:00:00").toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
    }),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="pctGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 6"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.2, strokeWidth: 2 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-popover)",
              color: "var(--color-popover-foreground)",
              fontSize: 12,
              padding: "8px 12px",
              boxShadow: "var(--shadow-lg)",
            }}
            formatter={(v: number) => [`${v}%`, "Asistencia"]}
            labelStyle={{ fontWeight: 600, color: "var(--color-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="attendance_pct"
            stroke="var(--color-primary)"
            strokeWidth={2.25}
            fill="url(#pctGradient)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--color-background)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
