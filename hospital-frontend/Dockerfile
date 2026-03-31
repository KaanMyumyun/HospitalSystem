FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/HospitalSystem/.npm npm ci

COPY . .

RUN npm run build

FROM node:20-alpine

COPY nginx.conf /etc/nginx/conf.d/hospital.conf
COPY --from=builder /app/dist /usr/share/nginx/html
USER nginx

EXPOSE 8080
