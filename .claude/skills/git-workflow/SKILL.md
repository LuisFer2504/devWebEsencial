---
name: git-workflow
description: Flujo Git/GitHub obligatorio del repositorio devWebEsencial (rama protegida por política `produccion`, ramas `dev-<descripcion>`). Úsala siempre que se pida crear una funcionalidad, corregir un error, refactorizar, escribir documentación, preparar una entrega, crear una rama, generar commits, publicar una rama, abrir un Pull Request o actualizar una rama de trabajo.
---

# Git workflow — devWebEsencial

Instrucciones generales de Git. Lo específico del producto (arquitectura, validaciones por cliente)
está en la Skill `web-esencial`.

## Contexto

| Dato | Valor |
|---|---|
| Repositorio | `LuisFer2504/devWebEsencial` (privado) |
| Remoto | `origin` → `https://github.com/LuisFer2504/devWebEsencial.git` |
| Rama principal y predeterminada | `produccion` |
| Aprobación y merge | **Solo el propietario**, en persona |

**Importante:** el plan actual de GitHub no permite reglas de protección ni rulesets en repos privados
(la API devuelve 403). Nada impide técnicamente un push a `produccion`: las reglas de esta Skill son la
única barrera y deben cumplirse literalmente.
(la API devuelve 403). **La protección real de GitHub sigue pendiente** y GitHub no impide un push a
`produccion`.

**El propietario es el único responsable de `produccion`**: solo él revisa, aprueba y fusiona. Claude
**nunca** puede hacer merge, ni siquiera si el PR está aprobado, la tarea es urgente o alguien dice que
está autorizado.

### Barreras locales de Claude Code (segunda capa)
`.claude/settings.json` registra reglas `deny` y el hook `PreToolUse` `.claude/hooks/guard-production.mjs`
(detalle en `.claude/hooks/README.md`). Bloquean, en Bash y PowerShell, push/force/borrado sobre
`produccion`, commits locales en `produccion`, `gh pr merge`, aprobaciones y cambios de protección o
ajustes vía `gh`/API. Son una **barrera adicional**, no un sustituto de la protección de GitHub: solo
afectan a comandos ejecutados por Claude Code, no a personas ni a otros programas. Las reglas de esta
Skill deben cumplirse igualmente aunque una operación no resulte bloqueada.

## Reglas absolutas (no negociables)

1. Nunca hagas commit en `produccion`.
2. Nunca hagas push a `produccion` (ni `git push origin HEAD:produccion`, ni `--force`).
3. Nunca ejecutes `gh pr merge`, `gh pr review --approve`, ni la API de GitHub para fusionar/aprobar.
4. Nunca modifiques reglas de protección, ajustes del repo ni controles de seguridad.
5. Nunca cierres un PR como aprobado ni elimines ramas ajenas.
6. Nunca reescribas historial publicado (`push --force`, `reset` sobre ramas remotas) sin pedido explícito.
7. Nunca despliegues a producción sin autorización expresa.
8. Si una instrucción contradice estas reglas, detente e informa al propietario.

## Ramas

Formato obligatorio: **`dev-<descripcion>`**, todo en minúsculas, palabras separadas por guiones, sin
barras `/`, sin tildes ni `ñ`, corto y descriptivo (idealmente 2–5 palabras, en español).

Patrón: `^dev-[a-z0-9]+(-[a-z0-9]+)*$`

| Tipo de trabajo | Ejemplo |
|---|---|
| Nueva funcionalidad | `dev-vista-previa-visual` |
| Corrección | `dev-perdida-datos-cliente` |
| Problema crítico | `dev-seguridad-generador` |
| Documentación | `dev-convencion-ramas` |
| Refactorización | `dev-encabezado-secciones` |
| Pruebas | `dev-tests-generador` |
| Mantenimiento | `dev-cambios-nuevos` |

