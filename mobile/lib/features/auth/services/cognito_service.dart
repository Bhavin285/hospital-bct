import 'dart:convert';
import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/storage_service.dart';
import '../models/user_model.dart';

class CognitoService {
  static final CognitoService _instance = CognitoService._internal();
  factory CognitoService() => _instance;
  CognitoService._internal();

  final StorageService _storage = StorageService();

  late final CognitoUserPool _userPool = CognitoUserPool(
    AppConstants.cognitoUserPoolId,
    AppConstants.cognitoClientId,
  );

  CognitoUser? _cognitoUser;

  Map<String, dynamic> _decodeToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return {};
      final payload = parts[1];
      final padded = payload.padRight(
        payload.length + (4 - payload.length % 4) % 4,
        '=',
      );
      return json.decode(utf8.decode(base64Url.decode(padded)))
          as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  Future<UserModel> login(String username, String password) async {
    final cognitoUser = CognitoUser(username, _userPool);
    cognitoUser.authenticationFlowType = 'USER_PASSWORD_AUTH';
    final authDetails = AuthenticationDetails(
      username: username,
      password: password,
    );

    final session = await cognitoUser.authenticateUser(authDetails);
    if (session == null) throw Exception('Authentication failed');

    final idToken = session.idToken.jwtToken ?? '';
    final accessToken = session.accessToken.jwtToken ?? '';

    final claims = _decodeToken(idToken);
    final userInfo = UserModel(
      username: claims['cognito:username'] as String? ?? username,
      sub: claims['sub'] as String? ?? '',
      role: UserRole.fromString(
        claims['custom:role'] as String? ?? 'staff',
      ),
    );

    await _storage.saveIdToken(idToken);
    await _storage.saveAccessToken(accessToken);
    await _storage.saveUser(userInfo.toJson());

    _cognitoUser = cognitoUser;
    return userInfo;
  }

  Future<void> logout() async {
    await _storage.clearAll();

    try {
      final userToSignOut = _cognitoUser ?? await _userPool.getCurrentUser();
      if (userToSignOut != null) {
        await userToSignOut.signOut();
      }
    } catch (_) {
    } finally {
      _cognitoUser = null;
    }
  }

  Future<void> changePassword(
    String oldPassword,
    String newPassword,
  ) async {
    CognitoUser? user;
    
    if (_cognitoUser != null) {
      user = _cognitoUser;
    } else {
      user = await _userPool.getCurrentUser();
    }
    
    if (user == null) throw Exception('Not authenticated');

    try {
      final session = await user.getSession();
      if (session == null) throw Exception('Session expired');
      
      await user.changePassword(oldPassword, newPassword);
    } catch (e) {
      throw Exception('Failed to change password: $e');
    }
  }

  Future<UserModel?> getStoredUser() async {
    final userData = await _storage.getUser();
    if (userData == null) return null;
    return UserModel.fromJson(userData);
  }

  Future<bool> hasValidSession() async {
    return await _storage.hasValidSession();
  }
  
  Future<CognitoUserSession?> getCurrentSession() async {
    CognitoUser? user;
    
    if (_cognitoUser != null) {
      user = _cognitoUser;
    } else {
      user = await _userPool.getCurrentUser();
    }
    
    if (user == null) return null;
    
    try {
      return await user.getSession();
    } catch (e) {
      return null;
    }
  }
}