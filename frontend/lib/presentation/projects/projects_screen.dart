import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../widgets/recording_status_banner.dart';
import '../../data/recording/recording_provider.dart';
import '../../data/sync/sync_service.dart' as sync;

class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projects = ref.watch(projectsProvider);
    final rec = ref.watch(recordingProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar.large(
            title: Text('BioField', style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w900, letterSpacing: -1)),
            centerTitle: false,
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.grey.withOpacity(0.12), shape: BoxShape.circle),
                  child: const Icon(Icons.map_outlined, color: Colors.grey, size: 20),
                ),
                tooltip: 'Planificación Offline (Desactivado)',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('La descarga de mapas offline está desactivada temporalmente.'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.green.withOpacity(0.12), shape: BoxShape.circle),
                  child: const Icon(Icons.auto_awesome, color: Colors.green, size: 20),
                ),
                tooltip: 'Identificar especie',
                onPressed: () => context.go('/identify'),
              ),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: theme.colorScheme.primaryContainer.withOpacity(0.5), shape: BoxShape.circle),
                  child: Icon(Icons.person_outline, color: theme.colorScheme.onPrimaryContainer, size: 20),
                ),
                onPressed: () => context.go('/profile'),
              ),
              const SizedBox(width: 8),
            ],
            backgroundColor: theme.colorScheme.surface,
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.brightness == Brightness.dark 
                      ? Colors.amber.shade900.withOpacity(0.2) 
                      : Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: theme.brightness == Brightness.dark 
                        ? Colors.amber.shade800.withOpacity(0.4) 
                        : Colors.amber.shade200,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline_rounded,
                      color: theme.brightness == Brightness.dark 
                          ? Colors.amber.shade200 
                          : Colors.amber.shade800,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Las funciones locales (guardado offline y descarga de mapas) están temporalmente desactivadas.',
                        style: TextStyle(
                          color: theme.brightness == Brightness.dark 
                              ? Colors.amber.shade100 
                              : Colors.amber.shade900,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (rec.active)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: RecordingStatusBanner(rec: rec, onTap: () => context.go('/projects/${rec.projectId}/routes/record')),
              ),
            ),
          // Banner de migración (si hay obs de invitado)
          ref.watch(guestObsCountProvider).when(
            data: (count) {
              final user = ref.watch(authProvider);
              if (count > 0 && user?.isGuest != true) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [Colors.orange.shade800, Colors.orange.shade600]),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [BoxShadow(color: Colors.orange.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.cloud_upload_outlined, color: Colors.white, size: 28),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Migración pendiente', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                Text('Tienes $count observaciones sin asignar. Toca un proyecto para migrarlas allí.', 
                                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }
              return const SliverToBoxAdapter(child: SizedBox.shrink());
            },
            loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
            error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
          ),
          projects.when(
            loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
            error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
            data: (list) {
              final user = ref.read(authProvider);
              if (user?.isGuest == true) return const SliverToBoxAdapter(child: SizedBox.shrink());
              
              return SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                sliver: SliverToBoxAdapter(
                  child: Opacity(
                    opacity: 0.5,
                    child: InkWell(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('El espacio local está desactivado temporalmente.'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.blue.shade900.withOpacity(0.8), Colors.blue.shade800.withOpacity(0.4)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.blue.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: Colors.blue.withOpacity(0.2), shape: BoxShape.circle),
                              child: const Icon(Icons.phonelink_setup, color: Colors.blue, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Espacio Local (Desactivado)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                                  Text('Datos guardados en este dispositivo', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13)),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right, color: Colors.white54),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            sliver: SliverToBoxAdapter(
              child: Text('MIS PROYECTOS EN LA NUBE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: theme.colorScheme.primary.withOpacity(0.5), letterSpacing: 1.2)),
            ),
          ),
          projects.when(
            loading: () => const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
            error: (e, _) => SliverFillRemaining(child: Center(child: Text('Error: $e'))),
            data: (list) {
              final user = ref.read(authProvider);
              final filtered = user?.isGuest == true ? list : list.where((p) => p.id != 'OFFLINE_GUEST').toList();
              
              if (filtered.isEmpty) {
                return const SliverFillRemaining(
                  child: _EmptyState(
                    icon: Icons.cloud_off_outlined,
                    title: 'Sin proyectos en la nube',
                    subtitle: 'Crea uno nuevo para colaborar con otros miembros.',
                  ),
                );
              }
              
              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.85,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (_, i) {
                      final p = filtered[i];
                      final isDark = theme.brightness == Brightness.dark;
                      return Container(
                        decoration: BoxDecoration(
                          color: isDark ? theme.colorScheme.surface : Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [
                            if (!isDark) BoxShadow(color: theme.colorScheme.primary.withOpacity(0.06), blurRadius: 24, offset: const Offset(0, 10))
                          ],
                          border: Border.all(color: isDark ? Colors.white10 : Colors.black.withOpacity(0.03)),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(28),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(28),
                            onTap: () async {
                              final guestCount = ref.read(guestObsCountProvider).asData?.value ?? 0;
                              final user = ref.read(authProvider);

                              if (guestCount > 0 && user?.isGuest != true && p.id != 'OFFLINE_GUEST') {
                                final migrate = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('¿Migrar datos locales?'),
                                    content: Text('Tienes $guestCount observaciones sin proyecto. ¿Quieres moverlas a "${p.name}"?'),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ahora no')),
                                      FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Migrar')),
                                    ],
                                  ),
                                );

                                if (migrate == true) {
                                  await ref.read(sync.syncServiceProvider).migrateGuestObservations(p.id);
                                  ref.invalidate(observationsProvider(p.id));
                                  ref.invalidate(guestObsCountProvider);
                                }
                              }
                              if (context.mounted) context.go('/projects/${p.id}');
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: (isDark ? Colors.white : theme.colorScheme.primary).withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Icon(Icons.folder_rounded, color: isDark ? Colors.white70 : theme.colorScheme.primary, size: 24),
                                  ),
                                  const Spacer(),
                                  Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, height: 1.2), maxLines: 2, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 6),
                                  Text(p.description ?? '', style: TextStyle(fontSize: 12, color: (isDark ? Colors.white : Colors.black).withOpacity(0.5)), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: (isDark ? Colors.white : theme.colorScheme.primary).withOpacity(0.05),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.group_outlined, size: 12, color: theme.colorScheme.onSurface.withOpacity(0.7)),
                                        const SizedBox(width: 4),
                                        Text('${p.memberCount}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface.withOpacity(0.7))),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showProjectActions(context, ref),
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: Colors.white,
        elevation: 10,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        icon: const Icon(Icons.add_rounded, size: 28),
        label: const Text('Nuevo Proyecto', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
      ),
    );
  }

  void _showProjectActions(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
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
            Text('Gestión de Proyectos', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 32),
            _ActionTile(
              icon: Icons.create_new_folder_outlined,
              title: 'Crear nuevo proyecto',
              subtitle: 'Comienza una nueva investigación propia',
              color: theme.colorScheme.primary,
              onTap: () {
                Navigator.pop(context);
                _showCreateSheet(context, ref);
              },
            ),
            const SizedBox(height: 16),
            _ActionTile(
              icon: Icons.qr_code_scanner_rounded,
              title: 'Unirme con código',
              subtitle: 'Participa en un proyecto existente',
              color: Colors.orange,
              onTap: () {
                Navigator.pop(context);
                _showJoinSheet(context, ref);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateSheet(BuildContext context, WidgetRef ref) {
    final nameCtrl = TextEditingController();
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(color: theme.colorScheme.surface, borderRadius: const BorderRadius.vertical(top: Radius.circular(32))),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Crear Proyecto', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 24),
              TextField(
                controller: nameCtrl,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Nombre del proyecto',
                  prefixIcon: const Icon(Icons.edit_note_rounded),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  filled: true,
                  fillColor: theme.colorScheme.surfaceVariant.withOpacity(0.3),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    if (nameCtrl.text.trim().isEmpty) return;
                    try {
                      await ref.read(dioProvider).post('/projects', data: {'name': nameCtrl.text.trim()});
                      ref.invalidate(projectsProvider);
                      if (context.mounted) Navigator.pop(context);
                    } catch (_) {}
                  },
                  style: FilledButton.styleFrom(padding: const EdgeInsets.all(16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: const Text('Confirmar y Crear', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showJoinSheet(BuildContext context, WidgetRef ref) {
    final codeCtrl = TextEditingController();
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          decoration: BoxDecoration(color: theme.colorScheme.surface, borderRadius: const BorderRadius.vertical(top: Radius.circular(32))),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Unirse a Proyecto', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 24),
              TextField(
                controller: codeCtrl,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Código de acceso',
                  prefixIcon: const Icon(Icons.key_rounded),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  filled: true,
                  fillColor: theme.colorScheme.surfaceVariant.withOpacity(0.3),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    if (codeCtrl.text.trim().isEmpty) return;
                    try {
                      await ref.read(dioProvider).get('/projects/join/${codeCtrl.text.trim()}');
                      ref.invalidate(projectsProvider);
                      if (context.mounted) Navigator.pop(context);
                    } catch (_) {}
                  },
                  style: FilledButton.styleFrom(padding: const EdgeInsets.all(16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: const Text('Unirse ahora', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
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

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _EmptyState({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 80, color: theme.colorScheme.primary.withOpacity(0.1)),
            const SizedBox(height: 24),
            Text(title, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withOpacity(0.6))),
          ],
        ),
      ),
    );
  }
}
