class DischargeSummaryModel {
  final String id;
  final String tagNumber;
  final String status;
  final String description;
  final String date;
  final String time;
  final String? photoUrl;
  final String? createdBy;
  final String? createdAt;

  DischargeSummaryModel({
    required this.id,
    required this.tagNumber,
    required this.status,
    required this.description,
    required this.date,
    required this.time,
    this.photoUrl,
    this.createdBy,
    this.createdAt,
  });

  factory DischargeSummaryModel.fromJson(Map<String, dynamic> json) {
    return DischargeSummaryModel(
      id: json['id']?.toString() ?? json['summary_id']?.toString() ?? '',
      tagNumber: json['tag_number']?.toString() ?? '',
      status: json['status']?.toString() ?? 're_open',
      description: json['description']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      time: json['time']?.toString() ?? '',
      photoUrl: json['photo_url']?.toString() ?? json['photo']?.toString(),
      createdBy: json['created_by']?.toString(),
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'tag_number': tagNumber,
        'status': status,
        'description': description,
        'date': date,
        'time': time,
        if (createdBy != null) 'created_by': createdBy,
      };

  String get statusLabel {
    const labels = {
      're_open': 'Re-open',
      'recover': 'Recovered',
      'release': 'Released',
      'death': 'Death',
    };
    return labels[status] ?? status;
  }
}
