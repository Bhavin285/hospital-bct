enum UserRole {
  admin,
  staff;

  String get displayName {
    switch (this) {
      case UserRole.admin:
        return 'Admin';
      case UserRole.staff:
        return 'Staff';
    }
  }

  static UserRole fromString(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return UserRole.admin;
      case 'staff':
        return UserRole.staff;
      default:
        return UserRole.staff;
    }
  }
}

class UserModel {
  final String username;
  final String sub;
  final UserRole role;

  UserModel({
    required this.username,
    required this.sub,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      username: json['username'] as String? ?? '',
      sub: json['sub'] as String? ?? '',
      role: UserRole.fromString(json['role'] as String? ?? 'staff'),
    );
  }

  Map<String, dynamic> toJson() => {
        'username': username,
        'sub': sub,
        'role': role.name,
      };

  bool get isAdmin => role == UserRole.admin;
  bool get isStaff => role == UserRole.staff;
}
