```
mcp-oauth-framework/
├── package.json                 # Main package
├── tsconfig.json               # TypeScript config
├── src/
│   ├── auth/                   # Authentication module
│   │   ├── index.ts           # Export all auth functionality
│   │   ├── oauth-flow.ts      # OAuth browser flow
│   │   ├── token-store.ts     # Token persistence
│   │   ├── auth-manager.ts    # Main auth orchestrator
│   │   └── types.ts           # Auth-related types
│   ├── base/                   # MCP base server module
│   │   ├── index.ts           # Export all base functionality
│   │   ├── base-server.ts     # Abstract base server class
│   │   ├── tool-registry.ts   # Tool management
│   │   └── types.ts           # Base server types
│   ├── shared/                 # Shared utilities
│   │   ├── types.ts           # Common types
│   │   └── utils.ts           # Utility functions
│   └── index.ts               # Main package exports
├── dist/                       # Built files
└── examples/                   # Example implementations
    └── github-server/
``` 