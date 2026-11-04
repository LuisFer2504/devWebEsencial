#!/usr/bin/env node
/**
 * guard-production.mjs — Hook PreToolUse de Claude Code (devWebEsencial).
 *
 * Segunda capa de seguridad: impide que Claude Code ejecute operaciones que escriban en la rama
 * protegida `produccion`, fusionen/aprueben PRs o cambien la protección/ajustes del repositorio.
 * NO sustituye a la protección de ramas de GitHub.
 *
 * Contrato del hook:
 *   stdin  : JSON de Claude Code ({ tool_name, tool_input: { command }, cwd, ... })
 *   salida : exit 0 → permitido; exit 2 + mensaje en stderr → bloqueado (Claude ve el motivo).
 *   Falla de forma segura: si no puede leer/analizar un comando que menciona git/gh, lo bloquea.
 *
 * Documentación: .claude/hooks/README.md
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PROTECTED_BRANCHES = ["produccion"];
const MAX_DEPTH = 6;
const MAX_FILE_BYTES = 512 * 1024;

// ---------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------

class Blocked extends Error {}

function isProtectedName(name) {
  if (!name) return false;
  const n = normalizeBranch(name).toLowerCase();
  return PROTECTED_BRANCHES.some((p) => n === p.toLowerCase());
}

/** refs/heads/x, heads/x, /refs//heads/x → x */
export function normalizeBranch(ref) {
  let r = String(ref).trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/+/, "");
  if (r.toLowerCase().startsWith("refs/heads/")) r = r.slice("refs/heads/".length);
  else if (r.toLowerCase().startsWith("heads/")) r = r.slice("heads/".length);
  return r;
}

function textMentionsProtected(text) {
  const t = String(text).toLowerCase();
  return PROTECTED_BRANCHES.some((p) => t.includes(p.toLowerCase()));
}

function baseCommandName(word) {
  let w = String(word).replace(/\\/g, "/");
  w = w.slice(w.lastIndexOf("/") + 1).toLowerCase();
  return w.replace(/\.(exe|cmd|bat|com|ps1)$/, "");
}

function toNativePath(p) {
  // Git Bash: /c/Users/... → C:/Users/...
  if (process.platform === "win32") {
    const m = /^\/([a-zA-Z])(\/.*)?$/.exec(p);
    if (m) return `${m[1].toUpperCase()}:${m[2] || "/"}`;
  }
  return p;
}

