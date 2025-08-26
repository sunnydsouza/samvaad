"use client";

import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

export interface FinanceChartV1 {
  schema: "finance-chart.v1";
  chart_type: "pie" | "bar" | "line";
  title?: string;
  unit?: string;
  x_key?: string;
  y_key?: string;
  series?: { key: string; label: string }[];
  data: Array<Record<string, string | number>>;
  options?: { stacked?: boolean; legend?: "right" | "bottom"; yFormat?: "currency" | "number" };
}

function formatYAxis(val: number, yFormat?: string, unit?: string) {
  if (yFormat === "currency") {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: unit || "INR" }).format(Number(val));
    } catch {
      return Number(val).toFixed(2);
    }
  }
  return String(val);
}

export function ChartRenderer({ chart }: { chart: FinanceChartV1 }) {
  const { chart_type, title, unit, data, x_key, y_key, series, options } = chart;

  const legendAlign = useMemo(() => (
    options?.legend === "bottom"
      ? { verticalAlign: "bottom" as const }
      : { verticalAlign: "middle" as const, layout: "vertical" as const, align: "right" as const }
  ), [options?.legend]);

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="text-xs text-gray-500">No chart data</div>;
  }

  const colors = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57", "#d0ed57",
  ];

  const xKey = x_key || "name";
  const yKey = y_key || "value";

  type DataPoint = Record<string, string | number>;

  const maybeStackProp = options?.stacked ? { stackId: 'stack' as const } : {};

  return (
    <div className="w-full h-64">
      {title && <div className="text-sm font-medium mb-2">{title}</div>}
      <ResponsiveContainer width="100%" height="100%">
        {chart_type === "pie" ? (
          <PieChart>
            <Pie data={data as DataPoint[]} dataKey={yKey} nameKey={xKey} outerRadius={80} isAnimationActive={false}>
              {(data as DataPoint[]).map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: string | number) => formatYAxis(Number(val), options?.yFormat, unit)} />
            <Legend {...legendAlign} />
          </PieChart>
        ) : chart_type === "bar" ? (
          <BarChart data={data as DataPoint[]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis tickFormatter={(v: number) => formatYAxis(Number(v), options?.yFormat, unit)} />
            <Tooltip formatter={(val: string | number) => formatYAxis(Number(val), options?.yFormat, unit)} />
            <Legend />
            {series && series.length > 0 ? (
              series.map((s, idx) => (
                <Bar key={s.key} dataKey={s.key} {...maybeStackProp} fill={colors[idx % colors.length]} isAnimationActive={false} animationDuration={0} />
              ))
            ) : (
              <Bar dataKey={yKey} fill="#8884d8" isAnimationActive={false} animationDuration={0} />
            )}
          </BarChart>
        ) : (
          <LineChart data={data as DataPoint[]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis tickFormatter={(v: number) => formatYAxis(Number(v), options?.yFormat, unit)} />
            <Tooltip formatter={(val: string | number) => formatYAxis(Number(val), options?.yFormat, unit)} />
            <Legend />
            {series && series.length > 0 ? (
              series.map((s, idx) => (
                <Line key={s.key} type="monotone" dataKey={s.key} stroke={colors[idx % colors.length]} dot={false} isAnimationActive={false} animationDuration={0} />
              ))
            ) : (
              <Line type="monotone" dataKey={yKey} stroke="#8884d8" dot={false} isAnimationActive={false} animationDuration={0} />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
} 