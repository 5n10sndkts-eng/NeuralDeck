import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
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
        minify: 'esbuild' as const,
        sourcemap: false
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
