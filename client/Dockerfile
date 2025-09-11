# build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm ci
COPY . /app
RUN npm run build

# run stage
FROM nginx:1.25-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"] 