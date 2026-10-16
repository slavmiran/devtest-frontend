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
            toggle('ramp','lcwRamp',d.pacing.rampUp)+hint('lcwPaceHint')+toggle('wallet','lcwWallet',d.billing.allowWalletFallback)+hint('lcwWalletHint')+
            '<section class="lcw-panel lcw-plan"><h3>'+esc(t('lcwSummary'))+'</h3><strong>'+esc(t('lcwInstalls',{n:num(q.installs)}))+'</strong><p>'+esc(t('lcwTotal',{n:num(q.totalCommitment)}))+'</p><p>'+esc(t('lcwCostDuration',{acquisition:q.acquisitionDays,retention:d.retention.days}))+'</p>'+hint('lcwEstimateHint')+'<p class="gtw-helper-text">'+esc(t('lcwFinish',{n:q.completionDays}))+'</p></section>'+
            '<p class="lcw-stage-notice" id="lcw-launch-hint">'+esc(t('lcwLaunchLater'))+'</p>';
    }
    function body(d, step, context) {
        return step===2?LiveCampaignSourcesView.body(d,context):[null,strategies,null,retention,scenarios,budget][step](d);
    }
    function summary(d,step){
        var q=LiveCampaignDraft.quote(d),c=LiveCampaignDraft.counts(d);
        if(step===1)return d.strategy?t({aso:'lcwAso',retention:'lcwRetention',deep:'lcwDeep',custom:'lcwCustom'}[d.strategy]):t('lcwChoose');
        if(step===2)return t('lcwSourceSummary',{n:num(q.installs),link:num(q.channels[0].percent),web:num(q.channels[1].percent),keys:num(q.channels[2].percent)});
        if(step===3)return t('lcwRetentionSummary',{n:d.retention.days,days:d.retention.checkpoints.join('/')});
        if(step===4)return t('lcwActivitySummary',{scenario:t(d.activity.enabled?'pcParamsOn':'pcParamsOff'),reviews:t(d.reviews.enabled?'pcParamsOn':'pcParamsOff')});
        return t('lcwPaceSummary',{n:num(d.pacing.dailyInstalls),days:q.acquisitionDays});
    }
    function header(d,step,unlocked){
        return '<button type="button" class="lcw-heading" data-lcw-action="outline" aria-expanded="false" aria-controls="lcw-outline"><span id="lcw-title">'+esc(t('lcwStep',{n:step}))+' · '+esc(t('lcwStep'+step))+' ▾</span><span class="gtw-progress-bar" aria-hidden="true">'+[1,2,3,4,5].map(function(i){return '<i class="gtw-progress-step'+(i<=step?' active':'')+'"></i>';}).join('')+'</span></button>'+
            '<nav class="lcw-outline" id="lcw-outline" aria-label="'+esc(t('lcwContents'))+'" hidden>'+[1,2,3,4,5].map(function(i){return '<button type="button" data-lcw-action="step" data-step="'+i+'"'+(i>unlocked?' disabled':'')+(i===step?' aria-current="step"':'')+'><b>'+i+'</b><span><strong>'+esc(t('lcwStep'+i))+'</strong><small>'+esc(i<=unlocked?summary(d,i):t('lcwStepLocked'))+'</small></span></button>';}).join('')+'</nav>';
    }
    function footer(d,step,expanded){
        var q=LiveCampaignDraft.quote(d),short=function(value){return Number(value).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{notation:value>=10000?'compact':'standard',maximumFractionDigits:1});};
        return '<button type="button" class="lcw-estimate-line" data-lcw-action="estimate" aria-expanded="'+!!expanded+'" aria-controls="lcw-cost-details" aria-label="'+esc(t('lcwCostDetails'))+'"><span>⚡ <b data-lcw-installs>'+esc(short(q.installs))+'</b> '+esc(t('lcwInstallUnit'))+' · ~<b data-lcw-daily>'+esc(short(q.dailyCommitment))+'</b> '+esc(t('lcwBustDay'))+' · '+esc(t('lcwTotalLabel'))+' <b data-lcw-total>'+esc(short(q.totalCommitment))+'</b> $BUST</span><span class="lcw-details-label">'+esc(t('lcwDetails'))+' '+(expanded?'▾':'▴')+'</span></button>'+
            '<section class="lcw-cost-details" id="lcw-cost-details"'+(expanded?'':' hidden')+'><h3>'+esc(t('lcwCostDetails'))+'</h3><p>'+esc(t('lcwCostCheckpoint',{days:d.retention.checkpoints.length-1,unit:q.checkpointUnit,price:num(q.perInstall)}))+'</p><p>'+esc(t('lcwCostDuration',{acquisition:q.acquisitionDays,retention:d.retention.days}))+'</p><p>'+esc(t('lcwTotal',{n:num(q.totalCommitment)}))+'</p><small>'+esc(t('lcwEstimateHint'))+'</small></section>'+
            '<div class="lcw-nav"><button type="button" class="gtw-continue-btn" data-lcw-action="next"'+(!LiveCampaignDraft.valid(d,step) || step===5?' disabled':'')+(step===5?' aria-describedby="lcw-launch-hint"':'')+'>'+esc(t(step===5?'lcwLaunch':'lcwNext'))+'</button></div>';
    }
    window.LiveCampaignWizardView={body:body,footer:footer,header:header,summary:summary,text:t,number:num};
})();
