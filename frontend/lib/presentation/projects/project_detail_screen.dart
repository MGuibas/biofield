import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../data/recording/recording_provider.dart';
import '../../domain/models/models.dart';

class ProjectDetailScreen extends ConsumerWidget {
  final String projectId;
  const ProjectDetailScreen({super.key, required this.projectId});

  String _photoUrl(String url) {
    if (url.startsWith('http')) return url;
    return 'http://192.168.0.28:9000/biofield/$url';
  }

  Future<void> _renameProject(BuildContext context, WidgetRef ref, String currentName) async {
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
      await ref.read(dioProvider).put('/projects/$projectId', data: {'name': newName, 'isArchived': false});
      ref.invalidate(projectsProvider);
      ref.invalidate(projectDetailProvider(projectId));
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al renombrar')));
    }
  }

  Future<void> _deleteProject(BuildContext context, WidgetRef ref) async {
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
      await ref.read(dioProvider).delete('/projects/$projectId');
      ref.invalidate(projectsProvider);
      if (context.mounted) context.go('/projects');
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al eliminar proyecto')));
    }
  }

  void _showObsOptions(BuildContext context, WidgetRef ref, ObservationModel o) {
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
      ListTile(leading: const Icon(Icons.edit_outlined), title: const Text('Editar'), onTap: () { Navigator.pop(context); context.go('/projects/$projectId/observations/${o.id}/edit', extra: o); }),
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
            ref.invalidate(observationsProvider(projectId));
            ref.invalidate(observationsPageProvider((projectId: projectId, page: 1)));
          } catch (_) {
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al eliminar')));
          }
        },
      ),
    ])));
  }

  void _showNoteOptions(BuildContext context, WidgetRef ref, NoteModel n) {
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
      ListTile(leading: const Icon(Icons.edit_outlined), title: const Text('Editar'), onTap: () { Navigator.pop(context); context.go('/projects/$projectId/notes/${n.id}/edit', extra: n); }),
      ListTile(
        leading: const Icon(Icons.delete_outline, color: Colors.red),
        title: const Text('Eliminar', style: TextStyle(color: Colors.red)),
        onTap: () async {
          Navigator.pop(context);
          final confirm = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
            title: const Text('Eliminar nota'), content: const Text('¿Seguro?'),
            actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar'))],
          ));
          if (confirm != true) return;
          try { await ref.read(dioProvider).delete('/notes/${n.id}'); ref.invalidate(notesProvider(projectId)); } catch (_) {}
        },
      ),
    ])));
  }

  void _showRouteOptions(BuildContext context, WidgetRef ref, RouteModel r) {
    showModalBottomSheet(context: context, builder: (_) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
      ListTile(leading: const Icon(Icons.visibility_outlined), title: const Text('Ver detalle'), onTap: () { Navigator.pop(context); context.go('/projects/$projectId/routes/${r.id}/view', extra: r); }),
      ListTile(
        leading: const Icon(Icons.delete_outline, color: Colors.red),
        title: const Text('Eliminar', style: TextStyle(color: Colors.red)),
        onTap: () async {
          Navigator.pop(context);
          final confirm = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
            title: const Text('Eliminar ruta'), content: const Text('¿Seguro?'),
            actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')), FilledButton(style: FilledButton.styleFrom(backgroundColor: Colors.red), onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar'))],
          ));
          if (confirm != true) return;
          try { await ref.read(dioProvider).delete('/routes/${r.id}'); ref.invalidate(routesProvider(projectId)); } catch (_) {}
        },
      ),
    ])));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routes = ref.watch(routesProvider(projectId));
    final notes = ref.watch(notesProvider(projectId));
    final rec = ref.watch(recordingProvider);
    final isRecordingHere = rec.active && rec.projectId == projectId;
    final detail = ref.watch(projectDetailProvider(projectId));

    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: detail.when(data: (d) => Text(d.projectName), loading: () => const Text('Proyecto'), error: (_, __) => const Text('Proyecto')),
          actions: [
            IconButton(icon: const Icon(Icons.drive_file_rename_outline), onPressed: () => _renameProject(context, ref, detail.valueOrNull?.projectName ?? '')),
            IconButton(icon: const Icon(Icons.map_outlined), onPressed: () => context.go('/projects/$projectId/map')),
            IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red), onPressed: () => _deleteProject(context, ref)),
          ],
          bottom: const TabBar(tabs: [
            Tab(icon: Icon(Icons.route), text: 'Rutas'),
            Tab(icon: Icon(Icons.bug_report_outlined), text: 'Obs.'),
            Tab(icon: Icon(Icons.note_outlined), text: 'Notas'),
            Tab(icon: Icon(Icons.timeline), text: 'Actividad'),
            Tab(icon: Icon(Icons.group_outlined), text: 'Miembros'),
          ]),
        ),
        body: Column(
          children: [
            if (isRecordingHere)
              GestureDetector(
                onTap: () => context.go('/projects/$projectId/routes/record'),
                child: Container(
                  color: const Color(0xFF2E7D32),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(children: [
                    const Icon(Icons.fiber_manual_record, color: Colors.red, size: 14),
                    const SizedBox(width: 8),
                    Text('Grabando · ${rec.elapsed} · ${(rec.distanceMeters / 1000).toStringAsFixed(2)} km · ${rec.points.length} pts',
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    const Icon(Icons.chevron_right, color: Colors.white),
                  ]),
                ),
              ),
            Expanded(
              child: TabBarView(children: [
                // RUTAS
                routes.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (list) => list.isEmpty
                      ? const Center(child: Text('Sin rutas'))
                      : ListView.builder(
                          itemCount: list.length,
                          itemBuilder: (_, i) {
                            final r = list[i];
                            final dur = r.endedAt?.difference(r.startedAt);
                            return ListTile(
                              leading: const Icon(Icons.route, color: Color(0xFF2E7D32)),
                              title: Text(r.name),
                              subtitle: Text('${(r.distanceMeters / 1000).toStringAsFixed(2)} km${dur != null ? ' · ${dur.inMinutes} min' : ''}'),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => context.go('/projects/$projectId/routes/${r.id}/view', extra: r),
                              onLongPress: () => _showRouteOptions(context, ref, r),
                            );
                          },
                        ),
                ),
                // OBSERVACIONES (paginado)
                _ObsTab(projectId: projectId, onOptions: (o) => _showObsOptions(context, ref, o), photoUrl: _photoUrl),
                // NOTAS
                notes.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('$e')),
                  data: (list) => list.isEmpty
                      ? const Center(child: Text('Sin notas'))
                      : ListView.builder(
                          itemCount: list.length,
                          itemBuilder: (_, i) {
                            final n = list[i];
                            return ListTile(
                              leading: const Icon(Icons.note),
                              title: Text(n.title),
                              subtitle: Text(n.body.length > 60 ? '${n.body.substring(0, 60)}…' : n.body),
                              onTap: () {},
                              onLongPress: () => _showNoteOptions(context, ref, n),
                            );
                          },
                        ),
                ),
                // ACTIVIDAD
                _ActivityTab(projectId: projectId),
                // MIEMBROS
                _MembersTab(projectId: projectId),
              ]),
            ),
          ],
        ),
        floatingActionButton: _buildFab(context, rec),
      ),
    );
  }

  Widget _buildFab(BuildContext context, RecordingState rec) {
    final isRecordingHere = rec.active && rec.projectId == projectId;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        FloatingActionButton.small(heroTag: 'note', onPressed: () => context.go('/projects/$projectId/notes/new'), child: const Icon(Icons.note_add)),
        const SizedBox(height: 8),
        FloatingActionButton.small(heroTag: 'obs', onPressed: () => context.go('/projects/$projectId/observations/new'), child: const Icon(Icons.add_photo_alternate_outlined)),
        const SizedBox(height: 8),
        FloatingActionButton(
          heroTag: 'route',
          backgroundColor: isRecordingHere ? const Color(0xFF2E7D32) : null,
          onPressed: () => context.go('/projects/$projectId/routes/record'),
          child: Icon(isRecordingHere ? Icons.fiber_manual_record : Icons.play_arrow, color: isRecordingHere ? Colors.red : null),
        ),
      ],
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
    if (_items.isEmpty) return const Center(child: Text('Sin observaciones'));

    return RefreshIndicator(
      onRefresh: () async {
        setState(() { _items.clear(); _page = 1; _hasMore = true; });
        await _loadMore();
      },
      child: ListView.builder(
        controller: _scroll,
        itemCount: _items.length + (_hasMore ? 1 : 0),
        itemBuilder: (_, i) {
          if (i == _items.length) return const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()));
          final o = _items[i];
          final firstPhoto = o.photos.isNotEmpty ? o.photos.first : null;
          return ListTile(
            leading: firstPhoto != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: CachedNetworkImage(
                      imageUrl: widget.photoUrl(firstPhoto),
                      key: ValueKey(firstPhoto),
                      width: 44, height: 44, fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => const Icon(Icons.eco, color: Color(0xFF2E7D32)),
                    ),
                  )
                : const Icon(Icons.eco, color: Color(0xFF2E7D32)),
            title: Text(o.title ?? o.taxonName),
            subtitle: Text('${o.taxonName} · ${o.observedAt.day}/${o.observedAt.month}/${o.observedAt.year} · x${o.quantity}'),
            trailing: Icon(o.syncStatus == 'Synced' ? Icons.cloud_done : Icons.cloud_upload_outlined,
                color: o.syncStatus == 'Synced' ? Colors.green : Colors.orange, size: 18),
            onTap: () => context.go('/projects/${widget.projectId}/observations/${o.id}/view', extra: o),
            onLongPress: () => widget.onOptions(o),
          );
        },
      ),
    );
  }
}

