import { experimental_createMCPClient, type MCPTransport } from 'ai';
import type { MCPServerConfig, HttpServerConfig } from './config';

export interface MCPClientLike {
  tools: () => Promise<ReturnType<Awaited<ReturnType<typeof experimental_createMCPClient>>['tools']>>;
  close: () => Promise<void> | void;
}

function joinUrl(base: string, path: string): string {
  if (!path) return base;
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

export async function createTransportedClient(server: MCPServerConfig): Promise<MCPClientLike> {
  if (server.transport === 'http') {
    const httpCfg = server as HttpServerConfig;
    const httpPath = httpCfg.httpPath || '/mcp';
    const ssePath = httpCfg.ssePath || '/sse';
    try {
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      const httpUrl = new URL(joinUrl(httpCfg.url, httpPath));
      let requestInit: RequestInit | undefined;
      if (httpCfg.headers) {
        requestInit = { headers: httpCfg.headers as HeadersInit };
      }
      const httpTransport = new StreamableHTTPClientTransport(httpUrl, requestInit ? { requestInit } : undefined);
      const client = await experimental_createMCPClient({ transport: httpTransport as unknown as MCPTransport });
      return client as unknown as MCPClientLike;
    } catch {
      const sseUrl = joinUrl(httpCfg.url, ssePath);
      const client = await experimental_createMCPClient({ transport: { type: 'sse', url: sseUrl } });
      return client as unknown as MCPClientLike;
    }
  }

  if (server.transport === 'sse') {
    const httpCfg = server as HttpServerConfig;
    const ssePath = httpCfg.ssePath || '/sse';
    const sseUrl = joinUrl(httpCfg.url, ssePath);
    const client = await experimental_createMCPClient({ transport: { type: 'sse', url: sseUrl } });
    return client as unknown as MCPClientLike;
  }

  if (server.transport === 'stdio') {
    throw new Error('STDIO transport is not supported in the browser/Edge runtime');
  }

  throw new Error(`Unknown transport: ${(server as typeof server).transport}`);
} 