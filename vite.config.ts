import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: [".agents/**", "worker-configuration.d.ts", "dist/**"],
  },
  fmt: {
    ignorePatterns: [
      ".agents/**",
      "docs/**",
      ".github/**",
      "README.md",
      "AGENTS.md",
      "skills-lock.json",
      "worker-configuration.d.ts",
      "pnpm-lock.yaml",
    ],
  },
});
