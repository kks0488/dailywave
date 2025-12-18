FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# In Docker, we use 'serve' to run the production build or 'npm run dev' for development
# For a 24/7 server, production build is better.
RUN npm run build
RUN npm install -g serve

EXPOSE 3020

CMD ["serve", "-s", "dist", "-l", "3020"]
