import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/services/gemini_service.dart';
import '../../core/services/plantnet_service.dart';

enum IdentifierEngine { gemini, plantnet }

class SpeciesIdentifierScreen extends StatefulWidget {
  const SpeciesIdentifierScreen({super.key});

  @override
  State<SpeciesIdentifierScreen> createState() => _SpeciesIdentifierScreenState();
}

class _SpeciesIdentifierScreenState extends State<SpeciesIdentifierScreen> {
  final _gemini = GeminiIdentifierService();
  final _plantnet = PlantNetService();
  IdentifierEngine _engine = IdentifierEngine.gemini;
  File? _image;
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _results = [];

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(source: source, imageQuality: 85);
    if (xfile == null) return;

    final file = File(xfile.path);
    setState(() {
      _image = file;
      _results = [];
      _error = null;
      _loading = true;
    });

    try {
      List<Map<String, dynamic>> results;
      if (_engine == IdentifierEngine.plantnet) {
        results = await _plantnet.identifyPlant(file);
      } else {
        results = await _gemini.identifySpecies(file);
      }
      setState(() {
        _results = results;
        if (results.isEmpty) {
          _error = 'No se pudo identificar. Prueba con otra foto más clara.';
        }
      });
    } catch (e) {
      setState(() => _error = 'Error: $e');
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Identificar especie'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // ── SELECTOR DE MOTOR ────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.4),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Expanded(child: _engineButton(
                    icon: Icons.auto_awesome,
                    label: 'Gemini AI',
                    subtitle: 'Todo',
                    engine: IdentifierEngine.gemini,
                    color: Colors.blue,
                  )),
                  const SizedBox(width: 4),
                  Expanded(child: _engineButton(
                    icon: Icons.eco,
                    label: 'PlantNet',
                    subtitle: 'Plantas',
                    engine: IdentifierEngine.plantnet,
                    color: Colors.green,
                  )),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── ZONA DE IMAGEN ──────────────────────────────────────────
            GestureDetector(
              onTap: () => _showPickerOptions(),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: _image != null ? 300 : 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: (_engine == IdentifierEngine.gemini ? Colors.blue : Colors.green).withOpacity(0.3),
                    width: 2,
                  ),
                  image: _image != null
                      ? DecorationImage(image: FileImage(_image!), fit: BoxFit.cover)
                      : null,
                ),
                child: _image == null
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _engine == IdentifierEngine.gemini ? Icons.auto_awesome : Icons.eco,
                            size: 56,
                            color: (_engine == IdentifierEngine.gemini ? Colors.blue : Colors.green).withOpacity(0.5),
                          ),
                          const SizedBox(height: 12),
                          Text('Toca para identificar',
                              style: TextStyle(fontSize: 15, color: theme.colorScheme.onSurface.withOpacity(0.6))),
                          const SizedBox(height: 4),
                          Text(
                            _engine == IdentifierEngine.gemini
                                ? 'Animales · Plantas · Insectos · Hongos'
                                : 'Especializado en plantas y flores',
                            style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface.withOpacity(0.4)),
                          ),
                        ],
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 16),

            // ── BOTONES ─────────────────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _loading ? null : () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Cámara'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Galería'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── LOADING ─────────────────────────────────────────────────
            if (_loading) ...[
              const SizedBox(height: 20),
              const CircularProgressIndicator(),
              const SizedBox(height: 12),
              Text('Identificando con ${_engine == IdentifierEngine.gemini ? "Gemini AI" : "PlantNet"}...',
                  style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.6))),
            ],

            // ── ERROR ───────────────────────────────────────────────────
            if (_error != null && !_loading)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.orange.shade700),
                    const SizedBox(width: 12),
                    Expanded(child: Text(_error!, style: TextStyle(color: Colors.orange.shade900, fontSize: 13))),
                  ],
                ),
              ),

            // ── RESULTADOS ──────────────────────────────────────────────
            if (_results.isNotEmpty && !_loading) ...[
              Align(
                alignment: Alignment.centerLeft,
                child: Text('Resultados', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 12),
              ..._results.asMap().entries.map((entry) {
                final i = entry.key;
                final r = entry.value;
                final confidence = ((r['confidence'] as num?) ?? 0) * 100;
                final scientificName = r['scientificName'] as String? ?? 'Desconocido';
                final commonName = r['commonName'] as String? ?? '';
                final kingdom = r['kingdom'] as String? ?? '';
                final description = r['description'] as String? ?? '';
                final imageUrl = r['imageUrl'] as String?;
                final isTop = i == 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: isTop
                        ? theme.colorScheme.primaryContainer.withOpacity(0.4)
                        : theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(16),
                    border: isTop
                        ? Border.all(color: theme.colorScheme.primary.withOpacity(0.5), width: 1.5)
                        : null,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (imageUrl != null)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(imageUrl, width: 48, height: 48, fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => CircleAvatar(
                                      radius: 24,
                                      backgroundColor: isTop ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
                                      child: Icon(Icons.eco, color: isTop ? Colors.white : theme.colorScheme.onSurface, size: 20),
                                    )),
                              )
                            else
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: isTop ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
                                child: isTop
                                    ? const Icon(Icons.auto_awesome, color: Colors.white, size: 20)
                                    : Text('${i + 1}', style: TextStyle(color: theme.colorScheme.onSurface, fontWeight: FontWeight.bold)),
                              ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(scientificName, style: TextStyle(fontStyle: FontStyle.italic, fontWeight: FontWeight.bold, fontSize: isTop ? 17 : 15)),
                                  if (commonName.isNotEmpty)
                                    Text(commonName, style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface.withOpacity(0.7))),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: isTop ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${confidence.toStringAsFixed(0)}%',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: isTop ? Colors.white : theme.colorScheme.onSurface),
                              ),
                            ),
                          ],
                        ),
                        if (description.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(description, style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface.withOpacity(0.6))),
                        ],
                        if (kingdom.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _kingdomColor(kingdom).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(_kingdomLabel(kingdom),
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _kingdomColor(kingdom))),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(
                      _engine == IdentifierEngine.gemini ? Icons.auto_awesome : Icons.eco,
                      size: 14,
                      color: theme.colorScheme.onSurface.withOpacity(0.4),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _engine == IdentifierEngine.gemini
                            ? 'Gemini AI · 1.000 consultas/día gratis'
                            : 'PlantNet · 500 consultas/día gratis · +50.000 especies',
                        style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurface.withOpacity(0.4)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _engineButton({
    required IconData icon,
    required String label,
    required String subtitle,
    required IdentifierEngine engine,
    required Color color,
  }) {
    final selected = _engine == engine;
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: _loading ? null : () => setState(() { _engine = engine; _results = []; _error = null; }),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: selected ? Border.all(color: color.withOpacity(0.4)) : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: selected ? color : theme.colorScheme.onSurface.withOpacity(0.4), size: 20),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: selected ? color : theme.colorScheme.onSurface.withOpacity(0.5))),
                Text(subtitle, style: TextStyle(fontSize: 10, color: selected ? color.withOpacity(0.7) : theme.colorScheme.onSurface.withOpacity(0.3))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _kingdomColor(String kingdom) {
    switch (kingdom.toLowerCase()) {
      case 'plantae': return Colors.green;
      case 'animalia': return Colors.blue;
      case 'fungi': return Colors.brown;
      default: return Colors.teal;
    }
  }

  String _kingdomLabel(String kingdom) {
    switch (kingdom.toLowerCase()) {
      case 'plantae': return '🌿 Planta';
      case 'animalia': return '🐾 Animal';
      case 'fungi': return '🍄 Hongo';
      default: return '🔬 $kingdom';
    }
  }

  void _showPickerOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.camera_alt)),
              title: const Text('Hacer una foto'),
              subtitle: const Text('Usa la cámara para fotografiar la especie'),
              onTap: () { Navigator.pop(context); _pickImage(ImageSource.camera); },
            ),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.photo_library)),
              title: const Text('Elegir de galería'),
              subtitle: const Text('Selecciona una foto existente'),
              onTap: () { Navigator.pop(context); _pickImage(ImageSource.gallery); },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
