import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';
import '../../data/remote/providers.dart';
import '../../domain/models/models.dart';

class ProjectMapScreen extends ConsumerStatefulWidget {
  final String projectId;
  const ProjectMapScreen({super.key, required this.projectId});

  @override
  ConsumerState<ProjectMapScreen> createState() => _ProjectMapScreenState();
}

class _ProjectMapScreenState extends ConsumerState<ProjectMapScreen> {
  final _mapController = MapController();
  bool _isSatellite = false;
  ObservationModel? _selectedObs;
  late final _tileProvider = FMTCTileProvider.allStores(
    allStoresStrategy: BrowseStoreStrategy.readUpdateCreate,
    loadingStrategy: BrowseLoadingStrategy.cacheFirst,
  );

  Future<void> _goToMyLocation() async {
    try {
      final status = await Permission.location.request();
      if (status.isGranted) {
        final pos = await Geolocator.getCurrentPosition();
        _mapController.move(LatLng(pos.latitude, pos.longitude), 16);
      }
    } catch (_) {}
  }

  String _photoUrl(String url) {
    if (url.startsWith('http')) return url;
    final cleanUrl = url.startsWith('/') ? url : '/$url';
    return 'https://fotos.guibas.es/biofield$cleanUrl';
  }

  @override
  Widget build(BuildContext context) {
    final routes = ref.watch(routesProvider(widget.projectId));
    final observations = ref.watch(observationsProvider(widget.projectId));
    final theme = Theme.of(context);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Mapa del Proyecto', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: theme.colorScheme.surface.withOpacity(0.8),
        elevation: 0,
        flexibleSpace: ClipRect(
          child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10), child: Container(color: Colors.transparent)),
        ),
      ),
      body: routes.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (routeList) => observations.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('$e')),
          data: (obsList) => _buildMap(context, routeList, obsList),
        ),
      ),
    );
  }

  Widget _buildMap(BuildContext context, List<RouteModel> routeList, List<ObservationModel> obsList) {
    final theme = Theme.of(context);
    LatLng center = const LatLng(40.4168, -3.7038);
    if (obsList.isNotEmpty) center = LatLng(obsList.first.latitude, obsList.first.longitude);

    final polylines = <Polyline>[];
    double totalKm = 0;

    for (final route in routeList) {
      if (route.trackPointsJson == null) continue;
      try {
        final pts = (jsonDecode(route.trackPointsJson!) as List)
            .map((p) => LatLng((p['lat'] as num).toDouble(), (p['lon'] as num).toDouble()))
            .toList();
        if (pts.isNotEmpty) {
          polylines.add(Polyline(points: pts, color: Colors.blue.withOpacity(0.7), strokeWidth: 4));
          // Cálculo aproximado de distancia
          for (int i = 0; i < pts.length - 1; i++) {
            totalKm += Geolocator.distanceBetween(pts[i].latitude, pts[i].longitude, pts[i+1].latitude, pts[i+1].longitude);
          }
        }
      } catch (_) {}
    }

    final markers = obsList.map((o) => Marker(
      point: LatLng(o.latitude, o.longitude),
      width: 44, height: 44,
      child: GestureDetector(
        onTap: () => setState(() => _selectedObs = o),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          decoration: BoxDecoration(
            color: _selectedObs?.id == o.id ? Colors.orange : theme.colorScheme.primary,
            shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 8)],
            border: Border.all(color: Colors.white, width: 3),
          ),
          child: const Icon(Icons.eco, color: Colors.white, size: 26),
        ),
      ),
    )).toList();

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center, initialZoom: 14,
            onTap: (_, __) => setState(() => _selectedObs = null),
          ),
          children: [
            TileLayer(
              urlTemplate: _isSatellite 
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'es.guibas.biofield',
              tileProvider: _tileProvider,
            ),
            if (polylines.isNotEmpty) PolylineLayer(polylines: polylines),
            if (markers.isNotEmpty)
              MarkerClusterLayerWidget(
                options: MarkerClusterLayerOptions(
                  maxClusterRadius: 45,
                  size: const Size(40, 40),
                  alignment: Alignment.center,
                  padding: const EdgeInsets.all(50),
                  markers: markers,
                  builder: (context, markers) {
                    return Container(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withOpacity(0.9),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10)],
                      ),
                      child: Center(
                        child: Text(
                          markers.length.toString(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
        // Panel de estadísticas Superior Izquierdo
        Positioned(
          top: 110, left: 16,
          child: _GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StatItem(label: 'RUTAS', value: '${(totalKm/1000).toStringAsFixed(1)} km', icon: Icons.route),
                const SizedBox(height: 8),
                _StatItem(label: 'OBSERVACIONES', value: '${obsList.length}', icon: Icons.eco),
              ],
            ),
          ),
        ),
        // Controles Laterales Derechos
        Positioned(
          bottom: _selectedObs != null ? 220 : 100,
          right: 16,
          child: Column(
            children: [
              _MapControl(
                icon: _isSatellite ? Icons.map_outlined : Icons.satellite_alt_rounded,
                onTap: () => setState(() => _isSatellite = !_isSatellite),
              ),
              const SizedBox(height: 12),
              _MapControl(icon: Icons.my_location_rounded, onTap: _goToMyLocation),
            ],
          ),
        ),
        // Tarjeta de Vista Previa Inferior
        if (_selectedObs != null)
          Positioned(
            bottom: 40, left: 16, right: 16,
            child: _ObsPreviewCard(
              obs: _selectedObs!,
              photoUrl: _photoUrl,
              onClose: () => setState(() => _selectedObs = null),
              onTap: () => context.go('/projects/${widget.projectId}/observations/${_selectedObs!.id}/view', extra: _selectedObs),
            ),
          ),
      ],
    );
  }
}

class _GlassContainer extends StatelessWidget {
  final Widget child;
  const _GlassContainer({required this.child});
  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.8), border: Border.all(color: Colors.white.withOpacity(0.3))),
          child: child,
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label, value;
  final IconData icon;
  const _StatItem({required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.blueGrey),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF1B5E20))),
          ],
        ),
      ],
    );
  }
}

class _MapControl extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _MapControl({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48, height: 48,
        decoration: BoxDecoration(
          color: Colors.white, shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
        ),
        child: Icon(icon, color: Colors.blueGrey.shade800),
      ),
    );
  }
}

class _ObsPreviewCard extends StatelessWidget {
  final ObservationModel obs;
  final String Function(String) photoUrl;
  final VoidCallback onClose, onTap;

  const _ObsPreviewCard({required this.obs, required this.photoUrl, required this.onClose, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20)],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              width: 80, height: 80,
              child: obs.photos.isNotEmpty 
                ? CachedNetworkImage(imageUrl: photoUrl(obs.photos.first), fit: BoxFit.cover, memCacheWidth: 200)
                : Container(color: theme.colorScheme.primaryContainer, child: const Icon(Icons.eco)),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(obs.title ?? obs.taxonName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(obs.taxonName, style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey)),
                const SizedBox(height: 12),
                SizedBox(
                  height: 32,
                  child: FilledButton(
                    onPressed: onTap,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Ver detalles', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
          IconButton(icon: const Icon(Icons.close_rounded, size: 20), onPressed: onClose),
        ],
      ),
    );
  }
}
