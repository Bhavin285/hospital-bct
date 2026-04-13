import 'dart:io';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:http/http.dart' as http;
import '../models/admit_form_model.dart';
import '../models/discharge_summary_model.dart';

class PdfService {
  static const _tagBorder  = PdfColor.fromInt(0xFF000000);
  static const _tagBg      = PdfColor.fromInt(0xFFFFFF00);
  static const _tagText    = PdfColor.fromInt(0xFF000000);
  static const _titleBlue  = PdfColor.fromInt(0xFF1565C0);
  static const _secBorder  = PdfColor.fromInt(0xFFCCCCCC);
  static const _labelCol   = PdfColors.black;
  static const _valueCol   = PdfColors.black;
  static const _underline  = PdfColor.fromInt(0xFFCCCCCC);
  static const _photoBorder = PdfColor.fromInt(0xFF999999);
  static const _photoText   = PdfColor.fromInt(0xFF999999);
  static const _stBorder   = PdfColor.fromInt(0xFFCCCCCC);
  static const _stLabelTxt = PdfColor.fromInt(0xFF333333);
  static const _stDateTxt  = PdfColor.fromInt(0xFFAAAAAA);
  static const _stDivider  = PdfColor.fromInt(0xFFCCCCCC);

  static Future<Uint8List> generateAdmissionPdf(
      Map<String, dynamic> admission) async {
    final logo      = await _loadLogoFromAssets();
    final animalImg = await _loadAnimalImage(admission['photo_url']);
    final tagNo     = _resolveTagNo(admission);
    final dtStr     = _formatAdmissionDateTime(admission);
    final sexRaw    = (admission['sex'] ?? '').toString().toLowerCase();
    final sex       = sexRaw == 'male' ? 'Male'
                    : sexRaw == 'female' ? 'Female'
                    : _s(admission['sex']);
    final diagStr   = _s(admission['diagnosis']);

    final pdf = pw.Document();
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 28, vertical: 14),
        build: (pw.Context ctx) => pw.Container(
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: PdfColors.black, width: 2),
            borderRadius: pw.BorderRadius.circular(1),
          ),
          padding: const pw.EdgeInsets.all(10),
          child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
          children: [
            _header(logo, tagNo),
            pw.SizedBox(height: 10),

            _sectionBox(
              'OWNER INFORMATION',
              _ownerContent(admission, animalImg),
            ),
            pw.SizedBox(height: 10),

            _sectionBox(
              'ANIMAL INFORMATION',
              _animalContent(admission, dtStr, sex, diagStr),
            ),
            pw.SizedBox(height: 10),

            _sectionBox(
              'DOCTOR & STAFF',
              _twoColField(
                'Present Doctor:', _s(admission['doctorName']),
                'Present Staff:',  _s(admission['staffName']),
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Expanded(
              child: _sectionBox(
                'STATUS',
                pw.Expanded(child: _statusCards()),
                bodyFill: true,
              ),
            ),
          ],
          ),
        ),
      ),
    );
    return pdf.save();
  }

  static pw.Widget _header(pw.ImageProvider? logo, String tagNo) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.stretch,
      children: [
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            logo != null
                ? pw.Container(
                    width: 75, height: 75,
                    child: pw.Image(logo, fit: pw.BoxFit.contain))
                : pw.SizedBox(width: 75, height: 75),
            pw.SizedBox(width: 12),

            pw.Expanded(
              child: pw.Container(
                height: 75,
                child: pw.Column(
                  mainAxisAlignment: pw.MainAxisAlignment.center,
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Text(
                      'Bezuban Charitable Trust',
                      style: pw.TextStyle(
                        fontSize: 20,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.black,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'ANIMAL CASE REPORT',
                      style: pw.TextStyle(
                        fontSize: 13,
                        fontWeight: pw.FontWeight.bold,
                        color: _titleBlue,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            pw.SizedBox(width: 12),

            pw.Container(
              padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: pw.BoxDecoration(
                color: _tagBg,
                border: pw.Border.all(color: _tagBorder, width: 2),
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Text(
                'TAG: $tagNo',
                style: pw.TextStyle(
                  fontSize: 13,
                  fontWeight: pw.FontWeight.bold,
                  color: _tagText,
                ),
              ),
            ),
          ],
        ),

        pw.SizedBox(height: 6),
      ],
    );
  }

  static pw.Widget _sectionBox(
    String title,
    pw.Widget content, {
    bool bodyFill = false,
  }) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.stretch,
      children: [
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(vertical: 9),
          decoration: pw.BoxDecoration(
            color: PdfColors.white,
            border: pw.Border.all(color: PdfColors.black, width: 1.5),
            borderRadius: pw.BorderRadius.circular(8),
          ),
          child: pw.Center(
            child: pw.Text(
              title,
              style: pw.TextStyle(
                fontSize: 12,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.black,
              ),
            ),
          ),
        ),
        pw.SizedBox(height: 6),
        bodyFill
            ? content
            : pw.Padding(
                padding: const pw.EdgeInsets.symmetric(horizontal: 4),
                child: content,
              ),
      ],
    );
  }

  static pw.Widget _ownerContent(
      Map<String, dynamic> a, pw.ImageProvider? img) {
    return pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Expanded(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              _field('Name',      _s(a['ownerName'])),
              _field('Mobile No', _s(a['ownerMobile'])),
              _fieldMulti('Address', _truncate(_s(a['ownerAddress']))),
            ],
          ),
        ),
        pw.SizedBox(width: 18),
        pw.Container(
          width: 150, height: 150,
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: _photoBorder, width: 1.5),
            borderRadius: pw.BorderRadius.circular(4),
          ),
          child: img != null
              ? pw.Image(img, fit: pw.BoxFit.cover)
              : pw.Center(
                  child: pw.Column(
                    mainAxisAlignment: pw.MainAxisAlignment.center,
                    children: [
                      pw.Text('ANIMAL',
                          style: pw.TextStyle(
                              fontSize: 10, fontWeight: pw.FontWeight.bold,
                              color: _photoText)),
                      pw.Text('PHOTO',
                          style: pw.TextStyle(
                              fontSize: 10, fontWeight: pw.FontWeight.bold,
                              color: _photoText)),
                    ],
                  ),
                ),
        ),
      ],
    );
  }

  static pw.Widget _animalContent(
    Map<String, dynamic> a,
    String dtStr,
    String sex,
    String diagStr,
  ) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        _twoColField('Animal Name:', _s(a['petName']),
                     'Date & Time:', dtStr),
        _twoColField('Age:',         _s(a['age']),
                     'Breed:',       _s(a['breed'])),
        _twoColField('Sex:',         sex,
                     'Body Colour:', _s(a['bodyColour'])),
        _field('Injury', _s(a['animalInjury'])),
        _fieldMulti('Diagnosis', diagStr),
      ],
    );
  }

  static pw.Widget _statusCards() {
    const labels = ['RE-OPEN', 'RELEASE', 'RECOVER', 'DEATH'];
    return pw.Padding(
      padding: const pw.EdgeInsets.all(6),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.stretch,
        children: labels.asMap().entries.map((e) {
          final isLast = e.key == labels.length - 1;
          return pw.Expanded(
            child: pw.Container(
              margin: pw.EdgeInsets.only(bottom: isLast ? 0 : 4),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: _stBorder, width: 1),
                borderRadius: pw.BorderRadius.circular(8),
              ),
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                children: [
                  pw.Container(
                    width: 100,
                    decoration: pw.BoxDecoration(
                      border: pw.Border(
                        right: pw.BorderSide(color: _stDivider, width: 1),
                      ),
                    ),
                    child: pw.Center(
                      child: pw.Column(
                        mainAxisAlignment: pw.MainAxisAlignment.center,
                        children: [
                          pw.Text(
                            e.value,
                            style: pw.TextStyle(
                              fontSize: 10,
                              fontWeight: pw.FontWeight.bold,
                              color: _stLabelTxt,
                            ),
                          ),
                          pw.SizedBox(height: 3),
                          pw.Text(
                            'DATE: DD / MM / YYYY',
                            style: pw.TextStyle(
                              fontSize: 6,
                              color: _stDateTxt,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  pw.Expanded(child: pw.SizedBox()),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  static pw.Widget _field(String label, String value) {
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 8, top: 6),
      decoration: pw.BoxDecoration(
        border: pw.Border(
          bottom: pw.BorderSide(color: _underline, width: 0.75),
        ),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 100,
            child: pw.Text('$label:',
                style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                    color: _labelCol)),
          ),
          pw.Expanded(
            child: pw.Text(value,
                style: pw.TextStyle(fontSize: 11, color: _valueCol)),
          ),
        ],
      ),
    );
  }

  static pw.Widget _fieldMulti(String label, String value) {
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 8, top: 6),
      decoration: pw.BoxDecoration(
        border: pw.Border(
          bottom: pw.BorderSide(color: _underline, width: 0.75),
        ),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 100,
            child: pw.Text('$label:',
                style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                    color: _labelCol)),
          ),
          pw.Expanded(
            child: pw.Text(value,
                style: pw.TextStyle(fontSize: 11, color: _valueCol),
                maxLines: 6),
          ),
        ],
      ),
    );
  }

  static pw.Widget _twoColField(
      String l1, String v1, String l2, String v2) {
    const double labelW = 100;
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 8, top: 6),
      decoration: pw.BoxDecoration(
        border: pw.Border(
          bottom: pw.BorderSide(color: _underline, width: 0.75),
        ),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.SizedBox(
                  width: labelW,
                  child: pw.Text(l1,
                      style: pw.TextStyle(
                          fontSize: 11,
                          fontWeight: pw.FontWeight.bold,
                          color: _labelCol)),
                ),
                pw.Expanded(
                  child: pw.Text(v1,
                      style: pw.TextStyle(fontSize: 11, color: _valueCol),
                      maxLines: 2),
                ),
              ],
            ),
          ),
          pw.SizedBox(width: 12),
          pw.Expanded(
            child: pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.SizedBox(
                  width: labelW,
                  child: pw.Text(l2,
                      style: pw.TextStyle(
                          fontSize: 11,
                          fontWeight: pw.FontWeight.bold,
                          color: _labelCol)),
                ),
                pw.Expanded(
                  child: pw.Text(v2,
                      style: pw.TextStyle(fontSize: 11, color: _valueCol),
                      maxLines: 2),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _s(dynamic v) {
    if (v == null) return '';
    return v.toString().trim();
  }

  static String _truncate(String text, {int max = 110}) {
    if (text.length <= max) return text;
    return '${text.substring(0, max).trimRight()}...';
  }

  static String _resolveTagNo(Map<String, dynamic> a) {
    final raw = a['tag_no']?.toString() ?? '';
    if (raw.isNotEmpty) return raw;
    final disp = a['tagNo']?.toString() ?? '';
    if (disp.isNotEmpty) return disp;
    return 'N/A';
  }

  static String _formatAdmissionDateTime(Map<String, dynamic> a) {
    if (a['admissionDate'] == null) return '';
    try {
      DateTime dt = a['admissionDate'] is DateTime
          ? a['admissionDate'] as DateTime
          : _parseDate(a['admissionDate'].toString());
      dt = _applyTime(a, dt);
      final day   = dt.day.toString().padLeft(2, '0');
      final month = dt.month.toString().padLeft(2, '0');
      final year  = dt.year;
      int   hour  = dt.hour;
      final min   = dt.minute.toString().padLeft(2, '0');
      final ampm  = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 == 0 ? 12 : hour % 12;
      return '$day/$month/$year (${hour.toString().padLeft(2, '0')}:$min $ampm)';
    } catch (e) {
      return a['admissionDate']?.toString() ?? '';
    }
  }

  static DateTime _parseDate(String s) {
    try { return DateTime.parse(s); } catch (_) {}
    try {
      final p = s.split('/');
      if (p.length == 3) {
        return DateTime(int.parse(p[2]), int.parse(p[1]), int.parse(p[0]));
      }
    } catch (_) {}
    return DateTime.now();
  }

  static DateTime _applyTime(Map<String, dynamic> a, DateTime dt) {
    final t = a['admissionTime']?.toString() ?? '';
    if (t.isEmpty || !t.contains(':')) return dt;
    try {
      final parts  = t.split(' ');
      final hm     = parts[0].split(':');
      int   hour   = int.parse(hm[0]);
      int   minute = int.parse(hm[1]);
      if (parts.length > 1) {
        if (parts[1].toUpperCase() == 'PM' && hour < 12) hour += 12;
        else if (parts[1].toUpperCase() == 'AM' && hour == 12) hour = 0;
      }
      return DateTime(dt.year, dt.month, dt.day, hour, minute);
    } catch (_) {}
    return dt;
  }

  static Future<pw.ImageProvider?> _loadLogoFromAssets() async {
    try {
      final data = await rootBundle.load('assets/images/pdf_logo.jpg');
      return pw.MemoryImage(data.buffer.asUint8List());
    } catch (e) {
      print('Logo load error: $e');
      return null;
    }
  }

  static Future<pw.ImageProvider?> _loadAnimalImage(String? url) async {
    if (url == null || url.isEmpty) return null;
    try {
      final u   = url.startsWith('http') ? url : 'https://$url';
      final res = await http.get(Uri.parse(u))
          .timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) return pw.MemoryImage(res.bodyBytes);
    } catch (e) {
      print('Animal image error: $e');
    }
    return null;
  }

  static Future<void> saveAndSharePdf(
      Uint8List bytes, String fileName) async {
    try {
      final safe = fileName.replaceAll(RegExp(r'[/\\:*?"<>|]'), '_');
      final dir  = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$safe');
      await file.writeAsBytes(bytes);
      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'Admission Report - ${safe.replaceAll('.pdf', '')}',
      );
    } catch (e) {
      print('Share error: $e');
      rethrow;
    }
  }

  static Future<void> printPdf(Uint8List bytes) async {
    await Printing.layoutPdf(onLayout: (_) => bytes);
  }

  static Future<void> openPdf(Uint8List bytes, String fileName) async {
    try {
      final safe = fileName.replaceAll(RegExp(r'[/\\:*?"<>|]'), '_');
      final dir  = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$safe');
      await file.writeAsBytes(bytes);
      await OpenFile.open(file.path);
    } catch (e) {
      print('Open error: $e');
      rethrow;
    }
  }

  // ── Compatibility helpers ──────────────────────────────────────────────────

  /// Converts an [AdmitFormModel] to the map format [generateAdmissionPdf] expects.
  static Map<String, dynamic> _modelToMap(AdmitFormModel data) => {
        'tag_no':        data.tagNumber,
        'ownerName':     data.name,
        'ownerMobile':   data.mobile,
        'ownerAddress':  data.address,
        'petName':       data.animalName,
        'admissionDate': data.date,
        'admissionTime': data.time,
        'sex':           data.sex,
        'age':           data.age,
        'breed':         data.breed,
        'bodyColour':    data.bodyColour,
        'animalInjury':  data.animalInjury,
        'diagnosis':     data.diagnosis,
        'doctorName':    data.presentDr,
        'staffName':     data.presentStaff,
        'photo_url':     data.photoUrl,
      };

  /// Generates the admission PDF from an [AdmitFormModel].
  static Future<Uint8List> generateAdmissionPdfFromModel(
          AdmitFormModel data) =>
      generateAdmissionPdf(_modelToMap(data));

  /// Generates the full case-view PDF with animal info grid + treatment history.
  static Future<Uint8List> generateViewPdf(
      AdmitFormModel data, List<DischargeSummaryModel> history) async {
    final logo      = await _loadLogoFromAssets();
    final animalImg = await _loadAnimalImage(data.photoUrl);
    final tagNo     = data.tagNumber;
    final dateOnly  = _formatDateOnly(data.date);
    final sexRaw    = data.sex.toLowerCase();
    final sex       = sexRaw == 'male'   ? 'Male'
                    : sexRaw == 'female' ? 'Female'
                    : data.sex;

    final pdf = pw.Document();
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 28, vertical: 14),
        build: (ctx) => [
          _header(logo, tagNo),
          pw.SizedBox(height: 10),

          // ── ANIMAL INFORMATION ────────────────────────────
          _sectionBox(
            'ANIMAL INFORMATION',
            pw.Row(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Container(
                  width: 130,
                  height: 150,
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: _photoBorder, width: 1.5),
                  ),
                  child: animalImg != null
                      ? pw.Image(animalImg, fit: pw.BoxFit.cover)
                      : pw.Center(
                          child: pw.Column(
                            mainAxisAlignment: pw.MainAxisAlignment.center,
                            children: [
                              pw.Text('ANIMAL',
                                  style: pw.TextStyle(
                                      fontSize: 10,
                                      fontWeight: pw.FontWeight.bold,
                                      color: _photoText)),
                              pw.Text('PHOTO',
                                  style: pw.TextStyle(
                                      fontSize: 10,
                                      fontWeight: pw.FontWeight.bold,
                                      color: _photoText)),
                            ],
                          ),
                        ),
                ),
                pw.SizedBox(width: 12),
                pw.Expanded(
                  child: pw.Table(
                    border: pw.TableBorder.all(
                        color: _secBorder, width: 0.5),
                    children: [
                      _viewGridRow(
                          'Animal Name', data.animalName, 'Breed', data.breed),
                      _viewGridRow(
                          'Body Colour', data.bodyColour, 'Sex', sex),
                      _viewGridRow(
                          'Age', data.age, 'Injury', data.animalInjury),
                      _viewGridRow(
                          'Admission Date', dateOnly,
                          'Admission Time', data.time),
                    ],
                  ),
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 10),

          // ── Summary fields ────────────────────────────────
          _field('Diagnosis', data.diagnosis),
          _twoColField(
              'Owner Name:', data.name, 'Mobile:', data.mobile),
          _field('Address', data.address),
          _twoColField(
              'Doctor:', data.presentDr, 'Staff:', data.presentStaff),
          pw.SizedBox(height: 10),

          // ── TREATMENT HISTORY ────────────────────────────
          _sectionBox(
            'TREATMENT HISTORY',
            history.isEmpty
                ? pw.Padding(
                    padding: const pw.EdgeInsets.all(10),
                    child: pw.Center(
                      child: pw.Text(
                        'No treatment entries recorded.',
                        style: pw.TextStyle(
                            fontSize: 9,
                            fontStyle: pw.FontStyle.italic,
                            color: _photoText),
                      ),
                    ),
                  )
                : pw.Column(
                    children: history
                        .map((e) => _viewHistoryEntry(e))
                        .toList(),
                  ),
          ),
        ],
      ),
    );
    return pdf.save();
  }

  static String _formatDateOnly(String? d) {
    if (d == null || d.isEmpty) return '';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(d));
    } catch (_) {
      return d;
    }
  }

  static pw.TableRow _viewGridRow(
          String l1, String v1, String l2, String v2) =>
      pw.TableRow(children: [
        pw.Padding(
          padding: const pw.EdgeInsets.all(6),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(l1,
                  style: pw.TextStyle(fontSize: 8, color: _secBorder)),
              pw.SizedBox(height: 2),
              pw.Text(v1, style: const pw.TextStyle(fontSize: 10)),
            ],
          ),
        ),
        pw.Padding(
          padding: const pw.EdgeInsets.all(6),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(l2,
                  style: pw.TextStyle(fontSize: 8, color: _secBorder)),
              pw.SizedBox(height: 2),
              pw.Text(v2, style: const pw.TextStyle(fontSize: 10)),
            ],
          ),
        ),
      ]);

  static pw.Widget _viewHistoryEntry(DischargeSummaryModel entry) {
    final color   = _historyStatusColor(entry.status);
    final label   = _historyStatusLabel(entry.status);
    final dateStr = _formatDateOnly(entry.date);
    final timePart = entry.time.isNotEmpty ? '  ·  ${entry.time}' : '';

    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6),
      child: pw.Container(
        decoration: pw.BoxDecoration(
          border: pw.Border.all(color: _secBorder, width: 0.5),
          borderRadius: pw.BorderRadius.circular(4),
        ),
        padding: const pw.EdgeInsets.all(8),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(children: [
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: pw.BoxDecoration(
                  color: color,
                  borderRadius: pw.BorderRadius.circular(3),
                ),
                child: pw.Text(
                  label.toUpperCase(),
                  style: pw.TextStyle(
                      fontSize: 8,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.white),
                ),
              ),
              pw.SizedBox(width: 8),
              pw.Text('$dateStr$timePart',
                  style: pw.TextStyle(fontSize: 9, color: _secBorder)),
            ]),
            pw.SizedBox(height: 4),
            pw.Text(entry.description,
                style: const pw.TextStyle(fontSize: 10)),
          ],
        ),
      ),
    );
  }

  static PdfColor _historyStatusColor(String s) {
    switch (s) {
      case 're_open': return const PdfColor(0.357, 0.129, 0.714);
      case 'recover': return const PdfColor(0.086, 0.396, 0.204);
      case 'release': return const PdfColor(0.114, 0.306, 0.847);
      case 'death':   return const PdfColor(0.600, 0.106, 0.106);
      default:        return const PdfColor(0.420, 0.447, 0.502);
    }
  }

  static String _historyStatusLabel(String s) {
    const labels = {
      're_open': 'Re-open',
      'recover': 'Recover',
      'release': 'Release',
      'death':   'Death',
    };
    return labels[s] ?? 'Unknown';
  }

  /// Backward-compatible alias for [saveAndSharePdf].
  static Future<void> sharePdf(Uint8List bytes, String fileName) =>
      saveAndSharePdf(bytes, fileName);
}