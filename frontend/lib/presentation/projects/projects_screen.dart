import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../data/recording/recording_provider.dart';

class ProjectsScreen extends ConsumerWidget {
  const ProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final projects = ref.watch(projectsProvider);
    final rec = ref.watch(recordingProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('BioField'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.go('/profile'),
          ),
        ],
      ),
      body: Column(
        children: [
          if (rec.active)
            GestureDetector(
              onTap: () => context.go('/projects/${rec.projectId}/routes/record'),
              child: Container(
                color: const Color(0xFF2E7D32),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(children: [
                  const Icon(Icons.fiber_manual_record, color: Colors.red, size: 14),
                  const SizedBox(width: 8),
                  Text('Grabando · ${rec.elapsed} · ${(rec.distanceMeters / 1000).toStringAsFixed(2)} km',
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  const Icon(Icons.chevron_right, color: Colors.white),
                ]),
              ),
            ),
          Expanded(
            child: projects.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (list) => list.isEmpty
                  ? const Center(child: Text('No tienes proyectos aún'))
                  : ListView.builder(
                      itemCount: list.length,
                      itemBuilder: (_, i) {
                        final p = list[i];
                        return ListTile(
                          leading: const Icon(Icons.folder_outlined),
                          title: Text(p.name),
                          subtitle: Text('${p.memberCount} miembros · ${p.shareCode}'),
                          trailing: p.isArchived ? const Icon(Icons.archive_outlined, color: Colors.grey) : null,
                          onTap: () => context.go('/projects/${p.id}'),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.small(
            heroTag: 'join',
            onPressed: () => _showJoinDialog(context, ref),
            child: const Icon(Icons.qr_code_scanner),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            heroTag: 'create',
            onPressed: () => _showCreateDialog(context, ref),
            child: const Icon(Icons.add),
          ),
        ],
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final nameCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Nuevo proyecto'),
        content: TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Nombre'), autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              try {
                await ref.read(dioProvider).post('/projects', data: {'name': nameCtrl.text.trim()});
                ref.invalidate(projectsProvider);
                if (context.mounted) Navigator.pop(context);
              } catch (_) {}
            },
            child: const Text('Crear'),
          ),
        ],
      ),
    );
  }

  void _showJoinDialog(BuildContext context, WidgetRef ref) {
    final codeCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Unirse a proyecto'),
        content: TextField(controller: codeCtrl, decoration: const InputDecoration(labelText: 'Código de acceso'), autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () async {
              try {
                await ref.read(dioProvider).get('/projects/join/${codeCtrl.text.trim()}');
                ref.invalidate(projectsProvider);
                if (context.mounted) Navigator.pop(context);
              } catch (_) {}
            },
            child: const Text('Unirse'),
          ),
        ],
      ),
    );
  }
}
