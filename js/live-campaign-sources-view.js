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
        var remaining=d;if(d.volume.limit_mode==='budget'){remaining=JSON.parse(JSON.stringify(d));remaining.volume.totalInstalls=0;}else if(ctx.editing){remaining=JSON.parse(JSON.stringify(d));remaining.volume.totalInstalls=Math.max(0,d.volume.totalInstalls-(ctx.confirmedInstalls||0));}
        var q=LiveCampaignTraffic.mix(remaining,ctx.sourceBaseline);
        return '<section class="lcw-panel lcw-balance lcw-forecast"><div class="lcw-mix-caption"><strong>'+e(t(d.volume.limit_mode==='budget'?'lbMixCurrent':ctx.sourceBaseline?'lcwAfter':'lcwCampaignMix'))+'</strong><span>'+e(t('lcwInstalls',{n:n(q.total)}))+'</span></div><div class="lcw-mix-bar">'+q.channels.filter(function(c){return c.count>0;}).map(function(c){return '<i class="is-'+c.key+'" style="width:'+c.percent+'%"></i>';}).join('')+'</div><div class="lcw-mix-legend">'+q.channels.filter(function(c){return c.key!=='unknown'||c.count>0;}).map(function(c){return '<span><i class="is-'+c.key+'"></i>'+({link:'🔗',web:'🌐',keywords:'🔍',unknown:'?'}[c.key])+' '+n(c.percent)+'%</span>';}).join('')+'</div><p class="lcw-mix-status is-'+q.status+'">'+e(t(q.dominant?'lcwConcentrated':q.status==='balanced'?'lcwBalanced':'lcwUncertain'))+'</p></section>';
    }
    function picker(d,ctx){
        var m=ctx.market || {},url='';try{var parsed=new URL(m.icon);if(parsed.protocol==='https:' && (parsed.hostname==='googleusercontent.com'||parsed.hostname.endsWith('.googleusercontent.com')))url=parsed.href;}catch(_){}
        var ideas=LiveCampaignKeywords.suggest({title:m.title || d.appTitle,summary:m.summary,description:m.description});
        var full=d.keywords.length>=LiveCampaignDraft.maxKeywords;
        return '<div class="lcw-aso-panel" id="lcw-aso-picker">'+
            '<label class="gtw-label" for="lcw-manual-key">'+e(t('lcwManualKey'))+'</label><div class="gtw-input-wrapper bp-key-input"><input class="gtw-input" id="lcw-manual-key" maxlength="80" autocomplete="off" data-lcw-input="manualKey" value="'+e(ctx.manualKey || '')+'" placeholder="'+e(t('lcwKeyPlaceholder'))+'"'+(full?' disabled':'')+'><button type="button" class="bp-add-btn" data-lcw-action="add-key"'+(full?' disabled':'')+'>'+e(t('lcwAdd'))+'</button></div>'+
            (ideas.length?'<h4>'+e(t('lcwIdeas'))+'</h4><div class="lcw-chips lcw-ideas">'+ideas.map(function(phrase){var selected=d.keywords.some(function(k){return LiveCampaignKeywords.identity(k.keyword)===LiveCampaignKeywords.identity(phrase);});return '<button type="button" class="meta-chip lcw-chip '+(selected?'accent-blue':'')+'" data-lcw-action="suggestion" data-keyword-text="'+e(phrase)+'"'+(selected||full?' disabled':'')+'>'+(selected?'✓ ':'+ ')+e(phrase)+'</button>';}).join('')+'</div><p class="bp-sec-note">'+e(t('lcwIdeasHint'))+'</p>':'')+
            '<details class="lcw-passport-ref"><summary>'+e(t('lcwPassportHelp'))+'</summary><div class="lcw-listing">'+(url?'<img src="'+e(url)+'" alt="" referrerpolicy="no-referrer">':'<span aria-hidden="true">▧</span>')+'<div><strong>'+e(m.title || d.appTitle)+'</strong><small>'+e(m.genre || m.categories && m.categories.map(function(c){return c.name;}).filter(Boolean).join(' · ') || '')+'</small></div></div>'+
            (m.summary?'<p>'+e(m.summary)+'</p>':'')+(m.description?'<details class="lcw-description"'+(ctx.descriptionOpen?' open':'')+'><summary>'+e(t('lcwFullDescription'))+'</summary><p>'+e(m.description)+'</p></details>':'')+
            (!ctx.market?'<p class="gtw-helper-text">'+e(t(ctx.marketLoading?'lcwLoadingPassport':'lcwNoPassport'))+'</p>':'')+
            '</details>'+(ctx.marketError?button('retry-data',t('lcwRetry')):'')+'</div>';
    }
    function keyword(row){
        return '<article class="lcw-keyword" data-keyword-row="'+row.id+'"><header><strong>'+e(row.keyword)+(row.enabled===false?' · '+e(t('lceKeyPaused')):'')+(row.is_fallback?' <em class="bp-tag">🛟 '+e(t('kwReserveKey'))+'</em>':'')+'</strong><button type="button" class="bp-icon-btn" data-lcw-action="remove-key" data-keyword="'+row.id+'" aria-label="'+e(t('lcwRemoveKey',{name:row.keyword}))+'">×</button></header>'+
            '<label class="gtw-label" for="lcw-position-'+row.id+'">'+e(t('lcwPosition'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-position-'+row.id+'" maxlength="80" data-lcw-input="position" data-keyword="'+row.id+'" value="'+e(row.position)+'" placeholder="'+e(t('lcwPositionHint'))+'"></div>'+
            '<div class="ct-key-geo">'+button('key-geo','🌍 '+t('kwGeo'),'data-keyword="'+row.id+'"')+(row.geo_countries||[]).map(function(code){return button('key-geo-remove',code+' ×','data-keyword="'+row.id+'" data-country="'+code+'"');}).join('')+'<button type="button" class="meta-chip lcw-chip" data-lcw-action="key-fallback" data-keyword="'+row.id+'" aria-pressed="'+!!row.is_fallback+'">🛟 '+e(t('kwReserveKey'))+'</button></div>'+
            '<details class="bp-key-proof"'+(row.screenshot?' open':'')+'><summary>'+e(t(row.screenshot?'lcwReference':'lcwAttachImage'))+'</summary>'+screenshot('keyword:'+row.id,row.screenshot)+'</details>'+
            '<a class="lcw-search-link" href="https://play.google.com/store/search?c=apps&amp;q='+e(encodeURIComponent(row.keyword))+'" target="_blank" rel="noopener noreferrer">'+e(t('lcwCheckPlay'))+'</a></article>';
    }
    function webSettings(d){
        var brand=d.web.mode==='web_brand',query=brand?LiveCampaignDraft.brandQuery(d):d.web.query,view=LiveCampaignWizardView;
        return view.section('🌐 '+e(t('bpWebTitle')),view.segGroup(t('bpWebTitle'),[view.seg('webMode','web_brand',t('bpWebBrand')+' · '+t('bpFree'),brand),view.seg('webMode','web_custom',t('bpWebCustom')+' · '+t('bpPerInstall',{n:n(.15)}),!brand)])+
            '<label class="gtw-label" for="lcw-web-query">'+e(t('lcwBrowserQuery'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-web-query" maxlength="200" data-lcw-input="webQuery" value="'+e(query)+'"'+(brand?' readonly':'')+'></div>'+
            '<button type="button" class="bp-link-btn" data-lcw-action="web-search">'+e(t('growthCopyOpen'))+'</button>'+(brand?'':screenshot('web',d.web.screenshot)),'',' data-bp-web');
    }
    function tile(d,source,on){
        var icon={keywords:'🔍',web:'🌐',link:'🔗'}[source],name={keywords:'lcwKeywords',web:'lcwWeb',link:'lcwLink'}[source];
        return '<button type="button" class="bp-source-tile'+(on?' is-on':'')+'" data-lcw-field="allowedSource" data-value="'+source+'" aria-pressed="'+on+'"><span class="bp-source-icon" aria-hidden="true">'+icon+'</span>'+
            '<span class="bp-source-copy"><strong>'+e(t(name))+'</strong><small>'+e(t('bpSrcHint_'+source))+'</small></span><span class="bp-source-price">'+e(LiveCampaignWizardView.sourcePrice(d,source))+'</span><span class="bp-check" aria-hidden="true"></span></button>';
    }
    function body(d,ctx){
        var allowed=LiveCampaignDraft.allowed(d),view=LiveCampaignWizardView;
        var preferred=allowed.length>1&&!d.parentCampaignId?'<div class="bp-default"><span class="gtw-label">⭐ '+e(t('bpDefaultTrack'))+'</span>'+view.segGroup(t('bpDefaultTrack'),allowed.map(function(src){return view.seg('preferredSource',src,view.sourceLabel(d,src),d.source===src);}))+'<p class="bp-sec-note">'+e(t('bpDefaultTrackHint'))+'</p></div>':'';
        var keys=allowed.includes('keywords')?view.section('🔍 '+e(t('bpKeysTitle')),picker(d,ctx)+'<div class="lcw-keywords-list">'+d.keywords.map(keyword).join('')+'</div>',e(t('bpKeysCount',{n:d.keywords.length,max:LiveCampaignDraft.maxKeywords}))):'';
        return (ctx.editing?'<p class="bp-sec-note">'+e(t('lceFuture'))+'</p>':'')+
            view.section(e(t('bpSourcesTitle')),'<p class="bp-sec-lead">'+e(t('bpSourcesLead'))+'</p><div class="lcw-source-options">'+['keywords','web','link'].map(function(src){return tile(d,src,allowed.includes(src));}).join('')+'</div>'+preferred)+
            '<div data-lcw-balance>'+balance(d,ctx)+'</div>'+
            (allowed.includes('web')?webSettings(d):'')+keys+
            '<p class="lcw-input-error" data-lcw-validation role="status">'+e(!LiveCampaignDraft.valid(d,1)?t(allowed.includes('keywords')&&!d.keywords.length?'lcgNeedKey':'lcwQueryRequired'):'')+'</p>';
    }
    window.LiveCampaignSourcesView={body:body,balance:balance,screenshot:screenshot};
})();
