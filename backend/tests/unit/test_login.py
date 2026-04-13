import json
from unittest.mock import MagicMock, patch

import pytest

from functions.auth.login import lambda_handler, login


def _event(body: dict) -> dict:
    return {"body": json.dumps(body)}


@patch("functions.auth.login.table")
class TestLogin:
    def test_success(self, mock_table):
        hashed = b"$2b$10$fakehash"
        mock_table.query.return_value = {
            "Items": [{
                "user_id": "uid-1",
                "username": "9876543210",
                "role": "staff",
                "password": hashed.decode(),
                "is_active": True,
            }]
        }
        with patch("functions.auth.login.bcrypt.checkpw", return_value=True):
            response = login({"username": "9876543210", "password": "pass123"})

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["user_id"] == "uid-1"
        assert body["username"] == "9876543210"
        assert body["role"] == "staff"
        assert "password" not in body

    def test_missing_username_returns_400(self, mock_table):
        response = login({"password": "pass123"})
        assert response["statusCode"] == 400

    def test_missing_password_returns_400(self, mock_table):
        response = login({"username": "9876543210"})
        assert response["statusCode"] == 400

    def test_user_not_found_returns_401(self, mock_table):
        mock_table.query.return_value = {"Items": []}
        response = login({"username": "9876543210", "password": "pass123"})
        assert response["statusCode"] == 401

    def test_deactivated_user_returns_401(self, mock_table):
        mock_table.query.return_value = {
            "Items": [{
                "user_id": "uid-1",
                "username": "9876543210",
                "role": "staff",
                "password": "hash",
                "is_active": False,
            }]
        }
        response = login({"username": "9876543210", "password": "pass123"})
        assert response["statusCode"] == 401
        assert "deactivated" in json.loads(response["body"])["message"].lower()

    def test_wrong_password_returns_401(self, mock_table):
        mock_table.query.return_value = {
            "Items": [{
                "user_id": "uid-1",
                "username": "9876543210",
                "role": "staff",
                "password": "hash",
                "is_active": True,
            }]
        }
        with patch("functions.auth.login.bcrypt.checkpw", return_value=False):
            response = login({"username": "9876543210", "password": "wrong"})

        assert response["statusCode"] == 401


@patch("functions.auth.login.table")
class TestLoginLambdaHandler:
    def test_routes_to_login(self, mock_table):
        mock_table.query.return_value = {"Items": []}
        response = lambda_handler(_event({"username": "x", "password": "y"}), {})
        assert response["statusCode"] == 401  # user not found, not 500

    def test_empty_body_returns_400(self, mock_table):
        event = {"body": None}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 400
