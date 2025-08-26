import { z } from 'zod';

export type MCPTransportKind = 'http' | 'sse' | 'stdio';

export interface MCPServerBase {
  id: string;
  displayName?: string;
  namespace?: string;
  allowTools?: string[];
  denyTools?: string[];
}

export interface HttpServerConfig extends MCPServerBase {
  transport: 'http' | 'sse';
  url: string;
  httpPath?: string;
  ssePath?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface StdioServerConfig extends MCPServerBase {
  transport: 'stdio';
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export type MCPServerConfig = HttpServerConfig | StdioServerConfig;

export interface MCPKitConfig {
  servers: MCPServerConfig[];
}

// Raw schemas (input forms)
const HttpServerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().optional(),
  namespace: z.string().optional(),
  allowTools: z.array(z.string()).optional(),
  denyTools: z.array(z.string()).optional(),
  transport: z.enum(['http', 'sse']),
  url: z.string().url(),
  httpPath: z.string().optional(),
  ssePath: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const StdioDefSchema = z.object({
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
  displayName: z.string().optional(),
  namespace: z.string().optional(),
  allowTools: z.array(z.string()).optional(),
  denyTools: z.array(z.string()).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const RawConfigSchema = z.object({
  mcpServers: z.record(StdioDefSchema).refine((o) => Object.keys(o).length > 0, { message: 'mcpServers must have at least one entry' })
});

// Normalized schema (output form)
const NormalizedServerSchema = z.union([
  HttpServerSchema,
  z.object({
    id: z.string().min(1),
    displayName: z.string().optional(),
    namespace: z.string().optional(),
    allowTools: z.array(z.string()).optional(),
    denyTools: z.array(z.string()).optional(),
    transport: z.literal('stdio'),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional(),
    env: z.record(z.string()).optional(),
    timeoutMs: z.number().int().positive().optional(),
  }),
]);

const ConfigSchema = z.object({
  servers: z.array(NormalizedServerSchema).min(1),
});

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

export function validateConfig(config: unknown): asserts config is MCPKitConfig {
  const parsed = ConfigSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Invalid MCP config: ${message}`);
  }
}

export function interpolateEnv(input: string, env: Record<string, string | undefined>): string {
  return input.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => env[key] ?? '');
}

export function parseJSON<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${(err as Error).message}`);
  }
}

export function normalizeRawConfig(raw: unknown): MCPKitConfig {
  const parsed = RawConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Invalid MCP config: ${message}`);
  }

  const value = parsed.data as z.infer<typeof RawConfigSchema>;
  const servers: MCPServerConfig[] = [];

  for (const [id, def] of Object.entries(value.mcpServers)) {
    const httpUrl = def.env?.API_URL || def.env?.HTTP_URL;
    if (httpUrl) {
      let origin = httpUrl;
      let httpPath = '/mcp';
      try {
        const u = new URL(httpUrl);
        origin = u.origin;
        httpPath = u.pathname && u.pathname !== '/' ? u.pathname : '/mcp';
      } catch {
        // If not a valid URL, leave as-is (validation will catch later)
      }

      const entry: HttpServerConfig = {
        id,
        transport: 'http',
        url: origin,
      };
      // Conditionally assign optional fields to satisfy exactOptionalPropertyTypes
      if (httpPath) entry.httpPath = httpPath;
      if (def.namespace) entry.namespace = def.namespace;
      if (def.displayName) entry.displayName = def.displayName;
      if (def.allowTools) entry.allowTools = def.allowTools;
      if (def.denyTools) entry.denyTools = def.denyTools;
      if (typeof def.timeoutMs === 'number') entry.timeoutMs = def.timeoutMs;
      // default sse path for completeness
      entry.ssePath = '/sse';
      servers.push(entry);
    } else if (def.command) {
      const entry: StdioServerConfig = { id, transport: 'stdio', command: def.command };
      if (def.args) entry.args = def.args;
      if (def.cwd) entry.cwd = def.cwd;
      if (def.env) entry.env = def.env;
      if (def.displayName) entry.displayName = def.displayName;
      if (def.namespace) entry.namespace = def.namespace;
      if (def.allowTools) entry.allowTools = def.allowTools;
      if (def.denyTools) entry.denyTools = def.denyTools;
      if (typeof def.timeoutMs === 'number') entry.timeoutMs = def.timeoutMs;
      servers.push(entry);
    }
  }

  const normalized: MCPKitConfig = { servers };
  validateConfig(normalized);
  return normalized;
}

export interface LoadConfigOptions {
  object?: unknown;
  env?: Record<string, string | undefined>;
  defaults?: Partial<MCPKitConfig>;
  filePath?: string; // explicit override path
}

export function loadMCPConfig(options: LoadConfigOptions = {}): MCPKitConfig | null {
  const env = options.env ?? (typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {});

  if (options.object) {
    return normalizeRawConfig(options.object);
  }

  const pathFromEnv = options.filePath || env.MCP_CONFIG;
  if (isNonEmptyString(pathFromEnv)) {
    return null; // defer to async for file IO (server-only)
  }

  return options.defaults ? { servers: options.defaults.servers ?? [] } : null;
}

export async function loadMCPConfigAsync(options: LoadConfigOptions = {}): Promise<MCPKitConfig | null> {
  const env = options.env ?? (typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {});

  if (options.object) {
    return normalizeRawConfig(options.object);
  }

  const pathFromEnv = options.filePath || env.MCP_CONFIG;
  if (isNonEmptyString(pathFromEnv)) {
    try {
      const url = pathFromEnv.startsWith('http') || pathFromEnv.startsWith('/')
        ? pathFromEnv.replace(/^public\//, '/')
        : `/${pathFromEnv.replace(/^public\//, '')}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const interpolated = interpolateEnv(text, env);
        const raw = parseJSON<unknown>(interpolated);
        return normalizeRawConfig(raw);
      }
    } catch {}
  }

  try {
    const res = await fetch('/mcp.config.json', { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const interpolated = interpolateEnv(text, env);
      const raw = parseJSON<unknown>(interpolated);
      return normalizeRawConfig(raw);
    }
  } catch {}

  return options.defaults ? { servers: options.defaults.servers ?? [] } : null;
}

export function resolveNamespace(server: MCPServerConfig): string {
  return (server.namespace && server.namespace.trim()) ? (server.namespace as string) : server.id;
} 