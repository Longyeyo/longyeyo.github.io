const express = require("express");
const app = express();
app.use(express.static("./www"));
const server = app.listen(3000, function () {
    console.log("服务器启动成功");
});

// 请求 WebSocket 模块
const WebSocket = require("ws")
// 创建 WebSocket 服务对象
const websocket = new WebSocket.Server({
    server: server
})

// 定义一个数组保存所有链接到服务器的用户
let userList = [];
//玩家回答正确次数
let countList = []
//需要上场的玩家
let upUserList = []
//当前上场玩家
let currentUpUser = ""
websocket.on("connection", (ws, req) => {
    let ip = req.connection.remoteAddress
    ws.ip = ip
    let userName = decodeURI(req.url.substring(1))
    ws.userName = userName
    //玩家回答正确次数
    // ws.count=0
    countList.push({ userName, count: 0 })
    console.log(userName);
    // 通知我进入了聊天室
    userList.push(ws)
    userList.forEach(item => {
        let data = {
            type: "info",
            userName: userName != item.userName ? userName : "我",
            content: "进入聊天室",
            sort: countList.sort((item1, item2) => { item2 - item1 })
        }
        item.send(JSON.stringify(data))
    })
    console.log(userList);
    //时间对象
    let timer
    //是否有人上场
    let isSwitch = true
    ws.on("message", (res) => {
        res.toString()
        let dataObj = JSON.parse(res);
        switch (dataObj.type) {
            // 画笔移动
            case "move": {
                userList.forEach(item => {
                    if (item.userName != dataObj.userName) {
                        //发送其他人画笔的位置
                        let data = {
                            type: "move",
                            moveX: dataObj.moveX,
                            moveY: dataObj.moveY,
                        }
                        item.send(JSON.stringify(data))
                    }
                })
            }
                break;
            case "down": {
                userList.forEach(item => {

                    if (item.userName != dataObj.userName) {
                        //发送其他人画笔的位置
                        let data = {
                            type: "down",
                            downX: dataObj.downX,
                            downY: dataObj.downY,
                            currentColor: dataObj.currentColor
                            , currentSiz: dataObj.currentSiz
                        }
                        item.send(JSON.stringify(data))
                    }
                })
            }
                break;
            case "count": {
                userList.forEach(item => {
                    //发送其他人画笔的位置
                    let data = {
                        type: "count",
                        sort: userList.sort((item1, item2) => { item2 - item1 })
                    }
                    item.send(JSON.stringify(data))
                })
            }
                break;
            case "info": {
                userList.forEach(item => {
                    let data = {
                        type: "info",
                        userName: ws.userName,
                        content: dataObj.msg,
                        sort: countList.sort((item1, item2) => { item2 - item1 })
                    }
                    item.send(JSON.stringify(data))
                })
            }
                break;
            //上场
            case "up": {
                upUserList.push({ userName, currentTimer: 30 })
                //重新通知
                userList.forEach(item => {
                    let data
                    data = {
                        type: "upUser",
                        upUserList,
                    }
                    item.send(JSON.stringify(data))
                })

                if (currentUpUser != upUserList[0]) {
                    upTimer()
                } else {
                    console.log("不要再执行了");
                }


                function upTimer() {
                    //取列表中第一个用户
                    currentUpUser = upUserList[0] || null
                    if (currentUpUser) {
                        //向前端发送上场的用户
                        userList.forEach(item => {
                            let data
                            if (currentUpUser.userName == item.userName) {
                                data = {
                                    type: "isCurrentUser",
                                    bool: true
                                }
                                item.send(JSON.stringify(data))
                            }
                            data = {
                                type: "upUser",
                                upUserList,
                            }
                            item.send(JSON.stringify(data))
                        })

                        currentUpUser.timer = setInterval(() => {
                            let data = {
                                type: "day",
                                time: currentUpUser.currentTimer,
                            }
                            console.log("时间执行了");
                            if (currentUpUser.currentTimer <= 0) {
                                console.log("也执行了吗");
                                upUserList.splice(0, 1)
                                clearInterval(currentUpUser.timer)
                                userList.forEach(item => {
                                    let data
                                    data = {
                                        type: "upUser",
                                        upUserList,
                                    }
                                    item.send(JSON.stringify(data))

                                })
                                userList.forEach(item => {
                                    if (item.userName == currentUpUser.userName) {
                                        let data = {
                                            type: "isCurrentUser",
                                            bool: false
                                        }
                                        item.send(JSON.stringify(data))
                                    }
                                })
                                upTimer()


                            } else {
                                userList.forEach(item => {
                                    //发送当前时间
                                    item.send(JSON.stringify(data))
                                })
                                currentUpUser.currentTimer--
                            }

                        }, 1000)
                    } else {
                        return
                    }

                }




            }
                break;
            default:
                break;
        }
    })
})