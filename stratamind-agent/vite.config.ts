import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      env: {
        API_KEY: 'test-mock-api-key'
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json-summary'],
        include: [
          'App.tsx',
          'components/**/*.{ts,tsx}',
          'services/**/*.ts',
          'utils/**/*.ts'
        ],
        exclude: [
          'node_modules/**',
          'src/**/__tests__/**',
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          '**/*.d.ts',
          'server/**'
        ],
        all: false,
        clean: true,
        reportsDirectory: './coverage'
      }
    }
  };
});
