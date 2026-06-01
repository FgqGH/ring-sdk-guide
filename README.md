# RingSDK 接入示例

微信小程序中集成 `ring-ble-sdk` 的完整 Demo。

## 使用步骤

```bash
# 1. 安装 SDK 依赖（在 ring-sdk-guide 目录下）
cd SDK-guide/ring-sdk-guide
npm install

# 2. 构建 SDK（如果还没有 dist 产物）
pnpm --dir ../../SDK/ring-sdk run build
```

3. 打开**微信开发者工具**，导入 `SDK-guide/ring-sdk-guide` 目录

4. 将 `project.config.json` 中的 `appid` 改为你的真实 AppID

5. 点击 **工具 → 构建 npm**

6. 修改 `pages/demo/demo.js` 中的配置：
   - `licenseKey` — 替换为真实 License Key
   - `licenseServerUrl` — 替换为你的 License 校验服务器地址

7. 编译运行，打开手机蓝牙，靠近戒指设备即可测试

## 项目结构

```
ring-sdk-guide/
├── app.js / app.json / app.wxss    # 小程序入口
├── project.config.json             # 微信开发者工具配置
├── package.json                    # 依赖 ring-ble-sdk（本地路径）
└── pages/
    └── demo/
        ├── demo.js                 # 核心 Demo — SDK 初始化 / 连接 / 测量
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
| 实时心率流 | `RING.startRealtimeHeartRate()` / `stopRealtimeHeartRate()` |
| 断开 | `RING.disconnect()` |
