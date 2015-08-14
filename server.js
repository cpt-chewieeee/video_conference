
var path = require("path"),
    fs = require("fs"),
    uuid = require('node-uuid');

var app = require('http').createServer(function (request, response) {
    var uri = require('url').parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);

    fs.exists(filename, function (exists) {
        var contentType = {
            "Content-Type": "text/plain"
        };

        if (!exists) {
            response.writeHead(404, contentType);
            response.write('404 Not Found: ' + filename + '\n');
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) {
            contentType = {
                "Content-Type": "text/html"
            };
            filename += '/index.html';
        }

        fs.readFile(filename, 'binary', function (err, file) {
            if (err) {
                response.writeHead(500, contentType);
                response.write(err + "\n");
                response.end();
                return;
            }

            response.writeHead(200, contentType);
            response.write(file, 'binary');
            response.end();
        });
    });
});

app.listen(1234);
var parentDirectory = './uploads/';
var currentDirectory;//where the videos for gameid is located
var userDirectory;//where each user's video+audio is located
var config = {
    path: '/reliable-signaler/signaler.js',
    socketCallback: function(socket){
       socket.on('connection', function(str){
            
            currentDirectory = str['gameid'];
            
            var mkdirp = require('mkdirp');
            currentDirectory = './uploads/' + currentDirectory;
        
            mkdirp(currentDirectory, function(err){
                if(err) console.log(err);
                else console.log("Directory: " + currentDirectory + " was created");
            })
       });
       socket.on('sendRecording', function(data){
            var fileName = uuid.v4();
          
            writeToDisk(data.audio.dataURL, fileName + '.wav');
            writeToDisk(data.video.dataURL, fileName + '.webm');

            //merge(socket, data.audio.name, data.video.name);
       });
       socket.on('clientEnd', function(data){
        console.log(data);
       });
    }
};
// npm install reliable-signaler
require('reliable-signaler')(app, config);
console.log("staring server");
function writeToDisk(dataURL, fileName) {
    var fileExtension = fileName.split('.').pop(),
        fileRootNameWithBase = currentDirectory + '/' + fileName,
        filePath = fileRootNameWithBase,
        fileID = 2,
        fileBuffer;

    // @todo return the new filename to client
    while (fs.existsSync(filePath)) {
        filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
        fileID += 1;
    }

    //dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');
    fs.writeFileSync(filePath, fileBuffer);

    console.log('filePath', filePath);
}

function merge(socket, fileName) {
    console.log("MERGING");
    var FFmpeg = require('fluent-ffmpeg');

    var audioFile = path.join(__dirname, 'uploads', fileName + '.wav'),
        videoFile = path.join(__dirname, 'uploads', fileName + '.webm'),
        mergedFile = path.join(__dirname, 'uploads', fileName + '-merged.webm');

    new FFmpeg({
            source: videoFile
        })
        .addInput(audioFile)
        .on('error', function (err) {
            socket.emit('ffmpeg-error', 'ffmpeg : An error occurred: ' + err.message);
        })
        .on('progress', function (progress) {
            socket.emit('ffmpeg-output', Math.round(progress.percent));
        })
        .on('end', function () {
            socket.emit('merged', fileName + '-merged.webm');
            console.log('Merging finished !');

            // removing audio/video files
            fs.unlink(audioFile);
            fs.unlink(videoFile);
        })
        .saveToFile(mergedFile);
}