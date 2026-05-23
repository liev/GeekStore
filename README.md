# 🧌 GOBLIN SPOT

**Marketplace P2P para Coleccionistas — Costa Rica**

Goblin Spot es una plataforma de comercio electrónico orientada a la compra, venta e intercambio de artículos de nicho: TCG (Magic: The Gathering, Pokémon), figuras de colección, videojuegos, cómics y juegos de mesa.

---

## 🚀 Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Backend** | ASP.NET Core 9, Entity Framework Core, PostgreSQL, BCrypt, JWT |
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Vite 7, Zustand |
| **Integraciones** | PayPal (suscripciones), Cloudinary (imágenes), Gemini Vision (moderación IA), Moxfield (import TCG) |
| **Infraestructura** | Docker Compose, Nginx |

---

## 📁 Estructura del Proyecto

```
GeekStore/
├── backend/
│   ├── GeekStore.Api/          # Controllers, Program.cs, Background Workers
│   ├── GeekStore.Application/  # Servicios de negocio (AuthService)
│   ├── GeekStore.Core/         # Entidades, Interfaces, DTOs, Constantes
│   ├── GeekStore.Infrastructure/ # Repositorios, DbContext, Servicios externos
│   └── GeekStore.sln
├── frontend/
│   ├── src/
│   │   ├── api/        # Cliente API centralizado (client.ts)
│   │   ├── components/ # Componentes reutilizables (ErrorBoundary, ProtectedRoute, NotificationBell)
│   │   ├── pages/      # Páginas (Catalog, Dashboard, AdminPanel, Login, etc.)
│   │   └── store/      # Zustand stores (authStore)
│   └── package.json
├── docker-compose.yml
├── .env.example
└── ARCHITECTURE_REPORT.md
```

---

## ⚙️ Requisitos Previos

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/) (o Docker)
- Cuentas de servicio (opcionales para desarrollo):
  - Cloudinary (upload de imágenes)
  - Google Gemini API (moderación IA)
  - PayPal Developer (suscripciones)
  - Email SMTP (verificación)

---

## 🏁 Inicio Rápido (Desarrollo)

### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd GeekStore
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

**Variables requeridas mínimas:**
| Variable | Descripción |
|---|---|
| `JWT_KEY` | Clave secreta para JWT (min 32 caracteres) |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL |
| `POSTGRES_USER` | Usuario de PostgreSQL (default: `geekstore`) |
| `POSTGRES_DB` | Nombre de la base de datos (default: `geekstore`) |

### 3. Backend
```bash
cd backend
dotnet restore
dotnet run --project GeekStore.Api
# → API en http://localhost:5242
# → Health check: http://localhost:5242/health
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# → App en http://localhost:5173
```

---

## 🐳 Docker (Producción)

```bash
# Configurar variables
cp .env.example .env
# Editar .env con valores de producción

# Arrancar todo
docker-compose up -d --build

# Verificar
curl http://localhost:5242/health  # → 200 OK
# Frontend en http://localhost:8080
```

---

## ✨ Funcionalidades Principales

- **Catálogo** con paginación, filtros por categoría/condición/precio y búsqueda
- **Gestión de Productos** con estados (Mint, Near Mint, etc.) y múltiples imágenes
- **Sistema de Órdenes P2P** con métodos de entrega (Pickup en puntos, envío, entrega personal)
- **Suscripciones de Vendedor** integradas con PayPal (planes Gnomo, Duende, Ogro, Goblin King)
- **Moderación con IA** — Gemini Vision valida imágenes contra contenido inapropiado
- **Import de Moxfield** — Importa mazos de TCG como productos automáticamente
- **Sistema de Disputas** con reembolsos y apelaciones
- **Reviews y Ratings** para vendedores
- **Notificaciones** en tiempo real (polling)
- **Autenticación 2FA** con TOTP y códigos de backup
- **Panel Administrativo** completo (usuarios, productos, disputas, reportes de contenido, análisis IA)
- **Bloqueo entre usuarios** — Los productos de usuarios bloqueados se ocultan
- **Reportes de contenido** — Sistema de moderación por la comunidad

---

## 📄 Documentación

| Documento | Descripción |
|---|---|
| [ARCHITECTURE_REPORT.md](ARCHITECTURE_REPORT.md) | Auditoría de arquitectura y seguridad |
| [QA_REPORT.md](QA_REPORT.md) | Reporte de QA con test plan ejecutable |
| [SPRINTS.md](SPRINTS.md) | Plan de sprints y roadmap completo |
| [.env.example](.env.example) | Template de variables de entorno |

---

## 🔒 Seguridad

- Contraseñas hasheadas con **BCrypt**
- Autenticación **JWT** con expiración de 2 horas
- **Rate limiting** en endpoints de autenticación (5 req/min)
- Verificación de email con códigos criptográficamente seguros
- Validación de pagos PayPal server-side antes de otorgar rol de vendedor
- Route Guards en frontend con verificación de rol y expiración de token
- **2FA** con TOTP (compatible con Google Authenticator, Authy, etc.)

---

## 📜 Licencia

Proyecto privado — Todos los derechos reservados.
