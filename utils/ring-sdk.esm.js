/**
 * 戒指蓝牙协议层 — 协议常量、CRC 校验、指令封包/解包、BCD 编解码、
 * 字节序处理、指令构建器、响应解析器
 *
 * 根据青橙手环蓝牙协议规格书 V1.6.58 实现
 * 协议格式：16 字节定长帧 = [命令 1B, 载荷 14B, CRC 1B]
 *
 * 零外部依赖，纯 JS 函数，可在任意 JS 环境运行。
 *
 * 来源：合并自
 *   src/utils/bleProtocol.ts  +  src/utils/bleCommands.ts  +  src/utils/bleResponseParser.ts
 */

// ==================== 命令码常量 ====================

const BLE_CMD = {
  // ========== 基础设置 ==========
  SET_TIME:              0x01,
  CAMERA:                 0x02,
  READ_BATTERY:           0x03,
  BIND_ANCS:              0x04,
  WRIST_DISPLAY:          0x05,
  DO_NOT_DISTURB:         0x06,
  READ_DAILY_SPORT:       0x07,
  HARD_RESET:             0x08,
  ANTI_LOST:              0x09,
  SET_USER_PARAMS:        0x0A,
  ANDROID_HEARTBEAT:      0x0B,

  // ========== 血压相关 ==========
  TIMED_BP_SETTING:       0x0C,
  TIMED_BP_DATA:          0x0D,
  TIMED_BP_CONFIRM:       0x0E,

  // ========== 绑定与通话 ==========
  BIND_NOTIFY:            0x10,
  ANDROID_HANGUP:         0x11,
  CLOCK_FACE_SWITCH:      0x12,

  // ========== 数据读取 ==========
  READ_EXERCISE_DATA:     0x13,
  READ_MANUAL_BP:         0x14,
  READ_TIMED_HR:          0x15,
  TIMED_HR_SWITCH:        0x16,

  // ========== 实时测量 ==========
  REALTIME_HR_CONTROL:    0x1E,
  SCREEN_OFF_SETTING:     0x1F,
  HR_CALIBRATION:         0x20,

  // ========== 运动与睡眠 ==========
  GET_DETAIL_SPORT:       0x43,
  GET_DETAIL_SLEEP:       0x44,
  QUERY_DATA_STORAGE:     0x46,
  GET_REALTIME_SPORT:     0x48,

  // ========== 查找 ==========
  FIND_DEVICE:            0x50,

  // ========== 健康测量 ==========
  START_HEALTH_MEASURE:   0x69,
  STOP_HEALTH_MEASURE:    0x6A,
  START_ECG:              0x6C,
  ECG_DATA:               0x6D,

  // ========== 推送 ==========
  PUSH_NOTIFICATION:      0x72,
  DATA_CHANGED:           0x73,

  // ========== 恢复出厂 ==========
  FACTORY_RESET:          0xFF,
};

// ==================== 测量 / 控制类型常量 ====================

const HEALTH_MEASURE_TYPE = {
  HEART_RATE:     0x01,
  BLOOD_PRESSURE: 0x02,
  BLOOD_OXYGEN:   0x03,
  FATIGUE:        0x04,
  ONE_KEY:        0x05,
  REALTIME_HR:    0x06,
  ECG:            0x07,
  STRESS:         0x08,
  BLOOD_SUGAR:    0x09,
  HRV:            0x0A,
  TEMPERATURE:    0x0B,
};

const REALTIME_HR_CTRL = { START: 0x01, STOP: 0x04 };

const DATA_CHANGE_TYPE = {
  HEART_RATE:     0x01,
  BLOOD_PRESSURE: 0x02,
  BLOOD_OXYGEN:   0x03,
  STEPS:          0x04,
  TEMPERATURE:    0x05,
  SLEEP:          0x06,
  EXERCISE_RECORD:0x07,
  ALARM:          0x08,
  STRESS:         0x0A,
  HRV:            0x0B,
  BATTERY_CHANGE: 0x0C,
  BLOOD_SUGAR:    0x0D,
  SPORT:          0x12,
};

