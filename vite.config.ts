import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { resolve } from 'path';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 自动按需引入 Element Plus 的 API（如 ElMessage 等），同时声明 .d.ts
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    // 自动按需引入 Element Plus 的组件（如 <el-button>），同时声明 .d.ts
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 46952,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 46953,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    // 4. dev 预热：A2/B2 把全部 Dialog 改为 defineAsyncComponent 后，dev 模式首次打开会冷编译
    //    这里预热高频 Dialog + 重资源模块，dev server 启动时主动编译，首次打开即命中缓存
    //    生产构建 (vite build) 已预编译，warmup 仅影响 dev 体验
    warmup: {
      clientFiles: [
        // ========== 高频 / 体积大的 Dialog（B2 + A2 都涉及） ==========
        './src/components/AccountInfoDialog.vue',     // 121KB，最大头
        './src/components/AddAccountDialog.vue',      // 65KB
        './src/components/SettingsDialog.vue',        // 53KB
        './src/components/TeamManagementDialog.vue',  // 60KB（A2 卡片级）
        './src/components/AnalyticsDialog.vue',       // 46KB（A2 卡片级，含 echarts）
        './src/components/UpdatePlanDialog.vue',      // 35KB（A2 卡片级）
        './src/components/BatchImportDialog.vue',     // 29KB
        './src/components/BillingDialog.vue',         // 21KB
        // ========== 其他 A2 卡片级 Dialog（默认频率较高） ==========
        './src/components/CreditHistoryDialog.vue',
        './src/components/TeamSettingsDialog.vue',
        './src/components/AutoRefillDialog.vue',
        './src/components/TurnstileDialog.vue',
        // ========== 重资源模块 ==========
        './src/utils/echarts.ts',                     // echarts 按需注册
      ],
    },
  },

  // ==================== 生产构建优化（A5） ====================
  // Tauri 默认 WebView：Windows = WebView2 (Chromium)，macOS = WKWebView (Safari)，Linux = WebKitGTK
  // 直接 target=esnext，避免 Babel polyfill 膨胀产物
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    rollupOptions: {
      output: {
        // 手动分包：让 vendor 库稳定缓存，避免业务代码变动导致 vendor 哈希失效
        manualChunks: {
          'vue-vendor': ['vue', 'pinia'],
          'element-plus': ['element-plus'],
          'element-icons': ['@element-plus/icons-vue'],
          'tauri': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-opener',
            '@tauri-apps/plugin-process',
            '@tauri-apps/plugin-updater',
          ],
          'utils': ['dayjs', 'crypto-js', 'axios', 'uuid'],
        },
      },
    },
  },

  // 依赖预构建：开发模式启动速度优化
  optimizeDeps: {
    include: [
      'vue',
      'pinia',
      'element-plus',
      '@element-plus/icons-vue',
      'dayjs',
      'axios',
    ],
  },
});
