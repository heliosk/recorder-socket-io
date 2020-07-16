const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 4003;
const fs = require('fs');

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});

io.on('connection', (socket) => {

    const extension = '.mp4';
    
    let client = null;
    let fileStream = null;
    let pathToRecord = null;
    let dir = `./records/${client}`;

    socket.on('init_socket', (data) => {
        let dataInfo = JSON.parse(data);
        client = dataInfo.client;
    });

    socket.on('create_file', (data) => {

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        pathToRecord = `records/${client}/${data}${extension}`;
        fileStream = fs.createWriteStream(pathToRecord, { flags: 'a' });
    });

    socket.on('new_chunk_piece', (data) => {
        
        fileStream.write(Buffer.from(new Uint8Array(data)));
    });

    socket.on('disconnect', () => {
        console.log('disconnect');
    });
});
