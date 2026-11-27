import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `npm run phone` serves over https on your Wi-Fi network: phones only allow the
// microphone on https:// (or localhost), so this is what makes voice work on a real phone.
export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [react(), tailwindcss()]

  if (mode === 'phone') {
    try {
      const basicSsl = (await import('@vitejs/plugin-basic-ssl')).default
      plugins.push(basicSsl({ name: 'vyapar-vaani' }))
    } catch {
      console.warn('@vitejs/plugin-basic-ssl not found, running without SSL')
    }
  }

  return {
    plugins,
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
  }
})
