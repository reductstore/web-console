FROM node:17 AS builder

WORKDIR /app
COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .

RUN npm run build

FROM node:10-slim

COPY --from=builder /app/build /app

RUN npm install -g serve

