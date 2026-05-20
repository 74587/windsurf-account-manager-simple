/**
 * ECharts 按需引入封装（A6 优化）
 *
 * 替代原 `await import('echarts')` 全量加载（~1MB），改为只加载实际使用的图表/组件/渲染器，
 * 打包体积从 ~300KB(gzip) 降到 ~80KB(gzip)。
 *
 * 当前项目实际用到：
 *   Charts: Line / Bar / Pie
 *   Components: Title / Tooltip / Legend / Grid
 *   Renderer: Canvas（默认）
 *   Util: graphic.LinearGradient
 *
 * 使用方式：
 *   import * as echarts from '@/utils/echarts';
 *   const chart = echarts.init(el);
 *   new echarts.graphic.LinearGradient(...);
 */
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 按需注册：未注册的图表/组件会在运行时报错
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  CanvasRenderer,
]);

// 直接 re-export 全部公共 API，保持与 `import * as echarts from 'echarts'` 的调用兼容
// 包括 init / dispose / connect / graphic 等
export * from 'echarts/core';
export { echarts as default };

// 类型别名：让原代码 `import type { ECharts } from 'echarts'` 改为 `from '@/utils/echarts'` 即可
import type { EChartsType } from 'echarts/core';
export type ECharts = EChartsType;
