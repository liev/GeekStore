# GeekStore — QA Security Report
**Fecha:** 2026-03-26
**Tipo:** Revisión estática de código + Test Plan ejecutable
**Revisado por:** QA Engineer Senior (análisis automatizado)
**Rama analizada:** master

---

## Resumen Ejecutivo

| Verificación | Estado |
|---|---|
| V1 — BCrypt en AuthService | ✅ PASS |
| V2 — Backdoor eliminada | ✅ PASS |
| V3 — SettingsController Admin-only | ✅ PASS |
| V4 — Moxfield import seguro | ❌ FAIL |
| V5 — Código de verificación criptográfico | ✅ PASS |
| V6 — PhoneNumber protegido en perfil público | ✅ PASS |
| V7 — SeedController protegido | ✅ PASS |
| V8 — AdminPanel solo Admin | ✅ PASS |
| V9 — Category filter jerárquico | ✅ PASS |
| V10 — Login.tsx sin URLs hardcodeadas | ✅ PASS |

**Resultado global: 9/10 PASS — 1 falla crítica de seguridad activa**

---

## Verificaciones Estáticas

### VERIFICACIÓN 1 — BCrypt en AuthService
**Estado:** ✅ PASS
**Observación:** `LoginAsync` (línea 34) llama correctamente `BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)` antes de generar el token. `RegisterAsync` (línea 42) llama `BCrypt.Net.BCrypt.HashPassword(password)` y asigna el hash a `user.PasswordHash`. El fallback del JWT key (línea 48) usa `?? throw new InvalidOperationException("Jwt:Key must be configured.")`, lanzando excepción en lugar de usar un string hardcodeado.

---

### VERIFICACIÓN 2 — Backdoor eliminada
**Estado:** ✅ PASS
**Observación:** Búsqueda exhaustiva en todo el directorio `backend/` no encontró ninguna referencia a "goblinlead", "krenco" ni "vendedor@sistema.com". No existe ningún bloque `if (email == ...)` que bypasee la validación normal de credenciales en `AuthService.cs`. La nota: "vendedor@sistema.com" aparece únicamente como `placeholder` de atributo HTML en `Login.tsx` (línea 263), lo cual es inofensivo (UI only, sin lógica de bypass).

---

### VERIFICACIÓN 3 — SettingsController Admin-only
**Estado:** ✅ PASS
**Observación:** El endpoint `PUT /api/Settings/seller-fee` tiene el atributo `[Authorize(Roles = "Admin")]` en la línea 28 de `SettingsController.cs`, inmediatamente antes de `[HttpPut("seller-fee")]`. El endpoint `GET /api/Settings/seller-fee` permanece público sin autenticación, comportamiento correcto para lectura de la tarifa pública.

---

### VERIFICACIÓN 4 — Moxfield import seguro
**Estado:** ❌ FAIL
**Observación:** El endpoint `POST /api/Products/import-moxfield/{publicId}` tiene `[Authorize]` (línea 182) — ese check es correcto. Sin embargo, existe una **vulnerabilidad de escalada de privilegios** en la rama `else` (importación como mazo completo, líneas 232-246): el producto se crea usando `SellerId = request.SellerId` en lugar del `sellerId` extraído del token JWT. La rama `if (request.ImportIndividually)` SÍ usa correctamente `SellerId = sellerId` (del token), pero la rama `else` permite a un Seller autenticado crear productos bajo el ID de cualquier otro vendedor arbitrario proporcionado en el body del request.

**Código vulnerable (línea 238):**
```csharp
var product = new Product
{
    // ...
    SellerId = request.SellerId,  // <-- USA request.SellerId, NO el token
    // ...
};
```

**Fix requerido:** Cambiar `SellerId = request.SellerId` por `SellerId = sellerId` en la rama `else` del endpoint.

---

### VERIFICACIÓN 5 — Código de verificación criptográfico
**Estado:** ✅ PASS
**Observación:** Ambas ocurrencias de generación de código en `AuthController.cs` usan `RandomNumberGenerator.GetInt32(100000, 999999)`:
- Línea 57 (endpoint `register`): `var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();`
- Línea 123 (endpoint `resend-code`): `var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();`

No existe ninguna referencia a `new Random().Next(...)` en el archivo.

---

### VERIFICACIÓN 6 — PhoneNumber protegido en perfil público
**Estado:** ✅ PASS
**Observación:** En `UsersController.cs`, método `GetProfile` (línea 91), el campo se incluye condicionalmente:
```csharp
PhoneNumber = User.Identity?.IsAuthenticated == true ? user.PhoneNumber : null,
```
Peticiones anónimas recibirán `null` en el campo `phoneNumber`. Usuarios autenticados (con JWT válido) recibirán el número real.

---

