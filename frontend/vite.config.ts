import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
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
  },
});
