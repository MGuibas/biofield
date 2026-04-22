import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../data/sync/sync_service.dart';
import '../../domain/models/models.dart';

class ObservationFormScreen extends ConsumerStatefulWidget {
  final String projectId;
  final ObservationModel? existing;
  final String? routeId; // asociar a ruta activa
  const ObservationFormScreen({super.key, required this.projectId, this.existing, this.routeId});

  @override
  ConsumerState<ObservationFormScreen> createState() => _ObservationFormScreenState();
}

class _ObservationFormScreenState extends ConsumerState<ObservationFormScreen> {
  final _title       = TextEditingController();
  final _taxonSearch = TextEditingController();
  final _description = TextEditingController();
  final _notes       = TextEditingController();
  final _tagInput    = TextEditingController();
  final _temp        = TextEditingController();
  final _humidity    = TextEditingController();
  final _habitatDesc = TextEditingController();

  String? _selectedTaxonName;
  int?    _selectedTaxonId;
  int     _quantity = 1;
  String? _weather;
  List<String> _tags = [];
  List<File>   _newPhotos = [];
  List<String> _existingPhotos = [];
  File?        _habitatPhoto;
  String?      _existingHabitatPhoto;
  Position?    _position;
  bool _loading  = false;
  bool _locating = false;
  DateTime _observedAt = DateTime.now();

