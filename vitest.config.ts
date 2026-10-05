import { defineConfig } from "vite-plus";

// Focused handler tests use an injected DurableObject base/storage; real
// Workers transport and SQLite persistence are checked by verify-runtime.mjs.
export default defineConfig({ test: { include: ["worker/**/*.test.ts", "src/lib/**/*.test.ts"] } });
