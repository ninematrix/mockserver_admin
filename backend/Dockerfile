FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY app.js ./app.js
COPY public ./public

ENV http_proxy=
ENV https_proxy=
ENV no_proxy=
ENV NO_PROXY=
ENV HTTP_PROXY=
ENV HTTPS_PROXY=


EXPOSE 3000

CMD ["node", "app.js"]
