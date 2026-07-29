const WebSockets = require("ws")

class Tracker
{
    constructor(wsUrl, gameId, onData)
    {
        console.log("new tracker", wsUrl, gameId)
        this.wsUrl = wsUrl
        this.gameId = gameId
        this.onData = onData
        this.socket = new WebSockets(
            wsUrl,
            {
                headers : 
                {
                    Origin : "https://starblast.io"
                }
            }
        )
        this.socket.on("open", () =>
        {
            console.log("socket open")
            this.socket.send(JSON.stringify(
            {
                name : "ojct:4",
                data : 
                {
                    mode : "survival",
                    spectate : false,
                    spectate_ship : 1,
                    player_name : "tracking you 👀",
                    preferred : this.gameId
                }
            }
            ))
        })
        this.socket.on("close", (code, reason) =>
        {
            console.log("close" + code + reason)
        })

        this.socket.on("error", (error) =>
        {
            console.log(error)
        })

        this.socket.on("message", (message, isBinary) =>
        {
            this.onData(message)
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
                console.log("welcome")
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
}

module.exports = { Tracker }