var mediainfo = require('mediainfo');
var prompt = require('prompt');
var Q = require('q');
var fs = require('fs');
var FS = require('q-io/fs');
var moment = require('moment');
var path = require('path');

//
// Start the prompt
//
prompt.start();

//
// Get two properties from the user: input and output
//
Q.nfcall(prompt.get, ['input', 'output'])
    .then(function (result) {
        console.log('Command-line input received:');
        console.log('  input:  ' + result.input);
        console.log('  output: ' + result.output);

        function validatePath(path) {
            return FS.exists(path)
                .then(function (exists) {
                    if (exists === false) {
                        throw path + ' path does not exist';
                    }
                    return FS.isDirectory(path)
                })
                .then(function (isDirectory) {
                    if (isDirectory === false) {
                        throw path + ' path is not a directory';
                    }
                });
        }

        return Q.all([
            validatePath(result['input']),
            validatePath(result['output'])
        ]).then(function () {
            return [result.input, result.output];
        });
    })
    .spread(function (input, output) {
        console.log('reading tree from input path');
        return FS.listTree(input)
            .then(function (inputPaths) {
                return Q.all(inputPaths
                    .filter(function (inputPath) {
                        return !fs.statSync(inputPath).isDirectory();
                    })
                    .map(function (inputPath) {
                        return Q.nfcall(mediainfo, inputPath)
                            .then(function (result) {
                                var dateString = result.File_last_modification_date;
                                var m = moment.utc(dateString);
                                var outputDir = path.resolve(output, m.year(), m.month(), m.date());
                                return FS.makeTree(outputDir)
                                    .then(function () {
                                        return FS.base(inputPath);
                                    })
                                    .then(function (inputBase) {
                                        var outputPath = path.resolve(outputDir, inputBase);
                                        return FS.copy(inputPath, outputPath)
                                            .then(function () {
                                                console.log('copied %s to %s', inputPath, outputPath);
                                            });
                                    });
                            });
                    }));
            });
    })
    .catch(function (err) {
        console.error(err.toString());
        process.exit(1);
    });
