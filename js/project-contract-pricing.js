/* Shared contract formula and cloned Phase-1 editor. No second calculator markup. */
(function(){
 'use strict';
 function quote(limit,reward){return {perTester:reward,daily:reward*.65,hold:reward*.35,total:limit*reward};}
 function money(n){return Number(n||0).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:1})+' $BUST';}
 function read(node){var fields=Array.from(node.querySelectorAll('[data-contract-field]'));if(fields.some(function(n){return !n.value||!n.validity.valid||!Number.isSafeInteger(Number(n.value));}))return null;var result={};fields.forEach(function(n){result[n.dataset.contractField]=Number(n.value);});return result;}
 function update(node){var d=read(node);if(!d)return false;var q=quote(d.limit,d.reward);node.querySelectorAll('[data-contract-result]').forEach(function(n){n.textContent=money(q[n.dataset.contractResult]);});return true;}
 function build(id,d,balance){
  var source=document.getElementById('add-bounty-settings');if(!source)return '<p class="lc-error">'+window.escapeHTML(window.t('lcpContractReload',{},window.lang))+'</p>';
  var node=source.cloneNode(true),prefix='live-contract-'+id+'-';node.removeAttribute('id');node.className='lc-contract-editor';
  var fields={'app-limit-bounty':'limit','app-bounty-per-tester':'reward'},results={'add-calc-per-tester':'perTester','add-calc-daily':'daily','add-calc-hold':'hold','add-calc-total':'total'};
  node.querySelectorAll('*').forEach(function(el){Array.from(el.attributes).forEach(function(a){if(/^on/i.test(a.name))el.removeAttribute(a.name);});if(fields[el.id]){var f=fields[el.id];el.dataset.contractField=f;el.value=f==='limit'?(d.limit||12):(d.reward||100);el.max=f==='limit'?10000:100000;el.setAttribute('value',el.value);}if(results[el.id])el.dataset.contractResult=results[el.id];if(el.id==='add-balance-badge-value')el.textContent=money(balance);if(el.id)el.id=prefix+el.id;if(el.htmlFor)el.htmlFor=prefix+el.htmlFor;});
  node.querySelectorAll('[data-i18n]').forEach(function(el){el.textContent=window.t(el.dataset.i18n,{},window.lang==='ru'?'ru':'en');});
  if(d.hired>0){node.querySelector('[data-contract-field="reward"]').disabled=true;node.querySelector('[data-contract-field="limit"]').min=d.hired;}
  update(node);return node.outerHTML;
 }
 window.ProjectContractPricing={quote:quote,read:read,update:update,build:build};
})();
