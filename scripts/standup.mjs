#!/usr/bin/env node
/**
 * Spawn standup: Infisical folders + github-<app> identity + GitHub env/vars/secrets
 * + Phase 2 GHA role + Phase 5 per-spawn Route 53 zone. Idempotent. Never prints secret values.
 *
 *   npm run standup -- --env dev
 *   npm run standup -- --env prod
 *   npm run standup -- --env dev --bootstrap-only
 *   npm run standup -- --help
 *
 * Laptop `deploy:aws` (ACM wait + apply) runs after bootstrap unless
 * `--bootstrap-only` is set. dns-zone still runs with bootstrap.
 *
 * The template repo is not deployed and must not get an Infisical folder.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  appFlagsPath,
  appSensitivePath,
  appSharedPath,
  infisicalApiBase,
  readAppSlug,
  readWorkspaceId,
} from "./infisical-app.mjs";
import { authLeftoverLines, supabaseProjectRef } from "./supabase-origins.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const STANDUP_ENVS = new Set(["dev", "prod"]);
const INFISICAL_FOLDER_ENVS = ["dev", "prod"];
const GITHUB_ENVS = ["dev", "prod"];
const READ_FOLDER_NAMES = ["shared", "flags"];
const TEMPLATE_REPOS = new Set(["lattice-app-template"]);
const FORBIDDEN_REPOS = new Set(["fosterfolio"]);
const FORBIDDEN_ROLES = new Set(["fosterfolio-gha-arn"]);
const PLACEHOLDER_SLUGS = new Set(["your-app"]);
const PLACEHOLDER_ZONES = new Set(["app.example.com", "your-app.example.com"]);
const RESERVED_APEX_ZONES = new Set(["brendanprobst.com", "fosterfolio.com"]);
const FOSTERFOLIO_PROD_ZONE_ID = "Z086583512U74ZET8C9T8";
const SECRET_KEYS = [
  "INFISICAL_CLIENT_ID",
  "INFISICAL_CLIENT_SECRET",
  "AWS_ROLE_ARN",
];
const VAR_KEYS = ["INFISICAL_PROJECT_SLUG", "INFISICAL_APP_SLUG"];

export const HELP = `Usage:
  npm run standup -- --env <dev|prod> [--bootstrap-only]
  npm run standup -- --help

Idempotent spawn standup. Reads .lattice/infisical.json appSlug,
.infisical.json workspaceId, git remote origin, and aws sts.

Steps:
  1. Create Infisical /<app>/{shared,flags,sensitive} in both Infisical envs
     if missing. Does not overwrite secret values.
  2. Ensure machine identity github-<appSlug> with Universal Auth. ACL read on
     /<app>/shared and /<app>/flags for dev and prod. Never /sensitive.
  3. Create GitHub environments dev and prod (prod asks for a reviewer when
     the API allows it).
  4. Set repository variables INFISICAL_PROJECT_SLUG and INFISICAL_APP_SLUG.
  5. Set repository secrets INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, and
     AWS_ROLE_ARN if missing. Prints "set" or "already present", never values.
  6. Apply infra/terraform/bootstrap (Phase 2 GHA role) and write AWS_ROLE_ARN
     when that secret is missing.
  7. Apply infra/terraform/dns-zone when zone_name is set (import if the zone
     already exists). Print NS for the parent registrar. Path C
     (manage_web_dns_in_route53 = false) skips this. Refuse
     create_route53_hosted_zone in an env stack.
  8. Call deploy:aws for --env (ACM wait, CloudFront alias/cert + CORS, then
     SQL files from .lattice/standup.json). Skip with --bootstrap-only.
  9. Print leftover Auth steps (Google + matching keys). See
     docs/playbooks/google-sso.md.

The template repo is refused. Do not run this against Fosterfolio.

Flags:
  --env <dev|prod>   Required. Selects the laptop deploy env.
                     Infisical folders and GitHub environments are always both.
  --bootstrap-only   Stop after identity, GitHub, the GHA role, and dns-zone.
                     Skip deploy:aws.
  --help, -h         Show this help.
`;

export function parseStandupArgs(argv) {
  const args = argv.slice(2);
  const opts = { env: null, bootstrapOnly: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--bootstrap-only") opts.bootstrapOnly = true;
    else if (a === "--env") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        console.error("--env requires a name (dev or prod).");
        process.exit(1);
      }
      opts.env = value;
      i++;
    } else if (a.startsWith("--env=")) {
      opts.env = a.slice("--env=".length);
    } else if (a.startsWith("-")) {
      console.error(`Unknown flag: ${a}`);
      process.exit(1);
    } else {
      console.error(`Unexpected argument: ${a}`);
      process.exit(1);
    }
  }
  if (opts.help) return opts;
  if (!opts.env) {
    console.error("Missing --env. Use --env dev or --env prod. See --help.");
    process.exit(1);
  }
  if (!STANDUP_ENVS.has(opts.env)) {
    console.error(`Invalid --env ${JSON.stringify(opts.env)}. Use dev or prod.`);
    process.exit(1);
  }
  return opts;
}

export function parseGitRemoteUrl(raw) {
  const trimmed = String(raw || "").trim();
  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const https = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (https) return { owner: https[1], repo: https[2] };
  return null;
}

export function isPhase4DeployReady(repoRoot = root) {
  const file = join(repoRoot, "scripts/deploy-aws.mjs");
  if (!existsSync(file)) return false;
  const src = readFileSync(file, "utf8");
  return /PHASE4_ACM_WAIT/.test(src) || /pollAcmUntilIssued/.test(src);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: opts.stdio ?? "inherit",
    encoding: "utf8",
    shell: false,
    input: opts.input,
    env: process.env,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const detail = redactSecrets(`${r.stderr || ""}\n${r.stdout || ""}`).trim();
    if (opts.stdio !== "inherit" && detail) console.error(detail);
    process.exit(r.status ?? 1);
  }
  return r;
}

function capture(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: process.env,
    input: opts.input,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    if (!opts.allowFail) {
      console.error(redactSecrets(r.stderr || r.stdout || `${cmd} failed`).trim());
      process.exit(r.status ?? 1);
    }
    return { ok: false, stdout: "", stderr: r.stderr || "", status: r.status };
  }
  return { ok: true, stdout: (r.stdout || "").trim(), stderr: r.stderr || "", status: 0 };
}

function redactSecrets(text) {
  if (!text) return "";
  return String(text)
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/("?(?:clientSecret|client_secret|INFISICAL_CLIENT_SECRET|token)"?\s*[:=]\s*")[^"]+"/gi, "$1[redacted]\"")
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]+/g, "[redacted-jwt]");
}

function hclString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readHclString(raw, key) {
  const match = raw.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : null;
}

function readHclBool(raw, key) {
  const match = raw.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)\\b`, "m"));
  if (!match) return null;
  return match[1] === "true";
}

export function normalizeZoneName(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

export function isReservedApexZoneName(zoneName) {
  return RESERVED_APEX_ZONES.has(normalizeZoneName(zoneName));
}

export function isPlaceholderZoneName(zoneName) {
  return PLACEHOLDER_ZONES.has(normalizeZoneName(zoneName));
}

function requireTool(name) {
  const r = spawnSync(name, ["--version"], { encoding: "utf8", shell: false });
  if (r.error || r.status !== 0) {
    console.error(`Missing ${name}. Install it and retry.`);
    process.exit(1);
  }
}

function gitRemote() {
  const r = capture("git", ["remote", "get-url", "origin"]);
  const parsed = parseGitRemoteUrl(r.stdout);
  if (!parsed) {
    console.error(
      "Could not parse git remote origin as GitHub owner/repo. Set origin to an https://github.com/… or git@github.com:… URL.",
    );
    process.exit(1);
  }
  if (parsed.owner.includes("https:") || parsed.repo.includes("https:")) {
    console.error("GitHub owner/repo must not contain a URL.");
    process.exit(1);
  }
  return parsed;
}

function awsCaller() {
  const account = capture("aws", [
    "sts",
    "get-caller-identity",
    "--query",
    "Account",
    "--output",
    "text",
  ]).stdout;
  if (!/^\d{12}$/.test(account)) {
    console.error("aws sts get-caller-identity did not return a 12-digit account id.");
    process.exit(1);
  }
  return { account };
}

function iamRoleExists(roleName) {
  const r = capture("aws", ["iam", "get-role", "--role-name", roleName, "--query", "Role.RoleName", "--output", "text"], {
    allowFail: true,
  });
  return r.ok && r.stdout === roleName;
}

function readProjectNameAndRegion() {
  const tfvars = join(root, "infra/terraform/envs/dev/terraform.tfvars");
  let projectName = null;
  let awsRegion = "us-east-1";
  if (existsSync(tfvars)) {
    const raw = readFileSync(tfvars, "utf8");
    projectName = readHclString(raw, "project_name");
    const region = readHclString(raw, "aws_region");
    if (region) awsRegion = region;
  }
  return { projectName, awsRegion };
}

function ensureInfisicalFolders(workspaceId, appSlug) {
  for (const envName of INFISICAL_FOLDER_ENVS) {
    ensureFolder(envName, workspaceId, appSlug, "/");
    for (const name of ["shared", "flags", "sensitive"]) {
      ensureFolder(envName, workspaceId, name, `/${appSlug}`);
    }
    console.log(`→ Infisical folders /${appSlug}/{shared,flags,sensitive} (${envName}): present`);
  }
}

function ensureFolder(envName, id, name, parentPath) {
  const listed = capture(
    "infisical",
    [
      "secrets",
      "folders",
      "get",
      "--path",
      parentPath,
      "--env",
      envName,
      "--projectId",
      id,
      "--silent",
      "--output",
      "json",
    ],
    { allowFail: true },
  );
  if (listed.ok) {
    try {
      const parsed = JSON.parse(listed.stdout || "[]");
      const folders = Array.isArray(parsed) ? parsed : parsed.folders || [];
      if (folders.some((f) => (f.name || f.folderName) === name)) return;
    } catch {
      /* create below */
    }
  }
  const result = spawnSync(
    "infisical",
    [
      "secrets",
      "folders",
      "create",
      "--name",
      name,
      "--path",
      parentPath,
      "--env",
      envName,
      "--projectId",
      id,
      "--silent",
    ],
    { cwd: root, encoding: "utf8", shell: false },
  );
  if (result.status === 0) return;
  const detail = `${result.stderr || ""}\n${result.stdout || ""}`;
  if (/already exists/i.test(detail)) return;
  console.error(redactSecrets(detail).trim() || `Could not create Infisical folder ${parentPath}/${name}`);
  process.exit(result.status ?? 1);
}

