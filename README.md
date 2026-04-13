# bct

### backend deployment 
 AWS_PROFILE=bct sam build && AWS_PROFILE=bct sam deploy --config-env prod                  

 ### frontend deployment
 npm run build              
 
 aws s3 sync dist/ s3://bct-hospital-frontend --delete --profile bct
 
 aws cloudfront create-invalidation \
  --distribution-id "E2P7YRVFYJTXHF" \
  --paths "/*" \
  --profile bct
