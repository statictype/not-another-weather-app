import { fileURLToPath, URL } from "node:url";
import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      // Frontend project — React components, hooks, API client.
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/worker/**", "src/worker.test.ts"],
        },
      },
      // Worker project — runs in workerd via @cloudflare/vitest-pool-workers.
      defineWorkersProject({
        resolve: { alias },
        test: {
          name: "worker",
          include: ["src/worker.test.ts", "src/worker/**/*.test.ts"],
          poolOptions: {
            workers: {
              wrangler: { configPath: "./wrangler.test.jsonc" },
            },
          },
        },
      }),
    ],
  },
});
