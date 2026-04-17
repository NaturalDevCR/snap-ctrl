FROM nginx:alpine

ARG BUILD_VERSION

RUN apk add --no-cache jq curl unzip \
    && mkdir -p /var/www/html \
    && curl -fsSL "https://github.com/NaturalDevCR/snap-ctrl/releases/download/v${BUILD_VERSION}/dist.zip" \
       -o /tmp/dist.zip \
    && unzip /tmp/dist.zip -d /tmp/ \
    && cp -r /tmp/dist/. /var/www/html/ \
    && rm -rf /tmp/dist.zip /tmp/dist

COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
