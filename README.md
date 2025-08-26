# Samvaad

> "Samvaad" (संवाद) — Hindi for "dialogue" or "meaningful conversation". Samvaad is a config-driven, reusable MCP chat client for the web that turns multiple Model Context Protocol servers into a single, elegant conversational interface.

<p align="left">
  <img src="public/logo_text.png" alt="Samvaad logo" width="320" />
</p>

Config-driven, reusable MCP chat client for web apps. Supports multiple MCP servers (HTTP/SSE and stdio via mcpServers config), namespaced tools, and embeddable UIs (full page, floating bubble, sidebar).

## Quick Start

```bash
npm install
cp env.example .env.local
npm run dev
# open http://localhost:3005
```

## Configure MCP servers

- Create a JSON file and point `MCP_CONFIG` to it in `.env.local`:
```bash
MCP_CONFIG=public/mcp.config.json
```

- Example config (HTTP + stdio):
```json
{
    "mcpServers": {
        "augmentmem": {
            "namespace": "augmentmem",
            "env": {
                "API_URL": "http://localhost:8010/mcp",
                "AUGMENT_USER_ID": "9296f953-5309-464b-ad3a-33f025b24b0e"
            }
        },
        "finance": {
            "namespace": "finance",
            "env": {
                "API_URL": "http://localhost:8000/mcp"
            }
        }
    }
}
```
- `${ENV}` values are interpolated server-side when loading the file.
- Headers/auth are optional and can be added later.

## Embedding options

- Full page: `src/app/examples/full/page.tsx`
- Bubble: `src/app/examples/bubble/page.tsx`
- Sidebar: `src/app/examples/sidebar/page.tsx`

Import from the library entry:
```ts
import { ChatCore, ChatBubble, ChatSidebar } from 'samvaad';
```

## API route

- The chat endpoint uses a manager-backed handler that loads your config, connects to all servers, merges namespaced tools, and streams responses using the Vercel AI SDK.
- Optional filtering by server in the request body: `{ serverNamespace: "finance" }`.

## Environment

```bash
# Path to MCP config
MCP_CONFIG=public/mcp.config.json

# Model providers
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Default model (optional)
NEXT_PUBLIC_DEFAULT_MODEL=openai:gpt-4o-mini
```

## Development scripts

- `npm run dev` – start dev server
- `npm run build` – build
- `npm start` – start prod
- `npm run type-check` – TS
- `npm run lint` – ESLint

## Notes

- If no MCP servers are configured, chat works in model-only mode.
- Tools are namespaced by server (e.g., `finance.query_expenses`).