function userAccessToken() {
  const r = capture("infisical", ["user", "get", "token", "--plain", "--silent"]);
  const token = r.stdout.trim();
  if (!token) {
    console.error("infisical user get token was empty. Run `infisical login`.");
    process.exit(1);
  }
  return token;
}

function createInfisicalClient(token) {
  const base = infisicalApiBase(root);
  return async function infisical(method, path, body) {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    const init = { method, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await fetch(`${base}${path}`, init);
    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { status: res.status, ok: res.ok, json, text };
  };
}

function apiMessage(res) {
  const json = res.json;
  if (!json || typeof json !== "object") return `Infisical API HTTP ${res.status}`;
  const parts = [];
  if (typeof json.message === "string") parts.push(json.message);
  if (typeof json.error === "string") parts.push(json.error);
  const details = json.details;
  if (typeof details === "string") parts.push(details);
  else if (Array.isArray(details)) {
    for (const item of details) {
      if (typeof item === "string") parts.push(item);
      else if (item?.message) parts.push(item.message);
    }
  } else if (details && typeof details === "object") {
    const issues = details.issues || details.formErrors;
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (typeof issue === "string") parts.push(issue);
        else if (issue?.message) parts.push(issue.message);
      }
    }
  }
  return parts.filter(Boolean).join(" — ") || `Infisical API HTTP ${res.status}`;
}

