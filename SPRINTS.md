# GeekStore — Plan de Sprints Completo

**Estado actual:** ~75% production-ready
**Última actualización:** 2026-03-26
**Convención de tamaño:** XS(<1h) S(1-2h) M(3-5h) L(6-10h) XL(10h+)

---

## ✅ HISTORIAL COMPLETADO

### Sprint 13 — Core Marketplace (2026-03-19)
- Checkout P2P con WhatsApp notifications
- PayPal subscriptions para vendedores + background worker
- Admin panel completo (users, categories, AI dashboard, products, reviews)
- Moxfield TCG import (unificado + individual cards)
- Cloudinary + Gemini Vision image upload/moderation
- Feed personalizado por follows
- Auth JWT + registro + verificación email

### Sprint 14 — Estabilización de Seguridad (2026-03-25)
- [x] Fix TS: `UserProfileDto` faltaba campos de suscripción y rol
- [x] `[JsonIgnore]` en `User.PasswordHash`, `VerificationCode`, `VerificationCodeExpiry`
- [x] `AdminController` → `[Authorize(Roles = "Admin")]`
- [x] `SeedController` → `[Authorize(Roles = "Admin")]`
- [x] `ProductsController.debug-latest` → `[Authorize(Roles = "Admin")]`
- [x] `AdminController.GetUsers()` → proyección DTO sin campos internos
- [x] Fix React: `useEffect` reseñas con dependency correcta
- [x] Feature: `DisputesController` + `Dispute` entity + migración + `disputesApi` frontend
- [x] Pruebas de API: todos los endpoints principales PASS

### Sprint 16 — Security Audit Fixes (2026-03-26)
- [x] **[CRÍTICO A1]** `AuthService.cs`: Passwords ahora hasheados con BCrypt (RegisterAsync) y verificados (LoginAsync)
- [x] **[CRÍTICO A2]** `AuthService.cs`: Eliminada puerta trasera hardcodeada (`goblinlead@goblinspot` / `krenco2026!`) + fallback `vendedor@sistema.com`
- [x] **[CRÍTICO A2]** `AuthService.cs`: JWT fallback de secret key ahora lanza `InvalidOperationException` en vez de usar key pública
- [x] **[ALTO A4]** `SettingsController.cs`: `PUT /Settings/seller-fee` ahora requiere `[Authorize(Roles="Admin")]`
- [x] **[ALTO A5]** `ProductsController.cs`: `import-moxfield` ahora requiere `[Authorize]` y toma SellerId del JWT (no del body)
- [x] **[MEDIO A6]** `AuthController.cs`: Códigos de verificación ahora generados con `RandomNumberGenerator` (criptográficamente seguro)
- [x] **[MEDIO A9]** `UsersController.cs`: `PhoneNumber` en perfil público solo visible para usuarios autenticados
- [x] `SeedController.cs`: Passwords del seed ahora hasheados con BCrypt

### Sprint 17 — Resiliencia, Route Guards y Performance (2026-03-26)
- [x] **[D1]** `App.tsx`: `<Routes>` envuelto en `<ErrorBoundary>` global
- [x] **[D2]** Nuevo `ProtectedRoute.tsx`: verifica JWT (expiración + rol) antes de renderizar ruta
- [x] **[D2]** `/dashboard`, `/my-purchases` protegidas con `ProtectedRoute`; `/admin` con `ProtectedRoute requiredRole="Admin"`
- [x] **[D5]** `authApi.login` en `client.ts` propaga `Error('EMAIL_NOT_VERIFIED')` para que Login.tsx muestre el modal de verificación
- [x] **[C2]** `MyPurchases.tsx`: `useState<Dispute[]>([])` tipado correcto
- [x] **[C4]** `MyPurchases.tsx`: `window.location.reload()` reemplazado por actualización de estado local
- [x] **[B6]** `SettingsController.cs`: endpoint duplicado `PUT /seller-fee` eliminado
- [x] **[E1]** `AuthController.cs`: `ListAllAsync()` + filtro en memoria reemplazado por `FirstOrDefaultAsync`/`AnyAsync`
- [x] **[V4 QA]** `ProductsController.cs`: rama `importIndividually:false` de Moxfield ahora usa `SellerId = sellerId` (JWT) no `request.SellerId`
- [x] Fix TS: `adminDashboardApi.getStats()` agregado en `client.ts`; `Send` no usado eliminado de MyPurchases; `Profile.tsx` firma de `createReview` corregida

