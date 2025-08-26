import { NextResponse } from 'next/server';
import { createMCPManager } from '@/lib/mcp/manager';
import { loadMCPConfigAsync as loadMCPConfigAsyncServer } from '@/lib/mcp/config-server';

export const dynamic = 'force-dynamic';

type AugmentedTool = { mcpNamespace?: string } & Record<string, unknown>;

export async function GET() {
  try {
    const cfg = await loadMCPConfigAsyncServer();
    const manager = await createMCPManager({ config: cfg });

    const results: Array<{ name: string; ok: boolean; tools?: number; error?: string }> = [];

    try {
      const toolset = (await manager.getTools()) as Record<string, AugmentedTool>;
      const byServer: Record<string, number> = {};
      for (const [, v] of Object.entries(toolset)) {
        const ns = typeof v.mcpNamespace === 'string' && v.mcpNamespace.length > 0 ? v.mcpNamespace : 'unknown';
        byServer[ns] = (byServer[ns] || 0) + 1;
      }
      for (const server of cfg?.servers || []) {
        const ns = server.namespace?.trim() || server.id;
        results.push({ name: ns, ok: !!byServer[ns], tools: byServer[ns] || 0 });
      }
    } catch (err) {
      for (const server of cfg?.servers || []) {
        const ns = server.namespace?.trim() || server.id;
        results.push({ name: ns, ok: false, error: (err as Error).message });
      }
    } finally {
      try { await manager.closeAll(); } catch {}
    }

    return NextResponse.json({ servers: results }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 