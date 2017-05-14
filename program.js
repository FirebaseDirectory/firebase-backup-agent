var fs = require('fs');
var asyncFs = require('async-file');
var path = require('path');
var admin = require('firebase-admin');
var stdio = require('stdio');

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
    var serviceAccount = require(globalConfig.firebase.credentialsFile);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: globalConfig.firebase.databaseURL
    });
    var options = {
        'backup': { key: 'b', description: 'Backup your firebase database' },
        'get': { key: 'g', args: 1, description: 'Saves entire database to a file' },
        'getnode': { key: 'gt', args: 2, description: 'Saves a node to a file' },
        'encoding': { args: 1, description: 'Sets the encoding for get and getnode. If ommited defaults to utf-8'},
        'set': { key: 's', args: 1, description: 'Replace entire database with a local file' },
        'setnode': { key: 'sn', args: 2, description: 'Replace a node with a local file' },
        'update': { key: 'u', args: 1, description: 'Update database with contents of file' },
        'updatenode': { key: 'un', args: 2, description: 'Update a node with contents of file' }
    };
    var opts = stdio.getopt(options);
    
    if (opts.backup)
        await backupDatabse(opts);
    else if (opts.get)
        await getContents(opts);
    else if(opts.getnode)
        await getContents(opts);
    else if (opts.set)
        await pushToDatabase(opts);
    else if (opts.setnode && opts.setnode.length === 2)
        await pushToDatabase(opts);
    else if (opts.update)
        await pushToDatabase(opts);
    else if (opts.updatenode && opts.updatenode.length === 2)
        await pushToDatabase(opts);
    else {
        opts.printHelp();

    }
    process.exit(0);
}

async function backupDatabse(opts) {
    console.log('Backing up your database...');
    var json = await getLatestVersion();

    var equal = await compareWithLatesst(json);
    if (!equal) {
        var tag = createTimestampTag();
        await saveSnapshot(json, tag);
        await saveSnapshot(json, 'latest');
        console.log('Complete!');
    }

}

async function getContents(opts) {
    var path, dest;

    var encoding = opts.encoding || 'utf-8';

    if (opts.get) {
        path = '/';
        dest = opts.get;
    } else {
        path = opts.getnode[0];
        dest = opts.getnode[1];
    }
    console.log('Downloading contents from Firebase...');
    var db = admin.database();
    var ref = db.ref(path);
    console.log('Getting object...');
    var json = await ref.once('value');
    json = JSON.stringify(json.val());
    console.log(`Saving contents to "${dest}"...`);
    await asyncFs.writeTextFile(dest, json, encoding);
    console.log('Contents saved!');

}

async function pushToDatabase(opts, path) {

    var localFilename, path;

    let actions = {
        SET: 1,
        UPDATE: 2
    };

    var action;

    if (opts.set) {
        action = actions.SET;
        path = '/';
        localFilename = opts.set;
    } else if (opts.setnode) {
        action = actions.SET;
        path = opts.setnode[0];
        localFilename = opts.setnode[1];
    } else if (opts.update) {
        action = actions.UPDATE;
        path = '/';
        localFilename = opts.update;
    } else if (opts.updatenode) {
        action = actions.UPDATE;
        path = opts.updatenode[0];
        localFilename = opts.updatenode[1];
    }

    console.log(`Sending ${localFilename} to Firebase...`);

    await asyncFs.access(localFilename).then(async function () {
        var file = await asyncFs.readFile(localFilename);
        var json = file.toString("utf-8");
        try {
            var value = JSON.parse(json);
        } catch (e) {
            console.error(e);
            return;
        }
        var db = admin.database();
        var ref = db.ref(path);
        if (action === actions.SET)
            await ref.set(value);
        else
            await ref.update(value);

        console.log('Finished!');

    }, async function () {
        console.error(`The requested file "${localFilename}" does not exist!`);
        return false;
    });
}
main();