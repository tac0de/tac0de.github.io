import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  build: {
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        backrooms: resolve(__dirname, "games/backrooms/index.html"),
        cards: resolve(__dirname, "games/cards/index.html")
      }
    }
  }
});
