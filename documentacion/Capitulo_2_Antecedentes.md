# Capítulo 2: Antecedentes y Estado de la Cuestión

## 2.1.- SITUACIÓN ACTUAL DE LA EMPRESA / SECTOR

El sector del trabajo científico de campo se encuentra en una fase de transición digital desigual. En la mayoría de los departamentos universitarios y centros de investigación biológica de tamaño medio, el registro de observaciones ecológicas y hábitats se realiza de forma heterogénea. El flujo de trabajo típico consiste en:

1. El biólogo anota en libretas de campo resistentes al agua las coordenadas obtenidas de un receptor GPS satelital físico.
2. Utiliza una cámara fotográfica digital para tomar instantáneas del hábitat y del espécimen, debiendo apuntar el identificador de la foto en la libreta para no perder la correspondencia.
3. Al volver a la estación científica o al laboratorio, se transcriben las notas manuscritas a hojas de cálculo (Microsoft Excel) y las imágenes se clasifican manualmente en carpetas locales en discos duros.
4. Para la representación cartográfica de las rutas realizadas, los investigadores deben exportar archivos GPX del receptor GPS e importarlos en sistemas de información geográfica (SIG) pesados de escritorio como QGIS o ArcGIS.

Esta metodología presenta riesgos severos de pérdida de datos por extravío o deterioro físico de las libretas, inconsistencia y errores tipográficos en los nombres científicos o coordenadas de los especímenes, y una completa desvinculación en tiempo real de los datos recogidos por distintos miembros de una misma expedición. La falta de una base de datos centralizada dificulta enormemente la colaboración cooperativa ágil y el control de calidad de los datos recolectados.

## 2.2.- HERRAMIENTAS DISPONIBLES EN EL MERCADO

En el ámbito científico e interactivo, existen diversas aplicaciones destinadas al registro biológico y geográfico. A continuación se realiza un análisis comparativo de las principales herramientas disponibles:

### 2.2.1.- iNaturalist
Es la plataforma global más popular para la ciencia ciudadana. Permite a los usuarios registrar observaciones de plantas, animales y hongos mediante fotografías geolocalizadas. 
* **Ventajas**: Cuenta con una comunidad masiva de identificación taxonómica y modelos de reconocimiento visual mediante IA.
* **Inconvenientes**: Está orientada al público general ("ciencia ciudadana"), lo que limita la creación de proyectos científicos privados o aislados de la red pública. Además, carece de soporte avanzado para registro continuo de rutas geográficas (trazado continuo de trayectos GPS) y no permite la exportación ágil de datos de campo estructurados y detallados de variables meteorológicas específicas o hábitats en formatos profesionales a nivel privado.

### 2.2.2.- eBird
Desarrollada por el laboratorio de Ornitología de Cornell, está especializada exclusivamente en el avistamiento y registro de aves.
* **Ventajas**: Excelente base de datos mundial y flujos de trabajo muy refinados para observadores de aves.
* **Inconvenientes**: Su alcance está limitado únicamente al taxón de las aves, por lo que es inservible para estudios botánicos, entomológicos o geológicos generales. Tampoco dispone de simulación de vuelos 3D interactivos de trayectos ni integraciones de IA generativa para análisis genéricos contextuales.

### 2.2.3.- ArcGIS Survey123 (Esri)
Una suite corporativa de primer nivel orientada a la recolección de datos geoespaciales mediante formularios inteligentes.
* **Ventajas**: Increíble integración con el ecosistema de software SIG de Esri, alto nivel de personalización y soporte offline.
* **Inconvenientes**: Coste de licenciamiento sumamente elevado, inaccesible para la mayoría de estudiantes de grado, pequeños colectivos y universidades con presupuestos reducidos. La curva de aprendizaje para la configuración de bases de datos y sincronización de formularios es compleja y requiere servidores SIG dedicados.

### 2.2.4.- Tabla Comparativa de Herramientas

| Característica / Plataforma | iNaturalist | eBird | ArcGIS Survey123 | **BioField** |
| :--- | :--- | :--- | :--- | :--- |
| **Licenciamiento** | Gratuito (Público) | Gratuito (Público) | Propietario (Pago Alto) | **Código Abierto (Gratuito)** |
| **Enfoque Taxonómico** | Generalista | Solo Aves | Configurable | **Generalista y Flexible** |
| **Trazado de Rutas GPS** | No | Sí (Ornitológicas) | Sí (Complejo) | **Sí (Simplificado y Nativo)** |
| **Soporte Offline** | Parcial | Sí | Sí | **Sí (Offline-First Completo)** |
| **Visualización en 3D** | No | No | No | **Sí (Vuelo 3D Interpolado)** |
| **Integración IA** | Clasificación Visual | No | No | **Sí (Análisis Gemini de Rutas)** |
| **Exportación Profesional** | Limitada | No | Sí (ArcGIS) | **Sí (CSV, GPX, GeoJSON, Excel, PDF)** |

## 2.3.- VALORACIÓN

A la luz del estudio comparativo realizado, se evidencia la existencia de un vacío tecnológico entre las aplicaciones masivas públicas de ciencia ciudadana (que exigen la divulgación pública de los datos y carecen de control del proyecto por parte del investigador) y las complejas suites SIG corporativas propietarias (cuyo coste de licenciamiento es prohibitivo).

**BioField** cubre esta necesidad ofreciendo una solución integrada y económica (código abierto), diseñada con arquitectura moderna (sincronización offline con bases de datos Drift locales y backend ASP.NET Core) y centrada en la facilidad de uso. Su valor añadido reside en la incorporación nativa de registros de trayectos continuos con visualización en mapas en 2D y simulaciones de vuelos interactivos en 3D enriquecidos con Inteligencia Artificial, proporcionando a los equipos científicos una plataforma de análisis potente, privada y adaptada a las necesidades reales del muestreo ecológico de campo.
