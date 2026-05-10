FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD npx prisma migrate deploy --schema=./prisma/schema.prisma \
    && node dist/main.js
