import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../data/sync/sync_service.dart';
import '../../domain/models/models.dart';

class NoteFormScreen extends ConsumerStatefulWidget {
  final String projectId;
  final NoteModel? existing;
  const NoteFormScreen({super.key, required this.projectId, this.existing});

  @override
  ConsumerState<NoteFormScreen> createState() => _NoteFormScreenState();
}

class _NoteFormScreenState extends ConsumerState<NoteFormScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  Position? _position;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _title.text = e.title;
      _body.text = e.body;
    }
    _getLocation();
  }

  Future<void> _getLocation() async {
    try {
      await Geolocator.requestPermission();
      final pos = await Geolocator.getCurrentPosition();
      if (mounted) setState(() => _position = pos);
    } catch (_) {}
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty) return;
    setState(() => _loading = true);
    final isEdit = widget.existing != null;
    try {
      if (isEdit) {
        await ref.read(dioProvider).put('/notes/${widget.existing!.id}', data: {
          'title': _title.text.trim(),
          'body': _body.text,
          'latitude': widget.existing!.latitude,
          'longitude': widget.existing!.longitude,
        });
      } else {
        await ref.read(dioProvider).post('/projects/${widget.projectId}/notes', data: {
          'title': _title.text.trim(),
          'body': _body.text,
          'latitude': _position?.latitude,
          'longitude': _position?.longitude,
        });
      }
    } catch (_) {
      if (!isEdit) {
        await ref.read(syncServiceProvider).saveNoteOffline(
          projectId: widget.projectId,
          title: _title.text.trim(),
          body: _body.text,
          latitude: _position?.latitude,
          longitude: _position?.longitude,
        );
      }
    }
    ref.invalidate(notesProvider(widget.projectId));
    if (mounted) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existing != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Editar nota' : 'Nueva nota'),
        actions: [
          IconButton(
            icon: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.save),
            onPressed: _loading ? null : _save,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Título', border: OutlineInputBorder()),
              autofocus: !isEdit,
            ),
            const SizedBox(height: 16),
            Expanded(
              child: TextField(
                controller: _body,
                decoration: const InputDecoration(labelText: 'Contenido', border: OutlineInputBorder(), alignLabelWithHint: true),
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
              ),
            ),
            if (_position != null && !isEdit)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(children: [
                  const Icon(Icons.location_on, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text('${_position!.latitude.toStringAsFixed(5)}, ${_position!.longitude.toStringAsFixed(5)}',
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ]),
              ),
          ],
        ),
      ),
    );
  }
}
