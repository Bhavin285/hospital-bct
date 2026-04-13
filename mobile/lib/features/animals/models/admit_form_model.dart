class AdmitFormModel {
  final String tagNumber;
  final String name;
  final String mobile;
  final String address;
  final String animalName;
  final String diagnosis;
  final String date;
  final String animalInjury;
  final String sex;
  final String age;
  final String bodyColour;
  final String breed;
  final String time;
  final String presentDr;
  final String presentStaff;
  final String? otherContact;
  final String? photoUrl;
  final String? createdBy;
  final String? createdAt;
  final String? latestStatus;

  AdmitFormModel({
    required this.tagNumber,
    required this.name,
    required this.mobile,
    required this.address,
    required this.animalName,
    required this.diagnosis,
    required this.date,
    required this.animalInjury,
    required this.sex,
    required this.age,
    required this.bodyColour,
    required this.breed,
    required this.time,
    required this.presentDr,
    required this.presentStaff,
    this.otherContact,
    this.photoUrl,
    this.createdBy,
    this.createdAt,
    this.latestStatus,
  });

  factory AdmitFormModel.fromJson(Map<String, dynamic> json) {
    String _s(String key) =>
        (json[key] ?? json[_toCamel(key)] ?? '').toString();

    return AdmitFormModel(
      tagNumber: _s('tag_number'),
      name: _s('name'),
      mobile: _s('mobile'),
      address: _s('address'),
      animalName: _s('animal_name'),
      diagnosis: _s('diagnosis'),
      date: _s('date'),
      animalInjury: _s('animal_injury'),
      sex: _s('sex'),
      age: _s('age'),
      bodyColour: _s('body_colour'),
      breed: _s('breed'),
      time: _s('time'),
      presentDr: _s('present_dr'),
      presentStaff: _s('present_staff'),
      otherContact: json['other_contact']?.toString(),
      photoUrl: json['photo_url']?.toString() ?? json['photo']?.toString(),
      createdBy: json['created_by']?.toString(),
      createdAt: json['created_at']?.toString(),
      latestStatus: json['latest_status']?.toString()
          ?? json['latestStatus']?.toString()
          ?? json['status']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'tag_number': tagNumber,
        'name': name,
        'mobile': mobile,
        'address': address,
        'animal_name': animalName,
        'diagnosis': diagnosis,
        'date': date,
        'animal_injury': animalInjury,
        'sex': sex,
        'age': age,
        'body_colour': bodyColour,
        'breed': breed,
        'time': time,
        'present_dr': presentDr,
        'present_staff': presentStaff,
        if (otherContact != null) 'other_contact': otherContact,
        if (createdBy != null) 'created_by': createdBy,
      };

  static String _toCamel(String snake) {
    final parts = snake.split('_');
    return parts[0] +
        parts
            .skip(1)
            .map((p) => p[0].toUpperCase() + p.substring(1))
            .join('');
  }

  AdmitFormModel copyWith({
    String? tagNumber,
    String? name,
    String? mobile,
    String? address,
    String? animalName,
    String? diagnosis,
    String? date,
    String? animalInjury,
    String? sex,
    String? age,
    String? bodyColour,
    String? breed,
    String? time,
    String? presentDr,
    String? presentStaff,
    String? otherContact,
    String? photoUrl,
    String? createdBy,
    String? createdAt,
    String? latestStatus,
  }) {
    return AdmitFormModel(
      tagNumber: tagNumber ?? this.tagNumber,
      name: name ?? this.name,
      mobile: mobile ?? this.mobile,
      address: address ?? this.address,
      animalName: animalName ?? this.animalName,
      diagnosis: diagnosis ?? this.diagnosis,
      date: date ?? this.date,
      animalInjury: animalInjury ?? this.animalInjury,
      sex: sex ?? this.sex,
      age: age ?? this.age,
      bodyColour: bodyColour ?? this.bodyColour,
      breed: breed ?? this.breed,
      time: time ?? this.time,
      presentDr: presentDr ?? this.presentDr,
      presentStaff: presentStaff ?? this.presentStaff,
      otherContact: otherContact ?? this.otherContact,
      photoUrl: photoUrl ?? this.photoUrl,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      latestStatus: latestStatus ?? this.latestStatus,
    );
  }
}
