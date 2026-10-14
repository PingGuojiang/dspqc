# GitHub Pages 部署教程

本项目可部署为静态站点以下是部署操作指南；仓库目前没有预置自动发布工作流，也不代表已经开通 Pages

## 1. 确认站点路径

- 当前仓库的项目站点预期地址：`https://pingguojiang.github.io/Dyson-Sphere-Program-Quantitative-Calculator/`
- 用户站点（仓库名为 `PingGuojiang.github.io`）或自定义域名根目录部署，使用 `/`
- 项目站点必须使用 `/Dyson-Sphere-Program-Quantitative-Calculator/`；不要将域名放入 Vite 的 `base`

## 2. 项目站点构建前的路径调整

当前代码使用根路径 PWA 配置，不能只添加 `--base` 就认为部署完整先修改以下文件，完成验证后提交：

### vite.config.ts

在配置外声明：

```ts
const base = '/Dyson-Sphere-Program-Quantitative-Calculator/';
```

在返回的配置对象加入 `base`在 `VitePWA` 的 `manifest` 中将 `id`、`start_url`、`scope` 改为 `base`，每个图标的 `src` 改为 `${base}pwa-192x192.png` 或 `${base}pwa-512x512.png`保持其他 PWA 配置

根目录部署则令 `base = '/'`

### index.html

将 favicon 和 Apple 图标路径改为 `%BASE_URL%icon.svg`、`%BASE_URL%apple-touch-icon.png`移除手写的 `<link rel="manifest" href="/manifest.json" />`，让 vite-plugin-pwa 注入构建生成的 manifest 链接，避免同时使用两份 manifest

### public/manifest.json

该文件是早期手写 manifest，图标和入口使用根路径移除该文件或停止分发它，统一以插件生成的 `manifest.webmanifest` 为准应用游戏图标组件已使用 `import.meta.env.BASE_URL`；自定义图标 URL 也需要检查

## 3. 本地检查

```sh
npm ci
npm test
npm run lint
npm run build
npm run preview
```

打开预览服务打印的地址，加上对应仓库子路径确认 JS、CSS、游戏图标、favicon、manifest 和 Service Worker 没有 404核对生成的 `dist/manifest.webmanifest` 中的入口、scope 和图标路径

## 4. 使用 GitHub Actions 发布

仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**创建 `.github/workflows/deploy-pages.yml`：

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

`main` 必须替换为仓库实际发布分支上传的仅是 `dist`，无需提交生成目录首次部署可在 Actions 页面手动触发，成功后从部署任务获取实际站点地址

发布时保留代码许可证和第三方声明，并确保用户可获取对应构建版本的完整源代码可在构建后复制 LICENSE、THIRD_PARTY_NOTICES.md 和 LICENSES 目录到 dist，或提供明确的仓库版本链接；这不替代 GPL 的其他适用义务

## 5. 发布后验证与常见问题

- 两种模式能切换、配置能保存、分享链接可打开；本地与 Pages 属于不同来源，本地保存不会自动迁移，可使用分享链接转移配置
- 链接状态位于 URL hash，无需后端路由重写不要覆盖分享链接的 hash
- 图标丢失：检查 base、manifest 图标路径和自定义图标 URL
- 页面空白：检查构建输出是否在预期子路径、JS/CSS 请求是否成功
- 旧版本仍出现：等待 Service Worker 更新；必要时在浏览器应用面板注销旧 Worker 并清理站点缓存，再重载
- 安装入口不可用：检查 HTTPS、manifest、图标和 Service Worker；并非所有浏览器都会显示安装按钮

官方参考：[Vite 静态部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub Pages Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
