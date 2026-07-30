FROM node:22-alpine
WORKDIR /app
COPY . .
RUN mkdir -p data uploads
EXPOSE 3000
CMD ["node", "server.js"]
