import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsConfigFilePath: "./tsconfig.json",
      outputDir: "./dist",
      skipDiagnostics: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/jotai-minidb.ts"),
      name: "jotai-minidb",
      fileName: "jotai-minidb",
    },
    rollupOptions: {
      external: ["react", "jotai"],
    },
  },
});
