import axios from "axios"
import { json } from "express"

const http = axios

const tool = {}

// 解析千千静听请求的参数
// 示例：泛白的记忆 DB6C7D768476B08BC65F
// 每四位为一个字 DB6C 7D76 8476 B08B C65F
// 每个字的前两位与后两位交换位置  6CDB 767D 7684 8BB0 5FC6
// 使用 Unicode 解码即可
tool.parseRequestParams = (param) => {
    let result = ""
    for (let i = 0; i <= (param.length / 4); i++) {
        let code = param.slice(i * 4, (i + 1) * 4)
        if (code.length != 4) continue  // 不满四位，跳出本次循环
        let first = code.slice(0, 2)
        let second = code.slice(2, 4)
        result += unescape("".concat("%u", second, first))
    }
    console.log(`parseRequestParams(${param}) <- ${result}`)
    return result
}

// 搜索歌词
// artist 歌手名
// title 歌曲名
// callback 回调
//      - xml 生成的歌词列表数据，直接将此数据返回给千千静听即可，客户端选择下载歌词后会将其中的id发过来
//      - xml_data 用于生成 xml （第一个参数）的原始数据(json格式)，根据客户端传过来的id获取acceskey后再下载歌词
tool.searchLrc = (artist, title, callback) => {
    // 先使用关键词（歌曲名）搜索歌曲
    let base_url = "http://mobileservice.kugou.com/api/v3/lyric/search?"
    let param = `version=9108&highlight=1&keyword=${encodeURI(title)}&plat=0&pagesize=10&area_code=1&page=1&with_res_tag=1`
    console.log(`searchLrc(${artist}, ${title})`)
    console.log(`  - search music with uri = ${base_url}${param}`)

    http.get(base_url + param).then((response) => {
        const data = response.data
        let trim = data.replace("<!--KG_TAG_RES_START-->", "") // 去除接口返回的开始和结束标记
                        .replace("<!--KG_TAG_RES_END-->", "")

        let json = JSON.parse(trim)
        console.log(`  - return error = ${json.error}`)
        // 获取歌曲的 hash，用于获取该歌曲的歌词列表
        if (json.data.info.length == 0) {
            console.log(json)
            callback(genXML([]), {})
            return
        }
        let hash = json.data.info[0].hash


        for (let index = 0; index < json.data.info.length; index++) {
            const element = json.data.info[index]
            if (element.singername.includes(artist)) {
                hash = element.hash
                console.log(`  - find music = ${element.filename}`)
                break
            }
        }

        let lyric_list_url = `http://krcs.kugou.com/search?ver=1&man=yes&client=mobi&hash=${hash}`
        console.log(`  - search lyric with uri = ${lyric_list_url}`)
        http.get(lyric_list_url).then((response) => {
            const json = response.data
            // 获取到歌词列表之后，将关键参数(id, 歌手名，歌曲名)转换成千千静听可以解析的xml格式并返回给用户选择
            let xml_data = []
            json.candidates.forEach(element => {
                let data = {
                    id: element.id,
                    artist: element.singer,
                    title: element.song,
                    accesskey: element.accesskey
                }
                console.log(`  -- add item ${JSON.stringify(data)}`)
                xml_data.push(data)
            })
            callback(genXML(xml_data), xml_data)
        })
    })
}

tool.downloadLrc = (id, accesskey, callback) => {
    console.log(`downloadLrc(${id}, ${accesskey})`)
    
    let url = `http://lyrics.kugou.com/download?ver=1&client=pc&id=${id}&accesskey=${accesskey}&fmt=lrc&charset=utf8`
    console.log(`  - download with uri = ${url}`)
    
    http.get(url).then((response) => {
        let data = response.data
        let b = Buffer.from(data.content, "base64")
        callback(b.toString("utf-8"))
    })
}

function genXML(data) {
    console.log(`genXML(data)`);
    
    let header = `<?xml version="1.0" encoding="UTF-8"?>`
    let node_start_result = `<result>`
    let node_end_result = `</result>`
        

    let xml = "".concat(header, node_start_result)
    data.forEach(e => {
        let lrc = `<lrc id='${e.id}' artist='${e.artist}' title='${e.title}'></lrc>`
        xml += lrc
    })
    xml += node_end_result
    console.log(`  - ${xml}`)
    return xml
}


export default tool