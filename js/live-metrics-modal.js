/* Owner Pulse renders the platform snapshot without recomputing its scores. */
(function () {
    'use strict';

    var current = null, cache = new Map(), previousFocus, overflow;
    var channels = {key:'pulseKey',link:'pulseLink',browser:'pulseBrowser',unknown:'pulseUnknownSource'};
    var signalCopy = {
        INSTALL_TREND_DOWN:'pulseInstallDown', REVIEW_TREND_DOWN:'pulseReviewDown',
        EARLY_DROPOFFS:'pulseEarlySignal', ACTIVE_SLOTS_LOW:'pulseActiveLow',
        SOURCE_IMBALANCE:'pulseImbalance', SOURCE_CONCENTRATION:'pulseConcentration',
        UPDATE_AGING:'pulseUpdateAging', UPDATE_STALE:'pulseUpdateStale',
        ENGAGEMENT_DISCIPLINE_LOW:'pulseReportsLow', ENGAGEMENT_STALE_REPORT:'pulseReportsStale',
        ENGAGEMENT_IDLE:'pulseIdle', ENGAGEMENT_DEPTH_LOW:'pulseDepthLow'
    };

    function t(key, vars) { return window.t(key, vars || {}, window.lang); }
    function e(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function n(value, digits = 1) {
        return Number(value).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', {maximumFractionDigits:digits});
    }
    function clamp(value) { return Math.max(0, Math.min(100, Number(value) || 0)); }
    function progress(value, label) {
        return value == null ? '' : '<progress max="100" value="'+clamp(value)+'" aria-label="'+e(label)+'"></progress>';
    }
    function readings(items) {
        return '<dl class="la-readings">'+items.map(function ([label,value]) {
            return '<div><dt>'+e(label)+'</dt><dd>'+e(value)+'</dd></div>';
        }).join('')+'</dl>';
    }
    function metric(id, title, content) {
        return '<section class="la-metric" data-metric="'+id+'"><h2>'+e(t(title))+'</h2>'+content+'</section>';
    }
    function health(data) {
        var score = data.health_score;
        var status = score == null ? 'unknown' : score >= 80 ? 'good' : score >= 60 ? 'watch' : 'risk';
        return '<section class="la-score-section">'+
            (score == null ? '' : '<div class="la-score-ring is-'+status+'" style="--score:'+clamp(score)+'%"><div><strong>'+e(n(score,0))+'</strong><span>/ 100</span></div></div>')+
            '<div class="la-score-copy"><h2>'+e(t('mkHealthTitle'))+'</h2><b class="is-'+status+'">'+e(t(score == null ? 'lmCalibrating' : 'lmHealth_'+status))+'</b>'+
            (data.calibration_status === 'early' ? '<small class="la-calibration">'+e(t('pulseCalibration'))+'</small>' : '')+
            '<button type="button" class="la-guide" data-lm-learn>'+e(t('pulseLearnFull'))+' ›</button></div></section>';
    }
    function actions(data) {
        var messages = (data.action_summary?.signals || []).filter(function (signal) {
            return Object.hasOwn(signalCopy,signal.code);
        }).map(function (signal) {
            var hint = t(signalCopy[signal.code], {
                p:n(Math.abs(signal.percent ?? 0)), n:n(signal.count ?? signal.days ?? 0,0),
                channel:t(channels[signal.channel] || channels.unknown)
            });
            return '<li data-signal="'+e(signal.code)+'"><span>'+e(hint)+'</span>'+
                (window.LiveGuidance ? LiveGuidance.forSignal(current.id,signal.code) : '')+'</li>';
        });
        return messages.length ? '<section class="la-actions"><h2>'+e(t('pulseActions'))+'</h2><ul>'+messages.join('')+'</ul></section>' : '';
    }
    function installs(data) {
        var shares = data.sources_breakdown || {};
        var mix = Object.entries(channels).filter(function ([code]) {
            return shares[code+'_percent'] != null && (code !== 'unknown' || shares.unknown_percent > 0);
        }).map(function ([code,label]) {return {code:code,label:t(label),pct:clamp(shares[code+'_percent'])};});
        var content = readings([[t('pulseInstallTotal'),n(data.total || 0,0)],[t('pulseFlow'),t('pulsePerDay',{n:n(data.per_day || 0)})]]);
        if (data.trend_available) {
            var trend = Number(data.trend_wma_percent) || 0;
            content += '<strong class="la-week-change is-'+(trend < 0 ? 'risk' : trend > 0 ? 'good' : 'unknown')+'">'+
                e(t('pulseWeekChange',{n:(trend > 0 ? '+' : trend < 0 ? '−' : '')+n(Math.abs(trend))}))+'</strong>';
        }
        if (mix.length) {
            content += '<div class="la-source-stack" aria-hidden="true">'+mix.map(function (item) {
                return '<span class="is-'+item.code+'" style="flex-grow:'+item.pct+'"></span>';
            }).join('')+'</div><ul class="la-sources">'+mix.map(function (item) {
                return '<li><i class="is-'+item.code+'"></i><span>'+e(item.label)+'</span><strong>'+e(n(item.pct))+'%</strong></li>';
            }).join('')+'</ul><p>'+e(t('pulseSourceGuide'))+'</p>';
        } else content += '<p>'+e(t('pulseNoSources'))+'</p>';
        return metric('installs','pulseInstalls',content);
    }
    function retention(data) {
        var avg = data.avg_days;
        var milestones = [7,14,21,30].map(function (day) {
            var value = data['d'+day]?.percent;
            return [t('pulseRetentionPeriod',{n:day}),value == null ? t('pulseNotReady') : n(value)+'%'];
        });
        return metric('retention','pulseRetention',
            readings([[t('pulseAvg'),avg == null ? t('lmWaiting') : t('pulseAvgDays',{n:n(avg)})]])+
            progress(avg == null ? null : avg/30*100,t('pulseTarget'))+'<p>'+e(t('pulseTarget'))+'</p>'+
            '<div class="la-cohorts">'+readings(milestones)+'</div>'+
            (data.early_uninstalls_count > 0 ? '<p>'+e(t('pulseEarly',{n:n(data.early_uninstalls_count,0)}))+'</p>' : '')+
            (data.observed_only_count && window.LiveHistoryImport ? '<p>'+e(t('lhiRetentionLower'))+'</p>' : ''));
    }
    function engagement(data, active) {
        var discipline = data.discipline_percent;
        return metric('engagement','pulseEngagement',readings([
            [t('pulseDiscipline'),discipline == null ? t('lmNoCheckpoints') : n(discipline)+'%'],
            [t('pulseActive'),t('pulsePeople',{n:n(data.active_testers ?? active ?? 0,0)})],
            [t('pulseLastReport'),window.LiveMarketUI ? LiveMarketUI.report(data) : t('lmNoReport')]
        ])+progress(discipline,t('pulseDiscipline')));
    }
    function release(data) {
        var days = data.days_since_update;
        var state = days == null ? '' : days <= 30 ? 'Fresh' : days <= 60 ? 'Aging' : 'Stale';
        return metric('release','pulseRelease','<strong>'+e(days == null ? t('lmNoRelease') : t('lmReleaseAgo',{n:n(days,0)}))+'</strong>'+
            '<ul class="la-release-scale">'+['Fresh','Aging','Stale'].map(function (band) {
                return '<li class="is-'+band.toLowerCase()+'"'+(band === state ? ' aria-current="true"' : '')+'>'+e(t('pulseRelease'+band))+'</li>';
            }).join('')+'</ul>');
    }
    function rhythm(market) {
        var rows = (market?.thermal_week || []).slice(-7);
        if (!rows.length) return metric('rhythm','pulseRhythm','<p>'+e(t('pulseNoRhythm'))+'</p>');
        var max = Math.max(1,...rows.map(function (row) {return Math.max(row.C_t,row.U_opt);}));
        var x = function (i) {return rows.length === 1 ? 158 : 22+i*272/(rows.length-1);};
        var y = function (value) {return 104-81*value/max;};
        var points = function (key) {return rows.map(function (row,i) {return x(i)+','+y(row[key]);});};
        var band = points('U_opt').concat(points('L_floor').reverse()).join(' ');
        var latest = rows.at(-1);
        var thermal = market.thermal || latest;
        var pace = thermal.T_t > 75 ? 'High' : thermal.T_t < -35 ? 'Low' : 'Steady';
        return metric('rhythm','pulseRhythm',
            '<p>'+e(t('pulsePlanActual'))+'</p><svg viewBox="0 0 316 128" class="la-week-chart" role="img" aria-label="'+e(t('pulseRhythm'))+'">'+
            '<polygon points="'+band+'"/><polyline points="'+points('C_t').join(' ')+'"/>'+
            rows.map(function (row,i) {
                return '<circle cx="'+x(i)+'" cy="'+y(row.C_t)+'" r="3"><title>'+e(row.day)+' · '+e(n(row.C_t,0))+'</title></circle>'+
                    '<text class="la-plot-value" x="'+x(i)+'" y="'+(y(row.C_t)-7)+'" text-anchor="middle">'+e(n(row.C_t,0))+'</text>'+
                    '<text x="'+x(i)+'" y="123" text-anchor="middle">'+e(row.day.slice(5))+'</text>';
            }).join('')+'</svg><ul class="la-chart-key"><li>'+e(t('pulseActual'))+'</li><li>'+e(t('pulseCorridor',{l:n(thermal.L_floor ?? latest.L_floor,0),u:n(thermal.U_opt ?? latest.U_opt,0)}))+'</li></ul>'+
            '<p>'+e(t('pulsePaceLabel'))+': <strong>'+e(t('pulsePace'+pace))+'</strong>'+
            (thermal.K_thermal == null ? '' : ' · '+e(t('pulsePaceRank'))+': <strong>×'+e(n(thermal.K_thermal,3))+'</strong>')+'</p>');
    }
    function render() {
        if (!current) return;
        var data = current.data, body = document.getElementById('live-analytics-content');
        var scroll = body.parentElement, position = scroll.scrollTop;
        var geoOpen = body.querySelector('#la-geo')?.open;
        var focusedLearn = body.contains(document.activeElement) && document.activeElement.matches('[data-lm-learn]');
        var refresh = document.getElementById('la-refresh'), error = document.getElementById('la-error');
        if (current.loading && document.activeElement === refresh)
            document.getElementById('la-back').focus({preventScroll:true});
        refresh.disabled = current.loading;
        error.hidden = !current.error;
        error.textContent = current.error ? t(current.errorAccess ? 'pulseNoAccess' : 'pulseError') : '';
        if (!data) {
            body.innerHTML = current.loading ? '<p role="status">'+e(t('pulseLoading'))+'</p>' :
                '<button type="button" class="la-guide" data-retry>'+e(t('pulseRetry'))+'</button>';
        } else {
            body.innerHTML = health(data)+actions(data)+installs(data.install_velocity)+retention(data.retention)+
                (window.LiveRadarLayers ? LiveRadarLayers.feedback(current.id,data,true) : '')+
                engagement(data.engagement || {},data.active_users)+release(data.update_freshness)+
                rhythm(data.data_status === 'no_activity' ? null : data.market)+
                (window.LiveHistoryImport ? LiveHistoryImport.footer(current.id,data.history_import,data.live_activated_at) : '');
        }
        var geo = body.querySelector('#la-geo');
        if (geo && geoOpen) geo.open = true;
        scroll.scrollTop = position;
        if (focusedLearn) body.querySelector('[data-lm-learn]')?.focus({preventScroll:true});
        var feedback = body.querySelector('#la-feedback');
        if (current.focusFeedback && feedback) {
            current.focusFeedback = false;
            feedback.scrollIntoView({block:'start'});
            feedback.querySelector('select,button')?.focus({preventScroll:true});
        }
    }
    async function read(state) {
        if(state.controller) state.controller.abort();
        var controller=new AbortController();state.controller=controller;state.loading=true;state.error=false;state.errorAccess=false;render();
        try {
            var response=await fetch(String(window.API_BASE||'/api').replace(/\/$/,'')+'/apps/'+state.id+'/live-metrics/analytics?init_data='+encodeURIComponent(state.initData),{cache:'no-store',signal:controller.signal});
            var payload=await response.json(),data=payload.analytics;
            if([401,403,404].includes(response.status)&&current===state&&state.controller===controller){cache.delete(state.cacheKey);state.data=null;state.errorAccess=true;}
            if(!response.ok||!data||data.source!=='devtesthub_live'||data.is_demo!==false||!data.install_velocity||!data.retention||!data.reviews_health||!data.update_freshness||!Array.isArray(data.components)) throw new Error('unavailable');
            if(current===state&&state.controller===controller){state.data=data;cache.set(state.cacheKey,data);if(window.LiveProjectMetrics&&LiveProjectMetrics.applyPulse)LiveProjectMetrics.applyPulse(state.id,data.health_score,data.health_delta);}
        } catch(err){if(err.name!=='AbortError'&&current===state&&state.controller===controller)state.error=true;}
        finally{if(current===state&&state.controller===controller){state.loading=false;render();}}
    }
    function close() {
        if(!current)return;if(current.controller)current.controller.abort();current=null;
        document.getElementById('live-analytics-modal').remove();document.body.style.overflow=overflow;
        if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
        if(window.syncTelegramBackButton)window.syncTelegramBackButton();
    }
    function open(id, focus) {
        id=Number(id);if(!id)return;if(current)close();
        previousFocus=document.activeElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden';
        var project=(window.myProjects||[]).concat(window.archivedProjects||[]).find(function(p){return Number(p.id||p.app_id)===id;})||{};
        var initData='';try{initData=window.getTelegramInitDataRaw();}catch(_){}
        var cacheKey=id+':'+initData;
        current={id:id,initData:initData,cacheKey:cacheKey,data:cache.get(cacheKey)||null,loading:true,error:false,errorAccess:false,focusFeedback:focus==='feedback'};
        var overlay=document.createElement('div');overlay.id='live-analytics-modal';overlay.className='modal-overlay active live-analytics-modal';
        overlay.innerHTML = '<div class="live-analytics-page" role="dialog" aria-modal="true" aria-labelledby="la-title">'+
            '<header class="la-topbar"><button type="button" id="la-back" aria-label="'+e(t('pulseBack'))+'">‹</button><div>'+
            '<h1 id="la-title">'+e(t('pulseTitle'))+'</h1>'+(project.name ? '<span>'+e(project.name)+'</span>' : '')+'</div>'+
            '<button type="button" id="la-refresh" aria-label="'+e(t('pulseRefresh'))+'" title="'+e(t('pulseRefresh'))+'">↻</button></header>'+
            '<div class="live-analytics-scroll"><p id="la-error" class="la-error" role="alert" hidden></p><main id="live-analytics-content"></main></div></div>';
        document.body.appendChild(overlay);overlay.onclick=function(event){if(event.target===overlay)close();};
        document.getElementById('la-back').onclick=close;document.getElementById('la-refresh').onclick=function(){read(current);};
        overlay.addEventListener('change',function(event){if(event.target.matches('[data-lrdr-country]')){LiveRadarLayers.setCountry(current.id,event.target.value);render();overlay.querySelector('[data-lrdr-country]')?.focus({preventScroll:true});}});
        overlay.addEventListener('click',function(event){
            var button=event.target.closest('button');if(!button)return;
            if(button.hasAttribute('data-retry'))read(current);
            if(button.hasAttribute('data-passport')){var appId=current.id;close();if(window.openPlayStorePassport)window.openPlayStorePassport(appId);}
        });
        overlay.addEventListener('keydown',function(event){
            if(event.key==='Escape'){event.stopPropagation();close();return;}
            if(event.key!=='Tab')return;
            var nodes=Array.from(overlay.querySelectorAll('button:not(:disabled),summary,select,a,[role="button"]')).filter(function(el){return !el.hidden&&el.getClientRects().length;});
            if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes[nodes.length-1].focus();}
            else if(!event.shiftKey&&document.activeElement===nodes[nodes.length-1]){event.preventDefault();nodes[0].focus();}
        });
        render();document.getElementById('la-back').focus();read(current);
        if(window.syncTelegramBackButton)window.syncTelegramBackButton();
    }
    window.LiveMetricsAnalytics={open:open,close:close};window.closeLiveMetricsAnalytics=close;
    window.addEventListener('live-metrics:details',function(event){open(event.detail&&event.detail.appId);});
    window.addEventListener('play-store:synced',function(event){if(current&&current.id===Number(event.detail&&event.detail.appId))read(current);});
    window.addEventListener('live-history:imported',function(event){var id=Number(event.detail&&event.detail.appId);cache.forEach(function(_,key){if(key.indexOf(id+':')===0)cache.delete(key);});if(current&&current.id===id)read(current);});
})();
