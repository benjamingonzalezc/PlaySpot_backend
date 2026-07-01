# Documentación de Implementación de Requerimientos Funcionales — PlaySpot

Este documento detalla todas las modificaciones, nuevas características, flujos de datos y lógicas de negocio implementadas tanto en el **Backend (Node.js/Express)** como en el **Frontend (Angular)** para dar cumplimiento a los requerimientos funcionales solicitados.

---

## 🛠️ Justificación Tecnológica y de Estructura

Para el desarrollo y expansión de PlaySpot se eligió un stack moderno y estructurado que equilibra rapidez de iteración con solidez empresarial.

### 1. ¿Por qué elegimos este Stack Tecnológico?
- **Backend: Node.js + Express**:
  - *Ligero y Escalable*: Node.js maneja de manera asíncrona múltiples conexiones con un consumo de recursos mínimo, lo cual es vital para el flujo de reservas deportivas concurrentes.
  - *Compatibilidad Nativa con JSON*: Express simplifica la lectura y respuesta de objetos JSON, acoplándose de manera perfecta con el `HttpClient` de Angular.
- **Base de Datos: Supabase (PostgreSQL)**:
  - *Consultas Rápidas*: Combina el poder relacional de PostgreSQL con la facilidad de un Backend-as-a-Service (BaaS), reduciendo la necesidad de escribir y mantener consultas SQL complejas desde cero.
- **Frontend: Angular (TypeScript)**:
  - *Tipado Estricto*: TypeScript asegura que las interfaces de datos (como `Pago` o `Reserva`) mantengan consistencia tanto en el cliente como en el servidor, reduciendo a cero los errores por campos mal escritos durante la compilación.
  - *Patrón Inyección de Dependencias*: Angular organiza la lógica de negocio mediante servicios inyectables (`Services`) separados de la lógica visual, promoviendo la reusabilidad del código.

### 2. Estructura de Diseño en el Backend (Node.js/Express)
Se empleó una arquitectura modular limpia segmentada en:
- **`routes/`**: Define la firma y los accesos públicos de los endpoints, aplicando de forma jerárquica los middlewares de seguridad (`verificarToken` y `verificarRol`).
- **`controllers/`**: Contiene la lógica pura del negocio (procesamiento de datos, validación horaria, cálculos matemáticos de evaluaciones). No maneja routing directo ni detalles de infraestructura de base de datos.
- **`config/`**: Centraliza la comunicación y la persistencia de datos externa. Aquí reside `supabaseClient.js` y el sistema de persistencia local flexible `dbFallback.js`.

**Beneficio**: Esta separación de responsabilidades asegura que si el motor de base de datos cambia (por ejemplo, de Supabase a un PostgreSQL local directo), solo se deba actualizar la capa en `config/`, manteniendo intactos los controladores y rutas.

### 3. Estructura de Diseño en el Frontend (Angular)
El frontend sigue la estructura recomendada para aplicaciones a gran escala:
- **`core/services/`**: Aloja los servicios "Singleton" que administran el estado global de la aplicación (como `AuthService` para verificar la identidad del usuario a lo largo de toda la sesión) y la comunicación REST.
- **`shared/`**: Contiene componentes modulares (ej. `RecintoCard`) e interfaces (`interfaces/`) reutilizables en múltiples vistas.
- **`features/`**: Estructurado por dominios de negocio específicos (`admin`, `perfil`, `auth`, `reservas`, `recintos`). 

**Beneficio**: Aislar la lógica por "features" previene efectos secundarios. Por ejemplo, cualquier modificación realizada en la pestaña de administración (`/admin`) jamás afectará el comportamiento del historial de reservas del usuario común en `/mis-reservas`.

---

## 🏗️ 1. Arquitectura y Persistencia Híbrida (DDBB Fallback)

Dado que algunas de las tablas requeridas por los nuevos módulos (como `pagos` y `evaluaciones`) o campos específicos (como `telefono` en `usuarios`) no existían físicamente en la estructura DDL actual de la base de datos de Supabase, se diseñó e implementó un mecanismo de **Base de Datos con Fallback Local**.

