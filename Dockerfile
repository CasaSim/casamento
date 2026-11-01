FROM node:22-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node tests ./tests
COPY --chown=node:node next.config.ts tsconfig.json tsconfig.security.json postcss.config.mjs eslint.config.mjs ./
RUN chown node:node /app
USER node
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
