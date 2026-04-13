import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';
import 'storage_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  final StorageService _storage = StorageService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Uri _buildUrl(String path, [Map<String, dynamic>? queryParams]) {
    final uri = Uri.parse('${AppConstants.baseUrl}$path');
    if (queryParams == null || queryParams.isEmpty) return uri;
    final filtered = <String, String>{};
    queryParams.forEach((k, v) {
      if (v != null) filtered[k] = v.toString();
    });
    return uri.replace(queryParameters: filtered);
  }

  Map<String, dynamic> _parseResponse(http.Response response) {
    if (response.statusCode == 401) {
      throw ApiException(401, 'Session expired. Please login again.');
    }
    if (response.statusCode == 403) {
      throw ApiException(403, 'Access denied.');
    }
    if (response.statusCode >= 400) {
      String message = 'Request failed (${response.statusCode})';
      try {
        final body = json.decode(response.body);
        message = body['message'] ?? body['error'] ?? message;
      } catch (_) {}
      throw ApiException(response.statusCode, message);
    }
    if (response.body.isEmpty) return {};
    return json.decode(response.body) as Map<String, dynamic>;
  }

  List<dynamic> _parseListResponse(http.Response response) {
    if (response.statusCode == 401) {
      throw ApiException(401, 'Session expired. Please login again.');
    }
    if (response.statusCode >= 400) {
      String message = 'Request failed (${response.statusCode})';
      try {
        final body = json.decode(response.body);
        message = body['message'] ?? message;
      } catch (_) {}
      throw ApiException(response.statusCode, message);
    }
    if (response.body.isEmpty) return [];
    final decoded = json.decode(response.body);
    if (decoded is List) return decoded;
    return [];
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParams,
  }) async {
    final headers = await _getHeaders();
    final url = _buildUrl(path, queryParams);
    final response = await http
        .get(url, headers: headers)
        .timeout(const Duration(seconds: 30));
    return _parseResponse(response);
  }

  /// Like [get] but returns `dynamic` — handles APIs that return either a
  /// JSON object OR a JSON array without throwing a cast error.
  Future<dynamic> getFlexible(
    String path, {
    Map<String, dynamic>? queryParams,
  }) async {
    final headers = await _getHeaders();
    final url = _buildUrl(path, queryParams);
    final response = await http
        .get(url, headers: headers)
        .timeout(const Duration(seconds: 30));

    if (response.statusCode == 401) {
      throw ApiException(401, 'Session expired. Please login again.');
    }
    if (response.statusCode == 403) {
      throw ApiException(403, 'Access denied.');
    }
    if (response.statusCode >= 400) {
      String message = 'Request failed (${response.statusCode})';
      try {
        final body = json.decode(response.body);
        message = body['message'] ?? body['error'] ?? message;
      } catch (_) {}
      throw ApiException(response.statusCode, message);
    }
    if (response.body.isEmpty) return <String, dynamic>{};
    return json.decode(response.body);
  }

  Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? queryParams,
  }) async {
    final headers = await _getHeaders();
    final url = _buildUrl(path, queryParams);
    final response = await http
        .get(url, headers: headers)
        .timeout(const Duration(seconds: 30));
    return _parseListResponse(response);
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final headers = await _getHeaders();
    final url = _buildUrl(path);
    final response = await http
        .post(url, headers: headers, body: json.encode(body))
        .timeout(const Duration(seconds: 60));
    return _parseResponse(response);
  }

  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    final headers = await _getHeaders();
    final url = _buildUrl(path);
    final response = await http
        .patch(url, headers: headers, body: json.encode(body))
        .timeout(const Duration(seconds: 60));
    return _parseResponse(response);
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, dynamic>? queryParams,
  }) async {
    final headers = await _getHeaders();
    final url = _buildUrl(path, queryParams);
    final response = await http
        .delete(url, headers: headers)
        .timeout(const Duration(seconds: 30));
    return _parseResponse(response);
  }
}