### VERIFICACIÓN 7 — SeedController protegido
**Estado:** ✅ PASS
**Observación:**
- El archivo entero está envuelto en `#if DEBUG` (línea 1 y línea 367), por lo que no compila en Release.
- El controller tiene `[Authorize(Roles = "Admin")]` a nivel de clase (línea 18), protegiendo todos los endpoints.
- Los passwords del seed usan `BCrypt.Net.BCrypt.HashPassword(...)` en las líneas 70, 83, 99, 114, confirmado para todos los usuarios de prueba.
- No existe `[AllowAnonymous]` en ningún endpoint del controller.

---

### VERIFICACIÓN 8 — AdminPanel solo Admin
**Estado:** ✅ PASS
**Observación:** El `useEffect` de verificación de token (líneas 235-255 de `AdminPanel.tsx`) implementa correctamente:
1. Redirige a `/login` si no existe token en localStorage.
2. Decodifica el JWT con `jwtDecode` y extrae el rol.
3. Si `userRole !== 'Admin'`, ejecuta `navigate('/')` y retorna (línea 246-248).
4. Solo setea el token en state si el rol es Admin.

No existe ningún comentario "Allow Seller for demo" ni ningún bypass condicional de rol en el archivo.

---

### VERIFICACIÓN 9 — Category filter jerárquico
**Estado:** ✅ PASS
**Observación:** En `ProductRepository.cs`, método `GetFilteredProductsAsync` (líneas 51-58):
```csharp
var categoryIds = await _dbContext.Categories
    .Where(c => c.Id == query.CategoryId.Value || c.ParentId == query.CategoryId.Value)
    .Select(c => c.Id)
    .ToListAsync();
queryable = queryable.Where(p => p.CategoryId.HasValue && categoryIds.Contains(p.CategoryId.Value));
```
Coincide exactamente con el patrón requerido: consulta subcategorías por `ParentId` y usa `.Contains()`.

---

### VERIFICACIÓN 10 — Login.tsx sin URLs hardcodeadas
**Estado:** ✅ PASS
**Observación:** No existe ninguna referencia a `localhost:5242` en `Login.tsx`. Las llamadas al API usan correctamente:
- `authApi.verifyEmail(verifyEmail, verifyCode)` — línea 75
- `authApi.resendCode(verifyEmail)` — línea 94
Ambas se resuelven a través del cliente centralizado en `../api/client`, que gestiona la URL base.

---

## Hallazgos Adicionales (Fuera del Scope de Security Fixes)

### OBSERVACIÓN A — update-all-test-images con localhost hardcodeado
**Severidad:** Media (solo afecta ambiente de producción si el endpoint Admin es invocado)
**Archivo:** `backend/GeekStore.Api/Controllers/ProductsController.cs`, líneas 259-277
**Detalle:** El endpoint `POST /api/Products/update-all-test-images` (Admin-only) asigna URLs `http://localhost:5173/test*.png` a los productos. Si se ejecuta en producción, las imágenes quedarán rotas. Se recomienda eliminar o mover a `#if DEBUG`.

---

## Test Plan Ejecutable

### Prerrequisitos
- API corriendo (ej. `https://localhost:5242` o el host configurado)
- Usuario Seller registrado y verificado: `seller@test.com` / `test123` (o crear uno vía `/api/auth/register`)
- Usuario Admin disponible: `admin@goblinspot.com` / `admin123` (tras ejecutar `/api/seed`)
- Herramienta REST: curl, Postman, o equivalente
- Variable `$TOKEN_SELLER` = JWT del Seller obtenido vía login
- Variable `$TOKEN_ADMIN` = JWT del Admin obtenido vía login

---

### TC-1 — Login con password incorrecto
**Endpoint:** `POST /api/Auth/login`
**Precondición:** Existe un usuario registrado y verificado con `email: carlos@test.com`
**Request:**
```json
{
  "email": "carlos@test.com",
  "password": "contraseña_incorrecta_xyz"
}
```
**Resultado esperado:** HTTP 401 Unauthorized (body vacío o `{}`)
**Resultado real:** _______________

---

### TC-2 — Login con email de backdoor eliminado
**Endpoint:** `POST /api/Auth/login`
**Precondición:** No debe existir ningún usuario con email `goblinlead@test.com` ni `vendedor@sistema.com` en la DB
**Request:**
```json
{
  "email": "goblinlead@test.com",
  "password": "cualquier_password"
}
```
**Resultado esperado:** HTTP 401 Unauthorized (no debe retornar token bajo ninguna circunstancia)
**Resultado real:** _______________

> **Variante:** Repetir con `{ "email": "vendedor@sistema.com", "password": "krenco" }` — debe devolver 401.

---

### TC-3 — PUT /Settings/seller-fee con token de Seller
**Endpoint:** `PUT /api/Settings/seller-fee`
**Precondición:** `$TOKEN_SELLER` = JWT de un usuario con rol `Seller`
**Request:**
```
Authorization: Bearer $TOKEN_SELLER
Content-Type: application/json

{
  "newFee": "9999.00"
}
```
**Resultado esperado:** HTTP 403 Forbidden (el Seller no tiene rol Admin)
**Resultado real:** _______________

