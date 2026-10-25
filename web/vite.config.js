import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// In development, /@handle serves the handle page as the Pages Function does.
const handlePages = {
  name: 'handle-pages',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (/^\/@[^/?]+\/?(\?|$)/.test(req.url)) req.url = '/handle/index.html';
      next();
    });
  },
};

export default defineConfig({
  plugins: [handlePages],
  server: {
    fs: {
      allow: [resolve(process.cwd()), resolve(process.cwd(), '../packages/js')]
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        docs: resolve(process.cwd(), 'docs/index.html'),
        handle: resolve(process.cwd(), 'handle/index.html')
      }
    }
  },
  worker: {
    format: 'es'
  }
});
