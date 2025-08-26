### Examples

Navigate to:
- `/examples/full` — Full page chat using `mcp-chat-client`.
- `/examples/bubble` — Floating bubble chat overlay.
- `/examples/sidebar` — Right sidebar drawer chat.

All examples import components from the library alias:
```ts
import { ChatCore, ChatBubble, ChatSidebar } from 'mcp-chat-client';
```

Ensure `tsconfig.json` has the path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "mcp-chat-client": ["./src/index.ts"]
    }
  }
}
``` 