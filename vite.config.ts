import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // viteSingleFile() ne doit s'appliquer qu'au build de production (npm run build).
  // En dev, il perturbe l'analyse d'index.html par Vite.
  plugins: [
    react(),
    tailwindcss(),
    ...(command === "build" ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // En dev, redirige les appels /api/* du frontend (port Vite) vers le backend Express (server.js)
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
}));
