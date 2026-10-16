/* Deterministic local ideas from the saved listing. No ranking or search-volume claims. */
(function () {
    'use strict';
    var stop = new Set(('и в во на по за из к ко с со у о об от до для без при про или а но не ни это как что чтобы мы вы ваш наша наше наши они он она оно все всё еще уже где когда если чем так тут этот эта эти того его ее также можно приложение приложения app application the a an and or of to for in on at by with without from is are be it its your you we our this that these those as all more best free download install new use using can get have has will into about').split(/\s+/));
    function clean(value) { return String(value || '').normalize('NFKC').trim().replace(/\s+/g,' '); }
    function identity(value) { return clean(value).toLocaleLowerCase().replace(/ё/g,'е'); }
    function text(value) { return String(value || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt|#\d+);/gi,' '); }
    function suggest(market) {
        var scores=new Map();
        [[market.title,30],[market.summary,12],[market.description,1]].forEach(function(part){
            text(part[0]).slice(0,18000).split(/[.!?;:\n]+/).forEach(function(sentence){
                var tokens=(sentence.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu)||[]),run=[];
                tokens.forEach(function(word){
                    if(word.length<2 || stop.has(word) || /^\d+$/.test(word)){run=[];return;}
                    run.push(word);if(run.length>3)run.shift();
                    for(var n=1;n<=run.length;n++){
                        var phrase=run.slice(-n).join(' ');if(phrase.length>80)continue;
                        scores.set(phrase,(scores.get(phrase)||0)+part[1]*(n===1?1:n===2?1.45:1.25));
                    }
                });
            });
        });
        return Array.from(scores).sort(function(a,b){return b[1]-a[1] || a[0].localeCompare(b[0]);}).slice(0,30).map(function(row){return row[0];});
    }
    window.LiveCampaignKeywords={clean:clean,identity:identity,suggest:suggest};
})();
