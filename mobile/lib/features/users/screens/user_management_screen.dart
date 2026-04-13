import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/api_client.dart';
import '../models/user_list_model.dart';
import '../services/users_service.dart';
import '../../../shared/widgets/snack_bar_helper.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _usersService = UsersService();

  // Create user form
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  String _selectedRole = 'staff';
  bool _obscurePassword = true;
  bool _creating = false;

  // User list
  List<UserListModel> _users = [];
  bool _loadingUsers = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 1) _fetchUsers();
    });
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    setState(() => _loadingUsers = true);
    try {
      final users = await _usersService.fetchUsers();
      if (mounted) setState(() { _users = users; _loadingUsers = false; });
    } on ApiException catch (e) {
      if (mounted) { setState(() => _loadingUsers = false); SnackBarHelper.showError(context, e.message); }
    } catch (_) {
      if (mounted) setState(() => _loadingUsers = false);
    }
  }

  Future<void> _createUser() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _creating = true);
    try {
      await _usersService.createUser(
        username: _usernameCtrl.text.trim(),
        password: _passwordCtrl.text,
        role: _selectedRole,
      );
      if (mounted) {
        setState(() { _creating = false; });
        _usernameCtrl.clear();
        _passwordCtrl.clear();
        setState(() => _selectedRole = 'staff');
        SnackBarHelper.showSuccess(context, 'User created successfully');
        _tabController.animateTo(1);
        _fetchUsers();
      }
    } on ApiException catch (e) {
      if (mounted) { setState(() => _creating = false); SnackBarHelper.showError(context, e.message); }
    } catch (e) {
      if (mounted) {
        setState(() => _creating = false);
        SnackBarHelper.showError(context, e.toString().replaceFirst('Exception: ', ''));
      }
    }
  }

  Future<void> _deleteUser(UserListModel user) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(children: [
          Icon(Icons.warning_amber_rounded, color: Colors.red),
          SizedBox(width: 8),
          Text('Disable User'),
        ]),
        content: Text('Disable user "${user.username}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Disable'),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    try {
      await _usersService.deleteUser(user.username);
      if (mounted) {
        SnackBarHelper.showSuccess(context, 'User disabled');
        _fetchUsers();
      }
    } on ApiException catch (e) {
      if (mounted) SnackBarHelper.showError(context, e.message);
    }
  }

  Future<void> _changeUserPassword(UserListModel user) async {
    final passwordCtrl = TextEditingController();
    final confirm = await showDialog<String>(
      context: context,
      builder: (_) => _ResetPasswordDialog(username: user.username, passwordCtrl: passwordCtrl),
    );
    if (confirm == null) return;
    try {
      await _usersService.adminChangePassword(user.username, confirm);
      if (mounted) SnackBarHelper.showSuccess(context, 'Password updated for ${user.username}');
    } on ApiException catch (e) {
      if (mounted) SnackBarHelper.showError(context, e.message);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('User Management'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.person_add), text: 'Create User'),
            Tab(icon: Icon(Icons.people), text: 'All Users'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── Create User Tab ────────────────────────────────────
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue.shade400, Colors.blue.shade700],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.person_add, color: Colors.white, size: 32),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Create New User',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                            Text('Add a new admin or staff member',
                                style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextFormField(
                            controller: _usernameCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Username',
                              prefixIcon: Icon(Icons.person_outline, color: AppColors.primary, size: 20),
                            ),
                            validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline, color: AppColors.primary, size: 20),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility,
                                    color: Colors.grey.shade500),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Required';
                              if (v.length < 8) return 'At least 8 characters';
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),
                          DropdownButtonFormField<String>(
                            value: _selectedRole,
                            decoration: const InputDecoration(
                              labelText: 'Role',
                              prefixIcon: Icon(Icons.badge_outlined, color: AppColors.primary, size: 20),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'staff', child: Text('Staff')),
                              DropdownMenuItem(value: 'admin', child: Text('Admin')),
                            ],
                            onChanged: (v) => setState(() => _selectedRole = v!),
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            height: 50,
                            child: ElevatedButton.icon(
                              onPressed: _creating ? null : _createUser,
                              icon: _creating
                                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.person_add, size: 18),
                              label: const Text('Create User', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── User List Tab ──────────────────────────────────────
          _loadingUsers
              ? const Center(child: CircularProgressIndicator())
              : _users.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline, size: 60, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No users found', style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchUsers,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _users.length,
                        itemBuilder: (_, i) => _UserCard(
                          user: _users[i],
                          onDelete: () => _deleteUser(_users[i]),
                          onChangePassword: () => _changeUserPassword(_users[i]),
                        ),
                      ),
                    ),
        ],
      ),
    );
  }
}

// ─── User Card ────────────────────────────────────────────────────────────────

class _UserCard extends StatelessWidget {
  final UserListModel user;
  final VoidCallback onDelete;
  final VoidCallback onChangePassword;

  const _UserCard({
    required this.user,
    required this.onDelete,
    required this.onChangePassword,
  });

  @override
  Widget build(BuildContext context) {
    final isAdmin = user.isAdmin;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: (isAdmin ? AppColors.primary : Colors.orange).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  user.username.isNotEmpty ? user.username[0].toUpperCase() : 'U',
                  style: TextStyle(
                    color: isAdmin ? AppColors.primary : Colors.orange,
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user.username,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (isAdmin ? AppColors.primary : Colors.orange).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          isAdmin ? 'Admin' : 'Staff',
                          style: TextStyle(
                            color: isAdmin ? AppColors.primary : Colors.orange,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (!user.enabled) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text('Disabled',
                              style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'password') onChangePassword();
                if (v == 'delete') onDelete();
              },
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              itemBuilder: (_) => [
                const PopupMenuItem(
                  value: 'password',
                  child: Row(children: [
                    Icon(Icons.lock_reset, size: 16, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text('Reset Password'),
                  ]),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(children: [
                    Icon(Icons.person_off, size: 16, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Disable User', style: TextStyle(color: Colors.red)),
                  ]),
                ),
              ],
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.more_vert, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Reset Password Dialog ────────────────────────────────────────────────────

class _ResetPasswordDialog extends StatefulWidget {
  final String username;
  final TextEditingController passwordCtrl;
  const _ResetPasswordDialog({required this.username, required this.passwordCtrl});

  @override
  State<_ResetPasswordDialog> createState() => _ResetPasswordDialogState();
}

class _ResetPasswordDialogState extends State<_ResetPasswordDialog> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.lock_reset, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Reset Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text(widget.username,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.normal)),
              ],
            ),
          ),
        ],
      ),
      content: TextFormField(
        controller: widget.passwordCtrl,
        obscureText: _obscure,
        decoration: InputDecoration(
          labelText: 'New Password',
          prefixIcon: const Icon(Icons.lock_outline, color: AppColors.primary, size: 20),
          suffixIcon: IconButton(
            icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: Colors.grey.shade500),
            onPressed: () => setState(() => _obscure = !_obscure),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
        ),
        ElevatedButton(
          onPressed: () {
            final p = widget.passwordCtrl.text;
            if (p.length < 8) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Password must be at least 8 characters')),
              );
              return;
            }
            Navigator.pop(context, p);
          },
          child: const Text('Update'),
        ),
      ],
    );
  }
}
