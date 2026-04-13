import json
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError

from functions.admit_forms.handler import (
    lambda_handler,
    create_admit_form,
    get_admit_form_by_id,
    get_all_admit_forms,
    update_admit_form,
    delete_admit_form,
    _to_title,
)


def _post_event(body: dict) -> dict:
    return {"httpMethod": "POST", "pathParameters": None, "body": json.dumps(body)}


def _get_event(tag_number: str = None, params: dict = None) -> dict:
    return {
        "httpMethod": "GET",
        "pathParameters": {"tag_number": tag_number} if tag_number else None,
        "queryStringParameters": params or {},
        "body": None,
    }


class TestToTitle:
    def test_converts_to_title_case(self):
        assert _to_title("ramesh patel") == "Ramesh Patel"

    def test_strips_whitespace(self):
        assert _to_title("  tommy  ") == "Tommy"

    def test_none_returns_none(self):
        assert _to_title(None) is None

    def test_empty_string_returns_empty(self):
        assert _to_title("") == ""


@patch("functions.admit_forms.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.admit_forms.handler.upload_photo", return_value="admit-photos/1.jpg")
@patch("functions.admit_forms.handler.table")
class TestCreateAdmitForm:
    def test_success(self, mock_table, mock_upload, mock_presigned):
        mock_table.update_item.return_value = {"Attributes": {"current_value": 1}}
        event = _post_event({
            "name": "ramesh patel",
            "animal_name": "tommy",
            "date": "2026-03-20",
            "sex": "male",
            "breed": "labrador",
            "created_by": "uid-1",
        })

        response = create_admit_form(event)

        assert response["statusCode"] == 201
        body = json.loads(response["body"])
        assert body["tag_number"] == 1
        assert body["photo_url"] == "https://presigned"

    def test_stores_fields_in_title_case(self, mock_table, mock_upload, mock_presigned):
        mock_table.update_item.return_value = {"Attributes": {"current_value": 2}}
        event = _post_event({"name": "ramesh patel", "animal_name": "tommy", "breed": "labrador"})

        create_admit_form(event)

        put_call = mock_table.put_item.call_args[1]["Item"]
        assert put_call["name"] == "Ramesh Patel"
        assert put_call["animal_name"] == "Tommy"
        assert put_call["breed"] == "Labrador"

    def test_tag_number_is_sequential(self, mock_table, mock_upload, mock_presigned):
        mock_table.update_item.return_value = {"Attributes": {"current_value": 42}}
        response = create_admit_form(_post_event({}))

        body = json.loads(response["body"])
        assert body["tag_number"] == 42


@patch("functions.admit_forms.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.admit_forms.handler.table")
class TestGetAdmitFormById:
    def test_found(self, mock_table, mock_presigned):
        mock_table.get_item.return_value = {
            "Item": {
                "PK": "ADMIT#1", "SK": "METADATA",
                "tag_number": "1", "name": "Ramesh Patel",
                "photo_key": "admit-photos/1.jpg",
            }
        }
        response = get_admit_form_by_id("1")

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["tag_number"] == "1"
        assert body["photo_url"] == "https://presigned"
        assert "photo_key" not in body

    def test_not_found_returns_404(self, mock_table, mock_presigned):
        mock_table.get_item.return_value = {}
        response = get_admit_form_by_id("999")
        assert response["statusCode"] == 404


