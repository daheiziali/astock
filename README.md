# A股市场结构仪 Demo

本仓库为 **A股市场结构仪** 的前端 Demo 原型，用于展示产品结构、页面布局、指标交互和说明文案。

当前页面使用模拟数据，不接入真实行情源，不构成投资建议。

## 在线预览

公开 Demo：

https://a-share-market-structure.dgvr7q4n2c.chatgpt.site

## 交付范围

本仓库适合交付给产品、设计和技术人员查看以下内容：

- 产品首页结构与指标卡片
- 全市场宽度热力图
- 风格极值面板
- 行情与趋势对比图
- 大盘、深市、创业板拥挤度曲线
- 融资买入/成交额与成交活跃度展示
- 指标说明、区间解释和合规客观说明

正式开发时，真实数据接入、接口设计、权限控制、数据授权和生产部署需另行实现。

## 本地运行

```bash
npm install
npm run dev
```

本地访问：

```text
http://localhost:3000/
```

生产构建：

```bash
npm run build
```

测试：

```bash
npm test
```

## 核心文件

```text
app/page.tsx                  页面入口
app/ThermometerDashboard.tsx  Dashboard 组件、模拟数据和交互逻辑
app/globals.css               页面样式
app/layout.tsx                页面元信息
PRODUCT_REQUIREMENTS.md       产品指标、公式、数据源和更新频率说明
```

## 说明

- Demo 页面只展示产品前端，不放置技术交付页。
- 技术口径、计算公式、数据源建议和更新频率集中在 `PRODUCT_REQUIREMENTS.md`。
- 页面中的数值和曲线均为模拟数据，仅用于产品演示。
- 正式上线前需确认数据源授权、样本处理规则、异常值校验和合规展示边界。
