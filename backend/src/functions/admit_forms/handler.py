import json
import logging
import os
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

from utils.response import json_response
from utils.s3_helper import generate_presigned_url, upload_photo

logger = logging.getLogger(__name__)
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

BUCKET = os.environ["PHOTO_BUCKET"]
PHOTO_FOLDER = "admit-photos"

_TITLE_CASE_FIELDS = {
    "name", "animal_name", "address", "diagnosis", "animal_injury",
    "sex", "body_colour", "breed", "present_dr", "present_staff",
}


def lambda_handler(event, context):
    method = event["httpMethod"]
    path_params = event.get("pathParameters") or {}
    tag_number = path_params.get("tag_number")
    request_id = context.aws_request_id if context else "local"

    logger.info(
        "admit_forms request: method=%s tag_number=%s request_id=%s",
        method, tag_number, request_id,
    )

    try:
        if method == "POST":
            return create_admit_form(event)
        elif method == "PATCH":
            return update_admit_form(tag_number, event)
        elif method == "DELETE":
            return delete_admit_form(tag_number)
        elif method == "GET":
            return get_admit_form_by_id(tag_number) if tag_number else get_all_admit_forms(event)
        else:
            return json_response(405, {"message": "Method not allowed"})

    except Exception:
        logger.exception(
            "Unhandled error in admit_forms handler: request_id=%s", request_id
        )
        return json_response(500, {"message": "Internal server error"})


def _to_title(value: str) -> str:
    if not value:
        return value
    return value.strip().title()


def _get_next_tag_number() -> int:
    result = table.update_item(
        Key={"PK": "COUNTER", "SK": "ADMIT"},
        UpdateExpression="SET current_value = if_not_exists(current_value, :start) + :inc",
        ExpressionAttributeValues={":inc": 1, ":start": 0},
        ReturnValues="UPDATED_NEW",
    )
    return int(result["Attributes"]["current_value"])


def _build_filter_expression(query_params: dict):
    filter_expr = None
    from_date = query_params.get("from_date")
    to_date = query_params.get("to_date")
    search = query_params.get("search", "").strip()
    tag_number = query_params.get("tag_number", "").strip()
    mobile = query_params.get("mobile", "").strip()
    sex = query_params.get("sex", "").strip()
    breed = query_params.get("breed", "").strip()

    logger.info(
        "Building filter: tag_number=%r search=%r mobile=%r from_date=%r to_date=%r",
        tag_number, search, mobile, from_date, to_date,
    )

    # Date filters
    if from_date and to_date:
        filter_expr = Attr("date").between(from_date, to_date)
    elif from_date:
        filter_expr = Attr("date").gte(from_date)
    elif to_date:
        filter_expr = Attr("date").lte(to_date)

    # Tag number — tag_number is stored as a STRING, contains() works correctly
    if tag_number:
        tag_expr = Attr("tag_number").contains(tag_number)
        return tag_expr if not filter_expr else filter_expr & tag_expr

    # General search across name, animal_name, mobile
    if search:
        search_title = _to_title(search)
        search_expr = (
            Attr("name").contains(search_title)
            | Attr("animal_name").contains(search_title)
            | Attr("mobile").contains(search)
        )
        filter_expr = search_expr if not filter_expr else filter_expr & search_expr

    # Mobile filter
    if mobile:
        mobile_expr = Attr("mobile").contains(mobile)
        filter_expr = mobile_expr if not filter_expr else filter_expr & mobile_expr

    # Sex filter
    if sex:
        sex_expr = Attr("sex").eq(_to_title(sex))
        filter_expr = sex_expr if not filter_expr else filter_expr & sex_expr

    # Breed filter
    if breed:
        breed_expr = Attr("breed").eq(_to_title(breed))
        filter_expr = breed_expr if not filter_expr else filter_expr & breed_expr

    return filter_expr


def _resolve_photo_url(item: dict) -> dict:
    item["photo_url"] = generate_presigned_url(BUCKET, item.pop("photo_key", None))
    item.pop("PK", None)
    item.pop("SK", None)
    return item


def create_admit_form(event):
    body = json.loads(event.get("body") or "{}")
    tag_number = _get_next_tag_number()
    now = datetime.utcnow().isoformat()

    photo_key = upload_photo(BUCKET, PHOTO_FOLDER, str(tag_number), body.get("photo"))

    item = {
        "PK": f"ADMIT#{tag_number}",
        "SK": "METADATA",
        "record_type": "ADMIT",
        # ── Stored as string so DynamoDB contains() works correctly ──
        "tag_number": str(tag_number),
        "name": _to_title(body.get("name")),
        "animal_name": _to_title(body.get("animal_name")),
        "mobile": body.get("mobile"),
        "photo_key": photo_key,
        "address": _to_title(body.get("address")),
        "diagnosis": _to_title(body.get("diagnosis")),
        "date": body.get("date"),
        "animal_injury": _to_title(body.get("animal_injury")),
        "sex": _to_title(body.get("sex")),
        "age": body.get("age"),
        "body_colour": _to_title(body.get("body_colour")),
        "breed": _to_title(body.get("breed")),
        "time": body.get("time"),
        "present_dr": _to_title(body.get("present_dr")),
        "present_staff": _to_title(body.get("present_staff")),
        "created_by": body.get("created_by"),
        "created_at": now,
        "updated_at": now,
    }

    table.put_item(Item=item)
    logger.info("Admit form created: tag_number=%s", tag_number)

    return json_response(201, {
        "message": "Form created",
        "tag_number": tag_number,
        "photo_url": generate_presigned_url(BUCKET, photo_key),
    })


