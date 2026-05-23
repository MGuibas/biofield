import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'local_db.g.dart';

// ── TABLAS ────────────────────────────────────────────────────────────────────

class LocalObservations extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text()();
  TextColumn get taxonName => text()();
  IntColumn get taxonId => integer().nullable()();
  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  RealColumn get altitude => real().nullable()();
  DateTimeColumn get observedAt => dateTime()();
  TextColumn get notes => text().nullable()();
  IntColumn get quantity => integer().withDefault(const Constant(1))();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  DateTimeColumn get createdAt => dateTime()();
  // Campos extra para caché del servidor
  TextColumn get title => text().nullable()();
  TextColumn get description => text().nullable()();
  TextColumn get photosJson => text().nullable()();
  TextColumn get tagsJson => text().nullable()();
  TextColumn get weatherCondition => text().nullable()();
  RealColumn get temperature => real().nullable()();
  RealColumn get humidity => real().nullable()();
  TextColumn get habitatDescription => text().nullable()();
  TextColumn get habitatPhotoUrl => text().nullable()();
  TextColumn get routeId => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

class LocalRoutes extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text()();
  TextColumn get name => text()();
  DateTimeColumn get startedAt => dateTime()();
  DateTimeColumn get endedAt => dateTime().nullable()();
  RealColumn get distanceMeters => real().withDefault(const Constant(0.0))();
  TextColumn get trackPointsJson => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

class LocalNotes extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text()();
  TextColumn get title => text()();
  TextColumn get body => text()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

class LocalProjects extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get description => text().nullable()();
  TextColumn get shareCode => text()();
  BoolColumn get isArchived => boolean().withDefault(const Constant(false))();
  IntColumn get memberCount => integer().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};
}

class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entityType => text()();
  TextColumn get entityId => text()();
  TextColumn get operation => text()();
  TextColumn get payload => text()();
  DateTimeColumn get createdAt => dateTime()();
  TextColumn get status => text().withDefault(const Constant('pending'))();
}

// ── DATABASE ──────────────────────────────────────────────────────────────────

@DriftDatabase(tables: [LocalObservations, LocalRoutes, LocalNotes, LocalProjects, SyncQueue])
class LocalDb extends _$LocalDb {
  LocalDb() : super(_openConnection());

  @override
  int get schemaVersion => 4;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.addColumn(localObservations, localObservations.title);
        await m.addColumn(localObservations, localObservations.description);
        await m.addColumn(localObservations, localObservations.photosJson);
        await m.addColumn(localObservations, localObservations.tagsJson);
        await m.addColumn(localObservations, localObservations.weatherCondition);
        await m.addColumn(localObservations, localObservations.temperature);
        await m.addColumn(localObservations, localObservations.humidity);
        await m.addColumn(localObservations, localObservations.habitatDescription);
        await m.addColumn(localObservations, localObservations.habitatPhotoUrl);
      }
      if (from < 3) {
        await m.createTable(localProjects);
      }
      if (from < 4) {
        await m.addColumn(localObservations, localObservations.routeId);
      }
    },
  );

  // Observations
  Future<List<LocalObservation>> getObservations(String projectId) =>
      (select(localObservations)..where((o) => o.projectId.equals(projectId))).get();

  Future<void> upsertObservation(LocalObservationsCompanion o) =>
      into(localObservations).insertOnConflictUpdate(o);

  // Routes
  Future<List<LocalRoute>> getRoutes(String projectId) =>
      (select(localRoutes)..where((r) => r.projectId.equals(projectId))).get();

  Future<void> upsertRoute(LocalRoutesCompanion r) =>
      into(localRoutes).insertOnConflictUpdate(r);

  // Projects
  Future<List<LocalProject>> getLocalProjects() => select(localProjects).get();

  Future<void> upsertProject(LocalProjectsCompanion p) =>
      into(localProjects).insertOnConflictUpdate(p);

  // Notes
  Future<List<LocalNote>> getNotes(String projectId) =>
      (select(localNotes)..where((n) => n.projectId.equals(projectId))).get();

  Future<void> upsertNote(LocalNotesCompanion n) =>
      into(localNotes).insertOnConflictUpdate(n);

  // Sync queue
  Future<List<SyncQueueData>> getPendingItems() =>
      (select(syncQueue)..where((s) => s.status.equals('pending'))
        ..orderBy([(s) => OrderingTerm.asc(s.createdAt)])).get();

  Future<void> enqueue(SyncQueueCompanion item) =>
      into(syncQueue).insert(item);

  Future<void> markDone(int id) =>
      (update(syncQueue)..where((s) => s.id.equals(id)))
          .write(const SyncQueueCompanion(status: Value('done')));

  Future<void> markFailed(int id) =>
      (update(syncQueue)..where((s) => s.id.equals(id)))
          .write(const SyncQueueCompanion(status: Value('failed')));
}

LazyDatabase _openConnection() => LazyDatabase(() async {
      final dir = await getApplicationDocumentsDirectory();
      final file = File(p.join(dir.path, 'biofield.db'));
      return NativeDatabase.createInBackground(file);
    });
