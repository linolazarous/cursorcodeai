provider "aws" {
region = "us-east-1"
}
resource "aws_eks_cluster" "cursorcode" {
name = "cursorcode-cluster"
... full EKS setup for native infra
}