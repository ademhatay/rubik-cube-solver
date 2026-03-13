FROM nginx:alpine

COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY cube.js /usr/share/nginx/html/
COPY validator.js /usr/share/nginx/html/
COPY solver.js /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY scanner.js /usr/share/nginx/html/

# Cache devre dışı bırak (geliştirme kolaylığı)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        add_header Cache-Control "no-store"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
