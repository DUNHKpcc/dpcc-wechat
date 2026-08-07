import { ensureAuthenticated } from '../../services/auth'
import { getPublicModels } from '../../services/new-api'
import type { AvailableModel } from '../../types/api'
import { formatContextLength } from '../../utils/format'
import { getHeaderInset } from '../../utils/navigation'

interface ModelDisplay {
  name: string
  vendor: string
  iconPath: string
  description: string
  price: string
  context: string
  tags: string[]
}

let allModels: AvailableModel[] = []

function toDisplay(model: AvailableModel): ModelDisplay {
  let price = '价格未标注'
  if (model.quotaType === 1 && model.modelPrice !== null) {
    price = `$${model.modelPrice} / 次`
  } else if (model.modelRatio !== null) {
    price = `输入 ${model.modelRatio}× · 输出 ${model.completionRatio ?? 1}×`
  }

  return {
    name: model.name,
    vendor: model.vendor,
    iconPath: model.iconPath,
    description: model.description || '该模型暂未提供描述',
    price,
    context: formatContextLength(model.contextLength),
    tags: model.tags.slice(0, 3),
  }
}

Page({
  data: {
    headerInset: getHeaderInset(),
    loading: true,
    refreshing: false,
    errorMessage: '',
    keyword: '',
    selectedVendor: '全部',
    vendors: ['全部'],
    models: [] as ModelDisplay[],
    resultCount: 0,
  },

  async onLoad() {
    await this.loadData()
  },

  onShow() {
    const tabBar = this.getTabBar?.()
    if (tabBar) tabBar.setData({ selected: 1 })
  },

  async onPullDownRefresh() {
    await this.loadData(true)
    wx.stopPullDownRefresh()
  },

  async loadData(refreshing = false) {
    this.setData({
      loading: !refreshing,
      refreshing,
      errorMessage: '',
    })
    try {
      allModels = await getPublicModels()
      const vendors = [
        '全部',
        ...Array.from(new Set(allModels.map((model) => model.vendor))).sort(),
      ]
      this.setData({ vendors, loading: false, refreshing: false })
      this.applyFilters()
    } catch (error) {
      this.setData({
        loading: false,
        refreshing: false,
        errorMessage:
          error instanceof Error ? error.message : '模型列表加载失败',
      })
    }
  },

  onSearch(event: WechatMiniprogram.Input) {
    this.setData({ keyword: event.detail.value })
    this.applyFilters()
  },

  onSelectVendor(event: WechatMiniprogram.TouchEvent) {
    this.setData({ selectedVendor: String(event.currentTarget.dataset.vendor) })
    this.applyFilters()
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase()
    const selectedVendor = this.data.selectedVendor
    const models = allModels.filter((model) => {
      const matchesVendor =
        selectedVendor === '全部' || model.vendor === selectedVendor
      const searchable =
        `${model.name} ${model.vendor} ${model.description} ${model.tags.join(' ')}`.toLowerCase()
      return matchesVendor && (!keyword || searchable.includes(keyword))
    })

    this.setData({
      models: models.map(toDisplay),
      resultCount: models.length,
    })
  },

  onRetry() {
    void this.loadData()
  },

  async onOpenAccount() {
    const authenticated = await ensureAuthenticated()
    if (authenticated) {
      wx.switchTab({ url: '/pages/overview/index' })
      return
    }
    wx.navigateTo({ url: '/pages/login/index' })
  },
})
