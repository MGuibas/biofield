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
  final String? activeRouteId; // set after route is saved to backend

  const RecordingState({
    this.active = false,
    this.paused = false,
    this.points = const [],
    this.distanceMeters = 0,
    this.startedAt,
    this.projectId,
    this.routeName = '',
    this.activeRouteId,
  });

  RecordingState copyWith({
    bool? active, bool? paused, List<LatLng>? points,
    double? distanceMeters, DateTime? startedAt,
    String? projectId, String? routeName, String? activeRouteId,
  }) => RecordingState(
    active: active ?? this.active,
    paused: paused ?? this.paused,
    points: points ?? this.points,
    distanceMeters: distanceMeters ?? this.distanceMeters,
    startedAt: startedAt ?? this.startedAt,
    projectId: projectId ?? this.projectId,
    routeName: routeName ?? this.routeName,
    activeRouteId: activeRouteId ?? this.activeRouteId,
  );

  String get elapsed {
    if (startedAt == null) return '00:00';
    final d = DateTime.now().difference(startedAt!);
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
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
  StreamSubscription<Position>? _gpsSub;
  Timer? _clockTimer;

  RecordingNotifier() : super(const RecordingState());

  void start(String projectId, String routeName) {
    if (state.active) return;
    state = RecordingState(
      active: true,
      paused: false,
      points: const [],
      distanceMeters: 0,
      startedAt: DateTime.now(),
      projectId: projectId,
      routeName: routeName,
    );
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      // force rebuild for elapsed time
      state = state.copyWith(routeName: state.routeName);
      _showNotif(state.elapsed, state.distanceMeters / 1000);
    });
    
    // Obtener el punto inicial de inmediato
    Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high).then((pos) {
      if (state.active && !state.paused) {
        state = state.copyWith(points: [...state.points, LatLng(pos.latitude, pos.longitude)]);
      }
    }).catchError((_) {});

    _gpsSub = Geolocator.getPositionStream(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20,          // mínimo 20m entre puntos
        intervalDuration: const Duration(seconds: 30), // ~2 puntos/min
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'BioField GPS activo',
          notificationText: 'Grabando ruta en segundo plano',
          enableWakeLock: true,
        ),
      ),
    ).listen((pos) {
      if (state.paused) return;
      final point = LatLng(pos.latitude, pos.longitude);
      double extra = 0;
      if (state.points.isNotEmpty) {
        final last = state.points.last;
        extra = Geolocator.distanceBetween(
            last.latitude, last.longitude, pos.latitude, pos.longitude);
      }
      state = state.copyWith(
        points: [...state.points, point],
        distanceMeters: state.distanceMeters + extra,
      );
    });
    _showNotif('00:00', 0);
  }

  void togglePause() => state = state.copyWith(paused: !state.paused);

  void setName(String name) => state = state.copyWith(routeName: name);

  void setActiveRouteId(String id) => state = state.copyWith(activeRouteId: id);

  Future<void> stop() async {
    _clockTimer?.cancel();
    await _gpsSub?.cancel();
    _cancelNotif();
    state = const RecordingState();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _gpsSub?.cancel();
    super.dispose();
  }
}

final recordingProvider =
    StateNotifierProvider<RecordingNotifier, RecordingState>(
  (_) => RecordingNotifier(),
);
