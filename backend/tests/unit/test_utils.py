import base64
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

import utils.s3_helper as s3_helper
from utils.response import json_response


class TestJsonResponse:
    def test_status_code(self):
        r = json_response(200, {"key": "value"})
        assert r["statusCode"] == 200

    def test_body_serialized_to_string(self):
        r = json_response(201, {"message": "ok"})
        body = json.loads(r["body"])
        assert body["message"] == "ok"

    def test_content_type_header(self):
        r = json_response(200, {})
        assert r["headers"]["Content-Type"] == "application/json"

    def test_decimal_serialized_as_string(self):
        r = json_response(200, {"amount": Decimal("3.14")})
        body = json.loads(r["body"])
        assert body["amount"] == "3.14"

    def test_various_status_codes(self):
        for code in [200, 201, 400, 401, 403, 404, 500]:
            assert json_response(code, {})["statusCode"] == code


class TestUploadPhoto:
    def test_none_returns_none(self):
        assert s3_helper.upload_photo("bucket", "folder", "file", None) is None

    def test_empty_string_returns_none(self):
        assert s3_helper.upload_photo("bucket", "folder", "file", "") is None

    def test_jpeg_upload_returns_key(self):
        mock_client = MagicMock()
        with patch("utils.s3_helper._get_s3_client", return_value=mock_client):
            photo = base64.b64encode(b"fake-jpeg-data").decode()
            key = s3_helper.upload_photo("my-bucket", "admit-photos", "42", photo)

        assert key == "admit-photos/42.jpg"
        call_kwargs = mock_client.put_object.call_args[1]
        assert call_kwargs["Bucket"] == "my-bucket"
        assert call_kwargs["Key"] == "admit-photos/42.jpg"
        assert call_kwargs["ContentType"] == "image/jpeg"

    def test_png_upload_uses_png_extension(self):
        mock_client = MagicMock()
        with patch("utils.s3_helper._get_s3_client", return_value=mock_client):
            photo = "data:image/png;base64," + base64.b64encode(b"fake-png").decode()
            key = s3_helper.upload_photo("my-bucket", "admit-photos", "42", photo)

        assert key == "admit-photos/42.png"
        call_kwargs = mock_client.put_object.call_args[1]
        assert call_kwargs["ContentType"] == "image/png"

    def test_s3_exception_returns_none(self):
        mock_client = MagicMock()
        mock_client.put_object.side_effect = Exception("S3 error")
        with patch("utils.s3_helper._get_s3_client", return_value=mock_client):
            photo = base64.b64encode(b"data").decode()
            result = s3_helper.upload_photo("bucket", "folder", "file", photo)

        assert result is None


class TestGeneratePresignedUrl:
    def test_none_key_returns_none(self):
        assert s3_helper.generate_presigned_url("bucket", None) is None

    def test_empty_key_returns_none(self):
        assert s3_helper.generate_presigned_url("bucket", "") is None

    def test_returns_presigned_url(self):
        mock_client = MagicMock()
        mock_client.generate_presigned_url.return_value = "https://presigned-url"
        with patch("utils.s3_helper._get_s3_client", return_value=mock_client):
            url = s3_helper.generate_presigned_url("my-bucket", "admit-photos/42.jpg")

        assert url == "https://presigned-url"
        mock_client.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "my-bucket", "Key": "admit-photos/42.jpg"},
            ExpiresIn=3600,
        )

    def test_s3_exception_returns_none(self):
        mock_client = MagicMock()
        mock_client.generate_presigned_url.side_effect = Exception("S3 error")
        with patch("utils.s3_helper._get_s3_client", return_value=mock_client):
            result = s3_helper.generate_presigned_url("bucket", "key.jpg")

        assert result is None
