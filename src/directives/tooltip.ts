/**
 * 轻量级 v-tooltip 指令（A1 优化）
 *
 * 替代 ElementPlus 的 <el-tooltip>，消除 Popper.js 实例和大量全局事件监听器：
 *   - 单页面 20 张 AccountCard × 22 个 ElTooltip = 440 个 Popper 实例 + 880+ 事件监听器
 *   - 改用 directive 后：仅 1 个全局共享浮层 DOM + 全局事件代理
 *
 * 性能特性：
 *   - 全局复用 1 个 tooltip DOM，避免重复创建
 *   - 仅在 mouseenter 时计算位置（避开 Popper.js 的持续监听）
 *   - 100ms 延迟显示，避免快速划过时的闪烁
 *   - 通过 `data-tooltip` 属性传递文本（避免 directive update 时频繁重新绑定）
 *
 * 使用：
 *   <el-button v-tooltip="'按钮提示'" />
 *   <el-button v-tooltip.bottom="'底部提示'" />
 *   <el-button v-tooltip="{ content: '动态提示', placement: 'right' }" />
 */
import type { App, Directive, DirectiveBinding } from 'vue';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipOptions {
  content: string;
  placement?: Placement;
}

const ATTR_CONTENT = 'data-tooltip-content';
const ATTR_PLACEMENT = 'data-tooltip-placement';
const SHOW_DELAY = 100;
const HIDE_DELAY = 50;
const GAP = 8;

let tooltipEl: HTMLDivElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let currentTarget: HTMLElement | null = null;

function ensureTooltipEl(): HTMLDivElement {
  if (tooltipEl) return tooltipEl;
  const el = document.createElement('div');
  el.className = 'wsf-tooltip';
  el.setAttribute('role', 'tooltip');
  // 内联样式，避免依赖额外 CSS 文件
  el.style.cssText = [
    'position: fixed',
    'z-index: 9999',
    'padding: 6px 10px',
    'font-size: 12px',
    'line-height: 1.4',
    'color: #fff',
    'background: rgba(0, 0, 0, 0.85)',
    'border-radius: 4px',
    'pointer-events: none',
    'opacity: 0',
    'transform: translate3d(0, 0, 0)',
    'transition: opacity 0.15s ease-out',
    'white-space: nowrap',
    'max-width: 280px',
    'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2)',
  ].join(';');
  document.body.appendChild(el);
  tooltipEl = el;
  return el;
}

function clearShowTimer() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function calcPosition(targetRect: DOMRect, tooltipRect: DOMRect, placement: Placement): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipRect.height - GAP;
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + GAP;
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.left - tooltipRect.width - GAP;
      break;
    case 'right':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.right + GAP;
      break;
  }

  // 边界保护：避免溢出视口
  if (left < 4) left = 4;
  if (left + tooltipRect.width > vw - 4) left = vw - tooltipRect.width - 4;
  if (top < 4) top = 4;
  if (top + tooltipRect.height > vh - 4) top = vh - tooltipRect.height - 4;

  return { top, left };
}

function showTooltip(target: HTMLElement) {
  const content = target.getAttribute(ATTR_CONTENT);
  if (!content) return;

  const placement = (target.getAttribute(ATTR_PLACEMENT) as Placement | null) || 'top';
  const el = ensureTooltipEl();
  el.textContent = content;
  el.style.opacity = '0';
  el.style.display = 'block';

  // 强制重排以获得真实 tooltip 尺寸
  const tooltipRect = el.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const { top, left } = calcPosition(targetRect, tooltipRect, placement);

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  // 下一帧再淡入，避免位置闪烁
  requestAnimationFrame(() => {
    el.style.opacity = '1';
  });
  currentTarget = target;
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.style.opacity = '0';
  // 等淡出动画结束再 display:none
  setTimeout(() => {
    if (tooltipEl && tooltipEl.style.opacity === '0') {
      tooltipEl.style.display = 'none';
    }
  }, 150);
  currentTarget = null;
}

function onMouseEnter(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement;
  clearHideTimer();
  clearShowTimer();
  showTimer = setTimeout(() => {
    showTooltip(target);
  }, SHOW_DELAY);
}

function onMouseLeave() {
  clearShowTimer();
  clearHideTimer();
  hideTimer = setTimeout(() => {
    hideTooltip();
  }, HIDE_DELAY);
}

function parseBinding(binding: DirectiveBinding<string | TooltipOptions>): { content: string; placement: Placement } {
  let content = '';
  let placement: Placement = 'top';

  if (typeof binding.value === 'string') {
    content = binding.value;
  } else if (binding.value && typeof binding.value === 'object') {
    content = binding.value.content || '';
    placement = binding.value.placement || 'top';
  }

  // modifier 优先级最高（v-tooltip.bottom 等）
  for (const mod of ['top', 'bottom', 'left', 'right'] as Placement[]) {
    if (binding.modifiers[mod]) {
      placement = mod;
      break;
    }
  }

  return { content, placement };
}

export const vTooltip: Directive<HTMLElement, string | TooltipOptions> = {
  mounted(el, binding) {
    const { content, placement } = parseBinding(binding);
    if (!content) return;
    el.setAttribute(ATTR_CONTENT, content);
    el.setAttribute(ATTR_PLACEMENT, placement);
    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
  },
  updated(el, binding) {
    const { content, placement } = parseBinding(binding);
    if (!content) {
      el.removeAttribute(ATTR_CONTENT);
      el.removeAttribute(ATTR_PLACEMENT);
      return;
    }
    el.setAttribute(ATTR_CONTENT, content);
    el.setAttribute(ATTR_PLACEMENT, placement);
    // 如果当前正在显示这个元素的 tooltip，实时同步内容
    if (currentTarget === el && tooltipEl) {
      tooltipEl.textContent = content;
    }
  },
  beforeUnmount(el) {
    el.removeEventListener('mouseenter', onMouseEnter);
    el.removeEventListener('mouseleave', onMouseLeave);
    if (currentTarget === el) {
      clearShowTimer();
      clearHideTimer();
      hideTooltip();
    }
  },
};

export function installTooltipDirective(app: App) {
  app.directive('tooltip', vTooltip);
}
