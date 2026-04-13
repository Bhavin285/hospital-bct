import '../../../core/services/api_client.dart';
import '../models/user_list_model.dart';

class UsersService {
  static final UsersService _instance = UsersService._internal();
  factory UsersService() => _instance;
  UsersService._internal();

  final ApiClient _client = ApiClient();

  Future<List<UserListModel>> fetchUsers() async {
    final data = await _client.get('/user');
    List<dynamic> raw = [];
    if (data['users'] is List) {
      raw = data['users'] as List;
    } else if (data['data'] is List) {
      raw = data['data'] as List;
    }
    return raw.map((e) => UserListModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createUser({
    required String username,
    required String password,
    required String role,
  }) async {
    await _client.post('/user', {
      'username': username,
      'password': password,
      'role': role,
    });
  }

  Future<void> updateUserRole(String username, String role) async {
    await _client.patch('/user', {'username': username, 'role': role});
  }

  Future<void> deleteUser(String username) async {
    await _client.delete('/user', queryParams: {'username': username});
  }

  Future<void> adminChangePassword(String targetUsername, String newPassword) async {
    await _client.post('/change_password', {
      'target_username': targetUsername,
      'new_password': newPassword,
    });
  }
}
