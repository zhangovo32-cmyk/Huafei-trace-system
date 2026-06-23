# 席士博农业科技产品二维码追溯系统

一个适配手机微信内置浏览器的 Cloudflare Pages + Pages Functions + D1 防伪验证页面。页面参考了企业防伪 H5 的蓝白视觉结构，但没有使用第三方商标、Logo、产品图或原站资源。

## 截图布局分析

参考图的主要结构如下：

- 顶部是白底品牌区，左上放 Logo 和品牌名，下方是一组浅蓝色线稿工厂/企业建筑插画。
- 中间是大面积纯蓝色认证区，白色系统标题居中，黄色突出防伪编码，查询次数里的数字使用红色。
- 产品信息使用白底圆角卡片，左侧产品图，右侧为品牌、名称、指标、规格、批号、日期、生产商和“点击查看更多”。
- 底部有横幅活动入口，以及两列功能入口按钮。
- 视觉比例以手机竖屏为准，页面最大宽度限制在 480px，适配 iPhone / Android 微信浏览器。

## 项目结构

```text
.
├── .dev.vars.example
├── .gitignore
├── functions
│   ├── _shared
│   │   ├── auth.js
│   │   ├── db.js
│   │   └── http.js
│   ├── admin.js
│   ├── preview.js
│   ├── api
│   │   ├── admin
│   │   │   ├── codes
│   │   │   │   ├── [id].js
│   │   │   │   └── generate.js
│   │   │   ├── codes.js
│   │   │   ├── export.js
│   │   │   ├── login.js
│   │   │   ├── logout.js
│   │   │   ├── logs.js
│   │   │   ├── products
│   │   │   │   └── [id].js
│   │   │   ├── products.js
│   │   │   └── session.js
│   │   └── check
│   │       └── [code].js
│   └── check
│       └── [code].js
├── public
│   ├── assets
│   │   ├── factory-line.svg
│   │   ├── logo-placeholder.svg
│   │   ├── product-bag.png
│   │   └── promo-agriculture.png
│   ├── admin.html
│   ├── admin.js
│   ├── app.js
│   ├── check.html
│   ├── index.html
│   ├── preview.html
│   ├── preview.js
│   └── styles.css
├── package.json
├── schema.sql
└── wrangler.toml
```

## 功能

- `/check/:code`：手机端防伪验证页。
- `/api/check/:code`：后端查询 D1、更新扫码次数、记录扫码日志。
- `/preview`：不连接 D1 的手机端视觉预览页。
- `/admin`：后台登录和管理页面。
- 产品新增、编辑、列表。
- 批量生成 14-18 位随机数字防伪码。
- 防伪码列表、查询次数、首次查询、最近查询。
- 防伪码状态修改：正常、风险、作废。
- 扫码日志查看。
- CSV 导出：`code, verify_url, product_name, batch_no`。

## D1 数据库

建表 SQL 在 `schema.sql`，包含：

- `products`
- `codes`
- `scan_logs`

文件末尾带有一个示例产品和测试码：

```text
7532087070511313
```

生产环境可以删除或替换这段 seed 数据。

## 创建 D1 数据库

```bash
npm install
npx wrangler d1 create product-qr-trace-db
```

把命令输出里的 `database_id` 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "product-qr-trace-db"
database_id = "你的 D1 database_id"
```

初始化本地 D1：

```bash
npx wrangler d1 execute product-qr-trace-db --local --file=./schema.sql
```

初始化远程 D1：

```bash
npx wrangler d1 execute product-qr-trace-db --remote --file=./schema.sql
```

## 本地运行

PowerShell 示例：

```powershell
$env:ADMIN_PASSWORD="change-this-password"
npm run dev
```

也可以复制 `.dev.vars.example` 为 `.dev.vars`，再把密码改成自己的值。

然后访问：

```text
http://127.0.0.1:8788/check/7532087070511313
http://127.0.0.1:8788/admin
```

如果本地 Pages Dev 没有自动读取 D1 绑定，可用：

```bash
npx wrangler pages dev public --d1 DB=product-qr-trace-db --compatibility-date=2026-06-23
```

## Cloudflare Pages 部署

1. 将项目推送到 Git 仓库。
2. 在 Cloudflare Dashboard 创建 Pages 项目并连接仓库。
3. 构建设置：
   - Build command 留空，或使用 `npm install`。
   - Build output directory 填 `public`。
4. Pages 会自动识别项目根目录的 `functions`。
5. 在 Pages 项目的 Settings 中绑定 D1：
   - Variable name：`DB`
   - D1 database：选择 `product-qr-trace-db`
6. 设置环境变量：
   - `ADMIN_PASSWORD=你的后台密码`
7. 部署后执行远程建表：

```bash
npx wrangler d1 execute product-qr-trace-db --remote --file=./schema.sql
```

## 测试防伪码

初始化 schema 后，打开：

```text
https://你的域名/check/7532087070511313
```

第一次查询会显示首次查询提示，并写入：

- `codes.scan_count + 1`
- `codes.first_scan_time`
- `codes.last_scan_time`
- `scan_logs` 一条扫码日志

再次刷新页面会继续增加查询次数。

## 直接预览视觉

如果只是想先看手机端页面样式，不想先配置 D1，可以直接打开：

```text
public/preview.html
```

部署后也可以打开 `/preview`。这个页面使用内置 demo 数据，只用于视觉预览；正式扫码请使用 `/check/{code}`。

## 后台使用

访问：

```text
https://你的域名/admin
```

输入 `ADMIN_PASSWORD` 登录后可以：

- 新增或编辑产品。
- 给产品批量生成防伪码。
- 查看防伪码查询次数和状态。
- 修改防伪码状态。
- 导出 CSV，用于印刷二维码或批量制码。
- 查看扫码日志。

CSV 中的验证链接格式为：

```text
https://你的域名/check/{code}
```

## 品牌替换位置

- 验证页品牌文案：`public/check.html`
- 首页品牌文案：`public/index.html`
- 页面颜色和布局：`public/styles.css`
- 示例产品 seed：`schema.sql`
- 项目内置图片素材：`public/assets`

产品图片可以在后台填写 `image_url`。如果为空，验证页会显示本项目内置的占位包装袋图。

## 内置图片素材

当前项目已经包含完整预览用素材：

- `public/assets/logo-placeholder.svg`：自有品牌占位 Logo。
- `public/assets/factory-line.svg`：顶部浅蓝工厂线稿。
- `public/assets/product-bag.png`：通用肥料包装示意图，无真实品牌文字。
- `public/assets/promo-agriculture.png`：底部活动横幅背景图。

这些素材都是占位资源，不包含参考页面的商标、Logo、品牌名、产品图或原站文件。