### Sprint 15 — QA Fixes + Bugs Catálogo (2026-03-25)
- [x] **[BUG CRÍTICO]** `ProductRepository.GetFilteredProductsAsync`: filtro de categoría ahora incluye subcategorías (hierarchical)
- [x] **[BUG]** `Catalog.tsx`: `sellerFilter` ahora aplicado correctamente a `filteredProducts`
- [x] **[SEGURIDAD CRÍTICA]** `AdminPanel.tsx`: acceso restringido solo a rol Admin (eliminado "hackathon demo" bypass)
- [x] **[BUG]** `Login.tsx`: URLs hardcodeadas `localhost:5242` reemplazadas con `authApi` centralizado
- [x] **[BUG]** `Login.tsx`: body de `resend-code` enviaba string plano en vez de `{ email }` — corregido
- [x] **[BUG]** `Dashboard.tsx`: botón Trash2 sin handler — ahora llama `catalogApi.deleteProduct()`
- [x] Backend: nuevo endpoint `DELETE /Products/{id}` con validación de ownership del vendedor
- [x] `authApi` en `client.ts`: nuevos métodos `verifyEmail()` y `resendCode()` centralizados

---

## ✅ SPRINT 0 — Deploy: Config de Producción (COMPLETADO 2026-03-25)

### Backend — `backend/GeekStore.Api/`
- [x] **[M]** `appsettings.Production.json`: archivo con claves vacías como template
  ```json
  { "Jwt": { "Key": "" }, "Gemini": { "ApiKey": "" },
    "Cloudinary": { "CloudName": "", "ApiKey": "", "ApiSecret": "" },
    "Email": { "SmtpUser": "", "SmtpPassword": "" } }
  ```
- [ ] **[S]** `Program.cs`: CORS dinámico — leer dominios permitidos desde config en vez de hardcoded `localhost:5173`
- [ ] **[S]** `Program.cs`: agregar `app.MapHealthChecks("/health")` con paquete `Microsoft.AspNetCore.Diagnostics.HealthChecks`
- [ ] **[M]** Rate limiting en auth — agregar `Microsoft.AspNetCore.RateLimiting`, limitar `/Auth/login` a 5 req/min por IP
- [ ] **[S]** `SeedController.cs`: envolver con `#if DEBUG` para que no compile en Release
- [ ] **[S]** Validar que `app.UseHttpsRedirection()` funciona correctamente en Docker con proxy reverso

### Config / DevOps — raíz del repo
- [ ] **[S]** `.env.example`: lista de todas las variables necesarias sin valores reales
  ```
  JWT_KEY=
  GEMINI_API_KEY=
  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=
  SMTP_USER=
  SMTP_PASSWORD=
  POSTGRES_PASSWORD=
  PAYPAL_CLIENT_ID=
  ```
- [ ] **[XS]** `docker-compose.yml`: cambiar `POSTGRES_PASSWORD: geekstore123` → `${POSTGRES_PASSWORD}`
- [ ] **[S]** `docker-compose.yml`: agregar sección `environment` al servicio backend leyendo del `.env`
- [ ] **[XS]** `.gitignore`: asegurarse que `.env`, `.env.local`, `appsettings.Production.json` están excluidos

### Frontend — `frontend/`
- [ ] **[S]** `.env.example`: documentar `VITE_PAYPAL_CLIENT_ID=`, `VITE_API_BASE_URL=`
- [ ] **[S]** `src/App.tsx` o `main.tsx`: agregar React Error Boundary global para capturar crashes sin pantalla blanca
- [ ] **[XS]** `vite.config.ts`: configurar `build.sourcemap: false` para producción

### Criterios de aceptación
- `docker-compose up` arranca todo leyendo variables desde `.env`
- `GET /health` → 200 OK
- Login con credencial incorrecta 6 veces → 429 Too Many Requests
- `POST /api/seed/reset` sin token → 401

---

## ✅ SPRINT 1 — UI Completa de Disputas (COMPLETADO 2026-03-25)

### Frontend — `frontend/src/pages/AdminPanel.tsx`
- [ ] **[XS]** Agregar `'disputas'` al tipo de `activeTab` (línea 29)
- [ ] **[XS]** Agregar botón de tab "Disputas" junto a las demás tabs
- [ ] **[M]** Tabla de disputas:
  - Columnas: ID, Orden #, Iniciador, Afectado, Razón, Status (badge), Fecha
  - Filtro toggle: Abiertas / Resueltas / Todas
  - Fetch: `disputesApi.getAllAdmin(token)` al entrar a la tab
- [ ] **[S]** Modal "Resolver Disputa":
  - Campo textarea para resolución del admin
  - Botones: Cancelar / Confirmar Resolución
  - Llama `disputesApi.resolveAdmin(id, resolution, token)`
  - Actualiza lista local tras resolución

