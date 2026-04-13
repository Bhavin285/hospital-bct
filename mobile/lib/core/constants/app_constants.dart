class AppConstants {
  // API
  static const String baseUrl = 'https://api.bezubancharitabletrust.com';

  // Cognito
  static const String cognitoUserPoolId = 'ap-south-1_RZ3FSOkUr';
  static const String cognitoClientId = '2lo5hau24m0shs0d6lntghrhvl';

  // Storage keys
  static const String keyIdToken = 'id_token';
  static const String keyAccessToken = 'access_token';
  static const String keyUser = 'user_data';

  // Pagination
  static const int pageSize = 20;

  // Sex options
  static const List<String> sexOptions = ['Male', 'Female', 'Unknown'];

  // Discharge status options
  static const List<String> dischargeStatuses = [
    're_open',
    'recover',
    'release',
    'death',
  ];

  static const Map<String, String> dischargeStatusLabels = {
    're_open': 'Re-open',
    'recover': 'Recovered',
    'release': 'Released',
    'death': 'Death',
  };

  static const Map<String, int> dischargeStatusColors = {
    're_open': 0xFFFF9800,   // orange
    'recover': 0xFF9C27B0,   // purple
    'release': 0xFF2196F3,   // blue
    'death': 0xFFF44336,     // red
  };
}
