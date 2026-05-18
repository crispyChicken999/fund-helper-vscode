/**
 * PWA 工具函数
 */
import { ref } from 'vue';

let installPrompt: any = null;
const isInstallPromptReady = ref(false);

// 监听 beforeinstallprompt 事件
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    isInstallPromptReady.value = true;
    console.log('✓ Install prompt event captured');
  });
}

/**
 * 触发PWA安装提示
 * @returns 返回是否成功触发
 */
export async function triggerInstallPrompt() {
  if (!installPrompt) {
    return false;
  }

  try {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✓ User accepted PWA installation');
      installPrompt = null;
      isInstallPromptReady.value = false;
      return true;
    } else {
      console.log('⚠ User dismissed PWA installation');
      return false;
    }
  } catch (error) {
    console.error('✗ Failed to trigger install prompt:', error);
    return false;
  }
}

/**
 * 检查是否可以安装PWA
 */
export function canInstallPWA() {
  return isInstallPromptReady.value;
}

/**
 * 检查PWA是否已安装
 */
export function isPWAInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    (document.referrer.includes('android-app://') ||
     document.referrer.includes('ios-app://'))
  );
}

/**
 * 检查浏览器是否支持PWA
 */
export function isPWASupported() {
  return 'serviceWorker' in navigator && 'caches' in window;
}
