import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../domain/models/models.dart';
import '../../core/constants.dart';

class ObservationDetailScreen extends ConsumerStatefulWidget {
  final ObservationModel observation;
  const ObservationDetailScreen({super.key, required this.observation});

  @override
  ConsumerState<ObservationDetailScreen> createState() => _ObservationDetailScreenState();
}

class _ObservationDetailScreenState extends ConsumerState<ObservationDetailScreen> {
  int _currentPage = 0;

  String _photoUrl(String url) {
    if (url.startsWith('http')) return url;
    final cleanUrl = url.startsWith('/') ? url : '/$url';
    return 'https://fotos.guibas.es/biofield$cleanUrl';
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Eliminar observación'),
        content: const Text('¿Seguro que quieres eliminar esta observación?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      try {
        await ref.read(dioProvider).delete('/observations/${widget.observation.id}');
        ref.invalidate(observationsProvider(widget.observation.projectId));
        if (context.mounted) context.pop();
      } catch (e) {
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _showFullScreenPhoto(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: Stack(
          children: [
            Center(
              child: InteractiveViewer(
                child: CachedNetworkImage(
                  imageUrl: _photoUrl(url),
                  fit: BoxFit.contain,
                  placeholder: (_, __) => const Center(child: CircularProgressIndicator()),
                  errorWidget: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white, size: 50),
                ),
              ),
            ),
            Positioned(
              top: 40,
              right: 20,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fresh = ref.watch(observationDetailProvider(widget.observation.id));
    final o = fresh.valueOrNull ?? widget.observation;
    final theme = Theme.of(context);
    
    final allPhotos = [...o.photos];
    if (o.habitatPhotoUrl != null) allPhotos.add(o.habitatPhotoUrl!);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 400,
            pinned: true,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            actions: [
              IconButton(icon: const Icon(Icons.edit_outlined, color: Colors.white), onPressed: () => context.go('/projects/${o.projectId}/observations/${o.id}/edit', extra: o)),
              IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red), onPressed: () => _delete(context, ref)),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (allPhotos.isEmpty)
                    Container(color: theme.colorScheme.primary.withOpacity(0.1), child: const Icon(Icons.eco, size: 80, color: Colors.grey))
                  else
                    PageView.builder(
                      itemCount: allPhotos.length,
                      physics: const BouncingScrollPhysics(),
                      onPageChanged: (i) => setState(() => _currentPage = i),
                      itemBuilder: (context, index) {
                        final url = allPhotos[index];
                        final isHabitat = url == o.habitatPhotoUrl;
                        return GestureDetector(
                          onTap: () => _showFullScreenPhoto(context, url),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              CachedNetworkImage(
                                imageUrl: _photoUrl(url),
                                fit: BoxFit.cover,
                                memCacheWidth: 800, // Optimización: suficente para pantalla de móvil completa
                                placeholder: (_, __) => const Center(child: CircularProgressIndicator()),
                                errorWidget: (_, __, ___) => const Center(child: Icon(Icons.broken_image, color: Colors.white, size: 40)),
                              ),
                              if (isHabitat)
                                Positioned(
                                  top: 100,
                                  right: 20,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(20)),
                                    child: const Row(
                                      children: [
                                        Icon(Icons.landscape, color: Colors.white, size: 14),
                                        SizedBox(width: 8),
                                        Text('FOTO DEL LUGAR', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        );
                      },
                    ),
                  IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.black54, Colors.transparent, Colors.transparent, Colors.black87],
                        ),
                      ),
                    ),
                  ),
                  if (allPhotos.length > 1)
                    Positioned(
                      bottom: 80,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(allPhotos.length, (i) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: 8, height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: i == _currentPage ? Colors.white : Colors.white24,
                          ),
                        )),
                      ),
                    ),
                  Positioned(
                    bottom: 24,
                    left: 24,
                    right: 24,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (o.tags.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(color: theme.colorScheme.tertiary, borderRadius: BorderRadius.circular(20)),
                            child: Text(o.tags.first.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                          ),
                        Text(o.title ?? o.taxonName, style: theme.textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
                        Text(o.taxonName, style: theme.textTheme.titleSmall?.copyWith(color: Colors.white70, fontStyle: FontStyle.italic)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          _MetaItem(label: 'FECHA', value: '${o.observedAt.day}/${o.observedAt.month}/${o.observedAt.year}'),
                          const Spacer(),
                          _MetaItem(label: 'CANTIDAD', value: 'x${o.quantity}'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text('Condiciones de Campo', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.8,
                    children: [
                      _BentoInfo(icon: Icons.thermostat, label: 'Temperatura', value: o.temperature != null ? '${o.temperature}°C' : 'N/A'),
                      _BentoInfo(icon: Icons.water_drop_outlined, label: 'Humedad', value: o.humidity != null ? '${o.humidity}%' : 'N/A'),
                      _BentoInfo(icon: Icons.wb_sunny_outlined, label: 'Clima', value: o.weatherCondition ?? 'Despejado'),
                      _BentoInfo(icon: Icons.location_on_outlined, label: 'Localidad', value: '${o.latitude.toStringAsFixed(3)}, ${o.longitude.toStringAsFixed(3)}'),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Text('Descripción / Notas', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  if (o.description != null && o.description!.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.only(left: 16),
                      decoration: BoxDecoration(border: Border(left: BorderSide(color: theme.colorScheme.primary, width: 4))),
                      child: Text(o.description!, style: theme.textTheme.bodyLarge?.copyWith(fontStyle: FontStyle.italic, color: theme.colorScheme.onSurface.withOpacity(0.8))),
                    )
                  else
                    const Text('Sin descripción adicional.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
                  if (o.notes != null) ...[const SizedBox(height: 16), Text(o.notes!)],
                  const SizedBox(height: 32),
                  if (o.habitatPhotoUrl != null) ...[
                    Text('Foto del Hábitat', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: () => _showFullScreenPhoto(context, o.habitatPhotoUrl!),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: CachedNetworkImage(
                          imageUrl: _photoUrl(o.habitatPhotoUrl!),
                          height: 200, width: double.infinity, fit: BoxFit.cover,
                          placeholder: (_, __) => const Center(child: CircularProgressIndicator()),
                          errorWidget: (_, __, ___) => const Icon(Icons.broken_image),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                  if (o.photos.length > 1) ...[
                    Text('Más Fotos', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 120,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        itemCount: o.photos.length,
                        itemBuilder: (context, i) {
                          final url = o.photos[i];
                          return _PhotoPreview(
                            url: _photoUrl(url),
                            onTap: () => _showFullScreenPhoto(context, url),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                  Row(
                    children: [
                      Icon(o.syncStatus == 'Synced' ? Icons.cloud_done : Icons.cloud_upload_outlined, color: o.syncStatus == 'Synced' ? Colors.green : Colors.orange, size: 16),
                      const SizedBox(width: 8),
                      Text(o.syncStatus == 'Synced' ? 'Sincronizado' : 'Pendiente de sincronización', style: TextStyle(color: o.syncStatus == 'Synced' ? Colors.green : Colors.orange, fontSize: 13, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const Divider(height: 64),
                  Row(
                    children: [
                      Text('Comentarios', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      ref.watch(commentsProvider(o.id)).when(
                        data: (list) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: theme.colorScheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                          child: Text('${list.length}', style: TextStyle(color: theme.colorScheme.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                        loading: () => const SizedBox.shrink(),
                        error: (_, __) => const SizedBox.shrink(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ref.watch(commentsProvider(o.id)).when(
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Text('Error al cargar comentarios: $e'),
                    data: (list) => list.isEmpty
                        ? const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Text('No hay comentarios todavía. ¡Sé el primero!', style: TextStyle(color: Colors.grey))))
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: list.length,
                            itemBuilder: (context, index) {
                              final c = list[index];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 20),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    CircleAvatar(
                                      radius: 16,
                                      backgroundImage: c.avatarUrl != null ? CachedNetworkImageProvider(_avatarUrl(c.avatarUrl!, c.createdAt)) : null,
                                      child: c.avatarUrl == null ? const Icon(Icons.person, size: 16) : null,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Text(c.displayName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                              const SizedBox(width: 8),
                                              Text(_timeAgo(c.createdAt), style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(c.body),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                  _CommentField(observationId: o.id),
                  const SizedBox(height: 64),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaItem extends StatelessWidget {
  final String label, value;
  const _MetaItem({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.5), letterSpacing: 1.2, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(value, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _BentoInfo extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _BentoInfo({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: theme.colorScheme.primaryContainer.withOpacity(0.2), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Icon(icon, color: theme.colorScheme.primary, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PhotoPreview extends StatelessWidget {
  final String url;
  final VoidCallback onTap;
  const _PhotoPreview({required this.url, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 120,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(12)),
        clipBehavior: Clip.hardEdge,
        child: CachedNetworkImage(imageUrl: url, fit: BoxFit.cover, errorWidget: (_, __, ___) => const Icon(Icons.broken_image)),
      ),
    );
  }
}

class _CommentField extends ConsumerStatefulWidget {
  final String observationId;
  const _CommentField({required this.observationId});
  @override
  ConsumerState<_CommentField> createState() => _CommentFieldState();
}

class _CommentFieldState extends ConsumerState<_CommentField> {
  final _ctrl = TextEditingController();
  bool _loading = false;

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _loading = true);
    try {
      await ref.read(dioProvider).post('/observations/${widget.observationId}/comments', data: {'body': text});
      _ctrl.clear();
      ref.invalidate(commentsProvider(widget.observationId));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _ctrl,
              decoration: const InputDecoration(hintText: 'Añadir un comentario...', border: InputBorder.none),
              maxLines: null,
            ),
          ),
          if (_loading)
            const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
          else
            IconButton(icon: const Icon(Icons.send), onPressed: _send),
        ],
      ),
    );
  }
}

String _avatarUrl(String url, DateTime? dt) {
  if (url.startsWith('http')) return url;
  final cleanUrl = url.startsWith('/') ? url : '/$url';
  final uri = Uri.parse(AppConstants.apiBaseUrl);
  final baseUrl = uri.hasPort ? '${uri.scheme}://${uri.host}:${uri.port}' : '${uri.scheme}://${uri.host}';
  return '$baseUrl$cleanUrl';
}

String _timeAgo(DateTime dt) {
  final localDt = dt.isUtc ? dt.toLocal() : dt;
  final h = localDt.hour.toString().padLeft(2, '0');
  final m = localDt.minute.toString().padLeft(2, '0');
  return '${localDt.day}/${localDt.month}/${localDt.year} $h:$m';
}
