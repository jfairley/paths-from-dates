'use strict';

var mediainfo = require('mediainfo');
var Promise = require('bluebird');
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

var UNKNOWN_FILE_LOG = 'unknown.files.log';

console.log('reading tree from input path', inputBaseDir);

function moveFiles(inputBase, inputPaths) {
    console.log('starting copy from %s', inputBase);
    return Promise
        .each(inputPaths, function (inputPath) {
            inputPath = path.join(inputBase, inputPath);
            console.log('starting stats on %s', inputPath);
            if (fs.statSync(inputPath).isDirectory()) {
                return list(inputPath);
            }


            var relativeInputDir = FS.directory(FS.relativeFromDirectory(inputBaseDir, inputPath));
            return Q.nfcall(mediainfo, inputPath)
                .then(function (result) {
                    result = result[0];
                    var date = [
                        'Encoded_date',
                        'encoded_date',
                        'Tagged_date',
                        'tagged_date',
                        'File_last_modification_date',
                        'file_last_modification_date'
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
                        outputDir = path.join(outputDir, String(date.year()), String(date.month()), String(date.date()));
                    } else {
                        return FS.makeTree(outputDir)
                            .then(function () {
                                return FS.append(path.resolve(outputDir, UNKNOWN_FILE_LOG), inputPath + '\n');
                            });
                    }

                    return FS.makeTree(outputDir)
                        .then(function () {
                            var outputPath = path.resolve(outputDir, FS.base(inputPath));
                            return FS.move(inputPath, outputPath)
                                .then(function () {
                                    console.log('moved %s to %s', inputPath, outputPath);
                                });
                        });
                });
        });
}


function list(inputDir) {
    return FS.list(inputDir)
        .then(function (files) {
            return moveFiles(inputDir, files);
        });
}


list(inputBaseDir)
    .then(function () {
        console.log('this is after everything');
    })
    .catch(function (err) {
        console.error(err.toString());
        process.exit(1);
    });
