# Informe de Arquitectura — GeekStore
**Fecha:** 2026-03-26
**Evaluado por:** Agente Arquitecto

---

## Resumen Ejecutivo

GeekStore es un marketplace P2P funcional con una base arquitectónica razonable (Clean Architecture, JWT, paginación, workers de background), pero presenta riesgos críticos de seguridad que deben resolverse antes de cualquier despliegue en producción. El problema más grave es la ausencia total de hashing de contraseñas: las credenciales se almacenan en texto plano y se comparan directamente. Adicionalmente, existe una puerta trasera de administrador hardcodeada en el código de producción. En el frontend, el árbol de rutas carece de Route Guards, la API base está hardcodeada a localhost, y los tipos `any` proliferan en componentes críticos del panel de administración. La resiliencia del sistema ante errores de red es inconsistente, con varios endpoints que silencian excepciones en lugar de propagarlas. Se estima que el sistema necesita al menos 2 sprints de correcciones de seguridad y arquitectura antes de ser desplegable de forma segura.

---

## BLOQUE A — Observaciones de Seguridad

### A1. Contraseñas almacenadas en texto plano — Sin hashing
- **Archivo:** `backend/GeekStore.Application/Services/AuthService.cs:47-51`
- **Problema:** `RegisterAsync` guarda la contraseña directamente en `PasswordHash` sin aplicar ningún algoritmo de hash. El comentario `// user.PasswordHash = Hash(password);` confirma que esto fue intencionalmente omitido. La comparación en `LoginAsync` tampoco verifica hash alguno (línea 44: `return GenerateJwtToken(user)` sin comparar password).
- **Impacto:** CRÍTICO
- **Acción para Dev:** Instalar `BCrypt.Net-Next` (NuGet). En `RegisterAsync`, reemplazar la línea de asignación por `user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);`. En `LoginAsync`, agregar la verificación: `if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)) return string.Empty;` inmediatamente antes de `GenerateJwtToken`. Migrar los usuarios de seed en `SeedController.cs:72-119` para que usen BCrypt en sus `PasswordHash`.
- **Test para QA:** 1) Registrar un usuario vía `POST /api/Auth/register`. 2) Consultar directamente la DB: el campo `PasswordHash` NO debe contener la contraseña en texto. 3) Intentar login con contraseña correcta — debe retornar 200. 4) Intentar login con contraseña incorrecta — debe retornar 401.

---

### A2. Puerta trasera de administrador hardcodeada en código de producción
- **Archivo:** `backend/GeekStore.Application/Services/AuthService.cs:33-35`
- **Problema:** Existe un bypass explícito con credenciales hardcodeadas (`goblinlead@globlinspot` / `krenco2026!`) que crea un token de Admin con `Id=0`. Este usuario no existe en la base de datos, no tiene verificación de email y no puede ser baneado ni auditado.
- **Impacto:** CRÍTICO
- **Acción para Dev:** Eliminar completamente el bloque `if (email == "goblinlead@globlinspot" ...)` (líneas 33-35) y el bloque de fallback `else if (email == "vendedor@sistema.com" ...)` (líneas 37-39). Si se necesita un admin de emergencia, crearlo como usuario real en la DB con rol "Admin" usando el SeedController.
- **Test para QA:** Intentar `POST /api/Auth/login` con body `{"email":"goblinlead@globlinspot","password":"krenco2026!"}`. Debe retornar 401 o 400 (no un token de Admin).

---

### A3. Verificación de PayPal no implementada — Upgrade a Seller sin validación de pago
- **Archivo:** `backend/GeekStore.Api/Controllers/UsersController.cs:147-148`
- **Problema:** El endpoint `POST /api/users/upgrade-to-seller` asume éxito del pago con el comentario `// PayPal verification would happen here. Assumed successful for MVP.`. Cualquier usuario autenticado puede llamar este endpoint y convertirse en Seller sin pagar.
- **Impacto:** CRÍTICO
- **Acción para Dev:** Implementar verificación del `orderId` de PayPal antes de cambiar el rol. Usar la PayPal Orders API (`GET https://api.paypal.com/v2/checkout/orders/{orderId}`) con las credenciales de la aplicación. Verificar que el `status` sea `"COMPLETED"` y que el monto coincida con `sellerFee`. Solo entonces proceder con el upgrade. Si la verificación falla, retornar `400 BadRequest`.
- **Test para QA:** 1) Con un token de usuario "Buyer", llamar `POST /api/users/upgrade-to-seller` con un `orderId` inventado (ej: `"fake-order-123"`). El sistema NO debe cambiar el rol a Seller. 2) Verificar con `GET /api/users/me` que el rol sigue siendo "Buyer".

---

### A4. Endpoint `PUT /api/Settings/seller-fee` sin restricción de rol Admin
- **Archivo:** `backend/GeekStore.Api/Controllers/SettingsController.cs:29-44`
- **Problema:** El endpoint `PUT /api/Settings/seller-fee` solo tiene `[Authorize]` (cualquier usuario autenticado), no `[Authorize(Roles="Admin")]`. Cualquier Buyer o Seller puede cambiar la tarifa mensual del sistema.
- **Impacto:** ALTO
- **Acción para Dev:** Cambiar el atributo en la línea 29 de `[Authorize]` a `[Authorize(Roles = "Admin")]`.
- **Test para QA:** 1) Obtener un token JWT de un usuario con rol "Seller". 2) Llamar `PUT /api/Settings/seller-fee` con ese token y body `{"newFee": "0.01"}`. Debe retornar 403 Forbidden.

---