  final _weatherOptions = ['Soleado', 'Nublado', 'Lluvia', 'Niebla', 'Viento', 'Nieve'];

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _title.text       = e.title ?? '';
      _description.text = e.description ?? '';
      _notes.text       = e.notes ?? '';
      _selectedTaxonName = e.taxonName;
      _selectedTaxonId   = e.taxonId;
      _quantity          = e.quantity;
      _weather           = e.weatherCondition;
      _tags              = List.from(e.tags);
      _existingPhotos    = List.from(e.photos);
      _observedAt        = e.observedAt;
      _temp.text         = e.temperature?.toString() ?? '';
      _humidity.text     = e.humidity?.toString() ?? '';
      _habitatDesc.text  = e.habitatDescription ?? '';
      _existingHabitatPhoto = e.habitatPhotoUrl;
    }
    _getLocation();
  }

  Future<void> _getLocation() async {
    if (!mounted) return;
    setState(() => _locating = true);
    try {
      await Geolocator.requestPermission();
      final pos = await Geolocator.getCurrentPosition();
      if (mounted) setState(() => _position = pos);
    } catch (_) {}
    if (mounted) setState(() => _locating = false);
  }

  Future<void> _pickHabitatPhoto(ImageSource source) async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(source: source, imageQuality: 80);
    if (xfile != null) setState(() => _habitatPhoto = File(xfile.path));
  }

  void _showHabitatPhotoOptions() {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.camera_alt),
            title: const Text('Cámara'),
            onTap: () { Navigator.pop(context); _pickHabitatPhoto(ImageSource.camera); },
          ),
          ListTile(
            leading: const Icon(Icons.photo_library),
            title: const Text('Galería'),
            onTap: () { Navigator.pop(context); _pickHabitatPhoto(ImageSource.gallery); },
          ),
        ]),
      ),
    );
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(source: source, imageQuality: 80);
    if (xfile != null) setState(() => _newPhotos.add(File(xfile.path)));
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _observedAt,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (d == null) return;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_observedAt));
    if (t != null) setState(() => _observedAt = DateTime(d.year, d.month, d.day, t.hour, t.minute));
  }

  Future<void> _save() async {
    if (_selectedTaxonName == null || _position == null) return;
    setState(() => _loading = true);

    final data = {
      'taxonName':        _selectedTaxonName,
      'taxonId':          _selectedTaxonId,
      'title':            _title.text.trim().isEmpty ? null : _title.text.trim(),
      'description':      _description.text.trim().isEmpty ? null : _description.text.trim(),
      'latitude':         _position!.latitude,
      'longitude':        _position!.longitude,
      'altitude':         _position!.altitude,
      'observedAt':       _observedAt.toIso8601String(),
      'notes':            _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      'quantity':         _quantity,
      'tagsJson':         _tags.isEmpty ? null : '[${_tags.map((t) => '"$t"').join(',')}]',
      'weatherCondition': _weather,
      'temperature':      _temp.text.isEmpty ? null : double.tryParse(_temp.text),
      'humidity':         _humidity.text.isEmpty ? null : double.tryParse(_humidity.text),
      'habitatDescription': _habitatDesc.text.trim().isEmpty ? null : _habitatDesc.text.trim(),
      'routeId': widget.routeId ?? widget.existing?.routeId,
    };

    try {
      if (widget.existing == null) {
        final res = await ref.read(dioProvider).post('/projects/${widget.projectId}/observations', data: data);
        final obsId = res.data['id'];
        for (final photo in _newPhotos) {
          try {
            final formData = FormData.fromMap({'photo': await MultipartFile.fromFile(photo.path, filename: photo.path.split('/').last)});
            await ref.read(dioProvider).post('/observations/$obsId/photos', data: formData);
          } catch (_) {}
        }
        if (_habitatPhoto != null) {
          try {
            final formData = FormData.fromMap({'photo': await MultipartFile.fromFile(_habitatPhoto!.path, filename: _habitatPhoto!.path.split('/').last)});
            await ref.read(dioProvider).post('/observations/$obsId/habitat-photo', data: formData);
          } catch (_) {}
        }
      } else {
        await ref.read(dioProvider).put('/observations/${widget.existing!.id}', data: data);
        for (final photo in _newPhotos) {
          try {
            final formData = FormData.fromMap({'photo': await MultipartFile.fromFile(photo.path, filename: photo.path.split('/').last)});
            await ref.read(dioProvider).post('/observations/${widget.existing!.id}/photos', data: formData);
          } catch (_) {}
        }
        if (_habitatPhoto != null) {
          try {
            final formData = FormData.fromMap({'photo': await MultipartFile.fromFile(_habitatPhoto!.path, filename: _habitatPhoto!.path.split('/').last)});
            await ref.read(dioProvider).post('/observations/${widget.existing!.id}/habitat-photo', data: formData);
          } catch (_) {}
        }
      }
      if (widget.existing != null) {
        ref.invalidate(observationDetailProvider(widget.existing!.id));
        ref.invalidate(activityProvider(widget.projectId));
      }
      ref.invalidate(observationsProvider(widget.projectId));
      ref.invalidate(observationsPageProvider((projectId: widget.projectId, page: 1)));
      if (mounted) context.pop();
    } catch (_) {
      await ref.read(syncServiceProvider).saveObservationOffline(
        projectId:  widget.projectId,
        taxonName:  _selectedTaxonName!,
        taxonId:    _selectedTaxonId,
        latitude:   _position!.latitude,
        longitude:  _position!.longitude,
        altitude:   _position!.altitude,
        observedAt: _observedAt,
        notes:      _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        quantity:   _quantity,
      );
      if (widget.existing != null) {
        ref.invalidate(observationDetailProvider(widget.existing!.id));
        ref.invalidate(activityProvider(widget.projectId));
      }
      ref.invalidate(observationsProvider(widget.projectId));
      ref.invalidate(observationsPageProvider((projectId: widget.projectId, page: 1)));
      if (mounted) context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final searchResults = ref.watch(taxonSearchProvider(_taxonSearch.text));
    final isEdit = widget.existing != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Editar observación' : 'Nueva observación'),
        actions: [
          IconButton(
            icon: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.save),
            onPressed: (_loading || _selectedTaxonName == null || _position == null) ? null : _save,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── ESPECIE ──────────────────────────────────────────────────
          _sectionTitle('Especie *'),
          if (_selectedTaxonName != null)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.eco, color: Color(0xFF2E7D32)),
              title: Text(_selectedTaxonName!, style: const TextStyle(fontStyle: FontStyle.italic)),
              trailing: IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => setState(() { _selectedTaxonName = null; _selectedTaxonId = null; }),
              ),
            )
          else ...[
            TextField(
              controller: _taxonSearch,
              decoration: const InputDecoration(labelText: 'Buscar especie (iNaturalist)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.search)),
              onChanged: (_) => setState(() {}),
            ),
            if (_taxonSearch.text.length >= 2)
              searchResults.when(
                loading: () => const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
                error: (_, __) => const SizedBox(),
                data: (taxa) => Column(
                  children: taxa.map((t) => ListTile(
                    dense: true,
                    leading: t.photoUrl != null
                        ? ClipRRect(borderRadius: BorderRadius.circular(4), child: Image.network(t.photoUrl!, width: 40, height: 40, fit: BoxFit.cover))
                        : const Icon(Icons.eco),
                    title: Text(t.name, style: const TextStyle(fontStyle: FontStyle.italic)),
                    subtitle: t.commonName != null ? Text(t.commonName!) : null,
                    onTap: () => setState(() { _selectedTaxonName = t.name; _selectedTaxonId = t.id; _taxonSearch.clear(); }),
                  )).toList(),
                ),
              ),
          ],
          const SizedBox(height: 12),

          // ── TÍTULO ───────────────────────────────────────────────────
          _sectionTitle('Título'),
          TextField(controller: _title, decoration: const InputDecoration(hintText: 'Título de la observación', border: OutlineInputBorder())),
          const SizedBox(height: 12),

          // ── DESCRIPCIÓN ──────────────────────────────────────────────
          _sectionTitle('Descripción'),
          TextField(controller: _description, decoration: const InputDecoration(hintText: 'Descripción detallada', border: OutlineInputBorder()), maxLines: 3),
          const SizedBox(height: 12),

          // ── FECHA Y HORA ─────────────────────────────────────────────
          _sectionTitle('Fecha y hora'),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_today),
            title: Text('${_observedAt.day}/${_observedAt.month}/${_observedAt.year}  ${_observedAt.hour.toString().padLeft(2,'0')}:${_observedAt.minute.toString().padLeft(2,'0')}'),
            trailing: TextButton(onPressed: _pickDate, child: const Text('Cambiar')),
          ),
          const SizedBox(height: 12),

          // ── UBICACIÓN ────────────────────────────────────────────────
          _sectionTitle('Ubicación'),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.location_on),
            title: _locating
                ? const Text('Obteniendo ubicación...')
                : _position != null
                    ? Text('${_position!.latitude.toStringAsFixed(5)}, ${_position!.longitude.toStringAsFixed(5)}')
                    : const Text('Sin ubicación', style: TextStyle(color: Colors.red)),
            trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: _getLocation),
          ),
          const SizedBox(height: 12),

          // ── CANTIDAD ─────────────────────────────────────────────────
          _sectionTitle('Cantidad'),
          Row(children: [
            IconButton(icon: const Icon(Icons.remove_circle_outline), onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null),
            Text('$_quantity', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () => setState(() => _quantity++)),
          ]),
          const SizedBox(height: 12),

          // ── CLIMA ────────────────────────────────────────────────────
          _sectionTitle('Condiciones climáticas'),
          Wrap(
            spacing: 8,
            children: _weatherOptions.map((w) => ChoiceChip(
              label: Text(w),
              selected: _weather == w,
              onSelected: (_) => setState(() => _weather = _weather == w ? null : w),
            )).toList(),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: TextField(controller: _temp,     decoration: const InputDecoration(labelText: 'Temperatura (°C)', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: _humidity, decoration: const InputDecoration(labelText: 'Humedad (%)',       border: OutlineInputBorder()), keyboardType: TextInputType.number)),
          ]),
          const SizedBox(height: 12),

          // ── ETIQUETAS ────────────────────────────────────────────────
          _sectionTitle('Etiquetas'),
          Row(children: [
            Expanded(child: TextField(controller: _tagInput, decoration: const InputDecoration(hintText: 'Añadir etiqueta', border: OutlineInputBorder()), onSubmitted: _addTag)),
            IconButton(icon: const Icon(Icons.add), onPressed: () => _addTag(_tagInput.text)),
          ]),
          if (_tags.isNotEmpty)
            Wrap(
              spacing: 6,
              children: _tags.map((t) => Chip(
                label: Text(t),
                onDeleted: () => setState(() => _tags.remove(t)),
              )).toList(),
            ),
          const SizedBox(height: 12),

          // ── NOTAS ────────────────────────────────────────────────────
          _sectionTitle('Notas adicionales'),
          TextField(controller: _notes, decoration: const InputDecoration(hintText: 'Notas de campo', border: OutlineInputBorder()), maxLines: 3),
          const SizedBox(height: 12),

          // ── LUGAR ENCONTRADO ─────────────────────────────────────────
          _sectionTitle('Lugar encontrado'),
          TextField(controller: _habitatDesc, decoration: const InputDecoration(hintText: 'Describe el hábitat o lugar donde fue encontrado', border: OutlineInputBorder()), maxLines: 2),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _showHabitatPhotoOptions,
            icon: const Icon(Icons.add_a_photo_outlined),
            label: const Text('Foto del lugar'),
          ),
          if (_habitatPhoto != null || _existingHabitatPhoto != null) ...[
            const SizedBox(height: 8),
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _habitatPhoto != null
                      ? Image.file(_habitatPhoto!, height: 140, width: double.infinity, fit: BoxFit.cover)
                      : Image.network(
                          _existingHabitatPhoto!.startsWith('http') ? _existingHabitatPhoto! : 'https://fotos.guibas.es/biofield/${_existingHabitatPhoto!}',
                          height: 140, width: double.infinity, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(height: 140, color: Colors.grey.shade200, child: const Icon(Icons.broken_image)),
                        ),
                ),
                Positioned(
                  top: 4, right: 4,
                  child: GestureDetector(
                    onTap: () => setState(() { _habitatPhoto = null; _existingHabitatPhoto = null; }),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                      child: const Icon(Icons.close, color: Colors.white, size: 16),
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),

          // ── FOTOS ────────────────────────────────────────────────────
          _sectionTitle('Fotos'),
          Row(children: [
            OutlinedButton.icon(onPressed: () => _pickPhoto(ImageSource.camera),  icon: const Icon(Icons.camera_alt),    label: const Text('Cámara')),
            const SizedBox(width: 8),
            OutlinedButton.icon(onPressed: () => _pickPhoto(ImageSource.gallery), icon: const Icon(Icons.photo_library), label: const Text('Galería')),
          ]),
          if (_existingPhotos.isNotEmpty || _newPhotos.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  ..._existingPhotos.map((url) => _photoThumb(
                    child: Image.network(
                      url.startsWith('http') ? url : 'https://fotos.guibas.es/biofield/$url',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
                    ),
                  )),
                  ..._newPhotos.map((f) => _photoThumb(child: Image.file(f, fit: BoxFit.cover))),
                ],
              ),
            ),
          ],
          const SizedBox(height: 32),

          FilledButton(
            onPressed: (_loading || _selectedTaxonName == null || _position == null) ? null : _save,
            child: Text(isEdit ? 'Guardar cambios' : 'Crear observación'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  void _addTag(String value) {
    final t = value.trim();
    if (t.isNotEmpty && !_tags.contains(t)) setState(() { _tags.add(t); _tagInput.clear(); });
  }

  Widget _sectionTitle(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
  );

  Widget _photoThumb({required Widget child}) => Container(
    width: 100, height: 100,
    margin: const EdgeInsets.only(right: 8),
    decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), color: Colors.grey.shade200),
    clipBehavior: Clip.hardEdge,
    child: child,
  );
}
