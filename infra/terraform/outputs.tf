# infra/terraform/outputs.tf
# Detailed outputs for easy access after terraform apply

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_oidc_provider_url" {
  description = "OIDC provider URL (needed for IRSA)"
  value       = module.eks.cluster_oidc_provider_url
}

output "cluster_oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  value       = module.eks.oidc_provider_arn
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "node_group_iam_role_arns" {
  description = "IAM Role ARNs for EKS node groups"
  value       = { for k, v in module.eks.eks_managed_node_groups : k => v.iam_role_arn }
}

output "kubeconfig_command" {
  description = "Command to update kubeconfig"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}

output "ingress_hostname" {
  description = "Example ingress hostname (update with your domain)"
  value       = "api.cursorcode.ai"
}
