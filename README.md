# 敬城 CRM · React 原型发布版

本仓库根目录是已构建的静态发布文件，可直接由 GitHub Pages 发布。界面采用 React 工程组织，导航、登录、待办中心、企业微信通知及草稿列表已组件化；现有报价、图纸、3D 等业务引擎通过兼容层保留。

- `index.html`：CRM 主入口。
- `client.html`：客户报价预览，保留项目、币种、汇率与语言参数。
- `main-*.js`、`main-*.css`：构建后的 React 界面。
- `engine-*.js`、`prototype.css`：保留的业务引擎与共享样式。
- `media-*`：页面图片资源。
- `workflow.html`、`speech.html`：已有业务流程及演示说明。

后续维护在 `george-crm-react` 源码工程进行，执行 `pnpm install --frozen-lockfile`、`pnpm build` 后，把完整 `dist` 内容上传到此仓库的 `main` 分支根目录。只上传 HTML 会遗漏必需的脚本和样式；发布内容需要通过网页地址访问，不直接双击本地 HTML。

已有 GitHub 客户链接继续有效，更新成功后刷新即可看到新版。复制链接仍从项目报价总览发起。

当前为演示原型，业务数据保存在各访问者的浏览器中，尚未接入共享数据库或真实企业微信发送服务。相同网址下保留原存储键；更换域名不会自动迁移浏览器数据。