### A5. Endpoint `POST /api/Products/import-moxfield/{publicId}` sin autenticación
- **Archivo:** `backend/GeekStore.Api/Controllers/ProductsController.cs:182-242`
- **Problema:** `ImportMoxfieldDeck` no tiene ningún atributo `[Authorize]`. Cualquier actor anónimo puede hacer importaciones masivas de productos en nombre de cualquier `SellerId` pasado en el body (línea 204: `SellerId = request.SellerId`). Además, el `SellerId` proviene del cliente, no del JWT — permitiendo que un usuario importe productos a nombre de otro vendedor.
- **Impacto:** ALTO
- **Acción para Dev:** 1) Agregar `[Authorize]` al método. 2) Ignorar `request.SellerId` del body y obtener el sellerId del JWT: `var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value; int.TryParse(userIdClaim, out var sellerId);`. Usar ese `sellerId` en todos los productos creados.
- **Test para QA:** 1) Sin token, llamar `POST /api/Products/import-moxfield/testDeck` — debe retornar 401. 2) Con token de un Seller, verificar que los productos creados tengan el `SellerId` del token, no el del body.

---

### A6. Código de verificación de email generado con `new Random()` — No criptográfico
- **Archivo:** `backend/GeekStore.Api/Controllers/AuthController.cs:56` y `122`
- **Problema:** `new Random().Next(100000, 999999)` usa el generador de números pseudoaleatorio estándar, que no es criptográficamente seguro. Un atacante con acceso de tiempo puede predecir los códigos.
- **Impacto:** MEDIO
- **Acción para Dev:** Reemplazar `new Random().Next(100000, 999999).ToString()` por `RandomNumberGenerator.GetInt32(100000, 999999).ToString()` (importar `System.Security.Cryptography`). Aplicar este cambio en ambas ocurrencias (líneas 56 y 122).
- **Test para QA:** Solicitar 10 códigos de verificación seguidos para distintos correos. Los códigos no deben ser secuenciales ni predecibles. Verificar que cada código funciona correctamente para su email respectivo.

---

### A7. JWT con hardcoded fallback inseguro en Program.cs y AuthService
- **Archivo:** `backend/GeekStore.Api/Program.cs:27` y `backend/GeekStore.Application/Services/AuthService.cs:56`
- **Problema:** Si `Jwt:Key` no está configurado, el sistema usa `"ThisIsASecretKeyForJWTTokenGenerationEnsureItIsAtLeast32BytesLong!"` como fallback. Este secreto es público (está en el repositorio) y cualquiera puede forjar tokens válidos si el despliegue no configura la variable.
- **Impacto:** ALTO
- **Acción para Dev:** Eliminar los fallbacks `?? "ThisIsASecretKey..."` en ambos archivos. En su lugar, lanzar una excepción en startup si la clave no está configurada: `var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key must be configured");`. Asegurar que el pipeline de CI/CD requiera esta variable de entorno.
- **Test para QA:** Desplegar sin configurar `Jwt:Key`. La aplicación debe fallar al iniciar con un mensaje de error claro (no arrancar silenciosamente con el fallback).

---

### A8. Verificación de email no requerida antes de cambiar contraseña / acciones sensibles
- **Archivo:** `backend/GeekStore.Api/Controllers/AuthController.cs:88-131`
- **Problema:** No existe endpoint de recuperación de contraseña. Un usuario que pierde acceso a su cuenta no tiene forma de recuperarla. Adicionalmente, el endpoint `resend-code` acepta cualquier email sin rate limiting específico, permitiendo spam de emails a cualquier dirección.
- **Impacto:** MEDIO
- **Acción para Dev:** Agregar `[EnableRateLimiting("auth")]` al endpoint `POST /api/Auth/resend-code` (línea 113). Para la recuperación de contraseña, implementar un endpoint `POST /api/Auth/forgot-password` que genere un token seguro (con `RandomNumberGenerator`), lo almacene con expiración de 15 minutos, y envíe email. Agregar campo `PasswordResetToken` y `PasswordResetExpiry` a la entidad `User`.
- **Test para QA:** Llamar `POST /api/Auth/resend-code` más de 5 veces en 1 minuto con el mismo email. La respuesta debe ser 429 Too Many Requests.

---

### A9. Exposición del teléfono del vendedor en `/api/Users/{id}/profile`
- **Archivo:** `backend/GeekStore.Api/Controllers/UsersController.cs:91`
- **Problema:** El endpoint público `GET /api/Users/{id}/profile` devuelve `PhoneNumber` en texto claro a cualquier visitante no autenticado. Esto expone datos de contacto personales masivamente.
- **Impacto:** MEDIO
- **Acción para Dev:** En `GetProfile`, solo incluir `PhoneNumber` si el usuario solicitante está autenticado: Agregar una condición `phoneNumber = User.Identity?.IsAuthenticated == true ? user.PhoneNumber : null` en la proyección del resultado (línea 86-94).
- **Test para QA:** Sin token de autenticación, llamar `GET /api/Users/1/profile`. El campo `phoneNumber` debe ser `null` o estar ausente en la respuesta.

---

## BLOQUE B — Observaciones de Arquitectura

