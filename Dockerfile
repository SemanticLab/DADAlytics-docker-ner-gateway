FROM node:8

ADD index.js package-lock.json package.json ./
RUN npm install && npm install -g forever

EXPOSE 80


CMD ["forever", "index.js"]



