/* Reuse the platform's native-checkbox switch and its keyboard behavior. */
(function(){
 'use strict';
 function toggle(action,label,c,busy,on,extra){
  var esc=window.escapeHTML;
  return '<label class="project-email-settings-switch lc-switch"><span>'+esc(label)+'</span><input type="checkbox" role="switch" data-lc-action="'+action+'"'+(c?' data-campaign="'+Number(c.id)+'"':'')+' aria-label="'+esc(label)+'" aria-checked="'+!!on+'"'+(on?' checked':'')+(busy?' disabled':'')+' '+(extra||'')+'><i aria-hidden="true"></i></label>';
 }
 window.LiveCampaignControls={toggle:toggle};
})();
