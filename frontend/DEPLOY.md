# Frontend Deployment Guide — BCT Hospital App

**AWS Profile:** `bct`
**Region:** `ap-south-1`
**Live URL:** `https://hospital.bezubancharitabletrust.com`
**Tech:** Vite + React → S3 + CloudFront

---

## Prerequisites

- Node.js 18+
- AWS CLI configured with the `bct` profile

Verify setup:
```bash
aws sts get-caller-identity --profile bct
node --version
```

---

## One-Time Setup

### 1. Create the S3 Bucket

```bash
aws s3 mb s3://bct-hospital-frontend \
  --region ap-south-1 \
  --profile bct
```

Block all public access (CloudFront will serve the files):
```bash
aws s3api put-public-access-block \
  --bucket bct-hospital-frontend \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile bct
```

### 2. Request an ACM Certificate (must be in us-east-1 for CloudFront)

```bash
aws acm request-certificate \
  --domain-name "hospital.bezubancharitabletrust.com" \
  --validation-method DNS \
  --region us-east-1 \
  --profile bct
```

**Certificate ARN:** `arn:aws:acm:us-east-1:721995408731:certificate/8068ba25-1352-411b-8136-bfe03effc4b0`

Add the DNS CNAME validation record to your DNS provider. Check status:
```bash
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:721995408731:certificate/8068ba25-1352-411b-8136-bfe03effc4b0" \
  --query 'Certificate.Status' \
  --region us-east-1 \
  --profile bct
```
Wait until status shows `ISSUED`.

### 3. Create a CloudFront Origin Access Control (OAC)

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "bct-hospital-oac",
    "Description": "OAC for BCT hospital frontend",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }' \
  --profile bct
```

Output:
```json
{
    "Location": "https://cloudfront.amazonaws.com/2020-05-31/origin-access-control/E1B9LN7YD55E2",
    "ETag": "ETVPDKIKX0DER",
    "OriginAccessControl": {
        "Id": "E1B9LN7YD55E2",
        "OriginAccessControlConfig": {
            "Name": "bct-hospital-oac",
            "Description": "OAC for BCT hospital frontend",
            "SigningProtocol": "sigv4",
            "SigningBehavior": "always",
            "OriginAccessControlOriginType": "s3"
        }
    }
}
```

**OAC ID: `E1B9LN7YD55E2`** (already created — skip this step on future deploys)

### 4. Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "bct-hospital-'$(date +%s)'",
    "Aliases": {"Quantity": 1, "Items": ["hospital.bezubancharitabletrust.com"]},
    "DefaultRootObject": "index.html",
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "bct-hospital-s3",
        "DomainName": "bct-hospital-frontend.s3.ap-south-1.amazonaws.com",
        "S3OriginConfig": {"OriginAccessIdentity": ""},
        "OriginAccessControlId": "E1B9LN7YD55E2"
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "bct-hospital-s3",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true
    },
    "CustomErrorResponses": {
      "Quantity": 1,
      "Items": [{
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }]
    },
    "ViewerCertificate": {
      "ACMCertificateArn": "<CERTIFICATE_ARN>",
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "PriceClass": "PriceClass_All",
    "Enabled": true,
    "HttpVersion": "http2",
    "Comment": "BCT Hospital Frontend"
  }' \
  --profile bct
```

**Distribution ID: `E2P7YRVFYJTXHF`**
**CloudFront Domain: `d1ams280qxxdve.cloudfront.net`**
**Distribution ARN: `arn:aws:cloudfront::721995408731:distribution/E2P7YRVFYJTXHF`**

(Already created — skip this step on future deploys)

### 5. Attach Bucket Policy for CloudFront OAC

```bash
aws s3api put-bucket-policy \
  --bucket bct-hospital-frontend \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {"Service": "cloudfront.amazonaws.com"},
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bct-hospital-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::721995408731:distribution/E2P7YRVFYJTXHF"
        }
      }
    }]
  }' \
  --profile bct
```

### 6. Add DNS Record

In your DNS provider, add a **CNAME** record pointing to the CloudFront domain:

| Type | Name | Value |
|------|------|-------|
| CNAME | `hospital` | `d1ams280qxxdve.cloudfront.net` |

