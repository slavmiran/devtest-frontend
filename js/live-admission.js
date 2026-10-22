/* Admission is a project setting, sharing its optimistic revision with pace. */
(function(){
 'use strict';
 function open(app,control){var U=LiveMarketUI,t=U.t,e=U.e,revision=control.revision,mode=control.admission_mode||'request_only',auth=U.auth(),busy=false;
  var layer=U.sheet(t('lmAdmission'),'<p>'+e(t('lmAdmissionHint'))+'</p>'+['request_only','instant_install'].map(function(value){return '<label class="lm-task"><input type="radio" name="lm-admission" value="'+value+'"'+(mode===value?' checked':'')+'> '+e(t(value==='request_only'?'lmRequestOnly':'lmInstantMode'))+'</label>';}).join('')+'<p role="alert" class="lm-error" data-admission-error></p><button class="lm-action lm-action-primary" type="button" data-admission-save>'+e(t('lmSave'))+'</button>');
  layer.querySelector('[data-admission-save]').onclick=async function(){if(busy||auth!==U.auth())return;busy=true;var b=this;b.disabled=true;layer.querySelectorAll('input').forEach(function(n){n.disabled=true;});
   try{var value=layer.querySelector('[name="lm-admission"]:checked').value;await U.api('/apps/'+app+'/live-admission','PATCH',{mode:value,revision:revision});if(layer.isConnected)U.closeTop();window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:app}}));if(window.LiveMarket)LiveMarket.refresh();}
   catch(err){if(!layer.isConnected)return;var node=layer.querySelector('[data-admission-error]');if(err.message==='campaign_conflict'){try{var data=await U.api('/apps/'+app+'/campaigns');revision=data.project_control.revision;control=data.project_control;layer.querySelector('[value="'+(control.admission_mode||'request_only')+'"]').checked=true;window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:app}}));node.textContent=t('lmConflict');}catch(_){node.textContent=t('lmError');}}else node.textContent=t([401,403].includes(err.status)?'lxNoPermission':'lmError');}
   finally{busy=false;if(layer.isConnected){b.disabled=false;layer.querySelectorAll('input').forEach(function(n){n.disabled=false;});}}
  };
 }
 window.LiveAdmission={open:open};
})();
