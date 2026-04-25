import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../core/notifications.dart';

class RecordingState {
  final bool active;
  final bool paused;
  final List<LatLng> points;
  final double distanceMeters;
  final DateTime? startedAt;
  final String? projectId;
  final String routeName;
  final String? activeRouteId;
  final double? heading;
  final double? speed;
  final double? accuracy;
  final double? altitude;

  const RecordingState({
    this.active = false,
    this.paused = false,
    this.points = const [],
    this.distanceMeters = 0,
    this.startedAt,
    this.projectId,
    this.routeName = '',
    this.activeRouteId,
    this.heading,
    this.speed,
    this.accuracy,
    this.altitude,
  });

  RecordingState copyWith({
    bool? active, bool? paused, List<LatLng>? points,
    double? distanceMeters, DateTime? startedAt,
    String? projectId, String? routeName, String? activeRouteId,
    double? heading, double? speed, double? accuracy, double? altitude,
  }) => RecordingState(
    active: active ?? this.active,
    paused: paused ?? this.paused,
    points: points ?? this.points,
    distanceMeters: distanceMeters ?? this.distanceMeters,
    startedAt: startedAt ?? this.startedAt,
    projectId: projectId ?? this.projectId,
    routeName: routeName ?? this.routeName,
    activeRouteId: activeRouteId ?? this.activeRouteId,
    heading: heading ?? this.heading,
    speed: speed ?? this.speed,
    accuracy: accuracy ?? this.accuracy,
    altitude: altitude ?? this.altitude,
  );

  String get elapsed {
    if (startedAt == null) return '00:00';
    final d = DateTime.now().difference(startedAt!);
    final h = d.inHours;
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    if (h > 0) return '$h:$m:$s';
    return '$m:$s';
  }

  String get speedKmh {
    if (speed == null || speed! < 0.3) return '0.0';
    return (speed! * 3.6).toStringAsFixed(1);
  }

  String get headingCardinal {
    if (heading == null || heading! < 0) return '--';
    final h = heading!;
    if (h >= 337.5 || h < 22.5) return 'N';
    if (h < 67.5) return 'NE';
    if (h < 112.5) return 'E';
    if (h < 157.5) return 'SE';
    if (h < 202.5) return 'S';
    if (h < 247.5) return 'SO';
    if (h < 292.5) return 'O';
    return 'NO';
  }
}

const _notifId = 1;

void _showNotif(String elapsed, double km) {
  notifPlugin.show(
    id: _notifId,
    title: 'BioField — Grabando ruta',
    body: '$elapsed · ${km.toStringAsFixed(2)} km',
    notificationDetails: const NotificationDetails(
      android: AndroidNotificationDetails(
        'route_recording', 'Grabación de ruta',
        channelDescription: 'Notificación persistente durante grabación GPS',
        importance: Importance.low,
        priority: Priority.low,
        ongoing: true,
        autoCancel: false,
        icon: '@mipmap/ic_launcher',
      ),
    ),
  );
}

void _cancelNotif() => notifPlugin.cancel(id: _notifId);

class RecordingNotifier extends StateNotifier<RecordingState> {
  Timer? _gpsTimer;
  Timer? _clockTimer;

  RecordingNotifier() : super(const RecordingState());

  Future<void> start(String projectId, String routeName) async {
    if (state.active) return;

    // ── 1. Verificar permisos ──────────────────────────────────────
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }
    if (permission == LocationPermission.deniedForever) return;

    // ── 2. Iniciar estado ──────────────────────────────────────────
    state = RecordingState(
      active: true,
      paused: false,
      points: const [],
      distanceMeters: 0,
      startedAt: DateTime.now(),
      projectId: projectId,
      routeName: routeName,
    );

    // ── 3. Reloj UI (cada segundo) ────────────────────────────────
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      state = state.copyWith(routeName: state.routeName);
      _showNotif(state.elapsed, state.distanceMeters / 1000);
    });

    // ── 4. Primer punto inmediato ─────────────────────────────────
    await _fetchAndAddPoint();

    // ── 5. GPS polling cada 3 segundos (mucho más fiable que stream) ─
    _gpsTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (!state.active || state.paused) return;
      _fetchAndAddPoint();
    });

    _showNotif('00:00', 0);
  }

  Future<void> _fetchAndAddPoint() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
          timeLimit: Duration(seconds: 5),
        ),
      );

      // Siempre actualizar heading/speed/accuracy
      double? newHeading = pos.heading >= 0 ? pos.heading : null;
      double? newSpeed = pos.speed >= 0 ? pos.speed : null;

      // Calcular velocidad manual si el GPS no la da
      if ((newSpeed == null || newSpeed < 0.1) && state.points.isNotEmpty) {
        final last = state.points.last;
        final dist = Geolocator.distanceBetween(
            last.latitude, last.longitude, pos.latitude, pos.longitude);
        newSpeed = dist / 3.0; // distancia / intervalo de 3 seg
      }

      // Calcular heading manual si el GPS no lo da
      if ((newHeading == null || newHeading == 0) && state.points.isNotEmpty) {
        final last = state.points.last;
        final dist = Geolocator.distanceBetween(
            last.latitude, last.longitude, pos.latitude, pos.longitude);
        if (dist > 2) {
          newHeading = Geolocator.bearingBetween(
              last.latitude, last.longitude, pos.latitude, pos.longitude);
          if (newHeading < 0) newHeading += 360;
        }
      }

      state = state.copyWith(
        heading: newHeading ?? state.heading,
        speed: newSpeed ?? state.speed,
        accuracy: pos.accuracy,
        altitude: pos.altitude,
      );

      // Filtrar puntos con mala precisión
      if (pos.accuracy > 40) return;

      final point = LatLng(pos.latitude, pos.longitude);
      double extra = 0;
      if (state.points.isNotEmpty) {
        final last = state.points.last;
        extra = Geolocator.distanceBetween(
            last.latitude, last.longitude, pos.latitude, pos.longitude);
        // Descartar ruido GPS (menos de 2m)
        if (extra < 2) return;
      }

      state = state.copyWith(
        points: [...state.points, point],
        distanceMeters: state.distanceMeters + extra,
      );
    } catch (e) {
      print('[GPS] Error: $e');
    }
  }

  void togglePause() => state = state.copyWith(paused: !state.paused);

  void setName(String name) => state = state.copyWith(routeName: name);

  void setActiveRouteId(String id) => state = state.copyWith(activeRouteId: id);

  Future<void> stop() async {
    _clockTimer?.cancel();
    _gpsTimer?.cancel();
    _cancelNotif();
    state = const RecordingState();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _gpsTimer?.cancel();
    super.dispose();
  }
}

final recordingProvider =
    StateNotifierProvider<RecordingNotifier, RecordingState>(
  (_) => RecordingNotifier(),
);
