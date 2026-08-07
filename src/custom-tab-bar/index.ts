Component({
  data: {
    selected: 1,
    items: [
      { label: '概览', path: '/pages/overview/index' },
      { label: '模型', path: '/pages/models/index' },
      { label: '密钥', path: '/pages/keys/index' },
      { label: '我的', path: '/pages/profile/index' },
    ],
  },
  methods: {
    onSelect(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index)
      const item = this.data.items[index]
      if (!item || index === this.data.selected) return
      wx.switchTab({ url: item.path })
    },
  },
})
