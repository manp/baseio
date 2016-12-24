let EventEmitter=require('events').EventEmitter;
let url=require('url');
let queryString=require('querystring');
let fileSystem=require('fs');
class Base extends EventEmitter{

    constructor(server){
        super();
        this.serverInstance=server;
        this.staticDirectory=undefined;
        this.getAliases=[];
        this.postAliases=[];
        this.init();

    }
    init(){
        this.serverInstance.prependListener('request',(request,response)=>{
            let requestUrl=url.parse(request.url,true);
        let hasAnswer=this.checkStatic(request,response,requestUrl);

        if(!hasAnswer){
            hasAnswer=this.checkGet(request,response,requestUrl);
        }
        if(!hasAnswer){
            hasAnswer=this.checkPost(request,response,requestUrl);
        }
        if(!hasAnswer){

            response.writeHead(404,{'Content-Type':'text/html'});
            response.end('404 file not found');
        }

    })
    }

    get(pattern,onGet){
        this.getAliases.push({pattern:new RegExp(pattern),callback:onGet})
    }

    post(pattern,onPost){
        this.postAliases.push({pattern:new RegExp(pattern),callback:onPost})
    }

    setStaticDirectory(directory){
        this.staticDirectory=directory;
    }

    checkStatic(request,response,requestUrl){
        if(!this.staticDirectory){
            return false;
        }
        let address='./'+this.staticDirectory+requestUrl.pathname;
        let extension=(/\.\w+$/).exec(address);
        if(!extension){
            if(address.substring(address.length-1)!='/'){
                address+='/';
            }
            address+='index.html';
            extension='.html';
        }
        else {
            extension=extension[0];
        }

        if(fileSystem.existsSync(address)){
            fileSystem.readFile(address,(error,data)=>{
                response.writeHead(200,{'Content-Type':this.getMimeType(extension)});
            response.end(data);
        })
            return true;
        }
        return false;



    }

    getMimeType(extension){
        let mimeTypes={
            '.text' : 'text/plain',
            '.html' : 'text/html',
            '.css' : 'text/css',
            '.js' : 'application/x-javascript',
            '.jpg' : 'image/jpeg',
            '.png' : 'image/png',
            '.ttf' : 'application/font-ttf',
            '.eot' : 'application/font-eot',
            '.otf' : 'application/font-otf',
            '.woff' : 'application/x-font-woff',
            '.svg' : 'image/svg+xml'

        }
        if(mimeTypes.hasOwnProperty(extension)){
            return mimeTypes[extension];
        }
        return 'text/plain';
    }

    checkGet(request,response,requestUrl){
        if(request.method!='GET'){
            return false;
        }

        for(let i in this.getAliases){
            let match=this.getAliases[i].pattern.exec(requestUrl.pathname);
            if(match){
                this.getAliases[i].callback.call(this,request,response,requestUrl,requestUrl.query,match);
                return true;
            }
        }

        return false;
    }

    checkPost(request,response,requestUrl){
        if(request.method!='POST'){
            return false;
        }

        for(let i in this.postAliases){
            let match=this.postAliases[i].pattern.exec(requestUrl.pathname);
            if(match){
                let postBody='';
                request.on('data',(data)=>{
                    postBody+=data;
            })
                request.on('end',()=>{
                    postBody=queryString.parse(postBody);
                this.postAliases[i].callback.call(this,request,response,requestUrl,postBody,match);
            })

                return true;
            }
        }

        return false;
    }


}


module.exports=Base;