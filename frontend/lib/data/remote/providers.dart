import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../domain/models/models.dart';
import '../local/local_db.dart';
import '../sync/sync_service.dart';
import 'api_client.dart';

final _storage = FlutterSecureStorage();

// ── THEME ─────────────────────────────────────────────────────────────────────

final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

// ── AUTH ──────────────────────────────────────────────────────────────────────

final authProvider = StateNotifierProvider<AuthNotifier, UserModel?>(
  (ref) => AuthNotifier(ref),
);

final initializedProvider = StateProvider<bool>((ref) => false);

class AuthNotifier extends StateNotifier<UserModel?> {
  final Ref _ref;
  final Dio _dio;
  bool _firstRun = false;
  bool get isFirstRun => _firstRun;

  AuthNotifier(this._ref) : _dio = _ref.watch(dioProvider), super(null) {
    _restore();
  }

  bool get initialized => _ref.read(initializedProvider);

  Future<void> _restore() async {
    try {
      final isFirst = await _storage.read(key: 'first_run_completed') != 'true';
      _firstRun = isFirst;

      final token = await _storage.read(key: 'access_token');
      final userId = await _storage.read(key: 'user_id');
      final displayName = await _storage.read(key: 'display_name');
      final refreshToken = await _storage.read(key: 'refresh_token');
      final isGuest = await _storage.read(key: 'is_guest') == 'true';

      if (isGuest) {
        state = UserModel(userId: 'guest', displayName: 'Invitado', isGuest: true);
        return;
      }

      if (token != null && userId != null) {
        // 1. CARGA INICIAL (Optimista)
        state = UserModel(
          accessToken: token,
          refreshToken: refreshToken ?? '',
          userId: userId,
          displayName: displayName ?? 'Usuario',
          email: await _storage.read(key: 'email'),
          avatarUrl: await _storage.read(key: 'avatar_url'),
        );

        // 2. REFRESH EN SEGUNDO PLANO (con timeout estricto)
        if (refreshToken != null && refreshToken.isNotEmpty) {
          try {
            // Usamos una instancia limpia de Dio para evitar interceptores que puedan reintentar infinitamente
            final res = await Dio().post(
              '${_dio.options.baseUrl}/auth/refresh',
              data: {'refreshToken': refreshToken},
            ).timeout(const Duration(seconds: 3));

            final newToken = res.data['accessToken'] as String;
            final newRefresh = res.data['refreshToken'] as String;

            await _storage.write(key: 'access_token', value: newToken);
            await _storage.write(key: 'refresh_token', value: newRefresh);

            state = state?.copyWith(
              accessToken: newToken,
              refreshToken: newRefresh,
            );
          } catch (e) {
            debugPrint('Auth refresh skipped/failed: $e');
            // Si es un error de "Unauthorized" (401), limpiar sesión
            if (e is DioException && e.response?.statusCode == 401) {
              await _storage.deleteAll();
              state = null;
            }
          }
        }

        // 3. SINCRONIZACIÓN DE PERFIL EN SEGUNDO PLANO
        if (state != null) {
          try {
            final profileRes = await _dio.get('/auth/profile').timeout(const Duration(seconds: 5));
            final profileUser = UserModel(
              accessToken: state!.accessToken,
              refreshToken: state!.refreshToken,
              userId: profileRes.data['userId'] as String,
              displayName: profileRes.data['displayName'] as String,
              email: profileRes.data['email'] as String?,
              avatarUrl: profileRes.data['avatarUrl'] as String?,
              speciality: profileRes.data['speciality'] as String?,
              institution: profileRes.data['institution'] as String?,
            );
            await _save(profileUser);
            state = profileUser;
          } catch (e) {
            debugPrint('Profile sync failed: $e');
          }
        }
      }
    } catch (e) {
      debugPrint('Critical error in _restore: $e');
    } finally {
      _ref.read(initializedProvider.notifier).state = true;
    }
  }

  Future<void> completeFirstRun() async {
    await _storage.write(key: 'first_run_completed', value: 'true');
    _firstRun = false;
    _ref.read(initializedProvider.notifier).state = false;
    await _restore();
  }

