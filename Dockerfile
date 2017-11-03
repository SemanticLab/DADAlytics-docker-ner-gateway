FROM node:8


ENV APPDIR /usr/src/app

RUN mkdir -p $APPDIR
WORKDIR $APPDIR

# Install APPDIR dependencies
COPY package.json $APPDIR

# ENV NODE_ENV production
RUN npm -q install && npm install -g forever

COPY . $APPDIR
RUN chown -R nobody:nogroup $APPDIR && chmod -R a-w $APPDIR && ls -ld

# Certs
RUN mkdir -p /etc/certs/prod /etc/certs/staging
VOLUME /etc/certs

USER nobody

# Ports > 1024 since we're not root.
EXPOSE 8080 8443 5001


CMD ["forever", "server.js"]
