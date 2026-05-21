import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../data/remote/providers.dart';
import '../../core/notifications.dart';

class PermissionScreen extends ConsumerStatefulWidget {
  const PermissionScreen({super.key});

  @override
  ConsumerState<PermissionScreen> createState() => _PermissionScreenState();
}

class _PermissionScreenState extends ConsumerState<PermissionScreen> {
  bool _locGranted = false;
  bool _notifGranted = false;
  bool _camGranted = false;

  @override
  void initState() {
    super.initState();
    _checkInitial();
  }

  Future<void> _checkInitial() async {
    final loc = await Geolocator.checkPermission();
    final notif = await Permission.notification.status;
    final cam = await Permission.camera.status;

    if (mounted) {
      setState(() {
        _locGranted = loc == LocationPermission.always || loc == LocationPermission.whileInUse;
        _notifGranted = notif.isGranted;
        _camGranted = cam.isGranted;
      });
    }
  }

  Future<void> _requestLoc() async {
    final status = await Geolocator.requestPermission();
    setState(() => _locGranted = status == LocationPermission.always || status == LocationPermission.whileInUse);
  }

  Future<void> _requestNotif() async {
    await initNotifications();
    final status = await Permission.notification.status;
    setState(() => _notifGranted = status.isGranted);
  }

  Future<void> _requestCam() async {
    final status = await Permission.camera.request();
    setState(() => _camGranted = status.isGranted);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final allDone = _locGranted && _notifGranted && _camGranted;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bienvenido a\nBioField',
                style: theme.textTheme.headlineLarge?.copyWith(fontWeight: FontWeight.w900, color: theme.colorScheme.primary),
              ),
              const SizedBox(height: 16),
              Text(
                'Para que la app funcione correctamente, necesitamos algunos permisos básicos:',
                style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 48),
              
              _permissionTile(
                icon: Icons.location_on_rounded,
                title: 'Ubicación',
                desc: 'Necesaria para geolocalizar tus observaciones y grabar rutas.',
                granted: _locGranted,
                onTap: _requestLoc,
              ),
              const SizedBox(height: 24),
              _permissionTile(
                icon: Icons.notifications_active_rounded,
                title: 'Notificaciones',
                desc: 'Para avisarte cuando una ruta se está grabando en segundo plano.',
                granted: _notifGranted,
                onTap: _requestNotif,
              ),
              const SizedBox(height: 24),
              _permissionTile(
                icon: Icons.camera_alt_rounded,
                title: 'Cámara y Fotos',
                desc: 'Para capturar la biodiversidad que encuentres.',
                granted: _camGranted,
                onTap: _requestCam,
              ),

              const Spacer(),
              
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: () {
                    ref.read(authProvider.notifier).completeFirstRun();
                  },
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    backgroundColor: allDone ? theme.colorScheme.primary : Colors.grey.shade400,
                  ),
                  child: Text(
                    allDone ? 'Comenzar' : 'Continuar de todos modos',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _permissionTile({
    required IconData icon,
    required String title,
    required String desc,
    required bool granted,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: granted ? null : onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: granted ? Colors.green.withOpacity(0.05) : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: granted ? Colors.green.withOpacity(0.2) : Colors.transparent),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: granted ? Colors.green.withOpacity(0.1) : Colors.white,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: granted ? Colors.green : Colors.grey.shade400),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 2),
                  Text(desc, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                ],
              ),
            ),
            if (granted)
              const Icon(Icons.check_circle_rounded, color: Colors.green)
            else
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
