# Route 53 and a custom web URL (HTTPS)

This playbook explains how to point a **real hostname** (for example `app.example.com`) at the **CloudFront** distribution that serves the static Next.js export, using **Route 53** for DNS and **ACM** (in `us-east-1`) for TLS. Terraform in `infra/terraform/envs/dev` can manage the hosted zone, certificate validation records, CloudFront alias, and API **CORS** for that origin.

## What Terraform does

When you set a custom web domain in `terraform.tfvars`:

- **ACM** issues a certificate for that hostname in **`us-east-1`** (required for CloudFront).
- **Route 53** holds **DNS validation** records for ACM and an **alias A** record from your hostname to CloudFront.
- **CloudFront** uses that certificate and lists the hostname in **aliases**.
- The **API** Lambda CORS allowlist includes `https://<your-hostname>` as well as the default CloudFront URL.

The **API** URL stays the API Gateway URL unless you add a separate custom domain for API Gateway (not covered here). Set `NEXT_PUBLIC_API_URL` in your web build to that API URL as today.

## Choose how DNS is hosted

### A. New hosted zone in Route 53 (recommended for a clean split)

Use this when the domain is registered somewhere else (GoDaddy, Namecheap, Google Domains, Cloudflare Registrar, etc.) and you want **AWS to be authoritative** for DNS.

1. In `terraform.tfvars`, set:
   - `web_custom_domain` — e.g. `app.example.com`
   - `create_route53_hosted_zone = true`
   - `route53_zone_name` — the **apex** domain for the zone, e.g. `example.com` (must be the zone that contains `web_custom_domain`, or the parent zone you are delegating).

2. **Registrar (manual): DNS delegation**

   After the first Terraform apply that creates the hosted zone, read `terraform output route53_zone_name_servers` (or the AWS console: Route 53 → Hosted zones → your zone → **NS** record).

   At your **domain registrar**, replace the domain’s nameservers with those four Route 53 NS values. This is **not** done in Terraform at the registrar; each registrar has a “DNS / Nameservers” page.

   - **TTL / propagation**: allow minutes to **48 hours** for global resolvers to use the new NS. Until then, ACM **DNS validation** may stay pending because public DNS does not yet see the validation CNAME in your Route 53 zone.

3. **Second apply (if needed)**

   If the first full apply failed or timed out on `aws_acm_certificate_validation` because NS were not delegated yet, run `terraform apply` again after delegation propagates.

### B. Hosted zone already exists in Route 53

If you already have a public hosted zone for `example.com` in the same AWS account:

1. Set:
   - `web_custom_domain` — e.g. `app.example.com`
   - `create_route53_hosted_zone = false`
   - `route53_hosted_zone_id` — the zone ID (e.g. `Z1234567890ABC`)

2. Do **not** set `route53_zone_name` for this path (only used when creating a zone).

3. Apply Terraform. ACM validation and the alias record are created in that zone; no registrar change is required if the zone is already delegated.

### C. DNS stays at a third party (not Route 53)

This stack is optimized for **Route 53–managed** validation and alias records. If you must keep **all** DNS at Cloudflare-only or another provider **without** a Route 53 zone:

- You would add **ACM validation CNAMEs** and a **CNAME** (or alias) to CloudFront at that provider manually, and you would **not** use the Terraform Route 53 resources here without adapting them. For a predictable flow, use **A** or **B** above.

## Two-phase apply when creating a new zone

Because ACM validates using **public** DNS, a **brand-new** hosted zone must be **delegated** at the registrar before validation can succeed end-to-end.

Practical sequence:

1. `terraform apply` with `create_route53_hosted_zone = true` (creates the zone; you may also create the certificate in `PENDING_VALIDATION`).
2. At the registrar, set **nameservers** to `route53_zone_name_servers`.
3. Wait until a public DNS check (e.g. `dig NS example.com`) shows Route 53.
4. `terraform apply` again until `aws_acm_certificate_validation` completes and CloudFront deploys with the custom certificate.

Alternatively, use `terraform apply -target=aws_route53_zone.web` first, delegate NS, then run a full apply (see Terraform docs for `-target` caveats).

## ACM validation stuck for 30+ minutes

Seeing the **hosted zone** in Route 53 does **not** mean ACM can validate yet. Validation uses **public** resolvers. If your **registrar still points to old nameservers**, the ACM validation CNAME exists only inside Route 53 but is **not visible on the public internet**, so the certificate stays `PENDING_VALIDATION` and `terraform apply` can sit on `aws_acm_certificate_validation` for a very long time.

**Check delegation** (replace `example.com` with your apex / `route53_zone_name`):

```bash
dig +short NS example.com
```

The answer must match the four **Route 53** nameservers from `terraform output route53_zone_name_servers` (same as the zone’s **NS** record in the console). If you see your old registrar or parking DNS, update nameservers at the registrar, wait for propagation, then re-run `terraform apply`.

**Check that the validation record is publicly visible** — in ACM (us-east-1) open the certificate → **Domains** → copy the **CNAME name** (often under `_*.example.com`), then:

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
- [`infra/terraform/README.md`](../../infra/terraform/README.md) — Terraform layout and first run
