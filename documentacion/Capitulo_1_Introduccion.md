# Capítulo 1: Introducción

## 1.1.- EMPRESA/ENTORNO DE APLICACIÓN

El proyecto **BioField** se enmarca en el sector de la investigación científica, la conservación ambiental y las ciencias biológicas de campo. Los investigadores de campo, ecólogos, biólogos y estudiantes de ciencias naturales frecuentemente llevan a cabo expediciones y muestreos biológicos en entornos naturales (bosques, montañas, zonas costeras o áreas protegidas) para registrar avistamientos de especies animales y vegetales, documentar el estado de los hábitats, trazar rutas de muestreo y recopilar variables climáticas.

Tradicionalmente, este entorno de aplicación adolece de problemas graves de infraestructura tecnológica. Las expediciones suelen realizarse en zonas remotas con conectividad nula o muy limitada a Internet. Las herramientas tecnológicas comunes del sector suelen ser fragmentadas, propietarias o requieren de costosos equipos GPS dedicados. BioField se introduce como una plataforma integrada y moderna, diseñada específicamente para solventar estas carencias y dotar a las organizaciones de investigación, universidades y colectivos científicos de un ecosistema digital ágil, centralizado y de alto rendimiento.

## 1.2.- JUSTIFICACIÓN DEL PROYECTO

El desarrollo de BioField responde a la necesidad imperiosa de modernizar y digitalizar el flujo de trabajo en la recolección de datos de campo. Históricamente, los biólogos han dependido de cuadernos de notas físicos y cámaras fotográficas independientes, lo que acarrea múltiples inconvenientes:

1. **Pérdida de datos**: El papel es vulnerable a las inclemencias del tiempo, extravíos o daños físicos.
2. **Inconsistencia de formato**: La posterior transcripción manual de los datos a hojas de cálculo o bases de datos introduce errores tipográficos y discrepancias de formato en coordenadas y nombres taxonómicos.
3. **Falta de contexto geoespacial**: Correlacionar fotos de hábitats, trayectos recorridos y observaciones puntuales manualmente es una tarea compleja que consume valioso tiempo de análisis de gabinete.
4. **Colaboración ineficiente**: El trabajo cooperativo en proyectos de campo requiere compartir códigos y consolidar archivos de forma manual, dificultando la sincronización de observaciones en tiempo real al retornar de las expediciones.

BioField soluciona esto a través de un ecosistema **offline-first** multiplataforma. Permite registrar observaciones geolocalizadas, fotografías y variables ambientales en tiempo real sin conexión, y sincronizarlas automáticamente con un servidor centralizado al detectar red. Además, ofrece herramientas premium de visualización en la web, incluyendo una simulación interactiva 3D con inteligencia artificial integrada que enriquece el análisis espacial de los trayectos.

## 1.3.- OBJETIVOS

El objetivo principal de BioField es desarrollar e implementar un sistema de software integral para la captura, almacenamiento, visualización y análisis de observaciones ecológicas y rutas de campo en modalidad "offline-first".

Este objetivo principal se desglosa en los siguientes objetivos específicos:

* **Desarrollar una aplicación móvil multiplataforma (Flutter)**: Capaz de registrar observaciones (título, taxonomía, cantidad, fotos, clima, hábitat) y trayectos de GPS en tiempo real, almacenándolos en una base de datos local (Drift/SQLite) y cacheando mapas en local para funcionar al 100% sin cobertura celular.
* **Implementar una API REST robusta (ASP.NET Core)**: Con arquitectura limpia y Domain-Driven Design (DDD) bajo .NET 9.0, que gestione usuarios (autenticación única con Google), proyectos compartidos, y actúe como motor de sincronización de observaciones e imágenes mediante almacenamiento compatible con S3 (MinIO).
* **Construir un Panel de Administración Web (React + Vite)**: Con un diseño premium, minimalista y adaptativo (Modo Claro/Oscuro), que permita la gestión de proyectos mediante códigos de invitación (`shareCode`), monitorización de la actividad y exportación de datos en múltiples formatos estándar (CSV, GeoJSON, GPX, PDF y Excel).
* **Desarrollar un módulo de Simulación 3D interactivo**: Integrado en el panel web, utilizando tecnologías de renderizado geolocalizado en 3D (MapLibre GL) y conectividad con la API de Gemini (Inteligencia Artificial) para generar análisis taxonómicos automatizados y descripciones ecológicas de las rutas recorridas.

## 1.4.- LÍMITES DEL PROYECTO

El alcance del proyecto está delimitado por las siguientes condiciones técnicas y funcionales:

* **Sincronización en un solo sentido**: La aplicación móvil está optimizada para la carga de datos local hacia el servidor (sincronización ascendente). La resolución de conflictos avanzada bidireccional de metadatos se limita a notificar el estado de sincronización (`SyncStatus`) de cada registro.
* **Modelo 3D simplificado (Flat Terrains)**: La recreación del relieve en la simulación 3D web de trayectos está limitada por la disponibilidad de APIs de elevación gratuitas, enfocándose en la recreación vectorial de la cámara (pitch, bearing y zoom dinámicos) sobre imágenes de satélite.
* **Autenticación restringida**: Con el fin de maximizar la seguridad y simplicidad del panel, se prescinde de la base de datos de contraseñas local de BioField, delegando la autenticación del ecosistema al proveedor único oficial de **Google Identity Services**.
