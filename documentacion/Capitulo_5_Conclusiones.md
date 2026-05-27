# Capítulo 5: Conclusiones y Trabajo Futuro

## 5.1.- CONCLUSIONES

La culminación del desarrollo del proyecto **BioField** permite extraer conclusiones significativas acerca de su impacto tecnológico y metodológico en la recolección de datos ecológicos de campo:

1. **Eficiencia en la Captura de Datos**: La implementación de la aplicación móvil offline-first con Drift/SQLite y caché de mapas local ha demostrado erradicar por completo la necesidad de libretas de campo físicas y GPS físicos dedicados en expediciones científicas. Esto mitiga sustancialmente la pérdida de información y disminuye el tiempo de transcripción manual a cero.
2. **Consistencia de Datos mediante Centralización**: El backend con arquitectura limpia en .NET 9.0 y PostgreSQL ofrece una consolidación segura de observaciones y proyectos de múltiples usuarios bajo códigos de invitación dinámicos. Esto proporciona un entorno unificado donde los datos de campo quedan inmediatamente estructurados, georreferenciados y categorizados climática y temporalmente.
3. **Visualización y Análisis Enriquecido**: La simulación 3D interactiva animada mediante MapLibre y Turf.js en el panel React web añade valor al análisis geográfico de gabinete. La integración con la Inteligencia Artificial (Gemini API) proporciona una herramienta contextual innovadora para describir especies y comportamientos ecológicos de manera automática durante las rutas simuladas.
4. **Viabilidad e Implantación Económica**: Al estructurar todo el sistema utilizando pilas de desarrollo open-source de primer nivel (Dart/Flutter, C#/.NET Core, React, Docker y PostgreSQL), el proyecto demuestra que es posible implementar un sistema geoespacial y de muestreo ecológico a gran escala sin costos de licenciamiento abusivos (como ArcGIS/Esri), haciéndolo ideal para el sector universitario y la investigación independiente.

## 5.2.- TRABAJO FUTURO

A pesar del éxito del desarrollo del sistema BioField, se abren múltiples vías para expandir y evolucionar la plataforma en futuras fases de desarrollo:

### 5.2.1.- Clasificación de Especies en Dispositivo (On-Device AI)
* **Objetivo**: Integrar modelos de Deep Learning comprimidos (TensorFlow Lite o PyTorch Mobile) directamente en el cliente móvil Flutter.
* **Propósito**: Permitir que el biólogo apunte la cámara hacia un espécimen y reciba sugerencias taxonómicas en tiempo real de forma local, 100% offline, sin requerir conexión a internet ni llamadas a la nube.

### 5.2.2.- Compartido en Tiempo Real de Mapas Activos
* **Objetivo**: Desarrollar un sistema de sockets bidireccional (SignalR en el backend ASP.NET y WebSockets en los clientes) para su uso en zonas urbanas o de muestreo semiurbano con señal.
* **Propósito**: Visualizar la ubicación de los otros miembros de la expedición en el mapa interactivo móvil y web en tiempo real, aumentando la seguridad y coordinación física del grupo.

### 5.2.3.- Soporte para Capas SIG Avanzadas (WMS/WMTS)
* **Objetivo**: Ampliar el cargador de mapas de `flutter_map` y `MapLibre` para consumir capas procedentes de servidores SIG públicos (IGN, IDE, Copernicus).
* **Propósito**: Permitir a los biólogos cargar mapas de relieve, hidrografía, geología y vegetación personalizados directamente sobre los trayectos 2D y 3D en local.

### 5.2.4.- Integración de Alertas y Notificaciones Climáticas Críticas
* **Objetivo**: Programar servicios de consumo de APIs meteorológicas predictivas en el backend con envío de alertas Push (Firebase Cloud Messaging).
* **Propósito**: Alertar a los investigadores que se encuentren realizando trayectos de campo de cambios bruscos de clima, tormentas eléctricas o condiciones extremas en la ruta prevista.
