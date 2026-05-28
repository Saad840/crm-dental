import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deploy target: Vercel (via Nitro `vercel` preset).
// Outputs to `.vercel/output` which Vercel auto-detects — no vercel.json needed.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
  },
});