// ── Pestaña actividad ─────────────────────────────────────────────────────────

class _ActivityTab extends ConsumerWidget {
  final String projectId;
  const _ActivityTab({required this.projectId});

  String _avatarUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${AppConstants.apiBaseUrl.replaceAll('/api', '')}$url';
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

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'ahora';
    if (diff.inMinutes < 60) return 'hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'hace ${diff.inHours} h';
    if (diff.inDays < 7) return 'hace ${diff.inDays} d';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activity = ref.watch(activityProvider(projectId));
    return activity.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (list) => list.isEmpty
          ? const Center(child: Text('Sin actividad reciente'))
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(activityProvider(projectId)),
              child: ListView.builder(
                itemCount: list.length,
                itemBuilder: (_, i) {
                  final a = list[i];
                  return ListTile(
                    leading: CircleAvatar(
                      radius: 20,
                      backgroundImage: a.avatarUrl != null ? CachedNetworkImageProvider(_avatarUrl(a.avatarUrl!)) : null,
                      backgroundColor: _typeColor(a.type).withAlpha(30),
                      child: a.avatarUrl == null
                          ? Icon(_typeIcon(a.type), size: 18, color: _typeColor(a.type))
                          : null,
                    ),
                    title: RichText(
                      text: TextSpan(
                        style: DefaultTextStyle.of(context).style,
                        children: [
                          TextSpan(text: a.actorName, style: const TextStyle(fontWeight: FontWeight.bold)),
                          TextSpan(text: ' ${a.description}'),
                        ],
                      ),
                    ),
                    subtitle: Text(_timeAgo(a.occurredAt), style: const TextStyle(fontSize: 12, color: Colors.grey)),
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

  String _avatarUrl(String url) {
    if (url.startsWith('http')) return url;
    return '${AppConstants.apiBaseUrl.replaceAll('/api', '')}$url';
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
                  backgroundImage: m.avatarUrl != null ? CachedNetworkImageProvider(_avatarUrl(m.avatarUrl!)) : null,
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
