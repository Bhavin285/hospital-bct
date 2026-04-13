import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/api_client.dart';
import '../models/admit_form_model.dart';
import '../services/animals_service.dart';
import '../services/pdf_service.dart';
import '../../../shared/widgets/snack_bar_helper.dart';
import 'animal_form_screen.dart';
import 'animal_view_screen.dart';

class AnimalRecordsScreen extends StatefulWidget {
  const AnimalRecordsScreen({super.key});

  @override
  State<AnimalRecordsScreen> createState() => _AnimalRecordsScreenState();
}

class _AnimalRecordsScreenState extends State<AnimalRecordsScreen> {
  final _animalsService = AnimalsService();
  final _searchController = TextEditingController();
  Timer? _debounce;

  List<AdmitFormModel> _animals = [];
  bool _loading = true;
  String _search = '';
  DateTime? _fromDate;
  DateTime? _toDate;
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalRecords = 0;

  // Tracks in-flight status fetch so stale results from a previous page
  // load don't overwrite a newer one.
  int _statusFetchGeneration = 0;

  @override
  void initState() {
    super.initState();
    _fetchAnimals();
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (_search != _searchController.text) {
        _search = _searchController.text;
        _currentPage = 1;
        _fetchAnimals(showLoading: false);
      }
    });
  }

  Future<void> _fetchAnimals({bool showLoading = true}) async {
    if (showLoading) setState(() => _loading = true);
    try {
      final result = await _animalsService.fetchAnimals(
        page: _currentPage,
        search: _search.isEmpty ? null : _search,
        fromDate: _fromDate != null
            ? DateFormat('yyyy-MM-dd').format(_fromDate!)
            : null,
        toDate: _toDate != null
            ? DateFormat('yyyy-MM-dd').format(_toDate!)
            : null,
      );
      if (mounted) {
        setState(() {
          _animals = result.items;
          _totalPages = result.pages;
          _totalRecords = result.total;
          _loading = false;
        });
        // Fetch latest status for each card in background.
        _fetchLatestStatuses(result.items);
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        SnackBarHelper.showError(context, e.message);
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Fetches the latest discharge-summary status for every animal on the
  /// current page in parallel, then updates each card's colour/badge.
  Future<void> _fetchLatestStatuses(List<AdmitFormModel> animals) async {
    if (animals.isEmpty) return;

    // Bump the generation so a stale response from a previous fetch
    // (e.g. user paged quickly) doesn't overwrite newer results.
    final generation = ++_statusFetchGeneration;

    // Fire all requests at once.
    final futures = animals.map((animal) async {
      try {
        final summaries = await _animalsService
            .getDischargeSummaries(animal.tagNumber);
        if (summaries.isEmpty) return MapEntry(animal.tagNumber, '');
        // Sort newest-first by date so we always get the latest entry.
        summaries.sort((a, b) {
          try {
            return DateTime.parse(b.date).compareTo(DateTime.parse(a.date));
          } catch (_) {
            return 0;
          }
        });
        return MapEntry(animal.tagNumber, summaries.first.status);
      } catch (_) {
        return MapEntry(animal.tagNumber, '');
      }
    }).toList();

    final results = await Future.wait(futures);

    // Discard if a newer fetch has started (page changed, filter changed …).
    if (!mounted || generation != _statusFetchGeneration) return;

    final statusMap = <String, String>{
      for (final e in results)
        if (e.value.isNotEmpty) e.key: e.value,
    };

    if (statusMap.isEmpty) return;

    setState(() {
      _animals = _animals.map((a) {
        final status = statusMap[a.tagNumber];
        return status != null ? a.copyWith(latestStatus: status) : a;
      }).toList();
    });
  }

  Future<void> _pickFromDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _fromDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _fromDate = picked;
        _currentPage = 1;
      });
      _fetchAnimals();
    }
  }

  Future<void> _pickToDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _toDate ?? DateTime.now(),
      firstDate: _fromDate ?? DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _toDate = picked;
        _currentPage = 1;
      });
      _fetchAnimals();
    }
  }

  void _clearFilters() {
    _searchController.clear();
    setState(() {
      _search = '';
      _fromDate = null;
      _toDate = null;
      _currentPage = 1;
    });
    _fetchAnimals();
  }

  Future<void> _downloadPdf(AdmitFormModel animal) async {
    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Generating PDF…'), duration: Duration(seconds: 2)),
      );
      final bytes = await PdfService.generateAdmissionPdfFromModel(animal);
      final fileName = 'BCT_Admission_${animal.tagNumber}.pdf';
      await PdfService.sharePdf(bytes, fileName);
    } catch (_) {
      if (mounted) SnackBarHelper.showError(context, 'PDF generation failed');
    }
  }

  String _formatDate(String? d) {
    if (d == null || d.isEmpty) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(d));
    } catch (_) {
      return d;
    }
  }

  bool get _hasFilters =>
      _search.isNotEmpty || _fromDate != null || _toDate != null;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            const Text('Animal Records'),
            if (_totalRecords > 0)
              Text(
                '$_totalRecords records',
                style: const TextStyle(fontSize: 12, color: Colors.white70),
              ),
          ],
        ),
        actions: [
          if (_hasFilters)
            IconButton(
              icon: const Icon(Icons.filter_list_off),
              tooltip: 'Clear filters',
              onPressed: _clearFilters,
            ),
        ],
      ),
      body: Column(
        children: [
          _FilterBar(
            searchController: _searchController,
            fromDate: _fromDate,
            toDate: _toDate,
            onPickFromDate: _pickFromDate,
            onPickToDate: _pickToDate,
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _animals.isEmpty
                    ? _EmptyState(
                        hasFilters: _hasFilters,
                        onClearFilters: _clearFilters,
                      )
                    : RefreshIndicator(
                        onRefresh: () => _fetchAnimals(),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _animals.length +
                              (_totalPages > 1 ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == _animals.length) {
                              return _PaginationControls(
                                currentPage: _currentPage,
                                totalPages: _totalPages,
                                onPrev: _currentPage > 1
                                    ? () {
                                        setState(() => _currentPage--);
                                        _fetchAnimals();
                                      }
                                    : null,
                                onNext: _currentPage < _totalPages
                                    ? () {
                                        setState(() => _currentPage++);
                                        _fetchAnimals();
                                      }
                                    : null,
                              );
                            }
                            return _AnimalCard(
                              animal: _animals[index],
                              onView: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => AnimalViewScreen(
                                      tagNumber: _animals[index].tagNumber,
                                    ),
                                  ),
                                );
                              },
                              onEdit: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => AnimalFormScreen(
                                      editData: _animals[index],
                                      onSuccess: () {
                                        Navigator.pop(context);
                                        _fetchAnimals(showLoading: false);
                                      },
                                    ),
                                  ),
                                );
                              },
                              onDownloadPdf: () =>
                                  _downloadPdf(_animals[index]),
                              formatDate: _formatDate,
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