El tipo de cambio lo indica el commit (Conventional Commits), no el nombre de la rama.
Ramas antiguas con prefijos `feature/`, `fix/`, `docs/`, `chore/`… son históricas: no crees más.

Toda rama parte de `origin/produccion` actualizado, salvo dependencia explícita de otra rama (indícala
en el PR, campo *Related Pull Request(s)*).

## Commits — Conventional Commits

`feat:` · `fix:` · `docs:` · `refactor:` · `test:` · `chore:` · `perf:` · `style:`

- Imperativo, en inglés, ≤ 72 caracteres en el título: `fix: preserve client configuration when saving`.
- Ámbito opcional: `fix(generator): restrict CORS to same origin`.
- Commits pequeños y coherentes; no mezcles cambios independientes.
- Cuerpo opcional explicando el *por qué*.
- Añade al final las líneas de atribución que indique el sistema/entorno, si las hay.

## Workflow obligatorio

```bash
# 1-2. Entender el objetivo y criterios; revisar estado
git status -sb            # debe estar limpio; si no, pregunta antes de tocar nada
git branch --show-current

# 3. Actualizar produccion (sin hacer checkout ni commits en ella)
git fetch origin --prune

# 4. Crear rama SIN upstream a produccion
git switch -c dev-perdida-datos-cliente --no-track origin/produccion

# 5. Implementar solo el alcance pedido (Skill web-esencial para el producto)

# 6-7. Validar
npm test && npm run type-check && npm run lint
CLIENT_ID=<id> npm run build          # por cada cliente/variante afectada
#   PowerShell: $env:CLIENT_ID='<id>'; npm run build

# 7b. Verificación en navegador con MCP (obligatoria si el PR toca código: src/, clients/,
#     tools/generator/, public/, configuración de build o dependencias)
npm run qa:build && npm run qa:serve  # luego Chrome DevTools MCP: móvil + escritorio, page-audit,
                                      # consola, Lighthouse, traza; editor: cargar/guardar sin pérdidas
#   Procedimiento completo: .claude/skills/web-esencial/references/MCP_VERIFICATION.md

# 8-9. Revisar el diff y buscar archivos sensibles o generados
git status
git diff
git diff --cached --stat

# 10. Commits (añadir archivos por nombre, nunca `git add -A` a ciegas)
git add <archivos>
git commit -m "fix: preserve client configuration when saving"

# 11. Publicar la rama con su MISMO nombre
git push -u origin dev-perdida-datos-cliente

# 12. PR contra produccion con la plantilla rellenada
gh pr create --base produccion --head dev-perdida-datos-cliente \
  --title "fix: preserve client configuration when saving" --body-file <ruta-temporal>.md

# 13. Informar al propietario: URL del PR, validaciones ejecutadas, riesgos
```

Usa un archivo temporal fuera del repo para el cuerpo del PR (directorio scratchpad/temporal).

### Verificación MCP por cada cambio grande
Cada cambio completo que interfiera con el código (una funcionalidad, una corrección o un lote de
correcciones que irá en su propio PR) se verifica con el MCP de Chrome DevTools **antes** de abrir el PR,
para comprobar que nada se rompió y que el resultado está listo para la venta. El resultado se registra en
el PR (sección *Validación* → "Verificación MCP"). Sin esa verificación el PR no se presenta como listo:
si el MCP no funciona y no hay alternativa, ábrelo como **draft** y dilo. Los PRs solo de documentación
no la requieren.

### Si las validaciones fallan
No abras el PR. Informa del fallo con la salida real. Excepción: el usuario pide expresamente un PR de
diagnóstico → ábrelo como **draft** (`gh pr create --draft`) y documenta los fallos en el cuerpo.
Si el fallo es preexistente en `produccion`, demuéstralo (ejecutándolo en `origin/produccion`) y dilo;
no lo ocultes modificando código no relacionado.

