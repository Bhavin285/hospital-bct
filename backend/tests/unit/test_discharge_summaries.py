import json
from unittest.mock import MagicMock, patch

from functions.discharge_summaries.handler import (
    lambda_handler,
    create_discharge_summary,
    get_discharge_summaries,
)


def _post_event(body: dict) -> dict:
    return {"httpMethod": "POST", "pathParameters": None, "body": json.dumps(body)}


@patch("functions.discharge_summaries.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.discharge_summaries.handler.upload_photo", return_value="discharge-photos/1_ts.jpg")
@patch("functions.discharge_summaries.handler.table")
class TestCreateDischargeSummary:
    def test_success(self, mock_table, mock_upload, mock_presigned):
        event = _post_event({
            "tag_number": "1",
            "status": "recover",
            "description": "Animal recovered",
            "created_by": "uid-1",
        })

        response = create_discharge_summary(event)

        assert response["statusCode"] == 201
        body = json.loads(response["body"])
        assert body["tag_number"] == "1"
        assert body["status"] == "recover"
        assert body["photo"] == "https://presigned"
        assert "photo_key" not in body

    def test_all_valid_statuses(self, mock_table, mock_upload, mock_presigned):
        for status in ["re_open", "recover", "release", "death"]:
            event = _post_event({"tag_number": "1", "status": status})
            response = create_discharge_summary(event)
            assert response["statusCode"] == 201, f"Failed for status: {status}"

    def test_missing_tag_number_returns_400(self, mock_table, mock_upload, mock_presigned):
        event = _post_event({"status": "recover"})
        response = create_discharge_summary(event)
        assert response["statusCode"] == 400

    def test_missing_status_returns_400(self, mock_table, mock_upload, mock_presigned):
        event = _post_event({"tag_number": "1"})
        response = create_discharge_summary(event)
        assert response["statusCode"] == 400

    def test_invalid_status_returns_400(self, mock_table, mock_upload, mock_presigned):
        event = _post_event({"tag_number": "1", "status": "invalid_status"})
        response = create_discharge_summary(event)

        assert response["statusCode"] == 400
        assert "Invalid status" in json.loads(response["body"])["message"]

    def test_pk_and_sk_not_in_response(self, mock_table, mock_upload, mock_presigned):
        event = _post_event({"tag_number": "1", "status": "recover"})
        response = create_discharge_summary(event)

        body = json.loads(response["body"])
        assert "PK" not in body
        assert "SK" not in body


@patch("functions.discharge_summaries.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.discharge_summaries.handler.table")
class TestGetDischargeSummaries:
    def test_success_returns_list(self, mock_table, mock_presigned):
        mock_table.query.return_value = {
            "Items": [
                {"PK": "ADMIT#1", "SK": "SUMMARY#ts1", "tag_number": "1", "status": "recover", "photo_key": "key1.jpg"},
                {"PK": "ADMIT#1", "SK": "SUMMARY#ts2", "tag_number": "1", "status": "re_open", "photo_key": "key2.jpg"},
            ]
        }

        response = get_discharge_summaries("1")

        assert response["statusCode"] == 200
        items = json.loads(response["body"])
        assert len(items) == 2
        assert items[0]["photo"] == "https://presigned"

    def test_photo_key_replaced_with_photo(self, mock_table, mock_presigned):
        mock_table.query.return_value = {
            "Items": [{"tag_number": "1", "status": "recover", "photo_key": "key.jpg"}]
        }

        response = get_discharge_summaries("1")

        item = json.loads(response["body"])[0]
        assert "photo" in item
        assert "photo_key" not in item

    def test_empty_list_for_no_summaries(self, mock_table, mock_presigned):
        mock_table.query.return_value = {"Items": []}
        response = get_discharge_summaries("99")

        assert response["statusCode"] == 200
        assert json.loads(response["body"]) == []

    def test_missing_tag_number_returns_400(self, mock_table, mock_presigned):
        response = get_discharge_summaries(None)
        assert response["statusCode"] == 400

    def test_empty_tag_number_returns_400(self, mock_table, mock_presigned):
        response = get_discharge_summaries("")
        assert response["statusCode"] == 400


@patch("functions.discharge_summaries.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.discharge_summaries.handler.upload_photo", return_value=None)
@patch("functions.discharge_summaries.handler.table")
class TestDischargeSummaryLambdaHandler:
    def test_post_routes_to_create(self, mock_table, mock_upload, mock_presigned):
        event = {"httpMethod": "POST", "pathParameters": None, "body": json.dumps({"tag_number": "1", "status": "recover"})}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 201

    def test_get_routes_to_get(self, mock_table, mock_upload, mock_presigned):
        mock_table.query.return_value = {"Items": []}
        event = {"httpMethod": "GET", "pathParameters": {"tag_number": "1"}, "body": None}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 200

    def test_unsupported_method_returns_405(self, mock_table, mock_upload, mock_presigned):
        event = {"httpMethod": "DELETE", "pathParameters": None, "body": None}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 405
