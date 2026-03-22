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

class _RouteRecordingScreenState extends ConsumerState<RouteRecordingScreen> {
  final _mapController = MapController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    Geolocator.requestPermission();
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
        title: const Text('Nombre de la ruta'),
        content: TextField(controller: ctrl, autofocus: true, decoration: const InputDecoration(border: OutlineInputBorder())),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () {
              final v = ctrl.text.trim();
              if (v.isNotEmpty) ref.read(recordingProvider.notifier).setName(v);
              Navigator.pop(context);
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _stop(BuildContext context) async {
    final rec = ref.read(recordingProvider);
    if (rec.points.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Necesitas al menos 2 puntos GPS para guardar la ruta')),
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

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(initialCenter: LatLng(40.4168, -3.7038), initialZoom: 15),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.biofield.frontend',
              ),
              if (points.isNotEmpty) ...[
                PolylineLayer(polylines: [Polyline(points: points, color: Colors.green, strokeWidth: 4)]),
                MarkerLayer(markers: [
                  Marker(point: points.last, child: const Icon(Icons.my_location, color: Colors.green, size: 28)),
                ]),
              ],
            ],
          ),

          // Banner superior
          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: Container(
                color: Colors.black87,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => context.pop(),
                    ),
                    if (rec.active) ...[
                      Expanded(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _stat(Icons.timer, rec.elapsed),
                            _stat(Icons.straighten, '${(rec.distanceMeters / 1000).toStringAsFixed(2)} km'),
                            _stat(Icons.place, '${points.length} pts'),
                            GestureDetector(
                              onTap: () => _editName(context, rec.routeName),
                              child: Row(mainAxisSize: MainAxisSize.min, children: [
                                const Icon(Icons.edit, color: Colors.white70, size: 13),
                                const SizedBox(width: 3),
                                Text(
                                  rec.routeName.length > 12 ? '${rec.routeName.substring(0, 12)}…' : rec.routeName,
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ]),
                            ),
                            if (rec.paused)
                              const Chip(
                                label: Text('PAUSADO', style: TextStyle(color: Colors.white, fontSize: 10)),
                                backgroundColor: Colors.orange,
                                visualDensity: VisualDensity.compact,
                              ),
                          ],
                        ),
                      ),
                    ] else
                      const Expanded(child: Text('Grabación de ruta', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                  ],
                ),
              ),
            ),
          ),

          // Botón centrar mapa
          if (points.isNotEmpty)
            Positioned(
              bottom: 120, right: 16,
              child: FloatingActionButton(
                mini: true,
                heroTag: 'my_loc_rec',
                onPressed: () => _mapController.move(points.last, _mapController.camera.zoom),
                child: const Icon(Icons.my_location),
              ),
            ),

          // Controles inferiores
          Positioned(
            bottom: 24, left: 0, right: 0,
            child: Column(
              children: [
                if (rec.active)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: FloatingActionButton.extended(
                      heroTag: 'quick_obs_rec',
                      onPressed: () => context.go(
                        '/projects/${widget.projectId}/observations/new',
                        extra: {'routeId': ref.read(recordingProvider).activeRouteId},
                      ),
                      icon: const Icon(Icons.add_photo_alternate_outlined),
                      label: const Text('Observación'),
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF2E7D32),
                    ),
                  ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (!rec.active)
                      FilledButton.icon(
                        onPressed: _start,
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Iniciar ruta'),
                      )
                    else ...[
                      FilledButton.icon(
                        onPressed: () => ref.read(recordingProvider.notifier).togglePause(),
                        icon: Icon(rec.paused ? Icons.play_arrow : Icons.pause),
                        label: Text(rec.paused ? 'Reanudar' : 'Pausar'),
                        style: FilledButton.styleFrom(backgroundColor: Colors.orange),
                      ),
                      const SizedBox(width: 16),
                      _saving
                          ? const CircularProgressIndicator()
                          : FilledButton.icon(
                              onPressed: () => _stop(context),
                              icon: const Icon(Icons.stop),
                              label: const Text('Finalizar'),
                              style: FilledButton.styleFrom(backgroundColor: Colors.red),
                            ),
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

  Widget _stat(IconData icon, String value) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, color: Colors.white, size: 14),
      const SizedBox(width: 3),
      Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
    ],
  );
}
