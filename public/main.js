const playButton = document.querySelector("#playButton")
const nameInput = document.querySelector("#nameInput")
const title = document.querySelector("#title")
const waitForPlayersText = document.querySelector("#waitForPlayers")
const divPlayerInfo = document.querySelector("#playersInfo")
const gameInfoTitle = document.querySelector("#gameInfoTitle")
const noEcpText = document.querySelector("#noEcpKey")
const waitingOtherPlayerText = document.querySelector("#waitingOtherPlayer")
const joinTheGame = document.querySelector("#joinTheGame")
const verifyEcpButton = document.querySelector("#verifyEcp")
const ecpKeyInput = document.querySelector("#ecpInput")
const divserverData = document.querySelector("#serverData")
let waitForPlayers = false
let noEcpKey = false

playButton.addEventListener("click", joinGame)


const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:"
const socket = new WebSocket(`${wsProtocol}//${location.host}`)
const id = crypto.randomUUID()
let gameId

socket.addEventListener("open", () =>
{
    verifyEcpButton.addEventListener("click", () =>
    {
        const ecpKey = ecpKeyInput.value.trim()

        if (!/^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/.test(ecpKey))
        {
            alert("Invalid ECP format")
            return
        }
        socket.send(JSON.stringify(
            {
                name : "verify_ecp",
                key : ecpKeyInput.value
            }
        ))
    })
})

socket.addEventListener("message", (message) =>
{
    let msg
    try
    {
        msg = JSON.parse(message.data)
        console.log(msg)
    }
    catch(error)
    {
        return
    }
    if(msg.name === "room_created")
    {
        gameId = msg.data
        waitForPlayers = false
        noEcpKey = false
        joinRoom(msg.link)
        
    }
    else if(msg.name === "wait for players")
    {
        waitForPlayers = true
        showWaitForPlayers()
    }
    else if(msg.name === "players_info")
    {
        updatePlayersInfo(msg.data)
        showGameInfo()
    }
    else if(msg.name === "no_ecp")
    {
        showNoEcp()
    }
    else if(msg.name === "wait_other_one")
    {
        showWaitOtherPlayer()
    }
    else if(msg.name === "ecpVerified")
    {
        alert("ecp verified ! thank for your trust :)")
        localStorage.setItem("ecpKey", ecpKeyInput.value)
    }
    else if(msg.name === "ecpNotVerified")
    {
        alert("your ecp is fake ! you think im dumb ?")
    }
    else if(msg.name === "server_data")
    {
        setServerInfo(msg)
    }
})

function joinGame()
{
    if (/^[A-Za-z0-9_]{3,16}$/.test(nameInput.value.trim()) === false)
    {
        alert("enter a valid username please")
        return
    }
    const name = nameInput.value
    localStorage.setItem("name", name)

    socket.send(JSON.stringify(
        {
            name : "join_game",
            data : 
            {
                id : id,
                name : name,
                ecpKey : localStorage.getItem("ecpKey")
            }
        }
    ))
}

function joinRoom(link)
{
    console.log(link)
    console.log("join room")
    showJoinGame()
    window.open(link,"_blank")
}

function showJoinGame()
{
    joinTheGame.style.display = "block"
    divPlayerInfo.style.display = "none"
    playButton.style.display = "none"
    nameInput.style.display = "none"
    title.style.display = "none"
    waitForPlayersText.style.display = "none"
    noEcpText.style.display = "none"
    waitingOtherPlayerText.style.display = "none"
    gameInfoTitle.style.display = "none"
    ecpKeyInput.style.display = "none"
    verifyEcpButton.style.display = "none"
}

function showWaitForPlayers()
{
    waitForPlayersText.style.display = "block"
    divPlayerInfo.style.display = "none"
    playButton.style.display = "none"
    nameInput.style.display = "none"
    title.style.display = "none"
    noEcpText.style.display = "none"
    waitingOtherPlayerText.style.display = "none"
    joinTheGame.style.display = "none"
    ecpKeyInput.style.display = "none"
    verifyEcpButton.style.display = "none"
}

function showGameInfo()
{
    gameInfoTitle.style.display = "block"
    divPlayerInfo.style.display = "grid"
    playButton.style.display = "none"
    nameInput.style.display = "none"
    title.style.display = "none"
    waitForPlayersText.style.display = "none"
    noEcpText.style.display = "none"
    waitingOtherPlayerText.style.display = "none"
    joinTheGame.style.display = "none"
    ecpKeyInput.style.display = "none"
    verifyEcpButton.style.display = "none"
}

function showNoEcp()
{
    noEcpText.style.display = "block"
    divPlayerInfo.style.display = "none"
    playButton.style.display = "none"
    nameInput.style.display = "none"
    title.style.display = "none"
    waitForPlayersText.style.display = "none"
    waitingOtherPlayerText.style.display = "none"
    joinTheGame.style.display = "none"
    gameInfoTitle.style.display = "none"
    ecpKeyInput.style.display = "none"
    verifyEcpButton.style.display = "none"
}

function showWaitOtherPlayer()
{
    waitingOtherPlayerText.style.display = "block"
    divPlayerInfo.style.display = "none"
    playButton.style.display = "none"
    nameInput.style.display = "none"
    title.style.display = "none"
    waitForPlayersText.style.display = "none"
    noEcpText.style.display = "none"
    joinTheGame.style.display = "none"
    gameInfoTitle.style.display = "none"
    ecpKeyInput.style.display = "none"
    verifyEcpButton.style.display = "none"
}

function updatePlayersInfo(players)
{
    let html = ""
    for(const player of players)
    {
        let playerDiv = 
        `<div>
            <h2>Name : ${player.playerClientInfo.name}</h2> <br>
            <div>Damages taken : ${player.playerGameInfo.damagesTaken}</div> <br>
            <div>Laser touched : ${player.playerGameInfo.laserTouched}</div> <br>
            <div> Life : ${player.playerGameInfo.life} </div> <br>
            <div> Life regen : ${player.playerGameInfo.lifeRegen}</div>
            <div> Kills : ${player.playerGameInfo.kills} </div> <br>
            <div> Deaths : ${player.playerGameInfo.deaths}</div>
        </div>`
        html += playerDiv
    }
    divPlayerInfo.innerHTML = html
}

function setServerInfo(msg)
{
    divserverData.innerHTML =
    `
    <div>
        <h2>${msg.roomCount} Games</h2>
        <h2>${msg.playerCount} Playing</h2>
        <h2>${msg.playersWaiting} Queue</h2>
    </div>
    `
}

function setName()
{
    nameInput.value = localStorage.getItem("name")
}

function enterEcpKey()
{
    const ecpKey = localStorage.getItem("ecpKey")
    if(ecpKey !== null)
    {
        ecpKeyInput.value = ecpKey
    }
}

setName()
enterEcpKey()




