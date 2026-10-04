# DNS zone — one public hosted zone per spawn

Separate Terraform state from `envs/dev`, `envs/prod`, and `bootstrap` (GHA role). This stack creates **one** public Route 53 hosted zone for **this app’s hostname tree**.

`zone_name` is the spawn’s island, not the parent personal apex:

| Spawn | `zone_name` | Hosts |
| --- | --- | --- |
| smoke-test | `lattice.brendanprobst.com` | `lattice.brendanprobst.com`, `dev.lattice.brendanprobst.com` |
| a later app | `runout.brendanprobst.com` | that app only — not records in the smoke-test zone |

Do **not** put `brendanprobst.com` (personal site) in this stack. Do **not** apply this stack against Fosterfolio’s `fosterfolio.com` zone (`Z086583512U74ZET8C9T8`).

Do **not** run `npm run deploy:aws -- --env dns-zone` — this directory is not under `envs/`.

## Env stacks stay twins (path D)

After this stack exists, **both** `envs/dev` and `envs/prod` set:

```hcl
manage_web_dns_in_route53  = true
create_route53_hosted_zone = false
route53_hosted_zone_id     = "<this stack's route53_hosted_zone_id>"
```

`create_route53_hosted_zone = true` in an env stack is a **second zone** for the same name (Fosterfolio-dev footgun). The env modules refuse that unless `allow_create_route53_hosted_zone_in_env = true`. Prefer this stack + path B against its zone id.

Path C (`manage_web_dns_in_route53 = false`) still works when there is no delegated zone.

## First apply (new spawn)

```bash
cd infra/terraform/dns-zone
cp terraform.tfvars.example terraform.tfvars
# set app_slug, project_name, zone_name (this app's island)

terraform init
terraform plan
terraform apply
terraform output -raw route53_hosted_zone_id
terraform output name_servers
```

At the **parent** registrar, add **NS** for `zone_name` only. Do not change nameservers on the parent apex.

```bash
dig +short NS lattice.brendanprobst.com
```

`npm run standup` applies this stack (or no-ops), imports an existing zone of the same name, and prints those NS.

## Import if the zone already exists

AWS allows more than one public hosted zone with the same name. Creating a second one is the bug this stack exists to prevent.

```bash
aws route53 list-hosted-zones-by-name --dns-name lattice.brendanprobst.com.
```

If a zone for that exact name already exists, import it. Do not apply a create.

```bash
cd infra/terraform/dns-zone
# terraform.tfvars zone_name must match the existing zone
terraform init
terraform import aws_route53_zone.this Z1234567890ABC
terraform plan
# Expect no new aws_route53_zone. Do not apply if the plan creates one.
terraform apply
```
