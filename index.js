require('dotenv').config();
var express = require('express');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
var bodyParser = require('body-parser');
// var Mongoose = require('mongoose');


// Mongoose.connect("mongodb://localhost/project2", {
//   useUnifiedTopology: true,
//   useNewUrlParser: true
// });
var cookieParser = require('cookie-parser')
var port = process.env.PORT||3000;
// var app = express();
server.listen(port);
app.use(cookieParser())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var useronline = []
const channels = {};
const sockets = {};
io.on('connection', socket => {
  console.log(socket.id + ': connected');
  socket.channels = {};
  sockets[socket.id] = socket;
  socket.on("connectto", (data) => {
    var { userid, username } = data;
    socket.join(data.userid);
    var isconnect = false
    useronline.forEach(element => {
      if (element.userid === data.userid) {
        console.log('da connect');
        isconnect = true;
      }
    });
    if (!isconnect) {


      useronline.push({ userid: userid, username: username, socketid: socket.id })
      console.log(`userid is ${data.userid} connected`)
    }
  })
  socket.on("useronline", () => {
    // console.log('on useronline')
    // console.log(useronline)
    io.emit("useronline", useronline)
  })
  socket.on('message', (data) => {
    console.log(data.receiver)
    io.to(data.receiver[0]._id).to(data.receiver[1]._id).emit('message', data)

    // io.to(data.member[1]).emit('message', {
    //   username: data.member[0],
    //   content: data.content
    // })
    // socket.emit('message',{
    //   username: data.member[0],
    //   content: data.content
    // })
  })
  socket.on('call', data => {
    console.log(data.receiver);
    io.to(data.receiver).emit('call', data);
  })

  socket.on('join', (config) => {
    // console.log("[" + socket.id + "] join ", config);
    const channel = config.channel;
    // const userdata = config.userdata;

    if (channel in socket.channels) {
      // console.log("[" + socket.id + "] ERROR: already joined ", channel);
      return;
    }

    if (!(channel in channels)) {
      channels[channel] = {};
    }

    for (id in channels[channel]) {
      channels[channel][id].emit('addPeer', { 'peer_id': socket.id, 'should_create_offer': false });
      socket.emit('addPeer', { 'peer_id': id, 'should_create_offer': true });
    }

    channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
  });

  const part = (channel) => {
    // console.log("[" + socket.id + "] part ");

    if (!(channel in socket.channels)) {
      // console.log("[" + socket.id + "] ERROR: not in ", channel);
      return;
    }

    delete socket.channels[channel];
    delete channels[channel][socket.id];

    for (id in channels[channel]) {
      channels[channel][id].emit('removePeer', { 'peer_id': socket.id });
      socket.emit('removePeer', { 'peer_id': id });
    }
  }
  socket.on('part', part);

  socket.on('relayICECandidate', (config) => {
    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;
    // console.log("[" + socket.id + "] relaying ICE candidate to [" + peer_id + "] ", ice_candidate);

    if (peer_id in sockets) {
      sockets[peer_id].emit('iceCandidate', { 'peer_id': socket.id, 'ice_candidate': ice_candidate });
    }
  });

  socket.on('relaySessionDescription', (config) => {
    let peer_id = config.peer_id;
    let session_description = config.session_description;
    // console.log("[" + socket.id + "] relaying session description to [" + peer_id + "] ", session_description);

    if (peer_id in sockets) {
      sockets[peer_id].emit('sessionDescription', {
        'peer_id': socket.id,
        'session_description': session_description
      });
    }
  });
  socket.on("disconnect", () => {
    for (const channel in socket.channels) {
      part(channel);
    }
    // console.log("[" + socket.id + "] disconnected");
    delete sockets[socket.id];
    for (let index = 0; index < useronline.length; index++) {
      // const element = useronline[index];
      if (useronline) {

        if ((useronline[index].socketid === socket.id)) {
          // console.log('s');
          useronline.splice(index, 1)
          break;
        }
      }
    }
    // useronline.forEach(element => {
    //   if(element.socketid===socket.id) {
    //     console.log('s');
    //     delete element
    //   }
    // });
    console.log("Client disconnected");
  });
})

app.all(['/videocall', '/videocall/:room'], (req, res) => res.sendFile(__dirname + '/call.html'));

app.get('/', (req, res) => res.sendFile(__dirname + '/call.html'));