  Future<void> loginGuest() async {
    await _storage.write(key: 'is_guest', value: 'true');
    state = UserModel(userId: 'guest', displayName: 'Invitado', isGuest: true);
  }

  Future<void> loginWithGoogle() async {
    final googleSignIn = GoogleSignIn(
      serverClientId:
          '263021632716-use8dditvp14lu0eiboqpia0bn011uap.apps.googleusercontent.com',
    );
    final account = await googleSignIn.signIn();
    if (account == null) throw Exception('Google SignIn cancaled');

    final auth = await account.authentication;
    if (auth.idToken == null) throw Exception('No Google ID Token found');

    final res =
        await _dio.post('/auth/google', data: {'idToken': auth.idToken});
    final user = UserModel.fromJson(res.data);
    await _save(user);
    await _storage.delete(key: 'is_guest');
    state = user;
  }

  Future<void> logout() async {
    try {
      await _dio.delete('/auth/logout');
    } catch (_) {}
    await _storage.deleteAll();
    state = null;
  }

  void forceLogout() {
    state = null; // sin llamar al servidor, solo limpiar estado
  }

  Future<void> _save(UserModel user) async {
    await _storage.write(key: 'access_token', value: user.accessToken);
    await _storage.write(key: 'refresh_token', value: user.refreshToken);
    await _storage.write(key: 'user_id', value: user.userId);
    await _storage.write(key: 'display_name', value: user.displayName);
    if (user.email != null)
      await _storage.write(key: 'email', value: user.email!);
    if (user.avatarUrl != null)
      await _storage.write(key: 'avatar_url', value: user.avatarUrl!);
    if (user.speciality != null)
      await _storage.write(key: 'speciality', value: user.speciality!);
    if (user.institution != null)
      await _storage.write(key: 'institution', value: user.institution!);
  }

  Future<void> updateProfile(
      String displayName, String? speciality, String? institution) async {
    await _dio.put('/auth/profile', data: {
      'displayName': displayName,
      'speciality': speciality,
      'institution': institution,
    });
    final updated = state!.copyWith(
        displayName: displayName,
        speciality: speciality,
        institution: institution);
    await _save(updated);
    state = updated;
  }

  Future<void> uploadAvatar(
      String base64Image, String extension, ProviderContainer container) async {
    final res = await _dio.post('/auth/avatar',
        data: {'base64Image': base64Image, 'extension': extension});
    final url = res.data['avatarUrl'] as String;
    final updated = state!.copyWith(avatarUrl: url);
    await _storage.write(key: 'avatar_url', value: url);
    state = updated;
    // Invalidar providers que muestran avatares de otros usuarios
    container.invalidate(projectDetailProvider);
    container.invalidate(commentsProvider);
    container.invalidate(activityProvider);
  }
}

final guestObsCountProvider = FutureProvider<int>((ref) async {
  final db = ref.watch(localDbProvider);
  final obs = await db.getObservations('OFFLINE_GUEST');
  return obs.length;
});

// ── PROJECTS ──────────────────────────────────────────────────────────────────

final projectsProvider = FutureProvider<List<ProjectModel>>((ref) async {
  final user = ref.watch(authProvider);
  final db = ref.watch(localDbProvider);

  final guestProject = ProjectModel(
    id: 'OFFLINE_GUEST',
    name: 'Espacio Local',
    description: 'Entrada rápida sin proyecto',
    shareCode: 'OFFLINE',
    isArchived: false,
    memberCount: 1,
  );

  if (user?.isGuest == true) {
    return [guestProject];
  }

  List<ProjectModel> realItems = [];
  try {
    final dio = ref.watch(dioProvider);
    final res = await dio.get('/projects');
    realItems =
        (res.data as List).map((j) => ProjectModel.fromJson(j)).toList();

    // Cachear proyectos en local
    for (final p in realItems) {
      await db.upsertProject(LocalProjectsCompanion(
        id: Value(p.id),
        name: Value(p.name),
        description: Value(p.description),
        shareCode: Value(p.shareCode),
        isArchived: Value(p.isArchived),
        memberCount: Value(p.memberCount),
      ));
    }
  } catch (e) {
    // Fallback a local si falla red
    final local = await db.getLocalProjects();
    realItems = local
        .map((p) => ProjectModel(
              id: p.id,
              name: p.name,
              description: p.description,
              shareCode: p.shareCode,
              isArchived: p.isArchived,
              memberCount: p.memberCount,
            ))
        .toList();
  }

  // Devolver el proyecto local primero, seguido de los reales
  return [guestProject, ...realItems];
});

