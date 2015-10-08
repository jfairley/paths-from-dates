var mediainfo = require('mediainfo');
var Q = require('q');
var fs = require('fs');
var FS = require('q-io/fs');
var moment = require('moment');
var path = require('path');


var args = process.argv.slice(2);
if (args.length < 2) {
    console.log('input args', args);
    throw 'ERROR: expect 2 args: input and output path';
}

var inputBaseDir = path.resolve(args[0]);
var outputBaseDir = path.resolve(args[1]);

function validatePath(path) {
    if (!fs.existsSync(path)) {
        throw path + ' path does not exist';
    }
    if (!fs.statSync(path).isDirectory()) {
        throw path + ' path is not a directory';
    }
}
validatePath(inputBaseDir);
validatePath(outputBaseDir);

console.log('reading tree from input path', inputBaseDir);

return FS.listTree(inputBaseDir)
    .then(function (inputPaths) {
        return inputPaths.filter(function (path) {
            return !fs.statSync(path).isDirectory();
        });
    })
    .then(function (inputPaths) {
        return inputPaths.reduce(function (promise, inputPath) {
            console.log(typeof inputPath, inputPath);
            return promise
                .then(function () {
                    return Q.nfcall(mediainfo, inputPath);
                })
                .then(function (result) {
                    var outputDir = outputBaseDir;
                    var dateString = result.File_last_modification_date;
                    if (dateString) {
                        var m = moment.utc(dateString);
                        if (m.isValid()) {
                            outputDir = path.resolve(outputBaseDir, m.year(), m.month(), m.date());
                        } else {
                            console.error('cannot read date', dateString, JSON.stringify(result));
                        }
                    } else {
                        console.error('cannot find date', JSON.stringify(result));
                    }
                    return FS.makeTree(outputDir)
                        .then(function () {
                            return FS.base(inputPath);
                        })
                        .then(function (inputFilename) {
                            var outputPath = path.resolve(outputDir, inputFilename);
                            return FS.copy(inputPath, outputPath)
                                .then(function () {
                                    console.log('copied %s to %s', inputPath, outputPath);
                                });
                        });
                });
        }, Q());
    })
    .then(function () {
        console.log('this is after everything');
    })
    .catch(function (err) {
        console.error(err.toString());
        process.exit(1);
    });