- **Archivo**: [`dbFallback.js`](file:///c:/Users/TheBe/OneDrive/Escritorio/Proyecto%20Playspot/src/config/dbFallback.js)
- **Funcionamiento**:
  1. Intercepta todas las consultas hacia base de datos del backend.
  2. Si la consulta a Supabase falla con el error `"Could not find the table"` (la tabla no existe en la nube), el helper redirige la operación de manera transparente a un archivo JSON local ordenado [`local_db.json`](file:///c:/Users/TheBe/OneDrive/Escritorio/Proyecto%20Playspot/src/config/local_db.json).
  3. Esto asegura que la aplicación siga funcionando con persistencia real (puedes crear evaluaciones, registrar pagos, solicitar reembolsos, etc.) de forma local. En cuanto crees las tablas en Supabase, el sistema migrará a ellas automáticamente sin modificar una sola línea de código del backend.

---

## 👥 2. Módulo de Gestión de Usuarios (RF1.3, RF1.4, RF1.5)

### Backend
- **Edición de Perfil (`PUT /api/usuarios/perfil`)**: Permite actualizar el nombre de usuario y cambiar la contraseña de forma segura (hasheando la nueva contraseña con `bcrypt`).
- **Soporte de Teléfono (Solución de Error)**: Debido a que la tabla `usuarios` en Supabase no tiene el campo `telefono`, el backend intercepta el guardado del teléfono en `editarPerfil`, `login` y `registro`, almacenándolo en una estructura local `usuarios_metadata` mapeada por ID de usuario. Al consultar o iniciar sesión, se junta el perfil de Supabase con este dato local de forma imperceptible.
- **Flujo de Recuperación (`POST /api/auth/recuperar` y `POST /api/auth/reset`)**: Flujo completo que genera un código temporal de 6 dígitos con expiración de 10 minutos almacenado en memoria. Permite restablecer la contraseña utilizando dicho código.
- **Eliminar Cuenta (`DELETE /api/usuarios/cuenta`)**: Permite al usuario eliminar su cuenta. Valida la contraseña actual del usuario, cancela todas sus reservas pendientes en estado `pendiente`, y borra el registro de Supabase.

### Frontend (Angular)
- **Componente Perfil (`/perfil`)**: Formulario interactivo que permite editar el nombre, teléfono y contraseña directamente. Cuenta con una "Zona de Peligro" que solicita la contraseña para confirmar la eliminación de la cuenta.
- **Pantalla Recuperar Contraseña (`/forgot-password`)**: Formulario para ingresar el correo y recibir el código de verificación de 6 dígitos.
- **Pantalla Restablecer Contraseña (`/reset-password`)**: Formulario para ingresar el código de verificación recibido y configurar la nueva contraseña.

---

## 🏟️ 3. Módulo de Recintos y Canchas (RF2.3, RF2.4, RF2.5, RF2.6)

### Backend
- **Controlador de Recintos (`recintos.controller.js`)**: Endpoints añadidos para actualizar (`PUT /api/recintos/:id`) y eliminar (`DELETE /api/recintos/:id`) recintos. La eliminación cuenta con validación previa de seguridad que impide borrar un recinto si tiene canchas con reservas activas.
- **Controlador de Canchas (`canchas.controller.js`)**: Rutas CRUD completas para añadir, actualizar y eliminar canchas de un recinto.

### Frontend (Angular)
- **Panel de Administración (`/admin` - pestaña "Recintos y Canchas")**:
  - **CRUD de Recintos**: Formulario integrado en una grilla de dos columnas. Permite crear un nuevo recinto con su nombre, dirección, imágenes y horarios, así como editar o eliminar los existentes.
  - **CRUD de Canchas**: Al seleccionar un recinto del listado, la columna derecha carga dinámicamente sus canchas con opción de eliminarlas o abrir un formulario modal/inline para añadir/editar canchas (definiendo deporte, superficie, capacidad, precio por hora y precio por bloque).

---

## 📅 4. Módulo de Reservas y Cambio de Fecha (RF3.5)

### Backend
- **Modificación de Reserva (`PUT /api/reservas/:id_reserva`)**: Endpoint que recibe la nueva fecha, hora de inicio y hora de fin. Valida en la base de datos que la cancha no esté ocupada en ese bloque horario por otra reserva activa antes de aplicar el cambio.

### Frontend (Angular)
- **Vista de Mis Reservas (`/mis-reservas`)**: Las reservas activas muestran el botón **"Modificar Fecha/Hora"**. Al hacer clic, se abre un formulario dinámico inline que consulta al backend los horarios y bloques libres para la nueva fecha seleccionada, previniendo que el usuario escoja un horario ocupado.

---

## 💳 5. Módulo de Pagos y Reembolsos (RF4.3, RF4.4)

### Backend
- **Historial de Pagos (`GET /api/pagos/usuario/:id` y `GET /api/pagos`)**: Obtiene todas las transacciones realizadas por el usuario o todas las del sistema (para administradores).
- **Procesamiento de Reembolso (`POST /api/pagos/:id/reembolso`)**: Cambia el estado del pago a `reembolsado` y actualiza automáticamente el estado de la reserva asociada a `cancelada`, liberando la cancha.

### Frontend (Angular)
- **Historial en Perfil y Admin**: Los usuarios visualizan el historial de sus transacciones en `/perfil`, mientras que los administradores pueden ver todos los pagos en el panel `/admin`.
- **Botón Solicitar Reembolso**: Los pagos con estado `aprobado` muestran un botón interactivo que realiza la petición de reembolso, cancela la reserva asociada y actualiza el estado visual en la tabla en tiempo real.

---

## 📊 6. Módulo de Reportes en CSV y PDF (RF5.4)

### Backend
- **Exportación CSV (`GET /api/reportes/exportar/csv`)**: Genera y sirve en formato de texto plano un archivo CSV con el historial de reservas filtrado por rango de fechas.
- **Exportación PDF Prémio (`GET /api/reportes/exportar/pdf`)**: Diseñado bajo el enfoque de alta fidelidad estética. Genera una estructura HTML estilizada mediante CSS de impresión (tipografías premium, colores corporativos, bordes redondeados y badges para estados de reserva) e invoca la interfaz nativa del navegador para guardar el archivo como PDF (`window.print()`). Soporta autenticación híbrida mediante query params para descargas seguras en pestañas nuevas.

### Frontend (Angular)
- **Botón Exportar en Panel Admin**: La pestaña de reportes por rango de fechas incluye los botones **"📥 Exportar CSV"** y **"📄 Exportar PDF"**. Al presionar PDF, se abre una pestaña nueva cargando el reporte pre-renderizado con el cuadro de guardado PDF nativo abierto automáticamente.

---

## ⭐ 7. Módulo de Evaluaciones y Reseñas (RF6.1, RF6.2)

### Backend
- **Creación de Reseña (`POST /api/evaluaciones`)**: Permite calificar una reserva finalizada ingresando comentario, puntuación general, de limpieza y de puntualidad. Valida que una reserva no sea evaluada dos veces.
- **Detalle de Reseñas (`GET /api/evaluaciones/recinto/:id`)**: Calcula el promedio general, promedio de limpieza, promedio de puntualidad, y devuelve la lista completa de comentarios para renderizar en el detalle del recinto.

### Frontend (Angular)
- **Formulario de Reseña en Reservas**: En la sección de reservas finalizadas, se despliega un formulario inline con un selector interactivo de estrellas para calificar la experiencia del recinto.
- **Reseñas en el Detalle del Recinto (`/recintos/:id`)**: En la vista de información del recinto, se añadió un panel lateral/inferior que calcula y muestra de forma atractiva el promedio de calificaciones globales y desglosa las opiniones individuales y puntuaciones de los clientes.

---

## 🚀 8. Instrucciones de Ejecución Local

Para levantar el proyecto en tu entorno local con todos estos cambios, ejecuta los siguientes comandos en dos terminales independientes:

1. **Servidor Express (Backend)**:
   ```bash
   cd "Proyecto Playspot"
   npm run dev
   ```
   *Corre por defecto en `http://localhost:3000` con Nodemon activo.*

2. **Aplicación Angular (Frontend)**:
   ```bash
   cd "PlaySpot_frontend"
   npm start
   ```
   *Corre por defecto en `http://localhost:4200` con Live Reload.*
