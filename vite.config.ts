import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
