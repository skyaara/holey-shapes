import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        showcase: resolve(process.cwd(), 'showcase.html'),
        present: resolve(process.cwd(), 'present.html'),
        aniamtions: resolve(process.cwd(), 'aniamtions.html'),
        loading: resolve(process.cwd(), 'loading.html')
      }
    }
  }
});
