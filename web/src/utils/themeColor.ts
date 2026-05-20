/**
 * PWA 主题色管理
 * 根据用户选择的主题，动态更新 meta theme-color
 */

export interface ThemeColorMap {
  light: string
  dark: string
}

// 主题色映射 - 跟随 Element Plus 的主题色
export const themeColorMap: ThemeColorMap = {
  light: '#409EFF', // Element Plus 亮色主题色
  dark: '#27619b'   // Element Plus 深色主题色（可根据需要调整）
}

/**
 * 更新 PWA theme-color meta 标签
 * @param theme light 或 dark
 */
export function updateThemeColor(theme: 'light' | 'dark') {
  const color = themeColorMap[theme]

  // 更新 meta theme-color
  let metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta')
    metaThemeColor.setAttribute('name', 'theme-color')
    document.head.appendChild(metaThemeColor)
  }
  metaThemeColor.setAttribute('content', color)

  // console.log(`✓ Theme color updated to ${color} (${theme})`)
}

/**
 * 获取当前主题色
 */
export function getCurrentThemeColor(theme: 'light' | 'dark'): string {
  return themeColorMap[theme]
}

/**
 * 初始化主题色（在应用启动时调用）
 * @param initialTheme 初始主题
 */
export function initThemeColor(initialTheme: 'light' | 'dark' = 'light') {
  updateThemeColor(initialTheme)
}
