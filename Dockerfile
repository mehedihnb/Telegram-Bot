FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create volume for logs
VOLUME ["/usr/src/app/logs"]

# Start the bot
CMD ["node", "telegram-bot-code.js"] 