import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Configuración mínima para poder renderizar componentes en los tests (react-dom/server):
// alias "@/" igual que tsconfig y transformación JSX automática.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  oxc: { jsx: { runtime: "automatic" } },
});
