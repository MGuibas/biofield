import 'package:cached_network_image/cached_network_image.dart';
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../data/recording/recording_provider.dart';
import '../../domain/models/models.dart';

import '../widgets/bio_field_bottom_nav_bar.dart';
import '../widgets/recording_status_banner.dart';

class ProjectDetailScreen extends ConsumerStatefulWidget {
  final String projectId;
  const ProjectDetailScreen({super.key, required this.projectId});

  @override
  ConsumerState<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

String _timeAgo(DateTime dt) {
  final localDt = dt.isUtc ? dt.toLocal() : dt;
  final diff = DateTime.now().difference(localDt);
  if (diff.inSeconds < 60) return 'hace un momento';
  if (diff.inMinutes < 60) return 'hace ${diff.inMinutes} min';
  if (diff.inHours < 24) return 'hace ${diff.inHours} h';
  if (diff.inDays < 7) return 'hace ${diff.inDays} d';
  return '${dt.day}/${dt.month}/${dt.year}';
}

class _ProjectDetailScreenState extends ConsumerState<ProjectDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(() {
      if (mounted && !_tabController.indexIsChanging) {
        setState(() {}); // Still need this for the FAB types and other static updates
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _photoUrl(String url) {
    if (url.startsWith('http')) return url;
    return 'https://fotos.guibas.es/biofield/$url';
  }

  Future<void> _renameProject(String currentName) async {
    final ctrl = TextEditingController(text: currentName);
    final newName = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Renombrar proyecto'),
        content: TextField(controller: ctrl, autofocus: true, decoration: const InputDecoration(border: OutlineInputBorder())),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () { final v = ctrl.text.trim(); if (v.isNotEmpty) Navigator.pop(context, v); },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    if (newName == null) return;
    try {
      await ref.read(dioProvider).put('/projects/${widget.projectId}', data: {'name': newName, 'isArchived': false});
      ref.invalidate(projectsProvider);
      ref.invalidate(projectDetailProvider(widget.projectId));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al renombrar')));
    }
  }

  Future<void> _deleteProject() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Eliminar proyecto'),
        content: const Text('¿Seguro? Se eliminarán todas las rutas, observaciones y notas.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar todo')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(dioProvider).delete('/projects/${widget.projectId}');
      ref.invalidate(projectsProvider);
      if (mounted) context.go('/projects');
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al eliminar proyecto')));
    }
  }

  void _showObsOptions(ObservationModel o) {
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
      ListTile(leading: const Icon(Icons.edit_outlined), title: const Text('Editar'), onTap: () { Navigator.pop(context); context.go('/projects/${widget.projectId}/observations/${o.id}/edit', extra: o); }),
      ListTile(
        leading: const Icon(Icons.delete_outline, color: Colors.red),
        title: const Text('Eliminar', style: TextStyle(color: Colors.red)),
        onTap: () async {
          Navigator.pop(context);
          final confirm = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
            title: const Text('Eliminar observación'),
            content: const Text('¿Seguro?'),
            actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar'))],
          ));
          if (confirm != true) return;
          try {
            await ref.read(dioProvider).delete('/observations/${o.id}');
            ref.invalidate(observationsProvider(widget.projectId));
            ref.invalidate(observationsPageProvider((projectId: widget.projectId, page: 1)));
          } catch (_) {}
        },
      ),
    ])));
  }

  // Helper lists providers
  @override
  Widget build(BuildContext context) {
    final routes = ref.watch(routesProvider(widget.projectId));
    final notes = ref.watch(notesProvider(widget.projectId));
    final rec = ref.watch(recordingProvider);
    final isRecordingHere = rec.active && rec.projectId == widget.projectId;
    final detail = ref.watch(projectDetailProvider(widget.projectId));
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      extendBody: true, // Important for floating nav bar
      appBar: AppBar(
        title: detail.when(
          data: (d) => Text(d.projectName),
          loading: () => const Text('Proyecto'),
          error: (_, __) => const Text('Error'),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.drive_file_rename_outline), onPressed: () => _renameProject(detail.valueOrNull?.projectName ?? '')),
          IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red), onPressed: _deleteProject),
        ],
      ),
      body: Column(
        children: [
          if (isRecordingHere) RecordingStatusBanner(rec: rec, onTap: () => context.go('/projects/${rec.projectId}/routes/record')),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // OBSERVACIONES (Index 0 in Nav Bar)
                _ObsTab(projectId: widget.projectId, onOptions: _showObsOptions, photoUrl: _photoUrl),
                // RUTAS (Index 1)
                routes.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (list) => list.isEmpty
                      ? const Center(child: Text('Sin rutas'))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                          itemCount: list.length,
                          itemBuilder: (_, i) {
                            final r = list[i];
                            final dur = r.endedAt?.difference(r.startedAt);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: const Icon(Icons.route, color: Color(0xFF0D631B)),
                                title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Text('${(r.distanceMeters / 1000).toStringAsFixed(2)} km${dur != null ? ' · ${dur.inMinutes} min' : ''}'),
                                trailing: const Icon(Icons.chevron_right, size: 16),
                                onTap: () => context.go('/projects/${widget.projectId}/routes/${r.id}/view', extra: r),
                              ),
                            );
                          },
                        ),
                ),
                // ACTIVIDAD (Index 2)
                _ActivityTab(projectId: widget.projectId),
                // MIEMBROS (Index 3)
                _MembersTab(projectId: widget.projectId),
                // NOTAS (Index 4)
                notes.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (list) => list.isEmpty
                      ? const Center(child: Text('Sin notas'))
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                          itemCount: list.length,
                          itemBuilder: (_, i) {
                            final n = list[i];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surface,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
                                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(20),
                                child: Stack(
                                  children: [
                                    Positioned(
                                      left: 0, top: 0, bottom: 0,
                                      child: Container(width: 4, color: Colors.blue.withOpacity(0.4)),
                                    ),
                                    ListTile(
                                      contentPadding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
                                      title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: -0.3)),
                                      subtitle: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const SizedBox(height: 8),
                                          Text(n.body, maxLines: 3, overflow: TextOverflow.ellipsis, style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.7), height: 1.4)),
                                          const SizedBox(height: 16),
                                          Row(
                                            children: [
                                              Icon(Icons.access_time_rounded, size: 12, color: theme.colorScheme.primary.withOpacity(0.5)),
                                              const SizedBox(width: 4),
                                              Text('${_timeAgo(n.createdAt)}', 
                                                   style: TextStyle(fontSize: 10, color: theme.colorScheme.primary.withOpacity(0.6), fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                        ],
                                      ),
                                      onTap: () {},
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: AnimatedBuilder(
        animation: _tabController.animation!,
        builder: (context, _) => BioFieldBottomNavBar(
          currentIndex: _tabController.animation!.value.round(),
          onTap: (i) => _tabController.animateTo(i),
        ),
      ),
      floatingActionButton: AnimatedBuilder(
        animation: _tabController.animation!,
        builder: (context, _) => Padding(
          padding: const EdgeInsets.only(bottom: 50),
          child: _buildFab(context, rec),
        ),
      ),
    );
  }

  Widget _buildFab(BuildContext context, RecordingState rec) {
    final isRecordingHere = rec.active && rec.projectId == widget.projectId;
    final theme = Theme.of(context);
    
    // Si está grabando, mostramos directamente el botón de stop
    if (isRecordingHere) {
      return FloatingActionButton.extended(
        onPressed: () => context.go('/projects/${widget.projectId}/routes/record'),
        backgroundColor: Colors.red.shade800,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.stop_circle_rounded),
        label: const Text('Detener Ruta'),
      );
    }

    return FloatingActionButton.extended(
      onPressed: () => _showProjectActionSheet(context, rec),
      backgroundColor: theme.colorScheme.primary,
      foregroundColor: Colors.white,
      elevation: 6,
      icon: const Icon(Icons.bolt_rounded),
      label: const Text('Acciones', style: TextStyle(fontWeight: FontWeight.bold)),
    );
  }

  void _showProjectActionSheet(BuildContext context, RecordingState rec) {
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: theme.colorScheme.outlineVariant, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 24),
            Text('Nueva Entrada', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 32),
            _ActionTile(
              icon: Icons.add_a_photo_rounded,
              title: 'Nueva Observación',
              subtitle: 'Fotos, taxones y ubicación',
              color: const Color(0xFF2E7D32),
              onTap: () {
                Navigator.pop(context);
                context.go('/projects/${widget.projectId}/observations/new');
              },
            ),
            const SizedBox(height: 16),
            _ActionTile(
              icon: Icons.route_rounded,
              title: 'Grabar Nueva Ruta',
              subtitle: 'Seguimiento por GPS en tiempo real',
              color: Colors.orange.shade800,
              onTap: () {
                Navigator.pop(context);
                context.go('/projects/${widget.projectId}/routes/record');
              },
            ),
            const SizedBox(height: 16),
            _ActionTile(
              icon: Icons.note_add_rounded,
              title: 'Anotación Rápida',
              subtitle: 'Texto libre y recordatorios',
              color: Colors.blue.shade700,
              onTap: () {
                Navigator.pop(context);
                context.go('/projects/${widget.projectId}/notes/new');
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionTile({required this.icon, required this.title, required this.subtitle, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurface.withOpacity(0.6))),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded, size: 14, color: color.withOpacity(0.3)),
          ],
        ),
      ),
    );
  }
}

