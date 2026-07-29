const { Tracker } = require("./tracker.js")
const WebSockets = require("ws")
const { BrowserClient} = require("starblast-modding")
const path = require("path")

class Room
{
    constructor(players, ecpKey, onData)
    {
        this.players = players
        this.ecpKey = ecpKey
        this.onData = onData
        this.game
    }

    stopRoom()
    {
        if(this.mod)
        {
            this.mod.stop()
            this.newTracker.killTracker()
            this.onData("mod_stopped")
        }
    }

    async createModdingGame()
    {
        return new Promise((resolve, reject) =>
        {
            this.mod = new BrowserClient(
                {
                    cacheECPKey : false,
                    cacheOptions : false
                }
            )

            this.mod.setRegion("Europe")
            this.mod.setECPKey(this.ecpKey)
            this.mod.loadCodeFromLocal(path.join(__dirname, "duelModeCode.js"),
        {
            watchChanges : false,
            watchInterval : 50000,
            executionTimeout : false
        })
            
            this.mod.start()
            this.game = this.mod.getNode()

            this.game.on("start", async (link, options) =>
            {
                this.trackGameData(link)
                let gameId = link.split("#")[1]
                gameId = gameId.split("@")[0]
                this.onData(
                    {
                        name : "room_created",
                        id : gameId
                    }
                )
                resolve()
            })
        })
    }

    trackGameData(gameLink)
    {
        let playerInGame = []
        this.newTracker = new Tracker(gameLink, (msg) =>
        {
            const array = Array.from(msg)
            if(array[0] === 0)
            {
                const data = this.parsePacket0(array)
                this.writeData(data)
                this.sendData()
            }
            else if(array[0] === 101)
            {
                const data = this.parsePacket101(array)
                this.writeData(data)
                this.sendData()
            }
            else if(array[0] === 150)
            {
                console.log("got 150")
                const data = this.parsePacket150(array)
                this.writeData(data)
                this.sendData()
            }
            if(msg.name === "player_name")
            {
                for(let i = 0; i < this.players.length; i++)
                {
                    if(this.players[i].playerClientInfo.name === msg.data.player_name)
                    {
                        this.players[i].playerGameInfo.shipId = msg.data.id
                    }
                }
            }
        })
    }

    sendData()
    {
        for(const player of this.players)
        {
            player.socket.send(JSON.stringify(
                {
                    name : "players_info",
                    data : this.players
                }
            ))
        }
    }

    writeData(data)
    {   
        if(data.packetType === 0)
        {
            for(const player of this.players)
            {
                if(player.playerGameInfo.shipId === data.shipId)
                {
                    if(player.playerGameInfo.damagesTaken === null)
                    {
                        player.playerGameInfo.life = data.shield + data.crystals
                        player.playerGameInfo.damagesTaken = 0
                        player.playerGameInfo.lifeRegen = 0
                    }
                    else
                    {
                        if((data.shield + data.crystals) - player.playerGameInfo.life < 0)
                        {
                            player.playerGameInfo.damagesTaken += player.playerGameInfo.life - (data.shield + data.crystals)
                        }
                        else if((data.shield + data.crystals) - player.playerGameInfo.life > 0)
                        {
                            player.playerGameInfo.lifeRegen += (data.shield + data.crystals) - player.playerGameInfo.life
                        }
                        player.playerGameInfo.life = data.shield + data.crystals
                    }
                }
            } 
        }
        else if(data.packetType === 101)
        {
            let attackerIdx = 0
            let attackedIdx = 0

            // Find celui qui se fait attacker
            for(let i = 0; i < this.players.length; i++)
            {
                if(this.players[i].playerGameInfo.shipId === data.shipId)
                {
                    attackedIdx = i
                }
            }
            // celui qui sfait attaquer
            for(let i = 0; i < this.players.length; i++)
            {
                if(i !== attackedIdx)
                {
                    attackerIdx = i
                }
            }
            this.players[attackerIdx].playerGameInfo.laserTouched += 1
            
        }
        else if(data.packetType === 150)
        {
            for(const player of this.players)
            {
                if(player.playerGameInfo.shipId === data.killed)
                {
                    player.playerGameInfo.deaths += 1
                }
                if(player.playerGameInfo.shipId === data.killer)
                {
                    player.playerGameInfo.kills += 1
                }
            }
        }
        
    }

    parsePacket0(bytes)
    {
        const buffer = Uint8Array.from(bytes)
        const view = new DataView(buffer.buffer)

        const playerInfo = 
        {
            packetType : 0,
            shipId : view.getUint8(1),
            flags: view.getUint8(2),
            hue: view.getUint8(3),
            serverTick: view.getUint32(4, true),
            lastTick: view.getUint32(8, true),
            angle: view.getUint16(12, true),
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

    parsePacket101(bytes)
    {
        const buffer = Uint8Array.from(bytes)
        const view = new DataView(buffer.buffer)

        const laserHit =
        {
            packetType : 101,
            type: view.getUint8(0),
            laserIndex: view.getUint16(2, true),
            x: view.getFloat32(4, true),
            y: view.getFloat32(8, true),
            shipId: view.getUint8(12)
        }

        return laserHit
    }

    parsePacket150(bytes)
    {
        const killData = 
        {
            packetType : 150,
            killed : bytes[1],
            killer : bytes[2]
        }
        return killData
    }
}


module.exports = { Room }