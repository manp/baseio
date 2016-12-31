const Base=require('./../base');
let app=new Base();
app.get('/',(req,res)=>{
    res.startHtml();
    res.end('done');
});


//test this path with /user2002?action=deactive
app.get(/user([\d]+)/,(req,res,url,get,match)=>{
    res.startHtml()
    res.write(JSON.stringify(get));
    res.write(JSON.stringify(match));
    res.end();
})
app.get('/realtime',(req,res)=>{
    res.startStream();
    let i=0;
    setInterval(()=>{
        i++;
        if((i)%10==0){
            res.stream.event('reached10','reached');
        }
        else{
            res.stream.data(i);
        }
    },1000);
});
app.get('/home',(req,res)=>{
    res.startHtml();
    res.render('./index.html');
});

app.listen(8088,()=>{
    console.log('server started');
});