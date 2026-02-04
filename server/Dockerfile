FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY server/package*.json ./

RUN npm install

# Copy server and client files
COPY server/ ./
COPY client/ ../client/

EXPOSE 3000

CMD ["npm", "start"]
