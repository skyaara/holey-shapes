import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      allow: [resolve(process.cwd()), resolve(process.cwd(), '../packages/js')]
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        docs: resolve(process.cwd(), 'docs/index.html')
      }
    }
  },
  worker: {
    format: 'es'
  }
});
