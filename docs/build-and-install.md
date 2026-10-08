# 构建与安装

目标：不买 Mac、不买开发者账号，把 App 装到 iPhone 上。

链路是「**云端免费 macOS 编译 → Windows 本地签名安装**」：

```
GitHub Actions (macos-15, 免费)
        │  npx expo prebuild + xcodebuild (不签名)
        ▼
DamaiHelper-unsigned.ipa
        │  下载 artifact
        ▼
Windows + Sideloadly + 免费 Apple ID
        │  重签名并安装
        ▼
iPhone 14 Pro
```

## 一、前置条件

| 项 | 说明 |
|---|---|
| GitHub 账号 | 用**公开仓库**，macOS runner 分钟数完全免费 |
| 免费 Apple ID | 能登录 App Store 即可，无需付费开发者账号 |
| Windows 电脑 | 装 Sideloadly 与 iTunes |
| 数据线 | 连接 iPhone，首次需在手机上「信任此电脑」 |

## 二、推送到 GitHub

本目录已经是一个 git 仓库（分支 `master`），但还没有 remote：

```bash
cd damai-helper-ios
git add -A
git commit -m "feat: iOS 半自动抢票助手（校时 + 提醒 + 深链）"
# 在 GitHub 上新建一个空仓库（不要勾选 README），然后：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin master
```

> 公开仓库的 Actions 分钟数免费；私有仓库会按 macOS 费率扣额度（免费额度 2000 分钟，macOS 按 10 倍消耗）。

## 三、云端构建

推送后 `.github/workflows/ios-unsigned.yml` 会自动触发，也可以在仓库 **Actions → Build unsigned iOS IPA → Run workflow** 手动触发。

流水线做的事：

1. `npm ci` 装依赖；
2. `npx expo prebuild --platform ios --clean --no-install` 生成原生工程（`ios/` 目录由 CNG 生成，不进版本库）；
3. `pod install`；
4. 从 `xcodebuild -list -json` 解析 workspace / scheme，避免依赖命名假设；
5. `xcodebuild ... CODE_SIGNING_ALLOWED=NO ... build`，**只编译不签名**；
6. 把 `.app` 塞进 `Payload/` 打包成 `DamaiHelper-unsigned.ipa` 并上传为 artifact。

构建完成后在 Actions 运行页底部下载 artifact `DamaiHelper-unsigned-ipa`。

## 四、用 Sideloadly 签名安装

1. **装 iTunes**：从 Apple 官网下载桌面版（**不要**用 Microsoft Store 版），Sideloadly 需要它提供的 Apple 设备驱动。
2. **装 Sideloadly**：从 sideloadly.io 下载 Windows 版并安装。
3. **连接 iPhone**：数据线接入，手机上点「信任此电脑」。
4. 打开 Sideloadly：
   - `IPA` 选刚下载的 `DamaiHelper-unsigned.ipa`；
   - `Apple account` 填你的免费 Apple ID；
   - 点 **Start**，按提示输入密码与双重认证验证码。
5. **信任开发者证书**：iPhone 上打开 `设置 → 通用 → VPN 与设备管理`，在「开发者 App」里信任你的 Apple ID 对应条目。
6. 回主屏打开「大麦助手」。

## 五、免费账号的限制

- **签名 7 天后失效**，App 打不开，需要重新用 Sideloadly 签一次（数据不会丢）。
- 同时最多 **3 个**自签名 App。
- 每周最多注册 **10 个** App ID。
- 想省掉重签就升级付费开发者账号（$98.99/年，签名 1 年有效，且顺带获得 Xcode Cloud 25 计算小时/月）。

## 六、风险与排查

**⚠️ 首要未知项：Sideloadly 对 iOS 26 的支持。**
本机是 iOS 26.6.2。免费账号侧载长期可用，但新系统偶尔会收紧。**建议先做一次冒烟验证**：拿任意一个现成的小 ipa 走一遍第四步，确认能装能开，再投入后续调试。

| 现象 | 排查 |
|---|---|
| Actions 里 `pod install` 失败 | 重跑一次；CocoaPods 首次拉取规格库偶发超时 |
| `xcodebuild` 报 scheme 找不到 | 看流水线里 `Resolve workspace and scheme` 步骤打印的列表，确认 scheme 名 |
| Sideloadly 报 `Provision` 相关错误 | 换 AltStore（需在电脑上跑 AltServer），或换一个 Apple ID |
| 装好后闪退 | 大概率是没做第 5 步「信任开发者证书」 |
| 通知不弹 | iPhone `设置 → 通知 → 大麦助手` 打开允许通知；并在 App 内点一次「重新校时」触发排期 |

## 七、日常使用

1. 打开 App，确认顶部「标准时间」与设备时钟偏移（正常应在 ±1 秒内）；
2. `+ 新建`，填演出名称、开售时间（精确到秒）、提前量、大麦链接或商品 ID；
3. 保存后任务卡片应显示「已排期」；
4. 开售前到点收到通知，点通知 → 自动跳转大麦 → 手动下单。

> 设备时间被改动、或跨时区后，请回 App 点一次「重新校时」，否则已排期通知的触发时刻会失准。