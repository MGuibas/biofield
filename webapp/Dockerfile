# Build stage
FROM node:22 AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage (using Nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