const LANGUAGE_CODE = {
  CHINESE_SIMPLIFIED:  0x00};

// ==================== CRC 校验 & 指令封包/解包 ====================

/** 前 15 字节求和，取低 8 位 */
function calculateCRC(bytes) {
  let sum = 0;
  for (let i = 0; i < 15 && i < bytes.length; i++) sum += bytes[i];
  return sum & 0xFF
}

/** 组装 16 字节指令 ArrayBuffer */
function packCommand(cmd, payload = []) {
  const buf = new ArrayBuffer(16);
  const v = new Uint8Array(buf);
  v[0] = cmd === 0xFF ? 0xFF : cmd & 0x7F;          // 命令
  for (let i = 0; i < 14; i++) v[i + 1] = i < payload.length ? payload[i] & 0xFF : 0x00;
  const crcInput = []; for (let i = 0; i < 15; i++) crcInput.push(v[i]);
  v[15] = calculateCRC(crcInput);
  return buf
}

/** 解析 16 字节响应数据 */
function parseResponse(buffer) {
  const v = new Uint8Array(buffer);
  const rawCmd = v[0];
  const isError = (rawCmd & 0x80) !== 0;
  const cmd = rawCmd & 0x7F;
  const payload = [];
  for (let i = 1; i < 15; i++) payload.push(v[i]);
  const crcInput = []; for (let i = 0; i < 15; i++) crcInput.push(v[i]);
  return {
    isValid: v[15] === calculateCRC(crcInput),
    isError,
    cmd,
    payload,
    crc: v[15],
    rawHex: ab2hex(buffer),
  }
}

// ==================== ArrayBuffer ↔ Hex ====================

function ab2hex(buffer) {
  const v = new Uint8Array(buffer);
  let s = ''; for (let i = 0; i < v.length; i++) s += v[i].toString(16).padStart(2, '0');
  return s.toUpperCase()
}

// ==================== BCD 编解码 ====================

function toBCD(value) {
  return ((Math.floor(value / 10) % 10) << 4) | (value % 10)
}
function dateToBCD(d) {
  return [toBCD(d.getFullYear() % 100), toBCD(d.getMonth() + 1), toBCD(d.getDate()),
          toBCD(d.getHours()), toBCD(d.getMinutes()), toBCD(d.getSeconds())]
}

// ==================== 字节序 ====================

function littleEndian16(lo, hi) { return (hi << 8) | lo }

// ==================== 指令构建器 ====================

function buildSetTimeCmd(d = new Date(), language = LANGUAGE_CODE.CHINESE_SIMPLIFIED, timezone) {
  const tz = -(d.getTimezoneOffset() / 60);
  const tzCode = Math.round(tz * 2) + 1;
  return packCommand(BLE_CMD.SET_TIME, [...dateToBCD(d), language, tzCode])
}
function buildReadBatteryCmd() {
  return packCommand(BLE_CMD.READ_BATTERY)
}
function buildHeartbeatCmd() {
  return packCommand(BLE_CMD.ANDROID_HEARTBEAT)
}
function buildBindNotifyCmd() {
  return packCommand(BLE_CMD.BIND_NOTIFY)
}

// -- 健康测量 --
function buildStartHeartRateCmd() {
  return packCommand(BLE_CMD.START_HEALTH_MEASURE, [HEALTH_MEASURE_TYPE.HEART_RATE])
}
function buildStartRealtimeHrCmd() {
  return packCommand(BLE_CMD.START_HEALTH_MEASURE, [HEALTH_MEASURE_TYPE.REALTIME_HR, REALTIME_HR_CTRL.START])
}
function buildStopRealtimeHrCmd() {
  return packCommand(BLE_CMD.START_HEALTH_MEASURE, [HEALTH_MEASURE_TYPE.REALTIME_HR, REALTIME_HR_CTRL.STOP])
}
function buildStartSpo2Cmd() {
  return packCommand(BLE_CMD.START_HEALTH_MEASURE, [HEALTH_MEASURE_TYPE.BLOOD_OXYGEN])
}
function buildStartBpCmd() {
  return packCommand(BLE_CMD.START_HEALTH_MEASURE, [HEALTH_MEASURE_TYPE.BLOOD_PRESSURE])
}
function buildStartStressCmd() {
  return packCommand(BLE_CMD.START_HEALTH_MEASURE, [HEALTH_MEASURE_TYPE.STRESS])
}
function buildStartHrvCmd() {
  return packCommand(BLE_CMD.START_HEALTH_MEASURE, [HEALTH_MEASURE_TYPE.HRV])
}
function buildReadDetailSleepCmd(daysAgo = 0, startIndex = 0, endIndex = 95) {
  return packCommand(BLE_CMD.GET_DETAIL_SLEEP, [daysAgo, 0x0f, startIndex, endIndex])
}
function buildReadDetailSportCmd(daysAgo = 0, startIndex = 0, endIndex = 95) {
  return packCommand(BLE_CMD.GET_DETAIL_SPORT, [daysAgo, 0x0f, startIndex, endIndex, 0x01])
}

