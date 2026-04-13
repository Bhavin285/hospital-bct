import 'package:flutter/material.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/home/screens/admin_home_screen.dart';
import '../../features/home/screens/staff_home_screen.dart';
import '../../features/animals/screens/animal_form_screen.dart';
import '../../features/animals/screens/animal_records_screen.dart';
import '../../features/users/screens/user_management_screen.dart';

class AppRouter {
  static const String splash = '/';
  static const String login = '/login';
  static const String home = '/home';
  static const String staff = '/staff';
  static const String admitForm = '/admit-form';
  static const String records = '/records';
  static const String users = '/users';

  static Map<String, WidgetBuilder> get routes => {
        login: (_) => const LoginScreen(),
        home: (_) => const AdminHomeScreen(),
        staff: (_) => const StaffHomeScreen(),
        admitForm: (_) => const AnimalFormScreen(),
        records: (_) => const AnimalRecordsScreen(),
        users: (_) => const UserManagementScreen(),
      };
}