const fs = require('fs');
const request = require('request');
const { google} = require('googleapis');
const express = require('express')

var app = express()
app.set('port', (process.env.PORT || 5000))
    // app.use(express.static(__dirname + '/public'))
app.use(express.urlencoded({extended: true}))

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const TOKEN_PATH = __dirname + "/" + "token.json";


// FIREBASE CONFIG
var firebase = require('firebase/app');
require('firebase/database'); var firebaseConfig = {
    apiKey: "AIzaSyA8ouGGj6kQ-8iPulYkUmtouCiP3xazrG4",
    authDomain: "ajz-heroku.firebaseapp.com",
    databaseURL: "https://ajz-heroku.firebaseio.com",
    projectId: "ajz-heroku",
    storageBucket: "ajz-heroku.appspot.com",
    messagingSenderId: "830685316269",
    appId: "1:830685316269:web:2179a27640b20d0658b224"
  };
var firebaseapp = firebase.initializeApp(firebaseConfig);
var database = firebase.database();
function setDB(ts,f,s,dlsize,upsize){
	dls = dlsize || "-"
	ups = upsize || "-"
database.ref('files/'+ts).set ({
  filename:f,
   status: s,
   dls,
   ups
});
}
// FIREBASE CONFIG END


function authorize(credentials, callback) {
    const {
        client_secret,
        client_id,
        redirect_uris
    } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });

}


//     var fileurl = "http://i3.ytimg.com/vi/J---aiyznGQ/mqdefault.jpg"
var filename = "NOTNAMED"
var mimeType = "image/jpeg"
var length = 0

app.get('/', function(req, res) {
    if (req.query.dl) {
        res.send(req.query.dl)
    } else
        res.sendFile(__dirname + "/" + "index.html");
});

app.get('api/', function(req, res) {
    console.log(req.query.url)
    res.send(' <h2>Url :' + req.query.url + ' </h2> ');
});

const url = require("url");
const path = require("path");

app.post('/form',doWork)
 app.get('/dl',doWork)

function doWork (req, res) {
if(req.path=="/form"){
	var fileurl = req.body.url
	var filename = req.body.name || "NOTNAMED"
}
else{
var fileurl = req.query.url
var filename = req.query.name || "NOTNAMED"
}
    
    var parsed = url.parse(fileurl);
    var pfilename = path.basename(parsed.pathname)
    var  timestamp = Date.now() 
  
  
  
    // Authorization
    fs.readFile(__dirname + "/" + "credentials.json", (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), uploadFile);
    });

     function uploadFile(auth) {
    setDB(timestamp,pfilename,"Downloading..")
        const axios = require('axios');
        axios({
                method: "get",
                url: fileurl,
                responseType: "stream"
            }).then(function(response) {
            	
             //   response.data.pipe(fs.createWriteStream("/temp/my.pdf"));
                console.log(response.headers)
                var headers = response.headers
                if (filename == "NOTNAMED")
                    if (headers['content-disposition']) {
                        var regexp = /filename=\"(.*)\"/gi;
                        filename = regexp.exec(headers['content-disposition'])[1];
                    } else {
                        filename = pfilename
                    }

                var mimeType = headers["content-type"]
                if (headers["content-length"]){
                    var length = headers["content-length"]
                    var dlsize = readableBytes(length)
                }else{
                    var length = "NA"
                    var dlsize = length
                }
                console.log(pfilename, filename, mimeType, dlsize)               
                
                // DRIVE UPLOAD START
                setDB(timestamp,filename,"Uploading..",dlsize)
                const drive = google.drive({version: "v3",auth});
                var fileMetadata = {name: filename};
                var media = {mimeType: mimeType,body: response.data};   
                    drive.files.create({
                            resource: fileMetadata,
                            media: media,
                            fields: "name,id,size,mimeType"
                        },
                        function(err, resp) {
                            if (err) {
                            	setDB(timestamp,filename,"Upload failed",dlsize)
                            	msg ='The API returned an error: ' + err
                                console.log(msg);                             
                                res.send(msg);                             
                                return
                            } else {
                            	
                                var size = resp.data.size
                                var upsize = readableBytes(size)
                                var feedback = "Size-OK"
                                if (size != length && length == "NA") feedback = "Size-Not-Matched or Not-Defined"
                                var msg = ` <h4> Uploaded <br> <br> File Id: ${resp.data.id} <br> File Name: ${resp.data.name} <br> File size: ${upsize} <br> ${feedback} </h4> `                       
                                console.log(msg);
                                setDB(timestamp,filename,"Uploaded",dlsize,upsize)
                                res.send(msg);
                            }
                        }); // drive.files.create
                       // DRIVE UPLOAD END

         
            }).catch(function(error) {
            	setDB(timestamp,filename,"Download failed")
                 res.send(error.message);
                console.log(error)
            }) // axios END
    } // uploadFile

} // before app.post // now doWork

function readableBytes(bytes) {
    var i = Math.floor(Math.log(bytes) / Math.log(1024)),
        sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i];
}

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'))
})
