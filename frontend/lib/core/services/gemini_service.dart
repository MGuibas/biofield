import 'dart:convert';
import 'dart:io';
import 'package:google_generative_ai/google_generative_ai.dart';

class GeminiIdentifierService {
  static const _apiKey = 'AIzaSyBQ3wHa9HNTnEmNSyIB6anpnhYWUFoqdkk';

  late final GenerativeModel _model;

  GeminiIdentifierService() {
    _model = GenerativeModel(
      model: 'gemini-2.0-flash-lite',
      apiKey: _apiKey,
    );
  }

  Future<List<Map<String, dynamic>>> identifySpecies(File imageFile) async {
    final imageBytes = await imageFile.readAsBytes();
    final mimeType = _getMimeType(imageFile.path);

    final prompt = TextPart('''
Eres un experto biólogo taxónomo. Analiza esta imagen e identifica la especie del organismo (animal, planta, insecto, hongo, etc.).

Responde SOLO en formato JSON válido, sin markdown ni bloques de código. Responde con un array JSON con máximo 3 sugerencias ordenadas por probabilidad:

[
  {
    "scientificName": "Nombre científico en latín",
    "commonName": "Nombre común en español",
    "confidence": 0.95,
    "kingdom": "Animalia/Plantae/Fungi",
    "description": "Descripción breve de 1 línea sobre la especie"
  }
]

Si no puedes identificar nada, responde: []
''');

    final imagePart = DataPart(mimeType, imageBytes);

    final response = await _model.generateContent([
      Content.multi([prompt, imagePart]),
    ]);

    final text = response.text?.trim() ?? '[]';

    try {
      // Limpiar posibles bloques de código markdown
      String cleanJson = text;
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replaceAll(RegExp(r'^```\w*\n?'), '').replaceAll(RegExp(r'\n?```$'), '');
      }
      
      final List<dynamic> parsed = jsonDecode(cleanJson);
      return parsed.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (e) {
      print('Error parsing Gemini response: $text');
      print('Parse error: $e');
      return [];
    }
  }

  String _getMimeType(String path) {
    final ext = path.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}
