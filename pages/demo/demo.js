// ============================================================
// RingSDK 接入示例 — 微信小程序 Demo
//
// 使用前：
//   1. npm install（项目根目录 SDK-guide/ring-sdk-guide）
//   2. 微信开发者工具 → 工具 → 构建 npm
//   3. 将 project.config.json 中的 appid 改为你的真实 AppID
// ============================================================

import { RingSDK, BLE_CMD, HEALTH_MEASURE_TYPE, parseRealtimeHr, packCommand } from '../../utils/ring-sdk.esm.js'

const RING = new RingSDK({ licenseKey: 'demo' })

Page({
  data: {
    state: '未连接',
    connected: false,
    battery: null,
    heartRate: null,
    bloodPressure: null,
    spo2: null,
    hrv: null,
    stress: null,
    realtimeHr: null,
    realtimeHrRunning: false,
    sleepSummary: '',
    activitySummary: '',
    rawHex: '',
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

  async handleStress() {
    wx.showLoading({ title: '测量中 (约15s)...' })
    try {
      const result = await RING.getStress()
      this.setData({ stress: result })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '测量超时', icon: 'none' })
    }
  },

  async handleSleep() {
    wx.showLoading({ title: '读取昨晚睡眠...' })
    try {
      const result = await RING.getSleep(1)
      const count = result.entries.length
      const summary = count > 0
        ? `${result.date} 共 ${count} 条 · 首条: 时段${result.entries[0].timeIndex} 类型${result.entries[0].sleepType} 质量${result.entries[0].quality}`
        : `${result.date} 无数据`
      this.setData({ sleepSummary: summary })
      console.log('[Sleep]', result.entries)
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '读取超时', icon: 'none' })
    }
  },

  async handleActivity() {
    wx.showLoading({ title: '读取今日运动...' })
    try {
      const result = await RING.getActivity(0)
      const totalSteps = result.entries.reduce((s, e) => s + e.steps, 0)
      const totalCal = result.entries.reduce((s, e) => s + e.calories, 0)
      const summary = result.entries.length > 0
        ? `${result.date} 步数:${totalSteps} 卡路里:${(totalCal/100).toFixed(1)}kcal 条数:${result.entries.length}`
        : `${result.date} 无数据`
      this.setData({ activitySummary: summary })
      console.log('[Activity]', result.entries)
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: e.message || '读取超时', icon: 'none' })
    }
  },

  handleSendRaw() {
    const hex = (this.data.rawHex || '').replace(/\s/g, '')
    if (!hex || hex.length !== 32) {
      wx.showToast({ title: '请输入 16 字节 HEX（32 个字符）', icon: 'none' })
      return
    }
    // 将 hex 字符串转为 ArrayBuffer（简易版：手动构建 Uint8Array）
    const bytes = []
    for (let i = 0; i < 32; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16))
    const buf = packCommand(bytes[0], bytes.slice(1, 15))
    RING.send(buf).then(() => {
      wx.showToast({ title: '已发送', icon: 'success' })
    }).catch(e => {
      wx.showToast({ title: e.message || '发送失败', icon: 'none' })
    })
  },

  onRawInput(e) {
    this.setData({ rawHex: e.detail.value })
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
