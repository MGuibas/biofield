# BioField App — Documentación del Proyecto

## Índice
1. [Visión General](#vision-general)
2. [Stack Tecnológico](#stack)
3. [Arquitectura](#arquitectura)
4. [Módulos Principales](#modulos)
5. [API iNaturalist](#inaturalist)
6. [Modo Offline](#offline)
7. [Autenticación y Usuarios](#auth)
8. [Exportación](#exportacion)
9. [Estructura de Carpetas](#estructura)
10. [Modelos de Datos](#modelos)
11. [Endpoints Backend](#endpoints)
12. [Roadmap](#roadmap)

---

## 1. Visión General <a name="vision-general"></a>

**BioField** es una aplicación móvil y de escritorio para biólogos y naturalistas de campo. Permite gestionar salidas de campo, grabar rutas GPS, identificar y registrar especies mediante la API de iNaturalist, colaborar en proyectos compartidos y exportar datos en múltiples formatos, todo con soporte completo offline.

### Objetivos clave
- Registro rápido de observaciones en campo sin depender de conexión
- Integración con iNaturalist para autocompletar y filtrar especies
- Colaboración en tiempo real entre miembros de un proyecto
- Exportación científica en CSV, GPX, JSON, PDF Darwin Core, Excel

---

## 2. Stack Tecnológico <a name="stack"></a>

| Capa | Tecnología |
|------|-----------|
| Frontend móvil/escritorio | Flutter (Dart) |
| Backend API REST | C# — ASP.NET Core 8 |
| Base de datos servidor | PostgreSQL + PostGIS |
| Base de datos local | SQLite (via drift/floor) |
| Sincronización offline | Background sync + cola de cambios |
| Mapas | flutter_map + OpenStreetMap / tiles offline |
| GPS y rutas | geolocator + gpx |
| Autenticación | JWT + Refresh Tokens |
| API externa | iNaturalist API v1 |
| Almacenamiento ficheros | MinIO (self-hosted) o Azure Blob |

---

## 3. Arquitectura <a name="arquitectura"></a>

```
┌─────────────────────────────────────────┐
│              Flutter App                │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │  UI/UX   │  │ BLoC/    │  │ Local │ │
│  │ Screens  │  │ Riverpod │  │  DB   │ │
│  └──────────┘  └──────────┘  └───────┘ │
│         │            │           │      │
│         └────────────┴───────────┘      │
│                    │                    │
│            Sync Service                 │
└────────────────────┼────────────────────┘
                     │ HTTPS / WebSocket
┌────────────────────┼────────────────────┐
│         ASP.NET Core 8 API              │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │Controllers│  │ Services │  │ Repos │ │
│  └──────────┘  └──────────┘  └───────┘ │
│                    │                    │
│            PostgreSQL + PostGIS         │
└─────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │   iNaturalist API v1  │
         └───────────────────────┘
```

### Patrón offline-first
1. Toda escritura va primero a SQLite local con estado `pending`
2. Un `SyncService` en background detecta conectividad y sube los cambios
3. El servidor resuelve conflictos por timestamp + versión
4. Los tiles de mapa se cachean en disco para uso sin internet

---

## 4. Módulos Principales <a name="modulos"></a>

### 4.1 Proyectos
- Crear / editar / archivar proyectos
- Asignar miembros con roles: `owner`, `editor`, `viewer`
- Compartir proyecto mediante código QR o enlace
- Cada proyecto tiene su propia colección de rutas, observaciones y notas

### 4.2 Rutas GPS
- Grabación en tiempo real con track points cada N segundos (configurable)
- **Grabación en background con pantalla apagada** — funciona con el móvil en reposo usando un servicio foreground (Android) / background location (iOS), sin necesidad de mantener la app abierta
- Pausa / reanudación de ruta
- Visualización en mapa con capa de tiles offline
- Estadísticas: distancia, duración, altitud, velocidad media
- Exportación individual en GPX o KML

### 4.3 Observaciones de Especies
- Formulario rápido: foto, especie, coordenadas, fecha, notas
- Búsqueda y autocompletado de especies via iNaturalist
- Filtros por taxón, lugar, fecha, proyecto
- Galería de fotos por observación
- Estado de sincronización visible (local / sincronizado / conflicto)

### 4.4 Notas de Campo
- Editor de texto enriquecido por salida o proyecto
- Adjuntar fotos, coordenadas y observaciones a una nota
- Plantillas configurables por tipo de proyecto

### 4.5 Usuarios y Equipos
- Registro e inicio de sesión propio (no depende de iNaturalist)
- Perfil con avatar, especialidad taxonómica, institución
- Invitación a proyectos por email o código
- Historial de actividad por usuario

---

## 5. Integración API iNaturalist <a name="inaturalist"></a>

Base URL: `https://api.inaturalist.org/v1`

### Endpoints utilizados

| Uso | Endpoint |
|-----|----------|
| Autocompletar especie | `GET /taxa/autocomplete?q={nombre}` |
| Detalle de taxón | `GET /taxa/{id}` |
| Buscar observaciones | `GET /observations?taxon_id=&place_id=&d1=&d2=` |
| Lugares cercanos | `GET /places/nearby?nelat=&nelng=&swlat=&swlng=` |
| Foto de especie | Campo `default_photo.medium_url` en respuesta de taxa |

### Flujo de búsqueda rápida en campo
```
Usuario escribe nombre
        │
        ▼
Cache local (SQLite taxa) ──hit──▶ Mostrar resultado
        │ miss
        ▼
GET /taxa/autocomplete
        │
        ▼
Guardar en cache local
        │
        ▼
Mostrar lista filtrada con foto + nombre científico + nombre común
```

### Caché de taxa
- Los taxa consultados se almacenan localmente con TTL de 30 días
- Al crear una observación offline, se guarda el `taxon_id` de iNaturalist
- Al sincronizar, el backend valida el taxon_id contra iNaturalist

---

## 6. Modo Offline <a name="offline"></a>

### Qué funciona sin internet
- Grabar rutas GPS completas
- Crear y editar observaciones (con taxa ya cacheados)
- Escribir notas
- Ver proyectos y datos descargados previamente
- Navegar en mapa con tiles cacheados

### Cola de sincronización
Cada cambio local genera un registro en la tabla `sync_queue`:

```
sync_queue
├── id
├── entity_type  (route | observation | note | project)
├── entity_id
├── operation    (create | update | delete)
├── payload      (JSON)
├── created_at
└── status       (pending | syncing | failed | done)
```

El `SyncService` procesa la cola en orden FIFO cuando hay conectividad.

---

## 7. Autenticación y Usuarios <a name="auth"></a>

- Registro con email + contraseña (hash bcrypt en servidor)
- Login devuelve `access_token` (15 min) + `refresh_token` (30 días)
- Tokens almacenados en `flutter_secure_storage`
- Refresh automático transparente al usuario
- Opción de login con cuenta iNaturalist (OAuth2) para importar observaciones previas

---

## 8. Exportación <a name="exportacion"></a>

| Formato | Contenido | Uso |
|---------|-----------|-----|
| CSV | Observaciones con coordenadas y metadatos | Análisis en Excel/R |
| GPX | Rutas grabadas | GPS externos, QGIS |
| KML | Rutas + observaciones | Google Earth |
| GeoJSON | Observaciones georreferenciadas | QGIS, web maps |
| Darwin Core (DwC) | Observaciones en estándar biodiversidad | GBIF, IUCN |
| PDF | Informe de salida con mapa y listado | Informes oficiales |

---

## 9. Estructura de Carpetas <a name="estructura"></a>

```
biofield/
├── frontend/                  # Flutter
│   ├── lib/
│   │   ├── core/              # theme, router, constants
│   │   ├── data/
│   │   │   ├── local/         # drift DB, DAOs
│   │   │   ├── remote/        # API clients (dio)
│   │   │   └── sync/          # SyncService
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   └── repositories/
│   │   └── presentation/
│   │       ├── projects/
│   │       ├── routes/
│   │       ├── observations/
│   │       ├── notes/
│   │       └── auth/
│   └── pubspec.yaml
│
└── backend/                   # ASP.NET Core 8
    ├── BioField.API/
    │   ├── Controllers/
    │   ├── Middleware/
    │   └── Program.cs
    ├── BioField.Application/
    │   ├── Services/
    │   └── DTOs/
    ├── BioField.Domain/
    │   └── Entities/
    ├── BioField.Infrastructure/
    │   ├── Repositories/
    │   ├── Persistence/       # EF Core + PostGIS
    │   └── External/          # iNaturalist client
    └── BioField.sln
```

---

## 10. Modelos de Datos <a name="modelos"></a>

### User
```
id, email, password_hash, display_name, avatar_url,
speciality, institution, created_at, last_login
```

### Project
```
id, name, description, owner_id, created_at,
is_archived, share_code, cover_image_url
```

### ProjectMember
```
project_id, user_id, role (owner|editor|viewer), joined_at
```

### Route
```
id, project_id, user_id, name, started_at, ended_at,
distance_m, track_points (JSONB), gpx_file_url, notes
```

### Observation
```
id, project_id, route_id (nullable), user_id,
taxon_id, taxon_name, latitude, longitude, altitude,
observed_at, photos (JSONB array), notes, quantity,
sync_status, created_at, updated_at
```

### Note
```
id, project_id, user_id, title, body (rich text),
attachments (JSONB), latitude, longitude, created_at
```

### Taxa (cache local)
```
id (iNat taxon_id), name, common_name, rank,
photo_url, cached_at
```

---

## 11. Endpoints Backend <a name="endpoints"></a>

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
DELETE /api/auth/logout
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/{id}
PUT    /api/projects/{id}
DELETE /api/projects/{id}
POST   /api/projects/{id}/members
DELETE /api/projects/{id}/members/{userId}
GET    /api/projects/join/{shareCode}
```

### Routes
```
GET    /api/projects/{projectId}/routes
POST   /api/projects/{projectId}/routes
GET    /api/routes/{id}
PUT    /api/routes/{id}
DELETE /api/routes/{id}
GET    /api/routes/{id}/export?format=gpx|kml
```

### Observations
```
GET    /api/projects/{projectId}/observations
POST   /api/projects/{projectId}/observations
GET    /api/observations/{id}
PUT    /api/observations/{id}
DELETE /api/observations/{id}
POST   /api/observations/{id}/photos
```

### Notes
```
GET    /api/projects/{projectId}/notes
POST   /api/projects/{projectId}/notes
PUT    /api/notes/{id}
DELETE /api/notes/{id}
```

### Sync
```
POST   /api/sync/push       # sube cola de cambios offline
GET    /api/sync/pull?since= # descarga cambios del servidor
```

### Export
```
GET    /api/projects/{id}/export?format=csv|geojson|dwc|pdf
```

### iNaturalist proxy (opcional, para evitar CORS y cachear)
```
GET    /api/inaturalist/taxa?q=
GET    /api/inaturalist/taxa/{id}
```

---

## 12. Roadmap <a name="roadmap"></a>

### Fase 1 — MVP (2-3 meses)
- [ ] Auth completo (registro, login, JWT)
- [ ] CRUD proyectos y miembros
- [ ] Grabación de rutas GPS
- [ ] Observaciones con fotos y coordenadas
- [ ] Integración iNaturalist (autocomplete)
- [ ] Modo offline básico + sync

### Fase 2 — Colaboración (1-2 meses)
- [ ] Compartir proyectos por QR/enlace
- [ ] Notas de campo con editor enriquecido
- [ ] Notificaciones push de actividad del equipo
- [ ] Exportación CSV, GPX, GeoJSON

### Fase 3 — Avanzado (2 meses)
- [ ] Exportación Darwin Core y PDF
- [ ] Tiles de mapa offline descargables por zona
- [ ] Login con iNaturalist OAuth2
- [ ] Dashboard web de visualización de proyectos
- [ ] Estadísticas y gráficas por proyecto/especie

---

*Documentación generada para BioField App — versión 1.0*

---

## 13. Log de Progreso de Desarrollo <a name="progreso"></a>

### ✅ COMPLETADO

#### Backend — Estructura base
- Solución `BioField.sln` con 4 proyectos: `Domain`, `Application`, `Infrastructure`, `API`
- Referencias entre proyectos configuradas (arquitectura limpia)
- Paquetes instalados: EF Core 9, Npgsql, BCrypt, JWT Bearer, System.IdentityModel.Tokens.Jwt

#### Backend — Entidades (BioField.Domain)
- `User` — con refresh token integrado
- `Project` — con share code autogenerado
- `ProjectMember` — clave compuesta, enum de roles
- `Route` — track points como JSON
- `Observation` — con sync status
- `Note`

#### Backend — Infraestructura (BioField.Infrastructure)
- `AppDbContext` — EF Core con PostgreSQL, índices únicos, conversiones de enum
- `AuthService` — registro, login, refresh, logout con BCrypt + JWT
- `ProjectService` — CRUD completo + miembros + join por share code
- `RouteService` — CRUD completo con control de permisos
- `ObservationService` — CRUD completo con sync status
- `NoteService` — CRUD completo
- `SyncService` — push (procesa cola offline por entidad/operación) + pull (devuelve cambios desde fecha)
- `iNaturalistService` — autocomplete y detalle de taxones via API iNaturalist
- `ExportService` — CSV, GPX, GeoJSON, Darwin Core, PDF (QuestPDF)
- Migración `InitialCreate` generada y aplicada a PostgreSQL

#### Backend — Aplicación (BioField.Application)
- `IAuthService`, `IProjectService`, `IRouteService`, `IObservationService`, `INoteService`
- DTOs: `AuthDtos`, `ProjectDtos`, `FieldDtos`

#### Backend — API (BioField.API)
- `AuthController` — register, login, refresh, logout
- `ProjectsController` — CRUD + miembros + join por share code
- `RoutesController` / `RouteDetailController`
- `ObservationsController` / `ObservationDetailController`
- `NotesController` / `NoteDetailController`
- `SyncController` — POST push, GET pull
- `iNaturalistController` — GET taxa autocomplete, GET taxa/{id}
- `ExportController` — GET export?format=csv|gpx|geojson|dwc|pdf
- `Program.cs` — JWT + DI completo + HttpClient iNaturalist
- `docker-compose.yml` — PostgreSQL 16
- Migración `InitialCreate` aplicada a la BD
- `ErrorHandlingMiddleware` — captura excepciones globales, devuelve JSON con status code correcto
- **Compilación: ✅ 0 errores, 0 advertencias**

---

#### Frontend (Flutter)
- Proyecto creado con Flutter 3.41.2
- `pubspec.yaml` — Riverpod, Dio, go_router, drift, geolocator, flutter_map, flutter_secure_storage, image_picker
- `AppConstants` — URL base de la API
- `AppTheme` — tema verde Material 3 (claro y oscuro)
- `models.dart` — UserModel, ProjectModel, ObservationModel, RouteModel, NoteModel, TaxonModel
- `api_client.dart` — Dio con interceptor JWT + refresh automático
- `providers.dart` — AuthNotifier, projectsProvider, observationsProvider, routesProvider, notesProvider, taxonSearchProvider
- `app_router.dart` — go_router con redirección según auth
- `LoginScreen` / `RegisterScreen`
- `ProjectsScreen` — lista, crear proyecto, unirse por código
- `ProjectDetailScreen` — tabs rutas / observaciones / notas
- `ObservationFormScreen` — búsqueda iNaturalist en tiempo real + GPS
- `RouteRecordingScreen` — mapa en vivo + grabación GPS + pausa/reanudar
- `NoteFormScreen` — editor con coordenadas automáticas
- **Análisis: ✅ 0 errores**

#### Frontend — Offline + Permisos
- `AndroidManifest.xml` — GPS, internet, cámara, foreground service location
- `local_db.dart` — drift DB con tablas: LocalObservations, LocalRoutes, LocalNotes, SyncQueue
- `sync_service.dart` — guarda offline + encola cambios + sube al backend cada 30s
- Observaciones, rutas y notas guardan offline automáticamente si no hay conexión
- Código drift generado con `build_runner`
- **Análisis: ✅ 0 errores**

#### Frontend — Observaciones mejoradas
- Formulario completo: título, especie, descripción, fecha/hora, ubicación, cantidad, clima, temperatura, humedad, etiquetas, notas, fotos (cámara + galería)
- Edición de observaciones existentes
- `ProjectMapScreen` — mapa con rutas (polylines) y observaciones (marcadores) del proyecto
- `RouteRecordingScreen` — banner persistente con timer + km + puntos, botón de observación rápida durante grabación
- Botón de mapa en `ProjectDetailScreen`
- **Análisis: ✅ 0 errores**

---

### ⏳ PENDIENTE

*Todo completado. El proyecto está listo para pruebas.*
