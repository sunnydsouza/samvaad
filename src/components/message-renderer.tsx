'use client';

import { Bot, User, Wrench, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ChartRenderer, type FinanceChartV1 } from './ChartRenderer';
import { renderStructured } from '@/lib/mcp/renderers';

interface MessageRendererProps {
  message: {
    id: string;
    role: string;
    content?: string | unknown[];
    parts?: Array<{
      type: string;
      text?: string;
      image?: string;
      data?: string;
      mediaType?: string;
      filename?: string;
      toolInvocation?: { toolName?: string; args?: Record<string, unknown> };
      toolResult?: { toolName?: string; result?: unknown; toolCallId?: string; input?: unknown; output?: unknown };
      [key: string]: unknown;
    }>;
    toolInvocations?: Array<{
      toolName: string;
      args?: Record<string, unknown>;
      result?: unknown;
      [key: string]: unknown;
    }>;
    createdAt?: Date | string;
    [key: string]: unknown;
  };
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-md bg-white/70">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1 text-left text-sm"
      >
        <span className="truncate pr-2">{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-2 pb-2 text-xs">{children}</div>}
    </div>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function tryParseJSON(value: string): unknown {
  try { return JSON.parse(value); } catch { return undefined; }
}

function isFinanceChartV1(obj: unknown): obj is FinanceChartV1 {
  const r = asRecord(obj);
  return r.schema === 'finance-chart.v1';
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isToolCall = message.role === 'tool';
  
  if (isSystem) {
    return null;
  }

  // Normalize parts: prefer explicit parts, else treat content array as parts
  const normalizedParts = Array.isArray(message.parts)
    ? message.parts
    : (Array.isArray(message.content) ? message.content : undefined);

  const renderSimplePart = (part: { type: string; text?: string; image?: string; data?: string; mediaType?: string; filename?: string }, idx: number) => {
    if (part.type === 'text') {
      return (
        <div key={`simple-text-${idx}`} className="whitespace-pre-wrap">
          {part.text}
        </div>
      );
    }
    if (part.type === 'image' && part.image) {
      return (
        <div key={`simple-image-${idx}`} className="my-2">
          <img src={part.image} alt={part.filename || 'image'} className="max-w-full rounded" />
        </div>
      );
    }
    if (part.type === 'file' && part.data) {
      return (
        <div key={`simple-file-${idx}`} className="my-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
            <span className="font-medium">Attachment</span>
            <span>{part.filename || part.mediaType}</span>
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex space-x-3 max-w-4xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-blue-500' 
            : isToolCall 
              ? 'bg-green-500' 
              : 'bg-gray-500'
        }`}>
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : isToolCall ? (
            <Wrench className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </div>

        <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
          <div className={`inline-block max-w-full px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-500 text-white'
              : isToolCall
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-gray-100 text-gray-900'
          }`}>
            {/* Legacy toolInvocations (fallback) */}
            {message.toolInvocations && message.toolInvocations.length > 0 && (
              <div className="space-y-2 mb-3">
                {message.toolInvocations.map((toolInvocation, index) => (
                  <Collapsible key={index} title={`⚙️ ${toolInvocation.toolName}`} defaultOpen={false}>
                    {toolInvocation.args && (
                      <div className="mb-1">
                        <strong>Request:</strong>
                        <pre className="whitespace-pre-wrap bg:black/5 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(toolInvocation.args, null, 2)}</pre>
                      </div>
                    )}
                    {'result' in toolInvocation && toolInvocation.result !== undefined && (
                      <div>
                        <strong>Result:</strong>
                        <pre className="whitespace-pre-wrap bg-black/5 p-2 rounded mt-1 overflow-x-auto">{typeof toolInvocation.result === 'string' ? toolInvocation.result : JSON.stringify(toolInvocation.result, null, 2)}</pre>
                      </div>
                    )}
                  </Collapsible>
                ))}
              </div>
            )}

            {/* Parts-based rendering (normalized to handle message.content arrays) */}
            {Array.isArray(normalizedParts) && normalizedParts.map((part, index) => {
              const p = asRecord(part);
              if (typeof p.type === 'string' && (p.type === 'text' || p.type === 'image' || p.type === 'file')) {
                return renderSimplePart(p as { type: string; text?: string; image?: string; data?: string; mediaType?: string; filename?: string }, index);
              }

              if (p.type === 'tool-invocation') {
                const ti = asRecord(p.toolInvocation ?? p);
                const name = typeof ti.toolName === 'string' ? ti.toolName : (typeof ti.name === 'string' ? String(ti.name) : 'tool');
                const args = (ti.args && typeof ti.args === 'object') ? (ti.args as Record<string, unknown>) : {};
                return (
                  <div key={`tool-invocation-${index}`} className="mb-2">
                    <Collapsible title={`⚙️ ${name} (invocation)`} defaultOpen={false}>
                      <div className="text-xs opacity-75">
                        <strong>Request:</strong>
                        <pre className="whitespace-pre-wrap mt-1 bg-black/5 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(args, null, 2)}</pre>
                      </div>
                    </Collapsible>
                  </div>
                );
              }

              if (p.type === 'tool-result') {
                const tr = asRecord(p.toolResult ?? p);
                const name = typeof tr.toolName === 'string' ? tr.toolName : (typeof tr.name === 'string' ? String(tr.name) : 'tool');
                const result = tr.result ?? tr.output;
                const input = tr.input; // some providers include input echo
                // Try structured rendering via registry first
                let structuredPayload: unknown = null;
                if (result && typeof result === 'object') {
                  const rr = asRecord(result);
                  if (typeof rr.schema === 'string') {
                    structuredPayload = rr;
                  } else if (rr.structuredContent && typeof asRecord(rr.structuredContent).schema === 'string') {
                    structuredPayload = rr.structuredContent;
                  } else if (Array.isArray((rr as { content?: Array<{ text?: string }> }).content) && (rr as { content?: Array<{ text?: string }> }).content?.[0]?.text) {
                    const parsed = tryParseJSON(String((rr as { content: Array<{ text?: string }> }).content[0].text));
                    if (parsed && typeof asRecord(parsed).schema === 'string') structuredPayload = parsed;
                  }
                } else if (typeof result === 'string') {
                  const parsed = tryParseJSON(result);
                  if (parsed && typeof asRecord(parsed).schema === 'string') structuredPayload = parsed;
                }

                // Legacy finance-chart direct detection (fallback)
                let maybeChart: FinanceChartV1 | null = null;
                if (!structuredPayload) {
                  if (result && typeof result === 'object') {
                    const rr = asRecord(result);
                    if (isFinanceChartV1(rr)) maybeChart = rr;
                    else {
                      const sc = asRecord(rr.structuredContent);
                      if (isFinanceChartV1(sc)) maybeChart = sc;
                      else if (Array.isArray((rr as { content?: Array<{ text?: string }> }).content) && (rr as { content?: Array<{ text?: string }> }).content?.[0]?.text) {
                        const parsed = tryParseJSON(String((rr as { content: Array<{ text?: string }> }).content[0].text));
                        if (isFinanceChartV1(parsed)) maybeChart = parsed;
                      }
                    }
                  } else if (typeof result === 'string') {
                    const parsed = tryParseJSON(result);
                    if (isFinanceChartV1(parsed)) maybeChart = parsed;
                  }
                }

                const structuredNode = structuredPayload ? renderStructured(structuredPayload as { schema: string }) : null;

                return (
                  <div key={`tool-result-${index}`} className="mb-2">
                    {/* Structured registry rendering has precedence */}
                    {structuredNode ? (
                      <div className="mb-2">{structuredNode}</div>
                    ) : maybeChart ? (
                      <div className="mb-2"><ChartRenderer chart={maybeChart} /></div>
                    ) : null}

                    <Collapsible title={`✅ ${name} (result)`} defaultOpen={false}>
                      {input !== undefined && (
                        <div className="mb-1">
                          <strong>Request:</strong>
                          <pre className="whitespace-pre-wrap mt-1 bg-black/5 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(input, null, 2)}</pre>
                        </div>
                      )}
                      {!structuredNode && !maybeChart && (
                        <div>
                          <strong>Result:</strong>
                          <pre className="whitespace-pre-wrap mt-1 bg-black/5 p-2 rounded text-xs overflow-x-auto">{typeof result === 'string' ? result : JSON.stringify(result ?? {}, null, 2)}</pre>
                        </div>
                      )}
                    </Collapsible>
                  </div>
                );
              }

              if (p.type === 'dynamic-tool') {
                const name = typeof p.toolName === 'string' ? (p.toolName as string) : 'tool';
                const state = typeof p.state === 'string' ? (p.state as string) : undefined;
                // Structured rendering
                let structuredPayload: unknown = null;
                const out = (p as { output?: unknown; result?: unknown }).output ?? (p as { output?: unknown; result?: unknown }).result;
                if (out && typeof out === 'object') {
                  const rr = asRecord(out);
                  if (typeof rr.schema === 'string') structuredPayload = rr;
                  else if (rr.structuredContent && typeof asRecord(rr.structuredContent).schema === 'string') structuredPayload = rr.structuredContent;
                  else if (Array.isArray((rr as { content?: Array<{ text?: string }> }).content) && (rr as { content?: Array<{ text?: string }> }).content?.[0]?.text) { 
                    const parsed = tryParseJSON(String((rr as { content: Array<{ text?: string }> }).content[0].text)); 
                    if (parsed && typeof asRecord(parsed).schema === 'string') structuredPayload = parsed; 
                  }
                } else if (typeof out === 'string') {
                  const parsed = tryParseJSON(out); 
                  if (parsed && typeof asRecord(parsed).schema === 'string') structuredPayload = parsed; 
                }

                // Fallback finance-chart
                let maybeChart: FinanceChartV1 | null = null;
                if (!structuredPayload) {
                  const o = out;
                  if (o && typeof o === 'object') {
                    const rr = asRecord(o);
                    if (isFinanceChartV1(rr)) maybeChart = rr;
                    else {
                      const sc = asRecord(rr.structuredContent);
                      if (isFinanceChartV1(sc)) maybeChart = sc;
                      else if (Array.isArray((rr as { content?: Array<{ text?: string }> }).content) && (rr as { content?: Array<{ text?: string }> }).content?.[0]?.text) { 
                        const parsed = tryParseJSON(String((rr as { content: Array<{ text?: string }> }).content[0].text)); 
                        if (isFinanceChartV1(parsed)) maybeChart = parsed; 
                      }
                    }
                  } else if (typeof o === 'string') {
                    const parsed = tryParseJSON(o); if (isFinanceChartV1(parsed)) maybeChart = parsed; 
                  }
                }

                const structuredNode = structuredPayload ? renderStructured(structuredPayload as { schema: string }) : null;

                return (
                  <div key={`dynamic-tool-${index}`} className="mb-2">
                    {state === 'output-available' && (structuredNode || maybeChart) ? (
                      <div className="mb-2">{structuredNode || (maybeChart ? <ChartRenderer chart={maybeChart} /> : null)}</div>
                    ) : null}

                    <Collapsible title={`${state === 'output-available' ? '✅' : '⚙️'} ${name}`} defaultOpen={false}>
                      {(p as { input?: unknown }).input !== undefined && (
                        <div className="mb-1">
                          <strong>Request:</strong>
                          <pre className="whitespace-pre-wrap mt-1 bg-black/5 p-2 rounded text-xs overflow-x-auto">{JSON.stringify((p as { input?: unknown }).input, null, 2)}</pre>
                        </div>
                      )}
                      {state === 'output-available' && !structuredNode && !maybeChart && (
                        <div>
                          <strong>Result:</strong>
                          <pre className="whitespace-pre-wrap mt-1 bg-black/5 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(out ?? {}, null, 2)}</pre>
                        </div>
                      )}
                      {state === 'output-error' && (
                        <div className="text-red-600"><strong>Error:</strong> {(typeof (p as { errorText?: string }).errorText === 'string' ? (p as { errorText?: string }).errorText : 'Tool execution failed')}</div>
                      )}
                    </Collapsible>
                  </div>
                );
              }

              return null;
            })}

            {/* Plain string content fallback */}
            {typeof message.content === 'string' && (
              <div className="whitespace-pre-wrap">
                {message.content}
              </div>
            )}
          </div>

          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
            {(!isUser && (message as unknown as { metadata?: { totalUsage?: { totalTokens?: number } } }).metadata?.totalUsage) ? (
              <span className="ml-2 text-gray-400">
                tokens: {(message as unknown as { metadata?: { totalUsage?: { totalTokens?: number } } }).metadata?.totalUsage?.totalTokens}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
} 