// ── OBSERVATIONS ──────────────────────────────────────────────────────────────

class ObsPage {
  final List<ObservationModel> items;
  final int total;
  final int page;
  final int pageSize;
  bool get hasMore => page * pageSize < total;
  ObsPage(
      {required this.items,
      required this.total,
      required this.page,
      required this.pageSize});
}

final observationsPageProvider =
    FutureProvider.family<ObsPage, ({String projectId, int page})>(
        (ref, args) async {
  final dio = ref.watch(dioProvider);
  final db = ref.watch(localDbProvider);

  if (args.projectId == 'OFFLINE_GUEST') {
    final local = await db.getObservations(args.projectId);
    // Para simplificar el modo local devolvemos todo en la pág 1
    return ObsPage(
        items: local
            .map<ObservationModel>((o) => ObservationModel(
                  id: o.id,
                  projectId: o.projectId,
                  taxonName: o.taxonName,
                  taxonId: o.taxonId,
                  title: o.title,
                  description: o.description,
                  latitude: o.latitude,
                  longitude: o.longitude,
                  altitude: o.altitude,
                  observedAt: o.observedAt,
                  notes: o.notes,
                  quantity: o.quantity,
                  photos: _parseList(o.photosJson),
                  tags: _parseList(o.tagsJson),
                  weatherCondition: o.weatherCondition,
                  temperature: o.temperature,
                  humidity: o.humidity,
                  habitatDescription: o.habitatDescription,
                  habitatPhotoUrl: o.habitatPhotoUrl,
                  syncStatus: o.syncStatus,
                ))
            .toList(),
        total: local.length,
        page: 1,
        pageSize: 1000);
  }

  try {
    final res = await dio.get('/projects/${args.projectId}/observations',
        queryParameters: {'page': args.page, 'pageSize': 20});
    final j = res.data as Map<String, dynamic>;
    final items =
        (j['items'] as List).map((e) => ObservationModel.fromJson(e)).toList();
    // Cachear en SQLite (solo página 1 para no duplicar)
    if (args.page == 1) {
      for (final o in items) {
        await db.upsertObservation(LocalObservationsCompanion(
          id: Value(o.id),
          projectId: Value(o.projectId),
          taxonName: Value(o.taxonName),
          taxonId: Value(o.taxonId),
          latitude: Value(o.latitude),
          longitude: Value(o.longitude),
          altitude: Value(o.altitude),
          observedAt: Value(o.observedAt),
          notes: Value(o.notes),
          quantity: Value(o.quantity),
          syncStatus: const Value('synced'),
          createdAt: Value(o.observedAt),
          title: Value(o.title),
          description: Value(o.description),
          photosJson: Value(o.photosJson),
          tagsJson: Value(o.tagsJson),
          weatherCondition: Value(o.weatherCondition),
          temperature: Value(o.temperature),
          humidity: Value(o.humidity),
          habitatDescription: Value(o.habitatDescription),
          habitatPhotoUrl: Value(o.habitatPhotoUrl),
        ));
      }
    }
    return ObsPage(
        items: items,
        total: j['total'],
        page: j['page'],
        pageSize: j['pageSize']);
  } catch (_) {
    // Sin conexión — devolver datos locales
    final local = await db.getObservations(args.projectId);
    final items = local
        .map<ObservationModel>((o) => ObservationModel(
              id: o.id,
              projectId: o.projectId,
              taxonName: o.taxonName,
              taxonId: o.taxonId,
              title: o.title,
              description: o.description,
              latitude: o.latitude,
              longitude: o.longitude,
              altitude: o.altitude,
              observedAt: o.observedAt,
              notes: o.notes,
              quantity: o.quantity,
              photos: _parseList(o.photosJson),
              tags: _parseList(o.tagsJson),
              weatherCondition: o.weatherCondition,
              temperature: o.temperature,
              humidity: o.humidity,
              habitatDescription: o.habitatDescription,
              habitatPhotoUrl: o.habitatPhotoUrl,
              syncStatus: o.syncStatus,
              photosJson: o.photosJson,
              tagsJson: o.tagsJson,
            ))
        .toList();
    return ObsPage(
        items: items, total: items.length, page: 1, pageSize: items.length);
  }
});

