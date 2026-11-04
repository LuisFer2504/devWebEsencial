# Barreras locales de producción (Claude Code)

> **Segunda capa, no sustituto.** Estas barreras solo actúan sobre los comandos que **Claude Code**
> ejecuta en este repositorio. No protegen la rama en GitHub, no afectan a personas que usen git
> directamente y pueden desactivarse localmente. La protección real (Branch Protection / Rulesets)
> sigue **pendiente**: el plan actual de GitHub la rechaza en repos privados (HTTP 403).

## Componentes

| Archivo | Función |
|---|---|
| `.claude/settings.json` | Configuración compartida (versionada): reglas `permissions.deny` + registro del hook |
| `.claude/hooks/guard-production.mjs` | Hook `PreToolUse` (Node, sin dependencias) que analiza cada comando |
| `tests/guard-production.test.ts` | 100 tests (Vitest) |
| `.claude/settings.local.json` | Solo preferencias personales; está en `.gitignore`. No pongas aquí las barreras |

### Capa 1 — reglas `deny` (`.claude/settings.json`)
Coincidencia por prefijo/patrón del texto del comando, para Bash y PowerShell: `gh pr merge *`,
`gh pr review * --approve*`, `git push origin produccion*`, `git push * HEAD:produccion*`,
`git push * :produccion*`, `git push --mirror*`, `git push --all*`. Se aplican aunque el hook falle y un hook
no puede anularlas. Son fáciles de esquivar con otras formas de escribir el comando: por eso existe la capa 2.

### Capa 2 — hook `guard-production.mjs`
Registrado con `matcher: "Bash|PowerShell"`, forma exec (`command: "node"`, `args: ["${CLAUDE_PROJECT_DIR}/…"]`,
independiente de Git Bash/PowerShell y de los espacios de la ruta) y `onFailure: "block"` (Claude Code ≥ 2.1.295).

Flujo:
1. Lee el JSON de stdin (`tool_name`, `tool_input.command`, `cwd`).
2. **Tokeniza** el comando según la shell (bash o PowerShell): comillas, escapes, `;` `&&` `||` `|` `&`,
   redirecciones, subshells `( … )`, `$( … )`, backticks, script blocks `{ … }`, comentarios.
3. Analiza recursivamente comandos anidados: `bash/sh -c`, `pwsh/powershell -Command`, `-EncodedCommand`
   (base64), `-File`, `cmd /c`, `eval`, `Invoke-Expression`/`iex`, `Start-Process`, `source`/`.`, scripts
   `.sh`/`.ps1` invocados, prefijos (`env`, `timeout`, `nohup`, `VAR=x`…), git/gh por ruta absoluta o `.exe`,
   `cd`/`Set-Location` previos y `git -C`.
4. Resuelve aliases de git (`git config alias.*`, incluidos los `!shell`) y de gh (`gh alias list`).
5. Para `git push` calcula la **rama destino real**, sin confiar en el nombre del remoto ni en la URL:
   refspecs `src:dst`, `+`, `HEAD`/`@`, `refs/heads/…`, borrado (`:rama`, `--delete`); y si no hay refspec,
   la rama actual, su upstream (`branch.<b>.merge`), `remote.<r>.push`, `remote.<r>.mirror` y `push.default`.
6. Sale con **exit 0** (permitido) o **exit 2** + motivo en stderr (bloqueado; Claude Code no ejecuta el comando).

Fallo seguro: JSON inválido → bloqueo; error interno al analizar un comando que menciona git/gh → bloqueo;
fallo o timeout del proceso → bloqueo por `onFailure: "block"`. Lo que no puede verificarse (variables,
sustituciones, comodines en refspecs, `xargs`, `git -c push.*/remote.*/alias.*`) se bloquea.

## Qué se bloquea

| Categoría | Ejemplos |
|---|---|
| Push a `produccion` | `git push origin produccion`, `HEAD:produccion`, `x:refs/heads/produccion`, con cualquier remoto/URL, `git push` sin refspec desde `produccion` o desde una rama cuyo upstream es `produccion` |
| Force / lease | `--force`, `-f`, `+refspec`, `--force-with-lease`, `--force-if-includes` hacia `produccion` |
| Borrado / reescritura | `git push origin :produccion`, `--delete produccion`, `--mirror`, `--all`, `git branch -D/-m/-f produccion`, `git update-ref` sobre `produccion`, `git switch -C produccion` |
| Commits locales en `produccion` | `git commit`, `merge`, `cherry-pick`, `revert`, `am`, `rebase` con `produccion` como rama actual |
| Merge / aprobación | `gh pr merge` (cualquier forma, incluido `--auto`), `gh pr review --approve` |
| API de GitHub | `gh api` de escritura sobre `pulls/<n>/merge`, `merges`, `merge-upstream`, `branches/*/protection`, `rulesets`, `branches/*/rename`, `repos/<o>/<r>` (ajustes/borrado), `git/refs` de `produccion`, `contents/*` sin rama o en `produccion`, reviews con `APPROVE`; GraphQL `mergePullRequest`, `enablePullRequestAutoMerge`, `*BranchProtectionRule`, `*RepositoryRuleset`, `updateRef(s)`, `deleteRef`, `updateRepository`, `createCommitOnBranch` |
| Ajustes del repo | `gh repo edit/delete/rename/archive`, `gh ruleset` de escritura, `gh alias set/import` |

## Qué sigue permitido
`git status/diff/log/fetch/pull/switch/branch`, `git commit` en ramas de trabajo, `git push` de ramas de
trabajo (incluido `--force-with-lease` sobre la propia rama), `gh pr create/view/checks/list`, `gh issue view`,
`gh api` de lectura y cualquier comando que no sea git/gh.

## Pruebas

```bash
npx vitest run tests/guard-production.test.ts
# Probar el hook a mano (exit 2 = bloqueado):
echo '{"tool_name":"Bash","tool_input":{"command":"git push origin produccion"},"cwd":"."}' | node .claude/hooks/guard-production.mjs; echo $?
```
Los tests crean un repo temporal con un remoto *bare* local: verifican que un push de rama feature llega al
remoto y que los comandos bloqueados no se ejecutan ni cambian `produccion`. No contactan con GitHub.

## Limitaciones conocidas
- Solo cubre las herramientas `Bash` y `PowerShell` de Claude Code. No cubre a personas, IDEs, otras
  herramientas, ni otros clientes de git.
- Un programa arbitrario (`node script.js`, `npm run <script>`, `python …`) que internamente haga push o use la
  API no se analiza. Tampoco `curl`/`Invoke-RestMethod` directos a la API de GitHub.
- Los archivos `.sh`/`.ps1` se analizan si son legibles; código generado en tiempo de ejecución no.
- Extensiones de `gh` no se analizan.
- Cualquiera con acceso al equipo puede editar o desactivar estos archivos (`disableAllHooks`, borrar el hook).
- Requiere `node` en el PATH; si falta, `onFailure: "block"` bloquea los comandos Bash/PowerShell.
- Es conservador: puede bloquear algún comando legítimo poco habitual (p. ej. push a un fork con una rama
  llamada `produccion`, refspecs con variables, `git -c push.default=… push`). En ese caso, el propietario lo ejecuta.

## Mantenimiento
- Ramas protegidas: constante `PROTECTED_BRANCHES` en `guard-production.mjs`.
- Todo cambio en el hook requiere ampliar `tests/guard-production.test.ts` y pasar la suite completa.
- Revisa el hook registrado con `/hooks` en Claude Code.
