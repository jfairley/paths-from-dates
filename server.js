var mediainfo = require('mediainfo');
var prompt = require('prompt');
var fs = require('fs');
var Q = require('q');

//
// Start the prompt
//
prompt.start();

//
// Get two properties from the user: input and output
//
prompt.get(['input', 'output'], function (err, result) {
    console.log('Command-line input received:');
    console.log('  input:  ' + result.input);
    console.log('  output: ' + result.output);

    var failure = false;

    function validatePath(result, prop) {
        if (!fs.existsSync(result[prop])) {
            console.error(prop, 'path does not exist');
            failure = true;
        } else {
            var stat = fs.statSync(result[prop]);
            if (!stat.isDirectory()) {
                console.error(prop, 'path is not a directory');
                failure = true;
            }
        }
    }

    validatePath(result, 'input');
    validatePath(result, 'output');

    if (failure) {
        process.exit(1);
        return;
    }


});