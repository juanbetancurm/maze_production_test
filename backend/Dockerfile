FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

RUN npm prune --omit=dev

COPY src ./src/

EXPOSE 3001

CMD ["node", "src/server.js"]