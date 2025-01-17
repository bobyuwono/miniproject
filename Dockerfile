FROM node:12.18.4

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000


CMD ["node","src/main.js"]

