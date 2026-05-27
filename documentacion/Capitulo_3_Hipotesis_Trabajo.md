# Capítulo 3: Hipótesis de Trabajo y Arquitectura Tecnológica

La concepción, diseño e implementación del ecosistema **BioField** se asientan sobre un conjunto de hipótesis metodológicas y decisiones tecnológicas seleccionadas para resolver las problemáticas particulares del trabajo de campo. En este capítulo se detallan las elecciones de arquitectura, lenguajes, frameworks y herramientas que componen la base técnica del proyecto.

## 3.1.- METODOLOGÍA DE ARQUITECTURA DE SOFTWARE

Para garantizar la mantenibilidad, escalabilidad e independencia del código, el sistema BioField se ha diseñado siguiendo los principios de la **Arquitectura Limpia (Clean Architecture)** y el **Diseño Guiado por el Dominio (Domain-Driven Design - DDD)** en su backend, acoplado a un patrón **Reactivo Basado en Estados** en sus clientes móvil y web.

### 3.1.1.- Estructura de Capas en Backend (Domain-Driven Design)
La API de BioField está dividida en cuatro proyectos desacoplados con dependencias en un solo sentido:
1. **BioField.Domain (Núcleo)**: Define las entidades fundamentales (como `User`, `Project`, `Observation`, `Route`, `Comment`, `Note`), enums y contratos de interfaces. Es independiente de cualquier framework o base de datos externa.
2. **BioField.Infrastructure (Infraestructura)**: Implementa el acceso a datos mediante Entity Framework Core, la configuración de PostgreSQL, las migraciones de esquema, el almacenamiento de objetos S3 compatible (MinIO) y servicios externos (servicios de exportación de archivos o cifrado).
3. **BioField.Application (Aplicación)**: Orquesta la lógica del negocio mediante servicios de aplicación y controladores de flujos de trabajo. Define DTOs (Data Transfer Objects) y traduce las peticiones procedentes del exterior.
4. **BioField.API (Presentación)**: Expone los endpoints HTTP a través de controladores de ASP.NET Core, maneja el enrutado, la configuración del contenedor de dependencias (IoC), la autenticación de Google y el middleware de manejo global de excepciones.

### 3.1.2.- Filosofía de Desarrollo "Offline-First"
Bajo la hipótesis de que la red es intrínsecamente inestable o inexistente durante el trabajo de campo, la aplicación móvil de BioField no interactúa de forma directa con la API remota para las operaciones de escritura. En su lugar:
* Las modificaciones e inserciones de observaciones se registran en una base de datos SQLite local integrada.
* Cada observación posee un campo `SyncStatus` con tres estados: `Local` (pendiente de subir), `Synced` (confirmada en el servidor) y `Conflict` (diferencias de metadatos detectadas).
* Un motor de sincronización (`SyncService`) monitoriza la conectividad en segundo plano y realiza la sincronización ascendente de forma asíncrona enviando los paquetes JSON y blobs binarios de imágenes al servidor cuando se detecta red estable.

## 3.2.- PILA TECNOLÓGICA (STACK)

La elección del software y lenguajes responde a criterios de rendimiento, soporte multiplataforma, seguridad y costo (priorizando tecnologías de código abierto sin licencias costosas).

### 3.2.1.- Tecnologías del Servidor (Backend)
* **ASP.NET Core (C# bajo .NET 9.0)**: Utilizado por su excelente rendimiento de ejecución, tipado estático robusto y amplia biblioteca estándar. .NET 9 proporciona soporte nativo para compilación de alto rendimiento y API Minimalist.
* **Entity Framework Core (EF Core 9)**: ORM de nivel empresarial que mapea las clases de dominio C# a tablas de base de datos relacional PostgreSQL de forma automática.
* **PostgreSQL (v16)**: Base de datos relacional de código abierto elegida por su alta fiabilidad y soporte avanzado para consultas geoespaciales complejas (latitud/longitud).
* **MinIO Object Storage**: Servidor de almacenamiento de objetos de código abierto compatible con la API de Amazon S3, utilizado para alojar de forma local y segura avatares de perfil, imágenes de observaciones y capturas de hábitats.
* **Docker y Docker Compose**: Utilizados para orquestar los microservicios locales (`api`, `webapp`, `postgres`, `minio`), garantizando la portabilidad del entorno de desarrollo a producción de forma idéntica.

### 3.2.2.- Tecnologías del Cliente Móvil (App)
* **Flutter & Dart (SDK >=3.0.0)**: Framework de Google para compilar aplicaciones nativas de alto rendimiento en iOS y Android a partir de una única base de código.
* **Drift (anteriormente Moor)**: Librería reactiva de base de datos persistente basada en SQLite, que realiza generación de código estático (code generation) para ofrecer consultas de base de datos seguras en tiempo de compilación.
* **Flutter Riverpod**: Framework de gestión de estado reactivo que desacopla la lógica del negocio de la representación gráfica (widgets).
* **Dio**: Cliente HTTP avanzado con soporte para interceptores, reintentos automáticos, y descarga/subida de archivos por partes (Multipart).
* **Flutter Map**: Librería de renderizado de mapas interactivos basados en capas raster (OpenStreetMap) con soporte para almacenamiento de teselas en caché offline (`flutter_map_tile_caching`) para permitir mapas funcionales sin cobertura.

### 3.2.3.- Tecnologías del Cliente Web (Panel Admin)
* **Vite + React 19 + TypeScript**: Entorno de compilación ultra rápido acoplado a React para el renderizado del árbol de componentes de interfaz. TypeScript añade tipado estático, reduciendo fallos en tiempo de ejecución.
* **MapLibre GL & React Map GL**: Biblioteca de mapeo de alto rendimiento acelerada por hardware (WebGL) utilizada para la representación del mapa interactivo 2D y la simulación 3D interactiva de rutas.
* **Turf.js**: Biblioteca de análisis espacial para JavaScript, utilizada en la webapp para interpolar las rutas y calcular distancias, orientaciones (bearing) y suavizado de trayectorias.
* **Lucide React**: Biblioteca de iconos vectoriales monocolor, consistentes y estilizados (sustituyendo el exceso de emojis por un diseño visualmente premium).
* **Google Generative AI SDK**: Integración directa en la vista 3D para consultar modelos Gemini de inteligencia artificial generativa, enriqueciendo las rutas analizadas con descripciones taxonómicas automáticas.
