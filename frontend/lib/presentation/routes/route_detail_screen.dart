import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../data/remote/providers.dart';
import '../../domain/models/models.dart';

class RouteDetailScreen extends ConsumerWidget {
  final RouteModel route;
  const RouteDetailScreen({super.key, required this.route});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = route;
    final dur = r.endedAt != null ? r.endedAt!.difference(r.startedAt) : null;
    final observations = ref.watch(observationsProvider(r.projectId));

    List<LatLng> points = [];
    if (r.trackPointsJson != null) {
      try {
        points = (jsonDecode(r.trackPointsJson!) as List)
            .map((p) => LatLng((p['lat'] as num).toDouble(), (p['lon'] as num).toDouble()))
            .toList();
      } catch (_) {}
    }

    return Scaffold(
      appBar: AppBar(title: Text(r.name)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _stat(Icons.straighten, '${(r.distanceMeters / 1000).toStringAsFixed(2)} km', 'Distancia'),
                if (dur != null)
                  _stat(Icons.timer_outlined, '${dur.inMinutes} min', 'Duración'),
                _stat(Icons.place, '${points.length} pts', 'Puntos GPS'),
                _stat(Icons.calendar_today,
                    '${r.startedAt.day}/${r.startedAt.month}/${r.startedAt.year}', 'Fecha'),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: points.isEmpty
                ? const Center(child: Text('Sin datos GPS'))
                : observations.when(
                    loading: () => _buildMap(context, points, []),
                    error: (_, __) => _buildMap(context, points, []),
                    data: (obsList) {
                      final routeObs = obsList.where((o) => o.routeId == r.id).toList();
                      return _buildMap(context, points, routeObs);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildMap(BuildContext context, List<LatLng> points, List<ObservationModel> obsList) {
    final obsMarkers = obsList.map((o) => Marker(
      point: LatLng(o.latitude, o.longitude),
      width: 36, height: 36,
      child: GestureDetector(
        onTap: () => showModalBottomSheet(
          context: context,
          builder: (_) => Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(o.title ?? o.taxonName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                if (o.title != null) Text(o.taxonName, style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey)),
                if (o.description != null) ...[const SizedBox(height: 8), Text(o.description!)],
                const SizedBox(height: 8),
                Text('${o.observedAt.day}/${o.observedAt.month}/${o.observedAt.year}  x${o.quantity}',
                    style: const TextStyle(color: Colors.grey, fontSize: 13)),
              ],
            ),
          ),
        ),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.orange.shade700, shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
          ),
          child: const Icon(Icons.eco, color: Colors.white, size: 18),
        ),
      ),
    )).toList();

    return FlutterMap(
      options: MapOptions(initialCenter: points[points.length ~/ 2], initialZoom: 14),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.biofield.frontend',
        ),
        PolylineLayer(polylines: [Polyline(points: points, color: Colors.green, strokeWidth: 4)]),
        MarkerLayer(markers: [
          Marker(point: points.first, child: const Icon(Icons.play_circle, color: Colors.green, size: 24)),
          Marker(point: points.last,  child: const Icon(Icons.stop_circle,  color: Colors.red,   size: 24)),
          ...obsMarkers,
        ]),
      ],
    );
  }

  Widget _stat(IconData icon, String value, String label) => Column(
    children: [
      Icon(icon, color: const Color(0xFF2E7D32)),
      const SizedBox(height: 4),
      Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
      Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
    ],
  );
}
