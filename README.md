# 启动服务器(NeteaseCloudMusicApi)

1. 打开 NeteaseCloudMusicApi 文件夹，右键 “在集成终端中打开”

2. 在弹出的控制台输入 npm start，按回车启动服务器

# 启动小程序项目(CloudMusic_study)

1. 打开微信开发者工具

2. 打开 CloudMusic_study 文件夹路径，选择该文件夹

3. 微信公众平台，登陆对应的小程序账号，在开发管理中找到开发者 AppId，并输入至窗口的 Appid 中（一般会登录后微信开发者工具会自动输入，不用自己输入）

4. 选择不使用云服务，然后点击确定即可打开项目

# 真机调试

1. 打开 natapp，输入 natapp -authtoken=590da718e475f7df 指令进行内网穿透

2. 成功内网穿透后，复制对应的 http 域名

3. 在 VSCode 工作区找到 CloudMusic_study/utils/config.js，将 mobileHost 属性的值修改为上一步的 http 域名

4. 在 VSCode 工作区找到 CloudMusic_study/utils/request.js，将 wx.request({url:config.host + url})中的 host 修改为 mobileHost

5. 打开微信开发者工具，单击真机调试即可在手机上进行小程序测试(小程序大小超过 2M 时无法真机调试，需要进行分包)
