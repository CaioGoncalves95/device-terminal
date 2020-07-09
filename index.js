var net = require('net')
var os = require('os')
const fs = require('fs')
const { dialog } = require('electron').remote

var client = new net.Socket()

const server = net.createServer()
let sockets = []

function findLocalIP() {
    var interfaces = os.networkInterfaces()
    var addresses = []
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2]
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address)
            }
        }
    }
    return address[0]
}

var remoteIP = document.getElementById("inRemoteIP")
var remotePort = document.getElementById("inRemotePort")
var localPort = document.getElementById("inLocalPort")
var btnOpenConnection = document.getElementById("btnConnect")
var btnCloseConnection = document.getElementById("btnClose")
var radios = document.querySelectorAll('input[type=radio][name="socketRadios"]')
var btnSend = document.getElementById('btnSendString')
var receivedMsg = document.getElementById('receivedText')
var status = document.getElementById('status')
var clientsConnected = document.getElementById('clientsConnected')
var btnLoadFile = document.getElementById('btnLoadFile')
var sendServerMsg = false

var fileToSend

var clientSocket = true
var serverSocket = false


function enableServerSelection() {
    remoteIP.disabled = true
    remotePort.disabled = true
    localPort.disabled = false
    radios[0].disabled = false
    radios[1].disabled = false
}

function enableClientSelection() {
    remoteIP.disabled = false
    remotePort.disabled = false
    localPort.disabled = true
    radios[0].disabled = false
    radios[1].disabled = false
}

function disableSocketSelection() {
    remoteIP.disabled = true
    remotePort.disabled = true
    localPort.disabled = true
    radios[0].disabled = true
    radios[1].disabled = true
}

btnOpenConnection.onclick = () => {
    disableSocketSelection()
    btnOpenConnection.disabled = true
    btnCloseConnection.disabled = false
    if (clientSocket) { //client
        //console.log(parseInt(remotePort.value))
        //console.log(remoteIP.value)
        client.connect(parseInt(remotePort.value), remoteIP.value, function() {})
        document.getElementById('status').innerHTML = "Connected"
    } else { //server
        server.listen(parseInt(localPort.value), findLocalIP(), () => {
            //console.log('TCP Server is running on port ' + localPort.value + '.')
        })
        document.getElementById('status').innerHTML = "Listening"
    }
}

btnCloseConnection.onclick = () => {
    btnOpenConnection.disabled = false
    btnCloseConnection.disabled = true
    if (clientSocket) {
        client.destroy()
        enableClientSelection()
        document.getElementById('status').innerHTML = "Ready"
    } else {
        server.close()
        enableServerSelection()
        document.getElementById('status').innerHTML = "Ready"
        document.querySelectorAll('option').forEach((element) => {
            element.parentNode.removeChild(element)
        })
    }
}

btnSend.onclick = () => {
    var textToSend = document.getElementById('inputText').value
    if (clientSocket) {
        if (document.getElementById('appendCR').checked) {
            client.write(textToSend + "\r")
        } else if (document.getElementById('appendLF').checked) {
            client.write(textToSend + "\n")
        } else if (document.getElementById('appendCR').checked && document.getElementById('appendLF').checked) {
            client.write(textToSend + "\r\n")
        }

    } else {
        if (sockets.length > 0) {

        }
    }
}

btnLoadFile.onclick = () => {
    dialog.showOpenDialog({
        properties: ['openFile']
    }).then((data) => {
        console.log(data)
        if (data) {
            document.getElementById('fileName').value = data.filePaths[0]
            fs.readFile(data.filePaths[0], 'utf-8', (err, data) => {
                if (err) return
                fileToSend = data
            })
        }
    })
}

btnSendFile.onclick = () => {
    if (clientSocket) {
        client.write(fileToSend)
    }
}

function changeHandler(event) {
    if (this.value === 'client') { // TCP Client
        //console.log("TCP Client")
        clientSocket = true
        serverSocket = false
        enableClientSelection()
    } else if (this.value === 'server') { // TCP Server
        //console.log("TCP Server")
        clientSocket = false
        serverSocket = true
        enableServerSelection()
    }
}

Array.prototype.forEach.call(radios, function(radio) {
    radio.addEventListener('change', changeHandler)
})

client.on('data', function(data) {
    receivedMsg.value += data
    receivedMsg.scrollTop = receivedMsg.scrollHeight
})

server.on('connection',
    function(sock) {
        //console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort)
        sockets.push(sock)
        sockets.forEach(function(sock, index, array) {
            //sock.write(sock.remoteAddress + ':' + sock.remotePort + " said " + data + '\n')
            var opt = document.createElement('option')
                //opt.value = sock.remoteAddress + ':' + sock.remotePort
                //console.log(sock.remoteAddress) //+ ':' + sock.remotePort)
            opt.innerHTML = sock.remoteAddress + ':' + sock.remotePort
            clientsConnected.appendChild(opt)
        })

        if (sendServerMsg) {
            sock.write(document.getElementById('inputText').value)
            sendServerMsg = false
        }
        // function a(ipAddress) {
        //     var opt = document.createElement('option')
        //     opt.value = ipAddress
        //     opt.innerHTML = ipAddress
        //     clientsConnected.appendChild(opt)
        // }
        // sockets.forEach(a)
        sock.on('data', function(data) {
            //console.log('DATA ' + sock.remoteAddress + ': ' + data)
            receivedMsg.value += data
            receivedMsg.scrollTop = receivedMsg.scrollHeight
                // Write the data back to all the connected, the client will receive it as data from the server
        })


        // Add a 'close' event handler to this instance of socket
        sock.on('close', function(data) {
            let index = sockets.findIndex(function(o) {
                return o.remoteAddress === sock.remoteAddress && o.remotePort === sock.remotePort
            })
            if (index !== -1) sockets.splice(index, 1)
                //console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort)
        })
    }
)