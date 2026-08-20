import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Standalone config for the sky playground (`pnpm lab`). It deliberately omits
 * the Cloudflare plugin: the lab makes no API calls, and running it outside the
 * worker keeps `sky-lab.html` off the app's asset routing and out of
 * `pnpm build`, whose only input is `index.html`.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5180, open: "/sky-lab.html" },
  build: {
    outDir: "dist-lab",
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL("./sky-lab.html", import.meta.url)) },
  },
});
