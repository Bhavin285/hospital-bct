# Deployment Guide — Bezuban Charitable Trust Website

**AWS Profile:** `bct`
**Region:** `ap-south-1`
**Live URL:** `https://bezubancharitabletrust.com` (and `www.bezubancharitabletrust.com`)
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

The bucket name must match the domain for direct S3 website hosting, but since we use CloudFront the name just needs to be unique:

```bash
aws s3 mb s3://bezuban-charitable-trust-website \
  --region ap-south-1 \
  --profile bct
```

Block all public access (CloudFront serves the files):
```bash
aws s3api put-public-access-block \
  --bucket bezuban-charitable-trust-website \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
  --profile bct
```

### 2. Request an ACM Certificate (must be in us-east-1 for CloudFront)

Request a certificate covering both root and www:
```bash
aws acm request-certificate \
  --domain-name "bezubancharitabletrust.com" \
  --subject-alternative-names "www.bezubancharitabletrust.com" \
  --validation-method DNS \
  --region us-east-1 \
  --profile bct
```

Copy the `CertificateArn`. Add both CNAME validation records shown in the ACM console to your DNS provider. Wait until status shows `ISSUED`.

### 3. Create a CloudFront Origin Access Control (OAC)

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "bct-website-oac",
    "Description": "OAC for Bezuban Charitable Trust website",
    "SigningProtocol": "sigv4",
    "SigningBehavior": "always",
    "OriginAccessControlOriginType": "s3"
  }' \
  --profile bct
```

Note the `Id` from the output (referred to as `<OAC_ID>` below).

### 4. Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "bct-website-'$(date +%s)'",
    "Aliases": {
      "Quantity": 2,
      "Items": ["bezubancharitabletrust.com", "www.bezubancharitabletrust.com"]
    },
    "DefaultRootObject": "index.html",
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "bct-website-s3",
        "DomainName": "bezuban-charitable-trust-website.s3.ap-south-1.amazonaws.com",
        "S3OriginConfig": {"OriginAccessIdentity": ""},
        "OriginAccessControlId": "<OAC_ID>"
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "bct-website-s3",
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
    "Comment": "Bezuban Charitable Trust Website"
  }' \
  --profile bct
```

Note the `Id` (Distribution ID) and `DomainName` (e.g., `xxxx.cloudfront.net`) from the output.

### 5. Attach Bucket Policy for CloudFront OAC

Replace `<DISTRIBUTION_ARN>` with the format `arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>`:

```bash
aws s3api put-bucket-policy \
  --bucket bezuban-charitable-trust-website \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {"Service": "cloudfront.amazonaws.com"},
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bezuban-charitable-trust-website/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "<DISTRIBUTION_ARN>"
        }
      }
    }]
  }' \
  --profile bct
```

### 6. Add DNS Records

In your DNS provider, add records pointing both root domain and www to CloudFront:

| Type | Name | Value |
|------|------|-------|
| CNAME | `www` | `xxxx.cloudfront.net` |
| CNAME | `@` (root) | `xxxx.cloudfront.net` |

> Note: Many DNS providers do not support CNAME at the root (`@`). Use an **ALIAS** or **ANAME** record if available. If using Route 53, use an A record with ALIAS target.

If using Route 53:
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id "<HOSTED_ZONE_ID>" \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "bezubancharitabletrust.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "xxxx.cloudfront.net",
            "EvaluateTargetHealth": false
          }
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "www.bezubancharitabletrust.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "xxxx.cloudfront.net"}]
        }
      }
    ]
  }' \
  --profile bct
```

> The Route 53 hosted zone ID for CloudFront is always `Z2FDTNDATAQYW2`.

---

## Deploy

### Build

```bash
cd bezuban-trust
npm install
npm run build
```

### Upload to S3

```bash
aws s3 sync dist/ s3://bezuban-charitable-trust-website \
  --delete \
  --profile bct
```

### Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id "<DISTRIBUTION_ID>" \
  --paths "/*" \
  --profile bct
```

### One-Command Deploy

Set environment variables once, then run deploy:

```bash
export S3_BUCKET=bezuban-charitable-trust-website
export CF_DISTRIBUTION_ID=<DISTRIBUTION_ID>

npm run deploy --profile bct
```

The `deploy` script in `package.json` handles build + sync + invalidation automatically.

---

## Update Stats Without Rebuilding

Edit `public/config.json` and push just that file:

```bash
aws s3 cp public/config.json \
  s3://bezuban-charitable-trust-website/config.json \
  --profile bct
```

The website fetches `config.json` at runtime, so stats update without a full rebuild or CloudFront invalidation.

---

## Verify

Once DNS propagates (up to 15 minutes for CNAME, up to 48 hours for registrar propagation):
```
https://bezubancharitabletrust.com
https://www.bezubancharitabletrust.com
```

---

## Useful Commands

```bash
# Check what's deployed in the bucket
aws s3 ls s3://bezuban-charitable-trust-website --profile bct

# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id "<DISTRIBUTION_ID>" \
  --query 'Distribution.Status' \
  --profile bct

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id "<DISTRIBUTION_ID>" \
  --profile bct

# View CloudFront distribution details
aws cloudfront get-distribution \
  --id "<DISTRIBUTION_ID>" \
  --profile bct
```
