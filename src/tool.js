import axios from "axios"
import Fuse from "fuse.js"

const http = axios

const tool = {}


/**
 * 解析千千静听请求的参数
 * 示例：泛白的记忆 DB6C7D768476B08BC65F
 * 每四位为一个字 DB6C 7D76 8476 B08B C65F
 * 每个字的前两位与后两位交换位置  6CDB 767D 7684 8BB0 5FC6
 * 使用 Unicode 解码即可
 * @param {string} param 参数
 * @returns 解码后的文本
 */
tool.parseRequestParams = (param) => {
    let result = ""
    for (let i = 0; i <= (param.length / 4); i++) {
        let code = param.slice(i * 4, (i + 1) * 4)
        if (code.length != 4) continue  // 不满四位，跳出本次循环
        let first = code.slice(0, 2)
        let second = code.slice(2, 4)
        result += unescape("".concat("%u", second, first))
    }
    console.log(`  - parseRequestParams(${param}) <- ${result}`)
    return result
}

/**
 * 搜索歌词
 * @param {string} artist 歌手名
 * @param {string} title 歌曲名
 * @param {function} callback 回调
 * 
 * @argument xml 生成的歌词列表数据，直接将此数据返回给千千静听即可，客户端选择下载歌词后会将其中的id发过来 
 * @argument xml_data 用于生成 xml （第一个参数）的原始数据(json格式)，根据客户端传过来的id获取acceskey后再下载歌词
 */
tool.searchLrc = (artist, title, callback) => {
    // 先使用关键词（歌曲名）搜索歌曲
    // let music_url = `http://mobileservice.kugou.com/api/v3/lyric/search?keyword=${encodeURI(artist + title)}&pagesize=10&&page=1`
    // 上面 api 搜索英文歌搜不出来，换下面的 api
    let music_url = `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURI(artist+title)}&page=1&pagesize=20&showtype=1`
    console.log(`  # searchLrc(${artist}, ${title})`)
    console.log(`   - search music with uri = ${music_url}`)

    http.get(music_url).then((response) => {
        const json = response.data

        // 获取歌曲的 hash，用于获取该歌曲的歌词列表
        if (json.data.info.length == 0) {
            // 未获取到内容
            callback(genXML([]), {})
            return
        }

        let hash = selectMusic(json.data.info, artist, title)

        let lyric_list_url = `http://krcs.kugou.com/search?ver=1&man=yes&client=mobi&hash=${hash}`
        console.log(`    - search lyric with uri = ${lyric_list_url}`)
        http.get(lyric_list_url).then((response) => {
            const json = response.data
            // 获取到歌词列表之后，将关键参数(id, 歌手名，歌曲名)转换成千千静听可以解析的xml格式并返回给用户选择
            let xml_data = []
            json.candidates.forEach(element => {
                let data = {
                    id: element.id,
                    artist: element.singer,
                    title: element.song,
                    from: (() => {
                        // 重命名一下，方便用户识别
                        if (element.product_from == "官方推荐歌词") return  "官方推荐"
                        else if (element.product_from == "第三方歌词") return "第三方"
                        else if (element.product_from == "ugc") return "用户上传"
                        else return "未知来源"
                    })(),
                    accesskey: element.accesskey
                }
                xml_data.push(data)
            })
            // 对 xml_data 进行排序
            xml_data = xml_data.sort((a, b) => {
                let dict = {
                    "官方推荐": 1, "用户上传": 2, "第三方": 3
                }
                return dict[a.from] - dict[b.from]
            })
            xml_data.forEach(element => {
                console.log(`      - ${JSON.stringify(element)}`)
            });
            console.log(`      - total ${xml_data.length}`)
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


/**
 * 根据 data 生成 xml 字符串
 * @param {object} data 用于生成 xml 的数据
 * @returns xml 字符串
 */
function genXML(data) {
    console.log(`  # genXML(data)`);

    let header = `<?xml version="1.0" encoding="UTF-8"?>`
    let node_start_result = `<result>`
    let node_end_result = `</result>`

    let xml = "".concat(header, node_start_result)
    data.forEach(e => {
        let lrc = `<lrc id='${e.id}' artist='${e.artist}' title='[${e.from}] ${e.title}'></lrc>`
        xml += lrc
    })
    xml += node_end_result
    return xml
}

/**
 * 从 params 中搜索最匹配 title 及 artist 的歌曲，并返回该歌曲 hash
 * @param {Array} params 包含歌曲信息的数组
 * @param {string} artist 搜索的歌曲作者名
 * @param {string} title 搜索的歌曲名
 * @returns string 最匹配歌曲作者名及歌曲名的歌曲的 hash
 */
function selectMusic(params, artist, title) {
    console.log(`  # selectMusic(params, ${artist}, ${title})`);

    let hash = params[0].hash
    let option = {
        keys: [
            { name: "filename", getFn: (params) => params.filename, weight: 0.7 },
            { name: "singername", getFn: (params) => params.singername, weight: 0.3 }
        ]
    }
    const fuse = new Fuse(params, option)
    let result = fuse.search({ filename: title, singername: artist })
    if (result.length > 0) {
        console.log(`   - fusefind ${result[0].item.hash} = ${result[0].item.filename}`)
        hash = result[0].item.hash
    }
    return hash
}

export default tool