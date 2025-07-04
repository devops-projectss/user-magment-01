FROM node:18 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . /app/
FROM node:18-slim As runner
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 5000
CMD ["node", "app.js"]