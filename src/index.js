import express from 'express'
import tool from './tool.js'

const app = express()

const lyric_pool = []

app.get("/", (req, res) => {
    console.log(req.originalUrl)
    // 客户端请求查询歌词
    if (req.originalUrl.startsWith("/?sh")) {
        console.log(":: Search Lyrics");
        console.log(JSON.stringify(req.query))
        let artist = tool.parseRequestParams(req.query["sh?Artist"])
        let title = tool.parseRequestParams(req.query.Title)
        tool.searchLrc(artist, title, (xml, xml_data) => {
            lyric_pool.push(xml_data)
            res.contentType = "application/xml"
            return res.send(xml)
        })
    }

    // 客户端请求下载歌词
    if (req.originalUrl.startsWith("/?dl")) {
        let id = req.query['dl?Id']
        console.log(":: Download Lyric")
        console.log(JSON.stringify(req.query))
        console.log(`  - download with id = ${id}`);
        
        for (let i = 0; i < lyric_pool.length; i++) {
            for (let j = 0; j < lyric_pool[i].length; j++) {
                if (lyric_pool[i][j].id == id) {
                    tool.downloadLrc(lyric_pool[i][j].id, lyric_pool[i][j].accesskey, (content) => {
                        res.contentType = "plain/text"
                        return res.send(content)
                    })
                }
            }
        }


    }
})


app.listen(process.env.TTPLAYER_PORT, () => {
    console.log("Server is running at http://localhost:9090")
})