/** 电量 */
function parseBattery(payload) {
  return { level: payload[0] || 0, isCharging: (payload[1] || 0) === 1 }
}

/** 心率（单次测量） */
function parseHeartRate(payload) {
  return { heartRate: payload[2] || 0, rri: littleEndian16(payload[5], payload[9]) }
}

/** 血压（单次测量） */
function parseBloodPressure(payload) {
  return {
    heartRate: payload[2] || 0,
    systolic: payload[3] || 0,
    diastolic: payload[4] || 0,
  }
}

/** 血氧（单次测量） */
function parseSpo2(payload) {
  if ((payload[3] || 0) === 1) return { spo2: payload[2] || 0 }
  return { heartRate: payload[2] || 0 }
}

/** 压力（单次测量） */
function parseStressResponse(payload) {
  return { stress: payload[2] || 0 }
}

/** 实时心率 */
function parseRealtimeHr(payload) {
  return { heartRate: payload[2] || 0 }
}

/** HRV */
function parseHrv(payload) {
  return {
    errorType: payload[1] || 0,
    hrv: payload[2] || 0,
    rri: littleEndian16(payload[5], payload[6]),
  }
}

// ==================== 睡眠 / 运动数据解析 ====================

/**
 * 解析详细睡眠响应数据包
 * 协议格式：索引包 payload[0]=0xF0 / 无数据=0xFF，数据包 payload[0]=年-2000
 */
function parseDetailSleepResponse(payload) {
  const firstByte = payload[0];
  if (firstByte === 0xff) return { isIndex: true, hasData: false }
  if (firstByte === 0xf0) return { isIndex: true, hasData: true, dataCount: payload[1] }
  return {
    isIndex: false,
    hasData: true,
    sleepEntry: {
      date: { year: 2000 + payload[0], month: payload[1], day: payload[2] },
      timeIndex: payload[3],
      sleepType: payload[6],
      validMinutes: payload[7],
      quality: payload[8],
    }
  }
}

/**
 * 解析详细运动响应数据包
 * 协议格式同睡眠，数据包含卡路里/步数/距离/跑步步数（小端序）
 */
function parseDetailSportResponse(payload) {
  const firstByte = payload[0];
  if (firstByte === 0xff) return { isIndex: true, hasData: false }
  if (firstByte === 0xf0) return { isIndex: true, hasData: true, dataCount: payload[1], isNewProtocol: payload[2] === 0x01 }
  return {
    isIndex: false,
    hasData: true,
    sportEntry: {
      date: { year: 2000 + payload[0], month: payload[1], day: payload[2] },
      timeIndex: payload[3],
      calories: littleEndian16(payload[6], payload[7]),
      steps: littleEndian16(payload[8], payload[9]),
      distance: littleEndian16(payload[10], payload[11]),
      runSteps: littleEndian16(payload[12], payload[13]),
    }
  }
}

