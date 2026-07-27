const express = require("express")
const path = require("path")
const WebSockets = require("ws")
const app = express()
const port = process.env.PORT || 9000
const wsPort = process.env.PORT || 9500
let rooms = []
let waitingList = []
let waitingListServer = []

const server = app.listen(port, () =>
{
    console.log("server running on :", `http://localhost:${port}`)
})

app.use(express.static(
    path.join(__dirname, "public")
))

const wss = new WebSockets.WebSocketServer(
    {
        server : server
    }
)

wss.on("connection", (socket) =>
{
    socket.send(JSON.stringify(
        {
            name : "connected"
        }
    ))

    socket.on("message", (message) =>
    {
        let msg = JSON.parse(message)
        if(msg.name === "join_game")
        {
            newPlayer(msg.data, socket, msg.data.ecpKey)
        }  
    })
})

function newPlayer(playerInfo, socket, ecpKey)
{   
    for(player of waitingList)
    {
        if(player.playerInfo.id === playerInfo.id)
        {
            return
        }
    }
    const dataServer = 
    {
        playerInfo : playerInfo,
        socket : socket,
        ecpKey : ecpKey
    }
    const dataClient =
    {
        playerInfo : playerInfo,
        socket : socket
    }
    waitingListServer.push(dataServer)
    waitingList.push(dataClient)
    for(player of waitingList)
    {
        console.log(player.playerInfo)
    }
    if(waitingList.length >= 2)
    {
        createRoom()
    }
    else
    {
        waitForPlayers(waitingList)
    }
}

async function createModdingGame(players)
{
    let ecpKey
    for(player of players)
    {
        if(player.ecpKey !== undefined)
        {
            ecpKey = player.ecpKey
            break
        }
    }
    if(ecpKey === undefined) { return "no ecp key" }
    return new Promise((resolve, reject) =>
    {
        
        const serverWsAdress = "wss://195-201-89-106.starblast.io:3009/"
        let token
        let roomData = {}
        const tokenSocket = new WebSockets(
            serverWsAdress,
            {
                headers :
                {
                    Origin : "https://starblast.io"
                }
            }
        )
        tokenSocket.on("open", () =>
        {
            tokenSocket.send(JSON.stringify(
                {
                    name : "modding_token",
                    data :
                    {
                        ecp_key : ecpKey
                    }
                }
            ))
        })
        tokenSocket.on("message", (message) =>
        {
            let msg = JSON.parse(message)
            console.log(msg)
            if(msg.name === "token")
            {
                token = msg.data.token
                createMod()
            }
            
        })

        function createMod(){    
            const modSocket = new WebSockets(
                serverWsAdress,
                {
                    headers : 
                    {
                        Origin : "https://starblast.data.neuronality.com"
                    }
                }
            )

            modSocket.on("open", () =>
            {
                console.log(token)
                modSocket.send(JSON.stringify(
                    {
                        name : "run_mod",
                        data : 
                        {
                            token : token,
                            options :
                            {
                                root_mode: "survival",
                                map_size : 30,
                                starting_ship : 605,
                                starting_ship_maxed : true,
                                max_level : 6,
                                max_players : 2,
                                custom_map : ""
                            }
                        }
                    }
                ))
            })

            modSocket.on("message", (message) =>
            {
                let msg = JSON.parse(message)
                if(msg.name === "tick" || msg.name === "ship_update") { return }
                console.log(msg)
                if(msg.name === "mod_started")
                {
                    roomData = 
                    {
                        id : msg.data.id,
                        serverWsAdress : serverWsAdress,
                        players : players
                    }
                    resolve(roomData)
                }
            })
        }
    })
    
}

function waitForPlayers(players)
{
    for(player of players)
    {
        player.socket.send(JSON.stringify(
            {
                name : "wait for players"
            }
        ))
    }
}

async function createRoom()
{
    console.log("create Room")
    const roomPlayers = [waitingList[0],waitingList[1]]
    const roomPlayers2 = [waitingListServer[0],waitingListServer[1]]
    waitingList.splice(0, 2)
    const room = await createModdingGame(roomPlayers2)
    if(room === "no ecp key")
    {
        for(player of roomPlayers)
        {
            player.socket.send(JSON.stringify(
                {
                    name : "no ecp key"
                }
            ))
        }
        return
    }
    for(player of roomPlayers)
    {
        player.socket.send(JSON.stringify(
            {
                name : "room_created",
                data : room
            }
        ))
    }
}