function readSmallFile(file, cwd) {
  try {
    const full = path.resolve(cwd || process.cwd(), toNativePath(file));
    const st = fs.statSync(full);
    if (!st.isFile() || st.size > MAX_FILE_BYTES) return null;
    return fs.readFileSync(full, "utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Tokenizador (bash / PowerShell / cmd). Devuelve segmentos de palabras y comandos anidados.
// ---------------------------------------------------------------------------------------------

/**
 * @param {string} input
 * @param {"bash"|"powershell"|"cmd"} mode
 * @returns {{ segments: Array<Array<{v:string, dyn:boolean}>>, nested: Array<{text:string, mode:string}> }}
 */
export function tokenize(input, mode) {
  const segments = [];
  const nested = [];
  let words = [];
  let cur = "";
  let curDyn = false;
  let inWord = false;
  let dropNextWord = false;
  const s = String(input);
  const isPS = mode === "powershell";
  const escapeChar = mode === "bash" ? "\\" : isPS ? "`" : null;

  const pushWord = () => {
    if (inWord) {
      if (dropNextWord) dropNextWord = false;
      else words.push({ v: cur, dyn: curDyn });
    }
    cur = "";
    curDyn = false;
    inWord = false;
  };
  const endSegment = () => {
    pushWord();
    if (words.length) segments.push(words);
    words = [];
  };
  /** Lee un bloque balanceado desde s[start] (que es open) y devuelve [contenido, índiceFinal]. */
  const readBalanced = (start, open, close) => {
    let depth = 0;
    let q = null;
    for (let j = start; j < s.length; j++) {
      const c = s[j];
      if (q) {
        if (c === q) q = null;
        else if (escapeChar && c === escapeChar && q === '"') j++;
        continue;
      }
      if (c === "'" || c === '"') q = c;
      else if (escapeChar && c === escapeChar) j++;
      else if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) return [s.slice(start + 1, j), j];
      }
    }
    return [s.slice(start + 1), s.length - 1];
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];

    // Comentarios (# al inicio de palabra) en bash y PowerShell
    if ((mode === "bash" || isPS) && ch === "#" && !inWord) {
      while (i < s.length && s[i] !== "\n") i++;
      endSegment();
      continue;
    }

    // Escapes fuera de comillas
    if (escapeChar && ch === escapeChar) {
      if (next === "\n" || (next === "\r" && s[i + 2] === "\n")) {
        i += next === "\r" ? 2 : 1;
        continue;
      }
      if (next !== undefined) {
        cur += next;
        inWord = true;
        i++;
      }
      continue;
    }
    if (mode === "cmd" && ch === "^" && next !== undefined) {
      cur += next;
      inWord = true;
      i++;
      continue;
    }

    // Comillas simples (literal). En PowerShell '' dentro = comilla literal.
    if (ch === "'" && mode !== "cmd") {
      inWord = true;
      let j = i + 1;
      for (; j < s.length; j++) {
        if (s[j] === "'") {
          if (isPS && s[j + 1] === "'") {
            cur += "'";
            j++;
            continue;
          }
          break;
        }
        cur += s[j];
      }
      i = j;
      continue;
    }

    // Comillas dobles (expanden variables/subexpresiones → dinámico si las contienen)
    if (ch === '"') {
      inWord = true;
      let j = i + 1;
      for (; j < s.length; j++) {
        const c = s[j];
        if (c === '"') {
          if (isPS && s[j + 1] === '"') {
            cur += '"';
            j++;
            continue;
          }
          break;
        }
        if (escapeChar && c === escapeChar && j + 1 < s.length) {
          cur += s[j + 1];
          j++;
          continue;
        }
        if (mode !== "cmd" && c === "$" && s[j + 1] === "(") {
          const [inner, end] = readBalanced(j + 1, "(", ")");
          nested.push({ text: inner, mode });
          cur += "$(…)";
          curDyn = true;
          j = end;
          continue;
        }
        if (mode === "bash" && c === "`") {
          const end = s.indexOf("`", j + 1);
          nested.push({ text: s.slice(j + 1, end === -1 ? s.length : end), mode });
          curDyn = true;
          j = end === -1 ? s.length : end;
          continue;
        }
        if ((mode !== "cmd" && c === "$") || (mode === "cmd" && c === "%")) curDyn = true;
        cur += c;
      }
      i = j;
      continue;
    }

    // Sustitución de comandos $( … ) y `…` (bash) fuera de comillas
    if (mode !== "cmd" && ch === "$" && next === "(") {
      const [inner, end] = readBalanced(i + 1, "(", ")");
      nested.push({ text: inner, mode });
      cur += "$(…)";
      curDyn = true;
      inWord = true;
      i = end;
      continue;
    }
    if (mode === "bash" && ch === "`") {
      const end = s.indexOf("`", i + 1);
      nested.push({ text: s.slice(i + 1, end === -1 ? s.length : end), mode });
      curDyn = true;
      inWord = true;
      i = end === -1 ? s.length : end;
      continue;
    }
    // Sustitución de procesos <( … ) / >( … )
    if (mode === "bash" && (ch === "<" || ch === ">") && next === "(") {
      const [inner, end] = readBalanced(i + 1, "(", ")");
      nested.push({ text: inner, mode });
      pushWord();
      i = end;
      continue;
    }

    // Paréntesis / llaves: separadores al inicio de segmento; a mitad de comando son una
    // expresión (PowerShell) cuyo contenido se analiza aparte y cuyo valor es dinámico.
    if (ch === "(" || (isPS && ch === "{")) {
      const close = ch === "(" ? ")" : "}";
      if (words.length === 0 && !inWord) {
        const [inner, end] = readBalanced(i, ch, close);
        endSegment();
        nested.push({ text: inner, mode });
        i = end;
        continue;
      }
      const [inner, end] = readBalanced(i, ch, close);
      nested.push({ text: inner, mode });
      cur += "(…)";
      curDyn = true;
      inWord = true;
      i = end;
      continue;
    }
    if (ch === ")" || (isPS && ch === "}")) {
      endSegment();
      continue;
    }

    // Redirecciones: >, >>, 2>, 2>&1, <, &>
    if ((ch === ">" || ch === "<") && mode !== "cmd" ? true : ch === ">" || ch === "<") {
      if (inWord && /^\d+$/.test(cur)) {
        cur = "";
        inWord = false;
      } else pushWord();
      let j = i + 1;
      while (j < s.length && /[<>&\d-]/.test(s[j])) j++;
      const op = s.slice(i, j);
      i = j - 1;
      if (!/&\d*$/.test(op) && !/&-$/.test(op)) dropNextWord = true;
      continue;
    }

    // Operadores de control
    if (ch === ";" || ch === "\n" || ch === "\r" || ch === "|") {
      endSegment();
      if (ch === "|" && next === "|") i++;
      continue;
    }
    if (ch === "&") {
      if (next === "&") {
        endSegment();
        i++;
        continue;
      }
      if (next === ">") {
        // &> archivo (bash)
        pushWord();
        i++;
        dropNextWord = true;
        continue;
      }
      if (isPS && words.length === 0 && !inWord) continue; // operador de llamada de PowerShell
      endSegment(); // background (bash) / separador (cmd)
      continue;
    }

    if (ch === " " || ch === "\t") {
      pushWord();
      continue;
    }

    // Caracteres de expansión fuera de comillas
    if (mode !== "cmd" && ch === "$") curDyn = true;
    if (mode === "cmd" && ch === "%") curDyn = true;
    if (mode === "bash" && (ch === "*" || ch === "?" || ch === "[" || ch === "{" || ch === "~")) {
      if (!(ch === "~" && !inWord)) curDyn = true;
    }
    cur += ch;
    inWord = true;
  }
  endSegment();

  // En bash, '{' y '}' sueltos agrupan comandos: actúan como separadores.
  const out = [];
  for (const seg of segments) {
    let acc = [];
    for (const w of seg) {
      if (mode === "bash" && (w.v === "{" || w.v === "}") && !w.dyn) {
        if (acc.length) out.push(acc);
        acc = [];
        continue;
      }
      if (mode === "bash" && (w.v === "{" || w.v === "}")) {
        if (acc.length) out.push(acc);
        acc = [];
        continue;
      }
      acc.push(w);
    }
    if (acc.length) out.push(acc);
  }
  return { segments: out, nested };
}

// ---------------------------------------------------------------------------------------------
// Acceso a configuración git (solo lectura)
// ---------------------------------------------------------------------------------------------

