import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { applyTheme, DEFAULT_THEME_ID, normalizeThemeId, type ThemeId } from '@/theme';
import type { Account } from '@/types';

// ==================== A2 优化：共享 AccountCard 弹窗（卡片级 Dialog 单实例） ====================
/**
 * AccountCard 原本内嵌 8 个 v-if Dialog，一页 20 张卡片就有 160 个 Dialog 节点常驻 render 函数。
 * 上提为 MainLayout 单实例 + uiStore 状态共享后，render 工作量降为 8 个，提升首屏渲染速度。
 */
export type CardDialogType =
  | 'creditHistory'      // 积分记录
  | 'seatsResult'        // 座位更新结果
  | 'analytics'          // 使用分析
  | 'teamSettings'       // 团队设置
  | 'teamManagement'     // 团队管理
  | 'autoRefill'         // 自动充值
  | 'updatePlan'         // 更换订阅
  | 'turnstile';         // Turnstile 人机验证

export interface CardDialogState {
  type: CardDialogType | null;
  /** 关联账号（多数 Dialog 需要） */
  account: Account | null;
  /** 自定义数据（如 seatsResult 的 resultData） */
  payload?: unknown;
  /** 成功回调（如 updatePlan/turnstile 完成后） */
  onSuccess?: (data?: unknown) => void;
  /** 取消回调（如 turnstile 用户主动关闭） */
  onCancel?: () => void;
}

const LEGACY_DEFAULT_THEME_ID = 'aurora';
const THEME_DEFAULT_MIGRATION_KEY = 'theme-default-migrated-to-original-light';

function getInitialTheme(): ThemeId {
  const storedTheme = localStorage.getItem('theme');
  const migrationCompleted = localStorage.getItem(THEME_DEFAULT_MIGRATION_KEY) === 'true';

  localStorage.setItem(THEME_DEFAULT_MIGRATION_KEY, 'true');

  if (storedTheme === LEGACY_DEFAULT_THEME_ID && !migrationCompleted) {
    return DEFAULT_THEME_ID;
  }

  return normalizeThemeId(storedTheme);
}

export const useUIStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(true);  // 默认收缩
  const savedTheme = getInitialTheme();
  const theme = ref<ThemeId>(savedTheme);
  
  applyTheme(savedTheme);
  const showAddAccountDialog = ref(false);
  const showEditAccountDialog = ref(false);
  const showSettingsDialog = ref(false);
  const showLogsDialog = ref(false);
  const showBatchOperationDialog = ref(false);
  const showStatsDialog = ref(false);
  const showAccountInfoDialog = ref(false);
  const showBillingDialog = ref(false);
  const currentEditingAccountId = ref<string | null>(null);
  const currentViewingAccountId = ref<string | null>(null);
  
  // 通知相关
  const notifications = ref<Array<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }>>([]);

  // Actions
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  async function setTheme(newTheme: string) {
    const normalizedTheme = applyTheme(newTheme);
    theme.value = normalizedTheme;
    
    // 保存主题设置到后端
    try {
      const { settingsApi } = await import('@/api');
      // 获取当前设置并更新主题
      const currentSettings = await settingsApi.getSettings();
      await settingsApi.updateSettings({ ...currentSettings, theme: normalizedTheme });
    } catch (error) {
      console.error('Failed to save theme setting:', error);
    }
  }

  function showNotification(notification: Omit<typeof notifications.value[0], 'id'>) {
    const id = Date.now().toString();
    notifications.value.push({ ...notification, id });
    
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 3000);
    }
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  }

  function openAddAccountDialog() {
    showAddAccountDialog.value = true;
  }

  function closeAddAccountDialog() {
    showAddAccountDialog.value = false;
  }

  function openEditAccountDialog(accountId: string) {
    currentEditingAccountId.value = accountId;
    showEditAccountDialog.value = true;
  }

  function closeEditAccountDialog() {
    showEditAccountDialog.value = false;
    currentEditingAccountId.value = null;
  }

  function openSettingsDialog() {
    showSettingsDialog.value = true;
  }

  function closeSettingsDialog() {
    showSettingsDialog.value = false;
  }

  function openLogsDialog() {
    showLogsDialog.value = true;
  }

  function closeLogsDialog() {
    showLogsDialog.value = false;
  }

  function openBatchOperationDialog() {
    showBatchOperationDialog.value = true;
  }

  function closeBatchOperationDialog() {
    showBatchOperationDialog.value = false;
  }

  function openStatsDialog() {
    showStatsDialog.value = true;
  }

  function closeStatsDialog() {
    showStatsDialog.value = false;
  }

  function openAccountInfoDialog(accountId: string) {
    currentViewingAccountId.value = accountId;
    showAccountInfoDialog.value = true;
  }

  function closeAccountInfoDialog() {
    showAccountInfoDialog.value = false;
    currentViewingAccountId.value = null;
  }

  function openBillingDialog(accountId: string) {
    currentViewingAccountId.value = accountId;
    showBillingDialog.value = true;
  }

  function closeBillingDialog() {
    showBillingDialog.value = false;
    currentViewingAccountId.value = null;
  }

  // ==================== A2: 共享 AccountCard 弹窗状态 ====================
  // 用 shallowRef：Dialog 显示期间 state 内容（account/payload/callbacks）不需要深度响应式
  // 整体替换比深 patch 更高效（一次替换比 8 个 ref 各自变化的开销小）
  const cardDialog = shallowRef<CardDialogState>({
    type: null,
    account: null,
  });

  function openCardDialog(opts: { type: CardDialogType } & Omit<CardDialogState, 'type'>) {
    cardDialog.value = {
      type: opts.type,
      account: opts.account || null,
      payload: opts.payload,
      onSuccess: opts.onSuccess,
      onCancel: opts.onCancel,
    };
  }

  function closeCardDialog() {
    // 关闭前触发 onCancel（如果用户没有走 onSuccess 路径）
    const cb = cardDialog.value.onCancel;
    cardDialog.value = { type: null, account: null };
    cb?.();
  }

  /** 调用方主动通知"操作成功"，触发 onSuccess 回调并关闭弹窗 */
  function emitCardDialogSuccess(data?: unknown) {
    const cb = cardDialog.value.onSuccess;
    // 先清空 state 以避免回调里再次触发 closeCardDialog 导致 onCancel 被误触发
    cardDialog.value = { type: null, account: null };
    cb?.(data);
  }

  return {
    // State
    sidebarCollapsed,
    theme,
    showAddAccountDialog,
    showEditAccountDialog,
    showSettingsDialog,
    showLogsDialog,
    showBatchOperationDialog,
    showStatsDialog,
    showAccountInfoDialog,
    showBillingDialog,
    currentEditingAccountId,
    currentViewingAccountId,
    notifications,

    // Actions
    toggleSidebar,
    setTheme,
    openAddAccountDialog,
    closeAddAccountDialog,
    openEditAccountDialog,
    closeEditAccountDialog,
    openSettingsDialog,
    closeSettingsDialog,
    openLogsDialog,
    closeLogsDialog,
    openBatchOperationDialog,
    closeBatchOperationDialog,
    openStatsDialog,
    closeStatsDialog,
    openAccountInfoDialog,
    closeAccountInfoDialog,
    openBillingDialog,
    closeBillingDialog,
    showNotification,
    removeNotification,

    // A2: 共享 AccountCard 弹窗
    cardDialog,
    openCardDialog,
    closeCardDialog,
    emitCardDialogSuccess,
  };
});
