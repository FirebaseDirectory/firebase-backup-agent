
var path = require("path");
var fs = require("async-file");

class FileSysDevice {
    constructor(dest) {
        this.dest = dest;
    }

    getSnapshotFilename(tag) {
        var filename = this.dest.pattern + tag + '.json';
        var filePath = path.join(this.dest.folder, filename);

        return filePath;
    }

    async getSnapshot(tag) {
        var filePath = this.getSnapshotFilename(tag);

        console.log('Loading snapshot from ' + filePath);

        var err = await fs.access(filePath, fs.constants.R_OK).then(async function () {
            var data = await fs.readFile(filePath);
            data = data.toString('utf8');
            return data;
        }, async function () {
            console.log('\tFile not found!');
            return false;
        });
    }
    async saveSnapshot(json, tag) {
        var filePath = this.getSnapshotFilename(tag);
        console.log('Saving JSON to "' + filePath + '"...');
        await fs.writeFile(filePath, json);
    }
}

module.exports = FileSysDevice;