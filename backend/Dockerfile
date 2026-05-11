# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

ENV NODE_ENV=production
EXPOSE 3000

USER node

# Фоновый режим хоста: docker run -d … (см. npm run docker:daemon)
CMD ["node", "src/server.js"]