/**
 * 戒指 BLE 连接管理模块
 *
 * 封装微信小程序原生 wx.xxx 蓝牙 API，提供：
 * - 蓝牙适配器 初始化 / 关闭
 * - 设备扫描 与 戒指前缀过滤
 * - 设备连接 / 断开
 * - GATT 服务发现 与 特征值 Notify
 * - 指令收发
 *
 * 纯事件驱动（EventEmitter 模式），不依赖 Vue / Pinia。
 *
 * 来源：适配自 src/hooks/useBluetooth.ts + src/hooks/bluetoothHelpers.ts
 */


// ==================== 常量 ====================

const SERVICE_UUID           = '6E40FFF0-B5A3-F393-E0A9-E50E24DCCA9E';
const WRITE_CHAR_UUID        = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const NOTIFY_CHAR_UUID       = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

const DEFAULT_PREFIXES = ['O_', 'R0', 'R1', 'RT', 'RING1', 'Ring_', 'SR_', 'QC_'];

const STATE = { DISCONNECTED: 'disconnected', SCANNING: 'scanning', CONNECTING: 'connecting', CONNECTED: 'connected' };

// ==================== 内部状态 ====================

let _state        = STATE.DISCONNECTED;
let _deviceId     = null;
let _adapterReady = false;
let _notifyReady  = false;
let _discovered   = [];            // { name, deviceId, RSSI }[]

// ==================== EventEmitter ====================

const _listeners = new Map();

function on(event, cb) {
  if (!_listeners.has(event)) _listeners.set(event, []);
  _listeners.get(event).push(cb);
}

function off(event, cb) {
  const cbs = _listeners.get(event);
  if (cbs) { const i = cbs.indexOf(cb); if (i !== -1) cbs.splice(i, 1); }
}

function emit(event, ...args) {
  const cbs = _listeners.get(event);
  if (cbs) cbs.forEach(cb => { try { cb(...args); } catch (e) { console.error('[ring-sdk] emit error:', e); } });
}

function setState(s) {
  const old = _state; _state = s;
  if (old !== s) emit('stateChange', { oldState: old, newState: s });
}

// ==================== 蓝牙适配器 ====================

async function openAdapter() {
  return new Promise((resolve, reject) => {
    wx.openBluetoothAdapter({
      success: () => { _adapterReady = true; resolve(); },
      fail: (e) => {
        _adapterReady = false;
        emit('error', { type: 'adapter_init', err: e });
        reject(e);
      }
    });
  })
}

// ==================== 设备扫描 ====================

function isRingDevice(name, prefixes = DEFAULT_PREFIXES) {
  if (!name) return false
  return prefixes.some(p => name.startsWith(p))
}

async function startScan({ timeout = 10000, allowDuplicates = false, prefixes = DEFAULT_PREFIXES } = {}) {
  if (!_adapterReady) await openAdapter();
  _discovered = [];
  setState(STATE.SCANNING);

  return new Promise((resolve, reject) => {
    wx.onBluetoothDeviceFound(res => {
      (res.devices || []).forEach(d => {
        if (!isRingDevice(d.name, prefixes)) return
        if (!allowDuplicates && _discovered.some(x => x.deviceId === d.deviceId)) return
        const dev = { name: d.name || '', deviceId: d.deviceId, RSSI: d.RSSI || 0 };
        _discovered.push(dev);
        emit('deviceFound', dev);
      });
    });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: allowDuplicates,
      success: () => resolve(),
      fail: (e) => { setState(STATE.DISCONNECTED); emit('error', { type: 'scan_start', err: e }); reject(e); }
    });

    if (timeout > 0) setTimeout(() => stopScan(), timeout);
  })
}

async function stopScan() {
  return new Promise(resolve => {
    wx.stopBluetoothDevicesDiscovery({
      success: () => { if (_state === STATE.SCANNING) setState(STATE.DISCONNECTED); resolve(); },
      fail: () => resolve()
    });
  })
}

// ==================== 设备连接 ====================

