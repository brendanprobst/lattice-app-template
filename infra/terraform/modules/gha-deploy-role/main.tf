data "aws_caller_identity" "current" {}

# Reuse the account-level GitHub OIDC provider. Do not create a second one.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  web_buckets = [
    "${var.project_name}-dev-web",
    "${var.project_name}-prod-web",
  ]

  lambda_functions = [
    "${var.project_name}-dev-api",
    "${var.project_name}-prod-api",
  ]

  web_bucket_arns = [for name in local.web_buckets : "arn:aws:s3:::${name}"]
  web_object_arns = [for name in local.web_buckets : "arn:aws:s3:::${name}/*"]

  lambda_arns = [
    for name in local.lambda_functions :
    "arn:aws:lambda:${var.aws_region}:${var.aws_account_id}:function:${name}"
  ]
}

resource "aws_iam_role" "this" {
  name        = var.role_name
  description = "GitHub Actions OIDC role for site + Lambda only (no Terraform apply)."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GitHubOidcThisRepoOnly"
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = var.oidc_sub
          }
        }
      },
    ]
  })

  tags = var.tags

  lifecycle {
    precondition {
      condition     = data.aws_caller_identity.current.account_id == var.aws_account_id
      error_message = "aws_account_id does not match the credentials in use. Refusing to manage a GHA role in the wrong account."
    }

    precondition {
      condition     = can(regex("^repo:[^/]+/[^/:]+:\\*$", var.oidc_sub)) && !strcontains(lower(var.oidc_sub), "https://")
      error_message = "OIDC sub must be repo:<owner>/<repo>:* and must not contain https://."
    }
  }
}

resource "aws_iam_role_policy" "deploy" {
  name = "gha-deploy"
  role = aws_iam_role.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "WebBucketsList"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
        ]
        Resource = local.web_bucket_arns
      },
      {
        Sid    = "WebBucketObjects"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = local.web_object_arns
      },
      {
        Sid    = "CloudFrontInvalidate"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetDistribution",
          "cloudfront:GetInvalidation",
        ]
        Resource = "arn:aws:cloudfront::${var.aws_account_id}:distribution/*"
      },
      {
        Sid    = "LambdaUpdateThisApp"
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration",
        ]
        Resource = local.lambda_arns
      },
    ]
  })
}