### B1. Controladores accediendo directamente a `GeekStoreDbContext` — Violación de Clean Architecture
- **Archivo:** `backend/GeekStore.Api/Controllers/AdminController.cs:18`, `DisputesController.cs:17`, `SettingsController.cs:13`, `SeedController.cs:21`, `CategoriesController.cs:14`
- **Problema:** Cinco controladores inyectan `GeekStoreDbContext` directamente, saltándose por completo la capa de repositorios. Esto crea acoplamiento directo entre la capa de presentación y la de infraestructura, haciendo imposible testear estos controladores unitariamente y violando el principio de Dependency Inversion.
- **Impacto:** ALTO
- **Acción para Dev:** Crear repositorios/interfaces faltantes: `ICategoryRepository`, `IDisputeRepository`, `ISystemSettingRepository`. Mover toda la lógica de `_context.*` de estos controladores a sus respectivos repositorios. Registrar las implementaciones en `Program.cs`. En los controladores, inyectar las interfaces en lugar del `DbContext`.
- **Test para QA:** Verificar que los endpoints de Admin, Disputes, Settings y Categories siguen funcionando correctamente después del refactor mediante pruebas de integración básicas.

---

### B2. `AdminDashboardController` llama internamente a otro Action Method — Anti-patrón
- **Archivo:** `backend/GeekStore.Api/Controllers/AdminDashboardController.cs:72-73`
- **Problema:** `GetAIAnalysis()` llama directamente a `await GetInventoryStats()` y hace un cast del resultado (`as OkObjectResult`). Esto es un anti-patrón MVC que acopla acciones entre sí, dificulta el testing y puede fallar en edge cases donde el cast retorna `null`.
- **Impacto:** MEDIO
- **Acción para Dev:** Extraer la lógica de cálculo de stats a un método privado `private async Task<AdminInventoryStatsDto> BuildInventoryStatsAsync()`. Tanto `GetInventoryStats()` como `GetAIAnalysis()` deben llamar a ese método privado en vez de llamarse mutuamente.
- **Test para QA:** Llamar `GET /api/AdminDashboard/seller-ai-analysis` cuando no hay vendors en la DB. Debe retornar 200 con `globalSummary: "No hay data suficiente..."` sin lanzar excepciones.

---

### B3. Repositorio genérico `Repository<T>.ListAllAsync()` sin paginación — N+1 latente
- **Archivo:** `backend/GeekStore.Infrastructure/Repositories/Repository.cs:23-26`
- **Problema:** El método `ListAllAsync()` carga **todos** los registros de cualquier tabla sin filtro ni límite. Es usado extensivamente en `AuthService`, `AdminDashboardController`, `AuthController` y `SellersController`. Con escala, esto cargará miles de usuarios/productos en memoria en cada request.
- **Impacto:** ALTO
- **Acción para Dev:** Deprecar `ListAllAsync()` en la interfaz `IRepository<T>` marcándolo con `[Obsolete]`. Reemplazar todos los usos actuales por queries específicas: En `AuthService.LoginAsync`, reemplazar por `await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email)`. En `AuthController.Register`, reemplazar por `await _dbContext.Users.AnyAsync(u => u.Email == dto.Email)`. En `AdminDashboardController.GetInventoryStats`, aplicar el mismo principio con queries filtradas.
- **Test para QA:** Crear 1000 usuarios de prueba en la DB. Medir el tiempo de respuesta de `POST /api/Auth/login`. Debe responder en menos de 200ms. Verificar con un profiler que no hay full-table scans en la tabla Users.

---

### B4. `User.Role` como string libre — Sin enum ni validación de dominio
- **Archivo:** `backend/GeekStore.Core/Entities/User.cs:17`
- **Problema:** El rol de usuario es un string sin restricciones de dominio. Existen referencias a "Admin", "Seller", "Buyer", "Permanently Closed", "Deleted" dispersas en el código. Cualquier typo en el código produce bugs silenciosos de autorización.
- **Impacto:** MEDIO
- **Acción para Dev:** Crear una clase estática `UserRoles` en `GeekStore.Core` con constantes: `public const string Admin = "Admin"; public const string Seller = "Seller"; public const string Buyer = "Buyer";`. Reemplazar todos los string literals de roles en el código por estas constantes. Agregar una migración EF que agregue un constraint CHECK en la columna `Role`.
- **Test para QA:** Verificar que `[Authorize(Roles = "Admin")]` rechaza usuarios con rol "Seller" con un 403.

---

### B5. `Product` entidad acepta directamente en endpoints — Sin DTO de entrada
- **Archivo:** `backend/GeekStore.Api/Controllers/ProductsController.cs:85`
- **Problema:** El endpoint `POST /api/Products` acepta directamente `[FromBody] Product product` (la entidad de dominio). Esto expone todos los campos de la entidad al cliente, incluyendo `SellerId`, `IsActive`, `CartAdditionCount` y `StockStatus`, que podrían ser manipulados en el request body aunque luego se sobreescriban parcialmente.
- **Impacto:** MEDIO
- **Acción para Dev:** Crear un DTO `CreateProductDto` en `GeekStore.Core/Models/` con solo los campos que el cliente debe proveer: `Name`, `Description`, `PriceCRC`, `CategoryId`, `StockCount`, `Condition`, `SellerNote`, `PreferredDeliveryPointId`, `ImageUrl`, `ImageUrl2`, `ImageUrl3`. Usar este DTO en `CreateProduct` y `UpdateProduct`. Construir la entidad `Product` manualmente en el controlador.
- **Test para QA:** Llamar `POST /api/Products` con body que incluya `"isActive": false, "cartAdditionCount": 9999, "sellerId": 99`. Verificar que el producto creado tiene `IsActive: true`, `CartAdditionCount: 0` y el `SellerId` del token JWT, no del body.

---

