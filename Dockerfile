FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Build React inside container
RUN npm run build

# Serve frontend from Express (public folder)
# Example: app.use(express.static("build"));

EXPOSE 3000
CMD ["npm", "start"]
