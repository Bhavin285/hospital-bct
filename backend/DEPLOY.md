# Backend Deployment Guide — BCT API

**AWS Profile:** `bct`
**Region:** `ap-south-1`
**Live URL:** `https://api.bezubancharitabletrust.com`
**Tech:** AWS SAM (Serverless Application Model)

---

## Prerequisites

- AWS CLI installed and configured with the `bct` profile
- AWS SAM CLI installed (`brew install aws-sam-cli` or see [SAM docs](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- Python 3.9

Verify setup:
```bash
aws sts get-caller-identity --profile bct
sam --version
```

---

## First-Time Deploy

> `--profile bct` and `AWS_PROFILE=bct` are equivalent. Both work — use whichever you prefer.

### 1. Build

```bash
cd backend
AWS_PROFILE=bct sam build
```

### 2. Deploy with guided setup (first time only)

This generates `samconfig.toml` so future deploys need no flags:

```bash
AWS_PROFILE=bct sam deploy --guided
```

Answer the prompts:

| Prompt | Value |
|--------|-------|
| Stack Name | `bct-backend-prod` |
| AWS Region | `ap-south-1` |
| Parameter Environment | `prod` |
| Confirm changes before deploy | `Y` |
| Allow SAM CLI IAM role creation | `Y` |
| Disable rollback | `N` |
| Save arguments to config file | `Y` |
| SAM config file | `samconfig.toml` |
| SAM config environment | `prod` |

Commit the generated `samconfig.toml` — future deploys become one command.

---

## Subsequent Deploys

> Requires `samconfig.toml` from the first-time guided deploy above.

```bash
cd backend
AWS_PROFILE=bct sam build && AWS_PROFILE=bct sam deploy --config-env prod
```

---

## Making Changes & Updating the Server

Use this section every time you make any code or infrastructure change.

### When you change Lambda function code (Python files)

Any change inside `src/functions/` or `src/utils/`:

```bash
cd backend
AWS_PROFILE=bct sam build && AWS_PROFILE=bct sam deploy --config-env prod
```

SAM detects which functions changed and only updates those. Takes ~1-2 minutes.

### When you change `template.yaml` (infrastructure)

Adding a new Lambda, DynamoDB table, S3 bucket, Cognito setting, etc.:

```bash
cd backend
AWS_PROFILE=bct sam build && AWS_PROFILE=bct sam deploy --config-env prod
```

Same command — SAM computes a CloudFormation changeset and applies only the diff.

### When you add a new Python dependency

1. Add it to `src/requirements.txt`
2. Run the standard build + deploy:

```bash
cd backend
AWS_PROFILE=bct sam build && AWS_PROFILE=bct sam deploy --config-env prod
```

### When you change environment variables (Lambda config)

Update the `Environment.Variables` block in `template.yaml` for the relevant function, then build + deploy as above.

### Verify a deploy succeeded

```bash
# See the stack outputs (API URL, Cognito IDs, etc.)
aws cloudformation describe-stacks \
  --stack-name bct-backend-prod \
  --query 'Stacks[0].Outputs' \
  --region ap-south-1 \
  --profile bct

# Tail logs for a specific function to confirm it's working
AWS_PROFILE=bct sam logs \
  --stack-name bct-backend-prod \
  --name AdmitFormFunction \
  --tail
```

### Quick reference — which file to edit for what change

| What you want to change | File to edit |
|-------------------------|--------------|
| Login / auth logic | Cognito console (no Lambda) |
| Animal registration / edit | `src/functions/admit_forms/handler.py` |
| Discharge summary | `src/functions/discharge_summaries/handler.py` |
| User management (create/delete) | `src/functions/users/handler.py` |
| Change password | `src/functions/auth/change_password.py` |
| Add new API route | `template.yaml` + new handler file |
| S3 / DynamoDB / Cognito settings | `template.yaml` |

---

## What Gets Deployed

| Resource | Name |
|----------|------|
| API Gateway | `bct-api-prod` |
| Lambda: Auth | `bct-login-prod`, `bct-change-password-prod` |
| Lambda: Users | `bct-create-user-prod` |
| Lambda: Admit Forms | `bct-admit-form-prod` |
| Lambda: Discharge | `bct-discharge-summary-prod` |
| DynamoDB: Users | `bct-users-prod` |
| DynamoDB: Admit Forms | `bct-admit-forms-prod` |
| DynamoDB: Discharge Summaries | `bct-discharge-summaries-prod` |
| S3: Photos | `bct-photos-prod` |

After deploy, SAM prints the API Gateway invoke URL:
```
Outputs:
  ServerlessRestApi - https://<id>.execute-api.ap-south-1.amazonaws.com/prod/
```

---

## Bind Custom Domain: `api.bezubancharitabletrust.com`

### Step 1 — Request an ACM Certificate (Regional, ap-south-1)

```bash
aws acm request-certificate \
  --domain-name "api.bezubancharitabletrust.com" \
  --validation-method DNS \
  --region ap-south-1 \
  --profile bct
```

Copy the `CertificateArn` from the output.

Add the CNAME record shown in the ACM console to your DNS provider to validate the certificate. Wait until status shows `ISSUED`.

### Step 2 — Create a Custom Domain in API Gateway

```bash
aws apigateway create-domain-name \
  --domain-name "api.bezubancharitabletrust.com" \
  --regional-certificate-arn "arn:aws:acm:ap-south-1:721995408731:certificate/3110c5d8-3723-404c-b591-ca28ec8649fd" \
  --endpoint-configuration types=REGIONAL \
  --region ap-south-1 \
  --profile bct
```

**regionalDomainName: `d-nawmgwgnz5.execute-api.ap-south-1.amazonaws.com`** (already created — skip this step on future deploys)

### Step 3 — Map the Domain to the API Stage

Get your API ID first:
```bash
aws apigateway get-rest-apis \
  --region ap-south-1 \
  --profile bct \
  --query 'items[?name==`bct-api-prod`].id' \
  --output text
```

Create the base path mapping (replace `<API_ID>` with output above):
```bash
aws apigateway create-base-path-mapping \
  --domain-name "api.bezubancharitabletrust.com" \
  --rest-api-id "e06gp4arm7" \
  --stage "prod" \
  --region ap-south-1 \
  --profile bct
```

### Step 4 — Add DNS Record

In your domain registrar / DNS provider, add a **CNAME** record:

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `d-nawmgwgnz5.execute-api.ap-south-1.amazonaws.com` |

```
api.bezubancharitabletrust.com  CNAME  d-nawmgwgnz5.execute-api.ap-south-1.amazonaws.com
```

If using Route 53:
```bash
# Replace HOSTED_ZONE_ID and REGIONAL_DOMAIN_NAME with real values
aws route53 change-resource-record-sets \
  --hosted-zone-id "<HOSTED_ZONE_ID>" \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.bezubancharitabletrust.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "<REGIONAL_DOMAIN_NAME>"}]
      }
    }]
  }' \
  --profile bct
```

DNS propagation can take up to 15 minutes.

### Step 5 — Verify

```bash
curl https://api.bezubancharitabletrust.com/login
```

---

## Update Frontend API URL

Once the custom domain is live, update the frontend `.env.production`:
```
VITE_API_BASE_URL=https://api.bezubancharitabletrust.com
```

---

## Useful Commands

```bash
# View deployed stack outputs (API URL, etc.)
aws cloudformation describe-stacks \
  --stack-name bct-backend-prod \
  --query 'Stacks[0].Outputs' \
  --region ap-south-1 \
  --profile bct

# View Lambda logs (replace function name as needed)
sam logs --stack-name bct-backend-prod --profile bct --tail

# Delete the stack (WARNING: destroys all resources)
sam delete --stack-name bct-backend-prod --region ap-south-1 --profile bct
```

---

## API Endpoints Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | User login |
| POST | `/change_password` | Change password |
| ANY | `/user` | Create / manage users |
| POST | `/admit_form` | Register new animal |
| GET | `/admit_form` | List all animals |
| GET | `/admit_form/{tag_number}` | Get animal by tag |
| PATCH | `/admit_form/{tag_number}` | Update animal record |
| DELETE | `/admit_form/{tag_number}` | Delete animal record |
| POST | `/discharge_summary` | Add discharge summary |
| GET | `/discharge_summary/{tag_number}` | Get discharge summaries |
