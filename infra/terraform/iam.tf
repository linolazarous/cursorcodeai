# infra/terraform/iam.tf
# IAM Roles for Service Accounts (IRSA) setup

# OIDC Provider (already created by the EKS module, but we reference it)
data "aws_iam_policy_document" "assume_role_with_web_identity" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(module.eks.cluster_oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:default:cursorcode-*"]
    }
  }
}

# Example: IAM Role for AWS Load Balancer Controller
resource "aws_iam_role" "aws_load_balancer_controller" {
  name               = "cursorcode-aws-lb-controller"
  assume_role_policy = data.aws_iam_policy_document.assume_role_with_web_identity.json
}

resource "aws_iam_policy" "aws_load_balancer_controller" {
  name   = "cursorcode-aws-lb-controller-policy"
  policy = file("${path.module}/policies/aws-lb-controller.json") # Create this file
}

resource "aws_iam_role_policy_attachment" "aws_lb_controller" {
  role       = aws_iam_role.aws_load_balancer_controller.name
  policy_arn = aws_iam_policy.aws_load_balancer_controller.arn
}

# Example: Role for External DNS
resource "aws_iam_role" "external_dns" {
  name               = "cursorcode-external-dns"
  assume_role_policy = data.aws_iam_policy_document.assume_role_with_web_identity.json
}

# You can add more roles here (S3 access, RDS, etc.)
