import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

from utils.response import json_response

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

cognito = boto3.client("cognito-idp")
USER_POOL_ID = os.environ["USER_POOL_ID"]


def lambda_handler(event, context):
    method = event["httpMethod"]
    request_id = context.aws_request_id if context else "local"

    logger.info("users request: method=%s request_id=%s", method, request_id)

    try:
        body = json.loads(event.get("body") or "{}")
        query_params = event.get("queryStringParameters") or {}
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})

        if method == "POST":
            return create_user(body, claims)
        elif method == "PATCH":
            return update_user(body, claims)
        elif method == "GET":
            return get_users(query_params, claims)
        elif method == "DELETE":
            return delete_user(query_params, claims)
        else:
            return json_response(405, {"message": "Method not allowed"})

    except Exception:
        logger.exception("Unhandled error in users handler: request_id=%s", request_id)
        return json_response(500, {"message": "Internal server error"})


def _require_admin(claims):
    if claims.get("custom:role") != "admin":
        return json_response(403, {"message": "Admin access required"})
    return None


def _format_user(cognito_user):
    attrs = {a["Name"]: a["Value"] for a in cognito_user.get("Attributes", cognito_user.get("UserAttributes", []))}
    return {
        "username": cognito_user.get("Username") or cognito_user.get("username"),
        "role": attrs.get("custom:role", "staff"),
        "status": cognito_user.get("UserStatus"),
        "enabled": cognito_user.get("Enabled", True),
        "created_at": str(cognito_user.get("UserCreateDate", "")),
    }


def create_user(body, claims):
    err = _require_admin(claims)
    if err:
        return err

    username = body.get("username")
    password = body.get("password")
    role = body.get("role", "staff")

    if not username or not password:
        return json_response(400, {"message": "username and password are required"})

    if role not in ("admin", "staff"):
        return json_response(400, {"message": "role must be admin or staff"})

    try:
        cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=username,
            UserAttributes=[{"Name": "custom:role", "Value": role}],
            MessageAction="SUPPRESS",
        )
        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=username,
            Password=password,
            Permanent=True,
        )
        logger.info("User created: username=%s role=%s", username, role)
        return json_response(201, {"message": "User created successfully", "username": username, "role": role})

    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "UsernameExistsException":
            return json_response(400, {"message": "Username already exists"})
        if code == "InvalidPasswordException":
            return json_response(400, {"message": "Password does not meet requirements (min 6 characters)"})
        logger.exception("Failed to create user")
        return json_response(500, {"message": "Failed to create user"})


def update_user(body, claims):
    err = _require_admin(claims)
    if err:
        return err

    username = body.get("username")
    role = body.get("role")

    if not username:
        return json_response(400, {"message": "username is required"})

    if not role:
        return json_response(400, {"message": "role is required"})

    if role not in ("admin", "staff"):
        return json_response(400, {"message": "role must be admin or staff"})

    try:
        cognito.admin_update_user_attributes(
            UserPoolId=USER_POOL_ID,
            Username=username,
            UserAttributes=[{"Name": "custom:role", "Value": role}],
        )
        logger.info("User updated: username=%s role=%s", username, role)
        return json_response(200, {"message": "User updated successfully"})

    except ClientError as e:
        if e.response["Error"]["Code"] == "UserNotFoundException":
            return json_response(404, {"message": "User not found"})
        logger.exception("Failed to update user")
        return json_response(500, {"message": "Failed to update user"})


def get_users(query_params, claims):
    err = _require_admin(claims)
    if err:
        return err

    username = query_params.get("username")

    if username:
        try:
            result = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=username)
            return json_response(200, _format_user(result))
        except ClientError as e:
            if e.response["Error"]["Code"] == "UserNotFoundException":
                return json_response(404, {"message": "User not found"})
            logger.exception("Failed to get user")
            return json_response(500, {"message": "Failed to get user"})

    users = []
    kwargs = {"UserPoolId": USER_POOL_ID}
    while True:
        response = cognito.list_users(**kwargs)
        for u in response.get("Users", []):
            users.append(_format_user(u))
        pagination_token = response.get("PaginationToken")
        if not pagination_token:
            break
        kwargs["PaginationToken"] = pagination_token

    return json_response(200, users)


def delete_user(query_params, claims):
    err = _require_admin(claims)
    if err:
        return err

    username = query_params.get("username")
    if not username:
        return json_response(400, {"message": "username is required"})

    try:
        cognito.admin_disable_user(UserPoolId=USER_POOL_ID, Username=username)
        logger.info("User disabled: username=%s", username)
        return json_response(200, {"message": "User disabled successfully"})

    except ClientError as e:
        if e.response["Error"]["Code"] == "UserNotFoundException":
            return json_response(404, {"message": "User not found"})
        logger.exception("Failed to disable user")
        return json_response(500, {"message": "Failed to disable user"})
