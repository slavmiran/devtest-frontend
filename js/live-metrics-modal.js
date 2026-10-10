/* Health analytics: actual owner-scoped data and an explicitly separate demo. */
(function () {
    'use strict';
    var current = null, cache = new Map(), previousFocus, overflow;
    var words = {
        ru: { title:'Пульс проекта', subtitle:'Аналитика здоровья ASO & Live', back:'Назад', refresh:'Обновить аналитику', actual:'Мои данные', demo:'Пример', demoNote:'Демонстрационные данные · пример чтения диаграммы',
            index:'ASO Health Index', internal:'Внутренний индекс DevTestHub', coverage:'Охват факторов', snapshot:'Срез', missing:'Индекс пока недоступен', minimum:'Нужно ≥20 установок и ≥60% измеренных факторов.',
            loading:'Загружаем аналитику…', error:'Не удалось обновить аналитику. Сохранённый срез остаётся доступен.', noAccess:'Нет доступа к аналитике. Откройте проект в своём Telegram-аккаунте.', retry:'Повторить', empty:'Live-активностей пока нет', emptyText:'Подтверждённые действия появятся здесь после запуска Live-кампаний. Откройте пример, чтобы посмотреть, как читать сигналы.',
            signals:'Сигналы здоровья', risk:'Риски', growth:'Здоровье', scale:'Слева −100…0, справа 0…140+. Единицы каждого показателя указаны в строке.',
            installs:'Скорость установок', installsUnit:'установок', retention:'Срок установки и отток', reviews:'Внутренние отзывы', updates:'Цикл обновлений', perDay:'/день', noTrend:'WMA пока недоступна',
            key:'Ключевик', link:'Ссылка', browser:'Веб-поиск', unknown:'Неразмечено', skew:'Перекос ≥80% в одном канале', sample:'Малая выборка или неполная разметка источников.',
            average:'Средний срок', reference:'Ориентир 30 дней', over:'OVER', early:'до D7', toxic:'в первые 72ч', cohorts:'Когортное удержание', eligible:'наблюдений', immature:'Когорта ещё не созрела',
            reviewRef:'Ориентир: 30% установок — внутренний отзыв. Это сравнительная отметка.', momentum:'Темп отзывов · WMA', noDate:'Дата обновления неизвестна', fresh:'Свежий билд', aging:'Пора оценить обновление', stale:'Давнее обновление', days:'дн. с апдейта',
            checks:'Проверки и ограничения', DOMINANT_SOURCE:'Баланс источников', EARLY_UNINSTALL:'Ранний отток', POLICY_CHECK:'Безопасность данных Google Play', BOT_FARM_SHIELD:'Проверки устройств',
            ok:'Измерено', warning:'Требует внимания', unknownCheck:'Нет заключения', notConnected:'Не подключено', sourceOk:'Выраженного перекоса источников нет.',
            churnOk:'Ранний отток ниже порога 10%; удалений в первые 72ч нет.', churnUnknown:'Данных для устойчивой оценки оттока пока мало.',
            safety:'Снимок Data Safety загружен {n} дн. назад. Достоверность декларации проверяет разработчик.', safetyMissing:'Снимок Data Safety пока не загружен.', safetyOld:'Снимку больше 90 дней: сверьте декларацию с текущей обработкой данных.',
            fraud:'Телеметрия и антифрод-проверки устройств ещё не подключены.', passport:'Открыть паспорт Google Play',
            timeline:'Динамика за 14 дней', completed:'Полные дни UTC; последние 7 дней имеют веса 1…7.', noBaseline:'Предыдущая WMA равна нулю: относительное изменение не рассчитывается.',
            methodology:'Как рассчитан индекс', formula:'Сумма баллов доступных факторов × их веса / сумма доступных весов. Неизмеренные факторы пропускаются.',
            install_momentum:'Темп установок', retention_d7:'Когортное D7', review_momentum:'Темп отзывов', source_balance:'Баланс каналов', freshness:'Свежесть сборки',
            weight:'вес', points:'баллов', unavailable:'не измерен', scope:'Весь текущий период Live; WMA сравнивает две полные недели UTC.',
            insufficient_install_history:'Нужны две полные недели, ненулевая база и ≥20 установок за эти дни.', immature_cohort:'Нужно ≥10 установок, достигших возраста 7 дней.',
            insufficient_review_history:'Нужны две полные недели, ненулевая база и ≥5 внутренних отзывов за эти дни.', incomplete_attribution_or_small_sample:'Нужно ≥20 установок и ≥80% размеченных источников.', missing_update_date:'Загрузите дату обновления через паспорт Google Play.',
        },
        en: { title:'Project pulse', subtitle:'ASO & Live health analytics', back:'Back', refresh:'Refresh analytics', actual:'My data', demo:'Example', demoNote:'Demonstration data · how to read the chart',
            index:'ASO Health Index', internal:'Internal DevTestHub index', coverage:'Factor coverage', snapshot:'Snapshot', missing:'Index not available yet', minimum:'Needs ≥20 installs and ≥60% measured factors.',
            loading:'Loading analytics…', error:'Could not refresh analytics. The saved snapshot remains available.', noAccess:'Analytics access unavailable. Open the project in your Telegram account.', retry:'Retry', empty:'No Live activity yet', emptyText:'Verified activity will appear after Live campaigns launch. Open the example to explore the signals.',
            signals:'Health signals', risk:'Risks', growth:'Health', scale:'Left −100…0, right 0…140+. Each row states its own units.',
            installs:'Install velocity', installsUnit:'installs', retention:'Install duration & departures', reviews:'Internal reviews', updates:'Update lifecycle', perDay:'/day', noTrend:'WMA not available yet',
            key:'Keyword', link:'Link', browser:'Web search', unknown:'Unattributed', skew:'One channel represents ≥80%', sample:'Small sample or incomplete source attribution.',
            average:'Average duration', reference:'30-day reference', over:'OVER', early:'before D7', toxic:'in the first 72h', cohorts:'Cohort retention', eligible:'observations', immature:'Cohort not mature yet',
            reviewRef:'Reference: 30% of installs have an internal review. A comparison marker.', momentum:'Review momentum · WMA', noDate:'Update date unknown', fresh:'Fresh build', aging:'Consider an update', stale:'Older update', days:'days since update',
            checks:'Checks & limitations', DOMINANT_SOURCE:'Source balance', EARLY_UNINSTALL:'Early departures', POLICY_CHECK:'Google Play Data safety', BOT_FARM_SHIELD:'Device checks',
            ok:'Measured', warning:'Needs attention', unknownCheck:'No conclusion', notConnected:'Not connected', sourceOk:'No strong source concentration.',
            churnOk:'Early departures below 10%; no departures in the first 72h.', churnUnknown:'Not enough observations for a stable departure assessment.',
            safety:'Data safety snapshot fetched {n} days ago. The developer checks declaration accuracy.', safetyMissing:'Data safety snapshot not fetched yet.', safetyOld:'Snapshot older than 90 days: review the declaration against current data handling.',
            fraud:'Device telemetry and anti-fraud checks are not connected yet.', passport:'Open Google Play passport',
            timeline:'14-day activity', completed:'Completed UTC days; the recent 7 days are weighted 1…7.', noBaseline:'Previous WMA is zero: a relative change cannot be calculated.',
            methodology:'How the index works', formula:'Sum of available factor points × weights / sum of available weights. Unmeasured factors are omitted.',
            install_momentum:'Install momentum', retention_d7:'Cohort D7', review_momentum:'Review momentum', source_balance:'Channel balance', freshness:'Build freshness',
            weight:'weight', points:'points', unavailable:'unmeasured', scope:'Current Live period; WMA compares two completed UTC weeks.',
            insufficient_install_history:'Needs two completed weeks, a nonzero baseline and ≥20 installs in those days.', immature_cohort:'Needs ≥10 installs aged at least 7 days.',
            insufficient_review_history:'Needs two completed weeks, a nonzero baseline and ≥5 internal reviews in those days.', incomplete_attribution_or_small_sample:'Needs ≥20 installs and ≥80% attributed sources.', missing_update_date:'Fetch the update date through the Google Play passport.',
        },
    };
    function t(key) { return words[window.lang === 'ru' ? 'ru' : 'en'][key] || key; }
    function esc(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function n(value, digits) { return value == null ? '—' : Number(value).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:digits==null?1:digits}); }
    function pct(value) { return n(value)+'%'; }
    function signed(value) { return (value>0?'+':'')+n(value,1)+'%'; }
    function finite(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
    function width(value,max) { return Math.max(0,Math.min(100,finite(value)/max*100)); }
    function badge(value, available) { return '<span class="la-badge is-'+(!available?'unknown':value>0?'good':value<0?'risk':'unknown')+'">'+esc(available?signed(value):t('noTrend'))+'</span>'; }
    function track(left,right,baseline,tone) {
        return '<div class="la-track" aria-hidden="true"><div class="la-negative"><span style="width:'+width(left,100)+'%"></span></div><div class="la-positive">'+(baseline?'<span class="la-baseline" style="width:'+width(baseline,140)+'%"></span>':'')+'<span class="la-fill is-'+(tone||'good')+'" style="width:'+width(right,140)+'%"></span></div></div>';
    }
    function row(title,value,bars,body) { return '<section class="la-chart-row"><div class="la-row-head"><h3>'+esc(title)+'</h3><strong>'+value+'</strong></div>'+bars+'<div class="la-row-details">'+body+'</div></section>'; }
    function sample() {
        return {source:'devtesthub_live',is_demo:true,model_version:'live-health-v1',as_of:new Date().toISOString(),data_status:'ready',health_score:82,health_status:'good',coverage_percent:100,
            components:[{code:'install_momentum',weight:20,points:76.1,available:true},{code:'retention_d7',weight:30,points:95,available:true},{code:'review_momentum',weight:15,points:25,available:true},{code:'source_balance',weight:15,points:100,available:true},{code:'freshness',weight:20,points:100,available:true}],
            install_velocity:{total:332,per_day:3.6,trend_wma_percent:26.1,trend_available:true,sources_breakdown:{key_percent:44.9,link_percent:34.9,browser_percent:20.2,unknown_percent:0},source_counts:{key:149,link:116,browser:67,unknown:0},dominant_source_warning:false,source_sample_ready:true},
            retention:{avg_days:38,d30_target_percent:126.7,early_uninstalls_count:5,toxic_dropoffs_d1_d3:0,early_rate_percent:5,resolved_d7:100,d7:{percent:95,eligible:100,retained:95},d30:{percent:85,eligible:40,retained:34}},
            reviews_health:{target_baseline_count:100,actual_reviews_count:56,baseline_ratio_percent:56,velocity_trend_percent:-25,trend_available:true},
            update_freshness:{days_since_update:18,status:'fresh',lifecycle_percent:100},risk_triggers:[{code:'DOMINANT_SOURCE',status:'ok'},{code:'EARLY_UNINSTALL',status:'ok'},{code:'POLICY_CHECK',status:'unknown',snapshot_age_days:18},{code:'BOT_FARM_SHIELD',status:'not_connected'}],
            daily:Array.from({length:14},function(_,i){var date=new Date();date.setUTCDate(date.getUTCDate()-14+i);return {day:date.toISOString().slice(0,10),installs:[1,2,3,2,4,3,4,2,3,4,3,4,4,5][i],reviews:i%3===0?1:0};}),keywords:[]};
    }
    function chart(data) {
        var i=data.install_velocity,r=data.retention,v=data.reviews_health,f=data.update_freshness;
        var shares=i.sources_breakdown||{},stack='',labels='';
        ['key','link','browser','unknown'].forEach(function(key){
            var share=shares[key+'_percent'];
            if(share>0) stack+='<span class="is-'+key+'" style="width:'+width(share,100)+'%"></span>';
            labels+='<span class="la-source-label"><i class="is-'+key+'"></i>'+esc(t(key))+' '+esc(share==null?'—':pct(share))+'</span>';
        });
        var installBody='<div class="la-source-stack '+(i.dominant_source_warning?'is-warning':'')+'" aria-hidden="true">'+stack+'</div><div class="la-sources">'+labels+'</div><p>'+esc(n(i.total,0)+' '+t('installsUnit')+' · '+n(i.per_day)+' '+t('perDay'))+'</p>'+
            (i.dominant_source_warning?'<p class="la-alert">'+esc(t('skew'))+'</p>':!i.source_sample_ready?'<p class="la-muted">'+esc(t('sample'))+'</p>':'');
        var retentionBody='<p>'+esc(t('average'))+': '+esc(n(r.avg_days))+'d · '+esc(t('reference'))+'</p><div class="la-cohorts">'+['d7','d30'].map(function(key){var c=r[key]||{};return '<span><strong>'+key.toUpperCase()+' '+esc(c.percent==null?'—':pct(c.percent))+'</strong><small>'+esc(n(c.eligible,0))+' '+esc(t('eligible'))+'</small></span>';}).join('')+'</div>'+
            '<p class="'+(r.toxic_dropoffs_d1_d3?'la-alert':'la-muted')+'">'+esc(n(r.early_uninstalls_count,0))+' '+esc(t('early'))+' · '+esc(n(r.toxic_dropoffs_d1_d3,0))+' '+esc(t('toxic'))+'</p>';
        var reviewBody='<p>'+esc(n(v.actual_reviews_count,0))+' / '+esc(n(v.target_baseline_count,0))+' · '+esc(t('reviewRef'))+'</p><div class="la-review-impulse"><span>'+esc(t('momentum'))+'</span>'+badge(v.velocity_trend_percent,v.trend_available)+'</div>';
        var freshBody='<p>'+esc(f.days_since_update==null?t('noDate'):n(f.days_since_update,0)+' '+t('days'))+'</p>';
        return '<div class="la-axis-labels"><span>'+esc(t('risk'))+'</span><b class="la-zero-label">0</b><b class="la-target-label">100</b><span>'+esc(t('growth'))+'</span></div><div class="la-diverging-chart">'+
            row(t('installs'),badge(i.trend_wma_percent,i.trend_available),track(i.trend_available&&i.trend_wma_percent<0?-i.trend_wma_percent:0,i.trend_available&&i.trend_wma_percent>0?i.trend_wma_percent:0),installBody)+
            row(t('retention'),'<span>'+esc(r.avg_days==null?'—':'~'+n(r.avg_days)+'d')+'</span> <span class="la-small">'+esc(r.d30_target_percent==null?'—':pct(r.d30_target_percent))+'</span>'+(r.d30_target_percent>100?' <span class="la-over">OVER</span>':''),track(r.early_rate_percent,r.d30_target_percent,100),retentionBody)+
            row(t('reviews'),'<span>'+esc((v.rating!=null?n(v.rating)+' ★ · ':'')+n(v.actual_reviews_count,0))+'</span>',track(v.trend_available&&v.velocity_trend_percent<0?-v.velocity_trend_percent:0,v.baseline_ratio_percent,100),reviewBody)+
            row(t('updates'),'<span class="la-badge is-'+(f.status==='fresh'?'good':f.status==='aging'?'watch':f.status==='stale'?'risk':'unknown')+'">'+esc(f.status==='unknown'?t('noDate'):t(f.status))+'</span>',track(f.lifecycle_percent<0?-f.lifecycle_percent:0,f.lifecycle_percent>0?f.lifecycle_percent:0,0,f.status==='aging'?'watch':'good'),freshBody)+
            '</div><p class="la-caption">'+esc(t('scale'))+'</p>';
    }
    function checks(data) {
        return (data.risk_triggers||[]).map(function(check){
            var status=check.status,warning=status==='warning'||status==='needs_review',ok=status==='ok',msg='';
            if(check.code==='DOMINANT_SOURCE') msg=warning?t('skew'):ok?t('sourceOk'):t('sample');
            if(check.code==='EARLY_UNINSTALL') msg=warning?n(data.retention.early_uninstalls_count,0)+' '+t('early')+' · '+n(data.retention.toxic_dropoffs_d1_d3,0)+' '+t('toxic'):ok?t('churnOk'):t('churnUnknown');
            if(check.code==='POLICY_CHECK') msg=status==='needs_review'?t('safetyOld'):check.snapshot_age_days!=null?t('safety').replace('{n}',n(check.snapshot_age_days,0)):t('safetyMissing');
            if(check.code==='BOT_FARM_SHIELD') msg=t('fraud');
            return '<li class="la-check is-'+(warning?'risk':ok?'good':'unknown')+'"><span aria-hidden="true">'+(warning?'!':ok?'✓':'—')+'</span><div><strong>'+esc(t(check.code))+'</strong><small>'+esc(msg)+'</small></div></li>';
        }).join('');
    }
    function timeline(data) {
        var rows=data.daily||[],key=current.series,max=Math.max(1,...rows.map(function(row){return finite(row[key]);}));
        return '<div class="la-series-controls"><button type="button" data-series="installs" aria-pressed="'+(key==='installs')+'">'+esc(t('installs'))+'</button><button type="button" data-series="reviews" aria-pressed="'+(key==='reviews')+'">'+esc(t('reviews'))+'</button></div><div class="la-daily-chart">'+rows.map(function(day,index){
            return '<div class="la-day '+(index<7?'is-previous':'is-current')+'" title="'+esc(day.day+': '+n(day[key],0))+'"><small>'+esc(n(day[key],0))+'</small><div><span style="height:'+width(day[key],max)+'%"></span></div><time>'+esc((day.day||'').slice(8,10))+'</time></div>';
        }).join('')+'</div><p class="la-caption">'+esc(t('completed'))+(rows.length?' '+esc(rows[0].day+' — '+rows[rows.length-1].day):'')+'</p>';
    }
    function render() {
        if(!current) return;
        var data=current.demo?sample():current.data,body=document.getElementById('live-analytics-content'),scroll=document.querySelector('.live-analytics-scroll');
        var position=scroll.scrollTop,opened=Array.from(body.querySelectorAll('details[open]')).map(function(el){return el.id;});
        document.getElementById('la-demo-note').hidden=!current.demo;
        document.getElementById('la-actual').setAttribute('aria-pressed',String(!current.demo));document.getElementById('la-demo').setAttribute('aria-pressed',String(current.demo));
        document.getElementById('la-refresh').disabled=current.loading;document.getElementById('la-refresh').setAttribute('aria-busy',String(current.loading));
        var error=document.getElementById('la-error');error.hidden=!current.error;error.textContent=current.error?t(current.errorAccess?'noAccess':'error'):'';
        if(!data) {body.innerHTML='<div class="la-empty" role="status"><p>'+esc(current.loading?t('loading'):t(current.errorAccess?'noAccess':'error'))+'</p><button type="button" data-retry>'+esc(t('retry'))+'</button></div>';}
        else {
            var status=data.health_status==='good'?'good':data.health_status==='watch'?'watch':data.health_status==='risk'?'risk':'unknown';
            body.innerHTML='<section class="la-score-section"><div class="la-score-ring is-'+status+'" style="--score:'+width(data.health_score,100)+'%"><div><strong>'+esc(n(data.health_score,0))+'</strong><span>/ 100</span></div></div><div class="la-score-copy"><h2>'+esc(t('index'))+'</h2><p>'+esc(t('internal'))+'</p><strong>'+esc(t('coverage'))+': '+esc(pct(data.coverage_percent))+'</strong>'+(data.health_score==null?'<small>'+esc(t('minimum'))+'</small>':'')+'</div></section>'+
                (data.data_status==='no_activity'?'<section class="la-empty"><h2>'+esc(t('empty'))+'</h2><p>'+esc(t('emptyText'))+'</p></section>':'')+
                '<section><h2>'+esc(t('signals'))+'</h2>'+chart(data)+'</section><section class="la-checks-section"><h2>'+esc(t('checks'))+'</h2><ul class="la-checks">'+checks(data)+'</ul><button type="button" class="la-text-button" data-passport>'+esc(t('passport'))+' ↗</button></section>'+
                '<section><h2>'+esc(t('timeline'))+'</h2>'+timeline(data)+'</section><details id="la-method" class="la-method"><summary>'+esc(t('methodology'))+'</summary><p>'+esc(t('formula'))+'</p><ul>'+data.components.map(function(component){return '<li><span>'+esc(t(component.code))+' <small>'+esc(t('weight'))+' '+esc(n(component.weight,0))+'%</small>'+(!component.available&&component.reason?'<small>'+esc(t(component.reason))+'</small>':'')+'</span><strong>'+esc(component.points==null?t('unavailable'):n(component.points)+' / 100')+'</strong></li>';}).join('')+'</ul><p>'+esc(t('minimum'))+'</p><p>'+esc(t('scope'))+'</p><p>'+esc(t('noBaseline'))+'</p></details><p class="la-caption">'+esc(current.demo?t('demo'):t('snapshot')+': '+new Date(data.as_of).toLocaleString(window.lang==='ru'?'ru-RU':'en-US'))+'</p>';
        }
        opened.forEach(function(id){var el=document.getElementById(id);if(el)el.open=true;});scroll.scrollTop=position;
    }
    async function read(state) {
        if(state.controller) state.controller.abort();
        var controller=new AbortController();state.controller=controller;state.loading=true;state.error=false;state.errorAccess=false;render();
        try {
            var response=await fetch(String(window.API_BASE||'/api').replace(/\/$/,'')+'/apps/'+state.id+'/live-metrics/analytics?init_data='+encodeURIComponent(state.initData),{cache:'no-store',signal:controller.signal});
            var payload=await response.json(),data=payload.analytics;
            if([401,403,404].includes(response.status)&&current===state&&state.controller===controller){cache.delete(state.cacheKey);state.data=null;state.errorAccess=true;}
            if(!response.ok||!data||data.source!=='devtesthub_live'||data.is_demo!==false||!data.install_velocity||!data.retention||!data.reviews_health||!data.update_freshness||!Array.isArray(data.components)) throw new Error('unavailable');
            if(current===state&&state.controller===controller){state.data=data;cache.set(state.cacheKey,data);}
        } catch(err){if(err.name!=='AbortError'&&current===state&&state.controller===controller)state.error=true;}
        finally{if(current===state&&state.controller===controller){state.loading=false;render();}}
    }
    function close() {
        if(!current)return;if(current.controller)current.controller.abort();current=null;
        document.getElementById('live-analytics-modal').remove();document.body.style.overflow=overflow;
        if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
    }
    function open(id) {
        id=Number(id);if(!id)return;if(current)close();
        previousFocus=document.activeElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden';
        var project=(window.myProjects||[]).concat(window.archivedProjects||[]).find(function(p){return Number(p.id||p.app_id)===id;})||{};
        var initData='';try{initData=window.getTelegramInitDataRaw();}catch(_){}
        var cacheKey=id+':'+initData;
        current={id:id,initData:initData,cacheKey:cacheKey,data:cache.get(cacheKey)||null,demo:false,series:'installs',loading:true,error:false,errorAccess:false};
        var overlay=document.createElement('div');overlay.id='live-analytics-modal';overlay.className='modal-overlay active live-analytics-modal';
        overlay.innerHTML='<div class="live-analytics-page" role="dialog" aria-modal="true" aria-labelledby="la-title"><header class="la-topbar"><button type="button" id="la-back" aria-label="'+esc(t('back'))+'">‹</button><div><h1 id="la-title">'+esc(t('title'))+'</h1><span>'+esc(project.name||t('subtitle'))+'</span></div><button type="button" id="la-refresh" aria-label="'+esc(t('refresh'))+'" title="'+esc(t('refresh'))+'">↻</button></header><div class="la-mode"><button type="button" id="la-actual">'+esc(t('actual'))+'</button><button type="button" id="la-demo">'+esc(t('demo'))+'</button><span>ASO & Live</span></div><p id="la-demo-note" class="la-demo-note" hidden>'+esc(t('demoNote'))+'</p><div class="live-analytics-scroll"><p id="la-error" class="la-error" role="alert" hidden></p><main id="live-analytics-content"></main></div></div>';
        document.body.appendChild(overlay);overlay.onclick=function(event){if(event.target===overlay)close();};
        document.getElementById('la-back').onclick=close;document.getElementById('la-refresh').onclick=function(){read(current);};
        document.getElementById('la-demo').onclick=function(){current.demo=true;render();document.querySelector('.live-analytics-scroll').scrollTop=0;};
        document.getElementById('la-actual').onclick=function(){current.demo=false;render();document.querySelector('.live-analytics-scroll').scrollTop=0;};
        overlay.addEventListener('click',function(event){
            var button=event.target.closest('button');if(!button)return;
            if(button.hasAttribute('data-retry'))read(current);
            if(button.hasAttribute('data-series')){current.series=button.dataset.series;render();}
            if(button.hasAttribute('data-passport')){var appId=current.id;close();if(window.openPlayStorePassport)window.openPlayStorePassport(appId);}
        });
        overlay.addEventListener('keydown',function(event){
            if(event.key==='Escape'){event.stopPropagation();close();return;}
            if(event.key!=='Tab')return;
            var nodes=Array.from(overlay.querySelectorAll('button:not(:disabled),summary,a')).filter(function(el){return !el.hidden&&el.getClientRects().length;});
            if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes[nodes.length-1].focus();}
            else if(!event.shiftKey&&document.activeElement===nodes[nodes.length-1]){event.preventDefault();nodes[0].focus();}
        });
        render();document.getElementById('la-back').focus();read(current);
    }
    window.LiveMetricsAnalytics={open:open,close:close};window.closeLiveMetricsAnalytics=close;
    window.addEventListener('live-metrics:details',function(event){open(event.detail&&event.detail.appId);});
    window.addEventListener('play-store:synced',function(event){if(current&&current.id===Number(event.detail&&event.detail.appId))read(current);});
})();
