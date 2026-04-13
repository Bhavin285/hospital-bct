import '../../../core/services/api_client.dart';
import '../../../core/constants/app_constants.dart';
import '../models/admit_form_model.dart';
import '../models/discharge_summary_model.dart';

class AnimalsListResult {
  final List<AdmitFormModel> items;
  final int total;
  final int pages;
  AnimalsListResult({
    required this.items,
    required this.total,
    required this.pages,
  });
}

class AnimalsService {
  static final AnimalsService _instance = AnimalsService._internal();
  factory AnimalsService() => _instance;
  AnimalsService._internal();

  final ApiClient _client = ApiClient();

  Future<AnimalsListResult> fetchAnimals({
    int page = 1,
    String? search,
    String? fromDate,
    String? toDate,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'pageSize': AppConstants.pageSize,
      if (search != null && search.isNotEmpty) 'search': search,
      if (fromDate != null && fromDate.isNotEmpty) 'from_date': fromDate,
      if (toDate != null && toDate.isNotEmpty) 'to_date': toDate,
    };

    final data = await _client.get('/admit_form', queryParams: params);

    List<dynamic> rawItems = [];
    int total = 0;
    int pages = 1;

    // Backend returns {data: [...], pagination: {totalRecords, totalPages, ...}}
    if (data['data'] is List) {
      rawItems = data['data'] as List;
      final pagination = data['pagination'] as Map<String, dynamic>?;
      total = (pagination?['totalRecords'] as num?)?.toInt()
          ?? (data['total'] as num?)?.toInt()
          ?? rawItems.length;
      pages = (pagination?['totalPages'] as num?)?.toInt()
          ?? (data['pages'] as num?)?.toInt()
          ?? 1;
    } else if (data['items'] is List) {
      rawItems = data['items'] as List;
      final pagination = data['pagination'] as Map<String, dynamic>?;
      total = (pagination?['totalRecords'] as num?)?.toInt()
          ?? (data['total'] as num?)?.toInt()
          ?? rawItems.length;
      pages = (pagination?['totalPages'] as num?)?.toInt()
          ?? (data['pages'] as num?)?.toInt()
          ?? 1;
    }

    final items = rawItems
        .map((e) => AdmitFormModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return AnimalsListResult(items: items, total: total, pages: pages);
  }

  Future<AdmitFormModel> getAnimal(String tagNumber) async {
    final data = await _client.get('/admit_form/$tagNumber');
    return AdmitFormModel.fromJson(data);
  }

  Future<AdmitFormModel> createAnimal(Map<String, dynamic> body) async {
    final data = await _client.post('/admit_form', body);
    return AdmitFormModel.fromJson(data);
  }

  Future<AdmitFormModel> updateAnimal(
    String tagNumber,
    Map<String, dynamic> body,
  ) async {
    final data = await _client.patch('/admit_form/$tagNumber', body);
    return AdmitFormModel.fromJson(data);
  }

  Future<void> deleteAnimal(String tagNumber) async {
    await _client.delete('/admit_form/$tagNumber');
  }

  Future<List<DischargeSummaryModel>> getDischargeSummaries(
    String tagNumber,
  ) async {
    // Use getFlexible because the endpoint may return a bare JSON array
    // or a wrapped object — both are handled without a cast error.
    final dynamic raw =
        await _client.getFlexible('/discharge_summary/$tagNumber');

    List<dynamic> rawList = [];
    if (raw is List) {
      rawList = raw;
    } else if (raw is Map<String, dynamic>) {
      if (raw['summaries'] is List) {
        rawList = raw['summaries'] as List;
      } else if (raw['data'] is List) {
        rawList = raw['data'] as List;
      } else if (raw['items'] is List) {
        rawList = raw['items'] as List;
      }
    }

    return rawList
        .map((e) =>
            DischargeSummaryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DischargeSummaryModel> createDischargeSummary(
    Map<String, dynamic> body,
  ) async {
    final data = await _client.post('/discharge_summary', body);
    return DischargeSummaryModel.fromJson(data);
  }

  Future<void> deleteDischargeSummary(
    String tagNumber,
    String summaryId,
  ) async {
    await _client.delete('/discharge_summary/$tagNumber/$summaryId');
  }
}
