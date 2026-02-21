import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../domain/models/models.dart';

// Provider que recarga la observación fresca desde la API
final _obsDetailProvider = FutureProvider.family<ObservationModel, String>((ref, id) async {
  final res = await ref.watch(dioProvider).get('/observations/$id');
  return ObservationModel.fromJson(res.data);
});

class ObservationDetailScreen extends ConsumerWidget {
  final ObservationModel observation; // usado solo como fallback inicial
  const ObservationDetailScreen({super.key, required this.observation});

  String _photoUrl(String url) {
    if (url.startsWith('http')) return url;
    return 'http://192.168.0.28:9000/biofield/$url';
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Eliminar observación'),
        content: const Text('¿Seguro? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(dioProvider).delete('/observations/${observation.id}');
      ref.invalidate(observationsProvider(observation.projectId));
      if (context.mounted) context.go('/projects/${observation.projectId}');
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al eliminar')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fresh = ref.watch(_obsDetailProvider(observation.id));
    final o = fresh.valueOrNull ?? observation; // muestra datos iniciales mientras carga
    return Scaffold(
      appBar: AppBar(
        title: Text(o.title ?? o.taxonName),
        actions: [
          IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () => context.go('/projects/${o.projectId}/observations/${o.id}/edit', extra: o)),
          IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red), onPressed: () => _delete(context, ref)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _row(Icons.eco, 'Especie', o.taxonName, italic: true),
          if (o.title != null) _row(Icons.label_outline, 'Título', o.title!),
          _row(Icons.calendar_today, 'Fecha',
              '${o.observedAt.day}/${o.observedAt.month}/${o.observedAt.year}  '
              '${o.observedAt.hour.toString().padLeft(2, '0')}:${o.observedAt.minute.toString().padLeft(2, '0')}'),
          _row(Icons.location_on, 'Coordenadas', '${o.latitude.toStringAsFixed(5)}, ${o.longitude.toStringAsFixed(5)}'),
          _row(Icons.format_list_numbered, 'Cantidad', '${o.quantity}'),
          if (o.routeId != null) _row(Icons.route, 'Ruta asociada', 'ID: ${o.routeId}'),
          if (o.description != null) ...[const Divider(height: 24), _row(Icons.description_outlined, 'Descripción', o.description!)],
          if (o.notes != null) _row(Icons.notes, 'Notas', o.notes!),

          // Hábitat
          if (o.habitatDescription != null || o.habitatPhotoUrl != null) ...[
            const Divider(height: 24),
            const Text('Lugar encontrado', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            if (o.habitatDescription != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(o.habitatDescription!)),
            if (o.habitatPhotoUrl != null)
              GestureDetector(
                onTap: () => showDialog(context: context, builder: (_) => Dialog(child: InteractiveViewer(child: CachedNetworkImage(imageUrl: _photoUrl(o.habitatPhotoUrl!))))),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(imageUrl: _photoUrl(o.habitatPhotoUrl!), height: 160, width: double.infinity, fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(height: 160, color: Colors.grey.shade200, child: const Icon(Icons.broken_image))),
                ),
              ),
          ],

          // Clima
          if (o.weatherCondition != null || o.temperature != null || o.humidity != null) ...[
            const Divider(height: 24),
            const Text('Condiciones climáticas', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: [
              if (o.weatherCondition != null) Chip(label: Text(o.weatherCondition!)),
              if (o.temperature != null) Chip(label: Text('${o.temperature}°C')),
              if (o.humidity != null) Chip(label: Text('${o.humidity}% HR')),
            ]),
          ],

          // Etiquetas
          if (o.tags.isNotEmpty) ...[
            const Divider(height: 24),
            const Text('Etiquetas', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Wrap(spacing: 6, children: o.tags.map((t) => Chip(label: Text(t))).toList()),
          ],

          // Fotos
          if (o.photos.isNotEmpty) ...[
            const Divider(height: 24),
            const Text('Fotos', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            SizedBox(
              height: 120,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: o.photos.map((url) => GestureDetector(
                  onTap: () => showDialog(context: context, builder: (_) => Dialog(child: InteractiveViewer(child: CachedNetworkImage(imageUrl: _photoUrl(url))))),
                  child: Container(
                    width: 120, height: 120, margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),
                    clipBehavior: Clip.hardEdge,
                    child: CachedNetworkImage(imageUrl: _photoUrl(url), fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => Container(color: Colors.grey.shade200, child: const Icon(Icons.broken_image))),
                  ),
                )).toList(),
              ),
            ),
          ],

          const Divider(height: 24),
          Row(children: [
            Icon(o.syncStatus == 'Synced' ? Icons.cloud_done : Icons.cloud_upload_outlined,
                color: o.syncStatus == 'Synced' ? Colors.green : Colors.orange, size: 16),
            const SizedBox(width: 6),
            Text(o.syncStatus == 'Synced' ? 'Sincronizado' : 'Pendiente de sync',
                style: TextStyle(color: o.syncStatus == 'Synced' ? Colors.green : Colors.orange, fontSize: 13)),
          ]),

          // Comentarios
          const Divider(height: 24),
          const Text('Comentarios', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          _CommentsSection(observationId: o.id),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String value, {bool italic = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 18, color: Colors.grey.shade600),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        Text(value, style: TextStyle(fontStyle: italic ? FontStyle.italic : FontStyle.normal)),
      ])),
    ]),
  );
}

