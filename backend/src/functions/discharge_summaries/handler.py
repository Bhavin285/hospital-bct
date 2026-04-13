import json
import logging
import os
import uuid
from datetime import datetime
from urllib.parse import unquote

import boto3
from boto3.dynamodb.conditions import Key

from utils.response import json_response
from utils.s3_helper import generate_presigned_url, upload_photo

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

BUCKET = os.environ["PHOTO_BUCKET"]
PHOTO_FOLDER = "discharge-photos"
VALID_STATUSES = {"re_open", "recover", "release", "death"}

_INTERNAL_KEYS = {"PK", "SK", "photo_key"}


def lambda_handler(event, context):
    method = event["httpMethod"]
    path_params = event.get("pathParameters") or {}
    tag_number = path_params.get("tag_number")
    summary_id = path_params.get("summary_id")
    request_id = context.aws_request_id if context else "local"

    logger.info(
        "discharge_summaries request: method=%s tag_number=%s summary_id=%s request_id=%s",
        method, tag_number, summary_id, request_id,
    )

    try:
        if method == "POST":
            return create_discharge_summary(event)
        elif method == "GET":
            return get_discharge_summaries(tag_number)
        elif method == "DELETE":
            return delete_discharge_summary(tag_number, summary_id)
        else:
            return json_response(405, {"message": "Method not allowed"})

    except Exception:
        logger.exception(
            "Unhandled error in discharge_summaries handler: request_id=%s", request_id
        )
        return json_response(500, {"message": "Internal server error"})


def create_discharge_summary(event):
    body = json.loads(event.get("body") or "{}")

    tag_number = body.get("tag_number")
    status = body.get("status")

    if not tag_number or not status:
        return json_response(400, {"message": "tag_number and status are required"})

    if status not in VALID_STATUSES:
        return json_response(400, {"message": f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"})

    now = datetime.utcnow().isoformat()
    summary_id = str(uuid.uuid4())
    clean_timestamp = now.replace(":", "").replace("-", "").replace(".", "")[:15]

    photo_key = upload_photo(BUCKET, PHOTO_FOLDER, f"{tag_number}_{clean_timestamp}", body.get("photo"))

    item = {
        "PK": f"ADMIT#{tag_number}",
        "SK": f"SUMMARY#{summary_id}",
        "id": summary_id,
        "tag_number": tag_number,
        "status": status,
        "description": body.get("description"),
        "date": body.get("date") or now.split("T")[0],
        "time": body.get("time", ""),
        "photo_key": photo_key,
        "created_by": body.get("created_by"),
        "created_at": now,
        "updated_at": now,
    }

    table.put_item(Item=item)
    logger.info("Discharge summary created: tag_number=%s status=%s", tag_number, status)

    response_item = {k: v for k, v in item.items() if k not in _INTERNAL_KEYS}
    response_item["photo"] = generate_presigned_url(BUCKET, photo_key)

    return json_response(201, response_item)


def delete_discharge_summary(tag_number: str, summary_id: str):
    if not tag_number or not summary_id:
        return json_response(400, {"message": "tag_number and summary_id are required"})

    decoded_id = unquote(summary_id)
    sk = f"SUMMARY#{decoded_id}"
    logger.info("Attempting delete: tag_number=%s sk=%s", tag_number, sk)
    table.delete_item(Key={"PK": f"ADMIT#{tag_number}", "SK": sk})
    logger.info("Discharge summary deleted: tag_number=%s summary_id=%s", tag_number, decoded_id)
    return json_response(200, {"message": "Deleted"})


def get_discharge_summaries(tag_number: str):
    if not tag_number:
        return json_response(400, {"message": "tag_number required"})

    result = table.query(
        KeyConditionExpression=(
            Key("PK").eq(f"ADMIT#{tag_number}") & Key("SK").begins_with("SUMMARY#")
        )
    )

    items = result.get("Items", [])
    for item in items:
        sk = item.pop("SK", "") or ""
        item.pop("PK", None)
        # Derive id from SK for old records that predate the id field
        if "id" not in item and sk.startswith("SUMMARY#"):
            item["id"] = sk[len("SUMMARY#"):]
        item["photo"] = generate_presigned_url(BUCKET, item.pop("photo_key", None))

    logger.info("Fetched %d discharge summaries: tag_number=%s", len(items), tag_number)
    return json_response(200, items)
