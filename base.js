let EventEmitter = require('events').EventEmitter;
let url = require('url');
let queryString = require('querystring');
let fileSystem = require('fs');
class Base extends EventEmitter {

    constructor(server = new require('http').Server()) {
        super();
        this.serverInstance = server;
        this.staticDirectory = undefined;
        this.getAliases = [];
        this.postAliases = [];
        this.init();

    }

    init() {
        this.serverInstance.prependListener('request', (request, response) => {
            let requestUrl = url.parse(request.url, true);

            let hasAnswer = this.checkStatic(request, response, requestUrl);

            this.initResponse(response);

            if (!hasAnswer) {
                hasAnswer = this.checkGet(request, response, requestUrl);
            }
            if (!hasAnswer) {
                hasAnswer = this.checkPost(request, response, requestUrl);
            }
            if (!hasAnswer) {

                response.writeHead(404, {'Content-Type': 'text/html'});
                response.end('404 file not found');
            }

        });
    }

    initResponse(response) {
        response.startType = function (mimetype, code = 200) {
            this.statusCode=code;
            this.setHeader('Content-Type',mimetype);

        };
        response.startHtml = function (code = 200) {
            this.statusCode=200;
            this.setHeader('Content-Type','text/html');
        };
        response.startStream = function () {
            this.statusCode=200;
            this.setHeader('Content-Type','text/event-stream');
            this.setHeader('Cache-Control','no-cache');
            this.setHeader('Connection','keep-alive');
        };

        response.render = function (path, data = undefined) {
            fileSystem.readFile(path, (error, res) => {

                if (data == undefined) {
                    this.end(res.toString());
                } else {
                    res = res.toString();
                    for (let i in data) {
                        res = res.replace(new RegExp(`\{\{${i}\}\}`, 'g'), data[i]);
                    }
                    this.end(res);
                }
            });
        };
        response.stream = {};
        response.stream.data = function (message) {
            response.write(`data:${message}\n\n`);
        };
        response.stream.event = function (event, message) {
            response.write(`event:${event}\n`);
            response.write(`data:${message}\n\n`);
        };
    }

    get(pattern, onGet) {
        this.getAliases.push({pattern: pattern, callback: onGet})
    }

    post(pattern, onPost) {
        this.postAliases.push({pattern: pattern, callback: onPost})
    }

    setStaticDirectory(directory) {
        this.staticDirectory = directory;
    }

    checkStatic(request, response, requestUrl) {
        if (!this.staticDirectory) {
            return false;
        }
        let address = './' + this.staticDirectory + requestUrl.pathname;
        let extension = (/\.\w+$/).exec(address);
        if (!extension) {
            if (address.substring(address.length - 1) != '/') {
                address += '/';
            }
            address += 'index.html';
            extension = '.html';
        }
        else {
            extension = extension[0];
        }

        if (fileSystem.existsSync(address)) {
            fileSystem.readFile(address, (error, data) => {
                response.writeHead(200, {'Content-Type': this.getMimeType(extension)});
                response.end(data);
            })
            return true;
        }
        return false;


    }

    getMimeType(extension) {
        let mimeTypes = {
            '.text': 'text/plain',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/x-javascript',
            '.jpg': 'image/jpeg',
            '.png': 'image/png',
            '.ttf': 'application/font-ttf',
            '.eot': 'application/font-eot',
            '.otf': 'application/font-otf',
            '.woff': 'application/font-woff',
            '.woff2': 'application/font-woff2',
            '.svg': 'image/svg+xml'

        };
        if (mimeTypes.hasOwnProperty(extension)) {
            return mimeTypes[extension];
        }
        return 'text/plain';
    }

    checkGet(request, response, requestUrl) {
        if (request.method != 'GET') {
            return false;
        }
        for(let alias of this.getAliases){
            let isRegEx = alias.pattern instanceof RegExp;
            let match= isRegEx ?  alias.pattern.exec(requestUrl.pathname) : alias.pattern==requestUrl.pathname;
            if(match){
                alias.callback.call(this, request, response, requestUrl, requestUrl.query, isRegEx?match:[]);
                return true;
            }
        }
        return false;
    }

    checkPost(request, response, requestUrl) {
        if (request.method != 'POST') {
            return false;
        }

        for(let alias of this.postAliases){
            let isRegEx = alias.pattern instanceof RegExp;
            let match= isRegEx ?  alias.pattern.exec(requestUrl.pathname) : alias.pattern==requestUrl.pathname;
            if(match){
                let postBody = '';
                request.on('data', (data) => {
                    postBody += data;
                });
                request.on('end', () => {
                    postBody = queryString.parse(postBody);
                    alias.callback.call(this, request, response, requestUrl, postBody, isRegEx?match:[]);
                });

                return true;
            }
        }
        return false;
    }

    listen(path, callback = undefined) {

        this.serverInstance.listen(path, callback)
    }


}


module.exports = Base;