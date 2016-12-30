const Base=require('./../base');
let app=new Base();
app.get('realtime',(req,res)=>{
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
app.get('home',(req,res)=>{
    res.startHtml();
    res.setHeader('XX','11');
    res.render('./index.html');
});

app.listen(8088,()=>{
    console.log('server started');
});