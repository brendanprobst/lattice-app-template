module "supabase_ssm" {
  count  = var.manage_supabase_credentials_in_ssm ? 1 : 0
  source = "../../modules/supabase_ssm"

  tags            = local.default_tags
  ssm_path_prefix = local.ssm_path_prefix

  supabase_url              = var.supabase_url
  supabase_anon_key         = var.supabase_anon_key
  supabase_service_role_key = var.supabase_service_role_key
  supabase_jwt_secret       = var.supabase_jwt_secret
}

locals {
  supabase_parameter_names = var.manage_supabase_credentials_in_ssm ? module.supabase_ssm[0].parameter_names : {
    url              = "${local.ssm_path_prefix}/supabase/url"
    anon_key         = "${local.ssm_path_prefix}/supabase/anon_key"
    service_role_key = "${local.ssm_path_prefix}/supabase/service_role_key"
    jwt_secret       = null
  }

  budget_notification_thresholds = [50, 80, 100]

  # Matches apps/api/app.ts — browser Origin must be listed for credentialed requests.
  api_cors_origins = join(",", compact(concat(
    [
      "https://${aws_cloudfront_distribution.web.domain_name}",
    ],
    local.web_use_custom_domain ? ["https://${trimspace(var.web_custom_domain)}"] : [],
    [
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
    [for o in split(",", var.api_cors_extra_origins) : trimspace(o) if trimspace(o) != ""],
  )))
}

data "aws_caller_identity" "current" {}

data "archive_file" "api_lambda_zip" {
  type        = "zip"
  source_file = var.api_lambda_bundle_path
  output_path = "${path.module}/.generated/api-lambda.zip"
}

resource "aws_iam_role" "api_lambda" {
  name = "${local.name_prefix}-api-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_lambda_basic_execution" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "api_lambda_ssm_read" {
  name = "${local.name_prefix}-api-ssm-read"
  role = aws_iam_role.api_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${trimprefix(local.supabase_parameter_names.url, "/")}",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${trimprefix(local.supabase_parameter_names.service_role_key, "/")}"
        ]
      }
    ]
  })
}

resource "aws_lambda_function" "api" {
  function_name = "${local.name_prefix}-api"
  role          = aws_iam_role.api_lambda.arn
  runtime       = var.api_lambda_runtime
  handler       = "index.handler"
  memory_size   = var.api_lambda_memory_mb
  timeout       = var.api_lambda_timeout_seconds
  filename      = data.archive_file.api_lambda_zip.output_path

  source_code_hash = data.archive_file.api_lambda_zip.output_base64sha256
  # null maps to -1 so the AWS provider uses the unreserved pool / clears reservation (per provider behavior).
  reserved_concurrent_executions = var.api_lambda_reserved_concurrency != null ? var.api_lambda_reserved_concurrency : -1

  environment {
    variables = {
      NODE_ENV                        = "production"
      CORS_ORIGINS                    = local.api_cors_origins
      SUPABASE_URL_PARAM              = local.supabase_parameter_names.url
      SUPABASE_SERVICE_ROLE_KEY_PARAM = local.supabase_parameter_names.service_role_key
      SUPABASE_THINGS_TABLE           = var.things_table_name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.api_lambda_basic_execution
  ]
}

resource "aws_apigatewayv2_api" "api_http" {
  name          = "${local.name_prefix}-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "api_lambda" {
  api_id                 = aws_apigatewayv2_api.api_http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.api_http.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda.id}"
}

resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.api_http.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api_http.id
  name        = "$default"
  auto_deploy = true

  # Avoid empty auto-deploy: stage must apply after routes or first deploy can race with no valid routes.
  depends_on = [
    aws_apigatewayv2_route.root,
    aws_apigatewayv2_route.proxy,
  ]

  default_route_settings {
    throttling_rate_limit  = var.api_gateway_throttling_rate_limit
    throttling_burst_limit = var.api_gateway_throttling_burst_limit
  }
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api_http.execution_arn}/*/*"
}

resource "aws_s3_bucket" "web" {
  bucket        = "${local.name_prefix}-web"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket                  = aws_s3_bucket.web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${local.name_prefix}-web-oac"
  description                       = "Origin access control for ${local.name_prefix} web bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 REST API origins do not map /things → things/index.html (unlike website endpoints).
# Without this, deep links fall through to custom_error_response and serve root index.html (wrong page).
resource "aws_cloudfront_function" "web_static_export_uri_rewrite" {
  name    = "${local.name_prefix}-web-static-export-uri"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite extensionless paths to Next static export (*.html at bucket root)"
  publish = true
  code    = file("${path.module}/../../cloudfront/functions/viewer_request_next_static_export.js")
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "s3-${aws_s3_bucket.web.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-${aws_s3_bucket.web.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontRead"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action = "s3:GetObject"
        Resource = [
          "${aws_s3_bucket.web.arn}/*"
        ]
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.web.arn
          }
        }
      }
    ]
  })
}

resource "aws_budgets_budget" "monthly_cost" {
  count = var.enable_budget_alerts ? 1 : 0

  name         = "${local.name_prefix}-monthly-cost"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_cost_budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["Project$${var.project_name}"]
  }

  dynamic "notification" {
    for_each = length(var.budget_alert_email_addresses) > 0 ? local.budget_notification_thresholds : []
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "FORECASTED"
      subscriber_email_addresses = var.budget_alert_email_addresses
    }
  }
}

resource "aws_iam_role" "scheduler_api_cost_control" {
  count = var.enable_api_schedule_controls ? 1 : 0
  name  = "${local.name_prefix}-scheduler-api-cost-control"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "scheduler_api_cost_control" {
  count = var.enable_api_schedule_controls ? 1 : 0
  name  = "${local.name_prefix}-scheduler-api-cost-control"
  role  = aws_iam_role.scheduler_api_cost_control[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:PutFunctionConcurrency",
          "lambda:DeleteFunctionConcurrency"
        ]
        Resource = aws_lambda_function.api.arn
      }
    ]
  })
}

resource "aws_scheduler_schedule" "api_pause" {
  count = var.enable_api_schedule_controls ? 1 : 0
  name  = "${local.name_prefix}-api-pause"

  schedule_expression          = var.api_pause_schedule_expression
  schedule_expression_timezone = var.api_schedule_timezone
  state                        = "ENABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:lambda:putFunctionConcurrency"
    role_arn = aws_iam_role.scheduler_api_cost_control[0].arn
    input = jsonencode({
      FunctionName                 = aws_lambda_function.api.function_name
      ReservedConcurrentExecutions = 0
    })
  }
}

resource "aws_scheduler_schedule" "api_resume" {
  count = var.enable_api_schedule_controls ? 1 : 0
  name  = "${local.name_prefix}-api-resume"

  schedule_expression          = var.api_resume_schedule_expression
  schedule_expression_timezone = var.api_schedule_timezone
  state                        = "ENABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:lambda:deleteFunctionConcurrency"
    role_arn = aws_iam_role.scheduler_api_cost_control[0].arn
    input = jsonencode({
      FunctionName = aws_lambda_function.api.function_name
    })
  }
}
