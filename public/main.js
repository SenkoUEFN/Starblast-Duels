const playButton = document.querySelector("#playButton")
const nameInput = document.querySelector("#nameInput")
const title = document.querySelector("#title")
const waitForPlayersText = document.querySelector("#waitForPlayers")
let waitForPlayers = false
let noEcpKey = false

playButton.addEventListener("click", joinGame)

const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:"
const socket = new WebSocket(`${wsProtocol}//${location.host}`)
const id = crypto.randomUUID()
let gameId

socket.addEventListener("message", (message) =>
{
    let msg = JSON.parse(message.data)
    console.log(msg)
    if(msg.name === "room_created")
    {
        gameId = msg.data.id
        waitForPlayers = false
        noEcpKey = false
        joinRoom()
        
    }
    else if(msg.name === "wait for players")
    {
        waitForPlayers = true
        showWaitForPlayers()
    }
})

function joinGame()
{
    const name = nameInput.value

    socket.send(JSON.stringify(
        {
            name : "join_game",
            data : 
            {
                id : id,
                name : name,
                ecpKey : localStorage.getItem("ECPKey")
            }
        }
    ))
}

function joinRoom()
{
    window.open(`https://starblast.io/#${gameId}@195.201.89.106:3009`,"_blank")
    console.log(`https://starblast.io/#${gameId}@195.201.89.106:3009`)
}

function showWaitForPlayers()
{
    console.log("wait players")
    playButton.style.display = "none"
    nameInput.style.display = "none"
    title.style.display = "none"
    waitForPlayersText.style.display = "block"
}





