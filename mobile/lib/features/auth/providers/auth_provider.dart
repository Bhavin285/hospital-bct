import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/cognito_service.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthProvider extends ChangeNotifier {
  final CognitoService _cognito = CognitoService();

  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  String? _error;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isAdmin => _user?.isAdmin ?? false;

  Future<void> checkSession() async {
    _status = AuthStatus.loading;
    notifyListeners();

    try {
      final hasSession = await _cognito.hasValidSession();
      if (hasSession) {
        _user = await _cognito.getStoredUser();
        _status = _user != null
            ? AuthStatus.authenticated
            : AuthStatus.unauthenticated;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (_) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _status = AuthStatus.loading;
    _error = null;
    notifyListeners();

    try {
      _user = await _cognito.login(username, password);
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = _mapError(e.toString());
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _cognito.logout();
    } catch (_) {
    } finally {
      _user = null;
      _status = AuthStatus.unauthenticated;
      _error = null;
      notifyListeners(); 
    }
  }

  Future<void> changePassword(
    String oldPassword,
    String newPassword,
  ) async {
    await _cognito.changePassword(oldPassword, newPassword);
  }

  String _mapError(String raw) {
    if (raw.contains('NotAuthorizedException') ||
        raw.contains('Incorrect username or password')) {
      return 'Incorrect username or password.';
    }
    if (raw.contains('UserNotFoundException')) {
      return 'User not found.';
    }
    if (raw.contains('UserNotConfirmedException')) {
      return 'Account not confirmed.';
    }
    if (raw.contains('NEW_PASSWORD_REQUIRED')) {
      return 'Password change required. Contact admin.';
    }
    if (raw.contains('SocketException') || raw.contains('Network')) {
      return 'Network error. Check your connection.';
    }
    return raw.replaceFirst('Exception: ', '');
  }
}