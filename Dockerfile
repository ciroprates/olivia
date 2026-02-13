FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY config.example.js ./config.js

RUN mkdir -p /app/output && chown -R node:node /app

ENV NODE_ENV=production
EXPOSE 3000

USER node

CMD ["node", "src/server.js"]
