const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
let now = Date.parse('2026-10-11T12:00:00Z');
let localDay = '2026-10-11';
const storage = new Map();
const context = {console, Number, String, Math, JSON, Object, Array, Set, Map,
    Date: class extends Date {static now(){return now;}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
    _customGroupWaitState:{},_customGroupWaitTimerId:null,_customGroupWaitStateKey:'wait',CUSTOM_GROUP_ACCESS_WAIT_MS:900000,
    myTests:[], incomingOffers:[], getLocalDate:()=>localDay,getUserTestingDay:()=>1,
    isMandatoryScreenshotDay:()=>true,qualifiesEarlyFinishGrant:()=>false,
    isExternalContinueModeEnabled:()=>false,isAppClosed:false,isTestClosed:false, App:{},
};
context.window=context;
vm.createContext(context);
for(const file of ['js/app-actions.js','js/app-api.js','js/checkin-proof-upload.js']) {
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}
context.startCustomGroupAccessWait(30);
const first = context._customGroupWaitState['30'];
now += 10000;
context.startCustomGroupAccessWait(30);
assert.equal(context._customGroupWaitState['30'],first,'Repeated click must not extend running wait');
now += 900000;
context.startCustomGroupAccessWait(30);
assert.equal(context.getCustomGroupAccessWaitRemainingMs(30),0,'Expired wait must not restart');
context._customGroupWaitState={};
context._loadCustomGroupWaitState();
context.startCustomGroupAccessWait(30);
assert.equal(context.getCustomGroupAccessWaitRemainingMs(30),0,'Reload must retain completed wait');
context.startCustomGroupAccessWait(31);
assert(context.getCustomGroupAccessWaitRemainingMs(31)>0,'Another project still has its own first wait');

for(const name of ['setFirstDayScreenshotVisible','setTimerReadyForConfirm','clearActiveTimerForApp','markDefaultGroupJoined','renderTests','refreshOpenModals','setTestsCache','showCheckinRewardToasts']) context[name]=()=>{};
const row={id:30,progress_id:12866,run_iteration:1,status:'opened',app_status:'active',progress_status:'active',checkins_count:0,testing_days:1,last_check_date:null};
context.myTests=[row];
context._applyScreenshotCheckinResult(30,{checkin:{last_check_date:'2026-10-10',checkins_count:1,daily_timeline:'1',testing_day:1}},1);
assert.equal(row.status,'done','Accepted screenshot remains completed across timezone differences');
const payload={to_test_today:[{app_id:30,progress_id:12866,run_iteration:1,app_status:'active',progress_status:'active',last_check_date:null,testing_days:1,checkins_count:0}]};
let mapped=context._mapTestsFromApi(payload)[0];
assert.equal(mapped.status,'done','A stale response must not reopen the accepted check-in');
assert.equal(mapped.checkins_count,1);
assert.equal(mapped.daily_timeline,'1');
assert.equal(context._normalizeCachedTests([mapped])[0].status,'done','Cache restore must retain confirmed completion');
context.myTests=[mapped];
context.recomputeLocalTestState(mapped);
assert.equal(mapped.status,'done','Cached/recomputed confirmed state must stay done');
payload.to_test_today[0].run_iteration=2;
assert.equal(context._mapTestsFromApi(payload)[0].status,'new','Retest must not inherit old confirmed state');
payload.to_test_today[0].run_iteration=1;
payload.to_test_today[0].progress_id=12867;
assert.equal(context._mapTestsFromApi(payload)[0].status,'new','Rejoin must not inherit old confirmed state');
payload.to_test_today[0].progress_id=12866;
localDay='2026-10-12';
assert.notEqual(context._mapTestsFromApi(payload)[0].status,'done','Confirmation must expire on the next day');
console.log('Check-in state: repeat/reload group wait, accepted upload, stale snapshot, timezone, retest, rejoin and next day passed');
