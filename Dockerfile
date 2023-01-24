FROM node:18 AS builder

RUN npm install -g npm@9.3.1

WORKDIR /app
COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run build

FROM node:10-slim

COPY --from=builder /app/build /app