### B6. `SettingsController` duplica lógica de `AdminController.UpdateSellerFee`
- **Archivo:** `backend/GeekStore.Api/Controllers/SettingsController.cs:30-44` vs `backend/GeekStore.Api/Controllers/AdminController.cs:93-126`
- **Problema:** Dos endpoints distintos actualizan la misma clave `"SellerMonthlyFee"` con lógica diferente. `AdminController` notifica a vendors cuando sube la tarifa; `SettingsController` no lo hace. Además, `AdminController` recibe `decimal` y `SettingsController` recibe `string`.
- **Impacto:** MEDIO
- **Acción para Dev:** Eliminar `PUT /api/Settings/seller-fee` de `SettingsController`. Mantener únicamente `PUT /api/Admin/settings/fees` con `[Authorize(Roles="Admin")]` como único punto de entrada para actualizar la tarifa. El `GET /api/Settings/seller-fee` público puede permanecer.
- **Test para QA:** Verificar que solo existe un endpoint para actualizar la tarifa y que los cambios se reflejan correctamente en `GET /api/Settings/seller-fee`.

---

## BLOQUE C — Observaciones de Calidad de Código

### C1. Tipos `any` en API client y componentes críticos
- **Archivo:** `frontend/src/api/client.ts:402`, `413`, `426` y `frontend/src/pages/AdminPanel.tsx:35-38`
- **Problema:** `adminDashboardApi.getStats` retorna `Promise<any>`, `getAIAnalysis` retorna `Promise<any>`, y `updateSellerConfig` acepta `config: any`. En `AdminPanel.tsx`, los estados `stats` y `aiAnalysis` son `useState<any>(null)`. Esto elimina toda la seguridad de tipos para el panel de administración.
- **Impacto:** MEDIO
- **Acción para Dev:** Definir interfaces TypeScript para los DTOs de dashboard: `AdminInventoryStatsDto`, `SellerAIAnalysisDto`. Reemplazar todos los `any` en `adminDashboardApi` por estas interfaces. En `AdminPanel.tsx`, tipar `useState<AdminInventoryStatsDto | null>(null)` y `useState<SellerAIAnalysisDto | null>(null)`.
- **Test para QA:** Ejecutar `npx tsc --noEmit` en el frontend. No debe haber errores de tipo relacionados con el AdminPanel o adminDashboardApi.

---

### C2. `myDisputes` en `MyPurchases.tsx` tipado como `any[]`
- **Archivo:** `frontend/src/pages/MyPurchases.tsx:9`
- **Problema:** `const [myDisputes, setMyDisputes] = useState<any[]>([])` pierde el tipado del array de disputas, haciendo que `.some(d => d.orderId === order.id)` no sea verificado por TypeScript.
- **Impacto:** BAJO
- **Acción para Dev:** Cambiar el tipo a `useState<Dispute[]>([])` (el tipo `Dispute` ya está exportado en `client.ts`).
- **Test para QA:** Ejecutar `npx tsc --noEmit`. No debe haber errores de tipo en `MyPurchases.tsx`.

---

### C3. Código de debug/test hardcodeado en endpoint de producción
- **Archivo:** `backend/GeekStore.Api/Controllers/ProductsController.cs:174-299`
- **Problema:** El endpoint `POST /api/Products/update-all-test-images` está marcado con `[Authorize(Roles="Admin")]` pero existe en producción. Contiene URLs hardcodeadas de `localhost:5173`. Aunque está protegido, su presencia en producción es deuda técnica y puede causar confusión.
- **Impacto:** BAJO
- **Acción para Dev:** Envolver el endpoint en `#if DEBUG` o eliminarlo completamente. Si se necesita para desarrollo, moverlo a `SeedController` que ya está protegido por `#if DEBUG`.
- **Test para QA:** Verificar que el endpoint no existe en build de Release: `POST /api/Products/update-all-test-images` debe retornar 404 en producción.

---

### C4. `window.location.reload()` como manejo de estado post-disputa
- **Archivo:** `frontend/src/pages/MyPurchases.tsx:266`
- **Problema:** Después de abrir una disputa exitosamente, el código usa `window.location.reload()` para refrescar el estado. Esto es un anti-patrón en React que destruye todo el estado del componente y hace una recarga completa de red innecesaria.
- **Impacto:** BAJO
- **Acción para Dev:** Reemplazar `window.location.reload()` por una actualización de estado local: después del éxito, actualizar `setMyDisputes(prev => [...prev, { orderId: selectedOrderId, status: 'Open' }])` para reflejar el cambio sin recargar.
- **Test para QA:** Abrir una disputa desde el modal. La página debe actualizar el estado visualmente (mostrando "Disputa Abierta" en el botón) sin recargar la URL completa.

---

### C5. `Console.WriteLine` en producción sin logger estructurado
- **Archivo:** `backend/GeekStore.Api/Controllers/AuthController.cs:79`, `81`, `128` y `backend/GeekStore.Infrastructure/Services/GeminiVisionService.cs:76`, `117`
- **Problema:** Se usa `Console.WriteLine` para logging en lugar del sistema de logging de ASP.NET Core (`ILogger`). Los logs de consola no persisten, no tienen niveles configurables y no se integran con sistemas de observabilidad.
- **Impacto:** BAJO
- **Acción para Dev:** Inyectar `ILogger<AuthController>` en `AuthController` y `ILogger<GeminiVisionService>` en el servicio. Reemplazar todos los `Console.WriteLine` por llamadas al logger apropiadas (`_logger.LogWarning(...)`, `_logger.LogError(...)`).
- **Test para QA:** Provocar un fallo de envío de email. Verificar que el error aparece en los logs estructurados de la aplicación (visible en `dotnet run` output con nivel Warning/Error).

