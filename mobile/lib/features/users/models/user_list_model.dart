class UserListModel {
  final String username;
  final String role;
  final String? status;
  final bool enabled;
  final String? createdAt;

  UserListModel({
    required this.username,
    required this.role,
    this.status,
    this.enabled = true,
    this.createdAt,
  });

  factory UserListModel.fromJson(Map<String, dynamic> json) {
    return UserListModel(
      username: json['username']?.toString() ?? '',
      role: json['role']?.toString() ?? 'staff',
      status: json['status']?.toString(),
      enabled: json['enabled'] as bool? ?? true,
      createdAt: json['created_at']?.toString(),
    );
  }

  bool get isAdmin => role.toLowerCase() == 'admin';
}
