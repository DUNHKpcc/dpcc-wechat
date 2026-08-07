import {
  LEGAL_DOCUMENT_EFFECTIVE_DATE,
  LEGAL_DOCUMENT_VERSION,
} from '../../constants/legal'

const documents = {
  agreement: {
    title: '用户服务协议',
  },
  privacy: {
    title: '隐私政策',
  },
}

Page({
  data: {
    type: 'privacy' as 'agreement' | 'privacy',
    title: '隐私政策',
    version: LEGAL_DOCUMENT_VERSION,
    effectiveDate: LEGAL_DOCUMENT_EFFECTIVE_DATE,
  },

  onLoad(options: Record<string, string | undefined>) {
    const type = options.type === 'agreement' ? 'agreement' : 'privacy'
    const document = documents[type]
    wx.setNavigationBarTitle({ title: document.title })
    this.setData({ type, title: document.title })
  },
})
