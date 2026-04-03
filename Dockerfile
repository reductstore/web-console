FROM node:22 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine

COPY --from=builder /app/build /app

