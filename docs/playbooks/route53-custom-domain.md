# Route 53 and a custom web URL (HTTPS)

This playbook explains how to point a **real hostname** (for example `dev.app.example.com`) at the **CloudFront** distribution that serves the static Next.js export, using **Route 53** for DNS and **ACM** (in `us-east-1`) for TLS.

The **Lattice default** is **path D**: one public hosted zone **per spawn** in `infra/terraform/dns-zone` (not `envs/dev`, not `envs/prod`, not the GHA bootstrap state). Both env stacks set `create_route53_hosted_zone = false` and the **same** `route53_hosted_zone_id`. Path A (creating a zone inside an env stack) is **not** the recommended default — that is a second zone for the same name.

## What Terraform does

When you set a custom web domain in `terraform.tfvars`:

- **ACM** issues a certificate for that hostname in **`us-east-1`** (required for CloudFront).
- **Route 53** (paths B and D) holds **DNS validation** records for ACM and an **alias A** record from your hostname to CloudFront.
- **CloudFront** uses that certificate and lists the hostname in **aliases** only after ACM is **`ISSUED`**.
- The **API** Lambda CORS allowlist includes `https://<your-hostname>` as well as the default CloudFront URL.

The **API** URL stays the API Gateway URL unless you add a separate custom domain for API Gateway (not covered here). Set `NEXT_PUBLIC_API_URL` in your web build to that API URL as today.

## Choose how DNS is hosted

### D. Per-spawn hosted zone + NS delegation (Lattice default)

Use this when the spawn sits under a parent domain you do **not** want to move into AWS (for example a personal apex at Google Domains). Each spawn gets its **own** island: smoke-test is `lattice.brendanprobst.com`, not `brendanprobst.com`. A later spawn gets `runout.brendanprobst.com`, not a record in the smoke-test zone.

1. In `infra/terraform/dns-zone/terraform.tfvars`, set:
   - `zone_name` — this app’s island FQDN (e.g. `lattice.brendanprobst.com`)
   - `app_slug` / `project_name` for tags

   Do not set `brendanprobst.com` or `fosterfolio.com`. Do not apply this stack against Fosterfolio’s existing `fosterfolio.com` zone (`Z086583512U74ZET8C9T8`). If a zone for `zone_name` already exists, **import** it — AWS allows a second public zone with the same name.

2. Apply with **`npm run standup -- --env <env>`** (or `terraform apply` in `infra/terraform/dns-zone`). The script imports an existing zone of that name, then prints **`name_servers`** and `route53_hosted_zone_id`.

3. **Parent registrar (manual): NS for the child only**

   At the registrar that owns the **parent** (e.g. Google Domains for `brendanprobst.com`), add **NS** records for `zone_name` that match `terraform output name_servers`. Do **not** change nameservers on the parent apex.

   ```bash
   dig +short NS lattice.brendanprobst.com
   ```

   The answer must match the four Route 53 nameservers. TTL can be minutes to 48 hours.

4. In **both** `envs/dev` and `envs/prod` `terraform.tfvars` (twins):

   ```hcl
   manage_web_dns_in_route53  = true
   create_route53_hosted_zone = false
   route53_hosted_zone_id     = "<dns-zone output>"
   ```

   Dev and prod use different `web_custom_domain` values under the same island (`dev.lattice.brendanprobst.com` vs `lattice.brendanprobst.com`). **Never** set `create_route53_hosted_zone = true` in an env stack for this zone.

5. Re-run standup / `deploy:aws` for the env. ACM validation and the site alias land in that zone. The script does **not** print leftover ACM `_hash` CNAMEs when Route 53 manages DNS.

See [`infra/terraform/dns-zone/README.md`](../../infra/terraform/dns-zone/README.md).

### B. Hosted zone already exists in Route 53

If you already have a public hosted zone for this app’s island (or a domain the spawn already owns) in the same AWS account:

1. Set:
   - `web_custom_domain` — e.g. `app.example.com`
   - `create_route53_hosted_zone = false`
   - `route53_hosted_zone_id` — the zone ID (e.g. `Z1234567890ABC`)

2. Do **not** set `route53_zone_name` for this path (only used when creating a zone in the env stack).

3. Apply Terraform. ACM validation and the alias record are created in that zone; no registrar change is required if the zone is already delegated.

Path D produces a zone you then consume here. Both envs must share that id.

### C. DNS stays at a third party (not Route 53)

Use this when the hostname stays at Google Domains, Squarespace, Cloudflare DNS, or another registrar **without** a delegated Route 53 zone. This is still a valid escape hatch.

1. In `terraform.tfvars`, set:
   - `web_custom_domain` — e.g. `app.example.com`
   - `manage_web_dns_in_route53 = false`

   Do not set `create_route53_hosted_zone` or `route53_hosted_zone_id`. `npm run standup` skips `dns-zone` when there is no `zone_name`.

2. Apply with **`npm run deploy:aws`** (or `npm run standup -- --env <env>`). ACM still creates a certificate in **`us-east-1`**. CloudFront does **not** get that hostname or certificate until ACM status is **`ISSUED`**. A pending cert fails CloudFront with `InvalidViewerCertificate`. The script prints **this certificate’s** records (never another hostname’s `_hash`):

