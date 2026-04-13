import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

from utils.response import json_response

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

cognito = boto3.client("cognito-idp")
USER_POOL_ID = os.environ["USER_POOL_ID"]


def lambda_handler(event, context):
    logger.info("Change password request received")

    try:
        body = json.loads(event.get("body") or "{}")
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        return change_password(body, claims)

    except Exception:
        logger.exception("Unhandled error in change_password handler")
        return json_response(500, {"message": "Internal server error"})


def change_password(body, claims):
    requester_role = claims.get("custom:role", "")
    requester_username = claims.get("cognito:username", "")
    new_password = body.get("new_password")

    if not new_password:
        return json_response(400, {"message": "new_password is required"})

    target_username = body.get("target_username")
    access_token = body.get("access_token")
    old_password = body.get("old_password")

    # Admin changing another user's password — no old password needed
    if requester_role == "admin" and target_username and target_username != requester_username:
        try:
            cognito.admin_set_user_password(
                UserPoolId=USER_POOL_ID,
                Username=target_username,
                Password=new_password,
                Permanent=True,
            )
            logger.info("Admin set password: target=%s by=%s", target_username, requester_username)
            return json_response(200, {"message": "Password changed successfully"})

        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "UserNotFoundException":
                return json_response(404, {"message": "User not found"})
            if code == "InvalidPasswordException":
                return json_response(400, {"message": "Password does not meet requirements (min 6 characters)"})
            logger.exception("Admin set password failed")
            return json_response(500, {"message": "Failed to change password"})

    # User changing own password — requires AccessToken + current password
    if not access_token or not old_password:
        return json_response(400, {"message": "access_token and old_password are required"})

    try:
        cognito.change_password(
            AccessToken=access_token,
            PreviousPassword=old_password,
            ProposedPassword=new_password,
        )
        logger.info("Password changed: username=%s", requester_username)
        return json_response(200, {"message": "Password changed successfully"})

    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "NotAuthorizedException":
            return json_response(401, {"message": "Current password is incorrect"})
        if code == "InvalidPasswordException":
            return json_response(400, {"message": "Password does not meet requirements (min 6 characters)"})
        if code == "LimitExceededException":
            return json_response(429, {"message": "Too many attempts. Please try again later."})
        logger.exception("Change password failed")
        return json_response(500, {"message": "Failed to change password"})
