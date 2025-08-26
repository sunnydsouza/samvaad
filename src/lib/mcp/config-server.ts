import { interpolateEnv, parseJSON } from './config';
import type { MCPKitConfig } from './config';
import { normalizeRawConfig } from './config';

export interface LoadConfigServerOptions {
  filePath?: string;
  env?: Record<string, string | undefined>;
}

export async function loadMCPConfigAsync(options: LoadConfigServerOptions = {}): Promise<MCPKitConfig | null> {
  const env = options.env ?? (typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {});
  const pathFromEnv = options.filePath || env.MCP_CONFIG;

  if (pathFromEnv) {
    const [{ readFile }, path] = await Promise.all([
      import('node:fs/promises'),
      import('node:path')
    ]);
    const absolute = path.isAbsolute(pathFromEnv) ? pathFromEnv : path.join(process.cwd(), pathFromEnv);
    const rawText = await readFile(absolute, 'utf8');
    const interpolated = interpolateEnv(rawText, env);
    const raw = parseJSON<unknown>(interpolated);
    return normalizeRawConfig(raw);
  }

  // Fallback to public file path if present on disk (server runtime)
  try {
    const [{ readFile }, path] = await Promise.all([
      import('node:fs/promises'),
      import('node:path')
    ]);
    const publicPath = path.join(process.cwd(), 'public', 'mcp.config.json');
    const rawText = await readFile(publicPath, 'utf8');
    const interpolated = interpolateEnv(rawText, env);
    const raw = parseJSON<unknown>(interpolated);
    return normalizeRawConfig(raw);
  } catch {}

  // As a last resort, try fetch relative path (may fail without a host)
  try {
    const res = await fetch('/mcp.config.json', { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const interpolated = interpolateEnv(text, env);
      const raw = parseJSON<unknown>(interpolated);
      return normalizeRawConfig(raw);
    }
  } catch {}

  return null;
} 