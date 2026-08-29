FROM node:20-alpine

WORKDIR /app

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend .

# Build
RUN npm run build

# Serve with a simple HTTP server
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
