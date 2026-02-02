# CodeReasonix

CodeReasonix es una plataforma full stack orientada a desarrolladores jr que buscan mejorar sus habilidades de programación y razonamiento lógico mediante práctica, gamificación y participación en comunidad.

La plataforma combina ejercicios de programación con evaluación automática, rankings, logros, desafíos gamificados (“boss fights”), un módulo de comunidad y un sistema de ofertas laborales.

Tanto la **aplicación web** como la **aplicación móvil** consumen el mismo backend y comparten autenticación, reglas de negocio, progresión del usuario y sistema de gamificación.

---

## 🚀 Funcionalidades Principales

### 👤 Autenticación y Roles
- Registro e inicio de sesión de usuarios
- Gestión de sesión y rutas protegidas
- Roles (usuario / administrador)

### 🧠 Ejercicios de Programación
- Listado de ejercicios con dificultad, etiquetas y lenguaje
- Búsqueda y filtrado avanzado
- Editor de código con guardado de progreso
- Envío de soluciones y validación en backend
- Historial de envíos por ejercicio
- Limitación de envíos (premium)

### 🎮 Gamificación
- Sistema de XP y niveles
- Rachas de actividad (streaks)
- Logros desbloqueables
- Rankings globales, semanales y diarios

### 🧩 Desafíos Gamificados (Boss Fights)
- Desafíos con sistema de HP, recompensas y dificultad
- Preguntas asociadas a cada desafío
- Progreso individual del participante
- Sistema de daño, aciertos y recompensas
- Desafíos grupales

### 💬 Comunidad
- Feed de publicaciones
- Comentarios con hilos de respuesta
- Reacciones a publicaciones y comentarios
- Perfiles públicos de usuarios

### 💼 Empleo
- Listado de ofertas laborales
- Detalle de ofertas y requisitos
- Postulación a ofertas
- Seguimiento del estado de postulaciones
- Gestión de empresas y ofertas 

### 💎 Suscripción Premium
- Integración con Stripe
- Restricción de funcionalidades según suscripción activa
- Gestión del estado de suscripción

### 🛠️ Panel de Administración
- Gestión de usuarios y roles
- Moderación de contenido
- Revisión de reportes de ejercicios
- Gestión de ejercicios, desafíos y ofertas laborales

---

## 📱 Aplicación Móvil

La aplicación móvil utiliza el mismo backend REST y está enfocada en:

- Participación en desafíos (boss fights)
- Comunidad (posts, comentarios y reacciones)
- Ofertas laborales y postulaciones
- Visualización de perfil y progreso del usuario

La sesión se almacena localmente y se valida contra el backend en cada inicio.

---

## 🧱 Stack Tecnológico

### Frontend Web
- React
- Consumo de API REST
- Rutas protegidas y manejo de sesión

### Mobile
- Java
- Consumo de API REST
- Sincronización de estado con backend
- https://github.com/Lucasss1s/CodeReasonixMobile

### Backend
- Node.js
- Express
- PostgreSQL
- Supabase (Auth y Storage)
- Stripe (suscripciones)
- Control de acceso por roles
- Rate limiting y control de envíos

---

## 🧠 Arquitectura

- API REST monolítica
- Backend compartido para web y mobile
- Separación lógica por módulos:
  - Autenticación y sesiones
  - Ejercicios y evaluación
  - Gamificación
  - Comunidad
  - Empleo
  - Administración

## 🔐 Variables de Entorno

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- REDIS_URL
- ALLOW_DEV_ACTIVATE


## 📌 Estado del Proyecto

Proyecto en desarrollo activo, diseñado con foco en escalabilidad, modularidad y extensión futura de funcionalidades.

---

## 📷 Demo

https://docs.google.com/presentation/d/1XhwSFEJAXkbrPPN_Wca2gabd3zy9WiFqlBzCqgeJwrk/edit?usp=drive_link

---