let gitCache = new Map();

/** Lee (una vez por directorio y evaluación) la configuración git completa y la rama actual. */
function makeGit(ctx, globalArgs = []) {
  const cacheKey = `${ctx.cwd}\u0000${globalArgs.join("\u0000")}`;
  const run = (args) => {
    if (!ctx.cwd) throw new Blocked("no se pudo determinar el directorio de trabajo para verificar la rama");
    const r = spawnSync("git", [...globalArgs, ...args], {
      cwd: ctx.cwd,
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    if (r.error) throw new Blocked(`no se pudo ejecutar git para verificar la rama (${r.error.message})`);
    return { code: r.status, out: r.stdout || "" };
  };
  const load = () => {
    if (gitCache.has(cacheKey)) return gitCache.get(cacheKey);
    const cfg = run(["config", "--list", "-z"]);
    const entries = [];
    for (const rec of cfg.out.split("\0")) {
      if (!rec) continue;
      const nl = rec.indexOf("\n");
      entries.push(nl === -1 ? [rec.toLowerCase(), "true"] : [rec.slice(0, nl).toLowerCase(), rec.slice(nl + 1)]);
    }
    const head = run(["symbolic-ref", "--short", "-q", "HEAD"]);
    const data = { entries, branch: head.code === 0 && head.out.trim() ? head.out.trim() : null };
    gitCache.set(cacheKey, data);
    return data;
  };
  // Las claves se comparan sin distinguir mayúsculas (más conservador que git).
  const all = (key) => load().entries.filter(([k]) => k === key.toLowerCase()).map(([, v]) => v);
  return {
    config(key) {
      const v = all(key);
      return v.length ? v[v.length - 1] : null;
    },
    configAll(key) {
      return all(key);
    },
    currentBranch() {
      return load().branch;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Reglas: git
// ---------------------------------------------------------------------------------------------

const GIT_BUILTINS = new Set(
  (
    "add am annotate apply archive bisect blame branch bundle cat-file check-attr check-ignore " +
    "check-mailmap check-ref-format checkout checkout-index cherry cherry-pick citool clean clone " +
    "column commit commit-graph commit-tree config count-objects credential describe diff diff-files " +
    "diff-index diff-tree difftool fast-export fast-import fetch fetch-pack filter-branch for-each-ref " +
    "for-each-repo format-patch fsck gc get-tar-commit-id grep gui hash-object help hook index-pack init " +
    "instaweb interpret-trailers log ls-files ls-remote ls-tree mailinfo mailsplit maintenance merge " +
    "merge-base merge-file merge-index merge-tree mergetool mktag mktree multi-pack-index mv name-rev " +
    "notes pack-objects pack-redundant pack-refs patch-id prune prune-packed pull push range-diff " +
    "read-tree rebase reflog remote repack replace request-pull rerere reset restore rev-list rev-parse " +
    "revert rm send-email send-pack shortlog show show-branch show-index show-ref sparse-checkout stage " +
    "stash status stripspace submodule switch symbolic-ref tag unpack-file unpack-objects update-index " +
    "update-ref update-server-info var verify-commit verify-pack verify-tag version whatchanged worktree " +
    "write-tree lfs credential-manager"
  ).split(/\s+/)
);

const GIT_GLOBAL_WITH_ARG = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--config-env", "--exec-path", "--list-cmds", "--attr-source"]);

function analyzeGit(words, ctx, depth) {
  // words[0] es "git"
  let i = 1;
  const queryArgs = [];
  let gctx = { ...ctx };
  while (i < words.length && words[i].v.startsWith("-")) {
    const w = words[i];
    const [flag, eqVal] = w.v.includes("=") ? [w.v.slice(0, w.v.indexOf("=")), w.v.slice(w.v.indexOf("=") + 1)] : [w.v, null];
    if (GIT_GLOBAL_WITH_ARG.has(flag) || (flag.startsWith("-C") && flag.length > 2) || (flag.startsWith("-c") && flag.length > 2)) {
      let val = eqVal;
      if (flag.length > 2 && (flag.startsWith("-C") || flag.startsWith("-c")) && !flag.startsWith("--")) val = flag.slice(2);
      else if (val === null) {
        i++;
        val = words[i]?.v ?? "";
        if (words[i]?.dyn) throw new Blocked("opción global de git con valor dinámico no verificable");
      }
      if (w.dyn) throw new Blocked("opción global de git con valor dinámico no verificable");
      const f = flag.startsWith("--") ? flag : flag.slice(0, 2);
      if (f === "-C") {
        gctx.cwd = gctx.cwd ? path.resolve(gctx.cwd, toNativePath(val)) : null;
      } else if (f === "-c" || f === "--config-env") {
        const key = val.split("=")[0].toLowerCase();
        if (/^(push|remote|branch|alias|url|include|includeif)\./.test(key) || key.startsWith("core.hookspath")) {
          throw new Blocked(`git -c ${key} puede cambiar el destino del push y no es verificable`);
        }
      } else if (f === "--git-dir" || f === "--work-tree") {
        queryArgs.push(`${f}=${path.resolve(gctx.cwd || ".", toNativePath(val))}`);
      }
    }
    i++;
  }
  const subW = words[i];
  if (!subW) return;
  if (subW.dyn) throw new Blocked("subcomando de git dinámico no verificable");
  const sub = subW.v.toLowerCase();
  const rest = words.slice(i + 1);
  const git = makeGit(gctx, queryArgs);

  if (!GIT_BUILTINS.has(sub)) {
    // ¿alias de git?
    const alias = git.config(`alias.${subW.v}`);
    if (alias) {
      const restText = rest.map((w) => quoteForShell(w.v)).join(" ");
      if (alias.startsWith("!")) {
        analyzeText(`${alias.slice(1)} ${restText}`, "bash", gctx, depth + 1);
      } else {
        analyzeText(`git ${alias} ${restText}`, "bash", gctx, depth + 1);
      }
    }
    return;
  }

  switch (sub) {
    case "push":
      return analyzeGitPush(rest, gctx, git);
    case "send-pack":
      throw new Blocked("git send-pack escribe referencias remotas directamente");
    case "commit":
    case "merge":
    case "cherry-pick":
    case "revert":
    case "am":
    case "rebase": {
      if (rest.some((w) => ["--abort", "--quit", "--skip", "--show-current-patch", "-h", "--help"].includes(w.v))) return;
      const cur = git.currentBranch();
      if (isProtectedName(cur)) {
        throw new Blocked(`git ${sub} sobre la rama protegida '${cur}': trabaja en una rama feature/fix/docs/...`);
      }
      return;
    }
    case "branch":
      return analyzeGitBranch(rest, git);
    case "update-ref":
    case "symbolic-ref": {
      if (sub === "symbolic-ref" && rest.filter((w) => !w.v.startsWith("-")).length < 2) return;
      if (rest.some((w) => w.dyn) || rest.some((w) => textMentionsProtected(w.v))) {
        throw new Blocked(`git ${sub} modificando la referencia protegida`);
      }
      return;
    }
    case "checkout":
    case "switch": {
      for (let k = 0; k < rest.length; k++) {
        const v = rest[k].v;
        if (["-B", "-C", "--force-create"].includes(v) || /^-[a-zA-Z]*[BC]$/.test(v)) {
          const target = rest[k + 1];
          if (target && (target.dyn || isProtectedName(target.v))) {
            throw new Blocked(`git ${sub} ${v} reinicia la rama protegida '${target.v}'`);
          }
        }
      }
      return;
    }
    default:
      return;
  }
}

function quoteForShell(v) {
  return /^[A-Za-z0-9_./:@+=,-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`;
}

function analyzeGitBranch(rest, git) {
  const flags = rest.filter((w) => w.v.startsWith("-")).map((w) => w.v);
  const pos = rest.filter((w) => !w.v.startsWith("-"));
  const destructive = flags.some((f) =>
    ["-d", "-D", "--delete", "-m", "-M", "--move", "-f", "--force", "-c", "-C", "--copy"].includes(f) ||
    /^-[a-zA-Z]*[dDmMfcC][a-zA-Z]*$/.test(f)
  );
  if (!destructive) return;
  if (pos.some((w) => w.dyn)) throw new Blocked("git branch con argumentos dinámicos no verificable");
  if (pos.some((w) => isProtectedName(w.v))) {
    throw new Blocked("git branch eliminando, renombrando o moviendo la rama protegida");
  }
  const isMove = flags.some((f) => ["-m", "-M", "--move"].includes(f) || /^-[a-zA-Z]*[mM]/.test(f));
  if (isMove && pos.length === 1 && isProtectedName(git.currentBranch())) {
    throw new Blocked("git branch -m renombrando la rama protegida actual");
  }
}

const PUSH_OPTS_WITH_ARG = new Set(["--repo", "-o", "--push-option", "--receive-pack", "--exec"]);

function analyzeGitPush(rest, ctx, git) {
  const positional = [];
  let endOpts = false;
  let deleteMode = false;
  for (let k = 0; k < rest.length; k++) {
    const w = rest[k];
    if (!endOpts && w.v === "--") {
      endOpts = true;
      continue;
    }
    if (!endOpts && w.v.startsWith("-") && w.v !== "-") {
      if (w.dyn && !w.v.includes("=")) throw new Blocked("opción de git push dinámica no verificable");
      const flag = w.v.split("=")[0];
      if (["--all", "--branches", "--mirror"].includes(flag)) {
        throw new Blocked(`git push ${flag} incluiría la rama protegida`);
      }
      if (flag === "--delete" || (/^-[a-zA-Z]+$/.test(flag) && flag.includes("d"))) deleteMode = true;
      if (PUSH_OPTS_WITH_ARG.has(flag) && !w.v.includes("=")) k++;
      continue;
    }
    positional.push(w);
  }
  if (positional.some((w) => w.dyn)) {
    throw new Blocked("git push con remoto o refspec dinámico (variables, sustituciones, comodines) no verificable");
  }

  const remoteArg = positional[0]?.v ?? null;
  const refspecs = positional.slice(1).map((w) => w.v);
  const cur = git.currentBranch();
  const pushDefault = (git.config("push.default") || "simple").toLowerCase();

  // Remoto efectivo (solo para leer su configuración; NO se confía en su nombre)
  const remoteName =
    remoteArg ||
    (cur && (git.config(`branch.${cur}.pushRemote`) || git.config("remote.pushDefault") || git.config(`branch.${cur}.remote`))) ||
    "origin";
  const isConfiguredRemote = !/[/:\\]/.test(remoteName);
  const remotePushSpecs = isConfiguredRemote ? git.configAll(`remote.${remoteName}.push`) : [];

  const checkDst = (dst, label) => {
    if (isProtectedName(dst)) throw new Blocked(`git push hacia la rama protegida '${normalizeBranch(dst)}' (${label})`);
  };
  const checkSpec = (spec, label) => {
    let r = spec.trim();
    if (r.startsWith("^")) return; // refspec negativo
    if (r.startsWith("+")) r = r.slice(1);
    if (r.includes("*")) throw new Blocked(`refspec con comodín '${spec}' podría alcanzar la rama protegida`);
    let src;
    let dst;
    if (r.includes(":")) {
      [src, dst] = [r.slice(0, r.indexOf(":")), r.slice(r.indexOf(":") + 1)];
      if (dst === "") dst = src;
    } else {
      src = r;
      dst = r;
      if (src === "HEAD" || src === "@") {
        if (!cur) throw new Blocked("git push HEAD con HEAD separado no es verificable");
        dst = cur;
      }
    }
    if (src === "HEAD" || src === "@") src = cur || src;
    checkDst(dst, label);
    if (deleteMode) checkDst(src, label);
    // Sin destino explícito: la configuración puede redirigir el destino.
    if (!r.includes(":") && src) {
      for (const rs of remotePushSpecs) {
        const m = rs.replace(/^\+/, "");
        if (m.includes("*") || isProtectedName(m.split(":")[1] ?? m)) {
          throw new Blocked(`remote.${remoteName}.push='${rs}' podría redirigir el push a la rama protegida`);
        }
      }
      if (["upstream", "tracking"].includes(pushDefault)) {
        const merge = git.config(`branch.${normalizeBranch(src)}.merge`);
        if (isProtectedName(merge)) throw new Blocked(`'${src}' tiene como upstream la rama protegida (push.default=${pushDefault})`);
      }
    }
  };

  if (refspecs.length === 0) {
    if (isConfiguredRemote && /^true$/i.test(git.config(`remote.${remoteName}.mirror`) || "")) {
      throw new Blocked(`el remoto '${remoteName}' está configurado como mirror`);
    }
    if (remotePushSpecs.length) {
      for (const rs of remotePushSpecs) checkSpec(rs, `remote.${remoteName}.push`);
      return;
    }
    if (pushDefault === "nothing") return;
    if (pushDefault === "matching") {
      throw new Blocked("push.default=matching empujaría todas las ramas coincidentes, incluida la protegida");
    }
    if (!cur) throw new Blocked("git push sin refspec con HEAD separado no es verificable");
    if (isProtectedName(cur)) throw new Blocked(`git push desde la rama protegida '${cur}'`);
    const merge = git.config(`branch.${cur}.merge`);
    if (pushDefault !== "current" && isProtectedName(merge)) {
      throw new Blocked(`la rama '${cur}' tiene como upstream la rama protegida (${merge}); usa 'git push -u origin ${cur}'`);
    }
    return;
  }
  for (const spec of refspecs) checkSpec(spec, `refspec '${spec}'`);
}

// ---------------------------------------------------------------------------------------------
// Reglas: gh (GitHub CLI)
// ---------------------------------------------------------------------------------------------

const GH_GROUPS = new Set(
  (
    "agent-task alias api attestation auth browse cache co codespace completion config copilot extension ext gist " +
    "gpg-key help issue label org pr preview project release repo ruleset run search secret ssh-key status " +
    "variable workflow accessibility version"
  ).split(/\s+/)
);
const GH_GLOBAL_WITH_ARG = new Set(["-R", "--repo", "--hostname"]);

const GRAPHQL_FORBIDDEN =
  /\b(mergePullRequest|enablePullRequestAutoMerge|enqueuePullRequest|mergeBranch|createBranchProtectionRule|updateBranchProtectionRule|deleteBranchProtectionRule|createRepositoryRuleset|updateRepositoryRuleset|deleteRepositoryRuleset|updateRef|updateRefs|deleteRef|updateRepository|createCommitOnBranch)\b/i;

let ghAliasCache = null;
function ghAliases(ctx) {
  if (ghAliasCache) return ghAliasCache;
  ghAliasCache = new Map();
  try {
    const r = spawnSync("gh", ["alias", "list"], { cwd: ctx.cwd || undefined, encoding: "utf8", timeout: 5000, windowsHide: true });
    for (const line of (r.stdout || "").split(/\r?\n/)) {
      const m = /^([^:\s]+):\s*(.+)$/.exec(line.trim());
      if (m) ghAliasCache.set(m[1], m[2].trim().replace(/^'(.*)'$/, "$1"));
    }
  } catch {
    /* sin aliases */
  }
  return ghAliasCache;
}

function analyzeGh(words, ctx, depth) {
  const args = [];
  for (let k = 1; k < words.length; k++) {
    const w = words[k];
    if (GH_GLOBAL_WITH_ARG.has(w.v)) {
      k++;
      continue;
    }
    if (/^(-R|--repo=|--hostname=)/.test(w.v) && w.v !== "-R") continue;
    args.push(w);
  }
  const nonFlags = args.filter((w) => !w.v.startsWith("-"));
  const groupW = nonFlags[0];
  if (!groupW) return;
  if (groupW.dyn) throw new Blocked("subcomando de gh dinámico no verificable");
  const group = groupW.v.toLowerCase();
  const sub = nonFlags[1]?.v?.toLowerCase();

  if (!GH_GROUPS.has(group)) {
    const exp = ghAliases(ctx).get(groupW.v);
    if (exp) {
      const restText = args.slice(args.indexOf(groupW) + 1).map((w) => quoteForShell(w.v)).join(" ");
      if (exp.startsWith("!")) analyzeText(`${exp.slice(1)} ${restText}`, "bash", ctx, depth + 1);
      else analyzeText(`gh ${exp} ${restText}`, "bash", ctx, depth + 1);
    }
    return;
  }

  if (group === "pr") {
    if (nonFlags[1]?.dyn) throw new Blocked("subcomando de gh pr dinámico no verificable");
    if (sub === "merge") throw new Blocked("gh pr merge: el merge de Pull Requests es exclusivo del propietario");
    if (sub === "review" && args.some((w) => w.v === "--approve" || w.v === "-a" || /^-[a-z]*a[a-z]*$/.test(w.v))) {
      throw new Blocked("gh pr review --approve: Claude no puede aprobar Pull Requests");
    }
    return;
  }
  if (group === "repo" && ["edit", "delete", "rename", "archive", "unarchive"].includes(sub)) {
    throw new Blocked(`gh repo ${sub}: los ajustes del repositorio son exclusivos del propietario`);
  }
  if (group === "ruleset" && sub && !["list", "ls", "view", "check"].includes(sub)) {
    throw new Blocked(`gh ruleset ${sub}: las reglas de protección son exclusivas del propietario`);
  }
  if (group === "alias" && ["set", "import"].includes(sub)) {
    throw new Blocked("gh alias set/import: crear atajos podría eludir esta guardia");
  }
  if (group === "api") return analyzeGhApi(args.slice(args.indexOf(groupW) + 1), ctx);
}

const GH_API_WITH_ARG = new Set(["-X", "--method", "-f", "--raw-field", "-F", "--field", "-H", "--header", "--input", "-q", "--jq", "-t", "--template", "--cache", "-p", "--preview", "--hostname"]);

function analyzeGhApi(args, ctx) {
  let method = null;
  let endpoint = null;
  const params = [];
  let inputFile = null;
  for (let k = 0; k < args.length; k++) {
    const w = args[k];
    const v = w.v;
    let flag = v;
    let val = null;
    if (v.startsWith("--") && v.includes("=")) [flag, val] = [v.slice(0, v.indexOf("=")), v.slice(v.indexOf("=") + 1)];
    else if (/^-[XfFHpqt]./.test(v)) [flag, val] = [v.slice(0, 2), v.slice(2)];
    if (GH_API_WITH_ARG.has(flag)) {
      let valW = w;
      if (val === null) {
        k++;
        valW = args[k] || { v: "", dyn: false };
        val = valW.v;
      }
      if (flag === "-X" || flag === "--method") {
        if (valW.dyn) throw new Blocked("gh api con método dinámico no verificable");
        method = val.toUpperCase();
      } else if (["-f", "--raw-field", "-F", "--field"].includes(flag)) {
        params.push({ raw: val, dyn: valW.dyn, typed: flag === "-F" || flag === "--field" });
      } else if (flag === "--input") {
        inputFile = { v: val, dyn: valW.dyn };
      }
      continue;
    }
    if (v.startsWith("-")) continue;
    if (endpoint === null) {
      if (w.dyn) throw new Blocked("gh api con endpoint dinámico no verificable");
      endpoint = v;
    }
  }
  if (!endpoint) return;
  const effMethod = method || (params.length || inputFile ? "POST" : "GET");

  // Contenido de parámetros (incluye @archivo e --input)
  let payload = "";
  for (const p of params) {
    const eq = p.raw.indexOf("=");
    const value = eq >= 0 ? p.raw.slice(eq + 1) : p.raw;
    if (p.typed && value.startsWith("@")) {
      if (value === "@-") throw new Blocked("gh api leyendo parámetros de stdin no es verificable");
      const content = readSmallFile(value.slice(1), ctx.cwd);
      if (content === null) throw new Blocked(`gh api con archivo de parámetros ilegible '${value}'`);
      payload += `\n${p.raw.slice(0, eq)}=${content}`;
    } else payload += `\n${p.raw}`;
    if (p.dyn) payload += "\n$DYN";
  }
  if (inputFile) {
    if (inputFile.dyn || inputFile.v === "-") throw new Blocked("gh api --input desde stdin o ruta dinámica no es verificable");
    const content = readSmallFile(inputFile.v, ctx.cwd);
    if (content === null) throw new Blocked(`gh api --input con archivo ilegible '${inputFile.v}'`);
    payload += `\n${content}`;
  }

  let ep = endpoint;
  try {
    ep = decodeURIComponent(ep);
  } catch {
    /* mantener */
  }
  ep = ep.replace(/^https?:\/\/[^/]+\/(api\/v3\/)?/i, "").replace(/^\/+/, "").split("?")[0].toLowerCase();

  if (ep === "graphql") {
    if (payload.includes("$DYN")) throw new Blocked("consulta GraphQL dinámica no verificable");
    if (GRAPHQL_FORBIDDEN.test(payload)) throw new Blocked("gh api graphql con una mutación de merge, refs, protección o ajustes del repositorio");
    if (/\b(addPullRequestReview|submitPullRequestReview)\b/i.test(payload) && /APPROVE/i.test(payload)) {
      throw new Blocked("gh api graphql aprobando un Pull Request");
    }
    if (/\bcreateRef\b/i.test(payload) && textMentionsProtected(payload)) throw new Blocked("gh api graphql creando la referencia protegida");
    return;
  }
  if (effMethod === "GET" || effMethod === "HEAD") return;
  if (payload.includes("$DYN")) throw new Blocked("gh api de escritura con parámetros dinámicos no verificable");

  const rules = [
    [/\/pulls\/[^/]+\/merge$/, "merge de un Pull Request"],
    [/^repos\/[^/]+\/[^/]+\/merges$/, "merge de ramas vía API"],
    [/\/merge-upstream$/, "merge-upstream"],
    [/\/branches\/[^/]+\/protection(\/|$)/, "cambio de protección de ramas"],
    [/\/rulesets(\/|$)/, "cambio de rulesets"],
    [/\/branches\/[^/]+\/rename$/, "renombrado de ramas"],
    [/^repos\/[^/]+\/[^/]+$/, "cambio de ajustes/eliminación del repositorio"],
    [/\/automated-security-fixes$|\/vulnerability-alerts$|\/private-vulnerability-reporting$/, "cambio de controles de seguridad"],
  ];
  for (const [re, label] of rules) if (re.test(ep)) throw new Blocked(`gh api ${effMethod} ${endpoint}: ${label}`);

  if (/\/pulls\/[^/]+\/reviews/.test(ep) && /approve/i.test(payload)) {
    throw new Blocked("gh api aprobando un Pull Request");
  }
  if (/\/git\/refs(\/|$)/.test(ep) && (textMentionsProtected(ep) || textMentionsProtected(payload))) {
    throw new Blocked(`gh api ${effMethod} ${endpoint}: modificación de la referencia protegida`);
  }
  if (/\/contents\//.test(ep)) {
    const m = /(?:^|\n)branch=([^\n]*)/.exec(payload) || /"branch"\s*:\s*"([^"]*)"/.exec(payload);
    if (!m || isProtectedName(m[1])) {
      throw new Blocked(`gh api ${effMethod} ${endpoint}: commit vía API sobre la rama predeterminada/protegida`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Recorrido de comandos
// ---------------------------------------------------------------------------------------------

const PREFIX_COMMANDS = new Set(["env", "sudo", "command", "builtin", "exec", "nohup", "time", "nice", "noglob", "winpty", "stdbuf", "timeout", "doas"]);
const SHELLS_BASH = new Set(["bash", "sh", "zsh", "dash", "ksh", "git-bash"]);
const SHELLS_PS = new Set(["powershell", "pwsh"]);

function analyzeSegment(words, ctx, depth, mode) {
  // Quitar asignaciones de entorno iniciales (bash) y prefijos neutros
  let k = 0;
  while (k < words.length) {
    const v = words[k].v;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(v) && mode !== "powershell") {
      k++;
      continue;
    }
    const base = baseCommandName(v);
    if (PREFIX_COMMANDS.has(base)) {
      k++;
      while (k < words.length && (words[k].v.startsWith("-") || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[k].v) || /^\d+[smhd]?$/.test(words[k].v))) k++;
      continue;
    }
    break;
  }
  const w = words.slice(k);
  if (!w.length) return;
  const cmd = baseCommandName(w[0].v);
  const argText = (from) => w.slice(from).map((x) => x.v).join(" ");

  // Cambio de directorio dentro del comando compuesto
  if (["cd", "set-location", "sl", "chdir", "pushd", "push-location"].includes(cmd)) {
    const target = w.slice(1).find((x) => !x.v.startsWith("-"));
    if (!target) return;
    if (target.dyn) ctx.cwd = null;
    else if (target.v !== "-" && !target.v.startsWith("~")) ctx.cwd = ctx.cwd ? path.resolve(ctx.cwd, toNativePath(target.v)) : null;
    return;
  }

  if (w[0].dyn && w.some((x) => /^(push|merge|api)$/i.test(x.v))) {
    throw new Blocked("comando con nombre dinámico que parece una operación git/gh de escritura");
  }

  if (cmd === "git") analyzeGit(w, ctx, depth);
  else if (cmd === "gh") analyzeGh(w, ctx, depth);
  else if (SHELLS_BASH.has(cmd)) {
    const ci = w.findIndex((x, idx) => idx > 0 && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(x.v));
    if (ci > 0 && w[ci + 1]) analyzeText(w[ci + 1].v, "bash", ctx, depth + 1);
    else {
      const file = w.slice(1).find((x) => !x.v.startsWith("-"));
      if (file) analyzeScriptFile(file, "bash", ctx, depth);
    }
  } else if (SHELLS_PS.has(cmd)) {
    for (let j = 1; j < w.length; j++) {
      const f = w[j].v.toLowerCase();
      if (/^-(c|co|com|comm|comma|comman|command|commandwithargs|cwa)$/.test(f)) {
        analyzeText(argText(j + 1), "powershell", ctx, depth + 1);
        break;
      }
      if (/^-(e|ec|en|enc|enco|encod|encode|encoded|encodedc\w*)$/.test(f) && w[j + 1]) {
        let decoded = "";
        try {
          decoded = Buffer.from(w[j + 1].v, "base64").toString("utf16le");
        } catch {
          throw new Blocked("powershell -EncodedCommand no decodificable");
        }
        analyzeText(decoded, "powershell", ctx, depth + 1);
        break;
      }
      if (/^-(f|fi|fil|file)$/.test(f) && w[j + 1]) {
        analyzeScriptFile(w[j + 1], "powershell", ctx, depth);
        break;
      }
      if (!f.startsWith("-")) {
        analyzeText(argText(j), "powershell", ctx, depth + 1);
        break;
      }
    }
  } else if (cmd === "cmd") {
    const ci = w.findIndex((x) => /^\/[ck]$/i.test(x.v));
    if (ci > 0) analyzeText(argText(ci + 1), "cmd", ctx, depth + 1);
  } else if (["eval", "invoke-expression", "iex"].includes(cmd)) {
    if (w.slice(1).some((x) => x.dyn) && /\b(git|gh)\b/i.test(argText(1))) {
      throw new Blocked(`${cmd} con contenido dinámico que invoca git/gh no es verificable`);
    }
    analyzeText(argText(1), mode === "bash" ? "bash" : "powershell", ctx, depth + 1);
  } else if (["start-process", "saps", "start"].includes(cmd)) {
    const parts = [];
    for (let j = 1; j < w.length; j++) {
      const f = w[j].v.toLowerCase();
      if (["-wait", "-nonewwindow", "-passthru", "-usenewenvironment"].includes(f)) continue;
      if (["-workingdirectory", "-windowstyle", "-redirectstandardoutput", "-redirectstandarderror", "-redirectstandardinput", "-verb", "-credential"].includes(f)) {
        j++;
        continue;
      }
      if (["-filepath", "-argumentlist", "-args"].includes(f)) continue;
      parts.push(w[j].v.replace(/,\s*$/, ""));
    }
    analyzeText(parts.join(" ").replace(/,/g, " "), "powershell", ctx, depth + 1);
  } else if ((cmd === "source" || cmd === ".") && w[1]) {
    analyzeScriptFile(w[1], mode === "powershell" ? "powershell" : "bash", ctx, depth);
  } else if (cmd === "xargs" && w.some((x, idx) => idx > 0 && ["git", "gh"].includes(baseCommandName(x.v)))) {
    throw new Blocked("xargs con git/gh recibe argumentos no verificables");
  }

  // Invocaciones de git/gh en posiciones no iniciales (watch git push, find -exec git push, …)
  for (let j = 1; j < w.length; j++) {
    const b = baseCommandName(w[j].v);
    if ((b === "git" || b === "gh") && !w[j].dyn) {
      const prev = baseCommandName(w[j - 1].v);
      if (["watch", "parallel", "-exec", "-execdir", "-ok", "run", "foreach", "foreach-object", "%"].includes(prev) || PREFIX_COMMANDS.has(prev)) {
        analyzeSegment(w.slice(j), ctx, depth + 1, mode);
      }
    }
  }
}

function analyzeScriptFile(fileWord, mode, ctx, depth) {
  if (fileWord.dyn) return;
  const content = readSmallFile(fileWord.v, ctx.cwd);
  if (content === null) return; // no es un archivo legible: nada que analizar
  analyzeText(content, /\.ps1$/i.test(fileWord.v) ? "powershell" : mode, ctx, depth + 1);
}

function analyzeText(text, mode, ctx, depth) {
  if (depth > MAX_DEPTH) throw new Blocked("anidamiento de comandos demasiado profundo para verificar");
  const { segments, nested } = tokenize(text, mode);
  for (const n of nested) analyzeText(n.text, n.mode, { ...ctx }, depth + 1);
  for (const seg of segments) analyzeSegment(seg, ctx, depth, mode);
}

/**
 * Evalúa un comando. Devuelve { blocked: boolean, reason?: string }.
 * @param {string} command
 * @param {{ cwd?: string, shell?: "bash"|"powershell" }} [opts]
 */
export function evaluate(command, opts = {}) {
  ghAliasCache = null;
  gitCache = new Map();
  const ctx = { cwd: opts.cwd ? toNativePath(opts.cwd) : process.cwd() };
  const mode = opts.shell === "powershell" ? "powershell" : "bash";
  try {
    analyzeText(String(command ?? ""), mode, ctx, 0);
    return { blocked: false };
  } catch (err) {
    if (err instanceof Blocked) return { blocked: true, reason: err.message };
    // Error interno: fallar de forma segura si el comando involucra git/gh
    if (/\b(git|gh)(\.exe)?\b/i.test(String(command))) {
      return { blocked: true, reason: `error interno de la guardia (${err && err.message}); se bloquea por seguridad` };
    }
    return { blocked: false };
  }
}

// ---------------------------------------------------------------------------------------------
// Entrada como hook
// ---------------------------------------------------------------------------------------------

function blockAndExit(reason, command) {
  process.stderr.write(
    [
      `[guard-produccion] OPERACIÓN BLOQUEADA: ${reason}.`,
      command ? `Comando: ${String(command).slice(0, 300)}` : "",
      "La rama 'produccion', el merge de Pull Requests y la protección del repositorio son responsabilidad",
      "exclusiva del propietario. No intentes eludir este bloqueo: informa al propietario (Skill git-workflow,",
      "sección 'Si una operación es bloqueada'). Detalle: .claude/hooks/README.md",
    ]
      .filter(Boolean)
      .join("\n") + "\n"
  );
  process.exit(2);
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    blockAndExit("no se pudo leer la entrada del hook (JSON inválido)");
  }
  const toolName = String(input?.tool_name || "");
  const command = input?.tool_input?.command;
  if (typeof command !== "string") {
    // Herramienta sin comando de shell: nada que verificar
    process.exit(0);
  }
  const shell = /powershell/i.test(toolName) ? "powershell" : "bash";
  const result = evaluate(command, { cwd: input?.cwd, shell });
  if (result.blocked) blockAndExit(result.reason, command);
  process.exit(0);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main().catch((err) => blockAndExit(`error inesperado de la guardia (${err && err.message})`));
}
