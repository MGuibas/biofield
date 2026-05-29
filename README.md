# BioField 🌿

Plataforma ecológica y científica para la recolección, visualización y gestión de observaciones y rutas de campo.

---

## 📂 Documentación del Proyecto

La documentación oficial completa del proyecto (tesis, metodología, arquitectura y manuales) está disponible en formato PDF en el siguiente enlace de Google Drive:

👉 **[DESCARGAR/VER DOCUMENTACIÓN COMPLETA (PDF)](https://drive.google.com/file/d/1CdYzAn54RGN7ICuv2ac7iKWzsWPZySa1/view?usp=sharing)**

---

## 🚀 Inicio Rápido (Desarrollo Local)

BioField utiliza Docker Compose para levantar toda la pila de servicios en local con un solo comando.

### Requisitos
*   [Docker](https://www.docker.com/) instalado en tu sistema.

### Levantar el Proyecto
1.  Clona este repositorio.
2.  Desde la raíz del proyecto, ejecuta:
    ```bash
    docker compose up -d --build
    ```

Una vez que el comando termine, los servicios estarán disponibles en:
*   **Panel Web (React):** [http://localhost:3000](http://localhost:3000)
*   **Servicio de API (Swagger):** [http://localhost:5000/swagger](http://localhost:5000/swagger)
*   **Consola de MinIO (Almacenamiento S3):** [http://localhost:9001](http://localhost:9001) (Credenciales: `minioadmin` / `minioadmin`)
*   **Base de datos (PostgreSQL):** Puerto `5432` (Credenciales: `postgres` / `yourpassword`)

---

## 🛠️ Arquitectura y Estructura del Código

El repositorio está dividido en los siguientes módulos principales:

*   **[`/backend`](file:///d:/BIOFIELD/backend)**: API construida en **ASP.NET Core (.NET 9.0)** utilizando Entity Framework Core para la persistencia.
*   **[`/webapp`](file:///d:/BIOFIELD/webapp)**: Aplicación web interactiva construida en **React + TypeScript + Vite** con mapas en Leaflet.
*   **[`/documentacion`](file:///d:/BIOFIELD/documentacion)**: Documentos, capítulos de tesis y anexos en Markdown y Word.