List<String> _parseList(String? json) {
  if (json == null || json.isEmpty) return [];
  try {
    return (jsonDecode(json) as List).map((e) => e.toString()).toList();
  } catch (_) {
    return [];
  }
}

// Mantener provider simple para mapa y detalle de ruta (carga hasta 200)
final observationsProvider =
    FutureProvider.family<List<ObservationModel>, String>(
        (ref, projectId) async {
  final db = ref.watch(localDbProvider);
  if (projectId == 'OFFLINE_GUEST') {
    final local = await db.getObservations(projectId);
    return local
        .map<ObservationModel>((o) => ObservationModel(
              id: o.id,
              projectId: o.projectId,
              taxonName: o.taxonName,
              taxonId: o.taxonId,
              title: o.title,
              description: o.description,
              latitude: o.latitude,
              longitude: o.longitude,
              altitude: o.altitude,
              observedAt: o.observedAt,
              notes: o.notes,
              quantity: o.quantity,
              photos: _parseList(o.photosJson),
              tags: _parseList(o.tagsJson),
              weatherCondition: o.weatherCondition,
              temperature: o.temperature,
              humidity: o.humidity,
              habitatDescription: o.habitatDescription,
              habitatPhotoUrl: o.habitatPhotoUrl,
              syncStatus: o.syncStatus,
            ))
        .toList();
  }
  final dio = ref.watch(dioProvider);
  final res = await dio.get('/projects/$projectId/observations',
      queryParameters: {'page': 1, 'pageSize': 200});
  final j = res.data as Map<String, dynamic>;
  return (j['items'] as List).map((e) => ObservationModel.fromJson(e)).toList();
});

final observationDetailProvider =
    FutureProvider.family<ObservationModel, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get('/observations/$id');
  return ObservationModel.fromJson(res.data);
});

// ── COMMENTS ──────────────────────────────────────────────────────────────────

final commentsProvider = FutureProvider.family<List<CommentModel>, String>(
    (ref, observationId) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get('/observations/$observationId/comments');
  return (res.data as List).map((j) => CommentModel.fromJson(j)).toList();
});

// ── ACTIVITY ──────────────────────────────────────────────────────────────────

final activityProvider = FutureProvider.family<List<ActivityItemModel>, String>(
    (ref, projectId) async {
  if (projectId == 'OFFLINE_GUEST') return [];
  final dio = ref.watch(dioProvider);
  final res = await dio.get('/projects/$projectId/observations/activity');
  return (res.data as List).map((j) => ActivityItemModel.fromJson(j)).toList();
});

// ── ROUTES ────────────────────────────────────────────────────────────────────

// ── ROUTES ────────────────────────────────────────────────────────────────────

final routesProvider =
    FutureProvider.family<List<RouteModel>, String>((ref, projectId) async {
  final db = ref.watch(localDbProvider);
  if (projectId == 'OFFLINE_GUEST') {
    final local = await db.getRoutes(projectId);
    return local
        .map((r) => RouteModel(
              id: r.id,
              projectId: r.projectId,
              name: r.name,
              startedAt: r.startedAt,
              endedAt: r.endedAt,
              distanceMeters: r.distanceMeters,
              trackPointsJson: r.trackPointsJson,
            ))
        .toList();
  }
  try {
    final dio = ref.watch(dioProvider);
    final res = await dio.get('/projects/$projectId/routes');
    final items =
        (res.data as List).map((j) => RouteModel.fromJson(j)).toList();

    for (final r in items) {
      await db.upsertRoute(LocalRoutesCompanion(
        id: Value(r.id),
        projectId: Value(r.projectId),
        name: Value(r.name),
        startedAt: Value(r.startedAt),
        endedAt: Value(r.endedAt),
        distanceMeters: Value(r.distanceMeters),
        trackPointsJson: Value(r.trackPointsJson),
        syncStatus: const Value('synced'),
      ));
    }
    return items;
  } catch (e) {
    final local = await db.getRoutes(projectId);
    if (local.isEmpty) throw e;
    return local
        .map((r) => RouteModel(
              id: r.id,
              projectId: r.projectId,
              name: r.name,
              startedAt: r.startedAt,
              endedAt: r.endedAt,
              distanceMeters: r.distanceMeters,
              trackPointsJson: r.trackPointsJson,
            ))
        .toList();
  }
});