def update_admit_form(tag_number: str, event):
    body = json.loads(event.get("body") or "{}")

    if not body:
        return json_response(400, {"message": "No fields to update"})

    now = datetime.utcnow().isoformat()

    if "photo" in body:
        photo_key = upload_photo(BUCKET, PHOTO_FOLDER, str(tag_number), body.pop("photo"))
        body["photo_key"] = photo_key

    for field in _TITLE_CASE_FIELDS:
        if field in body and body[field]:
            body[field] = _to_title(body[field])

    update_parts = ["#updated_at = :updated_at"]
    expr_attr = {":updated_at": now}
    expr_names = {"#updated_at": "updated_at"}

    for key, value in body.items():
        expr_names[f"#{key}"] = key
        expr_attr[f":{key}"] = value
        update_parts.append(f"#{key} = :{key}")

    try:
        table.update_item(
            Key={"PK": f"ADMIT#{tag_number}", "SK": "METADATA"},
            UpdateExpression="SET " + ", ".join(update_parts),
            ConditionExpression="attribute_exists(PK)",
            ExpressionAttributeValues=expr_attr,
            ExpressionAttributeNames=expr_names,
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return json_response(404, {"message": "Form not found"})
        logger.exception("Failed to update admit form: tag_number=%s", tag_number)
        return json_response(500, {"message": "Update failed"})

    logger.info("Admit form updated: tag_number=%s", tag_number)
    return json_response(200, {"message": "Form updated"})


def delete_admit_form(tag_number: str):
    try:
        table.delete_item(
            Key={"PK": f"ADMIT#{tag_number}", "SK": "METADATA"},
            ConditionExpression="attribute_exists(PK)",
        )
        logger.info("Admit form deleted: tag_number=%s", tag_number)
        return json_response(200, {"message": "Form deleted successfully"})

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return json_response(404, {"message": "Form not found"})
        logger.exception("Failed to delete admit form: tag_number=%s", tag_number)
        return json_response(500, {"message": "Delete failed", "error": str(e)})


def get_admit_form_by_id(tag_number: str):
    result = table.get_item(Key={"PK": f"ADMIT#{tag_number}", "SK": "METADATA"})

    if "Item" not in result:
        return json_response(404, {"message": "Form not found"})

    return json_response(200, _resolve_photo_url(result["Item"]))


def get_all_admit_forms(event):
    query_params = event.get("queryStringParameters") or {}
    page = int(query_params.get("page", 1))
    page_size = int(query_params.get("pageSize", 20))
    status = query_params.get("status", "")

    logger.info(
        "Fetching all admit forms: page=%d page_size=%d params=%s",
        page, page_size, query_params,
    )

    ddb_params = {
        "IndexName": "sk-index",
        "KeyConditionExpression": Key("SK").eq("METADATA"),
    }

    filter_expr = _build_filter_expression(query_params)
    if filter_expr is not None:
        ddb_params["FilterExpression"] = filter_expr

    all_items = []
    last_key = None
    while True:
        if last_key:
            ddb_params["ExclusiveStartKey"] = last_key
        result = table.query(**ddb_params)
        all_items.extend(result.get("Items", []))
        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            break

    if status:
        discharge_items = []
        last_key = None
        while True:
            scan_params = {
                "FilterExpression": Attr("SK").begins_with("SUMMARY#") & Attr("status").eq(status)
            }
            if last_key:
                scan_params["ExclusiveStartKey"] = last_key
            result = table.scan(**scan_params)
            discharge_items.extend(result.get("Items", []))
            last_key = result.get("LastEvaluatedKey")
            if not last_key:
                break

        tag_numbers = {item["PK"].replace("ADMIT#", "") for item in discharge_items}
        all_items = [item for item in all_items if str(item.get("tag_number")) in tag_numbers]

    all_items.sort(key=lambda x: int(x.get("tag_number") or 0), reverse=True)

    for item in all_items:
        _resolve_photo_url(item)

    total_records = len(all_items)
    start = (page - 1) * page_size
    total_pages = (total_records + page_size - 1) // page_size

    return json_response(200, {
        "data": all_items[start: start + page_size],
        "pagination": {
            "totalRecords": total_records,
            "currentPage": page,
            "pageSize": page_size,
            "totalPages": total_pages,
        },
    })