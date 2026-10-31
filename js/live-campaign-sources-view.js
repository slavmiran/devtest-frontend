/* Allowed traffic sources. Listing/manual strings are escaped; links use fixed hosts. */
(function () {
    'use strict';
    function t(k,v){return LiveCampaignWizardView.text(k,v);}
    function e(v){return window.escapeHTML(String(v==null?'':v));}
    function n(v){return LiveCampaignWizardView.number(v);}
    function button(action,label,extra){return '<button type="button" class="meta-chip lcw-chip" data-lcw-action="'+action+'" '+(extra || '')+'>'+e(label)+'</button>';}
    function screenshot(key,media){
        return '<div class="lcw-attachment">'+(media?'<figure><img src="'+e(media.url)+'" alt="'+e(t('lcwReference'))+'"><figcaption>'+e(media.name)+'</figcaption></figure>'+button('remove-media',t('lcwRemoveImage'),'data-asset="'+key+'"'):'')+
            button('attach',t(media?'lcwReplaceImage':'lcwAttachImage'),'data-asset="'+key+'"')+
            '<input type="file" hidden accept="image/png,image/jpeg,image/webp" data-lcw-file="'+key+'"><small>'+e(t('lcwImageHint'))+'</small></div>';
    }
    function balance(d,ctx){
        var remaining=d;if(ctx.editing){remaining=JSON.parse(JSON.stringify(d));remaining.volume.totalInstalls=Math.max(0,d.volume.totalInstalls-(ctx.confirmedInstalls||0));}
        var q=LiveCampaignTraffic.mix(remaining,ctx.sourceBaseline);
        return '<section class="lcw-panel lcw-balance lcw-forecast"><div class="lcw-mix-caption"><strong>'+e(t(ctx.sourceBaseline?'lcwAfter':'lcwCampaignMix'))+'</strong><span>'+e(t('lcwInstalls',{n:n(q.total)}))+'</span></div><div class="lcw-mix-bar">'+q.channels.filter(function(c){return c.count>0;}).map(function(c){return '<i class="is-'+c.key+'" style="width:'+c.percent+'%"></i>';}).join('')+'</div><div class="lcw-mix-legend">'+q.channels.filter(function(c){return c.key!=='unknown'||c.count>0;}).map(function(c){return '<span>'+({link:'🔗',web:'🌐',keywords:'🔍',unknown:'?'}[c.key])+' '+n(c.percent)+'%</span>';}).join('')+'</div><p class="lcw-mix-status is-'+q.status+'">'+e(t(q.dominant?'lcwConcentrated':q.status==='balanced'?'lcwBalanced':'lcwUncertain'))+'</p></section>';
    }
    function picker(d,ctx){
        var m=ctx.market || {},url='';try{var parsed=new URL(m.icon);if(parsed.protocol==='https:' && (parsed.hostname==='googleusercontent.com'||parsed.hostname.endsWith('.googleusercontent.com')))url=parsed.href;}catch(_){}
        var ideas=LiveCampaignKeywords.suggest({title:m.title || d.appTitle,summary:m.summary,description:m.description});
        return '<section class="lcw-aso-panel" id="lcw-aso-picker"'+(ctx.asoOpen?'':' hidden')+'><details class="lcw-passport-ref"><summary>'+e(t('lcwPassportHelp'))+'</summary><div class="lcw-listing">'+(url?'<img src="'+e(url)+'" alt="" referrerpolicy="no-referrer">':'<span aria-hidden="true">▧</span>')+'<div><strong>'+e(m.title || d.appTitle)+'</strong><small>'+e(m.genre || m.categories && m.categories.map(function(c){return c.name;}).filter(Boolean).join(' · ') || '')+'</small></div></div>'+
            (m.summary?'<p>'+e(m.summary)+'</p>':'')+(m.description?'<details class="lcw-description"'+(ctx.descriptionOpen?' open':'')+'><summary>'+e(t('lcwFullDescription'))+'</summary><p>'+e(m.description)+'</p></details>':'')+
            (!ctx.market?'<p class="gtw-helper-text">'+e(t(ctx.marketLoading?'lcwLoadingPassport':'lcwNoPassport'))+'</p>':'')+
            '</details>'+(ctx.marketError?button('retry-data',t('lcwRetry')):'')+'<h4>'+e(t('lcwIdeas'))+'</h4><p class="gtw-helper-text">'+e(t('lcwIdeasHint'))+'</p><div class="lcw-chips lcw-ideas">'+ideas.map(function(phrase){var selected=d.keywords.some(function(k){return LiveCampaignKeywords.identity(k.keyword)===LiveCampaignKeywords.identity(phrase);});return '<button type="button" class="meta-chip lcw-chip '+(selected?'accent-blue':'')+'" data-lcw-action="suggestion" data-keyword-text="'+e(phrase)+'"'+(selected?' disabled':'')+'>'+e(phrase)+'</button>';}).join('')+'</div>'+
            '<label class="gtw-label" for="lcw-manual-key">'+e(t('lcwManualKey'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-manual-key" maxlength="80" autocomplete="off" data-lcw-input="manualKey" value="'+e(ctx.manualKey || '')+'" placeholder="'+e(t('lcwKeyPlaceholder'))+'">'+button('add-key',t('lcwAdd'))+'</div></section>';
    }
    function keyword(row){
        return '<article class="lcw-keyword" data-keyword-row="'+row.id+'"><header><strong>'+e(row.keyword)+(row.enabled===false?' · '+e(t('lceKeyPaused')):'')+'</strong>'+button('remove-key','×','data-keyword="'+row.id+'" aria-label="'+e(t('lcwRemoveKey',{name:row.keyword}))+'"')+'</header>'+
            '<a class="lcw-search-link" href="https://play.google.com/store/search?c=apps&amp;q='+e(encodeURIComponent(row.keyword))+'" target="_blank" rel="noopener noreferrer">'+e(t('lcwCheckPlay'))+'</a>'+
            '<label class="gtw-label" for="lcw-position-'+row.id+'">'+e(t('lcwPosition'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-position-'+row.id+'" maxlength="80" data-lcw-input="position" data-keyword="'+row.id+'" value="'+e(row.position)+'" placeholder="'+e(t('lcwPositionHint'))+'"></div>'+screenshot('keyword:'+row.id,row.screenshot)+'<div class="ct-key-geo">'+button('key-geo',t('kwGeo'),'data-keyword="'+row.id+'"')+(row.geo_countries||[]).map(function(code){return button('key-geo-remove',code+' ×','data-keyword="'+row.id+'" data-country="'+code+'"');}).join('')+'<button type="button" class="meta-chip" data-lcw-action="key-fallback" data-keyword="'+row.id+'" aria-pressed="'+!!row.is_fallback+'">🛟 '+e(t('kwReserveKey'))+'</button></div></article>';
    }
    function body(d,ctx){
        var selected=d.source,allowed=LiveCampaignDraft.allowed(d);
        return (ctx.editing?'<p class="gtw-helper-text">'+e(t('lceFuture'))+'</p>':'')+'<p class="gtw-helper-text">'+e(t('ldSourcesHint'))+'</p>'+'<div data-lcw-balance>'+balance(d,ctx)+'</div><div class="lcw-source-options">'+[['keywords','🔍','lcwKeywords'],['web','🌐','lcwWeb'],['link','🔗','lcwLink']].map(function(row){return '<button type="button" class="pc-project-param '+(allowed.includes(row[0])?'is-selected':'')+'" data-lcw-field="allowedSource" data-value="'+row[0]+'" aria-pressed="'+(allowed.includes(row[0]))+'"'+'>'+row[1]+' '+e(t(row[2]))+'</button>';}).join('')+'</div>'+
            (allowed.includes('link')?'<section class="lcw-panel"><p>'+e(t('lcwLinkHint'))+'</p></section>':'')+(allowed.includes('web')?'<section class="lcw-panel lcw-web-settings"><label class="gtw-label" for="lcw-web-query">'+e(t('lcwBrowserQuery'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-web-query" maxlength="200" data-lcw-input="webQuery" value="'+e(d.web.query)+'">'+button('copy-query',t('lcwCopy'))+'</div>'+button('web-search',t('lcgOpenBrowser'))+screenshot('web',d.web.screenshot)+'</section>':'')+(allowed.includes('keywords')?'<section class="lcw-panel">'+picker(d,Object.assign({},ctx,{asoOpen:true}))+'<div class="lcw-keywords-list">'+d.keywords.map(keyword).join('')+'</div></section>':'')+(d.contracts&&d.contracts.enabled?'':'<section class="lcw-panel"><h3>⭐ '+e(t('ldPreferredSource'))+'</h3><div class="lcw-chips">'+allowed.map(function(src){return '<button type="button" class="meta-chip" data-lcw-field="preferredSource" data-value="'+src+'" aria-pressed="'+(src===selected)+'">'+e(t({link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords'}[src]))+'</button>';}).join('')+'</div></section>')+
            '<p class="lcw-input-error" data-lcw-validation role="status">'+e(!LiveCampaignDraft.valid(d,1)?t(allowed.includes('keywords')&&!d.keywords.length?'lcgNeedKey':'lcwQueryRequired'):'')+'</p>'+LiveCampaignGeo.body(d,ctx);
    }
    window.LiveCampaignSourcesView={body:body,balance:balance};
})();