### Frontend — `frontend/src/pages/MyPurchases.tsx`
- [ ] **[S]** Verificar que modal "Abrir Disputa" funciona y llama `disputesApi.open(orderId, reason, token)`
- [ ] **[S]** Mostrar badge o indicador en la orden si tiene disputa activa (`status === 'Open'`)
- [ ] **[XS]** Deshabilitar botón "Abrir Disputa" si ya hay una disputa activa en esa orden

### Backend — `backend/GeekStore.Api/Controllers/`
- [ ] **[S]** `DisputesController.cs`: agregar endpoint `PUT /Admin/disputes/{id}/resolve` si no existe
- [ ] **[S]** Al resolver disputa: enviar `Notification` a `InitiatorUser` y `TargetUser` con la resolución
- [ ] **[XS]** Al resolver disputa con acción "cancelar orden": actualizar `Order.Status = "Cancelled"`

### `frontend/src/api/client.ts`
- [ ] **[XS]** Verificar que `disputesApi.getAllAdmin` y `disputesApi.resolveAdmin` existen y están correctos

### Criterios de aceptación
- Admin puede ver lista de disputas, filtrar por status
- Admin puede resolver disputa con texto de resolución
- Ambas partes reciben notificación al resolverse
- Comprador puede abrir disputa desde MyPurchases, no puede abrir dos en la misma orden

---

## ✅ SPRINT 2 — Sistema de Puntos de Entrega (COMPLETADO 2026-03-26)

### Backend — nuevos archivos
- [ ] **[S]** `GeekStore.Core/Interfaces/IDeliveryPointRepository.cs`
  ```csharp
  Task<IReadOnlyList<DeliveryPoint>> GetAllAsync();
  Task<DeliveryPoint> AddAsync(DeliveryPoint point);
  Task UpdateAsync(DeliveryPoint point);
  Task DeleteAsync(int id);
  ```
- [ ] **[S]** `GeekStore.Infrastructure/Repositories/DeliveryPointRepository.cs` — implementación
- [ ] **[S]** `GeekStore.Api/Controllers/DeliveryPointsController.cs`:
  - `GET /DeliveryPoints` — público, lista todos los activos
  - `POST /DeliveryPoints` — `[Authorize(Roles = "Admin")]`
  - `PUT /DeliveryPoints/{id}` — `[Authorize(Roles = "Admin")]`
  - `DELETE /DeliveryPoints/{id}` — `[Authorize(Roles = "Admin")]` (soft delete, `IsActive = false`)
- [ ] **[XS]** Registrar `IDeliveryPointRepository` → `DeliveryPointRepository` en `Program.cs`
- [ ] **[S]** Migración con seed de 5-10 puntos de entrega iniciales en Costa Rica (CORREOS, Walmart, etc.)

### Frontend — `frontend/src/api/client.ts`
- [ ] **[S]** Agregar `deliveryPointsApi`:
  ```typescript
  getAll: async (): Promise<DeliveryPoint[]>
  create: async (data, token): Promise<DeliveryPoint>
  update: async (id, data, token): Promise<void>
  delete: async (id, token): Promise<void>
  ```
- [ ] **[XS]** Agregar `DeliveryPoint` interface: `{ id, name, address, isActive }`

### Frontend — Checkout en `Catalog.tsx`
- [ ] **[M]** Cuando método de entrega = "Pickup": mostrar dropdown/lista de puntos
  - Fetch `deliveryPointsApi.getAll()` al montar checkout
  - Guardar `deliveryPointId` seleccionado en el estado del carrito
  - Pasar `deliveryPointId` en el `CreateOrderDto`

### Frontend — AdminPanel
- [ ] **[M]** Nueva sección/tab "Puntos de Entrega":
  - Tabla: Nombre, Dirección, Estado (activo/inactivo)
  - Botón "Agregar" → modal con formulario
  - Botón "Editar" por fila
  - Toggle activar/desactivar

### Frontend — MyPurchases / Dashboard vendedor
- [ ] **[S]** Mostrar nombre del punto de entrega en detalle de orden cuando `deliveryMethod === 'Pickup'`

### Criterios de aceptación
- Lista de puntos visible en checkout al seleccionar Pickup
- Orden creada con `deliveryPointId` correcto
- Admin puede CRUD puntos de entrega
- Punto de entrega visible en detalle de orden

---

