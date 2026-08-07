interface MenuButtonRect {
  top: number
  height: number
}

export function calculateHeaderInset(
  statusBarHeight: number,
  menuButton?: MenuButtonRect
): number {
  const safeStatusBarHeight = Math.max(0, statusBarHeight)
  if (!menuButton || menuButton.height <= 0) {
    return Math.ceil(safeStatusBarHeight + 52)
  }

  const menuGap = Math.max(4, menuButton.top - safeStatusBarHeight)
  const navigationBarHeight = menuGap * 2 + menuButton.height
  return Math.ceil(safeStatusBarHeight + navigationBarHeight + 8)
}

export function getHeaderInset(): number {
  try {
    const windowInfo = wx.getWindowInfo()
    const menuButton = wx.getMenuButtonBoundingClientRect()
    return calculateHeaderInset(windowInfo.statusBarHeight || 0, menuButton)
  } catch {
    const systemInfo = wx.getSystemInfoSync()
    return calculateHeaderInset(systemInfo.statusBarHeight || 0)
  }
}
