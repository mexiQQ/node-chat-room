var socketio = require('socket.io')
var io
var guestMumber = 1
var nickMames = {}
var nameUsed = []
var currentRoom = {}

exports.listen = function(server) {
    io = socketio.listen(server)
        //io.set('log level',0)
    io.sockets.on('connection', function(socket) {
        guestMumber = assignGusetMame(socket, guestMumber, nickMames, nameUsed)
        joinRoom(socket, 'Lobby')
        handleMessageBroadcasting(socket, nickMames)
        handleMameChangeAttempts(socket, nickMames, nameUsed)
        handleRoomGoining(socket)
        socket.on('room', function() {
            socket.emit('rooms', io.sockets.manager.rooms)
        })
        handleClientDisconnection(socket, nickMames, nameUsed)
    })
}

function assignGusetMame(socket, guestMumber, nickMames, nameUsed) {
    var name = 'Guest' + guestMumber;
    nickMames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    })
    nameUsed.push(name)
    return guestMumber + 1
}

function joinRoom(socket, room) {
    socket.join(room)
    currentRoom[socket.id] = room
    socket.emit('joinResult', {
        room: room
    })
    socket.broadcast.to(room).emit('message', {
        text: nickMames[socket.id] + ' has joined ' + room + '.'
    })
    var usersInRoom = io.sockets.clients(room)
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ': '
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ','
                }
                usersInRoomSummary += nickMames[userSocketId]
            }
        }
        usersInRoomSummary += '.'
        socket.emit('message', {
            text: usersInRoomSummary
        })
    }
}

function handleMameChangeAttempts(socket, nickMames, nameUsed) {
    socket.on('nameAttempt', function(name) {
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Memes cannot begin with Guest'
            })
        } else {
            if (nameUsed.indexOf(name) == -1) {
                var previousMame = nickMames[socket.id]
                var previousMameIndex = nameUsed.indexOf(previousMame)
                nameUsed.push(name)
                nickMames[socket.id] = name
                delete nameUsed[previousMameIndex]
                socket.emit('nameResult', {
                    success: true,
                    name: name
                })
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousMame + ' is now konwn as ' + name + '.'
                })
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use'
                })
            }
        }
    })
}

function handleMessageBroadcasting(socket) {
    socket.on('message', function(message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickMames[socket.id] + ': ' + message.text
        })
    })
}

function handleRoomGoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id])
        joinRoom(socket, room.newRoom)
    })
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
        var nameIndex = nameUsed.indexOf(nickMames[socket.id])
        delete nameUsed[nameIndex]
        delete nickMames[socket.id]
    })
}