// ── Pestaña observaciones paginada ────────────────────────────────────────────

class _ObsTab extends ConsumerStatefulWidget {
  final String projectId;
  final void Function(ObservationModel) onOptions;
  final String Function(String) photoUrl;
  const _ObsTab({required this.projectId, required this.onOptions, required this.photoUrl});

  @override
  ConsumerState<_ObsTab> createState() => _ObsTabState();
}

class _ObsTabState extends ConsumerState<_ObsTab> {
  int _page = 1;
  final List<ObservationModel> _items = [];
  bool _loading = false;
  bool _hasMore = true;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200 && !_loading && _hasMore) {
        _loadMore();
      }
    });
  }

  @override
  void dispose() { _scroll.dispose(); super.dispose(); }

  Future<void> _loadMore() async {
    if (_loading) return;
    setState(() => _loading = true);
    final result = await ref.read(observationsPageProvider((projectId: widget.projectId, page: _page)).future);
    if (mounted) {
      setState(() {
        _items.addAll(result.items);
        _hasMore = result.hasMore;
        _page++;
        _loading = false;
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_items.isEmpty && !_loading) _loadMore();
  }

  @override
  Widget build(BuildContext context) {
    // Refrescar cuando el provider se invalide
    ref.listen(observationsPageProvider((projectId: widget.projectId, page: 1)), (prev, next) {
      if (next.hasValue && prev?.valueOrNull != next.valueOrNull) {
        if (mounted) {
          setState(() { _items.clear(); _page = 1; _hasMore = true; });
          _loadMore();
        }
      }
    });

    if (_items.isEmpty && _loading) return const Center(child: CircularProgressIndicator());
    
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: () async {
        setState(() { _items.clear(); _page = 1; _hasMore = true; });
        await _loadMore();
      },
      child: CustomScrollView(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // CABECERA DE MAPA (Mini mapa)
          SliverToBoxAdapter(
            child: _MiniMapHeader(projectId: widget.projectId, items: _items),
          ),
          
          if (_items.isEmpty)
            const SliverFillRemaining(child: Center(child: Text('Sin observaciones'))),
          
          if (_items.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.75,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    if (i == _items.length) return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
                    final o = _items[i];
                    final firstPhoto = o.photos.isNotEmpty ? o.photos.first : null;

                    return Card(
                      key: ValueKey(o.id),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => context.go('/projects/${widget.projectId}/observations/${o.id}/view', extra: o),
                        onLongPress: () => widget.onOptions(o),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: _ObsPhotoHeader(photoUrl: firstPhoto != null ? widget.photoUrl(firstPhoto) : null, taxon: o.taxonName)),
                            _ObsInfoFooter(o: o),
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: _items.length + (_hasMore ? 1 : 0),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ObsPhotoHeader extends StatelessWidget {
  final String? photoUrl;
  final String taxon;
  const _ObsPhotoHeader({this.photoUrl, required this.taxon});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Stack(
      fit: StackFit.expand,
      children: [
        if (photoUrl != null)
          CachedNetworkImage(
            imageUrl: photoUrl!, 
            fit: BoxFit.cover,
            memCacheWidth: 300,
          )
        else
          Container(color: theme.colorScheme.primary.withOpacity(0.05), child: Icon(Icons.eco, color: theme.colorScheme.primary.withOpacity(0.2), size: 40)),
        Positioned(
          top: 8, left: 8,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.8), borderRadius: BorderRadius.circular(12)),
            child: Text(taxon.split(' ').first.toUpperCase(), style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
          ),
        ),
      ],
    );
  }
}

class _ObsInfoFooter extends StatelessWidget {
  final ObservationModel o;
  const _ObsInfoFooter({required this.o});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(o.title ?? o.taxonName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
          Text(o.taxonName, style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: theme.colorScheme.secondary), maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 10, color: theme.colorScheme.primary),
              const SizedBox(width: 4),
              Text('${o.observedAt.day}/${o.observedAt.month}/${o.observedAt.year}', style: const TextStyle(fontSize: 9, color: Colors.grey)),
              const Spacer(),
              Icon(o.syncStatus == 'Synced' ? Icons.cloud_done : Icons.cloud_upload_outlined, color: o.syncStatus == 'Synced' ? Colors.green : Colors.orange, size: 12),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniMapHeader extends StatelessWidget {
  final String projectId;
  final List<ObservationModel> items;
  const _MiniMapHeader({required this.projectId, required this.items});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      height: 110,
      decoration: BoxDecoration(
        color: Colors.black, // Fondo negro puro como pidió el usuario
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 15, offset: const Offset(0, 8))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // Contenido
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), shape: BoxShape.circle),
                    child: const Icon(Icons.map_outlined, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 20),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('VER EN EL MAPA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.5)),
                        SizedBox(height: 4),
                        Text('Explora todas tus observaciones', style: TextStyle(color: Colors.white60, fontSize: 11)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Colors.white24),
                ],
              ),
            ),
            // Botón de acción invisible que cubre todo
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  splashColor: Colors.white.withOpacity(0.1),
                  highlightColor: Colors.transparent,
                  onTap: () => context.go('/projects/$projectId/map'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Pestaña actividad ─────────────────────────────────────────────────────────

class _ActivityTab extends ConsumerWidget {
  final String projectId;
  const _ActivityTab({required this.projectId});

  String _avatarUrl(String url, DateTime? dt) {
    if (url.startsWith('http')) return url;
    final cleanUrl = url.startsWith('/') ? url : '/$url';
    final uri = Uri.parse(AppConstants.apiBaseUrl);
    final baseUrl = '${uri.scheme}://${uri.host}';
    final timestamp = dt != null ? '?v=${dt.millisecondsSinceEpoch}' : '';
    return '$baseUrl$cleanUrl$timestamp';
  }

  String _observationPhotoUrl(String url, DateTime? dt) {
    if (url.startsWith('http')) return url;
    final cleanUrl = url.startsWith('/') ? url : '/$url';
    final timestamp = dt != null ? '?v=${dt.millisecondsSinceEpoch}' : '';
    return 'https://fotos.guibas.es/biofield$cleanUrl$timestamp';
  }

  IconData _typeIcon(String type) => switch (type) {
    'observation' => Icons.eco,
    'note'        => Icons.note,
    'route'       => Icons.route,
    'comment'     => Icons.comment_outlined,
    _             => Icons.circle,
  };

  Color _typeColor(String type) => switch (type) {
    'observation' => const Color(0xFF2E7D32),
    'note'        => Colors.blue,
    'route'       => Colors.orange,
    'comment'     => Colors.purple,
    _             => Colors.grey,
  };


  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activity = ref.watch(activityProvider(projectId));
    final observations = ref.watch(observationsProvider(projectId)).valueOrNull ?? [];
    
    // Optimización: Crear un mapa para búsquedas O(1) en lugar de O(N) dentro del listado
    final obsMap = { for (var o in observations) o.id : o };
    
    final theme = Theme.of(context);

    return activity.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (list) => list.isEmpty
          ? const Center(child: Text('Sin actividad reciente'))
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(activityProvider(projectId)),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                itemCount: list.length,
                itemBuilder: (_, i) {
                  final a = list[i];
                  final relatedObs = obsMap[a.itemId];
                  final photoToUse = relatedObs?.photos.firstOrNull ?? a.photoUrl ?? a.avatarUrl;

                  return IntrinsicHeight(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 24),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                        Column(
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: theme.colorScheme.primary.withOpacity(0.2), width: 2),
                                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
                              ),
                              child: CircleAvatar(
                                radius: 18,
                                backgroundImage: a.actorAvatarUrl != null ? CachedNetworkImageProvider(_avatarUrl(a.actorAvatarUrl!, a.occurredAt)) : null,
                                backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                                child: a.actorAvatarUrl == null ? Icon(_typeIcon(a.type), size: 16, color: theme.colorScheme.primary) : null,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Expanded(
                              child: Container(width: 2, decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [theme.colorScheme.primary.withOpacity(0.3), theme.colorScheme.primary.withOpacity(0.0)],
                                ),
                              )),
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 32),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.surface,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 20, offset: const Offset(0, 8))],
                              border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
                            ),
                            child: InkWell(
                              onTap: () {
                                if (a.itemId != null) {
                                  if (a.type == 'observation') context.go('/projects/$projectId/observations/${a.itemId}');
                                  if (a.type == 'note') {/* Note detail not implemented yet */}
                                  if (a.type == 'route') context.go('/projects/$projectId/routes/${a.itemId}/view');
                                }
                              },
                              borderRadius: BorderRadius.circular(20),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(a.actorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.2)),
                                        const Spacer(),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(color: theme.colorScheme.surfaceVariant.withOpacity(0.5), borderRadius: BorderRadius.circular(8)),
                                          child: Text(_timeAgo(a.occurredAt), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.primary.withOpacity(0.7))),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Text(a.description, style: theme.textTheme.bodyMedium?.copyWith(height: 1.4, color: theme.colorScheme.onSurface.withOpacity(0.9))),
                                    if (a.type == 'observation' && photoToUse != null) ...[
                                      const SizedBox(height: 16),
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Stack(
                                          children: [
                                            CachedNetworkImage(
                                              imageUrl: _observationPhotoUrl(photoToUse, a.occurredAt),
                                              height: 180,
                                              width: double.infinity,
                                              fit: BoxFit.cover,
                                              memCacheWidth: 600, // Optimización: suficente para ancho completo móvil
                                              placeholder: (_, __) => Container(height: 180, color: theme.colorScheme.surfaceVariant, child: const Center(child: CircularProgressIndicator())),
                                              errorWidget: (_, __, ___) => const SizedBox.shrink(),
                                            ),
                                            Positioned(
                                              top: 12, right: 12,
                                              child: Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(color: Colors.black.withOpacity(0.4), shape: BoxShape.circle),
                                                child: const Icon(Icons.eco, color: Colors.white, size: 16),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
                },
              ),
            ),
    );
  }
}

