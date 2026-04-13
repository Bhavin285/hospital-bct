import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/api_client.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../models/admit_form_model.dart';
import '../models/discharge_summary_model.dart';
import '../services/animals_service.dart';
import '../services/pdf_service.dart';
import '../../../shared/widgets/snack_bar_helper.dart';

class AnimalViewScreen extends StatefulWidget {
  final String tagNumber;

  const AnimalViewScreen({super.key, required this.tagNumber});

  @override
  State<AnimalViewScreen> createState() => _AnimalViewScreenState();
}

class _AnimalViewScreenState extends State<AnimalViewScreen> {
  final _animalsService = AnimalsService();
  final _imagePicker = ImagePicker();

  AdmitFormModel? _animal;
  List<DischargeSummaryModel> _summaries = [];
  bool _loadingAnimal = true;
  bool _loadingSummaries = true;

  // Discharge form state
  String _dischargeStatus = 're_open';
  final _descriptionCtrl = TextEditingController();
  DateTime _dischargeDate = DateTime.now();
  TimeOfDay _dischargeTime = TimeOfDay.now();
  File? _dischargePhoto;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    _loadAnimal();
    _loadSummaries();
  }

  Future<void> _loadAnimal() async {
    setState(() => _loadingAnimal = true);
    try {
      final animal = await _animalsService.getAnimal(widget.tagNumber);
      if (mounted) setState(() { _animal = animal; _loadingAnimal = false; });
    } catch (_) {
      if (mounted) setState(() => _loadingAnimal = false);
    }
  }

  Future<void> _loadSummaries() async {
    setState(() => _loadingSummaries = true);
    try {
      final summaries =
          await _animalsService.getDischargeSummaries(widget.tagNumber);
      if (mounted) {
        setState(() {
          _summaries = summaries;
          _loadingSummaries = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loadingSummaries = false);
        SnackBarHelper.showError(context, e.message);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingSummaries = false);
        SnackBarHelper.showError(context, 'Failed to load treatment history');
      }
    }
  }

  Future<void> _pickDischargePhoto() async {
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
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text('Select Photo', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _PhotoSourceTile(
                    icon: Icons.camera_alt,
                    label: 'Camera',
                    onTap: () { Navigator.pop(context); _pickPhotoFrom(ImageSource.camera); },
                  )),
                  const SizedBox(width: 12),
                  Expanded(child: _PhotoSourceTile(
                    icon: Icons.photo_library,
                    label: 'Gallery',
                    onTap: () { Navigator.pop(context); _pickPhotoFrom(ImageSource.gallery); },
                  )),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickPhotoFrom(ImageSource source) async {
    final picked = await _imagePicker.pickImage(
      source: source, maxWidth: 1200, maxHeight: 1200, imageQuality: 80,
    );
    if (picked != null) {
      final bytes = await File(picked.path).length();
      if (bytes > 5 * 1024 * 1024) {
        if (mounted) SnackBarHelper.showError(context, 'Image must be less than 5MB');
        return;
      }
      setState(() => _dischargePhoto = File(picked.path));
    }
  }

  String _formatTime12(TimeOfDay t) {
    final h = t.hourOfPeriod == 0 ? 12 : t.hourOfPeriod;
    final m = t.minute.toString().padLeft(2, '0');
    final p = t.period == DayPeriod.am ? 'AM' : 'PM';
    return '${h.toString().padLeft(2, '0')}:$m $p';
  }

  Future<void> _submitDischargeSummary() async {
    if (_descriptionCtrl.text.trim().isEmpty) {
      SnackBarHelper.showError(context, 'Description is required');
      return;
    }

    setState(() => _saving = true);
    try {
      final username = context.read<AuthProvider>().user?.username ?? 'unknown';
      final body = <String, dynamic>{
        'tag_number': widget.tagNumber,
        'status': _dischargeStatus,
        'description': _descriptionCtrl.text.trim(),
        'date': DateFormat('yyyy-MM-dd').format(_dischargeDate),
        'time': _formatTime12(_dischargeTime),
        'created_by': username,
      };

      if (_dischargePhoto != null) {
        final bytes = await _dischargePhoto!.readAsBytes();
        body['photo'] = base64Encode(bytes);
      }

      final summary = await _animalsService.createDischargeSummary(body);
      if (mounted) {
        setState(() {
          _summaries.insert(0, summary);
          _saving = false;
          _descriptionCtrl.clear();
          _dischargeStatus = 're_open';
          _dischargeDate = DateTime.now();
          _dischargeTime = TimeOfDay.now();
          _dischargePhoto = null;
        });
        SnackBarHelper.showSuccess(context, 'Treatment record added');
      }
    } on ApiException catch (e) {
      if (mounted) { setState(() => _saving = false); SnackBarHelper.showError(context, e.message); }
    } catch (e) {
      if (mounted) { setState(() => _saving = false); SnackBarHelper.showError(context, 'Failed to save'); }
    }
  }

  Future<void> _deleteSummary(DischargeSummaryModel summary) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(children: [
          Icon(Icons.warning_amber_rounded, color: Colors.red),
          SizedBox(width: 8),
          Text('Delete Record'),
        ]),
        content: const Text('Delete this treatment record?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    try {
      await _animalsService.deleteDischargeSummary(widget.tagNumber, summary.id);
      if (mounted) {
        setState(() => _summaries.removeWhere((s) => s.id == summary.id));
        SnackBarHelper.showSuccess(context, 'Record deleted');
      }
    } on ApiException catch (e) {
      if (mounted) SnackBarHelper.showError(context, e.message);
    }
  }

  Future<void> _showPdfOptions() async {
    await showModalBottomSheet(
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
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text('Case Report PDF',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: _PdfActionTile(
                  icon: Icons.share,
                  label: 'Share',
                  onTap: () { Navigator.pop(context); _generatePdf('share'); },
                )),
                const SizedBox(width: 10),
                Expanded(child: _PdfActionTile(
                  icon: Icons.open_in_new,
                  label: 'Open',
                  onTap: () { Navigator.pop(context); _generatePdf('open'); },
                )),
                const SizedBox(width: 10),
                Expanded(child: _PdfActionTile(
                  icon: Icons.print,
                  label: 'Print',
                  onTap: () { Navigator.pop(context); _generatePdf('print'); },
                )),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _generatePdf(String action) async {
    if (_animal == null) return;
    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Generating PDF…'), duration: Duration(seconds: 2)),
      );
      final bytes = await PdfService.generateViewPdf(_animal!, _summaries);
      final fileName = 'BCT_Case_${_animal!.tagNumber}.pdf';
      if (action == 'share') {
        await PdfService.sharePdf(bytes, fileName);
      } else if (action == 'open') {
        await PdfService.openPdf(bytes, fileName);
      } else {
        await PdfService.printPdf(bytes);
      }
    } catch (_) {
      if (mounted) SnackBarHelper.showError(context, 'PDF generation failed');
    }
  }

  String _formatDate(String? d) {
    if (d == null || d.isEmpty) return '—';
    try { return DateFormat('dd MMM yyyy').format(DateTime.parse(d)); } catch (_) { return d; }
  }

  Color _statusColor(String status) {
    return Color(AppConstants.dischargeStatusColors[status] ?? 0xFF9E9E9E);
  }

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Tag #${widget.tagNumber}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            onPressed: _animal == null ? null : _showPdfOptions,
            tooltip: 'Share PDF',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _loadingAnimal
          ? const Center(child: CircularProgressIndicator())
          : _animal == null
              ? const Center(child: Text('Animal not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _AnimalInfoCard(animal: _animal!, formatDate: _formatDate),
                      const SizedBox(height: 20),
                      _DischargeForm(
                        status: _dischargeStatus,
                        descriptionCtrl: _descriptionCtrl,
                        date: _dischargeDate,
                        time: _dischargeTime,
                        photo: _dischargePhoto,
                        saving: _saving,
                        formatTime12: _formatTime12,
                        onStatusChanged: (v) => setState(() => _dischargeStatus = v!),
                        onPickDate: () async {
                          final p = await showDatePicker(
                            context: context,
                            initialDate: _dischargeDate,
                            firstDate: DateTime(2020),
                            lastDate: DateTime.now().add(const Duration(days: 1)),
                          );
                          if (p != null) setState(() => _dischargeDate = p);
                        },
                        onPickTime: () async {
                          final p = await showTimePicker(context: context, initialTime: _dischargeTime);
                          if (p != null) setState(() => _dischargeTime = p);
                        },
                        onPickPhoto: _pickDischargePhoto,
                        onRemovePhoto: () => setState(() => _dischargePhoto = null),
                        onSubmit: _submitDischargeSummary,
                      ),
                      const SizedBox(height: 20),
                      _TreatmentHistory(
                        summaries: _summaries,
                        loading: _loadingSummaries,
                        formatDate: _formatDate,
                        statusColor: _statusColor,
                        onDelete: _deleteSummary,
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
    );
  }
}

