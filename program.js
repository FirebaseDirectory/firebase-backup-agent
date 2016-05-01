var fs = require('fs');
var https = require('https');
var path = require('path');


const FB_CONFIG_FILE = "config.json";

var globalConfig = null;

console.log("### Firebase Backupp Agent ###");

function loadConfig() {
    console.log("Loading configuration from '" + FB_CONFIG_FILE + "'...");
    globalConfig = JSON.parse(fs.readFileSync(FB_CONFIG_FILE, 'utf8'));
    console.log("Configuration loaded!");
}


function getLatestVersion(success, failure) {
    var body = "";
    console.log('Downloading JSON ...');
    var req = https.get(globalConfig.url, function (res) {
        var len = res.headers["content-length"];
        console.log('Receiving ' + len + ' bytes...');
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body+=chunk;            
        });
        res.on('end', function(){
            console.log('Download complete!');
            success(body);
        });
    });

    req.on('error', function (e) {
        console.error(e);
    });
}
function getSnapshotFilename(tag){
    var filename = globalConfig.dest.pattern + tag + '.json';
    var filePath = path.join(globalConfig.dest.folder, filename);
    
    return filePath;
}

function loadSnapshot(tag){
    var filePath = getSnapshotFilename(tag);
    try{
        fs.accessSync(filePath, fs.F_OK);
    }catch(e){
        console.log('"' + filePath + '" does not exist.');
        return false;
    }    
    
    console.log('Loading snapshot from "' + filePath + '"...');
    var snapshot = fs.readFileSync(filePath, 'utf8');
    return snapshot;
}

function compareWithLatesst(json){
    var latest = loadSnapshot('latest');
    if(latest === false)
        return false;
    var equal = json === latest;
    if(equal){
        console.log("No changes!");
    }else{
        "JSON changed!";
    }
    return equal;
    
}

function saveSnapshot(json, tag){
    var filePath = getSnapshotFilename(tag);
    console.log('Saving JSON to "' + filePath + '"...');
    try{
        fs.accessSync(globalConfig.dest.folder, fs.F_OK);
    }catch(e){
        fs.mkdirSync(globalConfig.dest.folder);    
    }
    
    fs.writeFileSync(filePath, json);
}

function createTimestampTag(){
    var d = new Date;
    var tag = d.toISOString();
    tag = tag.replace(/(([\:-])|(\..*$))/g, '');
    return tag;
}

function main() {

    loadConfig();
    getLatestVersion(function (json) {
        if(!compareWithLatesst(json)){
            var tag = createTimestampTag();
            saveSnapshot(json, tag);
            saveSnapshot(json, 'latest');
        }
    });

}
main();