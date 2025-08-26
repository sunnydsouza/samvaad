import { NextResponse } from 'next/server';
import { createMCPManager } from '@/lib/mcp/manager';
import { loadMCPConfigAsync as loadMCPConfigAsyncServer } from '@/lib/mcp/config-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cfg = await loadMCPConfigAsyncServer();
    const manager = await createMCPManager({ config: cfg });

    const toolset = (await manager.getTools()) as Record<string, { mcpNamespace?: string; mcpOriginalName?: string }>;

    const byNs: Record<string, Array<{ name: string }>> = {};
    for (const [, def] of Object.entries(toolset)) {
      const ns = (def.mcpNamespace && def.mcpNamespace.trim()) ? def.mcpNamespace : 'unknown';
      const name = def.mcpOriginalName || 'unknown';
      if (!byNs[ns]) byNs[ns] = [];
      byNs[ns].push({ name });
    }

    return NextResponse.json({ toolsByNamespace: byNs }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 