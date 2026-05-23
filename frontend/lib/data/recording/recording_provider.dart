import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
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
  final int elapsedSeconds;

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
    this.elapsedSeconds = 0,
  });

  RecordingState copyWith({
    bool? active, bool? paused, List<LatLng>? points,
    double? distanceMeters, DateTime? startedAt,
    String? projectId, String? routeName, String? activeRouteId,
    double? heading, double? speed, double? accuracy, double? altitude,
    int? elapsedSeconds,
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
    elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
  );

  String get elapsed {
    final h = elapsedSeconds ~/ 3600;
    final m = ((elapsedSeconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final s = (elapsedSeconds % 60).toString().padLeft(2, '0');
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
  StreamSubscription<Position>? _gpsSubscription;
  Timer? _clockTimer;
  int _secondsSinceLastPoint = 0;

  RecordingNotifier() : super(const RecordingState());

  Future<bool> _requestBackgroundPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }

    if (permission == LocationPermission.deniedForever) return false;

    if (permission == LocationPermission.whileInUse) {
      permission = await Geolocator.requestPermission();
      if (permission != LocationPermission.always) return false;
    }

    return permission == LocationPermission.always;
  }

  Future<void> start(String projectId, String routeName) async {
    if (state.active) return;

    final hasBackgroundPermission = await _requestBackgroundPermission();
    if (!hasBackgroundPermission) return;

    final routeId = const Uuid().v4();

    state = RecordingState(
      active: true,
      paused: false,
      points: const [],
      distanceMeters: 0,
      startedAt: DateTime.now(),
      projectId: projectId,
      routeName: routeName,
      activeRouteId: routeId,
    );

    _secondsSinceLastPoint = 0;

    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!state.active || state.paused) return;

      state = state.copyWith(elapsedSeconds: state.elapsedSeconds + 1);
      _secondsSinceLastPoint++;

      if (_secondsSinceLastPoint >= 30) {
        _secondsSinceLastPoint = 0;
        _fetchAndAddPoint(force: true);
      }

      _showNotif(state.elapsed, state.distanceMeters / 1000);
    });

    await _fetchAndAddPoint();

    final locationSettings = AndroidSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 5,
      intervalDuration: const Duration(seconds: 3),
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationTitle: 'BioField — Grabando ruta',
        notificationText: 'La app está grabando tu ruta en segundo plano',
        notificationIcon: AndroidResource(name: '@mipmap/ic_launcher'),
        enableWakeLock: true,
      ),
    );

    _gpsSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      _onPosition,
      onError: (e) => print('[GPS Stream] Error: $e'),
    );

    _showNotif('00:00', 0);
  }

  void _onPosition(Position pos) {
    _addPoint(pos, force: false);
  }

  void _addPoint(Position pos, {required bool force}) {
    if (!state.active || state.paused) return;

    double? newHeading = pos.heading >= 0 ? pos.heading : null;
    double? newSpeed = pos.speed >= 0 ? pos.speed : null;

    if ((newSpeed == null || newSpeed < 0.1) && state.points.isNotEmpty) {
      final last = state.points.last;
      final dist = Geolocator.distanceBetween(
          last.latitude, last.longitude, pos.latitude, pos.longitude);
      newSpeed = dist / 3.0;
    }

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

    if (!force && pos.accuracy > 40) return;

    final point = LatLng(pos.latitude, pos.longitude);
    double extra = 0;
    if (state.points.isNotEmpty) {
      final last = state.points.last;
      extra = Geolocator.distanceBetween(
          last.latitude, last.longitude, pos.latitude, pos.longitude);
      if (!force && extra < 2) return;
    }

    state = state.copyWith(
      points: [...state.points, point],
      distanceMeters: state.distanceMeters + extra,
    );
    _secondsSinceLastPoint = 0;
  }

  Future<void> _fetchAndAddPoint({bool force = false}) async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.best,
          timeLimit: Duration(seconds: 5),
        ),
      );

      _addPoint(pos, force: force);
    } catch (e) {
      print('[GPS] Error: $e');
    }
  }

  void togglePause() {
    state = state.copyWith(paused: !state.paused);
    if (!state.paused) {
      _showNotif(state.elapsed, state.distanceMeters / 1000);
    }
  }

  void setName(String name) => state = state.copyWith(routeName: name);

  void setActiveRouteId(String id) => state = state.copyWith(activeRouteId: id);

  Future<void> stop() async {
    _clockTimer?.cancel();
    _gpsSubscription?.cancel();
    _cancelNotif();
    state = const RecordingState();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _gpsSubscription?.cancel();
    super.dispose();
  }
}

final recordingProvider =
    StateNotifierProvider<RecordingNotifier, RecordingState>(
  (_) => RecordingNotifier(),
);