async function connect(deviceId, { timeout = 10000 } = {}) {
  if (!_adapterReady) await openAdapter();
  await stopScan();
  setState(STATE.CONNECTING);

  return new Promise((resolve, reject) => {
    const tid = setTimeout(() => {
      setState(STATE.DISCONNECTED);
      emit('error', { type: 'connect_timeout', deviceId });
      reject(new Error(`连接超时: ${deviceId}`));
    }, timeout);

    wx.onBLEConnectionStateChange(res => {
      if (res.deviceId !== deviceId) return
      if (!res.connected) {
        clearTimeout(tid); setState(STATE.DISCONNECTED);
        _deviceId = null; _notifyReady = false;
        emit('disconnected', { deviceId });
        return
      }
      clearTimeout(tid);
      _deviceId = deviceId;
      _discover(deviceId).then(() => {
        setState(STATE.CONNECTED);
        emit('connected', { deviceId });
        resolve();
      }).catch(e => { emit('error', { type: 'discovery', err: e }); reject(e); });
    });

    wx.createBLEConnection({
      deviceId,
      success: () => {},
      fail: (e) => { clearTimeout(tid); setState(STATE.DISCONNECTED); emit('error', { type: 'connect', err: e }); reject(e); }
    });
  })
}

async function disconnect() {
  if (!_deviceId) return
  return new Promise(resolve => {
    wx.closeBLEConnection({
      deviceId: _deviceId,
      success: () => { _deviceId = null; _notifyReady = false; setState(STATE.DISCONNECTED); emit('disconnected', {}); resolve(); },
      fail: () => { _deviceId = null; _notifyReady = false; setState(STATE.DISCONNECTED); resolve(); }
    });
  })
}

// ==================== GATT 服务发现 ====================

function _discover(deviceId) {
  return new Promise((resolve, reject) => {
    wx.getBLEDeviceServices({
      deviceId,
      success: (r) => {
        const svc = (r.services || []).find(s => s.uuid.toUpperCase() === SERVICE_UUID.toUpperCase());
        if (!svc) return reject(new Error('未找到戒指 GATT 服务'))
        wx.getBLEDeviceCharacteristics({
          deviceId, serviceId: svc.uuid,
          success: (cr) => {
            const chars = cr.characteristics || [];
            const wc = chars.find(c => c.uuid.toUpperCase() === WRITE_CHAR_UUID.toUpperCase());
            const nc = chars.find(c => c.uuid.toUpperCase() === NOTIFY_CHAR_UUID.toUpperCase());
            if (!wc || !nc) return reject(new Error('未找到写/通知特征值'))
            _enableNotify(deviceId, svc.uuid, nc.uuid).then(resolve).catch(reject);
          },
          fail: (e) => reject(new Error('获取特征值失败: ' + (e.errMsg || e)))
        });
      },
      fail: (e) => reject(new Error('获取服务失败: ' + (e.errMsg || e)))
    });
  })
}

function _enableNotify(deviceId, serviceId, charId) {
  return new Promise((resolve, reject) => {
    wx.onBLECharacteristicValueChange(res => {
      if (res.deviceId !== deviceId) return
      const parsed = parseResponse(res.value);
      emit('dataReceived', {
        cmd: parsed.cmd, payload: parsed.payload, isError: parsed.isError,
        rawHex: parsed.rawHex, isValid: parsed.isValid
      });
    });

    wx.notifyBLECharacteristicValueChange({
      deviceId, serviceId, characteristicId: charId, state: true,
      success: () => { _notifyReady = true; resolve(); },
      fail: (e) => reject(new Error('启用 Notify 失败: ' + (e.errMsg || e)))
    });
  })
}

// ==================== 指令发送 ====================

async function send(buffer) {
  if (!_deviceId) throw new Error('未连接设备')
  if (!_notifyReady) throw new Error('Notify 尚未启用')
  return new Promise((resolve, reject) => {
    wx.writeBLECharacteristicValue({
      deviceId: _deviceId, serviceId: SERVICE_UUID, characteristicId: WRITE_CHAR_UUID, value: buffer,
      success: () => { console.log('[ring-sdk] TX:', ab2hex(buffer)); resolve(); },
      fail: (e) => reject(new Error('写入失败: ' + (e.errMsg || e)))
    });
  })
}
function isConnected() { return _state === STATE.CONNECTED && !!_deviceId }

