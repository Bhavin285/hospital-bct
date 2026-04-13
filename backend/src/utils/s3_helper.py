import base64
import logging

import boto3

logger = logging.getLogger(__name__)

REGION = "ap-south-1"
PRESIGNED_URL_EXPIRY = 43200  # 12 hours

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            region_name=REGION,
            endpoint_url=f"https://s3.{REGION}.amazonaws.com",
        )
    return _s3_client


def upload_photo(bucket: str, folder: str, filename: str, base64_photo: str):
    """
    Upload a base64-encoded image to S3.
    Returns the S3 object key on success, None if no photo provided or on error.
    """
    if not base64_photo:
        return None

    try:
        content_type = "image/jpeg"
        extension = "jpg"

        if "base64," in base64_photo:
            header, base64_photo = base64_photo.split("base64,", 1)
            if "png" in header:
                content_type = "image/png"
                extension = "png"

        image_data = base64.b64decode(base64_photo)
        key = f"{folder}/{filename}.{extension}"

        _get_s3_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=image_data,
            ContentType=content_type,
        )

        logger.info("Photo uploaded: bucket=%s key=%s", bucket, key)
        return key

    except Exception:
        logger.exception("Failed to upload photo to s3://%s/%s/", bucket, folder)
        return None


def generate_presigned_url(bucket: str, s3_key: str):
    """
    Generate a temporary pre-signed GET URL for a private S3 object.
    Returns None if no key provided or on error.
    """
    if not s3_key:
        return None

    try:
        return _get_s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": s3_key},
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
    except Exception:
        logger.exception("Failed to generate presigned URL: bucket=%s key=%s", bucket, s3_key)
        return None
