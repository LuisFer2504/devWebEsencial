# Vercel: varios proyectos sobre el mismo repositorio

> Análisis del 2026-11-05 (rama `dev-estabilizacion-tecnica`). **Solo diseño: no está implementado.**
> Fuentes oficiales consultadas: [System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables),
> [vercel.json → ignoreCommand](https://vercel.com/docs/project-configuration/vercel-json),
> [Ignored Build Step (KB)](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel).

## 1. Situación

Web Esencial publica **un proyecto de Vercel por cliente** (y por demo), todos conectados al mismo
repositorio privado y a la misma rama de producción (`produccion`). Cada proyecto se diferencia solo por
su variable de entorno `CLIENT_ID`.

**Comportamiento por defecto:** cada push a `produccion` (cada merge de un PR) dispara un despliegue en
**todos** los proyectos conectados al repositorio. Con N clientes, cambiar el horario de uno lanza N
builds. Ocurre lo mismo con los *Preview Deployments* de cada rama de PR.

Consecuencias:
- tiempo y minutos de build multiplicados por N;
- N despliegues nuevos en producción sin cambios reales, lo que añade ruido y riesgo (un fallo externo durante el build afectaría a sitios que no se tocaron);
- más difícil saber qué cambió en el sitio de cada cliente.

Lo que **no** ocurre: un cliente no sobrescribe a otro. Cada proyecto tiene su propia salida aislada y
compila solo su `CLIENT_ID`. El aislamiento del contenido se verificó: cada `out/` contiene solo los
datos de su cliente. Desde este PR, además, el build **falla** si un proyecto no tiene `CLIENT_ID` o
tiene uno inválido.

## 2. Mecanismo de Vercel disponible (verificado en la documentación)

| Hecho | Fuente |
|---|---|
| *Ignored Build Step*: si el comando termina con **0** el build se **omite**; con **1** se ejecuta | KB y `vercel.json` |
| `ignoreCommand` en `vercel.json` **sustituye** al ajuste del panel del proyecto | `vercel.json` |
| `VERCEL_GIT_PREVIOUS_SHA` = SHA del **último despliegue exitoso del proyecto y la rama**; vacío en el primer despliegue; **solo se expone si hay Ignored Build Step** | System env vars |
| `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_ENV` disponibles en el build | System env vars |
| Vercel clona con `git clone --depth=10` (historial superficial) | KB |

Como `vercel.json` es único para todos los proyectos, el mismo comando se ejecuta en cada uno, pero cada
proyecto tiene su propio `CLIENT_ID` y su propio `VERCEL_GIT_PREVIOUS_SHA`. Eso permite que **cada
proyecto decida por sí mismo** si su sitio cambió.

## 3. Solución recomendada

### 3.1 `vercel.json` (compartido)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "ignoreCommand": "node tools/deploy/should-build.mjs"
}
```

### 3.2 `tools/deploy/should-build.mjs` (a implementar)
Decide **por proyecto** comparando el último commit desplegado con éxito y el actual:

```
entrada: CLIENT_ID, VERCEL_GIT_PREVIOUS_SHA, VERCEL_GIT_COMMIT_SHA
1. Sin CLIENT_ID válido                         → exit 1 (compilar: el build fallará con mensaje claro)
2. Sin VERCEL_GIT_PREVIOUS_SHA (primer deploy)  → exit 1
3. PREVIOUS_SHA no está en el clon superficial  → `git fetch --deepen` limitado; si sigue sin estar → exit 1
4. archivos = git diff --name-only PREVIOUS_SHA COMMIT_SHA
5. Si algún archivo coincide con:
     clients/<CLIENT_ID>.json
     clients/<CLIENT_ID>/**            (recursos propios del cliente, cuando existan)
     cualquier ruta compartida          (lista exacta debajo)
                                                     → exit 1 (compilar)
6. En otro caso                                      → exit 0 (omitir)
7. Ante cualquier error inesperado                   → exit 1 (fallo seguro: es mejor compilar de más que dejar un sitio sin actualizar)
```

Rutas que **afectan a todos** los sitios (fuerzan build en todos los proyectos): `src/**`, `public/**`,
`package.json`, `package-lock.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`,
`tsconfig.json`, `vercel.json`.

Rutas que **no** afectan a ningún sitio publicado (nunca fuerzan build): `docs/**`, `.claude/**`,
`.github/**`, `tests/**`, `tools/generator/**`, `tools/qa/**`, `*.md`, `clients/<otro-id>.json`.

### 3.3 Resultado esperado

| Cambio fusionado | Proyectos que compilan |
|---|---|
| `clients/ferreteria-x.json` | Solo `ferreteria-x` |
| `clients/ferreteria-x/assets/logo.webp` | Solo `ferreteria-x` |
| `src/components/shared/Navbar.tsx` | Todos (cambio compartido; requiere QA de todas las variantes) |
| `docs/…`, `.claude/…`, `tests/…`, `tools/generator/…` | Ninguno |
| Primer despliegue de un proyecto | Ese proyecto |

### 3.4 Por qué esta opción
- **Sin infraestructura nueva:** un script de Node y una línea en `vercel.json`.
- **Seguro por defecto:** ante la duda compila (casos 1, 2, 3 y 7).
- **Usa `VERCEL_GIT_PREVIOUS_SHA` y no `HEAD^`:** si un proyecto omitió varios builds seguidos, el diff
  abarca todo lo ocurrido desde su último despliegue exitoso, no solo el último commit. Con `HEAD^` se
  perderían cambios acumulados.

### 3.5 Alternativas descartadas
| Alternativa | Motivo |
|---|---|
| `git diff HEAD^ HEAD` (ejemplo de la documentación) | Pierde cambios si hubo varios commits entre despliegues |
| Un repositorio por cliente | Duplica código; las mejoras no llegan a todos los clientes |
| Monorepo con *workspaces* y "skip unaffected projects" | Exige reestructurar el proyecto en paquetes; desproporcionado |
| Desactivar Git y desplegar con *Deploy Hooks* o la CLI manualmente | Pierde las vistas previas automáticas por PR; más trabajo manual y propenso a errores |
| Ramas de producción distintas por cliente | Complica el flujo de PR y la protección de `produccion` |

## 4. Riesgos y comprobaciones pendientes

- **Historial superficial (`--depth=10`):** si un proyecto lleva más de 10 commits sin desplegar, el SHA
  anterior puede no estar en el clon. El script debe ampliar el historial (`git fetch --deepen=<n>`) o, si
  no puede, compilar.
- **Primer despliegue y cambio de `CLIENT_ID`:** cambiar la variable de un proyecto no genera un commit.
  Hay que redesplegar manualmente desde el panel ("Redeploy").
- **Previews:** el mismo comando se ejecuta en las ramas de PR. Solo el proyecto del cliente afectado
  generará vista previa, que es lo deseado para la aprobación del cliente.
- **Comprobar en Vercel antes de depender de ello** (requiere autorización del propietario, en un
  proyecto de demo):
  1. que un cambio en `clients/demo-a.json` omite el proyecto `demo-b`;
  2. que un cambio en `src/` compila ambos;
  3. que los builds omitidos aparecen como "Ignored" y no consumen minutos de build [a confirmar en la facturación del plan].
- **Plan de Vercel para uso comercial:** pendiente de decisión (ver `docs/COMMERCIAL_LAUNCH_PLAN.md`, PR #6).

## 5. Criterios de aceptación de la futura implementación
- Tests unitarios del script con listas de archivos simuladas para cada fila de la tabla 3.3 y para los
  casos de fallo seguro.
- El script no depende de dependencias nuevas.
- Prueba real en dos proyectos de demo con autorización del propietario, documentada en el PR.
