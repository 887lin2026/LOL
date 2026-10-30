# Nidalee 等级轮换扩展（实验版）

基于 Nidalee 0.1.4（GPL-3.0-only）的源代码作增量修改。原项目为 https://github.com/dancer/nidalee 。本项目修改内容也按 GPL-3.0-only 分发，保留原 LICENSE。

## 功能
- 保留原版账号保存、Windows DPAPI 加密、一键登录、游戏启动等功能。
- 增加“等级轮换”选项卡：按勾选顺序排队登录英雄联盟账号。
- 从 League Client 本机 HTTPS API `/lol-summoner/v1/current-summoner` 获取当前召唤师等级。
- 达到或超过用户输入的目标等级后调用原版 `force_close_game` 结束游戏和 Riot Client 进程，然后登录下一个账号。
- 读取失败会重试，连续 20 次失败则停止；支持手动停止；具有日志、当前账号和当前等级显示。

## Windows 本地构建
环境：Windows 10/11，Node.js 18+、Rust (MSVC target)、Visual Studio C++ Build Tools、WebView2。

在本目录运行：

```powershell
npm install
npm run tauri dev
```

正式打包：

```powershell
npm run tauri build
```

构建结果应位于 `apps/desktop/src-tauri/target/release/bundle/`。

## 使用步骤
1. 启动应用，在 Add Account 添加本人拥有的英雄联盟账号；在 Settings 中设置 Riot Client 路径，必要时指定 League 安装路径。
2. 先手动正常登录一次，进入客户端大厅，点击“等级轮换” -> “读取当前等级”，确认 LCU 可用。
3. 退出当前游戏和 Riot 客户端，勾选要处理的账号（按选择顺序排列），填写等级阈值（如 30）和监测间隔（如 15 秒）。
4. 点击“开始自动登录/监测”。完成客户端登录后会查询等级；达到阈值即结束该客户端并切换下一账号。
5. 点击“停止”只停止后续自动操作，不会立刻强制结束已经打开的客户端。

## 限制与注意
- **不提供任何自动对局、练级、绕过验证码、绕过二次验证**功能。
- **仅支持 Windows 本地运行**。未在本环境对 Windows 二进制进行构建或测试，属于待本机验证源码。
- LCU 是非官方内部接口，可能随 Riot 客户端版本发生变化。尤其需要检查 lockfile 的位置和获取权限。
- 仅检测已登录 League Client 的当前等级；客户端缺失、未就绪、认证失败不会被解释成达到目标等级。
- 原项目通过模拟键盘输入密码，一旦鼠标/窗口焦点切换，可能把密码输入其他窗口；请保持前台稳定。
- 原版 `force_close_game` 使用 Windows `taskkill` 结束相关进程，可能中断对局、丢失未保存的状态。**只在不处于对局时运行**；当前已增加简单的对局进程检测，但仍应增加正式退出和账号身份匹配。
- 配置好的账号密码仍依照原版使用当前 Windows 用户 DPAPI 加密保存在 `%APPDATA%\Nidalee`。不建议在日志中记录密码。
- 不保证自动化行为符合游戏服务条款，使用者应自行确认。

## 修改文件
- `apps/desktop/src-tauri/Cargo.toml`：添加 Rust HTTPS 客户端依赖。
- `apps/desktop/src-tauri/src/main.rs`：添加 `read_summoner_level` 命令。
- `apps/desktop/src/components/LevelRotation.tsx`：等级读取、轮换和日志界面。
- `apps/desktop/src/components/Tabs.tsx` 和 `src/App.tsx`：接入新的选项卡。
