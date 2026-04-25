import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';

class PlantNetService {
  static const _apiKey = '2b10CFwV0jZYV0zZ4TdFQ17';
  static const _baseUrl = 'https://my-api.plantnet.org/v2/identify/all';

  final _dio = Dio();

  Future<List<Map<String, dynamic>>> identifyPlant(File imageFile) async {
    final formData = FormData.fromMap({
      'images': await MultipartFile.fromFile(imageFile.path, filename: 'photo.jpg'),
      'organs': 'auto',
    });

    final response = await _dio.post(
      '$_baseUrl?include-related-images=true&no-reject=true&lang=es&api-key=$_apiKey',
      data: formData,
    );

    final data = response.data;
    final results = <Map<String, dynamic>>[];

    if (data['results'] != null) {
      for (final r in data['results']) {
        final species = r['species'] ?? {};
        final score = (r['score'] as num?)?.toDouble() ?? 0;
        if (score < 0.01) continue;

        String? imageUrl;
        if (r['images'] != null && (r['images'] as List).isNotEmpty) {
          imageUrl = r['images'][0]['url']?['m'];
        }

        results.add({
          'scientificName': species['scientificNameWithoutAuthor'] ?? 'Desconocido',
          'commonName': (species['commonNames'] as List?)?.isNotEmpty == true
              ? species['commonNames'][0]
              : '',
          'confidence': score,
          'kingdom': 'Plantae',
          'description': 'Familia: ${species['family']?['scientificNameWithoutAuthor'] ?? 'Desconocida'}',
          'imageUrl': imageUrl,
        });

        if (results.length >= 3) break;
      }
    }

    return results;
  }
}
