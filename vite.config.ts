import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        allowedHosts: ['host.docker.internal', 'localhost'],
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'three-vendor': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', '@react-three/cannon'],
              'reactflow-vendor': ['reactflow', 'dagre'],
              'ui-vendor': ['framer-motion', 'lucide-react'],
              'socket-vendor': ['socket.io-client'],
              'db-vendor': ['dexie']
            }
          }
        },
        chunkSizeWarningLimit: 600,
        target: 'es2020',
        minify: 'esbuild',
        sourcemap: false
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