// ── Pestaña miembros ──────────────────────────────────────────────────────────

class _MembersTab extends ConsumerWidget {
  final String projectId;
  const _MembersTab({required this.projectId});

  String _avatarUrl(String url, DateTime? dt) {
    if (url.startsWith('http')) return url;
    final cleanUrl = url.startsWith('/') ? url : '/$url';
    final uri = Uri.parse(AppConstants.apiBaseUrl);
    final baseUrl = '${uri.scheme}://${uri.host}';
    final timestamp = dt != null ? '?v=${dt.millisecondsSinceEpoch}' : '';
    return '$baseUrl$cleanUrl$timestamp';
  }

  Color _roleColor(String role) => switch (role.toLowerCase()) {
    'owner'  => Colors.amber.shade700,
    'editor' => Colors.blue.shade600,
    _        => Colors.grey.shade600,
  };

  IconData _roleIcon(String role) => switch (role.toLowerCase()) {
    'owner'  => Icons.star,
    'editor' => Icons.edit,
    _        => Icons.visibility,
  };

  void _showShareDialog(BuildContext context, String shareCode) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Compartir proyecto'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Comparte este código con otros usuarios:'),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF2E7D32).withAlpha(25),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF2E7D32)),
            ),
            child: Text(shareCode, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, letterSpacing: 6, color: Color(0xFF2E7D32))),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: shareCode));
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Código copiado')));
            },
            icon: const Icon(Icons.copy), label: const Text('Copiar código'),
          ),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cerrar'))],
      ),
    );
  }

  void _showMemberOptions(BuildContext context, WidgetRef ref, MemberModel m, String ownerId, String currentUserId) {
    if (currentUserId != ownerId || currentUserId == m.userId) return;
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Padding(padding: const EdgeInsets.all(16), child: Text(m.displayName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
      const Divider(height: 1),
      ...['Owner', 'Editor', 'Viewer'].where((r) => r.toLowerCase() != m.role.toLowerCase()).map((role) =>
        ListTile(
          leading: Icon(_roleIcon(role), color: _roleColor(role)),
          title: Text('Cambiar a $role'),
          onTap: () async {
            Navigator.pop(context);
            try {
              await ref.read(dioProvider).post('/projects/$projectId/members', data: {'userId': m.userId, 'role': role});
              ref.invalidate(projectDetailProvider(projectId));
            } catch (_) {
              if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al cambiar rol')));
            }
          },
        ),
      ),
      ListTile(
        leading: const Icon(Icons.person_remove_outlined, color: Colors.red),
        title: const Text('Expulsar', style: TextStyle(color: Colors.red)),
        onTap: () async {
          Navigator.pop(context);
          final confirm = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
            title: const Text('Expulsar miembro'),
            content: Text('¿Expulsar a ${m.displayName}?'),
            actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, true), child: const Text('Expulsar'))],
          ));
          if (confirm != true) return;
          try {
            await ref.read(dioProvider).delete('/projects/$projectId/members/${m.userId}');
            ref.invalidate(projectDetailProvider(projectId));
          } catch (_) {
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al expulsar')));
          }
        },
      ),
    ])));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(projectDetailProvider(projectId));
    final currentUserId = ref.watch(authProvider)?.userId ?? '';

    return detail.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (d) => Column(children: [
        InkWell(
          onTap: () => _showShareDialog(context, d.shareCode),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: const Color(0xFF2E7D32).withAlpha(20),
            child: Row(children: [
              const Icon(Icons.share, color: Color(0xFF2E7D32)),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Código de invitación', style: TextStyle(fontSize: 12, color: Colors.grey)),
                Text(d.shareCode, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 4, color: Color(0xFF2E7D32))),
              ]),
              const Spacer(),
              const Icon(Icons.copy_outlined, color: Colors.grey, size: 18),
            ]),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView.builder(
            itemCount: d.members.length,
            itemBuilder: (_, i) {
              final m = d.members[i];
              return ListTile(
                leading: CircleAvatar(
                  radius: 22,
                  backgroundImage: m.avatarUrl != null ? CachedNetworkImageProvider(_avatarUrl(m.avatarUrl!, m.joinedAt)) : null,
                  backgroundColor: const Color(0xFF2E7D32).withAlpha(38),
                  child: m.avatarUrl == null
                      ? Text(m.displayName.isNotEmpty ? m.displayName[0].toUpperCase() : '?',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2E7D32)))
                      : null,
                ),
                title: Text(m.displayName, style: TextStyle(fontWeight: m.userId == d.ownerId ? FontWeight.bold : FontWeight.normal)),
                subtitle: Text('Se unió ${m.joinedAt.day}/${m.joinedAt.month}/${m.joinedAt.year}', style: const TextStyle(fontSize: 12)),
                trailing: Chip(
                  avatar: Icon(_roleIcon(m.role), size: 14, color: _roleColor(m.role)),
                  label: Text(m.role, style: TextStyle(fontSize: 12, color: _roleColor(m.role))),
                  backgroundColor: _roleColor(m.role).withAlpha(25),
                  side: BorderSide(color: _roleColor(m.role).withAlpha(76)),
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                ),
                onLongPress: () => _showMemberOptions(context, ref, m, d.ownerId, currentUserId),
              );
            },
          ),
        ),
      ]),
    );
  }
}
