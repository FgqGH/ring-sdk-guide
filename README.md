# RingSDK 接入示例

从 GitHub 引入 `ring-sdk`，在微信小程序中使用的完整 Demo。

## 使用步骤

```bash
# 1. 克隆
git clone https://github.com/FgqGH/ring-sdk-guide.git
cd ring-sdk-guide

# 2. 安装依赖
npm install
```

3. 打开**微信开发者工具**，导入本项目目录

4. 将 `project.config.json` 中的 `appid` 改为你的真实 AppID

5. 点击 **工具 → 构建 npm**

6. 将 `pages/demo/demo.js` 中的 `YOUR_LICENSE_KEY` 替换为真实 License Key

7. 编译运行，打开蓝牙，靠近戒指即可测试

## 项目结构

```
ring-sdk-guide/
├── app.js / app.json / app.wxss    # 小程序入口
├── project.config.json             # 微信开发者工具配置
├── package.json                    # 依赖 ring-sdk
└── pages/
    └── demo/
        ├── demo.js                 # 核心 Demo 页面
        ├── demo.wxml               # UI
        └── demo.wxss               # 样式
```
