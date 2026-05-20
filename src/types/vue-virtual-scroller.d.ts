/**
 * vue-virtual-scroller 类型声明（B5 优化）
 *
 * 官方包暂未提供 Vue 3 兼容的 .d.ts，这里给出 DynamicScroller / DynamicScrollerItem 的最小类型定义。
 * 仅覆盖项目中实际使用的 props/slots，足够 vue-tsc --noEmit 通过。
 *
 * 完整 API 参考: https://github.com/Akryum/vue-virtual-scroller/tree/master/packages/vue-virtual-scroller
 */
declare module 'vue-virtual-scroller' {
  import type { DefineComponent } from 'vue';

  /**
   * DynamicScroller - 处理动态高度 items 的虚拟滚动容器
   * 自动测量每个 item 渲染后的高度并缓存。
   */
  export const DynamicScroller: DefineComponent<{
    /** 待渲染数据数组 */
    items: any[];
    /** item 最小高度（用于初始空滚动条计算，实际渲染后会动态测量） */
    minItemSize: number;
    /** items 数组中作为唯一 key 的字段名（必填） */
    keyField?: string;
    /** 视口外预渲染像素数，越大滚动越流畅但内存占用越高（默认 200） */
    buffer?: number;
    /** page-mode：true 监听 window 滚动，false 监听容器自身（默认 false） */
    pageMode?: boolean;
    /** 滚动方向：'vertical' | 'horizontal' (默认 vertical) */
    direction?: 'vertical' | 'horizontal';
    /** emitUpdate：是否 emit update 事件（性能敏感场景可关） */
    emitUpdate?: boolean;
  }>;

  /**
   * DynamicScrollerItem - DynamicScroller 默认 slot 内必须用此包裹真实内容，
   * 负责向上报告高度变化，处理 active 切换时的内容显示/隐藏。
   */
  export const DynamicScrollerItem: DefineComponent<{
    /** 当前 item 数据（透传，用于 sizeDependencies 计算） */
    item: any;
    /** 是否处于活跃渲染状态（视口内 + buffer），false 时内部不渲染但保留占位 */
    active: boolean;
    /** 当前 item 在 items 数组中的索引 */
    dataIndex?: number;
    /** 依赖项数组：这些值变化时 DynamicScroller 会主动重新测量该 item 高度 */
    sizeDependencies?: any[];
    /** 同 sizeDependencies，单值简写 */
    watchData?: boolean;
    /** 标签名（默认 div） */
    tag?: string;
  }>;

  /**
   * RecycleScroller - 处理固定高度 items 的虚拟滚动（性能优于 DynamicScroller，但要求 item 等高）
   */
  export const RecycleScroller: DefineComponent<{
    items: any[];
    itemSize?: number | null;
    minItemSize?: number;
    keyField?: string;
    buffer?: number;
    pageMode?: boolean;
    direction?: 'vertical' | 'horizontal';
  }>;
}