function identityFromPayload(item) {
  if (!item) return null;
  if (item.identity?.id && item.identity?.name) {
    return { id: item.identity.id, name: item.identity.name, authMethods: item.identity.authMethods || [] };
  }
  if (item.id && item.name) {
    return { id: item.id, name: item.name, authMethods: item.authMethods || [] };
  }
  return null;
}

function collectIdentities(json) {
  if (!json) return [];
  const bags = [json.identities, json.identityMemberships, json.memberships, json.data];
  const out = [];
  for (const bag of bags) {
    if (!Array.isArray(bag)) continue;
    for (const item of bag) {
      const ident = identityFromPayload(item);
      if (ident) out.push(ident);
    }
  }
  const single = identityFromPayload(json.identity) || identityFromPayload(json);
  if (single) out.push(single);
  return out;
}

async function findIdentity(infisical, { projectId, orgId, name }) {
  const lookups = [
    `/v1/projects/${projectId}/identities`,
    `/v1/workspace/${projectId}/identity-memberships`,
    `/v1/identities?orgId=${encodeURIComponent(orgId)}`,
  ];
  for (const path of lookups) {
    const res = await infisical("GET", path);
    if (!res.ok) continue;
    const match = collectIdentities(res.json).find((i) => i.name === name);
    if (match) return match;
  }
  return null;
}

async function ensureProjectMembership(infisical, { projectId, identityId }) {
  const bodies = [
    { identityId, roles: [{ role: "no-access" }] },
    { identityId, role: "no-access" },
  ];
  const paths = [
    `/v1/projects/${projectId}/memberships/identities`,
    `/v1/workspace/${projectId}/identity-memberships`,
    `/v2/workspace/${projectId}/identity-memberships`,
  ];
  for (const path of paths) {
    for (const body of bodies) {
      const res = await infisical("POST", path, body);
      if (res.ok || res.status === 409 || /already/i.test(apiMessage(res))) return;
    }
  }
}

function privilegeSlug(appSlug) {
  return `github-${appSlug}-shared-flags`.slice(0, 60);
}

function additionalPrivilegesUnavailable(res) {
  return /additional privileges are not available/i.test(apiMessage(res));
}

