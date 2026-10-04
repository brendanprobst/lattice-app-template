/**
 * Path C (registrar DNS): print this certificate's CNAMEs and poll ACM in us-east-1.
 * CloudFront alias/cert attach only after ISSUED — see deploy-aws.mjs.
 */
import { spawnSync } from "node:child_process";

export const PHASE4_ACM_WAIT = true;
export const ACM_REGION = "us-east-1";

const TERMINAL_FAIL = new Set(["FAILED", "VALIDATION_TIMED_OUT", "REVOKED"]);

export function tfOutputOrNull(raw) {
  const value = String(raw ?? "").trim();
  if (!value || value === "null" || value === "None") return null;
  return value;
}

export function printRegistrarCnames({
  domain,
  cloudfrontDomain,
  validationName,
  validationValue,
}) {
  console.log("\nRegistrar DNS (this certificate only — never copy another hostname's _hash):\n");
  console.log("| Purpose         | Name | Type  | Value |");
  console.log("|-----------------|------|-------|-------|");
  console.log(
    `| Site            | ${domain || "(unset)"} | CNAME | ${cloudfrontDomain || "(no CloudFront domain yet)"} |`,
  );
  console.log(
    `| ACM validation  | ${validationName || "(unset)"} | CNAME | ${validationValue || "(unset)"} |`,
  );
  console.log("");
  if (domain) console.log(`  dig +short CNAME ${domain}`);
  if (validationName) console.log(`  dig +short CNAME '${validationName}'`);
  console.log("");
}

export function rerunAfterIssuedMessage() {
  return [
    "ACM is not ISSUED yet. Add the two registrar records above (this cert's _hash only).",
    "re-run after Issued: npm run deploy:aws   (or npm run standup -- --env <env>)",
  ].join("\n");
}

export function describeAcmStatus(certArn, region = ACM_REGION) {
  const r = spawnSync(
    "aws",
    [
      "acm",
      "describe-certificate",
      "--certificate-arn",
      certArn,
      "--region",
      region,
      "--query",
      "Certificate.Status",
      "--output",
      "text",
    ],
    { encoding: "utf8", shell: false },
  );
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const detail = (r.stderr || r.stdout || "aws acm describe-certificate failed").trim();
    throw new Error(detail);
  }
  return (r.stdout || "").trim();
}

export function sleepMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

export function pollIntervalMs() {
  const sec = Number(process.env.ACM_WAIT_INTERVAL_SEC);
  if (Number.isFinite(sec) && sec >= 0) return Math.round(sec * 1000);
  return 30_000;
}

export function pollTimeoutMs() {
  const sec = Number(process.env.ACM_WAIT_TIMEOUT_SEC);
  if (Number.isFinite(sec) && sec >= 0) return Math.round(sec * 1000);
  return 12 * 60 * 1000;
}

/**
 * Poll until ISSUED. Returns the status string.
 * Throws on a terminal ACM failure. Returns the last non-issued status on timeout.
 */
export function pollAcmUntilIssued(certArn, { region = ACM_REGION, intervalMs, timeoutMs } = {}) {
  const interval = intervalMs ?? pollIntervalMs();
  const timeout = timeoutMs ?? pollTimeoutMs();
  const deadline = Date.now() + timeout;
  let status = describeAcmStatus(certArn, region);
  if (status === "ISSUED") return status;
  if (TERMINAL_FAIL.has(status)) {
    throw new Error(`ACM certificate ${status}. Check the validation CNAME for this hostname.`);
  }
  console.log(`→ ACM ${status}. Polling until ISSUED (timeout ${Math.round(timeout / 1000)}s)…`);
  while (Date.now() < deadline) {
    sleepMs(interval);
    status = describeAcmStatus(certArn, region);
    console.log(`→ ACM ${status}`);
    if (status === "ISSUED") return status;
    if (TERMINAL_FAIL.has(status)) {
      throw new Error(`ACM certificate ${status}. Check the validation CNAME for this hostname.`);
    }
  }
  return status;
}
