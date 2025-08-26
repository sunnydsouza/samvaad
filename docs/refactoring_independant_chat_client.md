I’ll outline a concrete, incremental plan to turn the replicated `mcp-chat-client` into a reusable, config-driven MCP chat kit that preserves your current UX and charts while adding multi-server flexibility and embeddable widgets.

### End-state goals
- Configurable via JSON/env at runtime (multiple MCP servers, HTTP/SSE transports, headers).
- Reusable library surface (manager + chat handler + UI widgets).
- Same functional output (tool streaming, chart rendering via `finance-chart.v1`).
- Embeddable chat UI: bubble (floating), sidebar (right), or full page.

### Config model (example)
As you prefer clear example payloads, here’s a minimal JSON example you can pass via env or file [[memory:5492654]]:
```json
{
  "servers": [
    {
      "id": "finance",
      "displayName": "Finance Assistant",
      "transport": "http",
      "url": "http://127.0.0.1:8000",
      "httpPath": "/mcp",
      "ssePath": "/sse",
      "headers": { "Authorization": "Bearer ${FINANCE_TOKEN}" },
      "namespace": "finance",
      "allowTools": ["*"],
      "denyTools": []
    },
    {
      "id": "augmentmem",
      "displayName": "AugmentMem",
      "transport": "http",
      "url": "http://localhost:8787",
      "httpPath": "/mcp",
      "namespace": "augmentmem",
      "allowTools": ["augmentmem.*"]
    }
  ]
}
```
- Supports multiple servers, namespaced tool exposure, per-server headers, env interpolation, and tool filters.
- Precedence at runtime:
  - Direct prop/config passed into component (highest)
  - `MCP_CONFIG_JSON` (server env) or `NEXT_PUBLIC_MCP_CONFIG_JSON` (client display only)
  - `public/mcp.config.json` (file)
  - Legacy env (`MCP_SERVER_URL`, `MCP_HTTP_PATH`) as fallback for 1-server mode
- Secrets (tokens) should be server-side only, not exposed via public env.

### Library extraction: new modules in `mcp-chat-client`
- `src/lib/mcp/config.ts`
  - Types (`MCPServerConfig`, `MCPKitConfig`)
  - Loaders: from env/json/file; env-var substitution; validation
- `src/lib/mcp/transport.ts`
  - Factory for HTTP (StreamableHTTPClientTransport), SSE (fallback)
  - Optional stdio in Node-only contexts (not in Edge/browser)
- `src/lib/mcp/manager.ts`
  - `createMCPManager(config)` → initializes clients per server
  - Aggregates and namespaces `tools()` across servers
  - Allow/Deny filtering; optional `rename` map (future)
  - `getTools()`, `closeAll()`, `health()` helpers
- `src/lib/mcp/chat-handler.ts`
  - `makeChatHandler({ resolveModel, config, system, maxSteps })` returns Next.js `POST` handler
  - Internally: build manager, gather tools, call `streamText`, cleanup
- `src/lib/mcp/renderers.tsx` (optional)
  - Schema→renderer registry (keep `finance-chart.v1` mapping to your `ChartRenderer`)
  - Extensible for future schemas (e.g., mermaid)

### UI components (embeddable)
- `src/components/chat/ChatCore.tsx`
  - A headless chat surface powered by `@ai-sdk/react` that accepts a generic `/api/chat` endpoint, model selection, and optional server selector
- `src/components/chat/ChatBubble.tsx`
  - Floating button + sheet/drawer that mounts `ChatCore`; position customizations; minimal CSS bleed
- `src/components/chat/ChatSidebar.tsx`
  - Right-aligned drawer/sidebar; mounts `ChatCore`
- `src/app/chat/page.tsx`
  - Full-page chat (current layout) mounting `ChatCore`
- `src/components/chat/MCPServerSelector.tsx`
  - Optional server picker; either:
    - switch entire aggregated toolset (namespace preserved), or
    - filter to a single server’s tools when selected