---

## BLOQUE D — Observaciones de Resiliencia

### D1. ErrorBoundary no está aplicado en el árbol de rutas
- **Archivo:** `frontend/src/App.tsx:58-69`
- **Problema:** El componente `ErrorBoundary` existe en `frontend/src/components/ErrorBoundary.tsx` pero no envuelve ninguna ruta en `App.tsx`. Un error de render no capturado en cualquier página causará una pantalla en blanco.
- **Impacto:** ALTO
- **Acción para Dev:** En `App.tsx`, envolver el componente `Routes` con `<ErrorBoundary>`: `<ErrorBoundary><Routes>...</Routes></ErrorBoundary>`. Considerar ErrorBoundaries más granulares por ruta para mejor UX.
- **Test para QA:** Provocar intencionalmente un error de render (ej: pasar `null` a un componente que espera un objeto). La pantalla debe mostrar el fallback de ErrorBoundary en lugar de una pantalla en blanco.

---

### D2. No hay Route Guards en el frontend — Rutas protegidas accesibles en el cliente
- **Archivo:** `frontend/src/App.tsx:59-68`
- **Problema:** `/dashboard`, `/admin` y `/my-purchases` no tienen ningún componente de protección en el árbol de rutas. La validación del token se hace dentro de cada página con `useEffect` (que corre después del render), causando un flash del contenido protegido antes del redirect.
- **Impacto:** MEDIO
- **Acción para Dev:** Crear un componente `ProtectedRoute` que verifique el token en `localStorage` y el rol antes del render. Reemplazar las rutas protegidas: `<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />`. Para `/admin`, usar `<ProtectedRoute requiredRole="Admin">`.
- **Test para QA:** Sin estar autenticado, navegar directamente a `/dashboard`. Debe redirigir inmediatamente a `/login` sin mostrar ningún contenido del dashboard.

---

### D3. Catalog carga ratings individuales por vendedor — N+1 en frontend
- **Archivo:** `frontend/src/pages/Catalog.tsx:260-273` y `frontend/src/pages/AdminPanel.tsx:175-183`
- **Problema:** Cuando se cargan productos, se hace un request individual `reviewsApi.getSellerSummary(sid)` por cada vendedor único en la página. Con 24 productos de 10 vendedores diferentes, esto genera 10 requests adicionales por cada carga de página. En `AdminPanel.tsx`, se hace lo mismo con hasta 200 productos.
- **Impacto:** ALTO
- **Acción para Dev:** Crear un endpoint de batch en el backend: `GET /api/Reviews/sellers/summary?ids=1,2,3,4` que retorne un diccionario de `{ sellerId: { averageRating, reviewCount } }`. En el frontend, hacer una sola llamada con todos los seller IDs de la página actual.
- **Test para QA:** Cargar el catálogo y abrir las DevTools de red. Al cargar la página de catálogo, el número de requests relacionados a reviews debe ser 1 (no N donde N es el número de vendedores).

---

### D4. `SubscriptionWorker` realiza `SaveChangesAsync` fuera del loop de notificaciones
- **Archivo:** `backend/GeekStore.Api/Services/SubscriptionWorker.cs:77-81`
- **Problema:** El worker llama `notificationRepo.AddAsync(notification)` dentro del loop para cada vendedor, pero `AddAsync` en `Repository<T>` llama `SaveChangesAsync` individualmente (línea 31 en Repository.cs). Luego el worker llama `SaveChangesAsync` de nuevo (línea 79). Esto resulta en múltiples commits de DB por iteración y puede causar inconsistencias si el worker falla entre notificaciones.
- **Impacto:** MEDIO
- **Acción para Dev:** Cambiar la estrategia del worker para usar el `dbContext` directamente para todas las operaciones del batch: usar `dbContext.Notifications.Add(notification)` en el loop (sin guardar) y hacer un único `await dbContext.SaveChangesAsync()` al final de todo el batch de vendedores expirados.
- **Test para QA:** Configurar 3 vendedores con suscripción expirada. Ejecutar el worker. Verificar que los 3 reciben notificación y sus productos son desactivados en una sola operación atómica.

---

### D5. `authApi.login` retorna `null` silenciosamente — error de email no verificado sin propagar
- **Archivo:** `frontend/src/api/client.ts:225-239`
- **Problema:** `authApi.login` retorna `null` tanto para credenciales incorrectas como para errores de red. Más crítico: cuando el backend retorna 400 con `"EMAIL_NOT_VERIFIED"`, el interceptor de `fetchApi` no lanza un error — `res.ok` es false pero se retorna `null`. En `Login.tsx:58`, el código intenta capturar esto comparando el mensaje de error, pero como no se lanza excepción, el catch nunca se ejecuta.
- **Impacto:** MEDIO
- **Acción para Dev:** En `authApi.login`, después de `if (!res.ok)`, leer el body: `const errData = await res.json().catch(() => null); if (errData?.message === 'EMAIL_NOT_VERIFIED') throw new Error('EMAIL_NOT_VERIFIED');`. Esto garantiza que el bloque catch en `Login.tsx` capture correctamente este caso.
- **Test para QA:** Registrar un usuario pero NO verificar el email. Intentar hacer login. La pantalla debe mostrar el formulario de verificación de código, no el mensaje "ACCESO DENEGADO: Credenciales inválidas".

---

## BLOQUE E — Observaciones de Performance

