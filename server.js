const express = require("express")
const path = require("path")
const WebSockets = require("ws")
const { Room } = require("./rooms.js")
const app = express()
const port = process.env.PORT || 9000

let rooms = []
let waitingList = []

const server = app.listen(port, () =>
{
    console.log(`http://localhost:${port}`)
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
                break
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
                    break
                }
        }
    })

    socket.on("message", (message) =>
    {
        let msg
        try
        {
            msg = JSON.parse(message)
        }
        catch(error)
        {
            return
        }
        console.log(message)
        console.log(msg)
        if(msg.name === "join_game")
        {
            newPlayer(msg.data, socket)
        }  
        else if(msg.name === "verify_ecp")
        {
            verifyEcp(msg, socket)
        }
    })
})

function verifyEcp(msg, socket)
{
    let timeout
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
        timeout = setTimeout(() =>
        {
            if(
                verifyEcpSocket.readyState === WebSockets.OPEN ||
                verifyEcpSocket.readyState === WebSockets.CONNECTING)
            {
                verifyEcpSocket.close()
            }
        }, 10000)
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
        let msg 
        try
        {
            msg = JSON.parse(message)
        }
        catch(error)
        {
            return
        }
        if(msg.verified === "yes")
        {
            socket.send(JSON.stringify({name : "ecpVerified"}))
            verifyEcpSocket.close()
        }
        else if(msg.verified === "no")
        {
            socket.send(JSON.stringify({name : "ecpNotVerified"}))
            verifyEcpSocket.close()
        }
    })

    verifyEcpSocket.on("error", () =>
    {
        verifyEcpSocket.close()
    })

    verifyEcpSocket.on("close", () =>
    {
        verifyEcpSocket.close()
    })

}

function newPlayer(playerInfo, socket)
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
        ecpKey : playerInfo.ecpKey,
        playerGameInfo : 
        {
            shipId : null, //cbon
            laserShot : 0,
            laserTouched : 0, //cbon
            damagesPut : null,
            damagesTaken : 0, //cbon
            life : null,//cbon
            lifeRegen : null, //cbon
            kills : 0, //cbon
            deaths : 0 //cbon

        },
        socket : socket
    }
    waitingList.push(dataClient)
    enoughPlayers(dataClient.socket)

}

function enoughPlayers(socket)
{
    if(waitingList.length >= 2)
    {
        startNewRoom()
    }
    else
    {
        sendWaitForPlayers(socket)
    }
}

function choosePlayersForRoom()
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
    return roomPlayers
}

async function startNewRoom()
{
    let roomPlayers = choosePlayersForRoom()
    const ecpKey = findEcpKey(roomPlayers)
    if(ecpKey === null)
    { 
        noEcpKey(roomPlayers)
        return
    }
    const room = new Room(roomPlayers, ecpKey, (msg) =>
    {
        if(msg.name === "stop_mod")
        {
            const roomIdx = rooms.indexOf(msg.room)
            msg.room.stopRoom()
            rooms.splice(roomIdx,1)
        }
    })
    rooms.push(room)
    await room.createModdingGame()
    const player1index = waitingList.findIndex(player => player === roomPlayers[0])
    waitingList.splice(player1index, 1)
    const player2index = waitingList.findIndex(player => player === roomPlayers[1])
    waitingList.splice(player2index, 1)

}



function findEcpKey(players)
{
    for(const player of players)
    {
        if(player.ecpKey !== null)
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
        if(waitingList[i].ecpKey !== null)
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
        if(waitingList[i].ecpKey === null)
        {
            noEcpPlayers.push(waitingList[i])
        }
    }
    return noEcpPlayers
}



function sendWaitForPlayers(socket)
{
    socket.send(JSON.stringify(
        {
            name : "wait for players"
        }
    ))
}

function noEcpKey(players)
{
    for(player of players)
    {
        player.socket.send(JSON.stringify(
            {
                name : "no_ecp"
            }
        ))
        
    }
}





