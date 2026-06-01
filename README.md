# RingSDK 接入示例

微信小程序中集成 `ring-ble-sdk` 的完整 Demo。**自包含，开箱即用。**

## 使用步骤

1. 打开**微信开发者工具**，导入 `SDK-guide/ring-sdk-guide` 目录

2. 将 `project.config.json` 中的 `appid` 改为你的真实 AppID（或用测试号）

3. 编译运行，打开手机蓝牙，靠近戒指设备即可测试

> 无需 `npm install`，无需"构建 npm"。SDK 已编译为单文件直接放在 `utils/` 目录。

## 项目结构

```
ring-sdk-guide/
├── app.js / app.json / app.wxss    # 小程序入口
├── project.config.json             # 微信开发者工具配置
├── utils/
│   └── ring-sdk.esm.js             # SDK 单文件（开箱即用）
└── pages/
    └── demo/
        ├── demo.js                 # 核心 Demo — 全部测量功能
        ├── demo.wxml               # UI
        └── demo.wxss               # 样式
```

## Demo 功能

| 功能 | API |
|------|-----|
| 扫描连接 | `RING.connect()` |
| 心跳保活 | `RING.startAutoHeartbeat()` |
| 电量 | `RING.getBattery()` |
| 单次心率 | `RING.getHeartRate()` |
| 单次血压 | `RING.getBloodPressure()` |
| 单次血氧 | `RING.getSpo2()` |
| 单次 HRV | `RING.getHrv()` |
| 压力 | `RING.getStress()` |
| 昨晚睡眠 | `RING.getSleep(1)` |
| 今日运动 | `RING.getActivity(0)` |
| 实时心率流 | `RING.startRealtimeHeartRate()` / `stopRealtimeHeartRate()` |
| 自定义指令 | `RING.send(packCommand(...))` |
| 断开 | `RING.disconnect()` |
