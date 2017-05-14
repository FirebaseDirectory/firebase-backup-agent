var fs = require('fs');
var path = require('path');

var admin = require('firebase-admin');


var S3Device = require('./s3');
var FileSysDevice = require('./filesys');

const FB_CONFIG_FILE = "config.json";

var globalConfig = null;

var device;

console.log("### Firebase Backupp Agent ###");

function loadConfig() {

    try {
        fs.accessSync(FB_CONFIG_FILE, fs.F_OK);
    } catch (e) {
        console.log("The configuration file '" + FB_CONFIG_FILE + "' has not been created yet! See README file for instructions.");
        process.exit(-1);
    }


    console.log("Loading configuration from '" + FB_CONFIG_FILE + "'...");
    globalConfig = JSON.parse(fs.readFileSync(FB_CONFIG_FILE, 'utf8'));
    console.log("Configuration loaded!");

    switch (globalConfig.dest.type) {
        case "filesys": device = new FileSysDevice(globalConfig.dest); break;
        case "s3": device = new S3Device(globalConfig.dest); break;
        default: console.log("Unsupported destination type"); exit(-1);
    }
}


async function getLatestVersion() {

    var db = admin.database();

    var ref = db.ref('/');

    var snapshot = await ref.once('value');
    var json = JSON.stringify(snapshot.val());
    return json;
}


async function loadSnapshot(tag) {
    return await device.getSnapshot(tag);
}

async function compareWithLatesst(json) {
    var latest = await loadSnapshot('latest');
    if (latest === false) {
        return false;
    }
    var equal = json === latest;
    if (equal) {
        console.log("No changes!");
    } else {
        "JSON changed!";
    }
    return equal;
}

async function saveSnapshot(json, tag) {
    await device.saveSnapshot(json, tag);
}

function createTimestampTag() {
    var d = new Date;
    var tag = d.toISOString();
    tag = tag.replace(/(([\:-])|(\..*$))/g, '');
    return tag;
}

async function main() {

    loadConfig();

    var admin = require("firebase-admin");

    var serviceAccount = require(globalConfig.firebase.credentialsFile);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: globalConfig.firebase.databaseURL
    });

    var json = await getLatestVersion();

    var equal = await compareWithLatesst(json);
    if (!equal) {
        var tag = createTimestampTag();
        await saveSnapshot(json, tag);
        await saveSnapshot(json, 'latest');
        console.log('Complete!');
        process.exit(0);
    } else {
        process.exit(0);
    }
}
main();