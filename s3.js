
var AWS = require('aws-sdk');

class S3Device {
    constructor(dest) {
        this.dest = dest;

        AWS.config.loadFromPath(dest.credentialsFile);

        this.s3 = new AWS.S3();
    }
    getFilename(tag) {
        return this.dest.pattern + tag + '.json';
    }
    getSnapshot(tag) {
        var key = this.getFilename(tag);

        console.log('Downloading ' + key + ' from S3...');

        var promise = new Promise((fulfill, reject) => {
            var request = this.s3.getObject({
                Bucket: this.dest.bucket,
                Key: key
            }, (response, data) => {
                if (response != null && response.code == 'NoSuchKey')
                    fulfill(false);
                else
                    fulfill(data.Body.toString('utf-8'));
            }, () => {
                reject();
            });
        });

        return promise;
    }

    saveSnapshot(json, tag) {
        var key = this.getFilename(tag);
        console.log('Uploading ' + key + ' to S3...');
        var promise = new Promise((fulfill, reject) => {
            var request = this.s3.putObject({
                Key: key,
                Bucket: this.dest.bucket,
                Body: json,
                ContentType: 'application/json'
            }, () => {
                fulfill();
            }, () => {
                reject();
            });
        });

        return promise;
    }
}

module.exports = S3Device;