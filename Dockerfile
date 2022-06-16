FROM node:17 AS builder

RUN npm install -g npm@8.12.2

WORKDIR /app
COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run build

FROM node:10-slim

COPY --from=builder /app/build /app

