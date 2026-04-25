import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../data/sync/sync_service.dart';
import '../../core/constants.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _displayName = TextEditingController();
  final _speciality  = TextEditingController();
  final _institution = TextEditingController();
  bool _editing = false;
  bool _saving  = false;
  File? _localAvatar; // preview local inmediato
  int _avatarVersion = 0; // forzar rebuild del widget

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider);
    if (user != null) {
      _displayName.text = user.displayName;
      _speciality.text  = user.speciality ?? '';
      _institution.text = user.institution ?? '';
    }
  }

  Future<void> _pickAvatar() async {
    final xfile = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70, maxWidth: 400);
    if (xfile == null) return;
    final file = File(xfile.path);
    // Mostrar preview local inmediatamente
    setState(() { _localAvatar = file; _avatarVersion++; });
    
    final bytes = await file.readAsBytes();
    final base64 = base64Encode(bytes);
    final ext = '.${xfile.path.split('.').last}';
    try {
      await ref.read(authProvider.notifier).uploadAvatar(base64, ext, ProviderScope.containerOf(context));
      imageCache.clear();
      imageCache.clearLiveImages();
      if (mounted) {
        setState(() => _avatarVersion++);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Avatar actualizado')));
      }
    } catch (e) {
      setState(() => _localAvatar = null);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error al subir avatar: $e')));
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(authProvider.notifier).updateProfile(
        _displayName.text.trim(),
        _speciality.text.trim().isEmpty ? null : _speciality.text.trim(),
        _institution.text.trim().isEmpty ? null : _institution.text.trim(),
      );
      setState(() => _editing = false);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al guardar')));
    }
    setState(() => _saving = false);
  }

  String _buildAvatarUrl(String baseUrl, String avatarUrl) {
    String url = avatarUrl.startsWith('http') 
      ? avatarUrl 
      : '$baseUrl${avatarUrl.startsWith('/') ? avatarUrl : '/$avatarUrl'}';
      
    if (_avatarVersion > 0) {
      url += url.contains('?') ? '&v=$_avatarVersion' : '?v=$_avatarVersion';
    }
    return url;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);
    final db   = ref.watch(localDbProvider);
    final baseUrl = AppConstants.apiBaseUrl.replaceAll('/api', '');
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi perfil'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/projects'),
        ),
        actions: [
          if (_editing)
            IconButton(
              icon: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check),
              onPressed: _saving ? null : _save,
            )
          else
            IconButton(icon: const Icon(Icons.edit_outlined), onPressed: () => setState(() => _editing = true)),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── AVATAR ──────────────────────────────────────────────────
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  key: ValueKey('avatar_$_avatarVersion'),
                  radius: 52,
                  backgroundColor: Colors.green.shade100,
                  backgroundImage: _localAvatar != null
                      ? FileImage(_localAvatar!) as ImageProvider?
                      : (user?.avatarUrl != null
                          ? CachedNetworkImageProvider(_buildAvatarUrl(baseUrl, user!.avatarUrl!)) as ImageProvider?
                          : null),
                  child: (_localAvatar == null && user?.avatarUrl == null)
                      ? Text(
                          user?.displayName.isNotEmpty == true ? user!.displayName[0].toUpperCase() : '?',
                          style: const TextStyle(fontSize: 36, color: Color(0xFF2E7D32)),
                        )
                      : null,
                ),
                Positioned(
                  bottom: 0, right: 0,
                  child: GestureDetector(
                    onTap: _pickAvatar,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(color: Color(0xFF2E7D32), shape: BoxShape.circle),
                      child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── DATOS ────────────────────────────────────────────────────
          if (_editing) ...[
            TextField(controller: _displayName, decoration: const InputDecoration(labelText: 'Nombre', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _speciality,  decoration: const InputDecoration(labelText: 'Especialidad taxonómica', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _institution, decoration: const InputDecoration(labelText: 'Institución', border: OutlineInputBorder())),
          ] else ...[
            _infoTile(Icons.person_outline, 'Nombre', user?.displayName ?? ''),
            if (user?.email != null) _infoTile(Icons.email_outlined, 'Email', user!.email!),
            if (user?.speciality != null) _infoTile(Icons.science_outlined, 'Especialidad', user!.speciality!),
            if (user?.institution != null) _infoTile(Icons.business_outlined, 'Institución', user!.institution!),
          ],

          const Divider(height: 32),

          // ── TEMA ─────────────────────────────────────────────────────
          const Text('Apariencia', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          SegmentedButton<ThemeMode>(
            segments: const [
              ButtonSegment(value: ThemeMode.light,  icon: Icon(Icons.light_mode),  label: Text('Claro')),
              ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto), label: Text('Auto')),
              ButtonSegment(value: ThemeMode.dark,   icon: Icon(Icons.dark_mode),   label: Text('Oscuro')),
            ],
            selected: {themeMode},
            onSelectionChanged: (s) => ref.read(themeModeProvider.notifier).state = s.first,
          ),

          const Divider(height: 32),

          // ── ESTADO OFFLINE ───────────────────────────────────────────
          const Text('Sincronización offline', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          FutureBuilder(
            future: db.getPendingItems(),
            builder: (context, snap) {
              final count = snap.data?.length ?? 0;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  count == 0 ? Icons.cloud_done : Icons.cloud_upload_outlined,
                  color: count == 0 ? Colors.green : Colors.orange,
                ),
                title: Text(count == 0 ? 'Todo sincronizado' : '$count elemento(s) pendientes'),
                trailing: count > 0
                    ? TextButton(
                        onPressed: () async {
                          await ref.read(syncServiceProvider).sync();
                          setState(() {});
                        },
                        child: const Text('Sincronizar ahora'),
                      )
                    : null,
              );
            },
          ),

          const Divider(height: 32),

          // ── GALERÍA DE FOTOS ─────────────────────────────────────────
          const Text('Mis fotos de observaciones', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          FutureBuilder<List<String>>(
            future: ref.read(dioProvider).get('/projects').then((r) async {
              final projects = (r.data as List).map((j) => (j as Map)['id'] as String).toList();
              final allPhotos = <String>[];
              for (final pid in projects) {
                try {
                  final obs = await ref.read(dioProvider).get('/projects/$pid/observations');
                  for (final o in obs.data as List) {
                    final oMap = o as Map;
                    final photos = oMap['photosJson'];
                    if (photos != null && photos is String && photos.isNotEmpty) {
                      try {
                        final list = jsonDecode(photos) as List;
                        allPhotos.addAll(list.map((e) => '$baseUrl$e'));
                      } catch (_) {}
                    }
                  }
                } catch (_) {}
              }
              return allPhotos;
            }),
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final photos = snap.data ?? [];
              if (photos.isEmpty) return const Text('Sin fotos aún', style: TextStyle(color: Colors.grey));
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3, crossAxisSpacing: 4, mainAxisSpacing: 4,
                ),
                itemCount: photos.length,
                itemBuilder: (_, i) => GestureDetector(
                  onTap: () => _showPhoto(context, photos[i]),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.network(photos[i], fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(color: Colors.grey.shade200, child: const Icon(Icons.broken_image))),
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout, color: Colors.red),
            label: const Text('Cerrar sesión', style: TextStyle(color: Colors.red)),
            style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red)),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  void _showPhoto(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        child: InteractiveViewer(child: Image.network(url)),
      ),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Icon(icon, size: 18, color: Colors.grey.shade600),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        Text(value, style: const TextStyle(fontSize: 15)),
      ]),
    ]),
  );
}
