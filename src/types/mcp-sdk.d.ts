declare module '@modelcontextprotocol/sdk/client/streamableHttp' {
  export class StreamableHTTPClientTransport {
    constructor(url: URL, options?: { headers?: Record<string, string> | undefined; timeoutMs?: number | undefined });
    // opaque transport instance compatible with ai experimental_createMCPClient
    readonly _brand?: 'StreamableHTTPClientTransport';
  }
} 