// ── NOTES ─────────────────────────────────────────────────────────────────────

final notesProvider =
    FutureProvider.family<List<NoteModel>, String>((ref, projectId) async {
  final db = ref.watch(localDbProvider);
  if (projectId == 'OFFLINE_GUEST') {
    final local = await db.getNotes(projectId);
    return local
        .map((n) => NoteModel(
              id: n.id,
              projectId: n.projectId,
              title: n.title,
              body: n.body,
              latitude: n.latitude,
              longitude: n.longitude,
              createdAt: n.createdAt,
            ))
        .toList();
  }
  try {
    final dio = ref.watch(dioProvider);
    final res = await dio.get('/projects/$projectId/notes');
    final items = (res.data as List).map((j) => NoteModel.fromJson(j)).toList();

    for (final n in items) {
      await db.upsertNote(LocalNotesCompanion(
        id: Value(n.id),
        projectId: Value(n.projectId),
        title: Value(n.title),
        body: Value(n.body),
        latitude: Value(n.latitude),
        longitude: Value(n.longitude),
        createdAt: Value(n.createdAt),
        syncStatus: const Value('synced'),
      ));
    }
    return items;
  } catch (e) {
    final local = await db.getNotes(projectId);
    if (local.isEmpty) throw e;
    return local
        .map((n) => NoteModel(
              id: n.id,
              projectId: n.projectId,
              title: n.title,
              body: n.body,
              latitude: n.latitude,
              longitude: n.longitude,
              createdAt: n.createdAt,
            ))
        .toList();
  }
});

// ── MEMBERS ──────────────────────────────────────────────────────────────────

class ProjectDetail {
  final String shareCode;
  final String ownerId;
  final String projectName;
  final List<MemberModel> members;
  ProjectDetail(
      {required this.shareCode,
      required this.ownerId,
      required this.projectName,
      required this.members});
}

final projectDetailProvider =
    FutureProvider.family<ProjectDetail, String>((ref, projectId) async {
  if (projectId == 'OFFLINE_GUEST') {
    return ProjectDetail(
        shareCode: 'OFFLINE',
        ownerId: 'guest',
        projectName: 'Espacio Local',
        members: []);
  }
  final db = ref.watch(localDbProvider);
  try {
    final dio = ref.watch(dioProvider);
    final res = await dio.get('/projects/$projectId');
    final j = res.data as Map<String, dynamic>;
    final detail = ProjectDetail(
      shareCode: j['shareCode'],
      ownerId: j['ownerId'].toString(),
      projectName: j['name'],
      members:
          (j['members'] as List).map((m) => MemberModel.fromJson(m)).toList(),
    );
    // Podríamos cachear esto también si fuera necesario, pero por ahora devolvemos
    return detail;
  } catch (e) {
    // Si falla, intentamos devolver al menos el nombre del proyecto si lo tenemos en LocalProjects
    final local = await db.getLocalProjects();
    final p = local.where((x) => x.id == projectId).firstOrNull;
    if (p != null) {
      return ProjectDetail(
          shareCode: p.shareCode,
          ownerId: '',
          projectName: p.name,
          members: []);
    }
    throw e;
  }
});

// ── INATURALIST ───────────────────────────────────────────────────────────────

final taxonSearchProvider =
    FutureProvider.family<List<TaxonModel>, String>((ref, query) async {
  if (query.length < 2) return [];
  final dio = ref.watch(dioProvider);
  final res = await dio.get('/inaturalist/taxa', queryParameters: {'q': query});
  return (res.data as List).map((j) => TaxonModel.fromJson(j)).toList();
});
