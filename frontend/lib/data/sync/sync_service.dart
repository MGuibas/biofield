import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../local/local_db.dart';
import '../remote/api_client.dart';
import '../../core/notifications.dart';

final localDbProvider = Provider<LocalDb>((ref) => LocalDb());

final syncServiceProvider = Provider<SyncService>(
  (ref) => SyncService(ref.watch(localDbProvider), ref.watch(dioProvider)),
);

class SyncService {
  final LocalDb _db;
  final Dio _dio;
  Timer? _timer;

  SyncService(this._db, this._dio) {
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => sync());
  }

  Future<void> sync() async {
    await _push();
    await _pull();
  }

  Future<void> _push() async {
    final pending = await _db.getPendingItems();
    if (pending.isEmpty) return;
    final items = pending.map((e) => {
      'entityType': e.entityType,
      'entityId': e.entityId,
      'operation': e.operation,
      'payload': e.payload,
      'createdAt': e.createdAt.toIso8601String(),
    }).toList();
    try {
      await _dio.post('/sync/push', data: {'items': items});
      for (final item in pending) {
        await _db.markDone(item.id);
      }
    } catch (_) {}
  }

  Future<void> _pull() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastPullMs = prefs.getInt('last_pull_ms') ?? 0;
      final since = DateTime.fromMillisecondsSinceEpoch(lastPullMs).toIso8601String();

      final res = await _dio.get('/sync/pull', queryParameters: {'since': since});
      final data = res.data as Map<String, dynamic>;
      final observations = (data['observations'] as List?) ?? [];
      final notes = (data['notes'] as List?) ?? [];
      final routes = (data['routes'] as List?) ?? [];

      // Cachear observaciones del servidor en SQLite
      for (final j in observations) {
        await _db.upsertObservation(LocalObservationsCompanion(
          id: Value(j['id'].toString()),
          projectId: Value(j['projectId'].toString()),
          taxonName: Value(j['taxonName'] ?? ''),
          taxonId: Value(j['taxonId'] as int?),
          latitude: Value((j['latitude'] as num).toDouble()),
          longitude: Value((j['longitude'] as num).toDouble()),
          altitude: Value(j['altitude'] != null ? (j['altitude'] as num).toDouble() : null),
          observedAt: Value(DateTime.parse(j['observedAt'])),
          notes: Value(j['notes'] as String?),
          quantity: Value(j['quantity'] as int? ?? 1),
          syncStatus: const Value('synced'),
          createdAt: Value(DateTime.parse(j['createdAt'] ?? j['observedAt'])),
          title: Value(j['title'] as String?),
          description: Value(j['description'] as String?),
          photosJson: Value(j['photosJson'] as String?),
          tagsJson: Value(j['tagsJson'] as String?),
          weatherCondition: Value(j['weatherCondition'] as String?),
          temperature: Value(j['temperature'] != null ? (j['temperature'] as num).toDouble() : null),
          humidity: Value(j['humidity'] != null ? (j['humidity'] as num).toDouble() : null),
          habitatDescription: Value(j['habitatDescription'] as String?),
          habitatPhotoUrl: Value(j['habitatPhotoUrl'] as String?),
        ));
      }

      final total = observations.length + notes.length + routes.length;
      if (total > 0) {
        await prefs.setInt('last_pull_ms', DateTime.now().millisecondsSinceEpoch);
        final parts = [
          if (observations.isNotEmpty) '${observations.length} observación(es)',
          if (notes.isNotEmpty) '${notes.length} nota(s)',
          if (routes.isNotEmpty) '${routes.length} ruta(s)',
        ];
        await showNotification(title: 'BioField — Nuevos cambios', body: parts.join(', '));
      }
    } catch (_) {}
  }

  // Guarda observación local y encola para sync
  Future<void> saveObservationOffline({
    required String projectId,
    required String taxonName,
    int? taxonId,
    required double latitude,
    required double longitude,
    double? altitude,
    required DateTime observedAt,
    String? notes,
    int quantity = 1,
  }) async {
    final id = const Uuid().v4();
    final now = DateTime.now();

    await _db.upsertObservation(LocalObservationsCompanion(
      id: Value(id),
      projectId: Value(projectId),
      taxonName: Value(taxonName),
      taxonId: Value(taxonId),
      latitude: Value(latitude),
      longitude: Value(longitude),
      altitude: Value(altitude),
      observedAt: Value(observedAt),
      notes: Value(notes),
      quantity: Value(quantity),
      createdAt: Value(now),
    ));

    await _db.enqueue(SyncQueueCompanion(
      entityType: const Value('observation'),
      entityId: Value(id),
      operation: const Value('create'),
      payload: Value(jsonEncode({
        'projectId': projectId,
        'taxonName': taxonName,
        'taxonId': taxonId,
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'observedAt': observedAt.toIso8601String(),
        'notes': notes,
        'quantity': quantity,
      })),
      createdAt: Value(now),
    ));
  }

  // Guarda ruta local y encola para sync
  Future<void> saveRouteOffline({
    required String projectId,
    required String name,
    required DateTime startedAt,
    DateTime? endedAt,
    double distanceMeters = 0,
    String? trackPointsJson,
  }) async {
    final id = const Uuid().v4();

    await _db.upsertRoute(LocalRoutesCompanion(
      id: Value(id),
      projectId: Value(projectId),
      name: Value(name),
      startedAt: Value(startedAt),
      endedAt: Value(endedAt),
      distanceMeters: Value(distanceMeters),
      trackPointsJson: Value(trackPointsJson),
    ));

    await _db.enqueue(SyncQueueCompanion(
      entityType: const Value('route'),
      entityId: Value(id),
      operation: const Value('create'),
      payload: Value(jsonEncode({
        'projectId': projectId,
        'name': name,
        'startedAt': startedAt.toIso8601String(),
        'endedAt': endedAt?.toIso8601String(),
        'distanceMeters': distanceMeters,
        'trackPointsJson': trackPointsJson,
      })),
      createdAt: Value(DateTime.now()),
    ));
  }

  // Guarda nota local y encola para sync
  Future<void> saveNoteOffline({
    required String projectId,
    required String title,
    required String body,
    double? latitude,
    double? longitude,
  }) async {
    final id = const Uuid().v4();
    final now = DateTime.now();

    await _db.upsertNote(LocalNotesCompanion(
      id: Value(id),
      projectId: Value(projectId),
      title: Value(title),
      body: Value(body),
      latitude: Value(latitude),
      longitude: Value(longitude),
      createdAt: Value(now),
    ));

    await _db.enqueue(SyncQueueCompanion(
      entityType: const Value('note'),
      entityId: Value(id),
      operation: const Value('create'),
      payload: Value(jsonEncode({
        'projectId': projectId,
        'title': title,
        'body': body,
        'latitude': latitude,
        'longitude': longitude,
      })),
      createdAt: Value(now),
    ));
  }

  void dispose() => _timer?.cancel();
}
