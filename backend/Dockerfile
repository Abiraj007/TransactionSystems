FROM node:16-alpine

# Install wait-for tool and PostgreSQL client
RUN apk add --no-cache postgresql-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Install wait-for script
RUN wget -O /wait-for https://github.com/eficode/wait-for/releases/download/v2.2.3/wait-for && \
    chmod +x /wait-for

# Expose port
EXPOSE 3000

# Start command - wait for database to be ready
CMD ["sh", "-c", "/wait-for db:5432 -- timeout 120 node index.js"]