import { createApp } from "vue";
import App from "./App.vue";
// Element Plus 全局基础样式（包含 Message/MessageBox/Notification 等命令式 API 的样式）
// 注意：组件级 CSS 由 unplugin-vue-components 自动按需引入，无需在此手动 import
import 'element-plus/dist/index.css';
// B5: vue-virtual-scroller 全局 CSS（DynamicScroller 滚动容器布局）
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './styles/theme.css';
import { pinia } from './store';
import { installTooltipDirective } from './directives/tooltip';

const app = createApp(App);

// 注册 Pinia
app.use(pinia);

// 注册轻量 v-tooltip 指令（A1 优化）
// 替代 <el-tooltip>，消除大量 Popper 实例和全局事件监听器
installTooltipDirective(app);

// 注意（A3+A4 优化）：
// - 不再全量注册 ElementPlus（app.use(ElementPlus)）—— 组件由 unplugin-vue-components 自动按需引入
// - 不再全量注册图标（for...of 遍历 ElementPlusIconsVue）—— 各组件内显式 import 实际用到的图标
// - 国际化（zhCn）由 App.vue 的 <el-config-provider :locale="zhCn"> 接管

app.mount("#app");