@patch("functions.admit_forms.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.admit_forms.handler.table")
class TestGetAllAdmitForms:
    def _make_items(self, count: int):
        return [
            {"PK": f"ADMIT#{i}", "SK": "METADATA", "tag_number": str(i), "photo_key": f"key/{i}.jpg"}
            for i in range(1, count + 1)
        ]

    def test_returns_paginated_results(self, mock_table, mock_presigned):
        mock_table.query.return_value = {"Items": self._make_items(5)}
        event = _get_event(params={"page": "1", "pageSize": "3"})

        response = get_all_admit_forms(event)

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert len(body["data"]) == 3
        assert body["pagination"]["totalRecords"] == 5
        assert body["pagination"]["totalPages"] == 2
        assert body["pagination"]["currentPage"] == 1

    def test_second_page(self, mock_table, mock_presigned):
        mock_table.query.return_value = {"Items": self._make_items(5)}
        event = _get_event(params={"page": "2", "pageSize": "3"})

        response = get_all_admit_forms(event)

        body = json.loads(response["body"])
        assert len(body["data"]) == 2
        assert body["pagination"]["currentPage"] == 2

    def test_photo_key_replaced_with_photo_url(self, mock_table, mock_presigned):
        mock_table.query.return_value = {"Items": self._make_items(1)}
        response = get_all_admit_forms(_get_event())

        body = json.loads(response["body"])
        item = body["data"][0]
        assert "photo_url" in item
        assert "photo_key" not in item

    def test_empty_results(self, mock_table, mock_presigned):
        mock_table.query.return_value = {"Items": []}
        response = get_all_admit_forms(_get_event())

        body = json.loads(response["body"])
        assert body["data"] == []
        assert body["pagination"]["totalRecords"] == 0

    def test_results_sorted_by_tag_number_descending(self, mock_table, mock_presigned):
        mock_table.query.return_value = {"Items": self._make_items(3)}
        response = get_all_admit_forms(_get_event())

        body = json.loads(response["body"])
        tag_numbers = [int(item["tag_number"]) for item in body["data"]]
        assert tag_numbers == sorted(tag_numbers, reverse=True)


@patch("functions.admit_forms.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.admit_forms.handler.upload_photo", return_value="admit-photos/1.jpg")
@patch("functions.admit_forms.handler.table")
class TestUpdateAdmitForm:
    def test_success(self, mock_table, mock_upload, mock_presigned):
        event = {"body": json.dumps({"name": "new name", "breed": "poodle"})}
        response = update_admit_form("1", event)

        assert response["statusCode"] == 200
        mock_table.update_item.assert_called_once()

    def test_applies_title_case_on_update(self, mock_table, mock_upload, mock_presigned):
        event = {"body": json.dumps({"name": "jane doe", "breed": "poodle"})}
        update_admit_form("1", event)

        call_kwargs = mock_table.update_item.call_args[1]
        assert call_kwargs["ExpressionAttributeValues"][":name"] == "Jane Doe"
        assert call_kwargs["ExpressionAttributeValues"][":breed"] == "Poodle"

    def test_empty_body_returns_400(self, mock_table, mock_upload, mock_presigned):
        event = {"body": "{}"}
        response = update_admit_form("1", event)
        assert response["statusCode"] == 400

    def test_photo_update_calls_upload(self, mock_table, mock_upload, mock_presigned):
        import base64
        photo_b64 = base64.b64encode(b"img").decode()
        event = {"body": json.dumps({"photo": photo_b64})}
        update_admit_form("1", event)
        mock_upload.assert_called_once()


@patch("functions.admit_forms.handler.table")
class TestDeleteAdmitForm:
    def test_success(self, mock_table):
        mock_table.delete_item.return_value = {}
        response = delete_admit_form("1")
        assert response["statusCode"] == 200

    def test_not_found_returns_404(self, mock_table):
        error_response = {"Error": {"Code": "ConditionalCheckFailedException"}}
        mock_table.delete_item.side_effect = ClientError(error_response, "DeleteItem")
        response = delete_admit_form("999")
        assert response["statusCode"] == 404


@patch("functions.admit_forms.handler.generate_presigned_url", return_value="https://presigned")
@patch("functions.admit_forms.handler.upload_photo", return_value=None)
@patch("functions.admit_forms.handler.table")
class TestAdmitFormLambdaHandler:
    def test_get_all(self, mock_table, mock_upload, mock_presigned):
        mock_table.query.return_value = {"Items": []}
        event = {"httpMethod": "GET", "pathParameters": None, "queryStringParameters": {}, "body": None}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 200

    def test_get_by_tag(self, mock_table, mock_upload, mock_presigned):
        mock_table.get_item.return_value = {}
        event = {"httpMethod": "GET", "pathParameters": {"tag_number": "1"}, "queryStringParameters": {}, "body": None}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 404

    def test_unsupported_method_returns_405(self, mock_table, mock_upload, mock_presigned):
        event = {"httpMethod": "PUT", "pathParameters": None, "body": None}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 405
