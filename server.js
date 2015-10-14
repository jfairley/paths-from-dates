'use strict';

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

var UNKNOWN_FILE_LOG = './unknown.files.log';

console.log('starting log file');

fs.writeFileSync(UNKNOWN_FILE_LOG, 'The following files were not copied because a date was not determined:\n');

console.log('reading tree from input path', inputBaseDir);

FS.listTree(inputBaseDir)
    .then(function (inputPaths) {
        console.log('loaded tree list');
        return inputPaths.filter(function (path) {
            return !fs.statSync(path).isDirectory();
        });
    })
    .then(function (inputPaths) {
        console.log('filtered out directory paths');
        return inputPaths.reduce(function (promise, inputPath) {
            var relativeInputDir = FS.directory(FS.relativeFromDirectory(inputBaseDir, inputPath));
            return promise
                .then(function () {
                    return Q.nfcall(mediainfo, inputPath);
                })
                .then(function (result) {
                    result = result[0];
                    var date = [
                        'encoded_date',
                        'File_last_modification_date'
                    ].reduce(function (date, property) {
                            var dateString = result.hasOwnProperty(property) ? result[property] : null;
                            var m = moment.utc(dateString);
                            if (m.isValid()) {
                                return date && date.isBefore(m) ? date : m;
                            }
                            return date;
                        }, null);

                    var outputDir = path.join(outputBaseDir, relativeInputDir);
                    if (date) {
                        outputDir = path.join(outputDir, date.year(), date.month(), date.date());
                    } else {
                        console.error('cannot find date', JSON.stringify(result, null, '  '));
                        return FS.append(UNKNOWN_FILE_LOG, inputPath + '\n');
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