// ─── Supporting Widgets ──────────────────────────────────────────────────────

class _FilterBar extends StatelessWidget {
  final TextEditingController searchController;
  final DateTime? fromDate;
  final DateTime? toDate;
  final VoidCallback onPickFromDate;
  final VoidCallback onPickToDate;

  const _FilterBar({
    required this.searchController,
    required this.fromDate,
    required this.toDate,
    required this.onPickFromDate,
    required this.onPickToDate,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      color: Colors.white,
      child: Column(
        children: [
          TextField(
            controller: searchController,
            decoration: InputDecoration(
              hintText: 'Search by name, tag, diagnosis...',
              prefixIcon:
                  const Icon(Icons.search, color: AppColors.primary),
              suffixIcon: searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () => searchController.clear(),
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _DateChip(
                  label: fromDate != null
                      ? DateFormat('dd MMM').format(fromDate!)
                      : 'From date',
                  hasValue: fromDate != null,
                  onTap: onPickFromDate,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _DateChip(
                  label: toDate != null
                      ? DateFormat('dd MMM').format(toDate!)
                      : 'To date',
                  hasValue: toDate != null,
                  onTap: onPickToDate,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
        ],
      ),
    );
  }
}

class _DateChip extends StatelessWidget {
  final String label;
  final bool hasValue;
  final VoidCallback onTap;
  const _DateChip({
    required this.label,
    required this.hasValue,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: hasValue
              ? AppColors.primary.withOpacity(0.1)
              : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: hasValue ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today,
              size: 14,
              color: hasValue ? AppColors.primary : Colors.grey.shade500,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: hasValue ? AppColors.primary : Colors.grey.shade600,
                fontWeight: hasValue ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Status helpers ────────────────────────────────────────────────────────────

Color _statusCardColor(String? status) {
  switch (status) {
    case 're_open':  return const Color(0xFFFFFDE7); // light yellow
    case 'recover':  return const Color(0xFFF3E5F5); // light purple
    case 'release':  return const Color(0xFFE8F5E9); // light green
    case 'death':    return const Color(0xFFFFEBEE); // light red
    default:         return Colors.white;
  }
}

Color _statusBadgeColor(String? status) {
  switch (status) {
    case 're_open':  return const Color(0xFFFBC02D); // amber
    case 'recover':  return const Color(0xFF7B1FA2); // purple
    case 'release':  return const Color(0xFF2E7D32); // green
    case 'death':    return const Color(0xFFC62828); // red
    default:         return Colors.grey;
  }
}

String _statusLabel(String? status) {
  switch (status) {
    case 're_open':  return 'Re-Open';
    case 'recover':  return 'Recovered';
    case 'release':  return 'Released';
    case 'death':    return 'Death';
    default:         return '';
  }
}

// ── Card ─────────────────────────────────────────────────────────────────────

class _AnimalCard extends StatelessWidget {
  final AdmitFormModel animal;
  final VoidCallback onView;
  final VoidCallback onEdit;
  final VoidCallback onDownloadPdf;
  final String Function(String?) formatDate;

  const _AnimalCard({
    required this.animal,
    required this.onView,
    required this.onEdit,
    required this.onDownloadPdf,
    required this.formatDate,
  });

  @override
  Widget build(BuildContext context) {
    final status = animal.latestStatus;
    final cardColor = _statusCardColor(status);

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      color: cardColor,
      child: InkWell(
        onTap: onView,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Tag badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '#${animal.tagNumber}',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      animal.animalName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  // Status badge
                  if (status != null && status.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _statusBadgeColor(status),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _statusLabel(status),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  // Photo thumbnail
                  if (animal.photoUrl != null && animal.photoUrl!.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        animal.photoUrl!,
                        width: 44,
                        height: 44,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.pets,
                            color: AppColors.primary,
                            size: 22,
                          ),
                        ),
                      ),
                    )
                  else
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.pets,
                        color: AppColors.primary,
                        size: 22,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              _InfoRow(Icons.person_outline, animal.name),
              const SizedBox(height: 4),
              _InfoRow(Icons.medical_services_outlined, animal.diagnosis),
              const SizedBox(height: 4),
              Row(
                children: [
                  _InfoChip(
                    Icons.calendar_today,
                    formatDate(animal.date),
                  ),
                  const SizedBox(width: 8),
                  _InfoChip(
                    Icons.category_outlined,
                    '${animal.breed} • ${animal.sex}',
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  _ActionButton(
                    icon: Icons.visibility_outlined,
                    label: 'View',
                    color: AppColors.primary,
                    onTap: onView,
                  ),
                  const SizedBox(width: 8),
                  _ActionButton(
                    icon: Icons.edit_outlined,
                    label: 'Edit',
                    color: Colors.orange,
                    onTap: onEdit,
                  ),
                  const SizedBox(width: 8),
                  _ActionButton(
                    icon: Icons.picture_as_pdf_outlined,
                    label: 'PDF',
                    color: Colors.green,
                    onTap: onDownloadPdf,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoChip(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: Colors.grey.shade500),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaginationControls extends StatelessWidget {
  final int currentPage;
  final int totalPages;
  final VoidCallback? onPrev;
  final VoidCallback? onNext;
  const _PaginationControls({
    required this.currentPage,
    required this.totalPages,
    required this.onPrev,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            onPressed: onPrev,
            icon: const Icon(Icons.chevron_left),
            style: IconButton.styleFrom(
              backgroundColor: onPrev != null
                  ? AppColors.primary.withOpacity(0.1)
                  : Colors.grey.shade100,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Page $currentPage of $totalPages',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
          IconButton(
            onPressed: onNext,
            icon: const Icon(Icons.chevron_right),
            style: IconButton.styleFrom(
              backgroundColor: onNext != null
                  ? AppColors.primary.withOpacity(0.1)
                  : Colors.grey.shade100,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool hasFilters;
  final VoidCallback onClearFilters;
  const _EmptyState({required this.hasFilters, required this.onClearFilters});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              hasFilters ? Icons.search_off : Icons.pets,
              size: 72,
              color: Colors.grey.shade300,
            ),
            const SizedBox(height: 16),
            Text(
              hasFilters ? 'No results found' : 'No admissions yet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade600,
              ),
            ),
            if (hasFilters) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: onClearFilters,
                child: const Text('Clear filters'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