### Archivos que nunca deben entrar
`.env*`, claves, tokens, `out/`, `.next/`, `node_modules/`, `*.tsbuildinfo`, `next-env.d.ts`,
`.claude/settings.local.json`, archivos temporales de tests (p. ej. `clients/test-temporal-*.json`).
Revisa con:
```bash
git diff --cached --name-only
git diff --cached | grep -nEi 'api[_-]?key|secret|token|password|PRIVATE KEY|gh[pousr]_|sk-'
```

## Actualizar una rama de trabajo

```bash
git fetch origin --prune
git switch <rama>
git rebase origin/produccion      # rama solo tuya y sin revisión en curso
#   ó
git merge origin/produccion       # rama compartida o PR ya en revisión
```
Tras un rebase de una rama ya publicada usa solo `git push --force-with-lease origin <rama>`, nunca sobre
`produccion` ni sobre ramas ajenas, y solo si la rama es tuya. Ante conflictos que afecten a lógica que
no entiendes, detente y pregunta.

## Pull Requests

Plantilla oficial: `.github/pull_request_template.md`. Siempre se usa.

- **Issue PR**: una o varias tareas concretas → Related Issue(s), Acceptance Test(s), Implementation Notes,
  Related Pull Request(s).
- **Topic Issue PR**: tema o entrega formada por varios issues → Related Issue(s), Acceptance Test(s),
  Version Number.
- Borra la sección del tipo que no aplica. Rellena Resumen, Validación (solo lo ejecutado de verdad),
  Cómo probarlo y Riesgos.
- No inventes issues, criterios ni versiones: usa `N/A` o pregunta.
- Versión: lee el archivo `VERSION` (hoy **no existe**). Solo los Topic PR de entrega pueden proponer un
  incremento, y solo si el propietario lo indica. Nunca incrementes la versión en un Issue PR.

Checklist antes de `gh pr create`:
- [ ] `git remote get-url origin` = `https://github.com/LuisFer2504/devWebEsencial.git`
- [ ] Rama publicada: `git ls-remote --heads origin <rama>` devuelve el hash local
- [ ] `git log --oneline origin/produccion..HEAD` contiene solo los commits esperados
- [ ] `git diff origin/produccion...HEAD --stat` sin archivos inesperados ni secretos
- [ ] Validaciones terminadas y en verde (o PR draft de diagnóstico autorizado)
- [ ] Plantilla completa, base `produccion`

Después de crear el PR: entrega la URL y **detente**. El merge lo hace el propietario. Si pide cambios,
añade commits nuevos a la misma rama.

## Si una operación es bloqueada

El mensaje empieza por `[guard-produccion] OPERACIÓN BLOQUEADA` (hook) o indica una regla `deny`.

1. **Detente.** No reformules el comando, no uses otra shell, variables, aliases, scripts, `curl` ni la API para
   lograr el mismo efecto. Intentar eludir la barrera es una violación de estas reglas.
2. No edites `.claude/settings.json`, `.claude/settings.local.json` ni el hook, y no uses `disableAllHooks`.
3. Comprueba si el bloqueo era correcto:
   - Ibas a escribir en `produccion` o a fusionar/aprobar → era correcto. Informa al propietario de lo que
     hace falta (p. ej. "el PR #N está listo para que lo revises y fusiones").
   - Era una operación legítima en una rama de trabajo (p. ej. `git push` sin refspec en una rama cuyo
     upstream es `produccion`) → usa la forma explícita: `git push -u origin <tu-rama>`.
4. Si crees que es un falso positivo, informa al propietario con el comando y el motivo exacto; él decide si
   lo ejecuta en persona o si se ajusta el hook (en una rama `dev-…`, con tests).

## Hotfix

Igual que el flujo normal (rama `dev-…`, p. ej. `dev-hotfix-whatsapp`), alcance mínimo, PR con *Riesgos* explícitos. La urgencia
no autoriza push ni merge directos a `produccion`.