### Server route integration
- `src/app/api/chat/route.ts`
  - Replace bespoke client creation with `makeChatHandler`. This keeps your current logic but sources tools from the config-driven manager.
  - Acceptance criteria: if no JSON config is provided, legacy env variables keep a single-server setup working unchanged.

### Backwards-compatible behavior (preserve current output)
- Chart flow unchanged: `MessageRenderer` still hoists and renders `finance-chart.v1` via `ChartRenderer`.
- Tools remain streamed via Vercel AI SDK; now aggregated and namespaced (e.g., `finance.query_expenses`, `augmentmem.dailySummary`).
- If there’s only one server in config, namespaces can be optionally hidden in UI labels.

### Step-by-step action plan (incremental)
1) Add config foundation
- Create `config.ts` with types, loaders, and validation (Zod or small hand-rolled checks).
- Support env/file/prop precedence with `${ENV_VAR}` interpolation.
- Add `public/mcp.config.json` fixture for local dev.

2) Build transport + manager
- Implement HTTP with preferred Streamable HTTP; fallback to SSE when unavailable.
- Implement `createMCPManager(config)` with:
  - client lifecycle (init/close) per server
  - `getTools()` merging and namespacing
  - tool allow/deny filtering
  - `health()` ping support (optional `/health`)
- Unit-test manager with a stub MCP transport.

3) Swap chat route to generic handler
- Implement `makeChatHandler`. Wire `resolveModel()` using your existing `ai-providers`.
- Replace `src/app/api/chat/route.ts` internals to use the handler.
- Confirm parity: finance server works as before; chart rendering unchanged.

4) Extract chat UI core
- Create `ChatCore.tsx` using `useChat`, identical streaming behavior with optional server picker.
- Keep `MessageRenderer` and `ChartRenderer` as-is (or move under a `renderers/` subfolder for clarity).

5) Add embeddable shells
- `ChatBubble.tsx`: floating action button → modal/drawer with `ChatCore`.
- `ChatSidebar.tsx`: right drawer with `ChatCore`.
- Keep your existing full-page as a third mounting style.

6) Runtime config UI (optional but useful)
- Add a `MCPServerSelector` that reads the loaded config (names + ids).
- Persist selection in `localStorage`.
- Show health status per server (green/gray dot) if `health()` is available.

7) Documentation and examples
- README: JSON config spec, env precedence, usage snippets.
- Examples:
  - Page mounting:
    ```tsx
    <ChatCore />
    ```
  - Bubble mounting:
    ```tsx
    <ChatBubble position="bottom-right" />
    ```
  - Sidebar mounting:
    ```tsx
    <ChatSidebar width={380} />
    ```
  - Server picker:
    ```tsx
    <MCPServerSelector />
    ```

8) Hardening and polish
- Namespacing collision checks; safe error formatting in `onError`.
- SSR/Edge compatibility notes: avoid Node-only APIs in route if targeting Edge.
- Optional renderer registry for additional schemas.

### Acceptance criteria
- With a single-server JSON or legacy env, the chat behaves exactly as now.
- With multiple servers configured, user can switch servers (or use all via namespaced tools) without code changes.
- Charts render from tool outputs using `finance-chart.v1`.
- Can embed chat as bubble, sidebar, or full page with minimal props.
- No secrets leak to client; headers/tokens only applied server-side.

### Risks/assumptions
- If deploying on Edge runtimes, stdio isn’t viable—use HTTP/SSE only.
- Some MCP servers may not expose `/health`; the UI should degrade gracefully.
- Tool name collisions across servers are avoided via namespacing; keep a `rename` map ready if you need human-friendly labels.

If you want, I can start by scaffolding the config/manager/handler files in `mcp-chat-client/src/lib/mcp/` and switch the `route.ts` to use the handler, then add `ChatBubble` and `ChatSidebar`.

- You’ll get the same output immediately (single-server JSON or env).
- Multi-server selection becomes a progressive enhancement once you add the JSON config.

- Reusable MCP kit: config-driven manager and handler in `src/lib/mcp/`.
- Embeddable chat surfaces: `ChatCore`, `ChatBubble`, `ChatSidebar`.
- JSON config with env interpolation and tool namespacing; HTTP/SSE transports.