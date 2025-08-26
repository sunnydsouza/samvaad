import type { MCPKitConfig, MCPServerConfig } from './config';
import { loadMCPConfigAsync } from './config-server';
import { createTransportedClient, type MCPClientLike } from './transport';

export interface MCPManagerOptions {
  config?: MCPKitConfig | null;
}

export interface MCPManager {
  getTools: () => Promise<Record<string, unknown>>; // ToolSet compatible with AI SDK
  closeAll: () => Promise<void>;
}

// Minimal shape we rely on; keep flexible for different MCP clients
type ToolDefinition = Record<string, unknown>;

function globMatch(name: string, patterns: string[] | undefined): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((p) => {
    if (p === '*') return true;
    if (p.endsWith('*')) return name.startsWith(p.slice(0, -1));
    return name === p;
  });
}

function makeSafeKey(namespace: string, toolName: string): string {
  // provider-safe: letters, numbers, underscore, hyphen only
  const raw = `${namespace}__${toolName}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function initClient(server: MCPServerConfig): Promise<{ client: MCPClientLike; server: MCPServerConfig }> {
  const client = await createTransportedClient(server);
  return { client, server };
}

export async function createMCPManager(options: MCPManagerOptions = {}): Promise<MCPManager> {
  const cfg = options.config ?? (await loadMCPConfigAsync());
  if (!cfg || !Array.isArray(cfg.servers) || cfg.servers.length === 0) {
    return {
      async getTools() { return {}; },
      async closeAll() { /* noop */ },
    } as MCPManager;
  }

  const settled = await Promise.allSettled(cfg.servers.map(initClient));
  const pairs = settled
    .filter((r): r is PromiseFulfilledResult<{ client: MCPClientLike; server: MCPServerConfig }> => r.status === 'fulfilled')
    .map((r) => r.value);

  async function getTools(): Promise<Record<string, unknown>> {
    const aggregated: Record<string, unknown> = {};

    await Promise.all(pairs.map(async ({ client, server }) => {
      try {
        const remoteTools = await client.tools();
        const ns = (server.namespace && server.namespace.trim()) ? server.namespace : server.id;

        const entries = Object.entries(remoteTools as Record<string, ToolDefinition>);
        for (const [toolName, tool] of entries) {
          const exposedName = `${ns}.${toolName}`;
          if (server.allowTools && server.allowTools.length > 0) {
            if (!globMatch(toolName, server.allowTools) && !globMatch(exposedName, server.allowTools)) continue;
          }
          if (server.denyTools && server.denyTools.length > 0) {
            if (globMatch(toolName, server.denyTools) || globMatch(exposedName, server.denyTools)) continue;
          }
          const safeKey = makeSafeKey(ns, toolName);
          const wrapped: ToolDefinition = { ...tool, mcpNamespace: ns, mcpOriginalName: toolName, mcpExposedName: exposedName };
          aggregated[safeKey] = wrapped;
        }
      } catch {
        // Ignore per-server tool fetch failures
      }
    }));

    return aggregated;
  }

  async function closeAll(): Promise<void> {
    await Promise.allSettled(pairs.map(({ client }) => Promise.resolve(client.close())));
  }

  return { getTools, closeAll } as MCPManager;
} 