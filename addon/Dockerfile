# Stage 1: build the Vue app
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build:ha

# Stage 2: serve with nginx
FROM nginx:alpine

RUN apk add --no-cache jq

COPY --from=builder /app/addon/dist /var/www/html
COPY addon/nginx.conf /etc/nginx/nginx.conf
COPY addon/run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
