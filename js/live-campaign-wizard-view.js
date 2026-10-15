/* Rendering only; controls reuse project tiles, chips and closed-test wizard buttons. */
(function () {
    'use strict';
    function t(key, vars) { return window.t(key, vars || {}, window.lang === 'ru' ? 'ru' : 'en'); }
    function esc(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function num(value) { return Number(value).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', {maximumFractionDigits:1}); }
    function hint(key, cls) { return '<p class="gtw-helper-text '+(cls || '')+'">'+esc(t(key))+'</p>'; }
    function chip(field, value, label, selected, disabled) {
        return '<button type="button" class="meta-chip lcw-chip '+(selected?'accent-blue':'')+'" data-lcw-field="'+field+'" data-value="'+value+'" aria-pressed="'+!!selected+'"'+(disabled?' disabled':'')+'>'+esc(label)+'</button>';
    }
    function counter(field, value, label, min, max, step) {
        return '<div class="lcw-counter" role="group" aria-label="'+esc(label)+'">'+[-1,1].map(function (direction) {
            var next = Math.min(max, Math.max(min, value + direction * step));
            return '<button type="button" class="meta-chip lcw-chip" data-lcw-field="'+field+'" data-lcw-focus="'+field+':'+direction+'" data-value="'+next+'" aria-label="'+esc(t(direction<0?'lcwDecrease':'lcwIncrease',{name:label}))+'"'+(next===value?' disabled':'')+'>'+ (direction<0?'−':'+') +'</button>';
        }).join('<strong>'+esc(num(value))+'</strong>')+'</div>';
    }
    function toggle(field, label, on, disabled) {
        return '<button type="button" class="pc-project-param lcw-toggle" role="switch" aria-checked="'+!!on+'" data-lcw-field="'+field+'" data-lcw-focus="'+field+'" data-value="'+!on+'"'+(disabled?' disabled':'')+'><span>'+esc(t(label))+'</span><span class="meta-chip '+(on?'accent-blue':'')+'">'+esc(t(on?'pcParamsOn':'pcParamsOff'))+'</span></button>';
    }
    function strategies(d) {
        var known=d.baseline.available, rate=d.baseline.perDay;
        var baseline='<section class="lcw-baseline"><span>'+esc(t('lcwBaseline'))+'</span><strong>'+esc(t(known?'lcwBaselineValue':'lcwNoBaseline',{n:num(rate)}))+'</strong>'+hint('lcwBaselineHint')+(!known || rate===0?hint('lcwColdStart'):'')+'</section>';
        var cards=[['aso','lcwAso','lcwAsoText','↗'],['retention','lcwRetention','lcwRetentionText','◷'],['deep','lcwDeep','lcwDeepText','◎'],['custom','lcwCustom','lcwCustomText','⚙']].map(function(row) {
            var selected=d.strategy===row[0];
            return '<button type="button" class="pc-project-param lcw-strategy'+(selected?' is-selected':'')+'" data-lcw-strategy="'+row[0]+'" aria-pressed="'+selected+'" aria-label="'+esc(t('lcwSelect',{name:t(row[1])}))+'">'+
                '<span class="lcw-strategy-icon" aria-hidden="true">'+row[3]+'</span><span class="lcw-strategy-copy"><span class="lcw-strategy-heading"><strong>'+esc(t(row[1]))+'</strong>'+(row[0]==='aso'?'<span class="meta-chip accent-blue">'+esc(t('lcwRecommended'))+'</span>':'')+'</span><span class="lcw-strategy-description">'+esc(t(row[2]))+'</span>'+(row[0]==='aso'?'<small>'+esc(t(known && rate>0?'lcwAsoRate':'lcwStartRate'))+'</small>':'')+'</span><span class="lcw-selected" aria-hidden="true">'+(selected?'✓':'')+'</span></button>';
        }).join('');
        return hint('lcwIntro')+baseline+'<div class="lcw-strategies">'+cards+'</div>'+hint('lcwSmooth')+
            (d.strategy?'<div class="lcw-pace-preview">'+esc(t('lcwRatePreview',{extra:num(d.pacing.dailyInstalls),total:known?num(rate+d.pacing.dailyInstalls):'—'}))+hint('lcwRounding')+'</div>':'');
    }
    function sources(d) {
        var q=LiveCampaignDraft.quote(d), names={link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords'};
        return hint('lcwSourcesHint')+'<div class="lcw-panels">'+q.channels.map(function(c){
            return '<section class="lcw-panel lcw-source"><div><strong>'+esc(t(names[c.key]))+'</strong><small>'+esc(t('lcwChannelVolume',{count:num(c.count),percent:num(c.percent)}))+'</small></div>'+counter(c.key,d.sources[c.key],t('lcwWeight',{name:t(names[c.key])}),0,100,10)+'</section>';
        }).join('')+'</div>'+(!q.available?hint('lcwNoSources','error'):q.concentrated?hint('lcwConcentrated','lcw-warning'):'');
    }
    function retention(d) {
        return '<section class="lcw-panel"><h3>'+esc(t('lcwRetentionLabel'))+'</h3><div class="lcw-chips">'+[7,14,30].map(function(n){return chip('retention',n,t('lcwDays',{n:n}),d.retention.days===n);}).join('')+'</div></section>'+
            '<section class="lcw-panel"><h3>'+esc(t('lcwCheckpoints'))+'</h3><div class="lcw-chips">'+LiveCampaignDraft.checkpointOptions(d.retention.days).map(function(n){return chip('checkpoint',n,t(n===1?'lcwD1':'lcwDay',{n:n}),d.retention.checkpoints.includes(n),n===1);}).join('')+'</div>'+hint('lcwCheckpointHint')+'</section>';
    }
    function scenarios(d) {
        return '<div class="lcw-panels">'+toggle('activity','lcwActivity',d.activity.enabled)+toggle('screenshot','lcwScreenshot',d.activity.screenshot,!d.activity.enabled)+toggle('reviews','lcwReviews',d.reviews.enabled)+'</div>'+hint('requestReviewsHint')+hint('lcwSoft')+
            (d.reviews.enabled?'<span class="meta-chip accent-blue">'+esc(t('lcwReviewLater'))+'</span>':'');
    }
    function budget(d) {
        var q=LiveCampaignDraft.quote(d);
        return '<section class="lcw-panel lcw-source"><strong>'+esc(t('lcwDaily'))+'</strong>'+counter('daily',d.pacing.dailyInstalls,t('lcwDaily'),1,500,1)+'</section>'+
            '<section class="lcw-panel"><h3>'+esc(t('lcwDuration'))+'</h3><div class="lcw-chips">'+[7,14,30].map(function(n){return chip('duration',n,t('lcwDays',{n:n}),d.pacing.acquisitionDays===n);}).join('')+'</div></section>'+
            toggle('ramp','lcwRamp',d.pacing.rampUp)+hint('lcwRampHint')+toggle('wallet','lcwWallet',d.billing.allowWalletFallback)+hint('lcwWalletHint')+
            '<section class="lcw-panel lcw-plan"><h3>'+esc(t('lcwSummary'))+'</h3><strong>'+esc(t('lcwInstalls',{n:num(q.installs)}))+'</strong><p>'+esc(t('lcwTotal',{n:num(q.totalCommitment)}))+'</p>'+hint('lcwEstimateHint')+'<p class="gtw-helper-text">'+esc(t('lcwFinish',{n:q.completionDays}))+'</p></section>'+
            '<p class="lcw-stage-notice" id="lcw-launch-hint">'+esc(t('lcwLaunchLater'))+'</p>';
    }
    function body(d, step) {
        return (step>1?'<span class="meta-chip">'+esc(t('lcwDraftStep'))+'</span>':'')+'<h2 id="lcw-step-title" tabindex="-1">'+esc(t('lcwStep'+step))+'</h2>'+(step>1?hint('lcwSkeleton'):'')+ [null,strategies,sources,retention,scenarios,budget][step](d);
    }
    function footer(d, step) {
        var q=LiveCampaignDraft.quote(d);
        return '<div class="lcw-estimate" aria-live="polite" aria-atomic="true"><div><span>'+esc(t('lcwEstimate'))+'</span><strong data-lcw-daily>'+(q.available?esc(num(q.dailyCommitment))+' <small>$BUST</small>':'—')+'</strong></div><div><span>'+esc(q.available?t('lcwInstalls',{n:num(q.installs)}):t('lcwChoose'))+'</span><strong class="lcw-total" data-lcw-total>'+(q.available?esc(num(q.totalCommitment))+' <small>$BUST</small>':'—')+'</strong></div></div>'+
            '<p class="lcw-footer-note">'+esc(t('lcwStageNotice'))+'</p><div class="lcw-nav">'+
            (step>1?'<button type="button" class="gtw-modal-cancel-btn" data-lcw-action="back">'+esc(t('lcwBack'))+'</button>':'')+
            '<button type="button" class="gtw-continue-btn" data-lcw-action="next"'+(!LiveCampaignDraft.valid(d,step) || step===5?' disabled':'')+(step===5?' aria-describedby="lcw-launch-hint"':'')+'>'+esc(t(step===5?'lcwLaunch':'lcwNext'))+'</button></div>';
    }
    window.LiveCampaignWizardView={body:body,footer:footer,text:t};
})();
