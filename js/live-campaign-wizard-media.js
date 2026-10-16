/* Session-owned local attachments; never upload or persist before a campaign exists. */
(function () {
    'use strict';
    function create(){
        var entries=new Map(),pending=new Map(),generation=0;
        function remove(key){pending.delete(key);var row=entries.get(key);if(row)URL.revokeObjectURL(row.url);entries.delete(key);}
        function clear(){generation++;Array.from(entries.keys()).forEach(remove);pending.clear();}
        async function attach(key,file,isCurrent){
            if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || !file.size || file.size>5*1024*1024)throw new Error('lcwInvalidImage');
            var token={},epoch=generation,url=URL.createObjectURL(file);pending.set(key,token);
            try{
                await new Promise(function(resolve,reject){var img=new Image();img.onload=function(){if(img.naturalWidth*img.naturalHeight>24000000)reject(new Error('lcwInvalidImage'));else resolve();};img.onerror=function(){reject(new Error('lcwInvalidImage'));};img.src=url;});
                if(epoch!==generation || pending.get(key)!==token || !isCurrent()){URL.revokeObjectURL(url);return null;}
                remove(key);var row={url:url,name:file.name,type:file.type,size:file.size};entries.set(key,{url:url,file:file});return row;
            }catch(error){URL.revokeObjectURL(url);if(pending.get(key)===token)pending.delete(key);throw error;}
        }
        function serialize(key,meta){
            var item=entries.get(key);if(!item)throw new Error('lcwInvalidImage');
            return new Promise(function(resolve,reject){var reader=new FileReader();reader.onerror=reject;reader.onload=function(){resolve({name:meta.name,mime:item.file.type,data_base64:String(reader.result).split(',')[1]});};reader.readAsDataURL(item.file);});
        }
        return {attach:attach,remove:remove,clear:clear,serialize:serialize};
    }
    window.LiveCampaignWizardMedia={create:create};
})();
