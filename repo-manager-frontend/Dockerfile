FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

COPY --from=builder /app/dist/repo-manager-frontend/browser /usr/share/nginx/html

EXPOSE 5777

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5777/ || exit 1

CMD ["nginx", "-g", "daemon off;"]