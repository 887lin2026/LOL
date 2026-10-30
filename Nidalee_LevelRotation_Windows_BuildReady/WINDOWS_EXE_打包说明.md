# Nidalee 等级轮换扩展版：Windows EXE 打包说明

## 你需要知道

- 本压缩包是**源码与构建配置**，不是已编译的 EXE。
- 上传的原版源码已经有「等级轮换」界面，构建方案保留该功能。
- 这里采用 **Tauri v1 / Rust / React** 的 Windows 原生编译，而不是 PyInstaller。
- 已为自编译版本添加独立的 `tauri.local-build.conf.json`，仅在打包时禁用上游自动更新，避免自动更新覆盖扩展功能；**不改变原始 `tauri.conf.json`**。
- 没有原作者的签名私钥，因此不制作上游 Tauri 更新包；本地 EXE 也未签署代码签名证书。

## 方案 A：GitHub Actions 自动编译（推荐；电脑无需安装 Node.js 或 Rust）

1. 将本 ZIP 解压到一个文件夹，确保能看到 `package.json`、`apps`、`.github`、`build_windows.bat`。
2. 在自己的 GitHub 账号创建一个**私有**空仓库（不初始化 README），将完整源码（包括 `.github` 隐藏目录）提交到仓库的 `main` 分支。最简单可使用 GitHub Desktop 软件的 **File → Add local repository → Create a repository here → Publish repository**；发布前勾选 Keep this code private。
3. 打开新仓库的 **Actions**，选择 **Build Windows EXE (LevelRotation)**。如果没有自动运行，点击 **Run workflow**。首次启用 Actions 可能需要确认。
4. 进入成功的运行记录，在页面底部 **Artifacts** 下载 `Nidalee-LevelRotation-Windows-x64-EXE`。
5. 解压该 Artifact，得到 `nidalee.exe` 和 `nidalee.exe.sha256`。将 `nidalee.exe` 放到自己选择的目录使用。
6. 如需安装包，在 **Run workflow** 时勾选 `Also build MSI installer`。随后下载另一个名为 `Nidalee-LevelRotation-Windows-x64-MSI` 的 Artifact（若 MSI 构建成功）。

> 该构建使用 GitHub 的 Windows runner，在线下载 npm 和 Rust 依赖，所以上传源码后要能正常访问 npm / crates.io。GitHub Actions 私有仓库用量受账号计划及额度限制。

## 方案 B：在自己 Windows 10/11 电脑上打包

准备：Node.js 18+（建议 22 LTS）、Rust MSVC 工具链、Visual Studio 的 **Desktop development with C++** 组件和 Windows SDK，以及 WebView2。

在源码根目录双击或在 CMD 运行：

```bat
build_windows.bat
```

默认编译成单独的可执行文件：

```text
apps\desktop\src-tauri\target\release\nidalee.exe
```

如需额外生成 MSI，CMD 中运行：

```bat
build_windows.bat --msi
```

安装包位于：

```text
apps\desktop\src-tauri\target\release\bundle\msi\
```

若只想手动编译，则在项目根目录执行：

```bat
npm ci
cd apps\desktop
npx tauri build --ci --bundles none --config src-tauri/tauri.local-build.conf.json
```

## 注意

- Tauri 应用在 Windows 运行需要系统 WebView2 Runtime（大部分更新的 Windows 10/11 已带有）。
- `nidalee.exe` 是一份独立的应用主程序，但不代表携带全部 Windows 组件或 WebView2；某些环境仍需安装系统依赖。
- 「等级轮换」使用非官方 League Client 本地 API，只有实际 Windows / Riot 客户端环境才能验证自动切换效果。
- 不要将包含账号密码的个人数据或运行日志公开发布到 GitHub。这里提供的压缩包不包含用户账号数据。
- 该应用涉及账号凭据与自动输入，首次运行建议先用测试账号确认行为；遵守服务条款。
- 本流程尚未在本地 Windows runner 实际编译，不能保证构建一定成功；如果工作流失败，请复制 **Build Windows standalone EXE** 步骤错误日志进一步修正。
