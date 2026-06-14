import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/entry-calculator/', // 💡 여기에 본인의 GitHub 저장소 이름을 정확히 적어주세요!
})