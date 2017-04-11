
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
    getSnapshot(tag, success, error) {
        var key = this.getFilename(tag);

        console.log('Downloading ' + key + ' from S3...');

        var request = this.s3.getObject({
            Bucket: this.dest.bucket,
            Key: key
        }, function (response, data) {
            if(response != null && response.code == 'NoSuchKey')
                success(false);
            else
                success(data.Body.toString('utf-8'));
        }, error);
    }

    saveSnapshot(json, tag, success, error) {
        var key = this.getFilename(tag);
        console.log('Uploading ' + key + ' to S3...');

        var request = this.s3.putObject({
            Key: key,
            Bucket: this.dest.bucket,
            Body: json,
            ContentType: 'application/json'
        }, function () {
            if (success)
                success();
        }, error);


    }
}

module.exports = S3Device;