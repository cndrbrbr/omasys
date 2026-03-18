# Stage 1: Build OmaGUI
FROM node:20-alpine AS oma-build
WORKDIR /build/oma
COPY oma-frontend/package*.json ./
RUN npm install
COPY oma-frontend/ ./
RUN npm run build

# Stage 2: Build PostGUI
FROM node:20-alpine AS post-build
WORKDIR /build/post
COPY post-frontend/package*.json ./
RUN npm install
COPY post-frontend/ ./
RUN npm run build

# Stage 3: Backend + frontends
FROM node:20-alpine
WORKDIR /app

# Native build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

# Copy built frontends
COPY --from=oma-build /build/oma/dist ./public/oma
COPY --from=post-build /build/post/dist ./public/post

RUN mkdir -p /data/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -q -O- http://localhost:3000/api/status || exit 1

CMD ["node", "server.js"]
