const WebSockets = require("ws")

class Tracker
{
    constructor(wsUrl, gameId, onData)
    {
        this.wsUrl = wsUrl
        this.gameId = gameId
        this.onData = onData
        this.socket = new WebSockets(
            wsUrl,
            {
                headers : 
                {
                    Origin : "https://starblast.io/"
                }
            }
        )
        this.socket.on("open", () =>
        {
            this.socket.send(JSON.stringify(
            {
                name : "ojct:4",
                data : 
                {
                    mode : "survival",
                    spectate : true,
                    player_name : "Game Tracker 📊",
                    preferred : this.gameId
                }
            }
            ))
        })
        this.socket.on("message", (message) =>
        {
            const array = Array.from(message)
            if(array[0] === 0)
            {
                const data = this.parsePacket0(array)
                //this.onData(data)
            }  
            else if(array[0] === 101)
            {
                const data = this.parseLaserHit(array)
                this.onData(data)
            } 
            let msg
            try
            {
                msg = JSON.parse(message.toString())
            }
            catch(error)
            {
                return
            }
            if(msg.name === "welcome")
            {
                this.socket.send(JSON.stringify(
                {
                    name : "enter",
                    data : 
                    {
                        spectate : true
                    }
                }
                ))
            }
            else if(msg.name === "player_name")
            {
                this.onData(msg)
            }
            

            
        })

    }   

    askNamesWithId()
    {
        for(let i = 0; i < 4; i++)
        {
            this.socket.send(JSON.stringify(
            {
                name : "get_name",
                ship_id : 1
            }
        ))
        }

    }

    
    parsePacket0(bytes)
    {
        const buffer = Uint8Array.from(bytes)
        const view = new DataView(buffer.buffer)
        const shipId = view.getUint8(1)
        const playerInfo = 
        {
            type : 0,
            shipId : shipId,

            typeFlags: view.getUint16(14, true),

            x: view.getFloat32(16, true),
            y: view.getFloat32(20, true),
            speedX: view.getFloat32(24, true),
            speedY: view.getFloat32(28, true),

            rotation: view.getFloat32(32, true),
            angularVelocity: view.getFloat32(36, true),

            stun: view.getUint8(40),
            rank: view.getUint8(41),

            shield: view.getUint16(42, true),
            energy: view.getUint16(44, true),
            crystals: view.getUint16(46, true),
            score: view.getUint32(48, true),
            levels: view.getUint32(52, true)
        }
        return playerInfo
    }

    parseLaserHit(bytes)
    {
        const buffer = Uint8Array.from(bytes)
        const view = new DataView(buffer.buffer)

        return {
            type: view.getUint8(0),
            laserIndex: view.getUint16(2, true),
            x: view.getFloat32(4, true),
            y: view.getFloat32(8, true),
            shipId: view.getUint8(12)
        }
    }
    }

module.exports = { Tracker }