import dotenv from 'dotenv'
import http from 'http'
import express from 'express'
import chalk from 'chalk'
import appRoot from 'app-root-path'
import path from 'path'
import socketIo from 'socket.io'

dotenv.config()

const config = dotenv.config()

if (config.error) {
  throw config.error
}

console.log(config.parsed)

const app = express()
const ENV = process.env.NODE_ENV
const PORT = process.env.PORT
const server = http.Server(app)
const io = socketIo(server)
import util from 'util'

io.on('connection', socket => {
  console.log(chalk.blue(`new connection ${socket.id}`))
  const rooms = getRooms('connected')
  console.log({ rooms })
  io.emit('rooms', rooms)

  socket.on('newRoom', function (room) {
    console.log(`A new room is created ${room}`)
    socket.room = room
    socket.join(room)
    io.emit('rooms', getRooms('new room'))
  })

  socket.on('joinRoom', function (room) {
    console.log(`A new user joined room ${room}`)
    socket.room = room
    socket.join(room)
    io.emit('rooms', getRooms('joined room'))
  })

  socket.on('chatMessage', function (data) {
    console.log({ data })
    io.to(data.room).emit('chatMessage', `${data.name}: ${data.msg}`)
  })

  socket.on('setUserName', function (name) {
    console.log(`username set to ${name}(${socket.id})`)
    socket.username = name
  })

  socket.on('disconnect', function () {
    console.log(chalk.green(`${socket.id} disconnected`))
  })
})

if (ENV === 'development') {
  app.use(express.static(`${appRoot}/dist`))
  app.get('/', (req, res) => {
    res.sendFile(path.join(`${appRoot}/dist`, 'index.html'))
  })
}

server.listen(PORT, async () => {
  console.log(chalk.green('server started :'))
})

function getRooms(msg) {
  const nsp = io.of('/')
  const rooms = nsp.adapter.rooms
  /*Returns data in this form
  {
    'roomid1': { 'socketid1', socketid2', ...},
    ...
  }
  */
  //console.log('getRooms rooms>>' + util.inspect(rooms));

  const list = {}

  for (let roomId in rooms) {
    const room = rooms[roomId]
    if (room === undefined) continue
    const sockets = []
    let roomName = ''
    //console.log('getRooms room>>' + util.inspect(room));
    for (let socketId in room.sockets) {
      const socket = nsp.connected[socketId]
      if (socket === undefined || socket.username === undefined || socket.room === undefined) continue
      //console.log(`getRooms socket(${socketId})>>${socket.username}:${socket.room}`);
      sockets.push(socket.username)
      if (roomName == '') roomName = socket.room
    }
    if (roomName != '') list[roomName] = sockets
  }

  console.log(`getRooms: ${msg} >>` + util.inspect(list))

  return list
}
