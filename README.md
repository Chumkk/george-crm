# 敬城 CRM · GitHub Pages 发布版

静态交互原型，包含 CRM、客户报价预览、流程图与宣讲稿。此版本已适配 GitHub 仓库子目录、图片路径以及“复制链接”，无需安装依赖或执行构建。

## 第一次发布

1. 登录 GitHub，创建一个名为 george-crm 的仓库。使用 GitHub Free 时选择 Public（公开）；这会公开仓库内的原型文件，发布前请确认其中内容适合公开展示。
2. 解压发布包，通过 Add file → Upload files 上传解压后的全部文件并提交。上传的是文件，不是 ZIP；index.html 要直接位于仓库根目录，不能再套一层“GitHub-Pages-发布包”文件夹。
3. 打开仓库 Settings → Pages，在 Build and deployment 中选择 Deploy from a branch，选择 main 和 /(root)，点击 Save。
4. 等待部署完成，在 Settings → Pages 中点击 Visit site。首次发布或后续更新可能需要约 10 分钟。
5. 网站地址一般为 https://你的用户名.github.io/george-crm/ ，以 Pages 显示的地址为准。

## 分享给客户

从发布后的 CRM 进入项目报价总览，点击“复制链接”。客户链接会自动使用当前 GitHub Pages 地址，并保留项目、币种、汇率与默认英文设置；手机和电脑均可打开。

GAD 项目的地址结构：

    https://你的用户名.github.io/george-crm/client.html?project=PJ0018011&currency=USD&rate=7.2&lang=en#plan

迁移后需要首次重新分享新域名的链接；原 chatgpt.site 链接不会自动变成 GitHub 链接。本地双击 HTML 可以预览，但请在发布后的网页复制客户链接。

## 后续更新

将新版发布包的文件上传到同一个仓库、同一个 main 分支，覆盖同名文件并提交。部署成功后，访问者刷新已有的 GitHub 链接即可看到新版，无需更换网址。仅修改电脑上的文件不会自动更新 GitHub。

## 文件入口

- index.html：CRM 主界面
- client.html：客户报价预览
- workflow.html：完整业务流程
- speech.html：演讲稿
- speech.md：演讲稿 Markdown 原文
- media-*：图片资源，需一同上传
- .nojekyll：直接发布静态文件

这是原型演示，登录和业务操作为演示交互，操作状态保存在各访问者自己的浏览器中，没有共享业务数据库。发布的是界面与内置演示数据，不包含电脑浏览器中临时新增的客户或草稿。

GitHub Pages 更换了托管平台，不保证所有网络都一定可访问。

官方操作说明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
