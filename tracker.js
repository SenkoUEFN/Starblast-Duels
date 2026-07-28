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