### E1. `ListAllAsync()` en AuthController — Full table scan en cada login y registro
- **Archivo:** `backend/GeekStore.Api/Controllers/AuthController.cs:35`, `51`, `91`, `117`
- **Problema:** `Login`, `Register`, `VerifyEmail` y `ResendCode` llaman a `_userRepository.ListAllAsync()` que carga **todos** los usuarios en memoria para luego hacer `.FirstOrDefault()` o `.Any()` en C#. Esto es un full table scan con O(n) memoria en cada operación de autenticación.
- **Impacto:** ALTO
- **Acción para Dev:** Agregar un método `GetByEmailAsync(string email)` a `IRepository<User>` y su implementación: `return await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email);`. Reemplazar todos los `ListAllAsync().Then(FirstOrDefault(...email...))` por esta nueva query. Asegurar que hay un índice en la columna `Email` de la tabla `Users` (agregar en la migración de EF: `modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique()`).
- **Test para QA:** Con 10,000 usuarios en la DB, medir el tiempo de respuesta de `POST /api/Auth/login`. Debe responder en menos de 100ms. Verificar con el query log de PostgreSQL que se usa un index scan en la columna Email.

---

### E2. `AdminDashboardController.GetInventoryStats` — Dos full table scans
- **Archivo:** `backend/GeekStore.Api/Controllers/AdminDashboardController.cs:36-37`
- **Problema:** `_userRepository.ListAllAsync()` y `_productRepository.ListAllAsync()` cargan todas las entidades en memoria. Con 1000 sellers y 50,000 productos, esto consume memoria masiva y es lento. La correlación vendedor-producto se hace en C# LINQ en lugar de en la DB.
- **Impacto:** ALTO
- **Acción para Dev:** Crear un método específico `GetInventoryStatsAsync()` en el repositorio que use una sola query SQL con GROUP BY y JOIN para generar los stats directamente en la DB. Alternativamente, usar proyecciones EF Core (`Select`) para traer solo los campos necesarios.
- **Test para QA:** Con 100 vendedores y 5000 productos en la DB, `GET /api/AdminDashboard/inventory-stats` debe responder en menos de 500ms.

---

### E3. `ReviewRepository.GetSellerRatingSummaryAsync` — Carga todos los reviews en memoria para calcular promedio
- **Archivo:** `backend/GeekStore.Infrastructure/Repositories/ReviewRepository.cs:37-49`
- **Problema:** Para calcular el promedio de un vendedor, se cargan todos sus reviews en memoria y se calcula el promedio en C#. Esto escala linealmente con el número de reviews por vendedor.
- **Impacto:** MEDIO
- **Acción para Dev:** Reemplazar la implementación por una query EF Core con agregación en DB: `var result = await _dbContext.Reviews.Where(r => r.SellerId == sellerId).GroupBy(r => r.SellerId).Select(g => new { Avg = g.Average(r => r.Rating), Count = g.Count() }).FirstOrDefaultAsync();`.
- **Test para QA:** Con un vendedor que tiene 10,000 reviews, `GET /api/Reviews/seller/{id}/summary` debe responder en menos de 100ms.

---

### E4. Falta de índices en columnas de búsqueda frecuente
- **Archivo:** `backend/GeekStore.Infrastructure/Data/GeekStoreDbContext.cs` (no leído en detalle, pero inferido del schema)
- **Problema:** Las columnas `Product.SellerId`, `Product.StockStatus`, `Product.IsActive`, `Order.BuyerId`, `Order.SellerId`, `Notification.UserId`, `Review.SellerId` son usadas en `WHERE` clauses en múltiples queries pero probablemente no tienen índices definidos explícitamente en la configuración de EF.
- **Impacto:** ALTO
- **Acción para Dev:** En `GeekStoreDbContext.OnModelCreating`, agregar: `modelBuilder.Entity<Product>().HasIndex(p => p.SellerId); modelBuilder.Entity<Product>().HasIndex(p => new { p.IsActive, p.StockStatus }); modelBuilder.Entity<Order>().HasIndex(o => o.BuyerId); modelBuilder.Entity<Order>().HasIndex(o => o.SellerId); modelBuilder.Entity<Notification>().HasIndex(n => n.UserId); modelBuilder.Entity<Review>().HasIndex(r => r.SellerId);`. Generar y aplicar una migración.
- **Test para QA:** Ejecutar `EXPLAIN ANALYZE SELECT * FROM "Products" WHERE "SellerId" = 1 AND "IsActive" = true` en PostgreSQL. El plan debe mostrar "Index Scan" en vez de "Seq Scan".

---

### E5. NotificationBell hace polling cada 30 segundos con dos requests simultáneos
- **Archivo:** `frontend/src/components/NotificationBell.tsx:21-33`
- **Problema:** `fetchNotifications` hace dos requests paralelos (`getAll` y `getUnreadCount`) cada 30 segundos por cada instancia del componente. El componente está instanciado en Dashboard, AdminPanel y MyPurchases simultáneamente si hay múltiples tabs abiertos.
- **Impacto:** BAJO
- **Acción para Dev:** El endpoint `GET /api/Notifications` ya retorna todas las notificaciones, por lo que `getUnreadCount` es redundante — calcular el count localmente: `setUnreadCount(all.filter(n => !n.isRead).length)`. Esto reduce los requests a la mitad. Considerar usar Server-Sent Events o WebSockets en sprints futuros.
- **Test para QA:** Abrir DevTools de red y verificar que el componente hace solo 1 request (no 2) cada 30 segundos al endpoint de notificaciones.

---

## BLOQUE F — Observaciones de UX

