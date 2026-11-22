import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../virtual-office",
    emptyOutDir: true,
    sourcemap: false
  }
});