/**
 * RingSDK — 智能戒指蓝牙通信 SDK 主入口
 *
 * 封装 BLE 连接管理、协议解析、健康数据读取能力。
 * 专为微信小程序设计，使用 wx.xxx 原生 API。
 *
 * 基本用法
 * --------
 *   import { RingSDK } from 'ring-ble-sdk'
 *   const ring = new RingSDK({ licenseKey: 'YOUR_KEY' })
 *
 *   await ring.init()                           // License 校验
 *   ring.on('deviceFound', d => { ... })        // 监听扫描结果
 *   ring.on('dataReceived', d => { ... })       // 监听设备数据
 *   await ring.connect()                        // 扫描并连接
 *   const bp  = await ring.getBloodPressure()   // → { systolic, diastolic, pulse }
 *   const hrv = await ring.getHrv()             // → { errorType, hrv }
 *   await ring.startRealtimeHeartRate()         // 启动实时心率流
 *   ring.startAutoHeartbeat()                   // 每 30s 心跳保活
 */


// ==================== SDK 常量 ====================

const VERSION           = '1.0.0';
const PROTOCOL_VERSION  = 1;

const DEFAULT_LICENSE_URL = 'https://license.example.com/v1/sdk/verify';

// ==================== RingSDK 主类 ====================

class RingSDK {
  /**
   * @param {{ licenseKey: string, licenseServerUrl?: string }} options
   */
  constructor({ licenseKey, licenseServerUrl } = {}) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      throw new Error('[RingSDK] licenseKey 不能为空')
    }
    this._licenseKey       = licenseKey;
    this._licenseServerUrl = licenseServerUrl || DEFAULT_LICENSE_URL;
    this._initialized      = false;
  }

  // ---------- 初始化 ----------

  /**
   * 初始化 SDK —— 仅执行 License 远程校验
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async init() {
    if (this._initialized) return { success: true, message: '已初始化' }

    // TODO: 发布前恢复 License 远程校验
    // try {
    //   await License.verify(this._licenseKey, VERSION, this._licenseServerUrl)
    // } catch (e) {
    //   return { success: false, message: e.message }
    // }
    // if (License.isExpired()) {
    //   return { success: false, message: 'License 已过期' }
    // }

    this._initialized = true;
    console.log(`[RingSDK] v${VERSION} protocol v${PROTOCOL_VERSION} — 初始化成功`);
    return { success: true, message: 'SDK 初始化成功' }
  }

  /** SDK 版本 */
  get version() { return VERSION }

  // ---------- 连接 ----------

  /**
   * 扫描并连接戒指设备
   *
   * 流程：初始化蓝牙适配器 → 扫描 → 取第一个匹配设备 → 连接 → 同步时间
   *
   * @param {{ timeout?: number, scanTimeout?: number }} [opts]
   * @returns {Promise<{ deviceId: string, deviceName: string }>}
   */
  async connect(opts = {}) {
    this._ensureInit();
    const { timeout = 15000, scanTimeout = 10000 } = opts;

    // 初始化蓝牙适配器
    await openAdapter();

    // 开始扫描
    return new Promise((resolve, reject) => {
      const tid = setTimeout(() => {
        off('deviceFound', handler);
        reject(new Error('扫描超时，未发现戒指设备'));
      }, timeout);

      const handler = async (dev) => {
        // 发现设备后立刻停止扫描并连接
        off('deviceFound', handler);
        clearTimeout(tid);

        try {
          await stopScan();
          await connect(dev.deviceId, { timeout: 10000 });

          // 连接成功后自动同步时间并通知绑定
          await send(buildSetTimeCmd());
          try { await send(buildBindNotifyCmd()); } catch (_) { /* 非致命 */ }

          resolve({ deviceId: dev.deviceId, deviceName: dev.name });
        } catch (e) {
          reject(e);
        }
      };

      on('deviceFound', handler);
      startScan({ timeout: scanTimeout }).catch(e => {
        off('deviceFound', handler);
        clearTimeout(tid);
        reject(e);
      });
    })
  }

  /** 断开连接 */
  async disconnect() {
    return disconnect()
  }

  /** 是否已连接 */
  isConnected() {
    return isConnected()
  }

  // ---------- 健康数据读取 ----------

  /**
   * 读取设备电量
   * @returns {Promise<{ level: number, isCharging: boolean }>}
   */
  async getBattery() {
    this._ensureConn();
    await send(buildReadBatteryCmd());
    return this._waitResponse(BLE_CMD.READ_BATTERY, 5000, parseBattery)
  }

  /**
   * 获取心率（单次测量）
   * @returns {Promise<{ heartRate: number, rri?: number }>}
   */
  async getHeartRate() {
    this._ensureConn();
    await send(buildStartHeartRateCmd());
    return this._waitHealthMeasure(HEALTH_MEASURE_TYPE.HEART_RATE, 15000, parseHeartRate)
  }

  /**
   * 获取血氧（单次测量）
   * @returns {Promise<{ spo2?: number, heartRate?: number }>}
   */
  async getSpo2() {
    this._ensureConn();
    await send(buildStartSpo2Cmd());
    return this._waitHealthMeasure(HEALTH_MEASURE_TYPE.BLOOD_OXYGEN, 15000, parseSpo2)
  }

  /**
   * 获取血压（单次测量）
   * @returns {Promise<{ systolic: number, diastolic: number, heartRate: number }>}
   */
  async getBloodPressure() {
    this._ensureConn();
    await send(buildStartBpCmd());
    return this._waitHealthMeasure(HEALTH_MEASURE_TYPE.BLOOD_PRESSURE, 30000, parseBloodPressure)
  }

  /**
   * 获取 HRV（心率变异性，单次测量）
   * @returns {Promise<{ errorType: number, hrv: number, rri?: number }>}
   */
  async getHrv() {
    this._ensureConn();
    await send(buildStartHrvCmd());
    return this._waitHealthMeasure(HEALTH_MEASURE_TYPE.HRV, 30000, parseHrv)
  }

  /**
   * 获取压力（单次测量，约 15s）
   * @returns {Promise<{ stress: number }>}
   */
  async getStress() {
    this._ensureConn();
    await send(buildStartStressCmd());
    return this._waitHealthMeasure(HEALTH_MEASURE_TYPE.STRESS, 15000, parseStressResponse)
  }

  /**
   * 获取详细睡眠数据
   * @param {number} [daysAgo=1] — 几天前（1=昨晚，0=今晚）
   * @returns {Promise<{ date: string, entries: Array }>}
   */
  async getSleep(daysAgo = 1) {
    this._ensureConn();
    await send(buildReadDetailSleepCmd(daysAgo));
    const packets = await this._collectPackets(BLE_CMD.GET_DETAIL_SLEEP, 8000);
    const entries = packets
      .map(p => parseDetailSleepResponse(p.payload))
      .filter(r => !r.isIndex && r.sleepEntry)
      .map(r => r.sleepEntry);
    return { date: this._daysAgoToDate(daysAgo), entries }
  }

  /**
   * 获取详细运动数据（步数/卡路里/距离/跑步步数）
   * @param {number} [daysAgo=0] — 几天前（0=今天）
   * @returns {Promise<{ date: string, entries: Array }>}
   */
  async getActivity(daysAgo = 0) {
    this._ensureConn();
    await send(buildReadDetailSportCmd(daysAgo));
    const packets = await this._collectPackets(BLE_CMD.GET_DETAIL_SPORT, 8000);
    const entries = packets
      .map(p => parseDetailSportResponse(p.payload))
      .filter(r => !r.isIndex && r.sportEntry)
      .map(r => r.sportEntry);
    return { date: this._daysAgoToDate(daysAgo), entries }
  }

  /**
   * 发送原始指令（逃生舱）
   * @param {ArrayBuffer} buffer — 16 字节指令，可用 packCommand() 自行构建
   */
  async send(buffer) {
    this._ensureConn();
    return send(buffer)
  }

  /** 启动实时心率流 */
  async startRealtimeHeartRate() {
    this._ensureConn();
    await send(buildStartRealtimeHrCmd());
  }

  /** 停止实时心率流 */
  async stopRealtimeHeartRate() {
    this._ensureConn();
    await send(buildStopRealtimeHrCmd());
  }

  // ---------- 心跳 ----------

  /** 心跳保活（单次） */
  async heartbeat() {
    if (!isConnected()) return
    try { await send(buildHeartbeatCmd()); } catch (_) { /* 静默 */ }
  }

  /** 启动自动心跳（每 30s） */
  startAutoHeartbeat() {
    this._ensureConn();
    const id = setInterval(() => {
      if (!isConnected()) { clearInterval(id); return }
      this.heartbeat();
    }, 30000);
    return id
  }

  // ---------- 事件 ----------

  /**
   * 注册事件监听
   *
   * 支持的事件：
   *   'stateChange'   — 连接状态变化  ({ oldState, newState })
   *   'deviceFound'    — 扫描发现设备  ({ name, deviceId, RSSI })
   *   'dataReceived'   — 收到设备数据  ({ cmd, payload, isError, rawHex })
   *   'connected'      — 连接成功      ({ deviceId })
   *   'disconnected'   — 断开连接
   *   'error'          — 异常          ({ type, err })
   *
   * @param {string} event
   * @param {Function} cb
   */
  on(event, cb) {
    on(event, cb);
  }

  /** 移除事件监听 */
  off(event, cb) {
    off(event, cb);
  }

  // ---------- 内部工具 ----------

  _ensureInit() {
    if (!this._initialized) throw new Error('[RingSDK] 请先调用 ring.init()')
  }

  _ensureConn() {
    this._ensureInit();
    if (!isConnected()) throw new Error('[RingSDK] 请先调用 ring.connect()')
  }

  /**
   * 收集指定命令码的所有响应包（用于多包数据读取如睡眠/运动）
   * @param {number} cmd — 命令码
   * @param {number} timeout — 收集超时
   * @returns {Promise<Array>}
   */
  _collectPackets(cmd, timeout) {
    return new Promise((resolve) => {
      const packets = [];
      setTimeout(() => {
        off('dataReceived', handler);
        resolve(packets);
      }, timeout);
      const handler = (data) => {
        if (data.cmd === cmd) packets.push(data);
      };
      on('dataReceived', handler);
    })
  }

  /** 计算 daysAgo 对应的日期字符串 YYYY-MM-DD */
  _daysAgoToDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10)
  }

  /**
   * 等待指定命令码的响应
   * @param {number} expectCmd
   * @param {number} timeout
   * @param {(payload: number[]) => object} parser
   * @returns {Promise<object>}
   */
  _waitResponse(expectCmd, timeout, parser) {
    return new Promise((resolve, reject) => {
      const tid = setTimeout(() => { off('dataReceived', h); reject(new Error('设备响应超时')); }, timeout);
      const h = (data) => {
        if (data.cmd === expectCmd && !data.isError) {
          clearTimeout(tid); off('dataReceived', h); resolve(parser(data.payload));
        }
      };
      on('dataReceived', h);
    })
  }

  /**
   * 等待健康测量响应（STOP_HEALTH_MEASURE 或 START_HEALTH_MEASURE）
   */
  _waitHealthMeasure(expectType, timeout, parser) {
    return new Promise((resolve, reject) => {
      const tid = setTimeout(() => { off('dataReceived', h); reject(new Error('测量超时')); }, timeout);
      const h = (data) => {
        // STOP_HEALTH_MEASURE (0x6A) 或 START_HEALTH_MEASURE (0x69)  且 payload[0] 匹配测量类型
        if ((data.cmd === BLE_CMD.STOP_HEALTH_MEASURE || data.cmd === BLE_CMD.START_HEALTH_MEASURE)
            && !data.isError
            && data.payload[0] === expectType) {
          clearTimeout(tid); off('dataReceived', h); resolve(parser(data.payload));
        }
      };
      on('dataReceived', h);
    })
  }
}

export { BLE_CMD, DATA_CHANGE_TYPE, HEALTH_MEASURE_TYPE, PROTOCOL_VERSION, RingSDK, VERSION, RingSDK as default, packCommand, parseDetailSleepResponse, parseDetailSportResponse, parseRealtimeHr, parseStressResponse };