### F1. Feedback de error en registro no diferencia tipos de error
- **Archivo:** `frontend/src/pages/Login.tsx:128`
- **Problema:** Si el registro falla, el mensaje es genérico: `'ERROR EN EL REGISTRO. INTENTE DE NUEVO.'`. El backend puede retornar mensajes específicos como "Este correo ya está registrado." que no se muestran al usuario. La respuesta del API en `authApi.register` retorna solo `boolean`, perdiendo el mensaje de error.
- **Impacto:** MEDIO
- **Acción para Dev:** Cambiar `authApi.register` para retornar `Promise<{ok: boolean, message?: string}>` en lugar de `Promise<boolean>`: `const data = await res.json().catch(() => null); return { ok: res.ok, message: data?.message };`. En `Login.tsx`, mostrar `result.message` si está disponible.
- **Test para QA:** Intentar registrar un email que ya existe. El mensaje de error debe decir "Este correo ya está registrado." no un mensaje genérico.

---

### F2. Checkout requiere nombre y email aunque el usuario ya esté autenticado
- **Archivo:** `frontend/src/pages/Catalog.tsx:297`
- **Problema:** `handlePlaceOrder` valida `!buyerName.trim() || !buyerEmail.trim()`. El email se pre-popula desde el JWT (línea 284), pero el nombre no. Un usuario autenticado debe ingresar su nombre manualmente en cada checkout, aunque este dato ya existe en su perfil.
- **Impacto:** BAJO
- **Acción para Dev:** En `openCheckout`, junto con la extracción del email del JWT, llamar a `usersApi.getMe(token)` para pre-poplar `setBuyerName(me.name + ' ' + me.surname)` y `setBuyerPhone(me.phoneNumber || '')`.
- **Test para QA:** Autenticado como un usuario con nombre "Carlos Ramírez", abrir el checkout. Los campos de nombre y teléfono deben estar pre-llenados.

---

### F3. Botón "Portal de Admin" visible para todos los Sellers en Dashboard
- **Archivo:** `frontend/src/pages/Dashboard.tsx:237-241`
- **Problema:** El botón "Portal de Admin" siempre está visible en el header del Dashboard para cualquier usuario autenticado. Un Seller que hace click verá el panel de Admin (protegido por backend) pero el link visual es confuso y no debería mostrarse a no-admins.
- **Impacto:** BAJO
- **Acción para Dev:** Condicionar la visibilidad del botón: Solo mostrar si `userRole === 'Admin'`. El estado `userRole` ya está disponible en el componente.
- **Test para QA:** Autenticado como un Seller, verificar que el botón "Portal de Admin" no aparece en el header del Dashboard.

---

### F4. Mensajes de error genéricos en operaciones de órdenes y disputas
- **Archivo:** `frontend/src/pages/MyPurchases.tsx:263`, `frontend/src/pages/Catalog.tsx:264-265`
- **Problema:** Los errores de `ordersApi.createOrder` y `disputesApi.open` muestran `alert()` con mensajes genéricos que no dan información al usuario sobre qué salió mal. `alert()` como mecanismo de feedback es una práctica obsoleta que bloquea la UI.
- **Impacto:** MEDIO
- **Acción para Dev:** Reemplazar todos los `alert()` con estados de error en el componente que se renderizen dentro del UI de la modal/formulario. Para el checkout en Catalog.tsx, agregar un estado `checkoutError` que muestre el mensaje dentro del modal de checkout.
- **Test para QA:** Intentar crear una orden con un producto que ya fue vendido (stock 0). En lugar de un popup de alerta, debe aparecer un mensaje de error dentro del modal de checkout con la razón específica.

---

### F5. Sin feedback visual durante la carga inicial del catálogo con filtros activos
- **Archivo:** `frontend/src/pages/Catalog.tsx:251-253`
- **Problema:** Cuando se cambia la categoría o condición del filtro, `loading` se pone a `true` pero el catálogo anterior sigue visible hasta que la nueva respuesta llega, causando un flash del contenido anterior que puede confundir al usuario sobre si el filtro se aplicó.
- **Impacto:** BAJO
- **Acción para Dev:** Al cambiar filtros (en los `useEffect` de `activeCategory` y `conditionFilter`), limpiar el array de productos inmediatamente: `setProducts([])` antes de iniciar el fetch. El estado `loading` mostrará el skeleton/spinner correctamente.
- **Test para QA:** En el catálogo, cambiar la categoría de "Todos" a "TCG". Los productos de la categoría anterior deben desaparecer inmediatamente (mostrando un estado de carga) antes de que aparezcan los de la nueva categoría.

---

## Matriz de Prioridad

