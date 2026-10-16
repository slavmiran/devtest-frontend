/* Step 2 presentation. All listing/manual strings are escaped; links use fixed hosts. */
(function () {
    'use strict';
    function t(k,v){return LiveCampaignWizardView.text(k,v);}
    function e(v){return window.escapeHTML(String(v==null?'':v));}
    function n(v){return LiveCampaignWizardView.number(v);}
    var labels={link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords',unknown:'lcwUnknown'};
    function button(action,label,extra){return '<button type="button" class="meta-chip lcw-chip" data-lcw-action="'+action+'" '+(extra || '')+'>'+e(label)+'</button>';}
    function counter(field,value,label,min,id){
        var attrs=id?' data-keyword="'+e(id)+'"':'';
        return '<div class="lcw-counter lcw-counter--input" role="group" aria-label="'+e(label)+'">'+
            '<button type="button" class="meta-chip lcw-chip" data-lcw-field="'+field+'" data-value="'+(value-1)+'"'+attrs+' data-lcw-focus="'+field+':'+(id || '')+':minus" aria-label="'+e(t('lcwDecrease',{name:label}))+'"'+(value<=min?' disabled':'')+'>−</button>'+
            '<input class="gtw-input lcw-quantity" type="number" inputmode="numeric" min="'+min+'" max="'+LiveCampaignDraft.limit+'" step="1" value="'+value+'" data-lcw-input="'+field+'"'+attrs+' aria-label="'+e(label)+'">'+
            '<button type="button" class="meta-chip lcw-chip" data-lcw-field="'+field+'" data-value="'+(value+1)+'"'+attrs+' data-lcw-focus="'+field+':'+(id || '')+':plus" aria-label="'+e(t('lcwIncrease',{name:label}))+'"'+(value>=LiveCampaignDraft.limit?' disabled':'')+'>+</button></div>';
    }
    function screenshot(key,media){
        return '<div class="lcw-attachment">'+(media?'<figure><img src="'+e(media.url)+'" alt="'+e(t('lcwReference'))+'"><figcaption>'+e(media.name)+'</figcaption></figure>'+button('remove-media',t('lcwRemoveImage'),'data-asset="'+key+'"'):'')+
            button('attach',t(media?'lcwReplaceImage':'lcwAttachImage'),'data-asset="'+key+'"')+
            '<input type="file" hidden accept="image/png,image/jpeg,image/webp" data-lcw-file="'+key+'"><small>'+e(t('lcwImageHint'))+'</small></div>';
    }
    function distribution(counts,total){
        return ['link','web','keywords','unknown'].filter(function(k){return k!=='unknown' || counts[k]>0;}).map(function(k){return t(labels[k])+' '+n(total?(counts[k] || 0)*100/total:0)+'%';}).join(' · ');
    }
    function balance(d,ctx){
        var base=ctx.sourceBaseline,q=LiveCampaignTraffic.mix(d,base),counts=base && base.counts;
        var stack=q.channels.filter(function(c){return c.count>0;}).map(function(c){return '<i class="is-'+c.key+'" style="width:'+c.percent+'%"></i>';}).join('');
        return '<section class="lcw-panel lcw-balance"><h3>'+e(t('lcwBalance'))+'</h3><p data-lcw-existing>'+e(base?t('lcwCurrentMix',{n:n(base.total)}):t(ctx.sourcesLoading?'lcwLoadingSources':'lcwNoSourceBase'))+'</p>'+
            (base?'<small>'+e(distribution(counts,base.total))+'</small>':'')+'<div class="lcw-mix-caption"><strong>'+e(t(base && base.total?'lcwAfter':'lcwCampaignMix'))+'</strong><span>'+e(t('lcwInstalls',{n:n(q.total)}))+'</span></div>'+
            '<div class="lcw-mix-bar" aria-hidden="true">'+stack+'</div><div class="lcw-mix-legend">'+q.channels.filter(function(c){return c.key!=='unknown' || c.count>0;}).map(function(c){return '<span><i class="is-'+c.key+'"></i>'+e(t(labels[c.key]))+' '+e(n(c.percent))+'%</span>';}).join('')+'</div>'+
            '<p class="lcw-mix-status is-'+q.status+'" role="status">'+e(t({warning:'lcwConcentrated',balanced:'lcwBalanced',uncertain:'lcwUncertain',empty:'lcwNoSources'}[q.status]))+'</p>'+
            (ctx.sourcesError?button('retry-data',t('lcwRetry')):'')+'</section>';
    }
    function picker(d,ctx){
        var m=ctx.market || {},url='';try{var parsed=new URL(m.icon);if(parsed.protocol==='https:' && (parsed.hostname==='googleusercontent.com'||parsed.hostname.endsWith('.googleusercontent.com')))url=parsed.href;}catch(_){}
        var ideas=LiveCampaignKeywords.suggest({title:m.title || d.appTitle,summary:m.summary,description:m.description});
        return '<section class="lcw-aso-panel" id="lcw-aso-picker"'+(ctx.asoOpen?'':' hidden')+'><h4>'+e(t('lcwPassportHelp'))+'</h4><div class="lcw-listing">'+(url?'<img src="'+e(url)+'" alt="" referrerpolicy="no-referrer">':'<span aria-hidden="true">▧</span>')+'<div><strong>'+e(m.title || d.appTitle)+'</strong><small>'+e(m.genre || m.categories && m.categories.map(function(c){return c.name;}).filter(Boolean).join(' · ') || '')+'</small></div></div>'+
            (m.summary?'<p>'+e(m.summary)+'</p>':'')+(m.description?'<details class="lcw-description"'+(ctx.descriptionOpen?' open':'')+'><summary>'+e(t('lcwFullDescription'))+'</summary><p>'+e(m.description)+'</p></details>':'')+
            (!ctx.market?'<p class="gtw-helper-text">'+e(t(ctx.marketLoading?'lcwLoadingPassport':'lcwNoPassport'))+'</p>':'')+
            (ctx.marketError?button('retry-data',t('lcwRetry')):'')+'<h4>'+e(t('lcwIdeas'))+'</h4><p class="gtw-helper-text">'+e(t('lcwIdeasHint'))+'</p><div class="lcw-chips lcw-ideas">'+ideas.map(function(phrase){var selected=d.keywords.some(function(k){return LiveCampaignKeywords.identity(k.keyword)===LiveCampaignKeywords.identity(phrase);});return '<button type="button" class="meta-chip lcw-chip '+(selected?'accent-blue':'')+'" data-lcw-action="suggestion" data-keyword-text="'+e(phrase)+'"'+(selected?' disabled':'')+'>'+e(phrase)+'</button>';}).join('')+'</div>'+
            '<label class="gtw-label" for="lcw-manual-key">'+e(t('lcwManualKey'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-manual-key" maxlength="80" autocomplete="off" data-lcw-input="manualKey" value="'+e(ctx.manualKey || '')+'" placeholder="'+e(t('lcwKeyPlaceholder'))+'">'+button('add-key',t('lcwAdd'))+'</div></section>';
    }
    function keyword(row){
        return '<article class="lcw-keyword" data-keyword-row="'+row.id+'"><header><strong>'+e(row.keyword)+'</strong>'+button('remove-key','×','data-keyword="'+row.id+'" aria-label="'+e(t('lcwRemoveKey',{name:row.keyword}))+'"')+'</header>'+counter('keywordInstalls',row.installs,t('lcwKeywordInstalls',{name:row.keyword}),1,row.id)+
            '<a class="lcw-search-link" href="https://play.google.com/store/search?c=apps&amp;q='+e(encodeURIComponent(row.keyword))+'" target="_blank" rel="noopener noreferrer">'+e(t('lcwCheckPlay'))+'</a>'+
            '<label class="gtw-label" for="lcw-position-'+row.id+'">'+e(t('lcwPosition'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-position-'+row.id+'" maxlength="80" data-lcw-input="position" data-keyword="'+row.id+'" value="'+e(row.position)+'" placeholder="'+e(t('lcwPositionHint'))+'"></div>'+screenshot('keyword:'+row.id,row.screenshot)+'</article>';
    }
    function body(d,ctx){
        var c=LiveCampaignDraft.counts(d);
        return '<div data-lcw-balance>'+balance(d,ctx)+'</div><section class="lcw-panel"><div class="lcw-source"><div><h3>🔗 '+e(t('lcwLink'))+'</h3></div>'+counter('link',c.link,t('lcwLink'),0)+'</div><p class="gtw-helper-text">'+e(t('lcwLinkHint'))+'</p></section>'+
            '<section class="lcw-panel"><div class="lcw-source"><h3>🌐 '+e(t('lcwWeb'))+'</h3>'+counter('web',c.web,t('lcwWeb'),0)+'</div><div class="lcw-web-settings"'+(c.web>0?'':' hidden')+'><label class="gtw-label" for="lcw-web-query">'+e(t('lcwBrowserQuery'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-web-query" maxlength="200" data-lcw-input="webQuery" value="'+e(d.web.query)+'">'+button('copy-query',t('lcwCopy'))+'</div>'+(!d.web.query.trim()?'<p class="lcw-input-error">'+e(t('lcwQueryRequired'))+'</p>':'')+screenshot('web',d.web.screenshot)+'</div></section>'+
            '<section class="lcw-panel"><div class="lcw-source"><h3>🔍 '+e(t('lcwKeywords'))+'</h3><strong data-lcw-keyword-total>'+e(t('lcwInstalls',{n:n(c.keywords)}))+'</strong></div>'+button('aso',t('lcwPickKeys'),'aria-expanded="'+!!ctx.asoOpen+'" aria-controls="lcw-aso-picker"')+picker(d,ctx)+'<div class="lcw-keywords-list">'+d.keywords.map(keyword).join('')+'</div></section>'+
            '<p class="lcw-input-error" data-lcw-validation role="status">'+e(!LiveCampaignDraft.quote(d).installs?t('lcwNoSources'):c.web && !d.web.query.trim()?t('lcwQueryRequired'):'')+'</p>';
    }
    window.LiveCampaignSourcesView={body:body,balance:balance};
})();
