import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
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

  Future<void> _goToMyLocation() async {
    try {
      await Geolocator.requestPermission();
      final pos = await Geolocator.getCurrentPosition();
      _mapController.move(LatLng(pos.latitude, pos.longitude), 15);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final routes       = ref.watch(routesProvider(widget.projectId));
    final observations = ref.watch(observationsProvider(widget.projectId));

    return Scaffold(
      appBar: AppBar(title: const Text('Mapa del proyecto')),
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
    LatLng center = const LatLng(40.4168, -3.7038);
    if (obsList.isNotEmpty) center = LatLng(obsList.first.latitude, obsList.first.longitude);

    final polylines = <Polyline>[];
    for (final route in routeList) {
      if (route.trackPointsJson == null) continue;
      try {
        final pts = (jsonDecode(route.trackPointsJson!) as List)
            .map((p) => LatLng((p['lat'] as num).toDouble(), (p['lon'] as num).toDouble()))
            .toList();
        if (pts.isNotEmpty) polylines.add(Polyline(points: pts, color: Colors.green, strokeWidth: 3));
      } catch (_) {}
    }

    final markers = obsList.map((o) => Marker(
      point: LatLng(o.latitude, o.longitude),
      width: 36, height: 36,
      child: GestureDetector(
        onTap: () => _showObservationInfo(context, o),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.green.shade700, shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
          ),
          child: const Icon(Icons.eco, color: Colors.white, size: 18),
        ),
      ),
    )).toList();

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(initialCenter: center, initialZoom: 14),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.biofield.frontend',
            ),
            if (polylines.isNotEmpty) PolylineLayer(polylines: polylines),
            if (markers.isNotEmpty) MarkerLayer(markers: markers),
          ],
        ),
        Positioned(
          bottom: 16, right: 16,
          child: FloatingActionButton(
            mini: true,
            onPressed: _goToMyLocation,
            child: const Icon(Icons.my_location),
          ),
        ),
      ],
    );
  }

  void _showObservationInfo(BuildContext context, ObservationModel o) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(o.title ?? o.taxonName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            if (o.title != null) Text(o.taxonName, style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey)),
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text('${o.observedAt.day}/${o.observedAt.month}/${o.observedAt.year}', style: const TextStyle(color: Colors.grey)),
              const SizedBox(width: 16),
              const Icon(Icons.people, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text('x${o.quantity}', style: const TextStyle(color: Colors.grey)),
            ]),
            if (o.description != null) ...[const SizedBox(height: 8), Text(o.description!)],
            if (o.weatherCondition != null || o.temperature != null) ...[
              const SizedBox(height: 8),
              Row(children: [
                if (o.weatherCondition != null) Chip(label: Text(o.weatherCondition!), visualDensity: VisualDensity.compact),
                if (o.temperature != null) ...[const SizedBox(width: 8), Text('${o.temperature}°C')],
                if (o.humidity != null) ...[const SizedBox(width: 8), Text('${o.humidity}% HR')],
              ]),
            ],
            if (o.tags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(spacing: 4, children: o.tags.map((t) => Chip(label: Text(t), visualDensity: VisualDensity.compact)).toList()),
            ],
          ],
        ),
      ),
    );
  }
}