// ── Sección comentarios ───────────────────────────────────────────────────────

class _CommentsSection extends ConsumerStatefulWidget {
  final String observationId;
  const _CommentsSection({required this.observationId});

  @override
  ConsumerState<_CommentsSection> createState() => _CommentsSectionState();
}

class _CommentsSectionState extends ConsumerState<_CommentsSection> {
  final _ctrl = TextEditingController();
  bool _sending = false;

  String _avatarUrl(String url) {
    if (url.startsWith('http')) return url;
    return 'http://192.168.0.28:5000$url';
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'ahora';
    if (diff.inMinutes < 60) return 'hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'hace ${diff.inHours} h';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await ref.read(dioProvider).post('/observations/${widget.observationId}/comments', data: {'body': text});
      _ctrl.clear();
      ref.invalidate(commentsProvider(widget.observationId));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al enviar comentario')));
    }
    if (mounted) setState(() => _sending = false);
  }

  Future<void> _delete(String commentId) async {
    try {
      await ref.read(dioProvider).delete('/observations/comments/$commentId');
      ref.invalidate(commentsProvider(widget.observationId));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final comments = ref.watch(commentsProvider(widget.observationId));
    final currentUserId = ref.watch(authProvider)?.userId ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        comments.when(
          loading: () => const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
          error: (_, __) => const SizedBox(),
          data: (list) => list.isEmpty
              ? const Padding(padding: EdgeInsets.only(bottom: 8), child: Text('Sin comentarios aún', style: TextStyle(color: Colors.grey)))
              : Column(
                  children: list.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundImage: c.avatarUrl != null ? CachedNetworkImageProvider(_avatarUrl(c.avatarUrl!)) : null,
                        backgroundColor: const Color(0xFF2E7D32).withAlpha(38),
                        child: c.avatarUrl == null
                            ? Text(c.displayName.isNotEmpty ? c.displayName[0].toUpperCase() : '?',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32)))
                            : null,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Text(c.displayName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            const SizedBox(width: 8),
                            Text(_timeAgo(c.createdAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            if (c.userId == currentUserId) ...[
                              const Spacer(),
                              GestureDetector(
                                onTap: () => _delete(c.id),
                                child: const Icon(Icons.close, size: 14, color: Colors.grey),
                              ),
                            ],
                          ]),
                          const SizedBox(height: 2),
                          Text(c.body),
                        ]),
                      ),
                    ]),
                  )).toList(),
                ),
        ),
        Row(children: [
          Expanded(
            child: TextField(
              controller: _ctrl,
              decoration: const InputDecoration(hintText: 'Escribe un comentario...', border: OutlineInputBorder(), isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          _sending
              ? const SizedBox(width: 36, height: 36, child: CircularProgressIndicator(strokeWidth: 2))
              : IconButton(icon: const Icon(Icons.send, color: Color(0xFF2E7D32)), onPressed: _send),
        ]),
      ],
    );
  }
}
