/* Campaign GEO delegates country selection and community counts to ShowcaseGeo. */
(function(){
 'use strict';
 function t(k,v){return LiveCampaignWizardView.text(k,v);}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function label(code){var g=window.ShowcaseGeo,item=g&&g.country(code);return item?g.countryLabel(item):code||t('lcGeoAny');}
 function body(d,c){
  var data=c.geoStats,row=data&&(data.countries||[]).find(function(r){return (r.country_code||r.code)===d.country;}),total=row?Number(row.total_count||0):0,active=row?Number(row.active_count||0):0;
  var audience=!d.country?'':c.geoError?'<p class="gtw-helper-text" role="status">'+e(t('lcGeoError'))+'</p><button type="button" class="meta-chip lcw-chip" data-lcw-action="geo-retry">'+e(t('lcGeoRetry'))+'</button>':!data?'<p class="gtw-helper-text" role="status">'+e(t('lcGeoLoading'))+'</p>':
   '<dl class="lcw-geo-counts">'+[['lcGeoTotal',total],['lcGeoActive',active]].map(function(m){return '<div><dt>'+e(t(m[0]))+'</dt><dd>'+e(LiveCampaignWizardView.number(m[1]))+'</dd></div>';}).join('')+'</dl>'+
   (total<10?'<p class="lcp-note is-warn" role="status">'+e(t('lcGeoSmall',{n:10}))+'</p>':active===0?'<p class="lcp-note is-warn" role="status">'+e(t('lcGeoInactive'))+'</p>':'')+'<p class="gtw-helper-text">'+e(t('lcGeoCountsHint'))+'</p>';
  return '<section class="lcw-panel lcw-geo"><div class="lcw-mix-caption"><strong>'+e(t('lcGeoTitle'))+'</strong><span>'+e(t('lcGeoOptional'))+'</span></div><button type="button" class="pc-project-param lcw-geo-choice" data-lcw-action="geo" aria-haspopup="dialog"><span>'+e(label(d.country))+'</span><span aria-hidden="true">⌄</span></button><p class="gtw-helper-text">'+e(t('lcGeoHint'))+'</p><div data-lcw-geo-audience>'+audience+'</div><button type="button" class="meta-chip lcw-chip" data-lcw-action="geo-community" aria-haspopup="dialog">🌍 '+e(t('lcGeoCommunity'))+'</button></section>';
 }
 window.LiveCampaignGeo={body:body,label:label};
})();
