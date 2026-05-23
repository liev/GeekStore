# Goblin Spot — Frontend

Frontend de Goblin Spot construido con **React 19**, **TypeScript**, **Tailwind CSS 4** y **Vite 7**.

## Desarrollo

```bash
# Instalar dependencias
npm install

# Configurar variable de entorno
cp .env.example .env.local
# Editar VITE_API_BASE_URL si el backend no está en localhost:5242

# Ejecutar servidor de desarrollo
npm run dev
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción (TypeScript + Vite) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview del build de producción |

## Estructura

```
src/
├── api/          # Cliente API centralizado (client.ts)
├── components/   # Componentes reutilizables
│   ├── ErrorBoundary.tsx   # Captura errores de render
│   ├── ProtectedRoute.tsx  # Route guard con verificación JWT/rol
│   └── NotificationBell.tsx # Campana de notificaciones con polling
├── pages/        # Páginas principales
│   ├── Catalog.tsx         # Catálogo público con filtros
│   ├── Dashboard.tsx       # Panel del vendedor
│   ├── AdminPanel.tsx      # Panel administrativo (solo Admin)
│   ├── Login.tsx           # Login + Registro + Verificación + 2FA
│   ├── MyPurchases.tsx     # Compras, disputas y reembolsos
│   ├── Profile.tsx         # Perfil público de vendedor
│   └── ProductDetail.tsx   # Detalle de producto
└── store/        # Zustand stores
    └── authStore.ts        # Estado centralizado de autenticación
```

## Variables de Entorno

| Variable | Descripción | Default |
|---|---|---|
| `VITE_API_BASE_URL` | URL base del API backend | `http://localhost:5242/api` |
