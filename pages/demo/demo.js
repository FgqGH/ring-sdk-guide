// ============================================================
// RingSDK 接入示例 — 微信小程序 Demo
//
// 使用前：
//   1. npm install
//   2. 微信开发者工具 → 工具 → 构建 npm
//   3. 将 project.config.json 中的 appid 改为你的真实 AppID
// ============================================================

import { RingSDK } from 'ring-sdk'

const RING = new RingSDK({ licenseKey: 'YOUR_LICENSE_KEY' })

Page({
  data: {
    state: '未连接',
    connected: false,
    battery: null,
    heartRate: null,
    bloodPressure: null,
  },

  async onLoad() {
    // 注册所有事件
    RING.on('stateChange', ({ newState }) => {
      this.setData({ state: newState })
    })

    RING.on('dataReceived', (data) => {
      console.log('[RingSDK] RX:', data.rawHex)
    })

    RING.on('connected', ({ deviceId }) => {
      this.setData({ connected: true, state: '已连接' })
      console.log('[RingSDK] 已连接:', deviceId)
    })

    RING.on('disconnected', () => {
      this.setData({ connected: false, state: '已断开' })
    })

    RING.on('error', ({ type, err }) => {
      console.error('[RingSDK] 异常:', type, err)
      wx.showToast({ title: err.message || '异常', icon: 'none' })
    })

    // 初始化 SDK
    const res = await RING.init()
    if (!res.success) {
      this.setData({ state: '初始化失败: ' + res.message })
      return
    }
    this.setData({ state: '就绪' })
  },

  // ----- 按钮事件 -----

  async handleConnect() {
    this.setData({ state: '扫描中...' })
    try {
      await RING.connect()
    } catch (e) {
      wx.showToast({ title: e.message, icon: 'none' })
      this.setData({ state: '连接失败' })
    }
  },

  async handleHeartRate() {
    wx.showLoading({ title: '测量中...' })
    try {
      const hr = await RING.getHeartRate()
      this.setData({ heartRate: hr.heartRate })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message, icon: 'none' })
    }
  },

  async handleBloodPressure() {
    wx.showLoading({ title: '测量中...' })
    try {
      const bp = await RING.getBloodPressure()
      this.setData({ bloodPressure: bp })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message, icon: 'none' })
    }
  },

  handleDisconnect() {
    RING.disconnect()
  },
})
