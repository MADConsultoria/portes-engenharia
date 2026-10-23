import { defineConfig } from 'vite';

// Os caminhos relativos funcionam no Dokploy e em prévias sob outros prefixos.
export default defineConfig({
  base: './',
  build: {
    outDir: '../construidas',
    // Somente esta pasta gerada é substituída na compilação.
    emptyOutDir: true,
  },
});
