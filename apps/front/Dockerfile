# Этап сборки
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем файлы для установки зависимостей
COPY package*.json ./
COPY nx.json .
COPY tsconfig*.json ./
COPY apps/front/ ./apps/front/
# COPY libs/ ./libs/ 

# Устанавливаем зависимости и собираем приложение
RUN npm ci
RUN npx nx build front --configuration=production

# Этап production
FROM nginx:alpine

# Копируем собранное приложение в nginx
COPY --from=builder /app/dist/apps/front /usr/share/nginx/html

# Копируем конфиг nginx из ПРАВИЛЬНОГО пути
# Если nginx.conf находится в apps/front/
COPY apps/front/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80