// ─── Animal Info Card ────────────────────────────────────────────────────────

class _AnimalInfoCard extends StatelessWidget {
  final AdmitFormModel animal;
  final String Function(String?) formatDate;

  const _AnimalInfoCard({required this.animal, required this.formatDate});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Tag #${animal.tagNumber}',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    animal.animalName,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (animal.photoUrl != null && animal.photoUrl!.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  animal.photoUrl!,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 120,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(child: Icon(Icons.broken_image, size: 40, color: AppColors.textHint)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
            _InfoSection(title: 'Owner Information', icon: Icons.person, fields: [
              _Field('Name', animal.name),
              _Field('Mobile', animal.mobile),
              _Field('Address', animal.address),
              if (animal.otherContact != null && animal.otherContact!.isNotEmpty)
                _Field('Other Contact', animal.otherContact!),
            ]),
            const SizedBox(height: 12),
            _InfoSection(title: 'Animal Information', icon: Icons.pets, fields: [
              _Field('Species', animal.animalName),
              _Field('Breed', animal.breed),
              _Field('Sex', animal.sex),
              _Field('Age', animal.age),
              _Field('Body Colour', animal.bodyColour),
              _Field('Diagnosis', animal.diagnosis),
              _Field('Injury', animal.animalInjury),
            ]),
            const SizedBox(height: 12),
            _InfoSection(title: 'Admission Details', icon: Icons.assignment, fields: [
              _Field('Date', formatDate(animal.date)),
              _Field('Time', animal.time),
              _Field('Doctor', animal.presentDr),
              _Field('Staff', animal.presentStaff),
            ]),
          ],
        ),
      ),
    );
  }
}

