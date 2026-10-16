/* Source attribution and forecasts; unknown installs remain in the denominator. */
(function () {
    'use strict';
    var KEYS=['link','web','keywords','unknown'];
    function baseline(data) {
        if(!data || data.source!=='devtesthub_live' || data.is_demo===true || data.boundary_available===false)return null;
        var raw=data.install_velocity && data.install_velocity.source_counts || data.source_counts;
        if(!raw)return null;
        var counts={link:raw.link,web:raw.browser,keywords:raw.key,unknown:raw.unknown || 0};
        if(KEYS.some(function(k){return typeof counts[k]!=='number' || !Number.isSafeInteger(counts[k]) || counts[k]<0;}))return null;
        var total=KEYS.reduce(function(sum,k){return sum+counts[k];},0);
        if(!Number.isSafeInteger(total))return null;
        return {counts:counts,total:total,asOf:data.as_of || null};
    }
    function mix(draft, existing) {
        var added=LiveCampaignDraft.counts(draft),before=existing && existing.counts;
        var counts={},total=0;
        KEYS.forEach(function(k){counts[k]=(before?before[k]:0)+(added[k] || 0);total+=counts[k];});
        var channels=KEYS.map(function(k){return {key:k,count:counts[k],percent:total?counts[k]*100/total:0};});
        var dominant=total>0 && channels.some(function(c){return c.key!=='unknown' && c.count*100>=total*80;});
        return {total:total,channels:channels,dominant:dominant,unknown:counts.unknown,
            status:!total?'empty':dominant?'warning':counts.unknown*100>total*20?'uncertain':'balanced'};
    }
    window.LiveCampaignTraffic={baseline:baseline,mix:mix};
})();