---

### TC-4 — POST /Products/import-moxfield/{id} sin token
**Endpoint:** `POST /api/Products/import-moxfield/test-public-id`
**Precondición:** Ninguna (petición anónima)
**Request:**
```
(Sin header Authorization)
Content-Type: application/json

{
  "sellerId": 1,
  "importIndividually": false
}
```
**Resultado esperado:** HTTP 401 Unauthorized
**Resultado real:** _______________

---

### TC-5 — Import Moxfield con sellerId diferente al del token (CRITICO — verifica FAIL V4)
**Endpoint:** `POST /api/Products/import-moxfield/{publicId}`
**Precondición:**
- `$TOKEN_SELLER` = JWT del Seller con ID conocido (ej. ID = 2)
- Conocer el ID de otro Seller distinto (ej. ID = 1)
- Usar un `publicId` de mazo Moxfield válido, o uno que devuelva 404 para verificar el flujo de autorización antes del fetch externo

**Sub-test A — Rama `importIndividually: true` (debe estar protegida):**
```
Authorization: Bearer $TOKEN_SELLER   (Seller ID = 2)
Content-Type: application/json

{
  "sellerId": 1,
  "importIndividually": true
}
```
**Resultado esperado:** Productos creados con `sellerId = 2` (el del token), ignorando `sellerId: 1` del body
**Resultado real:** _______________

**Sub-test B — Rama `importIndividually: false` (VULNERABLE segun V4):**
```
Authorization: Bearer $TOKEN_SELLER   (Seller ID = 2)
Content-Type: application/json

{
  "sellerId": 1,
  "importIndividually": false
}
```
**Resultado esperado (comportamiento CORRECTO post-fix):** Producto creado con `sellerId = 2` (del token)
**Resultado real (comportamiento ACTUAL antes del fix):** Producto creado con `sellerId = 1` — VULNERABILIDAD CONFIRMADA
**Resultado real tras fix:** _______________

> **Cómo verificar:** `GET /api/Products/seller/1` antes y después. Un producto extra con nombre "Mazo: ..." aparecerá bajo seller 1 aunque lo creó el seller 2.

---

### TC-6 — GET /Users/{id}/profile sin token — phoneNumber debe ser null
**Endpoint:** `GET /api/Users/1/profile`
**Precondición:** Existe un usuario con ID 1 que tiene `PhoneNumber` registrado
**Request:**
```
(Sin header Authorization)
```
**Resultado esperado:** HTTP 200 OK con body donde `"phoneNumber": null`
**Resultado real:** _______________

---

### TC-7 — GET /Users/{id}/profile con token — phoneNumber puede incluirse
**Endpoint:** `GET /api/Users/1/profile`
**Precondición:** `$TOKEN_SELLER` o `$TOKEN_ADMIN` = JWT válido
**Request:**
```
Authorization: Bearer $TOKEN_SELLER
```
**Resultado esperado:** HTTP 200 OK con body donde `"phoneNumber"` tiene el valor real (no null) si el usuario tiene número registrado
**Resultado real:** _______________

---

### TC-8 — POST /Seed sin token
**Endpoint:** `POST /api/Seed`
**Precondición:** API ejecutando en modo DEBUG. Sin token de autenticación.
**Request:**
```
(Sin header Authorization)
```
**Resultado esperado:** HTTP 401 Unauthorized
**Resultado real:** _______________

---

### TC-9 — POST /Seed/reset sin token
**Endpoint:** `POST /api/Seed/reset`
**Precondición:** API ejecutando en modo DEBUG. Sin token de autenticación.
**Request:**
```
(Sin header Authorization)
```
**Resultado esperado:** HTTP 401 Unauthorized (no debe limpiar ni re-sembrar la base de datos)
**Resultado real:** _______________

---

### TC-10 — POST /Seed con token de Seller (no Admin)
**Endpoint:** `POST /api/Seed`
**Precondición:** `$TOKEN_SELLER` = JWT de usuario con rol `Seller`
**Request:**
```
Authorization: Bearer $TOKEN_SELLER
```
**Resultado esperado:** HTTP 403 Forbidden
**Resultado real:** _______________

---

## Prioridad de Fixes

| # | Archivo | Línea | Descripción | Prioridad |
|---|---|---|---|---|
| 1 | `ProductsController.cs` | 238 | `SellerId = request.SellerId` en rama `else` de `ImportMoxfieldDeck` | **CRITICA** |
| 2 | `ProductsController.cs` | 259-277 | URLs `localhost:5173` hardcodeadas en endpoint Admin `update-all-test-images` | Media |

---

*Reporte generado: 2026-03-26 | GeekStore v0.x — Sprint en curso*
