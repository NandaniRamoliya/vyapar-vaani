import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run phone` serves over https on your Wi-Fi network: phones only allow the
// microphone on https:// (or localhost), so this is what makes voice work on a real phone.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'phone' ? [basicSsl({ name: 'vyapar-vaani' })] : []),
  ],
  server: {
    port: 3000,
    host: mode === 'phone' ? true : undefined,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
