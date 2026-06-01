// ============================================================
// RingSDK 接入示例 — 微信小程序 Demo
//
// 使用前：
//   1. npm install（项目根目录 SDK-guide/ring-sdk-guide）
//   2. 微信开发者工具 → 工具 → 构建 npm
//   3. 将 project.config.json 中的 appid 改为你的真实 AppID
// ============================================================

import { RingSDK, BLE_CMD, HEALTH_MEASURE_TYPE, parseRealtimeHr } from 'ring-sdk'

// ⚠️ 替换为你的 License Key 和 License 服务器地址
const RING = new RingSDK({
  licenseKey: 'YOUR_LICENSE_KEY',
  licenseServerUrl: 'https://your-server.com/v1/sdk/verify',
})

Page({
  data: {
    state: '未连接',
    connected: false,
    battery: null,
    heartRate: null,
    bloodPressure: null,
    spo2: null,
    hrv: null,
    realtimeHr: null,
    realtimeHrRunning: false,
  },

  async onLoad() {
    // 注册连接状态变化
    RING.on('stateChange', ({ newState }) => {
      this.setData({ state: newState })
    })

    // 收到设备原始数据 —— 同时过滤实时心率
    RING.on('dataReceived', (data) => {
      console.log('[RingSDK] RX:', data.rawHex)

      // 实时心率：START_HEALTH_MEASURE (0x69) 且子类型为 REALTIME_HR (0x06)
      if (data.cmd === BLE_CMD.START_HEALTH_MEASURE
          && data.payload[0] === HEALTH_MEASURE_TYPE.REALTIME_HR
          && !data.isError) {
        const hr = parseRealtimeHr(data.payload)
        this.setData({ realtimeHr: hr.heartRate })
      }
    })

    RING.on('connected', ({ deviceId }) => {
      this.setData({ connected: true, state: '已连接' })
      console.log('[RingSDK] 已连接:', deviceId)
    })

    RING.on('disconnected', () => {
      this.setData({
        connected: false,
        state: '已断开',
        realtimeHrRunning: false,
      })
    })

    RING.on('error', ({ type, err }) => {
      console.error('[RingSDK] 异常:', type, err)
      wx.showToast({ title: err.message || String(err), icon: 'none' })
    })

    // 初始化 SDK（License 校验）
    const res = await RING.init()
    if (!res.success) {
      this.setData({ state: '初始化失败: ' + res.message })
      return
    }
    this.setData({ state: '就绪 — 请连接戒指' })
  },

  // ========== 连接 / 断开 ==========

  async handleConnect() {
    wx.showLoading({ title: '扫描中...' })
    this.setData({ state: '扫描中...' })
    try {
      await RING.connect()
      // 连接成功后启动心跳保活（微信小程序 BLE 长时间无通信会被系统断开）
      RING.startAutoHeartbeat()
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '连接失败', icon: 'none' })
      this.setData({ state: '连接失败' })
    }
  },

  async handleDisconnect() {
    wx.showLoading({ title: '断开中...' })
    await RING.disconnect()
    wx.hideLoading()
  },

  // ========== 单次测量 ==========

  async handleBattery() {
    wx.showLoading({ title: '读取中...' })
    try {
      const bat = await RING.getBattery()
      this.setData({ battery: bat })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '读取失败', icon: 'none' })
    }
  },

  async handleHeartRate() {
    wx.showLoading({ title: '测量中 (约15s)...' })
    try {
      const hr = await RING.getHeartRate()
      this.setData({ heartRate: hr.heartRate })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '测量超时', icon: 'none' })
    }
  },

  async handleBloodPressure() {
    wx.showLoading({ title: '测量中 (约30s)...' })
    try {
      const bp = await RING.getBloodPressure()
      this.setData({ bloodPressure: bp })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '测量超时', icon: 'none' })
    }
  },

  async handleSpo2() {
    wx.showLoading({ title: '测量中 (约15s)...' })
    try {
      const result = await RING.getSpo2()
      this.setData({ spo2: result })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '测量超时', icon: 'none' })
    }
  },

  async handleHrv() {
    wx.showLoading({ title: '测量中 (约30s)...' })
    try {
      const result = await RING.getHrv()
      this.setData({ hrv: result })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '测量超时', icon: 'none' })
    }
  },

  // ========== 实时心率 ==========

  async handleStartRealtimeHR() {
    try {
      await RING.startRealtimeHeartRate()
      this.setData({ realtimeHrRunning: true })
    } catch (e) {
      wx.showToast({ title: e.message || '启动失败', icon: 'none' })
    }
  },

  async handleStopRealtimeHR() {
    try {
      await RING.stopRealtimeHeartRate()
      this.setData({ realtimeHrRunning: false })
    } catch (e) {
      wx.showToast({ title: e.message || '停止失败', icon: 'none' })
    }
  },
})
