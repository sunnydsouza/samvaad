'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadMCPConfigAsync } from '@/lib/mcp/config';

export interface MCPServerSelectorProps {
  value?: string | null; // namespace or null for all
  onChange?: (namespace: string | null) => void;
}

type HealthMap = Record<string, { ok: boolean; tools: number } | undefined>;

export function MCPServerSelector({ value, onChange }: MCPServerSelectorProps) {
  const [namespaces, setNamespaces] = useState<Array<{ id: string; ns: string; label: string }>>([]);
  const [health, setHealth] = useState<HealthMap>({});

  // Load config
  useEffect(() => {
    let mounted = true;
    (async () => {
      const cfg = await loadMCPConfigAsync();
      if (!mounted || !cfg) return;
      const items = cfg.servers.map((s) => ({ id: s.id, ns: (s.namespace && s.namespace.trim()) ? s.namespace : s.id, label: s.displayName || s.id }));
      setNamespaces(items);
    })();
    return () => { mounted = false; };
  }, []);

  // Poll health every 5s
  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/mcp/health', { cache: 'no-store' });
        const data = (await res.json()) as { servers?: Array<{ name: string; ok: boolean; tools?: number }> };
        if (!mounted || !data?.servers) return;
        const map: HealthMap = {};
        for (const s of data.servers) {
          map[s.name] = { ok: !!s.ok, tools: s.tools || 0 };
        }
        setHealth(map);
      } catch {
        // ignore
      }
    };
    fetchHealth();
    const timer = setInterval(fetchHealth, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const options = useMemo(() => namespaces.map((n) => ({
    ...n,
    status: health[n.ns]?.ok ? 'ok' : 'down',
    tools: health[n.ns]?.tools || 0,
  })), [namespaces, health]);

  return (
    <div className="relative">
      <select
        aria-label="MCP server"
        className="text-sm border border-gray-300 rounded-lg pl-7 pr-7 h-9 appearance-none bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value || null)}
      >
        <option value="">All</option>
        {options.map((n) => (
          <option key={n.id} value={n.ns}>{n.label}{n.tools ? ` (${n.tools})` : ''}</option>
        ))}
      </select>
      <span className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${health[value ?? '']?.ok ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
    </div>
  );
} 