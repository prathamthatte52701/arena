import { defineConfig } from 'vite';

// Standalone localhost fixture server; intentionally excludes application routing.
export default defineConfig({ server: { host: '127.0.0.1', port: 3003, strictPort: true } });