## ✅ SPRINT 3 — Validación Real de PayPal (COMPLETADO 2026-03-26)
- [x] `IPayPalService` + `PayPalService` — verifica orden contra PayPal REST API (`status == COMPLETED`)
- [x] `UpgradeToSeller` llama `VerifyOrderAsync` antes de otorgar rol Seller; devuelve 400 si falla
- [x] `GET /Settings/paypal-client-id` — frontend obtiene Client ID del backend en vez de `.env`
- [x] `appsettings.json`: sección `PayPal: { ClientId, ClientSecret, Mode }` con placeholders
- [x] Dashboard: `paypalClientId` del backend, loading state, mensajes en UI (sin `alert()` ni `window.location.reload()`)
- [x] Estado local actualizado tras pago exitoso (Role, Plan, EndDate, AutoRenew)

**Para activar:** Llena `PayPal__ClientId` y `PayPal__ClientSecret` como env vars o en `appsettings.Development.json`. Cambia `Mode` a `live` en producción.

**Prioridad:** MEDIA — actualmente cualquier string activa la suscripción
**Estimación:** 4-5 días

### Backend — `backend/GeekStore.Api/`
- [ ] **[S]** Agregar paquete `PayPalCheckoutSdk` o HTTP client para PayPal REST API
- [ ] **[L]** `UsersController.UpgradeToSeller()` (línea 147):
  - Llamar a PayPal API `GET /v2/checkout/orders/{orderId}` para verificar
  - Validar que `status === "COMPLETED"` y el monto coincide con el plan
  - Solo hacer upgrade si PayPal confirma el pago
- [ ] **[M]** Nuevo endpoint `POST /Webhooks/paypal`:
  - Recibir eventos de PayPal (BILLING.SUBSCRIPTION.RENEWED, BILLING.SUBSCRIPTION.CANCELLED)
  - Verificar firma del webhook con PayPal Webhook SDK
  - Actualizar `SubscriptionEndDate` y `AutoRenew` según evento
- [ ] **[S]** `SubscriptionWorker.cs`: cuando suscripción vence y `AutoRenew = true`, crear cargo via PayPal API (actualmente solo desactiva)
- [ ] **[XS]** Mover `PAYPAL_CLIENT_ID` de frontend a variable de entorno del backend; crear endpoint `GET /Settings/paypal-client-id` que devuelve el ID al frontend

### Frontend — `frontend/src/pages/Dashboard.tsx`
- [ ] **[S]** Estado de loading durante procesamiento de pago PayPal (spinner mientras espera confirmación backend)
- [ ] **[S]** Manejo de error si PayPal falla: mensaje claro al usuario
- [ ] **[S]** Obtener `VITE_PAYPAL_CLIENT_ID` desde `GET /Settings/paypal-client-id` en vez de `.env`

### Criterios de aceptación
- Upgrade a vendedor solo funciona con `orderId` real de PayPal completado
- Webhook recibe y procesa renovaciones automáticas
- Frontend no tiene el client ID hardcodeado

---

## ✅ SPRINT 4 — Sistema de Reembolsos y Apelaciones (COMPLETADO 2026-03-27)

### Backend — nuevos archivos
- [ ] **[S]** `GeekStore.Core/Entities/Refund.cs`:
  ```csharp
  Id, DisputeId, UserId (beneficiario), Amount, Status (Pending/Processed/Rejected), CreatedAt, ProcessedAt
  ```
- [ ] **[XS]** Migración `AddRefunds`
- [ ] **[S]** `GeekStore.Core/Interfaces/IRefundRepository.cs`
- [ ] **[S]** `GeekStore.Infrastructure/Repositories/RefundRepository.cs`

### Backend — modificar existentes
- [ ] **[M]** `DisputesController.cs` o `AdminController.cs`:
  - `PUT /Admin/disputes/{id}/resolve`: si `resolution` incluye "reembolso" o campo `issueRefund: true`, crear `Refund`
  - Nuevo `GET /Admin/refunds` — lista todos los reembolsos
  - `PUT /Admin/refunds/{id}/process` — marcar como procesado manualmente
- [ ] **[S]** `Dispute` entity: agregar campo `Status` con valor `"Appealed"` además de `"Open"` / `"Resolved"`
- [ ] **[S]** Nuevo endpoint `POST /Disputes/{id}/appeal` — solo si `Status === "Resolved"` y el usuario es parte de la disputa
- [ ] **[S]** Notificaciones: al crear reembolso, al procesar reembolso, al recibir apelación

### Frontend — `frontend/src/api/client.ts`
- [ ] **[S]** `refundsApi.getMyRefunds(token)`, `disputesApi.appeal(id, token)`
- [ ] **[XS]** Interfaz `Refund`

### Frontend — `frontend/src/pages/MyPurchases.tsx`
- [ ] **[S]** Sección "Reembolsos": lista reembolsos pendientes/procesados con status
- [ ] **[S]** Botón "Apelar" en disputa resuelta (visible 48h después de resolución)

