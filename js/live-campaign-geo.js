/* Campaign GEO delegates country selection and community counts to ShowcaseGeo. */
(function(){
 'use strict';
 function t(k,v){return LiveCampaignWizardView.text(k,v);}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function label(code){var g=window.ShowcaseGeo,item=g&&g.country(code);return item?g.countryLabel(item):code||t('lcGeoAny');}
 function body(d,c){
  var data=c.geoStats,row=data&&(data.countries||[]).find(function(r){return (r.country_code||r.code)===d.country;}),total=row?Number(row.total_count||0):0,active=row?Number(row.active_count||0):0;
  var audience=!d.country?'<p class="bp-sec-note">'+e(t('bpGeoAnyNote'))+'</p>':c.geoError?'<p class="bp-sec-note" role="status">'+e(t('lcGeoError'))+'</p><button type="button" class="bp-link-btn" data-lcw-action="geo-retry">'+e(t('lcGeoRetry'))+'</button>':!data?'<p class="bp-sec-note" role="status">'+e(t('lcGeoLoading'))+'</p>':
   '<dl class="lcw-geo-counts">'+[['lcGeoTotal',total],['lcGeoActive',active]].map(function(m){return '<div><dt>'+e(t(m[0]))+'</dt><dd>'+e(LiveCampaignWizardView.number(m[1]))+'</dd></div>';}).join('')+'</dl>'+
   (total<10?'<p class="lcp-note is-warn" role="status">'+e(t('lcGeoSmall',{n:10}))+'</p>':active===0?'<p class="lcp-note is-warn" role="status">'+e(t('lcGeoInactive'))+'</p>':'')+'<p class="bp-sec-note">'+e(t('lcGeoCountsHint'))+'</p>';
  return '<section class="lcw-panel bp-sec lcw-geo"><header class="bp-sec-head"><h3>'+e(t('lcGeoTitle'))+'</h3><span>'+e(t('lcGeoOptional'))+'</span></header><p class="bp-sec-lead">'+e(t('lcGeoHint'))+'</p>'+
   '<button type="button" class="bp-geo-pick" data-lcw-action="geo" aria-haspopup="dialog"><span class="bp-geo-copy"><small>'+e(t('bpGeoCountry'))+'</small><strong>'+e(label(d.country))+'</strong></span><span class="bp-chev" aria-hidden="true">›</span></button></section>'+
   '<section class="lcw-panel bp-sec"><header class="bp-sec-head"><h3>'+e(t('bpGeoAudience'))+'</h3></header><div data-lcw-geo-audience>'+audience+'</div>'+
   '<button type="button" class="bp-link-btn" data-lcw-action="geo-community" aria-haspopup="dialog">🌍 '+e(t('lcGeoCommunity'))+' ›</button></section>';
 }
 window.LiveCampaignGeo={body:body,label:label};
})();
