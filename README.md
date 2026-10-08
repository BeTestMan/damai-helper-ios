# 大麦抢票助手 · iOS 版

iPhone 上的**半自动**抢票助手：精确校时 + 开售前本地提醒 + 一键跳转大麦抢购页。

## 为什么是"半自动"

iOS 未越狱环境下，系统**不提供**等价于 Android `AccessibilityService` 的能力——第三方 App 无法读取或点击另一个 App 的界面。这不是技术选型问题，是系统限制，换成 React Native / Flutter / 原生 Swift 都一样。

所以 iOS 版把 Android 版的"全自动点击"换成"**精准授时 + 准点提醒 + 深链直达**"，最后一步由你手动点。代价是最后一下要自己按，收益是**完全合规、不触碰风控**。

| 能力 | Android 版 | iOS 版 |
|---|---|---|
| 读取大麦界面节点 | 有 | 无 |
| 自动点击下单 | 有 | 无 |
| 秒级精确校时 | 有 | **有** |
| 开售前本地提醒 | 有 | **有** |
| 深链直达抢购页 | 有 | **有** |

## 核心功能

- **校时**：多轮采样多个时间源（首选淘宝时间接口，与大麦同属阿里，时间源一致），取往返时延最小的一次估算设备时钟偏移。设备时钟偏差是抢票最隐蔽的杀手——安卓模拟器实测慢 56 秒。
- **提醒**：按"标准时间 − 提前量"计算触发时刻，**再换算成设备时间**去排期系统本地通知（这是最容易写错的一步，见 `docs/architecture.md`）。
- **深链**：点通知进入本 App 后，自动用系统打开大麦演出详情页；只填商品 ID 会自动补全为详情页链接。
- **任务管理**：增删改查，显示倒计时与排期状态。

## 目录结构

```
src/
  app/                    # expo-router 路由（文件即页面）
    _layout.tsx           # 根布局，启动时加载任务并校时
    index.tsx             # 首页：校时状态 + 任务列表
    task.tsx              # 任务编辑页
  core/                   # 与 UI 无关的核心逻辑
    clock.ts              # 校时：偏移估算、trueNow()、设备时间换算
    notifications.ts      # 本地通知：权限、排期、取消
    taskStore.ts          # 任务内存态 + 通知排期（模块级 store）
    storage.ts            # AsyncStorage 持久化
    damaiLink.ts          # 大麦深链构造
    model.ts / format.ts  # 数据模型与格式化
  ui/theme.ts             # 配色与间距
.github/workflows/
  ios-unsigned.yml        # 云端 macOS 构建未签名 .ipa
```

## 本地开发（Windows）

Windows 上**无法**编译 iOS 原生工程，但可以做这些验证：

```bash
npm install
npm run typecheck        # tsc --noEmit
npm run doctor           # expo-doctor
npx expo export --platform ios   # 打包 JS bundle，验证路由与依赖
```

真机运行需要 macOS，所以本项目的 iOS 产物一律走云端构建，见下。

## 构建与安装

不需要 Mac，也不需要 Apple 开发者账号。完整步骤见 [docs/build-and-install.md](docs/build-and-install.md)：

1. 推到 GitHub，Actions 自动在免费 macOS runner 上编译出**未签名** `.ipa`；
2. Windows 上用 **Sideloadly + 免费 Apple ID** 签名并安装到 iPhone；
3. 免费账号签名 **7 天有效**，到期重签一次。

## 与 Android 版的关系

Android 版（`../damai-helper`，Kotlin Multiplatform）保留不变，仍然具备全自动能力。两者共享同一套抢票思路，但 iOS 侧因系统限制只保留授时/提醒/深链这一层，因此用 TypeScript 独立实现，不复用 Kotlin 代码。