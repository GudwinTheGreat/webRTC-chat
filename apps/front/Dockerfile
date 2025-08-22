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

# Копируем собранное приложение в nginx из ПРАВИЛЬНОГО пути
COPY --from=builder /app/dist/apps/front/browser /usr/share/nginx/html

# Копируем конфиг nginx
COPY apps/front/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80