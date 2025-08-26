### MCP Chat Client Configuration

You can configure one or more MCP servers via a JSON file, environment path, or a public file.

- Precedence (highest first):
  1. Explicit file path passed to loader
  2. `MCP_CONFIG` (server env) pointing to a JSON file path
  3. `public/mcp.config.json` (fetched in the browser or read on the server)

- Environment interpolation: `${ENV_NAME}` inside the JSON file will be replaced at load time.

Example JSON (save as `public/mcp.config.json` or point `MCP_CONFIG` to it):
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
      "allowTools": ["*"]
    },
    {
      "id": "augmentmem",
      "displayName": "AugmentMem",
      "transport": "http",
      "url": "http://127.0.0.1:8787",
      "httpPath": "/mcp",
      "ssePath": "/sse",
      "namespace": "augmentmem",
      "allowTools": ["augmentmem.*"]
    }
  ]
}
```

Notes:
- Set secrets (e.g., tokens) in `.env.local`; they will be interpolated server-side.
- `namespace` defaults to `id`. Tools are exposed as `namespace.toolName`.
- Filter tools via `allowTools`/`denyTools` (supports `*` and `prefix*`). 