### Frontend — AdminPanel
- [ ] **[M]** Tab "Reembolsos": tabla con beneficiario, monto, disputa relacionada, status
- [ ] **[S]** Botón "Marcar como procesado" — llama `PUT /Admin/refunds/{id}/process`
- [ ] **[S]** Tab "Apelaciones" o badge en tab Disputas mostrando disputas en estado `"Appealed"`

### Criterios de aceptación
- Admin puede ver y gestionar reembolsos
- Comprador puede apelar una disputa resuelta dentro de 48h
- Reembolso procesado genera notificación al beneficiario

---

## 🟡 SPRINT 5 — Reportes de Contenido
**Prioridad:** MEDIA — necesario para un marketplace seguro
**Estimación:** 3-4 días

### Backend — nuevos archivos
- [ ] **[S]** `GeekStore.Core/Entities/ProductReport.cs`:
  ```csharp
  Id, ReporterUserId, ProductId, Reason (enum: Spam/Fake/Inappropriate/Fraud/Other),
  Description, Status (Pending/Reviewed/ActionTaken/Dismissed), CreatedAt
  ```
- [ ] **[XS]** Migración `AddProductReports`
- [ ] **[S]** `POST /Products/{id}/report` — `[Authorize]`, un usuario no puede reportar el mismo producto dos veces
- [ ] **[S]** `GET /Admin/reports` — lista de reportes pendientes con producto e info del reportador
- [ ] **[XS]** `PUT /Admin/reports/{id}/dismiss` y `PUT /Admin/reports/{id}/resolve` (resolve = desactiva el producto)
- [ ] **[XS]** Notificación al vendedor cuando su producto es desactivado por reporte

### Frontend — `frontend/src/api/client.ts`
- [ ] **[XS]** `reportsApi.reportProduct(productId, reason, description, token)`
- [ ] **[XS]** `reportsApi.getAdminReports(token)`, `dismissReport(id, token)`, `resolveReport(id, token)`
- [ ] **[XS]** Interface `ProductReport`

### Frontend — Catálogo / Vista de producto
- [ ] **[S]** Botón "⚑ Reportar" en menú de producto (3 puntos o ícono), visible solo si autenticado
- [ ] **[S]** Modal de reporte: selección de razón + descripción opcional + botón enviar
- [ ] **[XS]** Confirmación: "Tu reporte fue enviado. El equipo lo revisará."

### Frontend — AdminPanel
- [ ] **[M]** Tab "Reportes": tabla con producto, razón, reportador, fecha
- [ ] **[S]** Acciones por fila: "Desestimar" / "Tomar Acción" (desactiva producto)
- [ ] **[XS]** Badge con conteo de reportes pendientes en el tab

### Criterios de aceptación
- Usuario puede reportar un producto (solo una vez por producto)
- Admin ve reportes pendientes con contexto
- "Tomar Acción" desactiva el producto y notifica al vendedor

---

## 🟡 SPRINT 6 — Wishlist / Favoritos
**Prioridad:** MEDIA-BAJA — mejora conversión
**Estimación:** 2-3 días

### Backend — nuevos archivos
- [ ] **[S]** `GeekStore.Core/Entities/WishlistItem.cs`: `Id, UserId, ProductId, AddedAt`
- [ ] **[XS]** Migración `AddWishlist`
- [ ] **[S]** `GET /Wishlist` — `[Authorize]`, productos guardados del usuario con info completa
- [ ] **[S]** `POST /Wishlist/{productId}` — agregar, idempotente
- [ ] **[XS]** `DELETE /Wishlist/{productId}` — quitar

### Frontend — `frontend/src/api/client.ts`
- [ ] **[S]** `wishlistApi.getAll(token)`, `add(productId, token)`, `remove(productId, token)`
- [ ] **[XS]** Interface `WishlistItem`

### Frontend — Catálogo `frontend/src/pages/Catalog.tsx`
- [ ] **[S]** Ícono de corazón en card de producto (♡ vacío / ♥ lleno según wishlist)
- [ ] **[XS]** Click en corazón: toggle add/remove de wishlist (sin recargar página)
- [ ] **[XS]** Estado de wishlist cargado al montar el catálogo si usuario está autenticado

### Frontend — nueva página `frontend/src/pages/Wishlist.tsx`
- [ ] **[M]** Página `/wishlist`: grid de productos guardados
  - Mismo card style que catálogo
  - Botón "Quitar de favoritos" en cada card
  - Estado vacío: "Aún no tienes favoritos guardados"
- [ ] **[XS]** Agregar ruta `/wishlist` en `App.tsx`
- [ ] **[XS]** Link a `/wishlist` en navbar/header

