import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/api_client.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../models/admit_form_model.dart';
import '../services/animals_service.dart';
import '../services/pdf_service.dart';
import '../../../shared/widgets/snack_bar_helper.dart';

class AnimalFormScreen extends StatefulWidget {
  final AdmitFormModel? editData;
  final VoidCallback? onSuccess;

  const AnimalFormScreen({super.key, this.editData, this.onSuccess});

  @override
  State<AnimalFormScreen> createState() => _AnimalFormScreenState();
}

class _AnimalFormScreenState extends State<AnimalFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _imagePicker = ImagePicker();
  final _animalsService = AnimalsService();

  // Controllers
  final _nameCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _animalNameCtrl = TextEditingController();
  final _diagnosisCtrl = TextEditingController();
  final _animalInjuryCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();
  final _bodyColourCtrl = TextEditingController();
  final _breedCtrl = TextEditingController();
  final _doctorCtrl = TextEditingController();
  final _staffCtrl = TextEditingController();
  final _otherContactCtrl = TextEditingController();

  String _selectedSex = 'Male';
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();
  File? _imageFile;
  String? _existingPhotoUrl;
  bool _isSubmitting = false;
  bool _showSuccess = false;
  String? _submittedTagNo;
  AdmitFormModel? _submittedAnimal;

  bool get _isEditMode => widget.editData != null;

  @override
  void initState() {
    super.initState();
    if (_isEditMode) {
      final d = widget.editData!;
      _nameCtrl.text = d.name;
      _mobileCtrl.text = d.mobile;
      _addressCtrl.text = d.address;
      _animalNameCtrl.text = d.animalName;
      _diagnosisCtrl.text = d.diagnosis;
      _animalInjuryCtrl.text = d.animalInjury;
      _ageCtrl.text = d.age;
      _bodyColourCtrl.text = d.bodyColour;
      _breedCtrl.text = d.breed;
      _doctorCtrl.text = d.presentDr;
      _staffCtrl.text = d.presentStaff;
      _otherContactCtrl.text = d.otherContact ?? '';
      _selectedSex = d.sex.isEmpty ? 'Male' : d.sex;
      _existingPhotoUrl = d.photoUrl;
      if (d.date.isNotEmpty) {
        try {
          _selectedDate = DateTime.parse(d.date);
        } catch (_) {}
      }
      if (d.time.isNotEmpty) {
        _selectedTime = _parseTime(d.time);
      }
    }
  }

  TimeOfDay _parseTime(String timeStr) {
    try {
      // Handle "HH:MM AM/PM" or "HH:MM"
      if (timeStr.contains('AM') || timeStr.contains('PM')) {
        final parts = timeStr.split(' ');
        final timeParts = parts[0].split(':');
        int hour = int.parse(timeParts[0]);
        final minute = int.parse(timeParts[1]);
        if (parts[1] == 'PM' && hour != 12) hour += 12;
        if (parts[1] == 'AM' && hour == 12) hour = 0;
        return TimeOfDay(hour: hour, minute: minute);
      } else {
        final parts = timeStr.split(':');
        return TimeOfDay(
          hour: int.parse(parts[0]),
          minute: int.parse(parts[1]),
        );
      }
    } catch (_) {
      return TimeOfDay.now();
    }
  }

  String _formatTime12(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '${hour.toString().padLeft(2, '0')}:$minute $period';
  }

  Future<void> _pickImage() async {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text(
                'Select Photo',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _ImageSourceTile(
                      icon: Icons.camera_alt,
                      label: 'Camera',
                      onTap: () {
                        Navigator.pop(context);
                        _pickFromSource(ImageSource.camera);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _ImageSourceTile(
                      icon: Icons.photo_library,
                      label: 'Gallery',
                      onTap: () {
                        Navigator.pop(context);
                        _pickFromSource(ImageSource.gallery);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickFromSource(ImageSource source) async {
    final picked = await _imagePicker.pickImage(
      source: source,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 80,
    );
    if (picked != null) {
      final file = File(picked.path);
      final bytes = await file.length();
      if (bytes > 5 * 1024 * 1024) {
        if (mounted) {
          SnackBarHelper.showError(context, 'Image must be less than 5MB');
        }
        return;
      }
      setState(() => _imageFile = file);
    }
  }

  Future<String?> _imageToBase64(File file) async {
    final bytes = await file.readAsBytes();
    return base64Encode(bytes);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) setState(() => _selectedTime = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();

    setState(() => _isSubmitting = true);

    try {
      final username =
          context.read<AuthProvider>().user?.username ?? 'unknown';
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final timeStr = _formatTime12(_selectedTime);

      final body = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'mobile': _mobileCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'animal_name': _animalNameCtrl.text.trim(),
        'diagnosis': _diagnosisCtrl.text.trim(),
        'date': dateStr,
        'animal_injury': _animalInjuryCtrl.text.trim(),
        'sex':
            _selectedSex[0].toUpperCase() + _selectedSex.substring(1).toLowerCase(),
        'age': _ageCtrl.text.trim(),
        'body_colour': _bodyColourCtrl.text.trim(),
        'breed': _breedCtrl.text.trim(),
        'time': timeStr,
        'present_dr': _doctorCtrl.text.trim(),
        'present_staff': _staffCtrl.text.trim(),
        'created_by': username,
        if (_otherContactCtrl.text.trim().isNotEmpty)
          'other_contact': _otherContactCtrl.text.trim(),
      };

      if (_imageFile != null) {
        final b64 = await _imageToBase64(_imageFile!);
        if (b64 != null) body['photo'] = b64;
      } else if (_isEditMode && _existingPhotoUrl != null) {
        body['photo_url'] = _existingPhotoUrl;
      }

      AdmitFormModel result;
      if (_isEditMode) {
        result = await _animalsService.updateAnimal(
          widget.editData!.tagNumber,
          body,
        );
      } else {
        result = await _animalsService.createAnimal(body);
      }

      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _showSuccess = true;
          _submittedTagNo = result.tagNumber;
          _submittedAnimal = result;
        });
        if (widget.onSuccess != null) widget.onSuccess!();
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        SnackBarHelper.showError(context, e.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        SnackBarHelper.showError(
          context,
          e.toString().replaceFirst('Exception: ', ''),
        );
      }
    }
  }

  void _resetForm() {
    _formKey.currentState?.reset();
    _nameCtrl.clear();
    _mobileCtrl.clear();
    _addressCtrl.clear();
    _animalNameCtrl.clear();
    _diagnosisCtrl.clear();
    _animalInjuryCtrl.clear();
    _ageCtrl.clear();
    _bodyColourCtrl.clear();
    _breedCtrl.clear();
    _doctorCtrl.clear();
    _staffCtrl.clear();
    _otherContactCtrl.clear();
    setState(() {
      _selectedSex = 'Male';
      _selectedDate = DateTime.now();
      _selectedTime = TimeOfDay.now();
      _imageFile = null;
      _existingPhotoUrl = null;
      _showSuccess = false;
      _submittedTagNo = null;
      _submittedAnimal = null;
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _mobileCtrl.dispose();
    _addressCtrl.dispose();
    _animalNameCtrl.dispose();
    _diagnosisCtrl.dispose();
    _animalInjuryCtrl.dispose();
    _ageCtrl.dispose();
    _bodyColourCtrl.dispose();
    _breedCtrl.dispose();
    _doctorCtrl.dispose();
    _staffCtrl.dispose();
    _otherContactCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_showSuccess && !_isEditMode) {
      return _SuccessView(
        tagNo: _submittedTagNo ?? '',
        animal: _submittedAnimal,
        onNewAdmission: _resetForm,
        onViewRecords: () {
          Navigator.pushReplacementNamed(context, '/records');
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditMode ? 'Edit Admission' : 'New Admission'),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionHeader(
                title: 'Owner Information',
                icon: Icons.person_outline,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _nameCtrl,
                label: 'Owner Name',
                icon: Icons.person,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _mobileCtrl,
                label: 'Mobile Number',
                icon: Icons.phone,
                keyboardType: TextInputType.phone,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Required';
                  if (!RegExp(r'^[0-9]{10}$').hasMatch(v.trim())) {
                    return 'Enter a valid 10-digit number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _addressCtrl,
                label: 'Address',
                icon: Icons.location_on,
                maxLines: 2,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _otherContactCtrl,
                label: 'Other Contact (optional)',
                icon: Icons.contact_phone,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 20),
              _SectionHeader(
                title: 'Animal Information',
                icon: Icons.pets,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _animalNameCtrl,
                label: 'Animal Name / Type',
                icon: Icons.pets,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _diagnosisCtrl,
                label: 'Diagnosis',
                icon: Icons.medical_services,
                maxLines: 2,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _animalInjuryCtrl,
                label: 'Animal Injury',
                icon: Icons.healing,
                maxLines: 2,
                validator: _required,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildField(
                      controller: _ageCtrl,
                      label: 'Age',
                      icon: Icons.cake,
                      validator: _required,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _SexDropdown(
                      value: _selectedSex,
                      onChanged: (v) => setState(() => _selectedSex = v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _bodyColourCtrl,
                label: 'Body Colour',
                icon: Icons.palette,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _breedCtrl,
                label: 'Breed',
                icon: Icons.category,
                validator: _required,
              ),
              const SizedBox(height: 20),
              _SectionHeader(
                title: 'Admission Details',
                icon: Icons.assignment,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _DateTimePicker(
                      label: 'Date',
                      value: DateFormat('dd MMM yyyy').format(_selectedDate),
                      icon: Icons.calendar_today,
                      onTap: _pickDate,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DateTimePicker(
                      label: 'Time',
                      value: _formatTime12(_selectedTime),
                      icon: Icons.access_time,
                      onTap: _pickTime,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _doctorCtrl,
                label: 'Present Doctor',
                icon: Icons.medical_information,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _buildField(
                controller: _staffCtrl,
                label: 'Present Staff',
                icon: Icons.badge,
                validator: _required,
              ),
              const SizedBox(height: 20),
              _SectionHeader(
                title: 'Photo',
                icon: Icons.photo_camera,
              ),
              const SizedBox(height: 12),
              _PhotoPicker(
                imageFile: _imageFile,
                existingUrl: _existingPhotoUrl,
                onPickImage: _pickImage,
                onRemove: () => setState(() {
                  _imageFile = null;
                  _existingPhotoUrl = null;
                }),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _isEditMode ? 'Update Admission' : 'Submit Admission',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
      ),
      validator: validator,
    );
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required' : null;
}

// ─── Supporting Widgets ──────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppColors.primary, size: 18),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Divider(color: Colors.grey.shade200, thickness: 1),
        ),
      ],
    );
  }
}

class _SexDropdown extends StatelessWidget {
  final String value;
  final ValueChanged<String?> onChanged;
  const _SexDropdown({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: const InputDecoration(
        labelText: 'Sex',
        prefixIcon: Icon(Icons.male, color: AppColors.primary, size: 20),
      ),
      items: const [
        DropdownMenuItem(value: 'Male', child: Text('Male')),
        DropdownMenuItem(value: 'Female', child: Text('Female')),
        DropdownMenuItem(value: 'Unknown', child: Text('Unknown')),
      ],
      onChanged: onChanged,
    );
  }
}

class _DateTimePicker extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  const _DateTimePicker({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
          suffixIcon:
              const Icon(Icons.arrow_drop_down, color: AppColors.primary),
        ),
        child: Text(value, style: const TextStyle(fontSize: 14)),
      ),
    );
  }
}

class _PhotoPicker extends StatelessWidget {
  final File? imageFile;
  final String? existingUrl;
  final VoidCallback onPickImage;
  final VoidCallback onRemove;
  const _PhotoPicker({
    required this.imageFile,
    required this.existingUrl,
    required this.onPickImage,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final hasImage = imageFile != null || existingUrl != null;
    return GestureDetector(
      onTap: onPickImage,
      child: Container(
        width: double.infinity,
        height: 160,
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasImage ? AppColors.primary : AppColors.border,
            width: hasImage ? 2 : 1.5,
            style: hasImage ? BorderStyle.solid : BorderStyle.solid,
          ),
        ),
        child: hasImage
            ? Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: imageFile != null
                        ? Image.file(imageFile!, fit: BoxFit.cover)
                        : Image.network(
                            existingUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.broken_image,
                              size: 40,
                              color: AppColors.textHint,
                            ),
                          ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: onRemove,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.close,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: onPickImage,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.85),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit, color: Colors.white, size: 14),
                            SizedBox(width: 4),
                            Text(
                              'Change',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.add_photo_alternate_outlined,
                    size: 48,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap to add photo',
                    style: TextStyle(
                      color: Colors.grey.shade500,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Max 5MB · JPEG, PNG',
                    style: TextStyle(
                      color: Colors.grey.shade400,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _ImageSourceTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _ImageSourceTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 32),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  final String tagNo;
  final AdmitFormModel? animal;
  final VoidCallback onNewAdmission;
  final VoidCallback onViewRecords;
  const _SuccessView({
    required this.tagNo,
    required this.animal,
    required this.onNewAdmission,
    required this.onViewRecords,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.check_circle,
                  color: Colors.green.shade600,
                  size: 60,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Admission Successful!',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              if (tagNo.isNotEmpty) ...[
                Text(
                  'Tag Number',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    tagNo,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              if (animal != null)
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      try {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Generating PDF…'),
                              duration: Duration(seconds: 2)),
                        );
                        final bytes =
                            await PdfService.generateAdmissionPdfFromModel(animal!);
                        await PdfService.sharePdf(
                            bytes, 'BCT_Admission_${animal!.tagNumber}.pdf');
                      } catch (_) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('PDF generation failed')),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.picture_as_pdf),
                    label: const Text('Download Admission PDF'),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade600),
                  ),
                ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: onNewAdmission,
                  child: const Text('New Admission'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton(
                  onPressed: onViewRecords,
                  child: const Text('View Records'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