If using Route 53 (recommended — use ALIAS record for root):
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "<HOSTED_ZONE_ID>" \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "hospital.bezubancharitabletrust.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "xxxx.cloudfront.net"}]
      }
    }]
  }' \
  --profile bct
```

---

## Configure Environment

Create a `.env.production` file in the `frontend/` folder:

```bash
# frontend/.env.production
VITE_API_BASE_URL=https://api.bezubancharitabletrust.com
```

This file is gitignored — set it locally before each build.

---

## Deploy

### Build

```bash
cd frontend
npm install
npm run build
```

This generates the `dist/` folder.

### Upload to S3

```bash
aws s3 sync dist/ s3://bct-hospital-frontend \
  --delete \
  --profile bct
```

### Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id "E2P7YRVFYJTXHF" \
  --paths "/*" \
  --profile bct
```

### One-Command Deploy (after first setup)

```bash
cd frontend && \
npm run build && \
aws s3 sync dist/ s3://bct-hospital-frontend --delete --profile bct && \
aws cloudfront create-invalidation \
  --distribution-id "E2P7YRVFYJTXHF" \
  --paths "/*" \
  --profile bct
```

---

## Making Changes & Updating the Frontend

Use this section every time you make any code change to the frontend.

### When you change any React component, page, CSS, or logic

This is the only command you need every time:

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://bct-hospital-frontend --delete --profile bct
aws cloudfront create-invalidation \
  --distribution-id "E2P7YRVFYJTXHF" \
  --paths "/*" \
  --profile bct
```

> CloudFront caches files globally. The invalidation clears the cache so users see your changes immediately. Without it, users may see the old version for up to 24 hours.

### When you add a new npm package

```bash
cd frontend
npm install <package-name>
npm run build
aws s3 sync dist/ s3://bct-hospital-frontend --delete --profile bct
aws cloudfront create-invalidation \
  --distribution-id "E2P7YRVFYJTXHF" \
  --paths "/*" \
  --profile bct
```

### When you change environment variables (`.env.production`)

Update `.env.production`, then rebuild and redeploy — env vars are baked into the build:

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://bct-hospital-frontend --delete --profile bct
aws cloudfront create-invalidation \
  --distribution-id "E2P7YRVFYJTXHF" \
  --paths "/*" \
  --profile bct
```

### When you only update `public/` files (like logos or config)

If you only changed a file in `public/` (e.g., `public/logo.png`), you can sync just that file without a full rebuild:

```bash
aws s3 cp public/logo.png s3://bct-hospital-frontend/logo.png --profile bct
aws cloudfront create-invalidation \
  --distribution-id "E2P7YRVFYJTXHF" \
  --paths "/logo.png" \
  --profile bct
```

### Quick reference — which file to edit for what change

| What you want to change | File to edit |
|-------------------------|--------------|
| Login page | `src/components/LoginPage.jsx` |
| Animal registration form | `src/components/pages/Dashboard.jsx` |
| Animal records list (admin) | `src/components/pages/AdminDashboard.jsx` |
| Animal records list (staff) | `src/components/pages/UserRecords.jsx` |
| User management | `src/components/pages/CreateUser.jsx` |
| Change password | `src/components/pages/ChangePassword.jsx` |
| Sidebar menu items | `src/components/Sidebar.jsx` / `UserSidebar.jsx` |
| PDF layout / content | `src/utils/pdfService.js` |
| API endpoints base URL | `.env.production` |
| Cognito User Pool / Client | `.env.production` |

### Verify the deploy

Check the live site after CloudFront invalidation completes (~1-2 minutes):

```bash
# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id "E2P7YRVFYJTXHF" \
  --profile bct
```

Then open: `https://hospital.bezubancharitabletrust.com`

---

## Verify

Once DNS propagates (up to 15 minutes):
```
https://hospital.bezubancharitabletrust.com
```

---

## Useful Commands

```bash
# Check what's in the bucket
aws s3 ls s3://bct-hospital-frontend --profile bct

# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id "E2P7YRVFYJTXHF" \
  --query 'Distribution.Status' \
  --profile bct

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id "E2P7YRVFYJTXHF" \
  --profile bct
```
