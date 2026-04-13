import json
from unittest.mock import MagicMock, patch

from functions.users.handler import lambda_handler, create_user, get_user, update_user, delete_user


def _event(method: str, body: dict = None, params: dict = None) -> dict:
    return {
        "httpMethod": method,
        "body": json.dumps(body) if body else None,
        "queryStringParameters": params or {},
    }


@patch("functions.users.handler.table")
class TestCreateUser:
    def test_success(self, mock_table):
        mock_table.query.return_value = {"Count": 0, "Items": []}
        with patch("functions.users.handler.bcrypt.hashpw", return_value=b"hashed"):
            response = create_user({"username": "9876543210", "password": "pass123", "role": "admin"})

        assert response["statusCode"] == 201
        body = json.loads(response["body"])
        assert body["data"]["username"] == "9876543210"
        assert body["data"]["role"] == "admin"
        assert body["data"]["is_active"] is True
        assert "password" not in body["data"]

    def test_default_role_is_staff(self, mock_table):
        mock_table.query.return_value = {"Count": 0, "Items": []}
        with patch("functions.users.handler.bcrypt.hashpw", return_value=b"hashed"):
            response = create_user({"username": "9876543210", "password": "pass123"})

        body = json.loads(response["body"])
        assert body["data"]["role"] == "staff"

    def test_missing_username_returns_400(self, mock_table):
        response = create_user({"password": "pass123"})
        assert response["statusCode"] == 400

    def test_missing_password_returns_400(self, mock_table):
        response = create_user({"username": "9876543210"})
        assert response["statusCode"] == 400

    def test_duplicate_username_returns_400(self, mock_table):
        mock_table.query.return_value = {"Count": 1, "Items": [{"user_id": "existing"}]}
        response = create_user({"username": "9876543210", "password": "pass123"})

        assert response["statusCode"] == 400
        assert "already exists" in json.loads(response["body"])["message"]


@patch("functions.users.handler.table")
class TestGetUser:
    def test_get_by_user_id(self, mock_table):
        mock_table.get_item.return_value = {
            "Item": {"user_id": "uid-1", "username": "9876543210", "role": "staff", "password": "hash", "is_active": True}
        }
        response = get_user({"user_id": "uid-1"})

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["user_id"] == "uid-1"
        assert "password" not in body

    def test_get_by_user_id_not_found(self, mock_table):
        mock_table.get_item.return_value = {}
        response = get_user({"user_id": "nonexistent"})
        assert response["statusCode"] == 404

    def test_get_all_users(self, mock_table):
        mock_table.scan.return_value = {
            "Items": [
                {"user_id": "uid-1", "username": "111", "password": "hash1", "role": "admin", "is_active": True},
                {"user_id": "uid-2", "username": "222", "password": "hash2", "role": "staff", "is_active": True},
            ]
        }
        response = get_user({})

        assert response["statusCode"] == 200
        users = json.loads(response["body"])
        assert len(users) == 2
        for user in users:
            assert "password" not in user


@patch("functions.users.handler.table")
class TestUpdateUser:
    def test_update_username(self, mock_table):
        response = update_user({"user_id": "uid-1", "username": "new_name"})
        assert response["statusCode"] == 200
        mock_table.update_item.assert_called_once()

    def test_update_role(self, mock_table):
        response = update_user({"user_id": "uid-1", "role": "admin"})
        assert response["statusCode"] == 200

    def test_missing_user_id_returns_400(self, mock_table):
        response = update_user({"username": "new_name"})
        assert response["statusCode"] == 400

    def test_no_update_fields_returns_400(self, mock_table):
        response = update_user({"user_id": "uid-1"})
        assert response["statusCode"] == 400


@patch("functions.users.handler.table")
class TestDeleteUser:
    def test_soft_delete(self, mock_table):
        response = delete_user({"user_id": "uid-1"})
        assert response["statusCode"] == 200
        call_kwargs = mock_table.update_item.call_args[1]
        assert call_kwargs["ExpressionAttributeValues"][":val"] is False

    def test_missing_user_id_returns_400(self, mock_table):
        response = delete_user({})
        assert response["statusCode"] == 400


@patch("functions.users.handler.table")
class TestLambdaHandler:
    def test_post_routes_to_create(self, mock_table):
        mock_table.query.return_value = {"Count": 0, "Items": []}
        with patch("functions.users.handler.bcrypt.hashpw", return_value=b"h"):
            response = lambda_handler(_event("POST", {"username": "x", "password": "y"}), {})
        assert response["statusCode"] == 201

    def test_get_routes_to_get(self, mock_table):
        mock_table.scan.return_value = {"Items": []}
        response = lambda_handler(_event("GET"), {})
        assert response["statusCode"] == 200

    def test_delete_routes_to_delete(self, mock_table):
        response = lambda_handler(_event("DELETE", params={"user_id": "uid-1"}), {})
        assert response["statusCode"] == 200

    def test_unsupported_method_returns_405(self, mock_table):
        response = lambda_handler(_event("PUT"), {})
        assert response["statusCode"] == 405
