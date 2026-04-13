import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants/app_constants.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  Future<void> saveIdToken(String token) async {
    await _storage.write(key: AppConstants.keyIdToken, value: token);
  }

  Future<void> saveAccessToken(String token) async {
    await _storage.write(key: AppConstants.keyAccessToken, value: token);
  }

  Future<String?> getIdToken() async {
    return _storage.read(key: AppConstants.keyIdToken);
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: AppConstants.keyAccessToken);
  }

  Future<void> saveUser(Map<String, dynamic> user) async {
    await _storage.write(
      key: AppConstants.keyUser,
      value: json.encode(user),
    );
  }

  Future<Map<String, dynamic>?> getUser() async {
    final data = await _storage.read(key: AppConstants.keyUser);
    if (data == null) return null;
    try {
      return json.decode(data) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  Future<bool> hasValidSession() async {
    final token = await getIdToken();
    if (token == null || token.isEmpty) return false;
    return !_isTokenExpired(token);
  }

  bool _isTokenExpired(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;
      final payload = parts[1];
      final padded = payload.padRight(
        payload.length + (4 - payload.length % 4) % 4,
        '=',
      );
      final decoded = utf8.decode(base64Url.decode(padded));
      final claims = json.decode(decoded) as Map<String, dynamic>;
      final exp = claims['exp'] as int?;
      if (exp == null) return true;
      // 30s buffer
      return DateTime.now().millisecondsSinceEpoch >= (exp - 30) * 1000;
    } catch (_) {
      return true;
    }
  }
}
