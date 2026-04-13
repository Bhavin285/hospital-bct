import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/animals/screens/animal_records_screen.dart';
import '../../../features/animals/screens/animal_form_screen.dart';
import '../../../features/users/screens/user_management_screen.dart';
import '../../../shared/widgets/app_drawer.dart';
import '../../../shared/widgets/change_password_dialog.dart';

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  int _selectedIndex = 0;

  final List<_NavItem> _navItems = const [
    _NavItem(icon: Icons.note_add_outlined, activeIcon: Icons.note_add, label: 'New Admission'),
    _NavItem(icon: Icons.list_alt_outlined, activeIcon: Icons.list_alt, label: 'Records'),
    _NavItem(icon: Icons.manage_accounts_outlined, activeIcon: Icons.manage_accounts, label: 'Users'),
  ];

  Widget _buildBody() {
    switch (_selectedIndex) {
      case 0:
        return const AnimalFormScreen();
      case 1:
        return const AnimalRecordsScreen();
      case 2:
        return const UserManagementScreen();
      default:
        return const AnimalRecordsScreen();
    }
  }

  String get _title {
    switch (_selectedIndex) {
      case 0: return 'New Admission';
      case 1: return 'Animal Records';
      case 2: return 'User Management';
      default: return 'Animal Records';
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(
        title: Text(_title),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 14),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(Icons.admin_panel_settings, size: 16, color: Colors.white),
                const SizedBox(width: 4),
                Text(user?.username ?? 'Admin',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
      drawer: const AppDrawer(currentRoute: '/home'),
      body: _buildBody(),
      // bottomNavigationBar: NavigationBar(
      //   selectedIndex: _selectedIndex,
      //   onDestinationSelected: (i) => setState(() => _selectedIndex = i),
      //   destinations: _navItems.map((item) => NavigationDestination(
      //     icon: Icon(item.icon),
      //     selectedIcon: Icon(item.activeIcon),
      //     label: item.label,
      //   )).toList(),
      // ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem({required this.icon, required this.activeIcon, required this.label});
}

