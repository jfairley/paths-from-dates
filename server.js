var mediainfo = require('mediainfo');
var prompt = require('prompt');
var Q = require('q');
var FS = require('q-io/fs');

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
        ]);
    })
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });
