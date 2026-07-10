FROM node:18-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Frontend dependencies (needs devDeps for vite)
COPY frontend/package.json ./frontend/
RUN cd frontend && npm install --include=dev

# Backend dependencies (needs native build for better-sqlite3)
COPY backend/package.json ./backend/
RUN cd backend && npm install --include=optional

# Copy source code (node_modules excluded via .dockerignore)
COPY . .

# Build frontend
RUN cd frontend && npm run build

FROM node:18-alpine

WORKDIR /app

# Copy built app from build stage
COPY --from=build /app /app

ENV NODE_ENV=production
ENV DB_PATH=/data/supremas.db

EXPOSE 3001

CMD ["node", "backend/src/index.js"]
