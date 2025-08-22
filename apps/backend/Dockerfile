# Этап сборки
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем ВСЕ необходимые файлы
COPY package*.json ./
COPY nx.json .
COPY tsconfig*.json ./
COPY apps/backend/ ./apps/backend/
# COPY libs/ ./libs/

# Устанавливаем зависимости
RUN npm ci

# Собираем приложение
RUN npx nx build backend --configuration=production

# Этап production
FROM node:20-alpine AS production

WORKDIR /app

# Копируем package.json и package-lock.json для production зависимостей
COPY package*.json ./
# Копируем ВЕСЬ dist, включая все приложения и библиотеки
COPY --from=builder /app/dist ./dist
# Копируем node_modules из builder, чтобы убедиться, что все зависимости на месте
COPY --from=builder /app/node_modules ./node_modules

# Альтернативно: устанавливаем заново только production зависимости
# RUN npm ci --only=production --ignore-scripts

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/apps/backend/main.js"]