function collectRoles(json) {
  if (!json) return [];
  if (Array.isArray(json.roles)) return json.roles;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

function customRolesUnavailable(res) {
  return /plan RBAC restriction|custom role/i.test(apiMessage(res));
}

async function ensureProjectReadRole(infisical, { projectId, appSlug }) {
  const slug = privilegeSlug(appSlug);
  const listed = await infisical("GET", `/v1/projects/${projectId}/roles`);
  const exists = collectRoles(listed.json).some((r) => r.slug === slug);
  if (exists) {
    console.log(`→ Infisical project role ${slug}: already present`);
    return { ok: true, slug };
  }
  const created = await infisical("POST", `/v1/projects/${projectId}/roles`, {
    slug,
    name: slug,
    description: "GitHub Deploy app: describeSecret + readValue on /shared and /flags only. Never /sensitive.",
    permissions: readFolderPermissions(appSlug),
  });
  if (created.ok || created.status === 409 || /already/i.test(apiMessage(created))) {
    console.log(`→ Infisical project role ${slug}: created (read /shared and /flags only)`);
    return { ok: true, slug };
  }
  if (customRolesUnavailable(created)) {
    return { ok: false, slug, unavailable: true, message: apiMessage(created) };
  }
  console.error(`Could not create Infisical project role ${slug}: ${apiMessage(created)}`);
  process.exit(1);
}

async function assignIdentityRole(infisical, { projectId, identityId, roleSlug }) {
  const bodies = [
    { roles: [{ role: roleSlug, isTemporary: false }] },
    { roles: [{ role: roleSlug }] },
  ];
  const paths = [
    `/v1/projects/${projectId}/memberships/identities/${identityId}`,
    `/v1/workspace/${projectId}/identity-memberships/${identityId}`,
  ];
  for (const path of paths) {
    for (const body of bodies) {
      const res = await infisical("PATCH", path, body);
      if (res.ok) return true;
    }
  }
  return false;
}

async function membershipRoleSlugs(infisical, { projectId, identityId }) {
  const res = await infisical("GET", `/v1/projects/${projectId}/memberships/identities/${identityId}`);
  const roles = res.json?.identityMembership?.roles || [];
  return roles.map((r) => r.customRoleSlug || r.role).filter(Boolean);
}

async function ensureSecretReadAccess(infisical, { projectId, identityId, appSlug }) {
  const slug = privilegeSlug(appSlug);
  const currentRoles = await membershipRoleSlugs(infisical, { projectId, identityId });
  if (currentRoles.includes(slug)) {
    console.log(`→ Infisical role ${slug}: already assigned (never /sensitive)`);
    return;
  }
  if (currentRoles.includes("viewer")) {
    console.log("→ Infisical role viewer: already assigned (plan cannot scope /shared and /flags)");
    return;
  }
  const listed = await infisical(
    "GET",
    `/v2/identity-project-additional-privilege?identityId=${encodeURIComponent(identityId)}&projectId=${encodeURIComponent(projectId)}`,
  );
  const existing =
    listed.ok && Array.isArray(listed.json?.privileges)
      ? listed.json.privileges.find((p) => p.slug === slug)
      : null;
  if (existing) {
    console.log(`→ Infisical ACL ${slug}: already present (never /sensitive)`);
    return;
  }
  const createdPriv = await infisical("POST", "/v2/identity-project-additional-privilege", {
    identityId,
    projectId,
    slug,
    type: { isTemporary: false },
    permissions: readFolderPermissions(appSlug),
  });
  if (createdPriv.ok || createdPriv.status === 409) {
    console.log(`→ Infisical ACL ${slug}: read /shared and /flags only (never /sensitive)`);
    return;
  }
  if (!additionalPrivilegesUnavailable(createdPriv)) {
    console.error(`Could not grant read ACL on /shared and /flags: ${apiMessage(createdPriv)}`);
    process.exit(1);
  }
  console.log("→ Infisical additional privileges unavailable; using a project role instead");
  const role = await ensureProjectReadRole(infisical, { projectId, appSlug });
  if (role.ok) {
    const assigned = await assignIdentityRole(infisical, {
      projectId,
      identityId,
      roleSlug: role.slug,
    });
    if (!assigned) {
      console.error(`Could not assign Infisical role ${role.slug} to the machine identity.`);
      process.exit(1);
    }
    console.log(`→ Infisical role ${role.slug}: assigned (read /shared and /flags only, never /sensitive)`);
    return;
  }
  // Non-Enterprise: path-scoped roles/privileges are gated. Built-in viewer
  // is what github-fosterfolio and the first smoke-test identity already use.
  const assignedViewer = await assignIdentityRole(infisical, {
    projectId,
    identityId,
    roleSlug: "viewer",
  });
  if (!assignedViewer) {
    console.error("Could not assign Infisical viewer to the machine identity.");
    process.exit(1);
  }
  console.log(
    "→ Infisical plan cannot scope /shared and /flags; assigned built-in viewer (Deploy app still reads only those paths; /sensitive is readable on this plan)",
  );
}

function readFolderPermissions(appSlug) {
  const permissions = [];
  for (const envName of INFISICAL_FOLDER_ENVS) {
    for (const folder of READ_FOLDER_NAMES) {
      const secretPath = `/${appSlug}/${folder}/**`;
      if (secretPath.includes("/sensitive")) {
        throw new Error("Refusing to grant /sensitive");
      }
      permissions.push({
        subject: "secrets",
        action: ["describeSecret", "readValue"],
        conditions: {
          environment: { $eq: envName },
          secretPath: { $glob: secretPath },
        },
      });
    }
  }
  return permissions;
}

async function ensureIdentity(infisical, { projectId, orgId, appSlug, needCredentials }) {
  const name = `github-${appSlug}`;
  let identity = await findIdentity(infisical, { projectId, orgId, name });
  if (!identity) {
    const created = await infisical("POST", `/v1/projects/${projectId}/identities`, {
      name,
      roles: [{ role: "no-access" }],
    });
    if (!created.ok) {
      const orgCreate = await infisical("POST", "/v1/identities", {
        name,
        organizationId: orgId,
        role: "no-access",
      });
      if (!orgCreate.ok) {
        console.error(`Could not create Infisical identity ${name}: ${apiMessage(created)}`);
        process.exit(1);
      }
      identity = identityFromPayload(orgCreate.json) || (await findIdentity(infisical, { projectId, orgId, name }));
      await ensureProjectMembership(infisical, { projectId, identityId: identity.id });
    } else {
      identity = identityFromPayload(created.json);
    }
    console.log(`→ Infisical identity ${name}: created`);
  } else {
    console.log(`→ Infisical identity ${name}: already present`);
    await ensureProjectMembership(infisical, { projectId, identityId: identity.id });
  }
  if (!identity?.id) {
    console.error(`Infisical identity ${name} has no id.`);
    process.exit(1);
  }

  const uaGet = await infisical("GET", `/v1/auth/universal-auth/identities/${identity.id}`);
  let clientId = uaGet.json?.identityUniversalAuth?.clientId || uaGet.json?.clientId;
  if (!uaGet.ok || !clientId) {
    const attached = await infisical("POST", `/v1/auth/universal-auth/identities/${identity.id}`, {});
    if (!attached.ok && attached.status !== 409) {
      console.error(`Could not enable Universal Auth on ${name}: ${apiMessage(attached)}`);
      process.exit(1);
    }
    const again = await infisical("GET", `/v1/auth/universal-auth/identities/${identity.id}`);
    clientId = again.json?.identityUniversalAuth?.clientId || again.json?.clientId;
    console.log(`→ Infisical Universal Auth on ${name}: enabled`);
  } else {
    console.log(`→ Infisical Universal Auth on ${name}: already present`);
  }

  await ensureSecretReadAccess(infisical, { projectId, identityId: identity.id, appSlug });

  let clientSecret = null;
  if (needCredentials) {
    const minted = await infisical("POST", `/v1/auth/universal-auth/identities/${identity.id}/client-secrets`, {
      description: "lattice standup github deploy",
    });
    clientSecret =
      minted.json?.clientSecret?.clientSecret ||
      minted.json?.clientSecret ||
      minted.json?.identityUniversalAuthClientSecret?.clientSecret;
    if (!minted.ok || typeof clientSecret !== "string" || !clientSecret) {
      console.error(`Could not mint Infisical client secret for ${name}: ${apiMessage(minted)}`);
      process.exit(1);
    }
    if (!clientId) {
      clientId = minted.json?.identityUniversalAuth?.clientId || minted.json?.clientSecret?.clientId;
    }
    console.log("→ Infisical client secret: minted (value not printed)");
  }

  if (needCredentials && (!clientId || !clientSecret)) {
    console.error("Infisical Universal Auth client id/secret were not available to write to GitHub.");
    process.exit(1);
  }
  return { identityId: identity.id, name, clientId, clientSecret };
}

function ghJson(args, opts = {}) {
  const r = capture("gh", args, opts);
  if (!r.ok) return { ok: false, data: null, status: r.status };
  if (!r.stdout) return { ok: true, data: null, status: 0 };
  try {
    return { ok: true, data: JSON.parse(r.stdout), status: 0 };
  } catch {
    return { ok: true, data: r.stdout, status: 0 };
  }
}

function listNames(items, key = "name") {
  if (!Array.isArray(items)) return new Set();
  return new Set(items.map((item) => item[key]).filter(Boolean));
}

function ensureGithubEnvironments(owner, repo) {
  const listed = ghJson(["api", `repos/${owner}/${repo}/environments`, "--paginate"]);
  const names = new Set();
  const data = listed.data;
  if (Array.isArray(data?.environments)) {
    for (const env of data.environments) names.add(env.name);
  } else if (Array.isArray(data)) {
    for (const env of data) if (env?.name) names.add(env.name);
  }
  for (const envName of GITHUB_ENVS) {
    if (names.has(envName)) {
      console.log(`→ GitHub environment ${envName}: already present`);
      continue;
    }
    const payload = { wait_timer: 0 };
    const user = envName === "prod" ? ghJson(["api", "user"]) : { ok: false };
    if (envName === "prod" && user.ok && user.data?.id) {
      payload.reviewers = [{ type: "User", id: user.data.id }];
    }
    const created = ghJson([
      "api",
      "--method",
      "PUT",
      `repos/${owner}/${repo}/environments/${envName}`,
      "--input",
      "-",
    ], { input: JSON.stringify(payload), allowFail: true });
    if (!created.ok && envName === "prod" && payload.reviewers) {
      const fallback = ghJson([
        "api",
        "--method",
        "PUT",
        `repos/${owner}/${repo}/environments/${envName}`,
      ], { allowFail: true });
      if (fallback.ok) {
        console.log(`→ GitHub environment ${envName}: created (add a reviewer in the GitHub UI)`);
        continue;
      }
    }
    if (!created.ok) {
      console.error(`Could not create GitHub environment ${envName}.`);
      process.exit(1);
    }
    console.log(
      envName === "prod" && payload.reviewers
        ? `→ GitHub environment ${envName}: created (reviewer requested)`
        : `→ GitHub environment ${envName}: created`,
    );
  }
}

function collectNamedRows(data, bagKey) {
  const rows = [];
  if (!data) return rows;
  if (Array.isArray(data[bagKey])) rows.push(...data[bagKey]);
  else if (Array.isArray(data)) {
    for (const page of data) {
      if (Array.isArray(page?.[bagKey])) rows.push(...page[bagKey]);
      else if (page?.name) rows.push(page);
    }
  }
  return rows;
}

function ensureGithubVars(owner, repo, values) {
  // REST API: older gh (e.g. 2.35) has no `variable list --json`.
  const listed = ghJson(["api", `repos/${owner}/${repo}/actions/variables`, "--paginate"]);
  const current = new Map();
  for (const row of collectNamedRows(listed.data, "variables")) {
    if (row.name) current.set(row.name, row.value);
  }
  for (const key of VAR_KEYS) {
    const next = values[key];
    if (current.get(key) === next) {
      console.log(`→ GitHub variable ${key}: already present`);
      continue;
    }
    run("gh", ["variable", "set", key, "--repo", `${owner}/${repo}`, "--body", next], { stdio: "pipe" });
    console.log(current.has(key) ? `→ GitHub variable ${key}: updated` : `→ GitHub variable ${key}: set`);
  }
}

function githubSecretNames(owner, repo) {
  // REST API: older gh (e.g. 2.35) has no `secret list --json`.
  const listed = ghJson(["api", `repos/${owner}/${repo}/actions/secrets`, "--paginate"]);
  return listNames(collectNamedRows(listed.data, "secrets"));
}

function setGithubSecret(owner, repo, name, value) {
  if (typeof value !== "string" || !value) {
    console.error(`Refusing to set empty GitHub secret ${name}.`);
    process.exit(1);
  }
  const r = spawnSync("gh", ["secret", "set", name, "--repo", `${owner}/${repo}`], {
    cwd: root,
    input: value,
    encoding: "utf8",
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    console.error(redactSecrets(r.stderr || r.stdout || `gh secret set ${name} failed`).trim());
    process.exit(r.status ?? 1);
  }
}

function ensureGithubSecrets(owner, repo, values) {
  const present = githubSecretNames(owner, repo);
  for (const key of SECRET_KEYS) {
    if (present.has(key)) {
      console.log(`→ GitHub secret ${key}: already present`);
      continue;
    }
    const value = values[key];
    if (!value) {
      console.error(`Cannot set ${key}: value is not available.`);
      process.exit(1);
    }
    setGithubSecret(owner, repo, key, value);
    console.log(`→ GitHub secret ${key}: set`);
  }
}

function writeBootstrapTfvars({ appSlug, owner, repo, projectName, account, awsRegion, roleName }) {
  const path = join(root, "infra/terraform/bootstrap/terraform.tfvars");
  const raw = existsSync(path) ? readFileSync(path, "utf8") : "";
  const existingOwner = readHclString(raw, "github_owner");
  const existingRepo = readHclString(raw, "github_repo");
  const existingRole = readHclString(raw, "role_name");
  if (existingOwner && existingOwner !== owner) {
    console.error(`bootstrap terraform.tfvars github_owner is ${existingOwner}, git remote is ${owner}.`);
    process.exit(1);
  }
  if (existingRepo && existingRepo !== repo) {
    console.error(`bootstrap terraform.tfvars github_repo is ${existingRepo}, git remote is ${repo}.`);
    process.exit(1);
  }
  if (existingRole && FORBIDDEN_ROLES.has(existingRole)) {
    console.error(`Refusing to apply bootstrap role ${existingRole}.`);
    process.exit(1);
  }
  const finalRole = existingRole || roleName || null;
  const complete =
    raw &&
    readHclString(raw, "app_slug") === appSlug &&
    existingOwner === owner &&
    existingRepo === repo &&
    readHclString(raw, "project_name") === projectName &&
    readHclString(raw, "aws_account_id") === account &&
    (finalRole ? existingRole === finalRole : true);
  if (complete) {
    console.log("→ infra/terraform/bootstrap/terraform.tfvars: already present");
    return finalRole;
  }
  const lines = [
    "# Written by npm run standup. Do not commit.",
    `app_slug       = ${hclString(appSlug)}`,
    `github_owner   = ${hclString(owner)}`,
    `github_repo    = ${hclString(repo)}`,
    `project_name   = ${hclString(projectName)}`,
    `aws_account_id = ${hclString(account)}`,
    `aws_region     = ${hclString(awsRegion)}`,
  ];
  if (finalRole) lines.push(`role_name      = ${hclString(finalRole)}`);
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
  console.log("→ wrote infra/terraform/bootstrap/terraform.tfvars");
  return finalRole;
}

function applyBootstrapRole({ appSlug, owner, repo, projectName, account, awsRegion }) {
  const bootstrapDir = join(root, "infra/terraform/bootstrap");
  const defaultRole = `${appSlug}-gha`;
  const legacyRole = `${appSlug}-gha-arn`;
  let roleName = null;
  if (iamRoleExists(legacyRole) && !iamRoleExists(defaultRole)) {
    roleName = legacyRole;
    console.log(`→ reusing IAM role ${legacyRole} (will not create ${defaultRole})`);
  }
  const resolvedRole = writeBootstrapTfvars({
    appSlug,
    owner,
    repo,
    projectName,
    account,
    awsRegion,
    roleName,
  });
  if (resolvedRole && FORBIDDEN_ROLES.has(resolvedRole)) {
    console.error(`Refusing to apply bootstrap role ${resolvedRole}.`);
    process.exit(1);
  }

  const chdir = `-chdir=${bootstrapDir}`;
  console.log("→ terraform init (bootstrap)\n");
  run("terraform", [chdir, "init", "-input=false"]);

  const state = capture("terraform", [chdir, "state", "list"], { allowFail: true });
  const hasRole = state.ok && state.stdout.split("\n").includes("module.gha_deploy_role.aws_iam_role.this");
  const importName = resolvedRole || defaultRole;
  if (!hasRole && iamRoleExists(importName)) {
    console.log(`→ terraform import ${importName}`);
    run("terraform", [chdir, "import", "-input=false", "module.gha_deploy_role.aws_iam_role.this", importName]);
  }

  console.log("→ terraform apply (bootstrap)\n");
  run("terraform", [chdir, "apply", "-input=false", "-auto-approve"]);
  const arn = capture("terraform", [chdir, "output", "-raw", "aws_role_arn"]).stdout;
  if (!arn.startsWith("arn:aws:iam::")) {
    console.error("terraform output aws_role_arn was empty or invalid.");
    process.exit(1);
  }
  const sub = capture("terraform", [chdir, "output", "-raw", "oidc_sub"]).stdout;
  console.log(`→ GHA role ARN present (oidc_sub ${sub})`);
  return arn;
}

function readEnvTfvars(env) {
  const path = join(root, `infra/terraform/envs/${env}/terraform.tfvars`);
  if (!existsSync(path)) return { path, raw: "", exists: false };
  return { path, raw: readFileSync(path, "utf8"), exists: true };
}

function refuseEnvHostedZoneCreate(env) {
  const { raw, exists } = readEnvTfvars(env);
  if (!exists) return;
  const create = readHclBool(raw, "create_route53_hosted_zone");
  const allow = readHclBool(raw, "allow_create_route53_hosted_zone_in_env");
  if (create && !allow) {
    console.error(
      `Refusing create_route53_hosted_zone = true in envs/${env} (a second zone). Use infra/terraform/dns-zone and set create_route53_hosted_zone = false plus the same route53_hosted_zone_id on both envs. Path A requires allow_create_route53_hosted_zone_in_env = true.`,
    );
    process.exit(1);
  }
}

function writeDnsZoneTfvars({ appSlug, projectName, zoneName, awsRegion }) {
  const path = join(root, "infra/terraform/dns-zone/terraform.tfvars");
  const raw = existsSync(path) ? readFileSync(path, "utf8") : "";
  const existingZone = normalizeZoneName(readHclString(raw, "zone_name"));
  if (existingZone && existingZone !== zoneName) {
    console.error(
      `dns-zone terraform.tfvars zone_name is ${existingZone}, standup resolved ${zoneName}.`,
    );
    process.exit(1);
  }
  if (raw && isReservedApexZoneName(existingZone) && readHclBool(raw, "allow_reserved_apex") !== true) {
    console.error(`Refusing reserved apex zone_name ${existingZone}.`);
    process.exit(1);
  }
  const complete =
    raw &&
    readHclString(raw, "app_slug") === appSlug &&
    readHclString(raw, "project_name") === projectName &&
    existingZone === zoneName;
  if (complete) {
    console.log("→ infra/terraform/dns-zone/terraform.tfvars: already present");
    return;
  }
  const lines = [
    "# Written by npm run standup. Do not commit.",
    `app_slug     = ${hclString(appSlug)}`,
    `project_name = ${hclString(projectName)}`,
    `zone_name    = ${hclString(zoneName)}`,
    `aws_region   = ${hclString(awsRegion)}`,
  ];
  if (readHclBool(raw, "allow_reserved_apex") === true) {
    lines.push("allow_reserved_apex = true");
  }
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
  console.log("→ wrote infra/terraform/dns-zone/terraform.tfvars");
}

function hostedZoneIdFromAws(zoneName) {
  const dnsName = `${zoneName}.`;
  const listed = capture(
    "aws",
    ["route53", "list-hosted-zones-by-name", "--dns-name", dnsName, "--output", "json"],
    { allowFail: true },
  );
  if (!listed.ok) return null;
  let parsed;
  try {
    parsed = JSON.parse(listed.stdout || "{}");
  } catch {
    return null;
  }
  const matches = (parsed.HostedZones || []).filter((z) => normalizeZoneName(z.Name) === zoneName);
  if (matches.length > 1) {
    console.error(
      `Multiple Route 53 public zones named ${zoneName}. Import the correct id manually — do not create another.`,
    );
    process.exit(1);
  }
  const id = matches[0]?.Id ? String(matches[0].Id).replace(/^\/hostedzone\//, "") : null;
  return id || null;
}

function printParentNsDelegation(zoneName, nameServers, zoneId) {
  const ns = String(nameServers || "")
    .split(/\s+/)
    .map((s) => s.replace(/,$/, "").replace(/^"+|"+$/g, ""))
    .filter((s) => s && s !== "[" && s !== "]");
  console.log(`\nParent registrar: NS-delegate ${zoneName} only (do not change the parent apex nameservers):\n`);
  for (const server of ns) console.log(`  ${server}`);
  console.log("");
  console.log(`  dig +short NS ${zoneName}`);
  console.log("");
  console.log("Set BOTH envs/dev and envs/prod to the same zone (path D):");
  console.log("  manage_web_dns_in_route53  = true");
  console.log("  create_route53_hosted_zone = false");
  console.log(`  route53_hosted_zone_id     = ${hclString(zoneId)}`);
  console.log("");
}

function applyDnsZone({ appSlug, projectName, awsRegion, env }) {
  refuseEnvHostedZoneCreate("dev");
  refuseEnvHostedZoneCreate("prod");

  const dnsTfPath = join(root, "infra/terraform/dns-zone/terraform.tfvars");
  const dnsRaw = existsSync(dnsTfPath) ? readFileSync(dnsTfPath, "utf8") : "";
  let zoneName = normalizeZoneName(readHclString(dnsRaw, "zone_name"));
  if (isPlaceholderZoneName(zoneName)) zoneName = "";

  const envTf = readEnvTfvars(env);
  const manageDns = envTf.exists ? readHclBool(envTf.raw, "manage_web_dns_in_route53") : null;
  const customDomain = envTf.exists ? readHclString(envTf.raw, "web_custom_domain") : null;
  const existingEnvZoneId = envTf.exists ? readHclString(envTf.raw, "route53_hosted_zone_id") : null;

  if (!zoneName) {
    if (manageDns === false) {
      console.log("→ skip dns-zone (path C: manage_web_dns_in_route53 = false)");
      return null;
    }
    if (existingEnvZoneId) {
      console.log(`→ skip dns-zone (envs/${env} already has route53_hosted_zone_id)`);
      return existingEnvZoneId;
    }
    if (customDomain) {
      console.error(
        "web_custom_domain is set and Route 53 DNS is on, but infra/terraform/dns-zone/terraform.tfvars has no zone_name. Copy terraform.tfvars.example and set this app's island (e.g. lattice.brendanprobst.com), not the parent apex. Or set manage_web_dns_in_route53 = false for path C.",
      );
      process.exit(1);
    }
    console.log("→ skip dns-zone (no zone_name and no custom domain)");
    return null;
  }

  if (isReservedApexZoneName(zoneName) && readHclBool(dnsRaw, "allow_reserved_apex") !== true) {
    console.error(
      `Refusing reserved apex zone_name ${zoneName}. Use a child island. Do not apply against fosterfolio.com (${FOSTERFOLIO_PROD_ZONE_ID}).`,
    );
    process.exit(1);
  }

  writeDnsZoneTfvars({ appSlug, projectName, zoneName, awsRegion });

  const existingId = hostedZoneIdFromAws(zoneName);
  if (existingId === FOSTERFOLIO_PROD_ZONE_ID || zoneName === "fosterfolio.com") {
    console.error(
      `Refusing Fosterfolio zone ${FOSTERFOLIO_PROD_ZONE_ID} / fosterfolio.com. Do not apply dns-zone against that name.`,
    );
    process.exit(1);
  }

  const dnsDir = join(root, "infra/terraform/dns-zone");
  const chdir = `-chdir=${dnsDir}`;
  console.log("→ terraform init (dns-zone)\n");
  run("terraform", [chdir, "init", "-input=false"]);

  const state = capture("terraform", [chdir, "state", "list"], { allowFail: true });
  const hasZone = state.ok && state.stdout.split("\n").includes("aws_route53_zone.this");
  if (!hasZone && existingId) {
    console.log(`→ terraform import aws_route53_zone.this ${existingId} (will not create a second zone)`);
    run("terraform", [chdir, "import", "-input=false", "aws_route53_zone.this", existingId]);
  }

  console.log("→ terraform apply (dns-zone)\n");
  run("terraform", [chdir, "apply", "-input=false", "-auto-approve"]);
  const zoneId = capture("terraform", [chdir, "output", "-raw", "route53_hosted_zone_id"]).stdout;
  const nameServers = capture("terraform", [chdir, "output", "-json", "name_servers"]).stdout;
  if (!zoneId || zoneId === FOSTERFOLIO_PROD_ZONE_ID) {
    console.error("terraform output route53_hosted_zone_id was empty or is Fosterfolio's zone.");
    process.exit(1);
  }
  let nsList = nameServers;
  try {
    const parsed = JSON.parse(nameServers);
    if (Array.isArray(parsed)) nsList = parsed.join("\n");
  } catch {
    /* use raw */
  }
  printParentNsDelegation(zoneName, nsList, zoneId);
  return zoneId;
}

function maybeDeployAws(env, bootstrapOnly) {
  if (bootstrapOnly) {
    console.log("→ skip deploy:aws (--bootstrap-only)");
    return;
  }
  if (!isPhase4DeployReady()) {
    console.log("→ skip deploy:aws (Phase 4 ACM wait is not in this tree yet)");
    return;
  }
  console.log(`→ npm run deploy:aws -- --env ${env}\n`);
  run("npm", ["run", "deploy:aws", "--", "--env", env, "--auto-approve"]);
}

async function main() {
  const opts = parseStandupArgs(process.argv);
  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }

  requireTool("infisical");
  requireTool("gh");
  requireTool("aws");
  requireTool("terraform");
  requireTool("git");

  const appSlug = readAppSlug(root);
  if (PLACEHOLDER_SLUGS.has(appSlug)) {
    console.error('Refusing placeholder appSlug "your-app". Set .lattice/infisical.json in a spawn repo.');
    process.exit(1);
  }
  const { owner, repo } = gitRemote();
  if (TEMPLATE_REPOS.has(repo)) {
    console.error("Refusing to stand up the template repo. Run npm run standup from a spawn.");
    process.exit(1);
  }
  if (FORBIDDEN_REPOS.has(repo)) {
    console.error("Refusing to stand up Fosterfolio with this script.");
    process.exit(1);
  }

  const workspaceId = readWorkspaceId(root);
  const { account } = awsCaller();
  const { projectName, awsRegion } = readProjectNameAndRegion();
  const resolvedProject = projectName || repo;
  if (FORBIDDEN_REPOS.has(resolvedProject)) {
    console.error("Refusing Fosterfolio project_name.");
    process.exit(1);
  }

  console.log(`→ standup ${opts.env} for ${owner}/${repo} (app ${appSlug})\n`);

  ensureInfisicalFolders(workspaceId, appSlug);

  const token = userAccessToken();
  const infisical = createInfisicalClient(token);
  const project = await infisical("GET", `/v1/projects/${workspaceId}`);
  if (!project.ok || !project.json?.project?.slug) {
    console.error(`Could not load Infisical project ${workspaceId}: ${apiMessage(project)}`);
    process.exit(1);
  }
  const projectSlug = project.json.project.slug;
  const orgId = project.json.project.orgId;
  console.log(`→ Infisical project slug ${projectSlug}`);

  const secretNames = githubSecretNames(owner, repo);
  const creds = await ensureIdentity(infisical, {
    projectId: workspaceId,
    orgId,
    appSlug,
    needCredentials: !secretNames.has("INFISICAL_CLIENT_SECRET"),
  });

  ensureGithubEnvironments(owner, repo);
  ensureGithubVars(owner, repo, {
    INFISICAL_PROJECT_SLUG: projectSlug,
    INFISICAL_APP_SLUG: appSlug,
  });

  const roleArn = applyBootstrapRole({
    appSlug,
    owner,
    repo,
    projectName: resolvedProject,
    account,
    awsRegion,
  });

  ensureGithubSecrets(owner, repo, {
    INFISICAL_CLIENT_ID: creds.clientId,
    INFISICAL_CLIENT_SECRET: creds.clientSecret,
    AWS_ROLE_ARN: roleArn,
  });

  applyDnsZone({
    appSlug,
    projectName: resolvedProject,
    awsRegion,
    env: opts.env,
  });

  maybeDeployAws(opts.env, opts.bootstrapOnly);

  console.log("GitHub Deploy app is site and Lambda only. Terraform ran on this laptop.");
  printAuthLeftover(opts.env);
}

function printAuthLeftover(env) {
  const envTf = readEnvTfvars(env);
  const customDomain = envTf.exists ? readHclString(envTf.raw, "web_custom_domain") : "";
  const supabaseUrl = envTf.exists ? readHclString(envTf.raw, "supabase_url") : "";
  const siteOrigin = customDomain ? `https://${customDomain.replace(/^https?:\/\//, "")}` : "";
  for (const line of authLeftoverLines({
    env,
    siteOrigin,
    projectRef: supabaseProjectRef(supabaseUrl),
  })) {
    console.log(line);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(redactSecrets(err?.message || String(err)));
    process.exit(1);
  });
}
