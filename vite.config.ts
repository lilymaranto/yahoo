import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CABOODLE_TARGET = 'https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com';
const CABOODLE_API_KEY = 'ck_647e85d86fef2d92b311956d611d1f4905451b367df417fc';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/caboodle': {
        target: CABOODLE_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/caboodle/, '/api/v1'),
        headers: {
          'X-API-Key': CABOODLE_API_KEY,
        },
      },
    },
  },
});