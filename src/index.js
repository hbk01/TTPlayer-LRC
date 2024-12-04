import express from 'express'
import tool from './tool.js'

const app = express()

const lyric_pool = []

app.get("/", (req, res) => {
    // 客户端请求查询歌词
    if (req.originalUrl.startsWith("/?sh")) {
        console.log("## START SEARCH ##");
        console.log(`  - request from ttplayer: ${JSON.stringify(req.query)}`)
        let artist = tool.parseRequestParams(req.query["sh?Artist"])
        let title = tool.parseRequestParams(req.query.Title)
        tool.searchLrc(artist, title, (xml, xml_data) => {
            lyric_pool.push(xml_data)
            res.contentType = "application/xml"
            console.log(`  - send xml data to client.`)
            console.log(`## END SEARCH ##  `)
            return res.send(xml)
        })
    }

    // 客户端请求下载歌词
    if (req.originalUrl.startsWith("/?dl")) {
        let id = req.query['dl?Id']
        console.log("## START DOWNLOAD ##")
        console.log(`  - request from ttplayer: ${JSON.stringify(req.query)}`)
        console.log(`  - download with id = ${id}`);

        for (let i = 0; i < lyric_pool.length; i++) {
            for (let j = 0; j < lyric_pool[i].length; j++) {
                if (lyric_pool[i][j].id == id) {
                    tool.downloadLrc(lyric_pool[i][j].id, lyric_pool[i][j].accesskey, (content) => {
                        res.contentType = "plain/text"
                        // 下载后删除歌词池中对应的条目，防止歌词池膨胀
                        lyric_pool.splice(i, 1)
                        console.log(`  - send lyrics to client.`)
                        console.log(`## END DOWNLOAD ##  `)
                        res.send(content)
                    })
                    return // 解决歌词池有多条匹配内容时重复响应客户端的问题
                }
            }
        }
        return
    }
})

// 优先从环境变量读取端口号，如果没有就用默认的 9090 端口
let port = process.env.TTPLAYER_LRC_PORT | 9090
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
})