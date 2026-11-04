import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluate } from "../.claude/hooks/guard-production.mjs";

// Estos tests lanzan procesos git reales (lentos en Windows).
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const HOOK = path.resolve(process.cwd(), ".claude/hooks/guard-production.mjs");

type Shell = "bash" | "powershell";
let sandbox: string; // repo de trabajo (clon)
let bare: string; // "remoto" local
let tmpRoot: string;

function git(cwd: string, ...args: string[]) {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} falló: ${r.stderr}`);
  return r.stdout.trim();
}

function decide(command: string, shell: Shell = "bash", cwd = sandbox) {
  return evaluate(command, { cwd, shell }) as { blocked: boolean; reason?: string };
}

/** Ejecuta el hook real como lo haría Claude Code. */
function runHook(command: string, toolName = "Bash", cwd = sandbox) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: toolName, tool_input: { command }, cwd }),
    encoding: "utf8",
  });
  return { code: r.status, stderr: r.stderr };
}

/** Simula Claude Code: solo ejecuta el comando si el hook lo permite. */
function gatedRun(command: string) {
  const hook = runHook(command);
  if (hook.code !== 0) return { executed: false, hook };
  const r = spawnSync(command, { cwd: sandbox, shell: true, encoding: "utf8" });
  return { executed: true, hook, status: r.status, stderr: r.stderr };
}

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "guard-prod-"));
  bare = path.join(tmpRoot, "remote.git");
  sandbox = path.join(tmpRoot, "work");
  git(tmpRoot, "init", "--bare", "-b", "produccion", bare);
  git(tmpRoot, "init", "-b", "produccion", sandbox);
  fs.writeFileSync(path.join(sandbox, "README.md"), "base\n");
  git(sandbox, "add", "README.md");
  git(sandbox, "commit", "-m", "base");
  git(sandbox, "remote", "add", "origin", bare);
  git(sandbox, "push", "-u", "origin", "produccion");
  git(sandbox, "remote", "add", "otro-nombre", bare);
  // Rama de trabajo correcta
  git(sandbox, "switch", "-c", "feature/ok", "--no-track", "origin/produccion");
  fs.writeFileSync(path.join(sandbox, "a.txt"), "a\n");
  git(sandbox, "add", "a.txt");
  git(sandbox, "commit", "-m", "feat: a");
  // Rama de trabajo mal configurada: su upstream es produccion
  git(sandbox, "branch", "feature/mal-upstream", "feature/ok");
  git(sandbox, "branch", "--set-upstream-to=origin/produccion", "feature/mal-upstream");
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("guard-production: operaciones permitidas", () => {
  it.each([
    "git status",
    "git diff",
    "git log --oneline -5",
    "git fetch origin --prune",
    "git pull",
    "git switch feature/ok",
    "git branch -a",
    'git commit -m "feat: algo"',
    "git push -u origin feature/ok",
    "git push origin feature/a feature/b",
    "git push --force-with-lease origin feature/ok",
    "git push origin HEAD",
    "gh pr create --base produccion --head feature/ok --title t --body-file body.md",
    "gh pr view 1",
    "gh pr checks 1",
    "gh pr list --state all",
    "gh issue view 3",
    "gh api repos/o/r/pulls/1",
    "gh api repos/o/r/branches/produccion/protection",
    'git commit -m "docs: never run git push origin produccion"',
    "npm test && npm run lint",
  ])("permite: %s", (cmd) => {
    expect(decide(cmd).blocked).toBe(false);
  });

  it("permite lecturas y trabajo normal en PowerShell", () => {
    expect(decide("git fetch origin; git status; git log --oneline -3", "powershell").blocked).toBe(false);
    expect(decide("git push -u origin feature/ok 2>&1 | Out-String", "powershell").blocked).toBe(false);
  });
});

describe("guard-production: push a produccion bloqueado", () => {
  it.each([
    "git push origin produccion",
    "git push origin HEAD:produccion",
    "git push origin feature/ok:refs/heads/produccion",
    "git push origin @:produccion",
    "git push otro-nombre HEAD:produccion",
    "git push https://github.com/LuisFer2504/devWebEsencial.git HEAD:produccion",
    "git push git@github.com:LuisFer2504/devWebEsencial.git HEAD:produccion",
    "git push origin PRODUCCION",
    "git push origin prod'uccion'",
    "git push origin prod\\uccion",
    "git -C . push origin produccion",
    "git --no-pager push origin produccion",
    "GIT_TRACE=1 git push origin produccion",
    "/usr/bin/git push origin produccion",
    "git.exe push origin produccion",
    "cd . && git push origin produccion",
    "bash -c 'git push origin produccion'",
    'sh -c "git push origin produccion"',
    "echo $(git push origin produccion)",
    "(git push origin produccion)",
    "true; git push origin produccion",
    "timeout 30 git push origin produccion",
    "eval 'git push origin produccion'",
  ])("bloquea: %s", (cmd) => {
    const r = decide(cmd);
    expect(r.blocked, r.reason).toBe(true);
  });

  it("bloquea refspecs y remotos dinámicos que no se pueden verificar", () => {
    expect(decide("B=produccion; git push origin $B").blocked).toBe(true);
    expect(decide("git push origin HEAD:$(echo produccion)").blocked).toBe(true);
    expect(decide("git push origin 'refs/heads/*:refs/heads/*'").blocked).toBe(true);
  });

  it("bloquea push sin refspec desde produccion o con upstream a produccion", () => {
    git(sandbox, "switch", "produccion");
    expect(decide("git push").blocked).toBe(true);
    expect(decide("git push origin").blocked).toBe(true);
    expect(decide("git push origin HEAD").blocked).toBe(true);
    git(sandbox, "switch", "feature/mal-upstream");
    expect(decide("git push").blocked).toBe(true);
    git(sandbox, "switch", "feature/ok");
    expect(decide("git push").blocked).toBe(false);
  });

  it("bloquea push.default=matching, remote.*.push y mirror redirigidos a produccion", () => {
    git(sandbox, "config", "push.default", "matching");
    expect(decide("git push origin").blocked).toBe(true);
    git(sandbox, "config", "--unset", "push.default");
    git(sandbox, "config", "remote.otro-nombre.push", "HEAD:refs/heads/produccion");
    expect(decide("git push otro-nombre").blocked).toBe(true);
    git(sandbox, "config", "--unset", "remote.otro-nombre.push");
    expect(decide("git -c push.default=matching push origin").blocked).toBe(true);
  });

  it("resuelve aliases de git", () => {
    git(sandbox, "config", "alias.pp", "push origin produccion");
    git(sandbox, "config", "alias.ship", "!git push origin HEAD:produccion");
    expect(decide("git pp").blocked).toBe(true);
    expect(decide("git ship").blocked).toBe(true);
    git(sandbox, "config", "--unset", "alias.pp");
    git(sandbox, "config", "--unset", "alias.ship");
  });

  it("analiza scripts de shell invocados", () => {
    const script = path.join(sandbox, "deploy.sh");
    fs.writeFileSync(script, "#!/bin/sh\necho hola\ngit push origin produccion\n");
    expect(decide("bash deploy.sh").blocked).toBe(true);
    fs.rmSync(script);
  });

  it("bloquea en sintaxis PowerShell", () => {
    expect(decide("git push origin produccion", "powershell").blocked).toBe(true);
    expect(decide(String.raw`& "C:\Program Files\Git\cmd\git.exe" push origin HEAD:produccion`, "powershell").blocked).toBe(true);
    expect(decide(`git push origin ("prod"+"uccion")`, "powershell").blocked).toBe(true);
    expect(decide("$b = 'produccion'; git push origin $b", "powershell").blocked).toBe(true);
    expect(decide(`pwsh -Command "git push origin produccion"`, "powershell").blocked).toBe(true);
    expect(decide("cmd /c git push origin produccion", "powershell").blocked).toBe(true);
    expect(decide(`Invoke-Expression "git push origin produccion"`, "powershell").blocked).toBe(true);
    expect(decide(`Start-Process git -ArgumentList 'push','origin','produccion'`, "powershell").blocked).toBe(true);
    const encoded = Buffer.from("git push origin produccion", "utf16le").toString("base64");
    expect(decide(`powershell -EncodedCommand ${encoded}`, "powershell").blocked).toBe(true);
  });
});

describe("guard-production: force push y borrado de produccion", () => {
  it.each([
    "git push --force origin produccion",
    "git push -f origin produccion",
    "git push origin +produccion",
    "git push origin +HEAD:produccion",
    "git push --force-with-lease origin produccion",
    "git push --force-with-lease=produccion:abc123 origin HEAD:produccion",
    "git push --force-if-includes --force-with-lease origin HEAD:refs/heads/produccion",
    "git push --mirror origin",
    "git push --all origin",
    "git push origin :produccion",
    "git push origin --delete produccion",
    "git push -d origin produccion",
    "git branch -D produccion",
    "git branch -m produccion otra",
    "git branch -f produccion HEAD~1",
    "git update-ref -d refs/heads/produccion",
    "git switch -C produccion",
  ])("bloquea: %s", (cmd) => {
    const r = decide(cmd);
    expect(r.blocked, r.reason).toBe(true);
  });

  it("bloquea commits locales directamente en produccion", () => {
    git(sandbox, "switch", "produccion");
    expect(decide('git commit -m "x"').blocked).toBe(true);
    expect(decide("git merge feature/ok").blocked).toBe(true);
    git(sandbox, "switch", "feature/ok");
    expect(decide('git commit -m "x"').blocked).toBe(false);
  });
});

describe("guard-production: merge, aprobación y protección en GitHub", () => {
  it.each([
    "gh pr merge 1",
    "gh pr merge",
    "gh pr merge 1 --squash --delete-branch",
    "gh -R LuisFer2504/devWebEsencial pr merge 1",
    "gh pr merge 1 --auto",
    "gh pr review 1 --approve",
    "gh api -X PUT repos/LuisFer2504/devWebEsencial/pulls/1/merge",
    "gh api repos/o/r/pulls/1/merge --method PUT",
    "gh api repos/o/r/pulls/1/merge -f merge_method=squash",
    "gh api /repos/o/r/merges -f base=produccion -f head=feature/x",
    "gh api https://api.github.com/repos/o/r/pulls/1/merge -XPUT",
    "gh api -X PUT repos/o/r/branches/produccion/protection --input p.json",
    "gh api -X DELETE repos/o/r/branches/produccion/protection",
    "gh api -X POST repos/o/r/rulesets -f name=x",
    "gh api -X PATCH repos/o/r -f default_branch=otra",
    "gh api -X DELETE repos/o/r/git/refs/heads/produccion",
    "gh api -X PATCH repos/o/r/git/refs/heads/produccion -f sha=abc -F force=true",
    "gh api -X PUT repos/o/r/contents/README.md -f message=x -f content=eA==",
    "gh api repos/o/r/pulls/1/reviews -f event=APPROVE",
    `gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:"x"}) { clientMutationId } }'`,
    `gh api graphql -f query='mutation { enablePullRequestAutoMerge(input:{pullRequestId:"x"}) { clientMutationId } }'`,
    "gh repo edit --default-branch otra",
    "gh repo delete LuisFer2504/devWebEsencial --yes",
    "gh alias set m 'pr merge'",
  ])("bloquea: %s", (cmd) => {
    const r = decide(cmd);
    expect(r.blocked, r.reason).toBe(true);
  });

  it("bloquea gh en PowerShell y envuelto en otras shells", () => {
    expect(decide("gh pr merge 1", "powershell").blocked).toBe(true);
    expect(decide(`pwsh -c "gh pr merge 1"`, "powershell").blocked).toBe(true);
    expect(decide(`bash -lc "gh pr merge 1 --squash"`).blocked).toBe(true);
  });

  it("lee archivos --input para detectar mutaciones GraphQL", () => {
    const f = path.join(sandbox, "q.json");
    fs.writeFileSync(f, JSON.stringify({ query: "mutation { mergePullRequest(input:{pullRequestId:\"x\"}) { clientMutationId } }" }));
    expect(decide("gh api graphql --input q.json").blocked).toBe(true);
    fs.rmSync(f);
  });
});

