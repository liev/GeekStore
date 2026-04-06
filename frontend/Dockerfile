# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Accept API URL as build arg (Vite injects env vars at build time)
ARG VITE_API_BASE_URL=http://localhost:5242/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Install native build dependencies for the 'canvas' package (node-gyp)
RUN apk add --no-cache python3 make g++ pkgconf pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ───────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback: redirect all routes to index.html
RUN printf 'server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    try_files $uri /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
