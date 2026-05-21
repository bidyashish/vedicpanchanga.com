import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3121,
    strictPort: false,
  },
  preview: {
    port: 3121,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
          if (
            id.includes("node_modules/react-day-picker") ||
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/lucide-react")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
});
