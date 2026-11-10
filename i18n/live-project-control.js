(function(){
 'use strict';
 Object.assign(window.I18NRU,{
  lpcResultsTitle:'Покрытие и опыт',lpcResultsScope:'Вся история проекта, включая закрытое тестирование',
  lpcNoIcon:'Без иконки',lpcDisplayRequired:'Укажите название или выберите иконку.',
  lpcPoolTitle:'Общий пул кампаний',lpcPaceTitle:'Контроль темпа проекта',lpcProjectScope:'Единая политика темпа действует на все кампании проекта. Потолки кампаний распределяют общий поток.',
  lpcPaceSummary:'🛡 До {n} уст./цикл · Пауза {h}ч · Разгон {r} дн.',lpcCycleProgress:'Набрано: {used} из {total}',
  lpcDistribution:'Распределение потока',lpcDistributionHint:'Максимумы за цикл, а не гарантированные места. Кампания, достигшая своего лимита, ждёт нового цикла; остальные продолжают набор.',
  lpcUnlimited:'Без ограничения',lpcSetCap:'Задать максимум',lpcThisCampaign:'Эта кампания',lpcCampaignCap:'Потолок кампании',
  lpcCapsDormant:'В свободном потоке квоты не ограничивают приём. Значения сохраняются для включения контроля темпа.',
  lpcCapsShared:'Кампании без ограничения могут занять остаток общего лимита. Для защиты остальных задайте максимум каждой.',
  lpcUnusedCapacity:'Сумма максимумов ниже лимита проекта: {n} мест за цикл останутся незанятыми.',
  lpcCompetitiveCaps:'Сумма максимумов {sum} выше лимита {total}: кампании конкурируют за общий остаток.',lpcBalancedCaps:'Максимумы распределяют весь лимит проекта: {total} за цикл.',
  lpcLoading:'Загружаем общие настройки проекта…',lpcApply:'Применить к проекту',lpcSaveConflict:'Настройки изменились или не удалось сохранить. Закройте окно и проверьте актуальные значения.',
  lpcDetails:'Детали',lpcCheckpointCount:'D1 + {n} КД',lpcReviewTag:'Отзыв',lpcCapTag:'До {n}/цикл',lpcRate:'Тариф: {n} $BUST / тестер · {days} платных КД',lpcIcon:'Иконка кампании',
  lpcStatusLoading:'Уточняем статус проекта…',lpcStatusIdle:'⚪ Нет активных кампаний',lpcStatusPaused:'🛡 Пауза до {time} · взаимки в очередь',lpcStatusClosed:'⏸ Приём новых участников закрыт',lpcStatusOpen:'🟢 Набор открыт · {used} из {total} сегодня',lpcStatusFree:'🟢 Набор открыт · свободный поток',lpcStatusDeficit:'⚠️ До конца цикла нужно ещё {n} участников',lpcPaceShort:'⚠️ Темп ниже нормы (−{count} уст.)',
  lpcCycleLimit:'Кампания достигла максимума текущего цикла.',lpcCycleWaiting:'Цикл {used}/{n} · ожидание',lpcDuplicate:'У тестера уже есть участие в этом Live-периоде проекта.'
 });
 Object.assign(window.I18NEN,{
  lpcResultsTitle:'Coverage and experience',lpcResultsScope:'Full project history, including closed testing',
  lpcNoIcon:'No icon',lpcDisplayRequired:'Enter a name or choose an icon.',
  lpcPoolTitle:'Shared campaign pool',lpcPaceTitle:'Project pace control',lpcProjectScope:'One pace policy covers all project campaigns. Campaign ceilings allocate the shared flow.',
  lpcPaceSummary:'🛡 Up to {n}/cycle · Pause {h}h · Ramp {r}d',lpcCycleProgress:'Admitted: {used} of {total}',
  lpcDistribution:'Traffic allocation',lpcDistributionHint:'Cycle maximums, not guaranteed reservations. A campaign that reaches its cap waits for the next cycle; the others keep recruiting.',
  lpcUnlimited:'Unlimited',lpcSetCap:'Set maximum',lpcThisCampaign:'This campaign',lpcCampaignCap:'Campaign ceiling',
  lpcCapsDormant:'Caps do not restrict free flow. Values are saved for when project pace control is enabled.',
  lpcCapsShared:'Uncapped campaigns can use all remaining project capacity. Set every maximum to protect the others.',
  lpcUnusedCapacity:'Campaign caps leave {n} project places unused per cycle.',lpcCompetitiveCaps:'Caps total {sum}, above the project limit of {total}: campaigns compete for remaining places.',lpcBalancedCaps:'Caps allocate the full project limit: {total} per cycle.',
  lpcLoading:'Loading shared project settings…',lpcApply:'Apply to project',lpcSaveConflict:'Settings changed or could not be saved. Close this window and review the current values.',
  lpcDetails:'Details',lpcCheckpointCount:'D1 + {n} CPs',lpcReviewTag:'Review',lpcCapTag:'Up to {n}/cycle',lpcRate:'Rate: {n} $BUST / tester · {days} paid checkpoints',lpcIcon:'Campaign icon',
  lpcStatusLoading:'Checking project status…',lpcStatusIdle:'⚪ No active campaigns',lpcStatusPaused:'🛡 Paused until {time} · mutuals queued',lpcStatusClosed:'⏸ New participant intake closed',lpcStatusOpen:'🟢 Intake open · {used} of {total} today',lpcStatusFree:'🟢 Intake open · free flow',lpcStatusDeficit:'⚠️ {n} more participants needed before cycle end',lpcPaceShort:'⚠️ Pace below the daily norm (−{count})',
  lpcCycleLimit:'This campaign has reached its cap for the current cycle.',lpcCycleWaiting:'Cycle {used}/{n} · waiting',lpcDuplicate:'This tester already participates in the project’s current Live period.'
 });
})();
