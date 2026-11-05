import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { resolveClientId } from "./src/config/client-id";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

/**
 * `next lint` también carga esta configuración con la fase de build de producción: la validación
 * se limita al comando `next build`. (Además, el loader vuelve a exigir CLIENT_ID al generar páginas.)
 */
const isLintCommand = process.argv.includes("lint");

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD && !isLintCommand) {
    // Detiene el build ANTES de compilar si CLIENT_ID falta, es inválido o no existe en clients/.
    const clientId = resolveClientId({ strict: true });
    console.log(`[client-id] Compilando el sitio del cliente "${clientId}"`);
  }
  return nextConfig;
}
