# Hosting — estimated monthly cost

**Scale:** ~11 concurrent users  
**Stack:** ECS Fargate (API + PDF worker), **Amazon SQS** (PDF job queue), S3, Supabase (DB), frontend on Amplify (optional). No ALB, no NAT Gateway.

**Assumptions:** Region e.g. ap-south-1, 730 hrs/month, 1 task per Fargate service, low PDF/storage volume. Figures are approximate.

## AWS

| Item | Spec | ~USD/month |
|------|------|------------|
| ECS Fargate — API | 0.25 vCPU, 0.5–1 GB × 1 | 10 |
| ECS Fargate — worker | 0.25 vCPU, 0.5–1 GB × 1 | 10 |
| Amazon SQS | Standard queue, low message volume | ~2 |
| S3 | Storage + requests | 1–3 |
| ECR | Image storage | 1–2 |
| CloudWatch Logs | Basic retention | 2 |
| Amplify Hosting | Frontend (optional) | 3 |
| Route 53 | Hosted zone (optional) | ~0.50 |
| **AWS total** | | **~22–42** |

## Supabase (Free tier)

**0** USD/month

## Total platform (AWS + Supabase)

**~22** USD/month

## Not included

Gemini, Recall.ai, email/SMTP, data transfer spikes, Supabase.