describe("guard-production: hook real (stdin JSON → código de salida)", () => {
  it("exit 0 para comandos permitidos y exit 2 con motivo para bloqueados", () => {
    expect(runHook("git status").code).toBe(0);
    expect(runHook("gh pr create --base produccion --head feature/ok --title t --body b").code).toBe(0);
    const blocked = runHook("git push origin produccion");
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toMatch(/OPERACIÓN BLOQUEADA/);
    expect(blocked.stderr).toMatch(/produccion/);
    expect(runHook("gh pr merge 1", "PowerShell").code).toBe(2);
  });

  it("falla de forma segura ante entrada inválida", () => {
    const r = spawnSync(process.execPath, [HOOK], { input: "esto no es json", encoding: "utf8" });
    expect(r.status).toBe(2);
  });

  it("ignora herramientas sin comando de shell", () => {
    const r = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: "Read", tool_input: { file_path: "x" } }),
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
  });
});

describe("guard-production: efecto real sobre un remoto local", () => {
  it("un push a rama feature se ejecuta y llega al remoto", () => {
    git(sandbox, "switch", "feature/ok");
    const res = gatedRun("git push -u origin feature/ok");
    expect(res.executed).toBe(true);
    expect(res.status).toBe(0);
    expect(git(bare, "rev-parse", "refs/heads/feature/ok")).toBe(git(sandbox, "rev-parse", "feature/ok"));
  });

  it("los comandos bloqueados no se ejecutan ni modifican produccion", () => {
    const before = git(bare, "rev-parse", "refs/heads/produccion");
    const branchesBefore = git(bare, "for-each-ref", "--format=%(refname)");
    for (const cmd of [
      "git push origin feature/ok:produccion",
      "git push --force origin HEAD:produccion",
      "git push otro-nombre +feature/ok:refs/heads/produccion",
      "git push origin --delete produccion",
      "git push --mirror origin",
    ]) {
      const res = gatedRun(cmd);
      expect(res.executed, cmd).toBe(false);
      expect(res.hook.code, cmd).toBe(2);
    }
    expect(git(bare, "rev-parse", "refs/heads/produccion")).toBe(before);
    expect(git(bare, "for-each-ref", "--format=%(refname)")).toBe(branchesBefore);
  });
});