```bash
# same values: terraform output
terraform output acm_validation_record_name
terraform output acm_validation_record_value
terraform output web_cloudfront_domain
```

It polls ACM until **ISSUED**, then applies the CloudFront alias/cert and Lambda CORS. If you stop early, re-run after Issued.

3. At the registrar, add **two** records. Use the values Terraform printed for **this** hostname. **Never copy another hostname’s `_hash` CNAME** onto the new name — each ACM certificate has its own token.

| Purpose | Name | Type | Value |
| --- | --- | --- | --- |
| ACM validation | `acm_validation_record_name` | CNAME | `acm_validation_record_value` (ends in `acm-validations.aws.`) |
| Site | `web_custom_domain` | CNAME | `web_cloudfront_domain` |

```bash
dig +short CNAME app.example.com
dig +short CNAME '_paste-acm_validation_record_name'
```

The site `dig` should show the CloudFront domain. The validation `dig` should show a target ending in `acm-validations.aws.` When ACM is Issued, re-run `terraform apply` so CloudFront gets the alias and certificate.

### A. New hosted zone inside `envs/dev` or `envs/prod` (not recommended)

Creating `aws_route53_zone` in an **env** stack is how you get a **second** zone for the same name (the Fosterfolio-dev footgun: registrar NS will not match). Prefer **D**.

The env modules **refuse** `create_route53_hosted_zone = true` unless you also set `allow_create_route53_hosted_zone_in_env = true`.

If you must use this legacy path:

1. In that env’s `terraform.tfvars`, set:
   - `web_custom_domain` — e.g. `app.example.com`
   - `create_route53_hosted_zone = true`
   - `allow_create_route53_hosted_zone_in_env = true`
   - `route53_zone_name` — the apex for the zone

2. After apply, read `terraform output route53_zone_name_servers` and replace the domain’s nameservers at the registrar.

3. Do **not** also apply `infra/terraform/dns-zone` for the same name.

## Two-phase apply when creating a new zone

Because ACM validates using **public** DNS, a **brand-new** hosted zone must be **delegated** at the registrar before validation can succeed end-to-end.

Practical sequence (path D):

1. `npm run standup -- --env <env> --bootstrap-only` (or `terraform apply` in `infra/terraform/dns-zone`) creates or imports the zone.
2. At the parent registrar, set **NS** for `zone_name` to `name_servers`.
3. Wait until a public DNS check (e.g. `dig NS lattice.brendanprobst.com`) shows Route 53.
4. Point both env tfvars at `route53_hosted_zone_id` and run `npm run standup -- --env <env>` until ACM validation completes and CloudFront deploys with the custom certificate.

Alternatively, `terraform apply -target=aws_route53_zone.this` in `dns-zone` first, delegate NS, then run a full env apply (see Terraform docs for `-target` caveats).

## ACM validation stuck for 30+ minutes

Seeing the **hosted zone** in Route 53 does **not** mean ACM can validate yet. Validation uses **public** resolvers. If the **parent registrar still has no NS** for the child (path D) or still points the apex at old nameservers (path A), the ACM validation CNAME exists only inside Route 53 but is **not visible on the public internet**, so the certificate stays `PENDING_VALIDATION` and `terraform apply` can sit on `aws_acm_certificate_validation` for a very long time.

**Check delegation** (replace with your `zone_name`):

```bash
dig +short NS lattice.brendanprobst.com
```

The answer must match the four **Route 53** nameservers from `terraform -chdir=infra/terraform/dns-zone output name_servers` (or `route53_zone_name_servers` on legacy path A). If you see your old registrar or parking DNS, update NS at the registrar, wait for propagation, then re-run `terraform apply`.

**Check that the validation record is publicly visible** — prefer `terraform output acm_validation_record_name` (this certificate only). Never paste another hostname’s `_hash`. Then:

```bash
dig +short CNAME '_paste-the-full-cname-name.example.com.'
```

You should get a target ending in `acm-validations.aws.` once delegation is correct.

It is OK to **interrupt** a long-running apply (Ctrl+C), fix delegation, then **`terraform apply` again** once `dig NS` shows Route 53.

## After apply

- Open `terraform output web_public_base_url` — that is the canonical **HTTPS** URL for the app.
- Rebuild and deploy the static web so `NEXT_PUBLIC_*` and `NEXT_PUBLIC_API_URL` match your environment (see [`docs/deploy-aws.md`](../deploy-aws.md)).
- Invalidate CloudFront if you changed behavior or assets: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`.

## Cost note

Route 53 charges per hosted zone (roughly **$0.50/month** per zone at current AWS pricing) plus queries; see [Route 53 pricing](https://aws.amazon.com/route53/pricing/).

## See also

- [`docs/deploy-aws.md`](../deploy-aws.md) — deploy script and GitHub Actions
- [`docs/playbooks/standup-automation.md`](standup-automation.md) — standup applies `dns-zone` and prints NS
- [`infra/terraform/dns-zone/README.md`](../../infra/terraform/dns-zone/README.md) — import if the zone already exists
- [`infra/terraform/README.md`](../../infra/terraform/README.md) — Terraform layout and first run