### Criterios de aceptación
- Usuario puede guardar/quitar productos con un click
- Página de wishlist muestra productos con info actualizada
- Si producto se agota, aparece con badge "Sin stock" en wishlist

---

## 🟢 SPRINT 7 — Bloqueo entre Usuarios
**Prioridad:** BAJA
**Estimación:** 2-3 días

### Backend — nuevos archivos
- [ ] **[S]** `GeekStore.Core/Entities/UserBlock.cs`: `Id, BlockerId, BlockedId, CreatedAt`
- [ ] **[XS]** Migración `AddUserBlocks`
- [ ] **[S]** `POST /Users/{id}/block` — `[Authorize]`
- [ ] **[XS]** `DELETE /Users/{id}/unblock` — `[Authorize]`
- [ ] **[XS]** `GET /Users/blocked` — lista de usuarios bloqueados por el autenticado
- [ ] **[S]** `OrdersController`: verificar que comprador no esté bloqueado por el vendedor antes de crear orden
- [ ] **[S]** `ProductRepository`: excluir productos de usuarios bloqueados del catálogo del comprador

### Frontend — `frontend/src/api/client.ts`
- [ ] **[XS]** `usersApi.block(id, token)`, `unblock(id, token)`, `getBlocked(token)`

### Frontend — `frontend/src/pages/Profile.tsx`
- [ ] **[S]** Botón "Bloquear usuario" en perfil de vendedor (visible si no es el propio perfil)
- [ ] **[XS]** Toggle: si ya está bloqueado, mostrar "Desbloquear"
- [ ] **[XS]** Confirmación antes de bloquear

### Frontend — Dashboard (`frontend/src/pages/Dashboard.tsx`)
- [ ] **[S]** Sección "Usuarios bloqueados" en configuración de cuenta
  - Lista de usuarios bloqueados
  - Botón "Desbloquear" por item

### Criterios de aceptación
- Productos de usuarios bloqueados no aparecen en el catálogo
- Comprador bloqueado por vendedor no puede crear orden
- Usuario puede ver y gestionar su lista de bloqueos

---

## 🟢 SPRINT 8 — Historial Financiero y Exportes
**Prioridad:** BAJA
**Estimación:** 3-4 días

### Backend
- [ ] **[M]** `GET /Sellers/transactions` — `[Authorize(Roles = "Seller")]`:
  - Parámetros: `from`, `to` (fechas), `page`, `pageSize`
  - Devuelve: lista de órdenes completadas con items, monto, comprador, fecha
- [ ] **[S]** `GET /Sellers/transactions/summary` — totales por periodo (semana/mes/año)
- [ ] **[S]** `GET /Sellers/transactions/export` — devuelve CSV de todas las ventas

### Frontend — `frontend/src/pages/Dashboard.tsx`
- [ ] **[M]** Nueva tab "Finanzas" en el dashboard del vendedor:
  - Resumen: total mes actual, total año, órdenes completadas
  - Tabla de transacciones con paginación
  - Filtro por rango de fechas
- [ ] **[S]** Botón "Exportar CSV" → descarga el archivo
- [ ] **[XS]** Mini gráfico de barras (ventas por semana últimas 4 semanas) — usar librería ligera como `recharts`

### Criterios de aceptación
- Vendedor ve historial completo de ventas con filtros
- Export CSV descarga correctamente con datos reales
- Resumen financiero muestra totales correctos

---

## 🟢 SPRINT 9 — Autenticación de Dos Factores (2FA)
**Prioridad:** BAJA
**Estimación:** 3-4 días

### Backend
- [ ] **[S]** Agregar paquete `Otp.NET` para generación de TOTP
- [ ] **[M]** `User` entity: nuevos campos `TwoFactorEnabled`, `TwoFactorSecret` (`[JsonIgnore]`)
- [ ] **[XS]** Migración `AddTwoFactor`
- [ ] **[S]** `POST /Auth/2fa/setup` — genera secret + QR URI, devuelve al frontend
- [ ] **[S]** `POST /Auth/2fa/verify-setup` — verifica código TOTP para activar
- [ ] **[S]** `POST /Auth/2fa/disable` — desactiva 2FA
- [ ] **[M]** `POST /Auth/login`: si user tiene 2FA activo, responde con `{ requiresTwoFactor: true, tempToken }` en lugar del JWT final
- [ ] **[S]** `POST /Auth/2fa/validate` — recibe `tempToken` + código TOTP, devuelve JWT final
- [ ] **[S]** Códigos de backup: generar 8 códigos one-time al activar 2FA

