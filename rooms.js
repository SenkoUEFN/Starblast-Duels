const { Tracker } = require("./tracker.js")
const WebSockets = require("ws")

class Room
{
    constructor(players, ecpKey, onData)
    {
        this.players = players
        this.ecpKey = ecpKey
        this.onData = onData
    }

    async createModdingGame()
    {
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
                            ecp_key : this.ecpKey
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

            tokenSocket.on("error", error =>
            {
                reject(error)
            })

            const createMod = () =>
            {    
                console.log("creating mod")
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
                                    max_players : 3,
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
                    // console.log(msg)
                    if(msg.name === "mod_started")
                    {
                        roomData = 
                        {
                            id : msg.data.id,
                            serverWsAdress : serverWsAdress,
                            players : this.players
                        }
                        this.trackGameData(msg.data.id)
                        this.onData(
                            {
                                name : "room_created",
                                id : msg.data.id
                            }
                        )
                        resolve(roomData)
                        return
                    }
                })

                modSocket.on("error", error =>
                {
                    reject(error)
                })
            }
        })
    }

    trackGameData(gameId)
    {
        let playerInGame = []
        const wsUrl = "wss://195-201-89-106.starblast.io:3009/"
        const newTracker = new Tracker(wsUrl, gameId, (msg) =>
        {
            console.log(msg)
        })
    }

}

module.exports = { Room }