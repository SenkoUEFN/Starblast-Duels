const express = require("express")
const path = require("path")
const WebSockets = require("ws")
const { Room } = require("./rooms.js")
const app = express()
const port = process.env.PORT || 9000

let ecpKeys = ["07b59-c621c"]
let rooms = []
let waitingList = []

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
    socket.on("close", () =>
    {
        for(const player of waitingList)
        {
            if(socket === player.socket)
            {
                const playerIndex = waitingList.indexOf(player)
                waitingList.splice(playerIndex, 1)
            }
        }
        for(const room of rooms)
        {
            for(const player of room.players)
                if(socket === player.socket)
                {
                    room.stopRoom()
                    const roomIndex = rooms.indexOf(room)
                    rooms.splice(roomIndex, 1)
                }
        }
    })
    socket.send(JSON.stringify(
        {
            name : "connected"
        }
    ))

    socket.on("message", (message) =>
    {
        let msg = JSON.parse(message)
        console.log(msg)
        if(msg.name === "join_game")
        {
            newPlayer(msg.data, socket, msg.data.ecpKey)
        }  
        else if(msg.name === "verify_ecp")
        {
            verifyEcp(msg, socket)
        }
    })
})

function verifyEcp(msg, socket)
{
    const verifyEcpSocket = new WebSockets(
        "wss://51-255-91-80.starblast.io:3015/",
        {
            headers :
            {
                Origin : "https://starblast.io"
            }
        }
    )

    verifyEcpSocket.on("open", () =>
    {
        console.log("socket opened")
        verifyEcpSocket.send(JSON.stringify(
            {
                name : "verify_key",
                data :
                {
                    key : msg.key
                }
            }
        ))
    })

    verifyEcpSocket.on("message", (message) =>
    {
        let msg = JSON.parse(message)
        if(msg.verified === "yes")
        {
            socket.send(JSON.stringify({name : "ecpVerified"}))
            socket.close()
        }
        else if(msg.verified === "no")
        {
            socket.send(JSON.stringify({name : "ecpNotVerified"}))
            socket.close()
        }
    })
}

function newPlayer(playerInfo, socket, ecpKey)
{   
    for(const player of waitingList)
    {
        if(player.playerClientInfo.id === playerInfo.id)
        {
            return
        }
    }
    const dataClient =
    {
        playerClientInfo : playerInfo,
        ecpKey : ecpKey,
        playerGameInfo : 
        {
            shipId : null, //cbon
            laserShot : 0,
            laserTouched : 0, //cbon
            damagesPut : null,
            damagesTaken : 0, //cbon
            life : null,//cbon
            lifeRegen : null, //cbon
            kills : 0,
            deaths : 0

        },
        socket : socket
    }
    waitingList.push(dataClient)
    for(player of waitingList)
    {
        console.log(player.playerClientInfo)
    }
    enoughPlayers()

}

function enoughPlayers()
{
    if(waitingList.length >= 2)
    {
        startNewRoom()
    }
    else
    {
        waitForPlayers(waitingList)
    }
}

async function startNewRoom()
{
    let roomPlayers = []
    
    const ecpPlayers = getEcpPlayersInWaiting()
    const noEcpPlayers = getNoEcpPlayersInWaiting()
    if(ecpPlayers.length > 0 && noEcpPlayers.length >0)
    {
        roomPlayers.push(ecpPlayers[0])
        roomPlayers.push(noEcpPlayers[0])
    }
    else if(ecpPlayers.length >= 2 && noEcpPlayers.length === 0)
    {
        roomPlayers.push(ecpPlayers[0])
        roomPlayers.push(ecpPlayers[1])
    }
    else if(ecpPlayers.length === 0 && noEcpPlayers.length >= 2)
    {
        roomPlayers.push(noEcpPlayers[0])
        roomPlayers.push(noEcpPlayers[1])
    }
    else
    {
        return
    }
    const ecpKey = findEcpKey(roomPlayers)
    if(ecpKey === null)
    { 
        noEcpKey()
        return
    }
    const room = new Room(roomPlayers, ecpKey, (msg) =>
    {
        if(Array.isArray(msg))
        {
            for(const player of msg)
            {
                console.log(
                    player.playerClientInfo,
                    player.playerGameInfo
                )
            }
        }


        if(msg.name === "stop_mod")
        {
            const roomIdx = rooms.indexOf(msg.room)
            msg.room.stopRoom()
            rooms.slice(roomIdx,1)
        }
    })
    const player1index = waitingList.findIndex(player => player === roomPlayers[0])
    waitingList.splice(player1index, 1)
    const player2index = waitingList.findIndex(player => player === roomPlayers[1])
    waitingList.splice(player2index, 1)
    rooms.push(room)
    await room.createModdingGame()
}



function findEcpKey(players)
{
    for(const player of players)
    {
        if(player.ecpKey !== undefined)
        {
            return player.ecpKey
        }
    }
    return null
}

function getEcpPlayersInWaiting()
{
    let ecpPlayers = []
    for(let i = 0; i < waitingList.length; i++)
    {
        if(waitingList[i].ecpKey !== undefined)
        {
            ecpPlayers.push(waitingList[i])
        }
    }
    return ecpPlayers
}

function getNoEcpPlayersInWaiting()
{
    let noEcpPlayers = []
    for(let i = 0; i < waitingList.length; i++)
    {
        if(waitingList[i].ecpKey === undefined)
        {
            noEcpPlayers.push(waitingList[i])
        }
    }
    return noEcpPlayers
}

function roomCreated(players, gameId)
{
    for(const player of players)
    {
        
        player.socket.send(JSON.stringify(
            {
                name : "room_created",
                data : 
                {
                    id : gameId
                }
            }
        ))
    }
}

function waitForPlayers(players)
{
    for(const player of players)
    {
        player.socket.send(JSON.stringify(
            {
                name : "wait for players"
            }
        ))
    }
}

function noEcpKey(players)
{
    for(player of players)
    {
        name : "no_ecp"
    }
}





