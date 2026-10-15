# GitHub Pages 部署教程

项目通过 GitHub Actions 将测试分支构建为静态站点，并发布到 GitHub Pages

- 在线地址：[https://pingguojiang.github.io/dspqc/](https://pingguojiang.github.io/dspqc/)
- 发布分支：`codex/dsp-dual-mode`
- 工作流：[deploy-pages.yml](../.github/workflows/deploy-pages.yml)
- 首次成功部署：[Actions 运行记录](https://github.com/PingGuojiang/dspqc/actions/runs/38592695730)
- 2026-10-15 已确认构建、发布成功，页面、JS/CSS、游戏图标、PWA 图标、manifest、Service Worker 和许可证文件可访问

## 1. 启用 Pages

当前仓库 `PingGuojiang/dspqc` 已公开，并启用 GitHub Actions 发布源

在其他仓库复用时：

1. 确认仓库套餐支持 Pages，公开仓库可使用 GitHub Free，私有仓库需要支持私有仓库 Pages 的套餐
2. 打开仓库 **Settings → Pages → Build and deployment**
3. 将 **Source** 设为 **GitHub Actions**
4. 打开 **Settings → Environments → github-pages**，检查 **Deployment branches and tags**
5. 若使用分支白名单，将 `codex/dsp-dual-mode` 加入允许发布的分支；默认只允许 `main` 时，测试分支会被环境规则拒绝

Pages 的发布来源由工作流决定，当前工作流仅在推送测试分支时自动发布，无需向主分支或 `gh-pages` 分支提交构建产物

## 2. 自动发布与手动发布

### 自动发布

将修改提交并推送到 `codex/dsp-dual-mode` 后，工作流自动执行：

1. 安装 Node.js 22，运行 `npm ci`
2. 运行 `npm run lint` 进行 TypeScript 类型检查
3. 设置 `VITE_BASE_PATH=/dspqc/` 并运行 `npm run build`
4. 将 `LICENSE`、`THIRD_PARTY_NOTICES.md` 和 `LICENSES` 复制到 `dist`
5. 上传 Pages 构建产物并部署到 `github-pages` 环境

工作流需要 `contents: read`、`pages: write` 和 `id-token: write` 权限，使用 `github-pages` 并发组避免多个发布任务同时运行

### 手动发布

打开 **Actions → Deploy test branch to GitHub Pages**，选择测试分支的一次历史运行，点击 **Re-run all jobs**，重新部署该次运行对应的提交

也可使用已登录的 GitHub CLI：

```sh
gh run list --repo PingGuojiang/dspqc --branch codex/dsp-dual-mode --workflow deploy-pages.yml
gh run rerun <运行ID> --repo PingGuojiang/dspqc
```

打开运行记录，确认 `build` 和 `deploy` 都成功，再访问部署任务显示的站点地址

工作流已声明 `workflow_dispatch`，但 GitHub 的新建手动运行入口要求工作流也存在于默认分支；当前工作流仅在测试分支，因此使用推送或重跑历史记录即可发布，无需改动主分支

## 3. 子路径与 PWA 配置

项目站点路径为 `/dspqc/`，工作流通过 `VITE_BASE_PATH: /${{ github.event.repository.name }}/` 自动使用仓库名

路径适配已包含在项目中：

- `vite.config.ts` 从 `VITE_BASE_PATH` 读取 `base`，未设置时使用 `/`，适用于本地开发
- PWA manifest 的 `id`、`start_url`、`scope` 和图标路径使用同一 `base`
- `index.html` 的图标路径使用 `%BASE_URL%`，manifest 由 `vite-plugin-pwa` 注入
- 游戏图标和 Service Worker 注册地址使用 `import.meta.env.BASE_URL`

仓库改名后，工作流构建路径会跟随新名称变化；站点地址、外部分享链接和教程中的地址仍需更新

如部署到用户站点或自定义域名根目录，将工作流中的 `VITE_BASE_PATH` 改为 `/`，不要将完整域名填入 Vite 的 `base`

## 4. 本地预览 Pages 构建

安装依赖后，在 PowerShell 中运行：

```powershell
npm ci
npm run lint
$env:VITE_BASE_PATH = '/dspqc/'
npm run build
npm run preview -- --host 127.0.0.1
```

访问预览服务打印的地址并添加 `/dspqc/`，通常为 `http://127.0.0.1:4173/dspqc/`

结束预览后可清除当前终端的构建变量：

```powershell
Remove-Item Env:VITE_BASE_PATH
```

`dist` 是构建产物，由 Actions 上传，无需提交到仓库

## 5. 发布后检查

- 确认首页、JS/CSS、`dsp_icons` 游戏图标和 PWA 图标没有 404
- 检查 `manifest.webmanifest` 的 `id`、`start_url` 和 `scope` 均为 `/dspqc/`，`sw.js` 可访问
- 在浏览器中检查普通量化与混带模式切换、各自配置保存、2D 画布以及分享链接
- 本地与 Pages 属于不同来源，本地保存不会自动迁移，可使用分享链接转移配置
- 分享状态位于 URL hash，部署无需后端路由重写，保留分享链接中的 hash
- 确认站点根路径下可获取许可证、第三方声明，并可从公开仓库获取对应构建版本的完整源代码

首次部署已完成线上 HTTP 资源检查；浏览器中的双模式交互与 PWA 安装体验仍需按上述步骤人工检查

## 6. 常见问题

| 现象 | 排查方式 |
| --- | --- |
| `Your current plan does not support GitHub Pages for this repository` | 使用支持私有仓库 Pages 的套餐，或经仓库所有者授权后设为公开 |
| `configure-pages` 提示找不到站点 | 在 Settings → Pages 中启用 GitHub Actions 发布源 |
| 测试分支被环境规则拒绝 | 在 `github-pages` 环境的分支白名单中加入 `codex/dsp-dual-mode` |
| 页面空白或图标丢失 | 核对 `/dspqc/` 子路径、构建时的 `VITE_BASE_PATH` 和资源请求地址 |
| 仍显示旧版本 | 等待 Service Worker 更新，必要时注销旧 Worker 并清理该站点缓存，再重新加载 |
| 没有 PWA 安装按钮 | 检查 HTTPS、manifest、图标和 Service Worker，安装入口也取决于浏览器支持 |

官方参考：[Vite 静态部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[GitHub Pages 套餐要求](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
