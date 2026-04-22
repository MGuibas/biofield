import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../data/remote/providers.dart';
import '../../data/remote/api_client.dart';
import '../../data/sync/sync_service.dart';
import '../../data/recording/recording_provider.dart';

class RouteRecordingScreen extends ConsumerStatefulWidget {
  final String projectId;
  const RouteRecordingScreen({super.key, required this.projectId});

  @override
  ConsumerState<RouteRecordingScreen> createState() => _RouteRecordingScreenState();
}

class _RouteRecordingScreenState extends ConsumerState<RouteRecordingScreen> with SingleTickerProviderStateMixin {
  final _mapController = MapController();
  bool _saving = false;
  bool _isSatellite = false; // Toggle para satélite
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    Geolocator.requestPermission();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  void _start() {
    final defaultName = 'Ruta ${DateTime.now().day}/${DateTime.now().month}';
    ref.read(recordingProvider.notifier).start(widget.projectId, defaultName);
  }

  void _editName(BuildContext context, String current) {
    final ctrl = TextEditingController(text: current);
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white.withOpacity(0.9),
        surfaceTintColor: Colors.white,
        title: const Text('Nombre de la ruta'),
        content: TextField(controller: ctrl, autofocus: true, decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'Ej: Transecto Norte')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () {
              final v = ctrl.text.trim();
              if (v.isNotEmpty) ref.read(recordingProvider.notifier).setName(v);
              Navigator.pop(context);
            },
            child: const Text('Renombrar'),
          ),
        ],
      ),
    );
  }

  Future<void> _stop(BuildContext context) async {
    final rec = ref.read(recordingProvider);
    if (rec.points.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Necesitas al menos 2 puntos GPS para guardar la ruta'), behavior: SnackBarBehavior.floating),
      );
      await ref.read(recordingProvider.notifier).stop();
      if (context.mounted) context.pop();
      return;
    }
    setState(() => _saving = true);
    final trackJson = '[${rec.points.map((p) => '{"lat":${p.latitude},"lon":${p.longitude}}').join(',')}]';
    try {
      final res = await ref.read(dioProvider).post('/projects/${widget.projectId}/routes', data: {
        'name': rec.routeName, 'startedAt': rec.startedAt!.toIso8601String(),
      });
      final routeId = res.data['id'] as String;
      await ref.read(dioProvider).put('/routes/$routeId', data: {
        'name': rec.routeName,
        'endedAt': DateTime.now().toIso8601String(),
        'distanceMeters': rec.distanceMeters,
        'trackPointsJson': trackJson,
      });
      ref.read(recordingProvider.notifier).setActiveRouteId(routeId);
      ref.invalidate(routesProvider(widget.projectId));
    } catch (_) {
      await ref.read(syncServiceProvider).saveRouteOffline(
        projectId: widget.projectId,
        name: rec.routeName,
        startedAt: rec.startedAt!,
        endedAt: DateTime.now(),
        distanceMeters: rec.distanceMeters,
        trackPointsJson: trackJson,
      );
    }
    await ref.read(recordingProvider.notifier).stop();
    if (context.mounted) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final rec = ref.watch(recordingProvider);
    final points = rec.points;
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: points.isNotEmpty ? points.last : const LatLng(40.4168, -3.7038),
              initialZoom: 17,
              interactionOptions: const InteractionOptions(flags: InteractiveFlag.all),
            ),
            children: [
              TileLayer(
                urlTemplate: _isSatellite 
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
                userAgentPackageName: 'com.biofield.frontend',
              ),
              if (points.isNotEmpty) ...[
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: points, 
                      color: Colors.blue.withOpacity(0.8), 
                      strokeWidth: 5,
                      borderStrokeWidth: 2,
                      borderColor: Colors.white30,
                    )
                  ]
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: points.last,
                      width: 60, height: 60,
                      child: _PulseMarker(controller: _pulseController),
                    ),
                  ],
                ),
              ],
            ],
          ),

          // --- UI OVERLAY ---
          
          // Panel Superior de Telemetría (Glassmorphism)
          if (rec.active)
            Positioned(
              top: 50, left: 16, right: 16,
              child: _GlassContainer(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      _StatItem(label: 'TIEMPO', value: rec.elapsed, icon: Icons.timer_outlined),
                      _vDivider(),
                      _StatItem(label: 'DISTANCIA', value: '${(rec.distanceMeters / 1000).toStringAsFixed(2)} km', icon: Icons.straighten_rounded),
                      _vDivider(),
                      _StatItem(label: 'PUNTOS', value: '${points.length}', icon: Icons.gps_fixed_rounded),
                    ],
                  ),
                ),
              ),
            ),

          // Botón Atrás
          Positioned(
            top: 50, left: 16,
            child: rec.active ? const SizedBox() : _MapControl(
              icon: Icons.arrow_back,
              onTap: () => context.pop(),
            ),
          ),

          // Controles de Mapa (Lado Derecho)
          Positioned(
            top: rec.active ? 140 : 50, right: 16,
            child: Column(
              children: [
                _MapControl(
                  icon: _isSatellite ? Icons.map_outlined : Icons.satellite_alt_outlined,
                  onTap: () => setState(() => _isSatellite = !_isSatellite),
                ),
                const SizedBox(height: 12),
                _MapControl(
                  icon: Icons.my_location,
                  onTap: () {
                    if (points.isNotEmpty) {
                      _mapController.move(points.last, 17);
                    }
                  },
                ),
              ],
            ),
          ),

          // Indicador de Pausa
          if (rec.paused)
            Center(
              child: _GlassContainer(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.pause_circle_filled, color: Colors.orange, size: 28),
                    const SizedBox(width: 12),
                    Text('GRABACIÓN EN PAUSA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: theme.colorScheme.onSurface)),
                  ],
                ),
              ),
            ),

          // Panel Inferior de Controles
          Positioned(
            bottom: 40, left: 24, right: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (rec.active)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: _GlassContainer(
                      padding: EdgeInsets.zero,
                      child: ListTile(
                        onTap: () => context.go('/projects/${widget.projectId}/observations/new', extra: {'routeId': rec.activeRouteId}),
                        leading: const CircleAvatar(backgroundColor: Color(0xFF2E7D32), child: Icon(Icons.add_a_photo, color: Colors.white, size: 20)),
                        title: const Text('Nueva Observación', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: const Text('Añadir hallazgo en este punto', style: TextStyle(fontSize: 11)),
                        trailing: const Icon(Icons.chevron_right, size: 20),
                      ),
                    ),
                  ),
                
                Row(
                  children: [
                    if (!rec.active)
                      Expanded(
                        child: _ControlBtn(
                          onTap: _start,
                          icon: Icons.play_arrow_rounded,
                          label: 'INICIAR RUTA',
                          color: const Color(0xFF2E7D32),
                        ),
                      )
                    else ...[
                      Expanded(
                        child: _ControlBtn(
                          onTap: () => ref.read(recordingProvider.notifier).togglePause(),
                          icon: rec.paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                          label: rec.paused ? 'CONTINUAR' : 'PAUSAR',
                          color: rec.paused ? Colors.orange : Colors.blueGrey,
                        ),
                      ),
                      const SizedBox(width: 16),
                      if (!_saving)
                        Expanded(
                          child: _ControlBtn(
                            onTap: () => _stop(context),
                            icon: Icons.stop_rounded,
                            label: 'FINALIZAR',
                            color: Colors.redAccent,
                          ),
                        )
                      else
                        const Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _vDivider() => Container(height: 30, width: 1, color: Colors.black12, margin: const EdgeInsets.symmetric(horizontal: 12));
}

class _PulseMarker extends StatelessWidget {
  final AnimationController controller;
  const _PulseMarker({required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 40 * controller.value,
              height: 40 * controller.value,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blue.withOpacity(1 - controller.value),
              ),
            ),
            Container(
              width: 16, height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blue,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 4)],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _StatItem({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 10, color: Colors.black45),
              const SizedBox(width: 4),
              Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.black45, letterSpacing: 0.5)),
            ],
          ),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.black87)),
        ],
      ),
    );
  }
}

class _MapControl extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _MapControl({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return _GlassContainer(
      padding: EdgeInsets.zero,
      child: IconButton(
        icon: Icon(icon, color: Colors.black87, size: 20),
        onPressed: onTap,
      ),
    );
  }
}

class _GlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  const _GlassContainer({required this.child, this.padding});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: padding ?? const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.7),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.3)),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _ControlBtn extends StatelessWidget {
  final VoidCallback onTap;
  final IconData icon;
  final String label;
  final Color color;
  const _ControlBtn({required this.onTap, required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, color: Colors.white),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.0)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 4,
        shadowColor: color.withOpacity(0.4),
      ),
    );
  }
}