### Frontend — `frontend/src/pages/Login.tsx`
- [ ] **[S]** Si respuesta de login tiene `requiresTwoFactor: true`, mostrar campo para código 2FA
- [ ] **[XS]** Submit del código llama `POST /Auth/2fa/validate`

### Frontend — `frontend/src/pages/Dashboard.tsx`
- [ ] **[M]** Sección "Seguridad de Cuenta":
  - Toggle para activar/desactivar 2FA
  - Al activar: mostrar QR code para escanear con Authenticator + campo para verificar
  - Al activar: mostrar códigos de backup con opción de copiar/descargar
- [ ] **[XS]** Indicador visual si 2FA está activo (badge verde)

### Criterios de aceptación
- Usuario puede activar 2FA escaneando QR
- Login con 2FA activo requiere código TOTP adicional
- Códigos de backup funcionan como alternativa al TOTP

---

## 🟢 SPRINT 10 — Push Notifications en Tiempo Real
**Prioridad:** BAJA
**Estimación:** 3-4 días

### Backend
- [ ] **[S]** Agregar `Microsoft.AspNetCore.SignalR` o usar Server-Sent Events (SSE)
- [ ] **[M]** Hub SignalR `NotificationsHub` — autenticado, envía notificación a usuario específico por su ID
- [ ] **[S]** Modificar todos los lugares donde se crea `Notification` (AdminController, OrdersController, ReviewsController, DisputesController) para que también envíen via SignalR al usuario conectado
- [ ] **[XS]** Registrar SignalR en `Program.cs`, mapear hub en `/hubs/notifications`

### Frontend
- [ ] **[S]** Instalar `@microsoft/signalr` npm package
- [ ] **[M]** Hook `useNotifications(token)`:
  - Conecta a SignalR hub en mount
  - Escucha evento `ReceiveNotification`
  - Agrega notificación a estado global (Zustand o Context)
  - Desconecta en unmount
- [ ] **[S]** Bell icon en navbar actualiza count en tiempo real sin polling
- [ ] **[S]** Toast notification pop-up al recibir nueva notificación (esquina inferior derecha)

### Criterios de aceptación
- Nuevas notificaciones llegan en tiempo real sin recargar
- Toast aparece cuando llega nueva notificación
- Contador del bell se actualiza en tiempo real

---

## 🔵 SPRINT 11 — Mejoras de UI/UX Generales
**Prioridad:** BAJA — polish
**Estimación:** 3-4 días

### Frontend — mejoras de usabilidad
- [ ] **[S]** Catálogo: skeleton loading cards mientras carga productos (actualmente spinner genérico)
- [ ] **[S]** Catálogo: botón "Volver arriba" al hacer scroll largo
- [ ] **[S]** Catálogo: breadcrumb de categoría seleccionada
- [ ] **[S]** Dashboard vendedor: confirmación al eliminar producto permanentemente
- [ ] **[S]** Checkout: resumen del carrito visible durante todo el proceso (sticky sidebar)
- [ ] **[M]** Mobile responsive: revisar y arreglar breakpoints en AdminPanel y Dashboard (actualmente mayormente desktop)
- [ ] **[XS]** Favicon y meta title dinámico por página
- [ ] **[XS]** Página 404 custom con link a catálogo
- [ ] **[XS]** Loading state más informativo en login (`"Iniciando sesión..."` en lugar de spinner vacío)

### Frontend — Admin Panel
- [ ] **[S]** Confirmación antes de ban/suspend de usuario (actualmente ejecuta directo)
- [ ] **[S]** Búsqueda por nombre/email en tabla de usuarios del admin
- [ ] **[S]** Paginación en tabla de usuarios (actualmente carga todos)

### Criterios de aceptación
- Catálogo muestra skeletons en lugar de spinner
- AdminPanel tiene confirmación en acciones destructivas
- Búsqueda de usuarios funciona en admin

---

## 🔵 SPRINT 12 — SEO y Performance
**Prioridad:** BAJA — importante para visibilidad orgánica
**Estimación:** 5-7 días

### Opción A: Meta tags básicos (sin SSR) — RECOMENDADO primero
- [ ] **[S]** `index.html`: Open Graph tags genéricos para la app
- [ ] **[S]** `react-helmet-async` para actualizar `<title>` y meta description por página
- [ ] **[S]** Página de producto: `<title>` = nombre del producto, meta description = descripción truncada

### Opción B: SSR con Next.js — si SEO es prioritario
- [ ] **[XL]** Migración del frontend de Vite/React a Next.js App Router
  - Requiere reescribir rutas, componentes de página
  - Preservar toda la lógica de API calls
  - Configurar Static Generation para catálogo, SSR para producto individual