| ID | Descripción | Impacto | Esfuerzo | Sprint Recomendado |
|---|---|---|---|---|
| A1 | Contraseñas en texto plano — sin BCrypt | CRÍTICO | S | Inmediato |
| A2 | Puerta trasera hardcodeada en AuthService | CRÍTICO | XS | Inmediato |
| A3 | Upgrade a Seller sin verificar pago PayPal | CRÍTICO | M | Inmediato |
| A7 | JWT con fallback hardcodeado público | ALTO | XS | Inmediato |
| A4 | PUT /api/Settings/seller-fee sin rol Admin | ALTO | XS | Sprint Actual |
| A5 | import-moxfield sin auth y SellerId spoofable | ALTO | S | Sprint Actual |
| D2 | Sin Route Guards en frontend | ALTO | S | Sprint Actual |
| E1 | Full table scan en cada login/registro | ALTO | M | Sprint Actual |
| E4 | Falta índices en columnas de búsqueda | ALTO | S | Sprint Actual |
| B1 | Controladores acceden directamente a DbContext | ALTO | L | Sprint +1 |
| B3 | ListAllAsync sin paginación — N+1 latente | ALTO | M | Sprint +1 |
| D3 | N+1 de ratings en Catalog frontend | ALTO | M | Sprint +1 |
| D1 | ErrorBoundary no aplicado en árbol de rutas | ALTO | XS | Sprint Actual |
| A6 | Código verificación no criptográfico | MEDIO | XS | Sprint +1 |
| A8 | Sin rate limit en resend-code | MEDIO | XS | Sprint Actual |
| A9 | PhoneNumber expuesto en perfil público | MEDIO | XS | Sprint Actual |
| B5 | Entidad Product aceptada directamente sin DTO | MEDIO | M | Sprint +1 |
| B2 | AdminDashboard llama internamente a Action | MEDIO | S | Sprint +1 |
| B4 | Role como string libre sin constantes | MEDIO | S | Sprint +1 |
| D4 | SubscriptionWorker guarda múltiples veces | MEDIO | S | Sprint +1 |
| D5 | authApi.login silencia error EMAIL_NOT_VERIFIED | MEDIO | XS | Sprint Actual |
| E2 | AdminDashboard dos full table scans | ALTO | M | Sprint +1 |
| E3 | GetSellerRatingSummary carga todos reviews | MEDIO | S | Sprint +1 |
| C1 | Tipos `any` en adminDashboardApi y AdminPanel | MEDIO | M | Sprint +1 |
| B6 | Duplicación lógica UpdateSellerFee | MEDIO | XS | Sprint Actual |
| F1 | Registro no muestra mensaje de error específico | MEDIO | S | Sprint +1 |
| F4 | alert() en lugar de feedback inline | MEDIO | M | Sprint +1 |
| C4 | window.location.reload() post-disputa | BAJO | XS | Sprint +2 |
| C5 | Console.WriteLine en lugar de ILogger | BAJO | S | Sprint +2 |
| C2 | myDisputes tipado como any[] | BAJO | XS | Sprint +2 |
| C3 | Endpoint update-all-test-images en producción | BAJO | XS | Sprint +2 |
| E5 | NotificationBell hace 2 requests por poll | BAJO | XS | Sprint +2 |
| F2 | Checkout no pre-llena datos del usuario auth | BAJO | S | Sprint +2 |
| F3 | Botón Admin visible para Sellers | BAJO | XS | Sprint +2 |
| F5 | Sin feedback de carga al cambiar filtros | BAJO | XS | Sprint +2 |

---

## Deuda Técnica Acumulada

1. **Sin migrations de EF Core rastreadas**: El código usa `db.Database.EnsureCreated()` en `Program.cs:117` en lugar de `db.Database.Migrate()`. Esto impide gestionar cambios incrementales de schema en producción de forma segura.

2. **`API_BASE_URL` hardcodeada en client.ts**: `const API_BASE_URL = 'http://localhost:5242/api'` en la línea 1 de `client.ts`. En producción esto debe leerse de `import.meta.env.VITE_API_BASE_URL`. Actualmente cualquier despliegue requiere modificar el código fuente.

3. **Verificación de email en registro de Seller ocurre DESPUÉS del pago PayPal**: El flujo actual es: Pago PayPal → Registro → Verificación de email. Si el email de verificación falla (y está silenciado en el catch), el usuario pagó pero no puede verificar su cuenta. El flujo correcto debería ser: Registro → Verificar email → Pago.

4. **`SeedController` almacena contraseñas en texto plano** (`PasswordHash = "admin123"`): Aunque está en `#if DEBUG`, estos usuarios de seed tienen contraseñas en texto que no pasarían ninguna verificación de BCrypt una vez implementado A1. El seed debe actualizarse para usar BCrypt.

5. **Condición `Condition` de producto sin validación de dominio**: Los valores "M", "NM", "LP", "MP", "HP", "DMG" están dispersos como strings en entidad, repositorio, frontend y CSS. Deberían ser un enum `ProductCondition` o al menos una clase de constantes estáticas.

6. **Sin Swagger/OpenAPI documentado**: No hay configuración de Swagger en `Program.cs`. En un proyecto con múltiples controladores y DTOs, la ausencia de documentación automática de API dificulta el trabajo de QA y de futuros desarrolladores.

7. **`Product.StockStatus` y `Product.IsActive` son campos redundantes**: Un producto puede tener `StockStatus="Available"` pero `IsActive=false`, o `StockStatus="Sold"` pero `StockCount > 0`. No hay sincronización garantizada entre estos campos, generando estados inconsistentes. Debería haber un único campo de estado derivado o una lógica central de actualización.

8. **`SubscriptionWorker` tiene un intervalo de 10 minutos sin configuración**: El intervalo está hardcodeado (`TimeSpan.FromMinutes(10)`) en el código. Para producción, esto debería ser configurable vía `appsettings.json`.

9. **Falta gestión de estado global en frontend (Zustand no implementado)**: El token JWT se obtiene de `localStorage` directamente en cada componente/página, duplicando la lógica de autenticación en Dashboard, AdminPanel, MyPurchases, Catalog y Profile. La arquitectura mencionaba Zustand pero no está implementado — el estado de autenticación debería estar centralizado.

10. **`User.Email` y `User.Nickname` sin restricción de unicidad a nivel de DB**: Aunque el código verifica duplicación de email en `Register`, no hay una restricción UNIQUE en la base de datos, lo que permite condiciones de carrera en registros concurrentes y no garantiza integridad a nivel de datos.
