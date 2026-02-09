# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=frontend-builder /app/dist ./dist
COPY server ./server

EXPOSE 3001

ENV NODE_ENV=production

CMD ["npm", "run", "server"]
