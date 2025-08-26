import React from 'react';
import { ChartRenderer, type FinanceChartV1 } from '@/components/ChartRenderer';

export type StructuredPayload = { schema: string };

export type Renderer = (payload: StructuredPayload) => React.ReactNode | null;

const registry = new Map<string, Renderer>();

function isFinanceChartV1(payload: StructuredPayload): payload is FinanceChartV1 {
  return payload.schema === 'finance-chart.v1';
}

// Built-in: finance-chart.v1
registry.set('finance-chart.v1', (payload) => {
  if (!isFinanceChartV1(payload)) return null;
  return <ChartRenderer chart={payload} />;
});

export function registerRenderer(schema: string, renderer: Renderer) {
  registry.set(schema, renderer);
}

export function renderStructured(payload: StructuredPayload): React.ReactNode | null {
  const renderer = registry.get(payload.schema);
  return renderer ? renderer(payload) : null;
} 