- Nota: **Solo hacer si se decide que SEO es crítico para el modelo de negocio**

### Performance
- [ ] **[M]** Imágenes: usar `loading="lazy"` en todas las imágenes de producto
- [ ] **[S]** API: agregar paginación cursor-based en catálogo para mejor performance con muchos productos
- [ ] **[S]** Frontend: code splitting por ruta (Vite ya lo hace automáticamente — verificar tamaños de bundle)

### Criterios de aceptación
- `<title>` de página de producto incluye nombre del producto
- Lighthouse score > 80 en Performance y SEO

---

## 🔵 SPRINT 13 (FUTURO) — Chat P2P Integrado
**Prioridad:** MUY BAJA — WhatsApp cubre esto actualmente
**Estimación:** 7-10 días

### Backend
- [ ] **[S]** `Message` entity: `Id, ConversationId, SenderId, Content, SentAt, IsRead`
- [ ] **[S]** `Conversation` entity: `Id, User1Id, User2Id, CreatedAt`
- [ ] **[XS]** Migraciones
- [ ] **[M]** `MessagesController`: `GET /Messages/conversations`, `GET /Messages/conversations/{id}`, `POST /Messages/conversations/{id}`
- [ ] **[L]** SignalR hub para mensajes en tiempo real

### Frontend
- [ ] **[L]** UI de chat: lista de conversaciones + vista de chat con scroll infinito
- [ ] **[M]** Botón "Enviar mensaje" en perfil de vendedor que abre/crea conversación
- [ ] **[S]** Notificación de nuevo mensaje (integrar con sistema de notificaciones)

---

## 🚀 SPRINT DEPLOY — Lanzamiento a Producción
**Prerequisitos:** Sprint 0 completado. Mínimo S1 completado.
**Estimación:** 1-2 días

### Infraestructura
- [ ] **[M]** Contratar VPS o plan en Railway/Render
- [ ] **[S]** Registrar dominio (ej. `geekstore.cr`)
- [ ] **[S]** Configurar DNS (A record apuntando al servidor)
- [ ] **[M]** Configurar Nginx como proxy reverso con SSL (Certbot + Let's Encrypt):
  ```nginx
  - api.geekstore.cr → backend :5242
  - geekstore.cr → frontend :80
  ```
- [ ] **[S]** Subir secrets reales al servidor (JWT key, APIs keys) como variables de entorno del sistema
- [ ] **[S]** `docker-compose up -d --build` en producción
- [ ] **[XS]** `dotnet ef database update` para aplicar migraciones (incluyendo `AddDisputes`)
- [ ] **[XS]** `POST /api/seed` con token Admin para poblar datos iniciales

### Verificación post-deploy
- [ ] `GET https://api.geekstore.cr/health` → 200
- [ ] Login funciona
- [ ] Crear producto con imagen → imagen sube a Cloudinary
- [ ] Email de verificación llega al registrarse
- [ ] PayPal sandbox funciona end-to-end

### Monitoreo básico
- [ ] **[S]** Uptime monitoring gratuito: UptimeRobot o Better Uptime (alerta si cae)
- [ ] **[S]** Logs: configurar `Serilog` con output a archivo para tener trazabilidad

---

## 📊 RESUMEN EJECUTIVO

| Sprint | Descripción | Días | Estado |
|--------|-------------|------|--------|
| S0 | Config producción | 2-3 | 🔴 BLOQUEADOR |
| S1 | UI Disputas | 1-2 | 🟠 Próximo |
| S2 | Delivery Points | 3-4 | 🟠 Alta |
| S3 | PayPal real | 4-5 | 🟡 Media |
| S4 | Reembolsos | 5-7 | 🟡 Media |
| S5 | Reportes | 3-4 | 🟡 Media |
| S6 | Wishlist | 2-3 | 🟡 Media |
| S7 | Bloqueos | 2-3 | 🟢 Baja |
| S8 | Finanzas | 3-4 | 🟢 Baja |
| S9 | 2FA | 3-4 | 🟢 Baja |
| S10 | Push notifications | 3-4 | 🟢 Baja |
| S11 | UI/UX polish | 3-4 | 🔵 Futuro |
| S12 | SEO/Performance | 5-7 | 🔵 Futuro |
| S13 | Chat P2P | 7-10 | 🔵 Futuro |
| DEPLOY | Lanzamiento | 1-2 | 🚀 Post-S0 |

**MVP mínimo deployable:** S0 + DEPLOY = 3-5 días
**MVP sólido (recomendado):** S0 → S6 = ~3 semanas
**Producto completo:** Todos = ~2 meses

---

*Actualizar al completar cada tarea — archivo fuente de verdad del proyecto*
