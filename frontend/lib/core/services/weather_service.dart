import 'package:dio/dio.dart';

class WeatherService {
  static final Dio _dio = Dio();

  /// Fetches weather data using Open-Meteo free API (No API Key required)
  /// WMO Weather interpretation codes (WW)
  /// 0: Clear sky
  /// 1, 2, 3: Mainly clear, partly cloudy, and overcast
  /// 45, 48: Fog and depositing rime fog
  /// 51, 53, 55, 61, 63, 65, 80, 81, 82: Drizzle & Rain
  /// 71, 73, 75, 77, 85, 86: Snow fall & Snow showers
  static Future<Map<String, dynamic>?> getCurrentWeather(double lat, double lon) async {
    try {
      final res = await _dio.get(
        'https://api.open-meteo.com/v1/forecast',
        queryParameters: {
          'latitude': lat,
          'longitude': lon,
          'current': 'temperature_2m,relative_humidity_2m,weather_code',
        },
      );

      final current = res.data['current'] as Map<String, dynamic>;
      final temp = current['temperature_2m'] as num;
      final hum = current['relative_humidity_2m'] as num;
      final code = current['weather_code'] as int;

      return {
        'temperature': temp.toDouble(),
        'humidity': hum.toDouble(),
        'condition': _mapWmoCodeToBioField(code),
      };
    } catch (e) {
      return null;
    }
  }

  static String _mapWmoCodeToBioField(int code) {
    if (code == 0 || code == 1) return 'Soleado';
    if (code == 2 || code == 3) return 'Nublado';
    if (code == 45 || code == 48) return 'Niebla';
    if (code >= 51 && code <= 67) return 'Lluvia';
    if (code >= 80 && code <= 82) return 'Lluvia';
    if (code >= 71 && code <= 77) return 'Nieve';
    if (code >= 85 && code <= 86) return 'Nieve';
    return 'Nublado'; // fallback
  }
}