class _Field {
  final String label;
  final String value;
  _Field(this.label, this.value);
}

class _InfoSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<_Field> fields;
  const _InfoSection({required this.title, required this.icon, required this.fields});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: AppColors.primary),
            const SizedBox(width: 6),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary)),
          ],
        ),
        const SizedBox(height: 8),
        ...fields.map((f) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 120,
                child: Text(f.label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              ),
              Expanded(
                child: Text(f.value.isEmpty ? '—' : f.value,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
              ),
            ],
          ),
        )),
      ],
    );
  }
}

// ─── Discharge Summary Form ───────────────────────────────────────────────────

class _DischargeForm extends StatelessWidget {
  final String status;
  final TextEditingController descriptionCtrl;
  final DateTime date;
  final TimeOfDay time;
  final File? photo;
  final bool saving;
  final String Function(TimeOfDay) formatTime12;
  final ValueChanged<String?> onStatusChanged;
  final VoidCallback onPickDate;
  final VoidCallback onPickTime;
  final VoidCallback onPickPhoto;
  final VoidCallback onRemovePhoto;
  final VoidCallback onSubmit;

  const _DischargeForm({
    required this.status,
    required this.descriptionCtrl,
    required this.date,
    required this.time,
    required this.photo,
    required this.saving,
    required this.formatTime12,
    required this.onStatusChanged,
    required this.onPickDate,
    required this.onPickTime,
    required this.onPickPhoto,
    required this.onRemovePhoto,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.add_circle_outline, color: AppColors.primary, size: 20),
                SizedBox(width: 8),
                Text('Add Treatment Record',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 16),
            // Status dropdown
            DropdownButtonFormField<String>(
              value: status,
              decoration: const InputDecoration(
                labelText: 'Status',
                prefixIcon: Icon(Icons.flag_outlined, color: AppColors.primary, size: 20),
              ),
              items: AppConstants.dischargeStatuses.map((s) {
                return DropdownMenuItem(
                  value: s,
                  child: Text(AppConstants.dischargeStatusLabels[s] ?? s),
                );
              }).toList(),
              onChanged: onStatusChanged,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: onPickDate,
                    borderRadius: BorderRadius.circular(16),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Date',
                        prefixIcon: Icon(Icons.calendar_today, color: AppColors.primary, size: 18),
                      ),
                      child: Text(DateFormat('dd MMM yyyy').format(date), style: const TextStyle(fontSize: 14)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: onPickTime,
                    borderRadius: BorderRadius.circular(16),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Time',
                        prefixIcon: Icon(Icons.access_time, color: AppColors.primary, size: 18),
                      ),
                      child: Text(formatTime12(time), style: const TextStyle(fontSize: 14)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: descriptionCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description *',
                hintText: 'Describe the treatment or status update...',
                prefixIcon: Icon(Icons.notes, color: AppColors.primary, size: 20),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            // Photo picker
            if (photo != null)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(photo!, height: 120, width: double.infinity, fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 6, right: 6,
                    child: GestureDetector(
                      onTap: onRemovePhoto,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, color: Colors.white, size: 14),
                      ),
                    ),
                  ),
                ],
              )
            else
              InkWell(
                onTap: onPickPhoto,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_photo_alternate_outlined, color: Colors.grey.shade500, size: 20),
                      const SizedBox(width: 8),
                      Text('Add photo (optional)', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: saving ? null : onSubmit,
                icon: saving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save, size: 18),
                label: const Text('Save Record'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Treatment History ────────────────────────────────────────────────────────

class _TreatmentHistory extends StatelessWidget {
  final List<DischargeSummaryModel> summaries;
  final bool loading;
  final String Function(String?) formatDate;
  final Color Function(String) statusColor;
  final void Function(DischargeSummaryModel) onDelete;

  const _TreatmentHistory({
    required this.summaries,
    required this.loading,
    required this.formatDate,
    required this.statusColor,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.history, color: AppColors.primary),
            const SizedBox(width: 8),
            const Text('Treatment History',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Spacer(),
            if (summaries.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('${summaries.length}',
                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (loading)
          const Center(child: Padding(
            padding: EdgeInsets.all(24),
            child: CircularProgressIndicator(),
          ))
        else if (summaries.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Icon(Icons.history_toggle_off, size: 40, color: Colors.grey.shade300),
                const SizedBox(height: 8),
                Text('No treatment records yet', style: TextStyle(color: Colors.grey.shade500)),
              ],
            ),
          )
        else
          ...summaries.map((s) => _SummaryCard(
            summary: s,
            formatDate: formatDate,
            statusColor: statusColor,
            onDelete: () => onDelete(s),
          )),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final DischargeSummaryModel summary;
  final String Function(String?) formatDate;
  final Color Function(String) statusColor;
  final VoidCallback onDelete;

  const _SummaryCard({
    required this.summary,
    required this.formatDate,
    required this.statusColor,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final color = statusColor(summary.status);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    summary.statusLabel,
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${formatDate(summary.date)} • ${summary.time}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                  onPressed: onDelete,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(summary.description, style: const TextStyle(fontSize: 13)),
            if (summary.createdBy != null && summary.createdBy!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.person_outline, size: 12, color: Colors.grey.shade400),
                  const SizedBox(width: 4),
                  Text('By ${summary.createdBy}',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                ],
              ),
            ],
            if (summary.photoUrl != null && summary.photoUrl!.isNotEmpty) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  summary.photoUrl!,
                  height: 120, width: double.infinity, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PdfActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _PdfActionTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 28),
            const SizedBox(height: 6),
            Text(label,
                style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _PhotoSourceTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _PhotoSourceTile({required this.icon, required this.label, required this.onTap});

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
