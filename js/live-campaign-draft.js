/* Exact install counts are canonical. Quotes are estimates, never payment instructions. */
(function () {
    'use strict';
    var LIMIT=100000, MAX_KEYWORDS=20;
    function clone(value){return JSON.parse(JSON.stringify(value));}
    function counts(d){return {link:d.sources.link,web:d.sources.web,keywords:d.keywords.reduce(function(n,k){return n+k.installs;},0)};}
    function total(d){var c=counts(d);return c.link+c.web+c.keywords;}
    function sync(d){d.pacing.acquisitionDays=Math.ceil(total(d)/d.pacing.dailyInstalls);return d;}
    function create(project){
        var m=project.live_metrics,rate=m && m.installs && m.installs.per_day;
        var title=String(project.play_store_raw && project.play_store_raw.title || project.name || project.package_name || '').trim();
        return {schemaVersion:2,appId:Number(project.id || project.app_id),appTitle:title,strategy:null,
            baseline:{available:!!(m && m.source==='devtesthub_live' && m.boundary_available!==false && typeof rate==='number' && Number.isFinite(rate) && rate>=0),perDay:typeof rate==='number' && Number.isFinite(rate) && rate>=0?rate:null,asOf:m && m.as_of || null},
            sources:{link:7,web:0},web:{query:title.slice(0,200),screenshot:null},keywords:[],nextKeywordId:1,
            retention:{days:7,checkpoints:[1,7]},activity:{enabled:false,screenshot:false},reviews:{enabled:false,delayDays:7,prompt:'soft'},
            pacing:{dailyInstalls:1,acquisitionDays:7,rampUp:true},billing:{source:'project',allowWalletFallback:false}};
    }
    function distribute(amount,weights){
        var sum=weights.reduce(function(n,w){return n+w;},0),rows=weights.map(function(w,i){var exact=sum?amount*w/sum:0;return {i:i,n:Math.floor(exact),remainder:exact%1};});
        var left=amount-rows.reduce(function(n,r){return n+r.n;},0);
        rows.slice().sort(function(a,b){return b.remainder-a.remainder || a.i-b.i;}).forEach(function(r){if(left>0){r.n++;left--;}});
        return rows.map(function(r){return r.n;});
    }
    function applyStrategy(d,strategy){
        if(!['aso','retention','deep','custom'].includes(strategy))return d;
        var next=create({id:d.appId,name:d.appTitle});next.baseline=clone(d.baseline);next.strategy=strategy;
        var rate=next.baseline.available?next.baseline.perDay:0,weights=[100,0,0],period=7;
        if(strategy==='aso'){
            weights=[10,20,70];next.retention={days:14,checkpoints:[1,7,14]};next.reviews.enabled=true;
            next.pacing.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.3)));period=14;
        }else if(strategy==='retention'){
            weights=[34,33,33];next.retention={days:30,checkpoints:[1,7,14,21,30]};
            next.pacing.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.1)));period=14;
        }else if(strategy==='deep')next.activity={enabled:true,screenshot:true};
        var parts=distribute(next.pacing.dailyInstalls*period,weights);
        next.sources={link:parts[0],web:parts[1]};
        if(parts[2]){
            var phrase=LiveCampaignKeywords.suggest({title:d.appTitle})[0];
            if(phrase){next.keywords=[{id:'k1',keyword:phrase,installs:parts[2],position:'',screenshot:null}];next.nextKeywordId=2;}
            else next.sources.link+=parts[2];
        }
        return sync(next);
    }
    function checkpointOptions(days){return {7:[1,4,7],14:[1,4,7,10,14],30:[1,7,14,21,30]}[days] || [];}
    function change(d,field,value){
        var next=clone(d);
        if(['link','web'].includes(field) && Number.isSafeInteger(value) && value>=0 && value<=LIMIT)next.sources[field]=value;
        else if(field==='webQuery' && typeof value==='string' && value.length<=200)next.web.query=value;
        else if(field==='retention' && [7,14,30].includes(value))next.retention={days:value,checkpoints:checkpointOptions(value).slice()};
        else if(field==='checkpoint'){
            var days=next.retention.checkpoints;if(value===1 || !checkpointOptions(next.retention.days).includes(value))return d;
            if(days.includes(value)){if(days.length<=2)return d;days.splice(days.indexOf(value),1);}else days.push(value);days.sort(function(a,b){return a-b;});
        }else if(field==='activity'){next.activity.enabled=!!value;if(!value)next.activity.screenshot=false;}
        else if(field==='screenshot' && next.activity.enabled)next.activity.screenshot=!!value;
        else if(field==='reviews')next.reviews.enabled=!!value;
        else if(field==='daily' && Number.isSafeInteger(value) && value>=1 && value<=500)next.pacing.dailyInstalls=value;
        else if(field==='ramp')next.pacing.rampUp=!!value;
        else if(field==='wallet')next.billing.allowWalletFallback=!!value;
        else return d;
        return sync(next);
    }
    function addKeyword(d,value){
        var phrase=LiveCampaignKeywords.clean(value);
        if(!phrase || phrase.length>80 || /[\p{Cc}]/u.test(phrase) || d.keywords.length>=MAX_KEYWORDS || d.keywords.some(function(k){return LiveCampaignKeywords.identity(k.keyword)===LiveCampaignKeywords.identity(phrase);}))return d;
        var next=clone(d);next.keywords.push({id:'k'+next.nextKeywordId++,keyword:phrase,installs:1,position:'',screenshot:null});return sync(next);
    }
    function keyword(d,id,field,value){
        if(!d.keywords.some(function(k){return k.id===id;}))return d;
        var next=clone(d),row=next.keywords.find(function(k){return k.id===id;});
        if(field==='remove')next.keywords=next.keywords.filter(function(k){return k.id!==id;});
        else if(field==='installs' && Number.isSafeInteger(value) && value>=1 && value<=LIMIT)row.installs=value;
        else if(field==='position' && typeof value==='string' && value.length<=80)row.position=value;
        else return d;
        return sync(next);
    }
    function media(d,key,value){
        var next=clone(d);if(key==='web')next.web.screenshot=value;
        else {var row=next.keywords.find(function(k){return 'keyword:'+k.id===key;});if(!row)return d;row.screenshot=value;}
        return next;
    }
    function quote(d){
        var c=counts(d),installs=total(d),unit=(d.retention.checkpoints.length-1)*10,days=Math.ceil(installs/d.pacing.dailyInstalls);
        var channels=['link','web','keywords'].map(function(k){return {key:k,count:c[k],percent:installs?c[k]*100/installs:0};});
        return {available:!!d.strategy && installs>0,checkpointUnit:10,perInstall:unit,dailyCommitment:Math.min(d.pacing.dailyInstalls,installs)*unit,totalCommitment:installs*unit,installs:installs,acquisitionDays:days,
            channels:channels,concentrated:channels.some(function(r){return r.percent>=80;}),completionDays:days?days+d.retention.days-1:0};
    }
    function valid(d,step){return !!d.strategy && (step===1 || total(d)>0 && (!d.sources.web || !!d.web.query.trim()));}
    window.LiveCampaignDraft={create:create,applyStrategy:applyStrategy,change:change,quote:quote,valid:valid,checkpointOptions:checkpointOptions,counts:counts,addKeyword:addKeyword,keyword:keyword,media:media,limit:LIMIT,maxKeywords:MAX_KEYWORDS};
})();
