const WebSockets = require("ws")
const { getGameFromId } = require("./findGame.js")

class Tracker
{
    constructor(gameLink, onData)
    {

        this.gameLink = gameLink
        this.onData = onData
        this.onBegin()
        
    } 
    
    async onBegin()
    {
        this.gameInfo = await getGameFromId(this.gameLink)
        this.wsUrl = this.gameInfo.wsUrl
        console.log(this.wsUrl)
        this.gameId = this.gameInfo.id

        this.socket = new WebSockets(
            this.wsUrl,
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
                    spectate : true,
                    player_name : "tracking you 👀",
                    preferred : this.gameId
                }
            }
            ))
        })
        this.socket.on("close", (code, reason) =>
        {
            console.log("close", code, reason)
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
                console.log(msg)
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
            

            
        })
    }

    killTracker()
    {
        this.socket.removeAllListeners()
        this.socket.close()
    }
}

module.exports = { Tracker }