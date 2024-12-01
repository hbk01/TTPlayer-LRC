# 项目简介

此项目用于为千千静听音乐播放器提供歌词服务器，歌词来自于酷狗音乐

大致运行过程如下

```
千千静听 -> TTPlayer-LRC -> 酷狗音乐
                             |
千千静听 <- TTPlayer-LRC    <-     
```

# 快速开始

## 服务器部署

需要的软件
- nodejs

此教程假设你已安装并配置好 nodejs 和 npm

将此项目克隆至您的服务器（或个人电脑）中，打开 cmd 并进入到项目目录，运行以下命令安装相关依赖：

```
npm install
```

安装完毕后，使用以下命令运行调试程序：

```
npm run dev
```

建议使用 `pm2` 创建守护进程，这样不需要一直开着命令窗口：

```
pm2 start ./ecosystem.config.js
```

## 客户端

需修改 `千千静听安装目录\AddIn\ttp_lrcsh.ini` 文件的内容即可使用

```
<ttp_lrcsvr query_url="服务运行地址">
    <server name="TTPlayer-LRC" url="服务运行地址"/>
</ttp_lrcsvr>
```

note1: 将上述的“服务运行地址”替换为你的地址

note2: 若您在个人电脑部署，则把服务运行地址改为 `http://127.0.0.1:9090` 即可

# 感谢

此项目参考了以下项目的内容，特此感谢！

- [ttplayerLrcSearch](https://github.com/tsingui/ttplayerLrcSearch)
- [kugou-lrc](https://github.com/bingaha/kugou-lrc)
