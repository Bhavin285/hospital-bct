import json
from unittest.mock import MagicMock, patch, call

from functions.auth.change_password import lambda_handler, change_password


def _make_user(user_id: str, role: str, password: str = "hashed_pw") -> dict:
    return {"user_id": user_id, "username": "9999999999", "role": role, "password": password}


@patch("functions.auth.change_password.table")
class TestChangePassword:
    def test_admin_changes_any_password_without_old_password(self, mock_table):
        admin = _make_user("admin-1", "admin")
        user = _make_user("user-1", "staff")
        mock_table.get_item.side_effect = [
            {"Item": admin},  # requester lookup
            {"Item": user},   # target user lookup
        ]
        with patch("functions.auth.change_password.bcrypt.hashpw", return_value=b"newhash"):
            response = change_password({
                "user_id": "user-1",
                "new_password": "newpass",
                "requester_id": "admin-1",
            })

        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["user_id"] == "user-1"

    def test_staff_changes_own_password_with_correct_old_password(self, mock_table):
        staff = _make_user("staff-1", "staff", "stored_hash")
        mock_table.get_item.side_effect = [
            {"Item": staff},  # requester
            {"Item": staff},  # target user
        ]
        with patch("functions.auth.change_password.bcrypt.checkpw", return_value=True), \
             patch("functions.auth.change_password.bcrypt.hashpw", return_value=b"newhash"):
            response = change_password({
                "user_id": "staff-1",
                "new_password": "newpass",
                "requester_id": "staff-1",
                "old_password": "oldpass",
            })

        assert response["statusCode"] == 200

    def test_staff_without_old_password_returns_400(self, mock_table):
        staff = _make_user("staff-1", "staff")
        user = _make_user("user-2", "staff")
        mock_table.get_item.side_effect = [{"Item": staff}, {"Item": user}]

        response = change_password({
            "user_id": "user-2",
            "new_password": "newpass",
            "requester_id": "staff-1",
        })

        assert response["statusCode"] == 400

    def test_staff_wrong_old_password_returns_401(self, mock_table):
        staff = _make_user("staff-1", "staff", "stored_hash")
        mock_table.get_item.side_effect = [{"Item": staff}, {"Item": staff}]

        with patch("functions.auth.change_password.bcrypt.checkpw", return_value=False):
            response = change_password({
                "user_id": "staff-1",
                "new_password": "newpass",
                "requester_id": "staff-1",
                "old_password": "wrong",
            })

        assert response["statusCode"] == 401

    def test_missing_required_fields_returns_400(self, mock_table):
        response = change_password({"user_id": "uid-1", "new_password": "x"})
        assert response["statusCode"] == 400

        response = change_password({"user_id": "uid-1", "requester_id": "req-1"})
        assert response["statusCode"] == 400

        response = change_password({"new_password": "x", "requester_id": "req-1"})
        assert response["statusCode"] == 400

    def test_requester_not_found_returns_404(self, mock_table):
        mock_table.get_item.return_value = {"Item": None}
        mock_table.get_item.return_value = {}  # no Item key

        response = change_password({
            "user_id": "uid-1",
            "new_password": "newpass",
            "requester_id": "nonexistent",
        })

        assert response["statusCode"] == 404

    def test_user_not_found_returns_404(self, mock_table):
        admin = _make_user("admin-1", "admin")
        mock_table.get_item.side_effect = [
            {"Item": admin},  # requester found
            {},               # target user not found
        ]

        response = change_password({
            "user_id": "nonexistent",
            "new_password": "newpass",
            "requester_id": "admin-1",
        })

        assert response["statusCode"] == 404


@patch("functions.auth.change_password.table")
class TestChangePasswordLambdaHandler:
    def test_routes_correctly(self, mock_table):
        mock_table.get_item.return_value = {}
        event = {"body": json.dumps({"user_id": "x", "new_password": "y", "requester_id": "z"})}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 404  # requester not found, not 500

    def test_empty_body(self, mock_table):
        event = {"body": None}
        response = lambda_handler(event, {})
        assert response["statusCode"] == 400
