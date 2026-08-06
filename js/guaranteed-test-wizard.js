/* =========================================================
   GUARANTEED CLOSED TEST WIZARD - 3-SCREEN MODULE
   Step 1 of 2: App Details
   Step 2 of 2: Testing Link
   Final Step: Payment (+ stepper flow per method)
   ========================================================= */

(function () {
    'use strict';

    var SETUP_LICENSE_GUIDE_URL = "https://t.me/googleplay_console_12testers/31/2885";
    var GENERAL_TESTING_GUIDE_URL = "https://telegra.ph/Action-Required-Add-Testing-Group-to-Start-Closed-Testing-06-04";
    var PLAY_CONSOLE_URL = "https://play.google.com/console/";
    var LICENSE_GUIDE_SETTINGS_IMG = "./images/Settings_l.png";
    var LICENSE_GUIDE_RESPONSE_IMG = "./images/RESPOND_NORMALY_l.png";
    var TESTING_GUIDE_GROUP_IMG = "./images/Group.png";
    var TESTING_GUIDE_COUNTRIES_IMG = "./images/Countries.png";
    var TESTING_GUIDE_REVIEW_IMG = "./images/Review.png";
    var PASTE_ICON_SRC = "./images/content_paste_go_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.png";
    var TESTER_GROUP_EMAIL = "google-play-dev-test@googlegroups.com";
    var PAYPAL_EMAIL = "pay.hubstation@gmail.com";
    var TELEGRAM_SUPPORT = "garantxchange";
    var PAYPAL_OPEN_URL = "https://www.paypal.com/myaccount/transfer/homepage/pay";

    var CRYPTO_EXCHANGES = [
        { id: 'binance', name: 'Binance', label: 'ID', value: '967321648', initials: 'BN', logo: './images/Binance.webp' },
        { id: 'bybit', name: 'ByBit', label: 'UID', value: '30291060', initials: 'BY', logo: './images/Bybit.webp' },
        { id: 'okx', name: 'OKX', label: 'UID', value: '323906492761830368', initials: 'OK', logo: './images/OKX.webp' },
        { id: 'htx', name: 'HTX', label: 'UID', value: '442101593', initials: 'HT', logo: './images/HTX.webp' },
        { id: 'gate', name: 'Gate', label: 'UID', value: '8536355', initials: 'GT', logo: './images/Gate.webp' }
    ];
    var FIAT_CURRENCIES = [
        { code: 'TRY', en: 'Turkey (Lira)', ru: 'Турция (Лира)' },
        { code: 'BYN', en: 'Belarus (Belarusian ruble)', ru: 'Беларусь (Бел. рубль)' },
        { code: 'KZT', en: 'Kazakhstan (Tenge)', ru: 'Казахстан (Тенге)' },
        { code: 'KGS', en: 'Kyrgyzstan (Som)', ru: 'Кыргызстан (Сом)' },
        { code: 'VND', en: 'Vietnam (Dong)', ru: 'Вьетнам (Донг)' },
        { code: 'RUB', en: 'Russia (Ruble)', ru: 'Россия (Рубль)' }
    ];

    /* [en, ru] copy for every user-visible string of the paid flow. */
    var COPY = {
        headerTitle: ['Private Testing', 'Приватное тестирование'],
        stepOf: ['Step {n} of 2', 'Шаг {n} из 2'],
        paymentStep: ['Payment', 'Оплата'],
        back: ['Back', 'Назад'],
        next: ['Next', 'Далее'],
        close: ['Close', 'Закрыть'],
        cancel: ['Cancel', 'Отмена'],
        gotIt: ['Got it', 'Понятно'],
        copy: ['Copy', 'Копировать'],
        copied: ['Copied', 'Скопировано'],
        paste: ['Paste from clipboard', 'Вставить из буфера'],
        pasteFailed: ['Could not read clipboard. Paste manually.', 'Не удалось прочитать буфер. Вставьте вручную.'],
        clear: ['Clear', 'Очистить'],

        autoFill: ['From project', 'Из проекта'],
        manualInput: ['Manual input', 'Ручной ввод'],
        autoFillHint: ['Project data is used', 'Используются данные проекта'],
        manualHint: ['You fill the fields yourself', 'Вы заполняете поля сами'],

        appNameLabel: ['App name', 'Название приложения'],
        appNamePlaceholder: ['For example, Focus Timer', 'Например, Focus Timer'],
        appNameHelper: ['Exactly as it appears in Google Play Console.', 'Точно так, как оно указано в Google Play Console.'],
        appNameRequired: ['Enter the app name to continue.', 'Укажите название приложения, чтобы продолжить.'],
        appTypeLabel: ['App type', 'Тип приложения'],
        freeApp: ['Free', 'Бесплатное'],
        paidApp: ['Paid', 'Платное'],
        confirmDetails: [
            'I confirm the <strong>name</strong> and <strong>type</strong> of the app are correct.',
            'Подтверждаю, что <strong>название</strong> и <strong>тип</strong> приложения указаны верно.'
        ],
        confirmDetailsWarn: ['Confirm the prefilled details.', 'Подтвердите заполненные данные.'],
        continue: ['Continue', 'Продолжить'],

        licenseTitle: ['License Testing setup', 'Настройка License Testing'],
        licenseSubtitle: [
            'Lets testers install a paid app without paying for it.',
            'Позволяет тестировщикам установить платное приложение без покупки.'
        ],
        licenseDesc: [
            'Testers cannot install paid apps for free unless they are added to <strong>License Testing</strong>. This lets our team download and test the app without creating a sale.',
            'Без добавления в <strong>License Testing</strong> тестировщики не смогут бесплатно установить платное приложение. Эта настройка позволяет команде скачать и протестировать приложение без реальной покупки.'
        ],
        licenseStep1: ['Open <strong>Settings → License testing</strong>', 'Откройте <strong>Settings → License testing</strong>'],
        licenseStep2: ['Choose <strong>Google Groups</strong> as tester type', 'Выберите тип тестировщиков <strong>Google Groups</strong>'],
        licenseStep3: ['Add <strong>{email}</strong>', 'Добавьте <strong>{email}</strong>'],
        licenseStep3Short: ['Add our tester group email:', 'Добавьте почту нашей группы тестировщиков:'],
        licenseStep4: ['Keep <strong>RESPOND_NORMALLY</strong> and save', 'Оставьте <strong>RESPOND_NORMALLY</strong> и сохраните'],
        setupGuide: ['Setup guide', 'Инструкция по настройке'],

        linkLabel: ['Testing link', 'Ссылка на тестирование'],
        linkPlaceholder: ['https://play.google.com/apps/testing/com.example.app', 'https://play.google.com/apps/testing/com.example.app'],
        linkHelper: [
            'The “Join on Android” link from Play Console.',
            'Ссылка «Join on Android» из Play Console.'
        ],
        linkRequired: ['Add the testing link to continue.', 'Добавьте ссылку на тестирование, чтобы продолжить.'],
        linkInvalid: [
            'Enter a valid Play Console link (play.google.com/apps/testing/…).',
            'Введите корректную ссылку Play Console (play.google.com/apps/testing/…).'
        ],
        linkCheck: ['Link check', 'Проверка ссылки'],
        linkCheckNote: [
            'Check the package ID carefully — a mistake delays the whole testing cycle.',
            'Внимательно проверьте Package ID — ошибка задержит весь цикл тестирования.'
        ],
        confirmLink: ['I confirm the testing link is correct.', 'Подтверждаю, что ссылка на тестирование верна.'],
        confirmLinkWarn: ['Confirm the prefilled link.', 'Подтвердите заполненную ссылку.'],

        checklistLead: [
            'Confirm that Play Console is already configured for this project:',
            'Подтвердите, что Play Console уже настроен для этого проекта:'
        ],
        checklistEmail: [
            'The DevTestHub group is added in Play Console',
            'Группа DevTestHub добавлена в Play Console'
        ],
        checklistEmailNote1: ['Tester type: Google Groups', 'Тип тестировщиков: Google Groups'],
        checklistEmailNote2: ['Added: {email}', 'Добавлено: {email}'],
        checklistCountries: ['All countries are enabled', 'Выбраны все страны'],
        checklistReview: ['Changes are sent for review', 'Изменения отправлены на проверку'],
        checklistRequired: [
            'Confirm every Play Console item, including the DevTestHub Google Group.',
            'Отметьте все пункты настройки Play Console, включая Google-группу DevTestHub.'
        ],

        howToSetUp: ['How to set it up', 'Как настроить'],
        instr1Title: ['Add testers', 'Добавьте тестировщиков'],
        instr1Text: [
            'Open <strong>Closed testing → Testers</strong> and add this Google Group:',
            'Откройте <strong>Closed testing → Testers</strong> и добавьте эту Google-группу:'
        ],
        instr2Title: ['Enable countries', 'Включите страны'],
        instr2Text: [
            'In <strong>Countries / regions</strong> enable <strong>all countries</strong> so testers worldwide can join.',
            'В разделе <strong>Countries / regions</strong> включите <strong>все страны</strong>, чтобы тестировщики могли подключиться из любой точки.'
        ],
        instr3Title: ['Send for review', 'Отправьте на проверку'],
        instr3Text: [
            'Press <strong>“Send changes for review”</strong> in Play Console.',
            'Нажмите <strong>«Send changes for review»</strong> в Play Console.'
        ],
        instr3Note: [
            'You can submit the order while the review is pending — it usually takes a few minutes.',
            'Заявку можно отправить, не дожидаясь проверки — обычно она занимает несколько минут.'
        ],
        instrLinkTitle: ['Your testing link', 'Ваша Ссылка на Тестирование!'],
        instrLinkText: [
            'Find <strong>“How testers join your test”</strong> and copy the <strong>“Join on Android”</strong> link.',
            'Найдите блок <strong>«How testers join your test»</strong> и скопируйте ссылку <strong>«Join on Android»</strong>.'
        ],
        guideCardTitle: ['Testing guide', 'Гайд по тестированию'],
        guideCardDesc: ['Full setup walkthrough', 'Полная инструкция по настройке'],
        proceedPayment: ['Proceed to payment', 'Перейти к оплате'],

        planLabel: ['Your plan', 'Ваш тариф'],
        planTitle: ['Production Access Sprint', 'Спринт до production-доступа'],
        planPriceNote: ['official price · crypto', 'официальная цена · крипто'],
        planFeature1: ['<strong>12 real testers</strong> connected within 12 hours', '<strong>12 реальных тестировщиков</strong> подключаются в течение 12 часов'],
        planFeature2: ['<strong>14 days</strong> of continuous closed testing', '<strong>14 дней</strong> непрерывного закрытого тестирования'],
        planFeature3: ['<strong>Support</strong> with the production application', '<strong>Помощь</strong> с заявкой на production'],
        guaranteeTitle: ['Access guarantee', 'Гарантия доступа'],
        guaranteeText: [
            'We stay with you until the app is ready for the production review.',
            'Мы ведем проект, пока приложение не будет готово к заявке на production.'
        ],

        methodLabel: ['Payment method', 'Способ оплаты'],
        methodCrypto: ['Crypto transfer', 'Криптоперевод'],
        methodPaypal: ['PayPal', 'PayPal'],
        methodFiat: ['Bank / local currency', 'Банк / местная валюта'],
        badgeRecommended: ['Recommended', 'Рекомендуем'],
        badgeFee: ['+$3 fee', '+$3 комиссия'],
        hintCrypto: ['Choose an exchange', 'Выберите биржу'],
        hintSteps: ['Tap to open the payment steps', 'Нажмите, чтобы открыть шаги оплаты'],
        selectMethod: ['Select a payment method', 'Выберите способ оплаты'],
        selectExchange: ['Select an exchange', 'Выберите биржу'],
        openSteps: ['Payment steps · ${amount}', 'Шаги оплаты · ${amount}'],
        priceBase: ['$20', '$20'],
        priceFeeExtra: ['+$3', '+$3'],
        amountDueWithFee: [
            '$20 + $3 fee = $23',
            '$20 + комиссия $3 = $23'
        ],

        flowCryptoTitle: ['Crypto transfer · {name}', 'Криптоперевод · {name}'],
        flowCryptoSubtitle: ['Send ${amount} as an internal transfer.', 'Отправьте ${amount} внутренним переводом.'],
        flowCryptoStep: ['Internal transfer', 'Внутренний перевод'],
        flowCryptoDesc: [
            'Copy the {label} and send an internal transfer inside the exchange — not an on-chain withdrawal.',
            'Скопируйте {label} и отправьте внутренний перевод внутри биржи — не вывод в сеть.'
        ],
        flowPaypalTitle: ['PayPal transfer', 'Перевод через PayPal'],
        flowPaypalSubtitle: [
            'Service $20 + $3 fee. Send $23 to our PayPal account.',
            'Услуга $20 + комиссия $3. Отправьте $23 на наш PayPal.'
        ],
        flowPaypalStep: ['Copy the address and pay', 'Скопируйте адрес и оплатите'],
        flowPaypalDesc: [
            'Copy the email, open PayPal and complete the transfer of $23 ($20 + $3 fee).',
            'Скопируйте почту, откройте PayPal и переведите $23 ($20 + комиссия $3).'
        ],
        openPaypal: ['Open PayPal', 'Открыть PayPal'],
        flowFiatTitle: ['Bank / local currency', 'Банк / местная валюта'],
        flowFiatSubtitle: [
            'Service $20 + $3 fee. The manager will convert $23 into your local currency.',
            'Услуга $20 + комиссия $3. Менеджер пересчитает $23 в вашу местную валюту.'
        ],
        flowFiatStep: ['Get the payment details', 'Получите реквизиты'],
        flowFiatDesc: [
            'Choose your currency and bank before contacting the manager.',
            'Выберите валюту и банк перед обращением к менеджеру.'
        ],
        fiatBankLabel: ['Your bank', 'Ваш банк'],
        fiatBankPlaceholder: ['Ziraat, Kaspi, T-Bank…', 'Ziraat, Kaspi, Т-Банк…'],
        fiatPersonal: ['Paying from a personal account', 'Оплачиваю с личного счета'],
        fiatTip: [
            '💡 The manager converts $20 + $3 fee ($23) into your currency at the current rate and sends the exact amount with payment details in chat.',
            '💡 Менеджер пересчитает $20 + комиссию $3 ($23) в вашу валюту по текущему курсу и пришлёт точную сумму и реквизиты в чате.'
        ],
        fiatGetRequisites: ['Get payment details', 'Получить реквизиты'],
        fiatRequisitesRequested: ['Details requested', 'Реквизиты запрошены'],
        fiatWaitingTitle: [
            'Waiting for payment details',
            'Ожидаем реквизиты'
        ],
        fiatWaitingDesc: [
            'We opened a chat with the manager. After you receive the details and pay, upload the screenshot below.',
            'Мы открыли чат с менеджером. Когда получите реквизиты и оплатите — загрузите скриншот ниже.'
        ],
        fiatMissing: ['Choose a currency and enter your bank name.', 'Выберите валюту и укажите название банка.'],
        fiatCreating: ['Requesting details…', 'Запрашиваем реквизиты…'],
        fiatCreateFailed: ['Could not request payment details. Please try again.', 'Не удалось запросить реквизиты. Попробуйте ещё раз.'],
        fiatToastRequested: [
            'Opening chat with the manager…',
            'Открываем чат с менеджером…'
        ],
        fiatPersonalYes: ['Yes', 'Да'],
        fiatPersonalNo: ['No', 'Нет'],
        fiatDmMessage: [
            'Hello! I want to pay for Private Testing ($20).\n📌 Order: #{code} ({app})\n💳 Payment currency: {currency}\n🏦 My bank: {bank}\n👤 Payment from personal account: {personal}\n💰 Amount with fee: $23 (need equivalent in {currency})\n\nPlease calculate the exact amount in {currency} and send the payment details.',
            'Здравствуйте! Хочу оплатить Приватное тестирование ($20).\n📌 Заказ: #{code} ({app})\n💳 Валюта оплаты: {currency}\n🏦 Мой банк: {bank}\n👤 Оплата с личного счета: {personal}\n💰 Сумма с комиссией: $23 (нужен эквивалент в {currency})\n\nПожалуйста, рассчитайте точную сумму в {currency} и выдайте реквизиты.'
        ],

        uploadStepTitle: ['Payment screenshot', 'Скриншот оплаты'],
        uploadStepDesc: ['Attach proof of the completed transfer.', 'Приложите подтверждение выполненного перевода.'],
        uploadCta: ['Upload screenshot', 'Загрузить скриншот'],
        uploadedTitle: ['Screenshot uploaded', 'Скриншот загружен'],
        uploadedSubtitle: ['Tap ✕ to replace it', 'Нажмите ✕, чтобы заменить'],
        submitOrder: ['Submit order · ${amount}', 'Отправить заявку · ${amount}'],
        submitting: ['Sending…', 'Отправляем…'],
        submitFallback: ['Submit order', 'Отправить заявку'],
        toastSubmitted: [
            'Order {code} submitted. The confirmation will arrive in Telegram.',
            'Заявка {code} отправлена. Подтверждение придет в Telegram.'
        ],
        toastFailed: ['Could not create the order. Please try again.', 'Не удалось создать заявку. Попробуйте еще раз.'],
        toastProofFailed: ['Could not attach the payment proof. Please try again.', 'Не удалось прикрепить подтверждение оплаты. Попробуйте еще раз.'],
        cryptoCopiedToast: [
            'Copied. Make the transfer in {name}, then come back and upload the screenshot.',
            'Скопировано. Сделайте перевод в {name}, затем вернитесь и загрузите скриншот.'
        ],
        cryptoPopupTitle: ['Transfer in {name}', 'Перевод в {name}'],
        cryptoPopupText: [
            'The ID is copied. Complete the transfer inside {name} and come back to upload the payment screenshot.',
            'ID скопирован. Завершите перевод в {name} и вернитесь, чтобы загрузить скриншот оплаты.'
        ],
        cryptoPopupStay: ['Stay here', 'Остаться'],
        cryptoPopupGo: ['Go to Telegram', 'В Telegram'],
        selectedExchange: ['the selected exchange', 'выбранной бирже'],

        guidePageTitle: ['License Testing, step by step', 'License Testing: пошаговая настройка'],
        guidePageSubtitle: [
            'For paid apps and in-app purchases, configure License Testing so testers install without real charges.',
            'Для платных приложений и встроенных покупок настройте License Testing, чтобы тестировщики устанавливали приложение без реальных списаний.'
        ],
        guideOpenConsole: ['Open Play Console', 'Открыть Play Console'],
        guideShowScreenshot: ['Show screenshot', 'Показать скриншот'],
        guideHideScreenshot: ['Hide screenshot', 'Скрыть скриншот'],
        guideShotPageLabel: [
            'Next 4 actions are on the same License testing page',
            'Следующие 4 действия — на одной странице License testing'
        ],
        guide1Title: ['Open Google Play Console', 'Откройте Google Play Console'],
        guide1Text: ['Go to your app dashboard.', 'Перейдите на дашборд приложения.'],
        guide2Title: ['Settings → License testing', 'Settings → License testing'],
        guide2Text: ['Open the section in the left menu.', 'Откройте раздел в левом меню.'],
        guide3Title: ['Choose Google Groups', 'Выберите Google Groups'],
        guide3Text: ['Select <strong>Google Groups</strong>, not Email lists.', 'Выберите <strong>Google Groups</strong>, а не Email lists.'],
        guide4Title: ['Add the group email', 'Добавьте почту группы'],
        guide4Text: ['Enter our group email and press Enter:', 'Введите почту нашей группы и нажмите Enter:'],
        guide5Title: ['Keep the default response', 'Оставьте ответ по умолчанию'],
        guide5Text: ['Under License response keep <strong>RESPOND_NORMALLY</strong>.', 'В License response оставьте <strong>RESPOND_NORMALLY</strong>.'],
        guide6Title: ['Save the changes', 'Сохраните изменения'],
        guide6Text: ['Press <strong>Save changes</strong> at the bottom of the page.', 'Нажмите <strong>Save changes</strong> внизу страницы.']
    };

    var wizardState = {
        step: 1,
        appName: '',
        appType: 'free',
        licenseTestingConfirmed: false,
        testingLink: '',
        paymentMethod: null,
        paymentExchange: null,
        paymentStep1Done: false,
        paymentScreenshotUrl: '',
        paymentScreenshotFile: null,
        fiatCurrency: '',
        fiatBankName: '',
        fiatPersonalAccount: true,
        fiatOrderId: null,
        fiatPublicCode: '',
        prefillProject: null,
        detailsConfirmed: false,
        linkConfirmed: false,
        prefillStep1Active: false,
        prefillStep2Active: false,
        consoleChecklist: { email: false, countries: false, review: false }
    };

    function getDefaultWizardState() {
        return {
            step: 1,
            appName: '',
            appType: 'free',
            licenseTestingConfirmed: false,
            testingLink: '',
            paymentMethod: null,
            paymentExchange: null,
            paymentStep1Done: false,
            paymentScreenshotUrl: '',
            paymentScreenshotFile: null,
            fiatCurrency: '',
            fiatBankName: '',
            fiatPersonalAccount: true,
            fiatOrderId: null,
            fiatPublicCode: '',
            prefillProject: null,
            detailsConfirmed: false,
            linkConfirmed: false,
            prefillStep1Active: false,
            prefillStep2Active: false,
            consoleChecklist: { email: false, countries: false, review: false }
        };
    }

    var GT_DRAFT_STORAGE_KEY = 'dt_gt_wizard_draft';
    var GT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

    function readGuaranteedTestWizardDraft() {
        try {
            var raw = localStorage.getItem(GT_DRAFT_STORAGE_KEY);
            if (!raw) return null;
            var draft = JSON.parse(raw);
            if (!draft || typeof draft !== 'object') {
                localStorage.removeItem(GT_DRAFT_STORAGE_KEY);
                return null;
            }
            var ts = Number(draft.timestamp || 0);
            if (!Number.isFinite(ts) || (Date.now() - ts) > GT_DRAFT_TTL_MS) {
                localStorage.removeItem(GT_DRAFT_STORAGE_KEY);
                return null;
            }
            if (!String(draft.app_name || '').trim()) {
                localStorage.removeItem(GT_DRAFT_STORAGE_KEY);
                return null;
            }
            return draft;
        } catch (_) {
            try { localStorage.removeItem(GT_DRAFT_STORAGE_KEY); } catch (e) {}
            return null;
        }
    }

    function clearGuaranteedTestWizardDraft() {
        try { localStorage.removeItem(GT_DRAFT_STORAGE_KEY); } catch (_) {}
    }

    function persistGuaranteedTestWizardDraft() {
        var appName = String(wizardState.appName || '').trim();
        if (!appName) return;
        var step = Number(wizardState.step || 1);
        if (!Number.isFinite(step) || step < 1) step = 1;
        if (step > 3) step = 3;
        var draft = {
            step: step,
            app_name: appName,
            app_type: wizardState.appType === 'paid' ? 'paid' : 'free',
            license_testing_confirmed: !!wizardState.licenseTestingConfirmed,
            testing_link: String(wizardState.testingLink || '').trim(),
            payment_method: wizardState.paymentMethod || null,
            payment_exchange: wizardState.paymentExchange || null,
            payment_step1_done: !!wizardState.paymentStep1Done,
            payment_screenshot_url: String(wizardState.paymentScreenshotUrl || '').trim(),
            fiat_currency: String(wizardState.fiatCurrency || '').trim(),
            selected_bank: String(wizardState.fiatBankName || '').trim(),
            is_personal_account: wizardState.fiatPersonalAccount !== false,
            fiat_order_id: wizardState.fiatOrderId || null,
            fiat_public_code: String(wizardState.fiatPublicCode || '').trim(),
            details_confirmed: !!wizardState.detailsConfirmed,
            link_confirmed: !!wizardState.linkConfirmed,
            console_checklist: {
                email: !!(wizardState.consoleChecklist && wizardState.consoleChecklist.email),
                countries: !!(wizardState.consoleChecklist && wizardState.consoleChecklist.countries),
                review: !!(wizardState.consoleChecklist && wizardState.consoleChecklist.review)
            },
            prefill_project_id: wizardState.prefillProject ? Number(wizardState.prefillProject.id || 0) : 0,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(GT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (_) {}
    }

    function applyGuaranteedTestWizardDraft(draft) {
        if (!draft) return false;
        resetWizardState(false);
        wizardState.appName = String(draft.app_name || '').trim();
        wizardState.appType = draft.app_type === 'paid' ? 'paid' : 'free';
        wizardState.licenseTestingConfirmed = !!draft.license_testing_confirmed;
        wizardState.testingLink = String(draft.testing_link || '').trim();
        wizardState.paymentMethod = draft.payment_method || null;
        wizardState.paymentExchange = draft.payment_exchange || null;
        wizardState.paymentStep1Done = !!draft.payment_step1_done;
        wizardState.paymentScreenshotUrl = String(draft.payment_screenshot_url || '').trim();
        wizardState.fiatCurrency = String(draft.fiat_currency || '').trim();
        wizardState.fiatBankName = String(draft.selected_bank || '').trim();
        wizardState.fiatPersonalAccount = draft.is_personal_account !== false;
        wizardState.fiatOrderId = draft.fiat_order_id || null;
        wizardState.fiatPublicCode = String(draft.fiat_public_code || '').trim();
        wizardState.detailsConfirmed = !!draft.details_confirmed;
        wizardState.linkConfirmed = !!draft.link_confirmed;
        wizardState.consoleChecklist = {
            email: !!(draft.console_checklist && draft.console_checklist.email),
            countries: !!(draft.console_checklist && draft.console_checklist.countries),
            review: !!(draft.console_checklist && draft.console_checklist.review)
        };
        var prefillId = Number(draft.prefill_project_id || 0);
        if (prefillId > 0) {
            var project = resolveProjectById(prefillId);
            if (project) {
                wizardState.prefillProject = project;
                wizardState.prefillStep1Active = false;
                wizardState.prefillStep2Active = false;
            }
        }
        var step = Number(draft.step || 1);
        if (!Number.isFinite(step) || step < 1) step = 1;
        if (step > 3) step = 3;
        wizardState.step = step;
        return true;
    }

    function resumeGuaranteedTestWizardFromDraft() {
        var draft = readGuaranteedTestWizardDraft();
        if (!draft || !applyGuaranteedTestWizardDraft(draft)) return false;
        ensureWizardInDOM();
        syncStep1FormFromState();
        syncStep2FormFromState();
        hideGuaranteedTestWizardStep1();
        hideGuaranteedTestWizardStep2();
        hideGuaranteedTestWizardPayment();
        if (wizardState.step >= 3) {
            showGuaranteedTestWizardPayment({ keepState: true });
        } else if (wizardState.step === 2) {
            showGuaranteedTestWizardStep2();
        } else {
            showGuaranteedTestWizardStep1({ keepState: true });
        }
        return true;
    }

    function projectUsesStandardGoogleGroup(project) {
        if (!project) return false;
        var testMode = String(project.test_mode || 'google_group').toLowerCase();
        if (testMode === 'email_list') return false;
        var groupUrl = String(project.google_group_url || '').trim();
        if (window.AccessSetupManager && typeof window.AccessSetupManager.isDefaultGroup === 'function') {
            if (!groupUrl) return true;
            return window.AccessSetupManager.isDefaultGroup(groupUrl);
        }
        var defaultUrl = 'https://groups.google.com/g/google-play-dev-test';
        var normalize = function (url) {
            return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
        };
        return normalize(groupUrl || defaultUrl) === normalize(defaultUrl);
    }

    function shouldShowProjectConsoleChecklist() {
        return !!(wizardState.prefillProject && projectUsesStandardGoogleGroup(wizardState.prefillProject));
    }

    function resetWizardState(keepPrefill) {
        var prefill = keepPrefill ? wizardState.prefillProject : null;
        var next = getDefaultWizardState();
        if (prefill) {
            next.prefillProject = prefill;
            applyProjectPrefillToState(next, prefill);
        }
        Object.keys(next).forEach(function (key) {
            wizardState[key] = next[key];
        });
    }

    function buildTestingLinkFromPackage(packageName) {
        var pkg = String(packageName || '').trim();
        if (!pkg) return '';
        return 'https://play.google.com/apps/testing/' + pkg;
    }

    function applyProjectPrefillToState(state, project) {
        if (!project) return;
        state.appName = String(project.name || '').trim();
        state.testingLink = buildTestingLinkFromPackage(project.package || project.package_name || '');
        state.prefillProject = project;
        state.detailsConfirmed = false;
        state.linkConfirmed = false;
        state.prefillStep1Active = true;
        state.prefillStep2Active = true;
        state.consoleChecklist = { email: false, countries: false, review: false };
    }

    function applyProjectPrefill(project) {
        applyProjectPrefillToState(wizardState, project);
    }

    function setPrefillStep1Active(active) {
        if (!wizardState.prefillProject) {
            wizardState.prefillStep1Active = false;
            return;
        }
        wizardState.prefillStep1Active = !!active;
        if (wizardState.prefillStep1Active) {
            wizardState.appName = String(wizardState.prefillProject.name || '').trim();
            wizardState.detailsConfirmed = false;
            var input = document.getElementById('gtw-app-name-input');
            if (input) input.value = wizardState.appName;
        }
    }

    function setPrefillStep2Active(active) {
        if (!wizardState.prefillProject) {
            wizardState.prefillStep2Active = false;
            return;
        }
        wizardState.prefillStep2Active = !!active;
        if (wizardState.prefillStep2Active) {
            wizardState.testingLink = buildTestingLinkFromPackage(wizardState.prefillProject.package || wizardState.prefillProject.package_name || '');
            wizardState.linkConfirmed = false;
            var input = document.getElementById('gtw-link-input');
            if (input) input.value = wizardState.testingLink;
            updateLinkVerificationUI();
        }
    }

    function syncPrefillToggleUI(step, active) {
        var badge = document.getElementById('gtw-prefill-badge-step' + step);
        var hint = document.getElementById('gtw-prefill-hint-step' + step);
        if (badge) {
            badge.textContent = active ? L('autoFill') : L('manualInput');
        }
        if (hint) {
            hint.textContent = active ? L('autoFillHint') : L('manualHint');
        }
    }

    function isValidTestingLink(url) {
        var value = String(url || '').trim();
        if (!value || !/^https?:\/\//i.test(value)) return false;
        if (/play\.google\.com\/apps\/testing\//i.test(value)) return true;
        if (/play\.google\.com\/store\/apps\/details/i.test(value) && /[?&]id=[\w.]+/i.test(value)) return true;
        return false;
    }

    function normalizeTestingLink(url) {
        var value = String(url || '').trim();
        if (/play\.google\.com\/store\/apps\/details/i.test(value)) {
            var match = value.match(/[?&]id=([\w.]+)/i);
            if (match && match[1]) {
                return 'https://play.google.com/apps/testing/' + match[1];
            }
        }
        return value;
    }

    function getPaymentBaseAmount() {
        return 20;
    }

    function getPaymentFee(method) {
        return (method === 'paypal' || method === 'rub') ? 3 : 0;
    }

    function getPaymentAmount(method) {
        return getPaymentBaseAmount() + getPaymentFee(method);
    }

    function buildFiatManagerMessage(orderCode, currencyCode, bankName) {
        return L('fiatDmMessage', {
            code: orderCode,
            app: String(wizardState.appName || '').trim(),
            currency: currencyCode,
            bank: bankName,
            personal: wizardState.fiatPersonalAccount ? L('fiatPersonalYes') : L('fiatPersonalNo')
        });
    }

    function openFiatManagerChat(orderCode, currencyCode, bankName) {
        openTelegramContact(buildFiatManagerMessage(orderCode, currencyCode, bankName));
    }

    function getWizardLang() {
        return String(window.currentLang || (document.documentElement && document.documentElement.lang) || 'en').toLowerCase().indexOf('ru') === 0
            ? 'ru'
            : 'en';
    }

    function fiatCopy(en, ru) {
        return getWizardLang() === 'ru' ? ru : en;
    }

    function L(key, vars) {
        var pair = COPY[key];
        if (!pair) return '';
        var text = getWizardLang() === 'ru' ? pair[1] : pair[0];
        if (vars) {
            Object.keys(vars).forEach(function (name) {
                text = text.split('{' + name + '}').join(String(vars[name]));
            });
        }
        return text;
    }

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = String(value || '');
        return div.innerHTML;
    }

    function getFiatCurrency(code) {
        return FIAT_CURRENCIES.find(function (currency) { return currency.code === code; }) || null;
    }

    /* =========================================================
       STEP 1 OF 2 HTML (App Details)
       ========================================================= */

    function createWizardStep1HTML() {
        return `
        <div id="guaranteed-test-wizard-step1-overlay" class="gtw-overlay" style="display: none;" data-gtw-wizard="v2">
            <div class="gtw-header">
                <button type="button" class="gtw-back-btn" id="gtw-step1-back-btn" aria-label="${L('back')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <button type="button" class="gtw-forward-btn" id="gtw-step1-forward-btn" aria-label="${L('next')}" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
                <h1 class="gtw-header-title">${L('headerTitle')}</h1>
                <p class="gtw-header-subtitle">${L('stepOf', { n: 1 })}</p>
                <div class="gtw-progress-bar">
                    <div class="gtw-progress-step active"></div>
                    <div class="gtw-progress-step inactive"></div>
                </div>
            </div>

            <div class="gtw-body">
                <div class="gtw-prefill-row" id="gtw-prefill-row-step1" style="display: none;">
                    <span class="gtw-prefill-hint" id="gtw-prefill-hint-step1"></span>
                    <button type="button" id="gtw-prefill-badge-step1" class="gtw-prefill-badge">${L('autoFill')}</button>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label" for="gtw-app-name-input">${L('appNameLabel')}</label>
                    <div class="gtw-input-wrapper">
                        <input type="text" id="gtw-app-name-input" class="gtw-input" placeholder="${L('appNamePlaceholder')}" autocomplete="off" />
                        <button type="button" class="gtw-paste-btn" id="gtw-paste-appname-btn" title="${L('paste')}">
                            <img src="${PASTE_ICON_SRC}" alt="" class="gtw-paste-icon" width="20" height="20" draggable="false" />
                        </button>
                    </div>
                    <div class="gtw-helper-text" id="gtw-appname-helper">${L('appNameHelper')}</div>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label">${L('appTypeLabel')}</label>
                    <div class="gtw-type-grid">
                        <div class="gtw-type-card selected-free" id="gtw-type-free" data-type="free">
                            <svg class="gtw-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
                            </svg>
                            <span class="gtw-type-title">${L('freeApp')}</span>
                        </div>

                        <div class="gtw-type-card" id="gtw-type-paid" data-type="paid">
                            <svg class="gtw-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            <span class="gtw-type-title">${L('paidApp')}</span>
                        </div>
                    </div>

                    <div id="gtw-inline-license-block" class="gtw-inline-card" style="display: none;">
                        <h3 class="gtw-inline-title">${L('licenseTitle')}</h3>
                        <p class="gtw-inline-subtitle">${L('licenseSubtitle')}</p>
                        <p class="gtw-inline-desc">${L('licenseDesc')}</p>
                        <ul class="gtw-inline-list">
                            <li>${L('licenseStep1')}</li>
                            <li>${L('licenseStep2')}</li>
                            <li>${L('licenseStep3', { email: TESTER_GROUP_EMAIL })}</li>
                            <li>${L('licenseStep4')}</li>
                        </ul>
                        <button type="button" class="gtw-inline-guide-btn" id="gtw-inline-guide-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                            <span>${L('setupGuide')}</span>
                        </button>
                    </div>
                </div>

                <label class="gtw-confirm-row" id="gtw-details-confirm-row" style="display: none;">
                    <input type="checkbox" id="gtw-details-confirm-checkbox" />
                    <span class="gtw-confirm-label-wrap">
                        <span class="gtw-confirm-label">${L('confirmDetails')}</span>
                        <span class="gtw-confirm-warning" id="gtw-details-confirm-warning" style="display: none;">${L('confirmDetailsWarn')}</span>
                    </span>
                </label>
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-step1-continue-btn">${L('continue')}</button>
                </div>
            </div>

            <div id="gtw-license-modal-overlay" class="gtw-modal-overlay" style="display: none;">
                <div class="gtw-modal-card">
                    <h3 class="gtw-modal-title">${L('licenseTitle')}</h3>
                    <p class="gtw-modal-desc">${L('licenseSubtitle')}</p>
                    <div class="gtw-modal-steps">
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">1</span>
                            <span class="gtw-step-text">${L('licenseStep1')}</span>
                        </div>
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">2</span>
                            <span class="gtw-step-text">${L('licenseStep2')}</span>
                        </div>
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">3</span>
                            <div class="gtw-step-content">
                                <span class="gtw-step-text">${L('licenseStep3Short')}</span>
                                <div class="gtw-copy-box">
                                    <span class="gtw-copy-email" id="gtw-modal-email">${TESTER_GROUP_EMAIL}</span>
                                    <button type="button" class="gtw-copy-btn" id="gtw-modal-copy-btn" title="${L('copy')}">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">4</span>
                            <span class="gtw-step-text">${L('licenseStep4')}</span>
                        </div>
                    </div>
                    <button type="button" class="gtw-guide-btn" id="gtw-modal-guide-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        <span>${L('setupGuide')}</span>
                    </button>
                    <div class="gtw-modal-actions">
                        <button type="button" class="gtw-modal-cancel-btn" id="gtw-modal-cancel-btn">${L('cancel')}</button>
                        <button type="button" class="gtw-modal-confirm-btn" id="gtw-modal-confirm-btn">${L('gotIt')}</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function createLicenseGuideOverlayHTML() {
        var externalIcon =
            '<svg class="gtw-guide-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
                '<polyline points="15 3 21 3 21 9"></polyline>' +
                '<line x1="10" y1="14" x2="21" y2="3"></line>' +
            '</svg>';
        var imageIcon =
            '<svg class="gtw-guide-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>' +
                '<circle cx="8.5" cy="8.5" r="1.5"></circle>' +
                '<polyline points="21 15 16 10 5 21"></polyline>' +
            '</svg>';

        return `
        <div id="gtw-license-guide-overlay" class="gtw-guide-page-overlay" style="display: none;" data-gtw-license-guide="v6">
            <div class="gtw-guide-page">
                <button type="button" class="gtw-guide-page-close" id="gtw-license-guide-close" aria-label="${L('close')}">&times;</button>
                <h2 class="gtw-guide-page-title">${L('guidePageTitle')}</h2>
                <p class="gtw-guide-page-subtitle">${L('guidePageSubtitle')}</p>

                <div class="gtw-guide-page-flow" id="gtw-license-guide-steps">
                    <section class="gtw-guide-page-block" data-guide-block="1">
                        <div class="gtw-guide-page-step" data-guide-step="1">
                            <span class="gtw-guide-page-num" data-num-global="1" data-num-local="1">1</span>
                            <div class="gtw-guide-page-content">
                                <div class="gtw-guide-step-head">
                                    <div class="gtw-guide-step-copy">
                                        <strong>${L('guide1Title')}</strong>
                                        <p>${L('guide1Text')}</p>
                                    </div>
                                    <button type="button" class="gtw-guide-icon-btn" id="gtw-license-step1-console" aria-label="${L('guideOpenConsole')}" title="${L('guideOpenConsole')}">
                                        ${externalIcon}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="gtw-guide-page-block" data-guide-block="2">
                        <div class="gtw-guide-page-step" data-guide-step="2">
                            <span class="gtw-guide-page-num" data-num-global="2" data-num-local="2">2</span>
                            <div class="gtw-guide-page-content">
                                <div class="gtw-guide-step-head">
                                    <div class="gtw-guide-step-copy">
                                        <strong>${L('guide2Title')}</strong>
                                        <p>${L('guide2Text')}</p>
                                    </div>
                                    <button type="button" class="gtw-guide-icon-btn gtw-guide-shot-toggle" id="gtw-license-shot-settings-toggle" aria-expanded="false" aria-controls="gtw-license-shot-settings" title="${L('guideShowScreenshot')}">
                                        ${imageIcon}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="gtw-guide-shot-panel gtw-guide-shot-panel--block" id="gtw-license-shot-settings" hidden>
                            <button type="button" class="gtw-guide-shot-frame" data-zoom-src="${LICENSE_GUIDE_SETTINGS_IMG}" data-zoom-alt="${L('guide2Title')}">
                                <img src="${LICENSE_GUIDE_SETTINGS_IMG}" alt="${L('guide2Title')}" loading="lazy" class="gtw-guide-shot-img" />
                            </button>
                        </div>
                    </section>

                    <section class="gtw-guide-page-block gtw-guide-shot-group" id="gtw-license-shot-group-page" data-guide-block="3" data-open="false">
                        <div class="gtw-guide-page-step gtw-guide-shot-group-head">
                            <span class="gtw-guide-page-num gtw-guide-page-num--ghost" aria-hidden="true"></span>
                            <div class="gtw-guide-page-content">
                                <div class="gtw-guide-step-head">
                                    <div class="gtw-guide-step-copy">
                                        <strong class="gtw-guide-shot-group-title">${L('guideShotPageLabel')}</strong>
                                    </div>
                                    <button type="button" class="gtw-guide-icon-btn gtw-guide-shot-toggle" id="gtw-license-shot-page-toggle" aria-expanded="false" aria-controls="gtw-license-shot-page" title="${L('guideShowScreenshot')}">
                                        ${imageIcon}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="gtw-guide-shot-group-body">
                            <div class="gtw-guide-shot-rail-zone">
                                <div class="gtw-guide-shot-panel gtw-guide-shot-panel--group" id="gtw-license-shot-page" hidden>
                                    <button type="button" class="gtw-guide-shot-frame" data-zoom-src="${LICENSE_GUIDE_RESPONSE_IMG}" data-zoom-alt="${L('guideShotPageLabel')}">
                                        <img src="${LICENSE_GUIDE_RESPONSE_IMG}" alt="${L('guideShotPageLabel')}" loading="lazy" class="gtw-guide-shot-img" />
                                    </button>
                                </div>

                                <div class="gtw-guide-shot-steps">
                                    <div class="gtw-guide-page-step gtw-guide-page-step--grouped" data-guide-step="3" data-local-num="1">
                                        <span class="gtw-guide-page-num" data-num-global="3" data-num-local="1">3</span>
                                        <div class="gtw-guide-page-content">
                                            <strong>${L('guide3Title')}</strong>
                                            <p>${L('guide3Text')}</p>
                                        </div>
                                    </div>
                                    <div class="gtw-guide-page-step gtw-guide-page-step--grouped" data-guide-step="4" data-local-num="2">
                                        <span class="gtw-guide-page-num" data-num-global="4" data-num-local="2">4</span>
                                        <div class="gtw-guide-page-content">
                                            <strong>${L('guide4Title')}</strong>
                                            <p>${L('guide4Text')}</p>
                                            <div class="gtw-copy-box">
                                                <span class="gtw-copy-email">${TESTER_GROUP_EMAIL}</span>
                                                <button type="button" class="gtw-copy-btn" id="gtw-license-guide-copy-btn" title="${L('copy')}">${L('copy')}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="gtw-guide-page-step gtw-guide-page-step--grouped" data-guide-step="5" data-local-num="3">
                                        <span class="gtw-guide-page-num" data-num-global="5" data-num-local="3">5</span>
                                        <div class="gtw-guide-page-content">
                                            <strong>${L('guide5Title')}</strong>
                                            <p>${L('guide5Text')}</p>
                                        </div>
                                    </div>
                                    <div class="gtw-guide-page-step gtw-guide-page-step--grouped" data-guide-step="6" data-local-num="4">
                                        <span class="gtw-guide-page-num" data-num-global="6" data-num-local="4">6</span>
                                        <div class="gtw-guide-page-content">
                                            <strong>${L('guide6Title')}</strong>
                                            <p>${L('guide6Text')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
        `;
    }

    function createExchangePickerHTML() {
        return CRYPTO_EXCHANGES.map(function (ex) {
            return `
                <div class="gtw-exchange-pick-row" data-exchange="${ex.id}" role="button" tabindex="0">
                    <div class="gtw-exchange-pick-left">
                        <div class="gtw-exchange-icon">
                            <img src="${ex.logo}" alt="${ex.name}" class="gtw-exchange-logo" onerror="this.style.display='none'; this.parentNode.classList.add('is-fallback'); this.parentNode.textContent='${ex.initials}';" />
                        </div>
                        <span class="gtw-exchange-pick-name">${ex.name}</span>
                    </div>
                    <span class="gtw-exchange-pick-chevron">›</span>
                </div>
            `;
        }).join('');
    }

    /* =========================================================
       STEP 2 OF 2 HTML (Testing Link)
       ========================================================= */

    function createWizardStep2HTML() {
        return `
        <div id="guaranteed-test-wizard-step2-overlay" class="gtw-overlay gtw-step2-overlay" style="display: none;" data-gtw-wizard="v3">
            <div class="gtw-header">
                <button type="button" class="gtw-back-btn" id="gtw-step2-back-btn" aria-label="${L('back')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h1 class="gtw-header-title">${L('headerTitle')}</h1>
                <p class="gtw-header-subtitle">${L('stepOf', { n: 2 })}</p>
                <div class="gtw-progress-bar">
                    <div class="gtw-progress-step active"></div>
                    <div class="gtw-progress-step active"></div>
                </div>
            </div>

            <div class="gtw-body">
                <div class="gtw-prefill-row" id="gtw-prefill-row-step2" style="display: none;">
                    <span class="gtw-prefill-hint" id="gtw-prefill-hint-step2"></span>
                    <button type="button" id="gtw-prefill-badge-step2" class="gtw-prefill-badge">${L('autoFill')}</button>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label" for="gtw-link-input">${L('linkLabel')}</label>
                    <div class="gtw-input-wrapper">
                        <input type="url" id="gtw-link-input" class="gtw-input" placeholder="${L('linkPlaceholder')}" autocomplete="off" />
                        <button type="button" class="gtw-clear-btn" id="gtw-clear-link-btn" title="${L('clear')}" style="display: none;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <button type="button" class="gtw-paste-btn" id="gtw-paste-link-btn" title="${L('paste')}">
                            <img src="${PASTE_ICON_SRC}" alt="" class="gtw-paste-icon" width="20" height="20" draggable="false" />
                        </button>
                    </div>
                    <div class="gtw-helper-text" id="gtw-link-helper">${L('linkHelper')}</div>
                    <div id="gtw-link-verification" class="gtw-link-verification" style="display: none;">
                        <div class="gtw-link-verification-head">
                            <span class="gtw-link-verification-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2.4l2.15 1.76 2.73-.36 1.35 2.4 2.54 1.09-.36 2.74L22.16 12l-1.75 2.15.36 2.73-2.4 1.35-1.09 2.54-2.74-.36L12 21.6l-2.15-1.76-2.73.36-1.35-2.4-2.54-1.09.36-2.74L1.84 12l1.75-2.15-.36-2.73 2.4-1.35 1.09-2.54 2.74.36L12 2.4z" fill="currentColor" opacity=".22"/>
                                    <path d="M12 2.4l2.15 1.76 2.73-.36 1.35 2.4 2.54 1.09-.36 2.74L22.16 12l-1.75 2.15.36 2.73-2.4 1.35-1.09 2.54-2.74-.36L12 21.6l-2.15-1.76-2.73.36-1.35-2.4-2.54-1.09.36-2.74L1.84 12l1.75-2.15-.36-2.73 2.4-1.35 1.09-2.54 2.74.36L12 2.4z" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8.2 12.2l2.4 2.3 5.2-5.2" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                            <span class="gtw-link-verification-label">${L('linkCheck')}</span>
                        </div>
                        <div class="gtw-link-verification-url" id="gtw-link-verification-url"></div>
                        <p class="gtw-link-verification-note">${L('linkCheckNote')}</p>
                        <label class="gtw-confirm-row gtw-confirm-row--inside" id="gtw-link-confirm-row" style="display: none;">
                            <input type="checkbox" id="gtw-link-confirm-checkbox" />
                            <span class="gtw-confirm-label-wrap">
                                <span class="gtw-confirm-label">${L('confirmLink')}</span>
                                <span class="gtw-confirm-warning" id="gtw-link-confirm-warning" style="display: none;">${L('confirmLinkWarn')}</span>
                            </span>
                        </label>
                    </div>
                </div>

                <div id="gtw-step2-project-checklist" class="gtw-setup-checklist" style="display: none;">
                    <p class="gtw-setup-checklist-lead">${L('checklistLead')}</p>
                    <label class="gtw-checklist-item">
                        <input type="checkbox" id="gtw-check-console-email" />
                        <span>
                            <strong>${L('checklistEmail')}</strong>
                            <small>${L('checklistEmailNote1')}</small>
                            <small>${L('checklistEmailNote2', { email: TESTER_GROUP_EMAIL })}</small>
                        </span>
                    </label>
                    <label class="gtw-checklist-item">
                        <input type="checkbox" id="gtw-check-console-countries" />
                        <span><strong>${L('checklistCountries')}</strong></span>
                    </label>
                    <label class="gtw-checklist-item">
                        <input type="checkbox" id="gtw-check-console-review" />
                        <span><strong>${L('checklistReview')}</strong></span>
                    </label>
                </div>

                <div id="gtw-step2-instructions-accordion" class="gtw-step2-accordion">
                    <button type="button" class="gtw-step2-accordion-head" id="gtw-step2-accordion-head" style="display: none;" aria-expanded="false">
                        <span>${L('howToSetUp')}</span>
                        <span class="gtw-step2-accordion-arrow" aria-hidden="true">▼</span>
                    </button>
                    <div class="gtw-step2-accordion-panel" id="gtw-step2-instructions-panel">
                        <div class="gtw-guide-page-flow gtw-step2-guide-flow" id="gtw-step2-instructions-list">
                            <section class="gtw-guide-page-block gtw-guide-shot-group" data-guide-block="1" data-open="false" id="gtw-step2-shot-group-testers">
                                <div class="gtw-guide-page-step">
                                    <span class="gtw-guide-page-num">1</span>
                                    <div class="gtw-guide-page-content">
                                        <div class="gtw-guide-step-head">
                                            <div class="gtw-guide-step-copy">
                                                <strong>${L('instr1Title')}</strong>
                                                <p>${L('instr1Text')}</p>
                                            </div>
                                            <button type="button" class="gtw-guide-icon-btn gtw-guide-shot-toggle" id="gtw-step2-shot-testers-toggle" aria-expanded="false" aria-controls="gtw-step2-shot-testers" title="${L('guideShowScreenshot')}">
                                                <svg class="gtw-guide-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="gtw-guide-shot-group-body">
                                    <div class="gtw-guide-shot-panel gtw-guide-shot-panel--block" id="gtw-step2-shot-testers" hidden>
                                        <button type="button" class="gtw-guide-shot-frame" data-zoom-src="${TESTING_GUIDE_GROUP_IMG}" data-zoom-alt="${L('instr1Title')}">
                                            <img src="${TESTING_GUIDE_GROUP_IMG}" alt="${L('instr1Title')}" loading="lazy" class="gtw-guide-shot-img" />
                                        </button>
                                        <div class="gtw-guide-nested-block">
                                            <div class="gtw-copy-box">
                                                <span class="gtw-copy-email">${TESTER_GROUP_EMAIL}</span>
                                                <button type="button" class="gtw-copy-btn" id="gtw-card-copy-btn" title="${L('copy')}">${L('copy')}</button>
                                            </div>
                                            <div class="gtw-guide-nested-link">
                                                <strong class="gtw-guide-nested-link-title">${L('instrLinkTitle')}</strong>
                                                <p>${L('instrLinkText')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section class="gtw-guide-page-block gtw-guide-shot-group" data-guide-block="2" data-open="false" id="gtw-step2-shot-group-countries">
                                <div class="gtw-guide-page-step">
                                    <span class="gtw-guide-page-num">2</span>
                                    <div class="gtw-guide-page-content">
                                        <div class="gtw-guide-step-head">
                                            <div class="gtw-guide-step-copy">
                                                <strong>${L('instr2Title')}</strong>
                                                <p>${L('instr2Text')}</p>
                                            </div>
                                            <button type="button" class="gtw-guide-icon-btn gtw-guide-shot-toggle" id="gtw-step2-shot-countries-toggle" aria-expanded="false" aria-controls="gtw-step2-shot-countries" title="${L('guideShowScreenshot')}">
                                                <svg class="gtw-guide-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="gtw-guide-shot-group-body">
                                    <div class="gtw-guide-shot-panel gtw-guide-shot-panel--block" id="gtw-step2-shot-countries" hidden>
                                        <button type="button" class="gtw-guide-shot-frame" data-zoom-src="${TESTING_GUIDE_COUNTRIES_IMG}" data-zoom-alt="${L('instr2Title')}">
                                            <img src="${TESTING_GUIDE_COUNTRIES_IMG}" alt="${L('instr2Title')}" loading="lazy" class="gtw-guide-shot-img" />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section class="gtw-guide-page-block gtw-guide-shot-group" data-guide-block="3" data-open="false" id="gtw-step2-shot-group-review">
                                <div class="gtw-guide-page-step">
                                    <span class="gtw-guide-page-num">3</span>
                                    <div class="gtw-guide-page-content">
                                        <div class="gtw-guide-step-head">
                                            <div class="gtw-guide-step-copy">
                                                <strong>${L('instr3Title')}</strong>
                                                <p>${L('instr3Text')}</p>
                                            </div>
                                            <button type="button" class="gtw-guide-icon-btn gtw-guide-shot-toggle" id="gtw-step2-shot-review-toggle" aria-expanded="false" aria-controls="gtw-step2-shot-review" title="${L('guideShowScreenshot')}">
                                                <svg class="gtw-guide-action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="gtw-guide-shot-group-body">
                                    <div class="gtw-guide-shot-panel gtw-guide-shot-panel--block" id="gtw-step2-shot-review" hidden>
                                        <button type="button" class="gtw-guide-shot-frame" data-zoom-src="${TESTING_GUIDE_REVIEW_IMG}" data-zoom-alt="${L('instr3Title')}">
                                            <img src="${TESTING_GUIDE_REVIEW_IMG}" alt="${L('instr3Title')}" loading="lazy" class="gtw-guide-shot-img" />
                                        </button>
                                        <div class="gtw-note-box" style="margin-top: 10px;">${L('instr3Note')}</div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-proceed-payment-btn">${L('proceedPayment')}</button>
                </div>
            </div>
        </div>
        `;
    }

    /* =========================================================
       FINAL STEP HTML (Payment Screen)
       ========================================================= */

    function createWizardPaymentHTML() {
        return `
        <div id="guaranteed-test-wizard-payment-overlay" class="gtw-overlay" style="display: none;">
            <div class="gtw-header">
                <button type="button" class="gtw-back-btn" id="gtw-payment-back-btn" aria-label="${L('back')}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h1 class="gtw-header-title">${L('headerTitle')}</h1>
                <p class="gtw-header-subtitle">${L('paymentStep')}</p>
            </div>

            <div class="gtw-body">
                <div class="gtw-plan-card">
                    <div class="gtw-plan-label">${L('planLabel')}</div>
                    <h2 class="gtw-plan-title">${L('planTitle')}</h2>
                    <div class="gtw-plan-price-row">
                        <span class="gtw-plan-price">$20</span>
                        <span class="gtw-plan-subtitle">${L('planPriceNote')}</span>
                    </div>
                    <div class="gtw-plan-features">
                        <div class="gtw-feature-item">
                            <svg class="gtw-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>${L('planFeature1')}</span>
                        </div>
                        <div class="gtw-feature-item">
                            <svg class="gtw-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>${L('planFeature2')}</span>
                        </div>
                        <div class="gtw-feature-item">
                            <svg class="gtw-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>${L('planFeature3')}</span>
                        </div>
                    </div>
                    <div class="gtw-guarantee-box">
                        <svg class="gtw-guarantee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            <polyline points="9 12 11 14 15 10"></polyline>
                        </svg>
                        <div>
                            <h4 class="gtw-guarantee-title">${L('guaranteeTitle')}</h4>
                            <p class="gtw-guarantee-text">${L('guaranteeText')}</p>
                        </div>
                    </div>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label">${L('methodLabel')}</label>
                    <div class="gtw-payment-methods">
                        <div class="gtw-method-card" id="gtw-method-crypto" data-method="crypto">
                            <div class="gtw-method-header">
                                <div class="gtw-method-left">
                                    <div class="gtw-method-radio"></div>
                                    <div class="gtw-method-info">
                                        <div class="gtw-method-title-row">
                                            <span class="gtw-method-title">${L('methodCrypto')}</span>
                                            <span class="gtw-method-badge gtw-badge-rec">${L('badgeRecommended')}</span>
                                        </div>
                                    </div>
                                </div>
                                <span class="gtw-method-price">$20</span>
                            </div>
                            <p class="gtw-method-action-hint">${L('hintCrypto')}</p>
                            <div class="gtw-exchange-picker" id="gtw-exchange-picker">
                                ${createExchangePickerHTML()}
                            </div>
                        </div>

                        <div class="gtw-method-card" id="gtw-method-paypal" data-method="paypal">
                            <div class="gtw-method-header">
                                <div class="gtw-method-left">
                                    <div class="gtw-method-radio"></div>
                                    <div class="gtw-method-info">
                                        <div class="gtw-method-title-row">
                                            <span class="gtw-method-title">${L('methodPaypal')}</span>
                                            <span class="gtw-method-badge gtw-badge-fee">${L('badgeFee')}</span>
                                        </div>
                                    </div>
                                </div>
                                <span class="gtw-method-price gtw-method-price--fee">
                                    <span class="gtw-method-price-base">$20</span>
                                    <span class="gtw-method-price-extra">${L('priceFeeExtra')}</span>
                                </span>
                            </div>
                            <p class="gtw-method-action-hint">${L('hintSteps')}</p>
                        </div>

                        <div class="gtw-method-card" id="gtw-method-rub" data-method="rub">
                            <div class="gtw-method-header">
                                <div class="gtw-method-left">
                                    <div class="gtw-method-radio"></div>
                                    <div class="gtw-method-info">
                                        <div class="gtw-method-title-row">
                                            <span class="gtw-method-title">${L('methodFiat')}</span>
                                            <span class="gtw-method-badge gtw-badge-fee">${L('badgeFee')}</span>
                                        </div>
                                    </div>
                                </div>
                                <span class="gtw-method-price gtw-method-price--fee">
                                    <span class="gtw-method-price-base">$20</span>
                                    <span class="gtw-method-price-extra">${L('priceFeeExtra')}</span>
                                </span>
                            </div>
                            <p class="gtw-method-action-hint">${L('hintSteps')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-pay-btn" disabled>${L('selectMethod')}</button>
                </div>
            </div>
        </div>

        <div id="gtw-payment-flow-overlay" class="gtw-payment-flow-overlay" aria-hidden="true">
            <div class="gtw-payment-flow-sheet" id="gtw-payment-flow-sheet"></div>
        </div>
        `;
    }

    function ensureWizardInDOM() {
        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (!overlay1 || overlay1.getAttribute('data-gtw-wizard') !== 'v2') {
            if (overlay1 && overlay1.parentNode) overlay1.parentNode.removeChild(overlay1);
            var div1 = document.createElement('div');
            div1.innerHTML = createWizardStep1HTML();
            document.body.appendChild(div1.firstElementChild);
            bindStep1Events();
        }

        if (!document.getElementById('gtw-license-guide-overlay') ||
            document.getElementById('gtw-license-guide-overlay').getAttribute('data-gtw-license-guide') !== 'v6') {
            var oldGuide = document.getElementById('gtw-license-guide-overlay');
            if (oldGuide && oldGuide.parentNode) oldGuide.parentNode.removeChild(oldGuide);
            var divGuide = document.createElement('div');
            divGuide.innerHTML = createLicenseGuideOverlayHTML();
            document.body.appendChild(divGuide.firstElementChild);
            bindLicenseGuideEvents();
        }

        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (!overlay2 || overlay2.getAttribute('data-gtw-wizard') !== 'v3') {
            if (overlay2 && overlay2.parentNode) overlay2.parentNode.removeChild(overlay2);
            var div2 = document.createElement('div');
            div2.innerHTML = createWizardStep2HTML();
            document.body.appendChild(div2.firstElementChild);
            bindStep2Events();
        }

        var overlayPay = document.getElementById('guaranteed-test-wizard-payment-overlay');
        if (!overlayPay) {
            var divPay = document.createElement('div');
            divPay.innerHTML = createWizardPaymentHTML();
            while (divPay.firstElementChild) {
                document.body.appendChild(divPay.firstElementChild);
            }
            bindPaymentEvents();
        }
    }

    function readClipboardText() {
        return new Promise(function (resolve, reject) {
            var settled = false;
            function done(ok, value) {
                if (settled) return;
                settled = true;
                if (ok) resolve(value);
                else reject(value || new Error('clipboard_failed'));
            }

            try {
                var tg = window.Telegram && window.Telegram.WebApp;
                if (tg && typeof tg.readTextFromClipboard === 'function') {
                    var timer = setTimeout(function () {
                        // Telegram Desktop often never calls back — fall through.
                        tryNavigator();
                    }, 900);
                    try {
                        tg.readTextFromClipboard(function (text) {
                            clearTimeout(timer);
                            if (text != null && String(text).length) {
                                done(true, String(text));
                                return;
                            }
                            tryNavigator();
                        });
                        return;
                    } catch (_) {
                        clearTimeout(timer);
                    }
                }
            } catch (_) {}

            tryNavigator();

            function tryNavigator() {
                if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                    navigator.clipboard.readText().then(function (text) {
                        if (text != null && String(text).length) done(true, String(text));
                        else done(false, new Error('empty'));
                    }).catch(function (err) {
                        done(false, err || new Error('clipboard_denied'));
                    });
                    return;
                }
                done(false, new Error('unsupported'));
            }
        });
    }

    function pasteClipboardIntoInput(input, onSuccess) {
        if (!input) return;
        readClipboardText().then(function (text) {
            var value = String(text || '').trim();
            if (!value) {
                if (typeof showToast === 'function') showToast(L('pasteFailed'));
                try { input.focus(); } catch (_) {}
                return;
            }
            input.value = value;
            try {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (_) {}
            if (typeof onSuccess === 'function') onSuccess(value);
        }).catch(function () {
            if (typeof showToast === 'function') showToast(L('pasteFailed'));
            try { input.focus(); } catch (_) {}
        });
    }

    function syncStep1FormFromState() {
        var input = document.getElementById('gtw-app-name-input');
        if (input) input.value = wizardState.appName || '';
        updateTypeSelectorUI(wizardState.appType);
        if (wizardState.appType === 'paid') showInlineLicenseTestingBlock();
        else hideInlineLicenseTestingBlock();

        var hasPrefill = !!wizardState.prefillProject;
        var badge = document.getElementById('gtw-prefill-badge-step1');
        var row = document.getElementById('gtw-prefill-row-step1');
        var confirmRow = document.getElementById('gtw-details-confirm-row');
        var confirmBox = document.getElementById('gtw-details-confirm-checkbox');
        if (row) row.style.display = hasPrefill ? 'flex' : 'none';
        if (badge) {
            badge.classList.toggle('is-inactive', hasPrefill && !wizardState.prefillStep1Active);
        }
        syncPrefillToggleUI(1, !!wizardState.prefillStep1Active);
        if (confirmRow) confirmRow.style.display = hasPrefill ? 'flex' : 'none';
        if (confirmBox) confirmBox.checked = !!wizardState.detailsConfirmed;
        var warn = document.getElementById('gtw-details-confirm-warning');
        if (warn) warn.style.display = 'none';

        var forwardBtn = document.getElementById('gtw-step1-forward-btn');
        if (forwardBtn) {
            forwardBtn.style.display = Number(wizardState.step) >= 2 ? 'flex' : 'none';
        }
    }

    function syncStep2FormFromState() {
        var linkInput = document.getElementById('gtw-link-input');
        if (linkInput) linkInput.value = wizardState.testingLink || '';
        var hasPrefill = !!wizardState.prefillProject;
        var badge = document.getElementById('gtw-prefill-badge-step2');
        var row = document.getElementById('gtw-prefill-row-step2');
        var confirmRow = document.getElementById('gtw-link-confirm-row');
        var confirmBox = document.getElementById('gtw-link-confirm-checkbox');
        if (row) row.style.display = hasPrefill ? 'flex' : 'none';
        if (badge) {
            badge.classList.toggle('is-inactive', hasPrefill && !wizardState.prefillStep2Active);
        }
        syncPrefillToggleUI(2, !!wizardState.prefillStep2Active);
        if (confirmRow) confirmRow.style.display = hasPrefill ? 'flex' : 'none';
        if (confirmBox) confirmBox.checked = !!wizardState.linkConfirmed;
        var warn = document.getElementById('gtw-link-confirm-warning');
        if (warn) warn.style.display = 'none';
        syncStep2LayoutMode();
        updateLinkVerificationUI();
    }

    function syncStep2LayoutMode() {
        var useChecklist = shouldShowProjectConsoleChecklist();
        var checklistEl = document.getElementById('gtw-step2-project-checklist');
        var accordion = document.getElementById('gtw-step2-instructions-accordion');
        var accordionHead = document.getElementById('gtw-step2-accordion-head');
        var panel = document.getElementById('gtw-step2-instructions-panel');

        if (checklistEl) checklistEl.style.display = useChecklist ? 'block' : 'none';
        if (accordionHead) accordionHead.style.display = useChecklist ? 'flex' : 'none';

        if (accordion) {
            if (useChecklist) {
                accordion.classList.add('is-collapsible');
                accordion.classList.remove('is-open');
                if (accordionHead) accordionHead.setAttribute('aria-expanded', 'false');
            } else {
                accordion.classList.remove('is-collapsible');
                accordion.classList.add('is-open');
                if (accordionHead) accordionHead.setAttribute('aria-expanded', 'true');
            }
        }

        if (panel) {
            panel.style.display = useChecklist ? 'none' : 'block';
        }

        if (useChecklist) {
            var emailBox = document.getElementById('gtw-check-console-email');
            var countriesBox = document.getElementById('gtw-check-console-countries');
            var reviewBox = document.getElementById('gtw-check-console-review');
            if (emailBox) emailBox.checked = !!wizardState.consoleChecklist.email;
            if (countriesBox) countriesBox.checked = !!wizardState.consoleChecklist.countries;
            if (reviewBox) reviewBox.checked = !!wizardState.consoleChecklist.review;
        }
    }

    function toggleStep2InstructionsAccordion() {
        var accordion = document.getElementById('gtw-step2-instructions-accordion');
        var accordionHead = document.getElementById('gtw-step2-accordion-head');
        var panel = document.getElementById('gtw-step2-instructions-panel');
        if (!accordion || !panel || !accordion.classList.contains('is-collapsible')) return;

        var willOpen = !accordion.classList.contains('is-open');
        accordion.classList.toggle('is-open', willOpen);
        panel.style.display = willOpen ? 'block' : 'none';
        if (accordionHead) accordionHead.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }

    /* =========================================================
       EVENT BINDINGS
       ========================================================= */

    function bindStep1Events() {
        var backBtn = document.getElementById('gtw-step1-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                hideGuaranteedTestWizardStep1();
                if (typeof window.showGuaranteedTestOfferModal === 'function') {
                    window.showGuaranteedTestOfferModal();
                }
            });
        }

        var forwardBtn = document.getElementById('gtw-step1-forward-btn');
        if (forwardBtn) {
            forwardBtn.addEventListener('click', handleStep1Continue);
        }

        var freeCard = document.getElementById('gtw-type-free');
        var paidCard = document.getElementById('gtw-type-paid');
        if (freeCard) freeCard.addEventListener('click', handleTapFreeApp);
        if (paidCard) paidCard.addEventListener('click', handleTapPaidApp);

        var pasteBtn = document.getElementById('gtw-paste-appname-btn');
        var input = document.getElementById('gtw-app-name-input');
        if (pasteBtn && input) {
            pasteBtn.addEventListener('click', function () {
                pasteClipboardIntoInput(input, function (value) {
                    wizardState.appName = value;
                    wizardState.detailsConfirmed = false;
                    if (wizardState.prefillProject) wizardState.prefillStep1Active = false;
                    clearAppnameError();
                    syncStep1FormFromState();
                    persistGuaranteedTestWizardDraft();
                });
            });
        }

        if (input) {
            input.addEventListener('input', function () {
                wizardState.appName = String(input.value || '');
                wizardState.detailsConfirmed = false;
                if (wizardState.prefillProject) wizardState.prefillStep1Active = false;
                clearAppnameError();
                syncStep1FormFromState();
                persistGuaranteedTestWizardDraft();
            });
        }

        var prefillBadgeStep1 = document.getElementById('gtw-prefill-badge-step1');
        if (prefillBadgeStep1) {
            prefillBadgeStep1.addEventListener('click', function () {
                setPrefillStep1Active(!wizardState.prefillStep1Active);
                syncStep1FormFromState();
            });
        }

        var detailsConfirm = document.getElementById('gtw-details-confirm-checkbox');
        if (detailsConfirm) {
            detailsConfirm.addEventListener('change', function () {
                wizardState.detailsConfirmed = !!detailsConfirm.checked;
                var warningStep1 = document.getElementById('gtw-details-confirm-warning');
                if (warningStep1) warningStep1.style.display = 'none';
            });
        }

        var continueBtn = document.getElementById('gtw-step1-continue-btn');
        if (continueBtn) continueBtn.addEventListener('click', handleStep1Continue);

        var modalCancelBtn = document.getElementById('gtw-modal-cancel-btn');
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', handleCancelLicenseTesting);

        var modalConfirmBtn = document.getElementById('gtw-modal-confirm-btn');
        if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', handleConfirmLicenseTesting);

        var modalGuideBtn = document.getElementById('gtw-modal-guide-btn');
        if (modalGuideBtn) modalGuideBtn.addEventListener('click', handleOpenLicenseSetupGuide);

        var inlineGuideBtn = document.getElementById('gtw-inline-guide-btn');
        if (inlineGuideBtn) inlineGuideBtn.addEventListener('click', handleOpenLicenseSetupGuide);

        var modalCopyBtn = document.getElementById('gtw-modal-copy-btn');
        if (modalCopyBtn) {
            modalCopyBtn.addEventListener('click', function () {
                copyTextWithFeedback(TESTER_GROUP_EMAIL, modalCopyBtn);
            });
        }
    }

    function openPlayConsoleExternal() {
        var url = PLAY_CONSOLE_URL;
        try {
            if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
                window.Telegram.WebApp.openLink(url);
                return;
            }
        } catch (_) {}
        window.open(url, '_blank', 'noopener');
    }

    function openGuideImageZoom(src, alt) {
        if (typeof window.openImageZoom === 'function') {
            window.openImageZoom(src, alt);
            return;
        }
        window.open(src, '_blank', 'noopener');
    }

    function syncLicenseGuideShotNumbers(groupOpen) {
        var group = document.getElementById('gtw-license-shot-group-page');
        if (!group) return;
        group.setAttribute('data-open', groupOpen ? 'true' : 'false');
        group.querySelectorAll('.gtw-guide-page-num[data-num-global]').forEach(function (numEl) {
            var globalNum = numEl.getAttribute('data-num-global');
            var localNum = numEl.getAttribute('data-num-local');
            numEl.textContent = groupOpen ? String(localNum || globalNum) : String(globalNum || localNum);
        });
    }

    function setGuideShotPanelOpen(panelId, toggleId, isOpen, groupId) {
        var panel = document.getElementById(panelId);
        var toggle = document.getElementById(toggleId);
        if (!panel || !toggle) return;
        if (isOpen) {
            panel.hidden = false;
            panel.classList.add('is-open');
        } else {
            panel.hidden = true;
            panel.classList.remove('is-open');
        }
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.classList.toggle('is-active', !!isOpen);
        toggle.setAttribute('title', isOpen ? L('guideHideScreenshot') : L('guideShowScreenshot'));
        if (groupId) {
            var group = document.getElementById(groupId);
            if (group) group.setAttribute('data-open', isOpen ? 'true' : 'false');
        }
        if (toggleId === 'gtw-license-shot-page-toggle') {
            syncLicenseGuideShotNumbers(!!isOpen);
        }
    }

    function setLicenseShotPanelOpen(panelId, toggleId, isOpen) {
        var groupId = null;
        if (toggleId === 'gtw-license-shot-page-toggle') groupId = 'gtw-license-shot-group-page';
        setGuideShotPanelOpen(panelId, toggleId, isOpen, groupId);
    }

    function bindLicenseGuideEvents() {
        var closeBtn = document.getElementById('gtw-license-guide-close');
        var overlay = document.getElementById('gtw-license-guide-overlay');
        if (closeBtn) closeBtn.addEventListener('click', closeLicenseGuideModal);
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeLicenseGuideModal();
            });
        }

        var copyBtn = document.getElementById('gtw-license-guide-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                copyTextWithFeedback(TESTER_GROUP_EMAIL, copyBtn);
            });
        }

        var openConsoleStep1 = document.getElementById('gtw-license-step1-console');
        if (openConsoleStep1) openConsoleStep1.addEventListener('click', openPlayConsoleExternal);

        var settingsToggle = document.getElementById('gtw-license-shot-settings-toggle');
        if (settingsToggle) {
            settingsToggle.addEventListener('click', function () {
                var willOpen = settingsToggle.getAttribute('aria-expanded') !== 'true';
                setLicenseShotPanelOpen('gtw-license-shot-settings', 'gtw-license-shot-settings-toggle', willOpen);
            });
        }

        var pageToggle = document.getElementById('gtw-license-shot-page-toggle');
        if (pageToggle) {
            pageToggle.addEventListener('click', function () {
                var willOpen = pageToggle.getAttribute('aria-expanded') !== 'true';
                setLicenseShotPanelOpen('gtw-license-shot-page', 'gtw-license-shot-page-toggle', willOpen);
            });
        }

        if (overlay) {
            overlay.querySelectorAll('.gtw-guide-shot-frame').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    openGuideImageZoom(
                        btn.getAttribute('data-zoom-src') || '',
                        btn.getAttribute('data-zoom-alt') || ''
                    );
                });
            });
        }

        syncLicenseGuideShotNumbers(false);
    }

    function openLicenseGuideModal() {
        ensureWizardInDOM();
        var overlay = document.getElementById('gtw-license-guide-overlay');
        if (overlay) overlay.style.display = 'flex';
    }

    function closeLicenseGuideModal() {
        var overlay = document.getElementById('gtw-license-guide-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function bindStep2Events() {
        var backBtn = document.getElementById('gtw-step2-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                hideGuaranteedTestWizardStep2();
                showGuaranteedTestWizardStep1({ keepState: true });
            });
        }

        var pasteLinkBtn = document.getElementById('gtw-paste-link-btn');
        var clearLinkBtn = document.getElementById('gtw-clear-link-btn');
        var linkInput = document.getElementById('gtw-link-input');
        if (pasteLinkBtn && linkInput) {
            pasteLinkBtn.addEventListener('click', function () {
                pasteClipboardIntoInput(linkInput, function (value) {
                    wizardState.testingLink = value;
                    wizardState.linkConfirmed = false;
                    if (wizardState.prefillProject) wizardState.prefillStep2Active = false;
                    clearLinkError();
                    updateLinkVerificationUI();
                    syncStep2FormFromState();
                    persistGuaranteedTestWizardDraft();
                });
            });
        }

        if (clearLinkBtn && linkInput) {
            clearLinkBtn.addEventListener('click', function () {
                linkInput.value = '';
                wizardState.testingLink = '';
                wizardState.linkConfirmed = false;
                if (wizardState.prefillProject) wizardState.prefillStep2Active = false;
                clearLinkError();
                updateLinkVerificationUI();
                linkInput.focus();
                syncStep2FormFromState();
            });
        }

        if (linkInput) {
            linkInput.addEventListener('input', function () {
                wizardState.testingLink = String(linkInput.value || '');
                wizardState.linkConfirmed = false;
                if (wizardState.prefillProject) wizardState.prefillStep2Active = false;
                clearLinkError();
                updateLinkVerificationUI();
                syncStep2FormFromState();
                persistGuaranteedTestWizardDraft();
            });
        }

        var prefillBadgeStep2 = document.getElementById('gtw-prefill-badge-step2');
        if (prefillBadgeStep2) {
            prefillBadgeStep2.addEventListener('click', function () {
                setPrefillStep2Active(!wizardState.prefillStep2Active);
                syncStep2FormFromState();
            });
        }

        var linkConfirm = document.getElementById('gtw-link-confirm-checkbox');
        if (linkConfirm) {
            linkConfirm.addEventListener('change', function () {
                wizardState.linkConfirmed = !!linkConfirm.checked;
                var warningStep2 = document.getElementById('gtw-link-confirm-warning');
                if (warningStep2) warningStep2.style.display = 'none';
                updateLinkVerificationUI();
            });
        }

        ['email', 'countries', 'review'].forEach(function (key) {
            var box = document.getElementById('gtw-check-console-' + key);
            if (box) {
                box.addEventListener('change', function () {
                    wizardState.consoleChecklist[key] = !!box.checked;
                    clearLinkError();
                });
            }
        });

        var accordionHead = document.getElementById('gtw-step2-accordion-head');
        if (accordionHead) {
            accordionHead.addEventListener('click', toggleStep2InstructionsAccordion);
        }

        var cardCopyBtn = document.getElementById('gtw-card-copy-btn');
        if (cardCopyBtn) {
            cardCopyBtn.addEventListener('click', function () {
                copyTextWithFeedback(TESTER_GROUP_EMAIL, cardCopyBtn);
            });
        }

        function bindStep2ShotToggle(panelId, toggleId, groupId) {
            var toggle = document.getElementById(toggleId);
            if (!toggle) return;
            toggle.addEventListener('click', function () {
                var willOpen = toggle.getAttribute('aria-expanded') !== 'true';
                setGuideShotPanelOpen(panelId, toggleId, willOpen, groupId);
            });
        }
        bindStep2ShotToggle('gtw-step2-shot-testers', 'gtw-step2-shot-testers-toggle', 'gtw-step2-shot-group-testers');
        bindStep2ShotToggle('gtw-step2-shot-countries', 'gtw-step2-shot-countries-toggle', 'gtw-step2-shot-group-countries');
        bindStep2ShotToggle('gtw-step2-shot-review', 'gtw-step2-shot-review-toggle', 'gtw-step2-shot-group-review');

        var step2Panel = document.getElementById('gtw-step2-instructions-panel');
        if (step2Panel) {
            step2Panel.querySelectorAll('.gtw-guide-shot-frame').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    openGuideImageZoom(
                        btn.getAttribute('data-zoom-src') || '',
                        btn.getAttribute('data-zoom-alt') || ''
                    );
                });
            });
        }

        var paymentBtn = document.getElementById('gtw-proceed-payment-btn');
        if (paymentBtn) {
            paymentBtn.addEventListener('click', handleProceedToPayment);
        }
    }

    function bindPaymentEvents() {
        var backBtn = document.getElementById('gtw-payment-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                hideGuaranteedTestWizardPayment();
                showGuaranteedTestWizardStep2();
            });
        }

        var cryptoCard = document.getElementById('gtw-method-crypto');
        var paypalCard = document.getElementById('gtw-method-paypal');
        var rubCard = document.getElementById('gtw-method-rub');

        if (cryptoCard) {
            cryptoCard.addEventListener('click', function (e) {
                if (e.target.closest('.gtw-exchange-pick-row')) return;
                selectPaymentMethod('crypto');
            });
        }
        if (paypalCard) {
            paypalCard.addEventListener('click', function () {
                selectPaymentMethod('paypal');
                openPaymentFlow('paypal');
            });
        }
        if (rubCard) {
            rubCard.addEventListener('click', function () {
                selectPaymentMethod('rub');
                openPaymentFlow('rub');
            });
        }

        var exchangeRows = document.querySelectorAll('.gtw-exchange-pick-row');
        exchangeRows.forEach(function (row) {
            row.addEventListener('click', function (e) {
                e.stopPropagation();
                var exchangeId = row.getAttribute('data-exchange');
                selectPaymentMethod('crypto');
                wizardState.paymentExchange = exchangeId;
                openPaymentFlow('crypto', exchangeId);
            });
        });

        var payBtn = document.getElementById('gtw-pay-btn');
        if (payBtn) {
            payBtn.addEventListener('click', function () {
                if (wizardState.paymentMethod === 'crypto' && wizardState.paymentExchange) {
                    openPaymentFlow('crypto', wizardState.paymentExchange);
                }
            });
        }

        var flowOverlay = document.getElementById('gtw-payment-flow-overlay');
        if (flowOverlay) {
            flowOverlay.addEventListener('click', function (e) {
                if (e.target === flowOverlay) closePaymentFlow();
            });
        }
    }

    /* =========================================================
       PAYMENT FLOW (stepper like play review)
       ========================================================= */

    function getExchangeById(id) {
        return CRYPTO_EXCHANGES.find(function (ex) { return ex.id === id; }) || null;
    }

    function resetPaymentFlowState() {
        wizardState.paymentStep1Done = false;
        wizardState.paymentScreenshotUrl = '';
        wizardState.paymentScreenshotFile = null;
    }

    function openPaymentFlow(method, exchangeId) {
        var prevMethod = wizardState.paymentMethod;
        var prevExchange = wizardState.paymentExchange;
        wizardState.paymentMethod = method;
        if (method === 'crypto') {
            wizardState.paymentExchange = exchangeId || wizardState.paymentExchange;
        }
        var switched =
            prevMethod !== method ||
            (method === 'crypto' && prevExchange !== wizardState.paymentExchange);
        if (switched && !wizardState.fiatOrderId && !wizardState.paymentScreenshotUrl) {
            resetPaymentFlowState();
        }
        persistGuaranteedTestWizardDraft();
        renderPaymentFlow();
        var overlay = document.getElementById('gtw-payment-flow-overlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closePaymentFlow() {
        var overlay = document.getElementById('gtw-payment-flow-overlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function markPaymentStep1Done() {
        wizardState.paymentStep1Done = true;
        persistGuaranteedTestWizardDraft();
        renderPaymentFlow();
    }

    function renderPaymentFlow() {
        var sheet = document.getElementById('gtw-payment-flow-sheet');
        if (!sheet) return;

        var method = wizardState.paymentMethod;
        var amount = getPaymentAmount(method);
        var step1Done = !!wizardState.paymentStep1Done;
        var step2Done = !!wizardState.paymentScreenshotUrl;
        var step1Class = step1Done ? 'is-done' : 'is-active';
        var step2Class = step2Done ? 'is-done' : (step1Done ? 'is-active' : 'is-locked');
        var step1Num = step1Done
            ? '<svg class="step-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : '1';
        var step2Num = step2Done
            ? '<svg class="step-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : '2';

        var title = L('paymentStep');
        var subtitle = '';
        var step1Title = '';
        var step1Desc = '';
        var step1Actions = '';

        if (method === 'crypto') {
            var exchange = getExchangeById(wizardState.paymentExchange);
            var exName = exchange ? exchange.name : L('selectedExchange');
            title = L('flowCryptoTitle', { name: exName });
            subtitle = L('flowCryptoSubtitle', { amount: amount });
            step1Title = L('flowCryptoStep');
            step1Desc = L('flowCryptoDesc', { label: exchange ? exchange.label : 'ID' });
            if (exchange) {
                step1Actions = `
                    <div class="gtw-credential-row">
                        <div class="gtw-credential-icon-wrap">
                            <img src="${exchange.logo}" alt="${exchange.name}" class="gtw-exchange-logo" onerror="this.style.display='none'; this.parentNode.classList.add('is-fallback'); this.parentNode.textContent='${exchange.initials}';" />
                        </div>
                        <div class="gtw-credential-box">
                            <span class="gtw-credential-value">${exchange.label}: ${exchange.value}</span>
                            <button type="button" class="gtw-copy-action-btn" id="gtw-flow-copy-btn">${L('copy')}</button>
                        </div>
                    </div>
                `;
            }
        } else if (method === 'paypal') {
            title = L('flowPaypalTitle');
            subtitle = L('flowPaypalSubtitle', { amount: amount });
            step1Title = L('flowPaypalStep');
            step1Desc = L('flowPaypalDesc');
            step1Actions = `
                <div class="gtw-credential-box">
                    <span class="gtw-credential-value">${PAYPAL_EMAIL}</span>
                    <button type="button" class="gtw-copy-action-btn" id="gtw-flow-copy-btn">${L('copy')}</button>
                </div>
                <button type="button" class="gtw-open-external-btn" id="gtw-flow-open-paypal-btn">
                    <span>${L('openPaypal')}</span>
                    <svg class="gtw-external-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </button>
            `;
        } else if (method === 'rub') {
            title = L('flowFiatTitle');
            subtitle = L('flowFiatSubtitle', { amount: amount });
            step1Title = L('flowFiatStep');
            step1Desc = L('flowFiatDesc');
            if (wizardState.fiatOrderId && step1Done) {
                step1Actions = `
                    <div class="gtw-fiat-waiting-card">
                        <div class="gtw-fiat-waiting-title">${L('fiatWaitingTitle')}</div>
                        <div class="gtw-fiat-waiting-desc">${L('fiatWaitingDesc')}</div>
                        <button type="button" class="gtw-open-external-btn is-done" id="gtw-flow-open-tg-btn" disabled>
                            ${L('fiatRequisitesRequested')}
                        </button>
                    </div>
                `;
            } else {
                step1Actions = `
                    <div class="gtw-fiat-currency-grid">
                        ${FIAT_CURRENCIES.map(function (currency) {
                            var isSelected = currency.code === wizardState.fiatCurrency;
                            return `<button type="button" class="gtw-fiat-currency-card${isSelected ? ' is-selected' : ''}" data-fiat-currency="${currency.code}">
                                <strong>${currency.code}</strong>
                                <span>${getWizardLang() === 'ru' ? currency.ru : currency.en}</span>
                            </button>`;
                        }).join('')}
                    </div>
                    <div class="gtw-fiat-bank-field">
                        <label for="gtw-fiat-bank-input">${L('fiatBankLabel')}</label>
                        <input type="text" id="gtw-fiat-bank-input" class="gtw-input" value="${escapeHtml(wizardState.fiatBankName)}" placeholder="${L('fiatBankPlaceholder')}" autocomplete="organization" />
                    </div>
                    <label class="gtw-fiat-personal-account">
                        <input type="checkbox" id="gtw-fiat-personal-account" ${wizardState.fiatPersonalAccount ? 'checked' : ''} />
                        <span>${L('fiatPersonal')}</span>
                    </label>
                    <p class="gtw-fiat-tip">${L('fiatTip', { amount: amount })}</p>
                    <div class="gtw-helper-text error" id="gtw-fiat-helper" style="display: none;"></div>
                    <button type="button" class="gtw-open-external-btn" id="gtw-flow-open-tg-btn">
                        ${L('fiatGetRequisites')}
                    </button>
                `;
            }
        }

        var uploadHtml = '';
        if (step2Done) {
            uploadHtml = `
                <div class="play-review-screenshot-preview">
                    <div class="preview-success-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div class="preview-info">
                        <div class="preview-title">${L('uploadedTitle')}</div>
                        <div class="preview-subtitle">${L('uploadedSubtitle')}</div>
                    </div>
                    <button type="button" class="preview-remove-btn" id="gtw-flow-remove-screenshot">✕</button>
                </div>
            `;
        } else {
            var lockedClass = step1Done ? '' : ' is-locked';
            uploadHtml = `
                <div class="play-review-upload-zone${lockedClass}" id="gtw-flow-upload-zone">
                    <input type="file" id="gtw-flow-file" accept="image/*" style="display: none;">
                    <div class="upload-zone-content">
                        <svg class="upload-zone-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span class="upload-zone-text">${L('uploadCta')}</span>
                    </div>
                </div>
            `;
        }

        var canSubmit = step1Done && step2Done;

        sheet.innerHTML = `
            <h2 class="gtw-payment-flow-title">${title}</h2>
            <p class="gtw-payment-flow-subtitle">${subtitle}</p>

            <div class="play-review-steps">
                <div class="review-step step-1 ${step1Class}">
                    <div class="review-step-num-container">
                        <div class="review-step-line"></div>
                        <div class="review-step-num">${step1Num}</div>
                    </div>
                    <div class="review-step-content">
                        <div class="review-step-title">${step1Title}</div>
                        <div class="review-step-desc">${step1Desc}</div>
                        ${step1Actions}
                    </div>
                </div>

                <div class="review-step step-2 ${step2Class}">
                    <div class="review-step-num-container">
                        <div class="review-step-num">${step2Num}</div>
                    </div>
                    <div class="review-step-content">
                        <div class="review-step-title">${L('uploadStepTitle')}</div>
                        <div class="review-step-desc">${L('uploadStepDesc')}</div>
                        ${uploadHtml}
                    </div>
                </div>
            </div>

            <div class="gtw-payment-flow-footer">
                <button type="button" class="gtw-continue-btn" id="gtw-flow-submit-btn" ${canSubmit ? '' : 'disabled'}>
                    ${L('submitOrder', { amount: amount })}
                </button>
                <button type="button" class="gtw-payment-flow-cancel" id="gtw-flow-cancel-btn">${L('cancel')}</button>
            </div>
        `;

        bindPaymentFlowEvents();
    }

    function bindPaymentFlowEvents() {
        var copyBtn = document.getElementById('gtw-flow-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                var textToCopy = PAYPAL_EMAIL;
                if (wizardState.paymentMethod === 'crypto') {
                    var exchange = getExchangeById(wizardState.paymentExchange);
                    if (exchange) textToCopy = exchange.value;
                }
                copyTextWithFeedback(textToCopy, copyBtn);
                if (wizardState.paymentMethod === 'crypto') {
                    markPaymentStep1Done();
                    handleCryptoCopyExitHint();
                }
            });
        }

        var openPaypalBtn = document.getElementById('gtw-flow-open-paypal-btn');
        if (openPaypalBtn) {
            openPaypalBtn.addEventListener('click', function () {
                openExternalUrl(PAYPAL_OPEN_URL);
                markPaymentStep1Done();
            });
        }

        var openTgBtn = document.getElementById('gtw-flow-open-tg-btn');
        if (openTgBtn) {
            openTgBtn.addEventListener('click', function () {
                createFiatOrderAndOpenTelegram(openTgBtn);
            });
        }

        document.querySelectorAll('[data-fiat-currency]').forEach(function (currencyBtn) {
            currencyBtn.addEventListener('click', function () {
                wizardState.fiatCurrency = currencyBtn.getAttribute('data-fiat-currency') || '';
                persistGuaranteedTestWizardDraft();
                renderPaymentFlow();
            });
        });
        var fiatBankInput = document.getElementById('gtw-fiat-bank-input');
        if (fiatBankInput) {
            fiatBankInput.addEventListener('input', function () {
                wizardState.fiatBankName = String(fiatBankInput.value || '');
                var helper = document.getElementById('gtw-fiat-helper');
                if (helper) helper.style.display = 'none';
                persistGuaranteedTestWizardDraft();
            });
        }
        var personalAccount = document.getElementById('gtw-fiat-personal-account');
        if (personalAccount) {
            personalAccount.addEventListener('change', function () {
                wizardState.fiatPersonalAccount = !!personalAccount.checked;
                persistGuaranteedTestWizardDraft();
            });
        }

        var uploadZone = document.getElementById('gtw-flow-upload-zone');
        var fileInput = document.getElementById('gtw-flow-file');
        if (uploadZone && fileInput && wizardState.paymentStep1Done) {
            uploadZone.addEventListener('click', function () {
                fileInput.click();
            });
            fileInput.addEventListener('change', function () {
                var file = fileInput.files && fileInput.files[0];
                if (!file) return;
                wizardState.paymentScreenshotFile = file;
                wizardState.paymentScreenshotUrl = URL.createObjectURL(file);
                renderPaymentFlow();
            });
        }

        var removeBtn = document.getElementById('gtw-flow-remove-screenshot');
        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                wizardState.paymentScreenshotFile = null;
                wizardState.paymentScreenshotUrl = '';
                renderPaymentFlow();
            });
        }

        var cancelBtn = document.getElementById('gtw-flow-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', closePaymentFlow);

        var submitBtn = document.getElementById('gtw-flow-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function () {
                handleExecutePayment();
            });
        }
    }

    /* =========================================================
       HANDLERS & CONTROLLERS
       ========================================================= */

    function handleTapFreeApp() {
        wizardState.appType = 'free';
        wizardState.licenseTestingConfirmed = false;
        closeLicenseTestingModal();
        hideInlineLicenseTestingBlock();
        updateTypeSelectorUI('free');
    }

    function handleTapPaidApp() {
        openLicenseTestingModal();
    }

    function openLicenseTestingModal() {
        var modalOverlay = document.getElementById('gtw-license-modal-overlay');
        if (modalOverlay) modalOverlay.style.display = 'flex';
    }

    function closeLicenseTestingModal() {
        var modalOverlay = document.getElementById('gtw-license-modal-overlay');
        if (modalOverlay) modalOverlay.style.display = 'none';
    }

    function handleCancelLicenseTesting() {
        closeLicenseTestingModal();
        wizardState.appType = 'free';
        wizardState.licenseTestingConfirmed = false;
        hideInlineLicenseTestingBlock();
        updateTypeSelectorUI('free');
    }

    function handleConfirmLicenseTesting() {
        closeLicenseTestingModal();
        wizardState.appType = 'paid';
        wizardState.licenseTestingConfirmed = true;
        showInlineLicenseTestingBlock();
        updateTypeSelectorUI('paid');
    }

    function showInlineLicenseTestingBlock() {
        var inlineBlock = document.getElementById('gtw-inline-license-block');
        if (inlineBlock) inlineBlock.style.display = 'block';
    }

    function hideInlineLicenseTestingBlock() {
        var inlineBlock = document.getElementById('gtw-inline-license-block');
        if (inlineBlock) inlineBlock.style.display = 'none';
    }

    function updateTypeSelectorUI(type) {
        var freeCard = document.getElementById('gtw-type-free');
        var paidCard = document.getElementById('gtw-type-paid');

        if (freeCard) {
            freeCard.classList.toggle('selected-free', type === 'free');
            freeCard.classList.remove('selected-paid');
        }
        if (paidCard) {
            paidCard.classList.toggle('selected-paid', type === 'paid');
            paidCard.classList.remove('selected-free');
        }
    }

    function clearAppnameError() {
        var helper = document.getElementById('gtw-appname-helper');
        if (helper) {
            helper.textContent = L('appNameHelper');
            helper.classList.remove('error');
        }
    }

    function handleStep1Continue() {
        var input = document.getElementById('gtw-app-name-input');
        var appName = String(input ? input.value : '').trim();

        if (!appName) {
            var helper = document.getElementById('gtw-appname-helper');
            if (helper) {
                helper.textContent = L('appNameRequired');
                helper.classList.add('error');
            }
            if (input) input.focus();
            return;
        }

        if (wizardState.prefillProject && wizardState.prefillStep1Active && !wizardState.detailsConfirmed) {
            var warningStep1 = document.getElementById('gtw-details-confirm-warning');
            if (warningStep1) warningStep1.style.display = 'inline';
            return;
        }

        if (wizardState.appType === 'paid' && !wizardState.licenseTestingConfirmed) {
            openLicenseTestingModal();
            return;
        }

        wizardState.appName = appName;
        wizardState.step = 2;

        hideGuaranteedTestWizardStep1();
        showGuaranteedTestWizardStep2();
    }

    function clearLinkError() {
        var helper = document.getElementById('gtw-link-helper');
        if (helper) {
            helper.textContent = L('linkHelper');
            helper.classList.remove('error');
        }
    }

    function updateLinkVerificationUI() {
        var linkInput = document.getElementById('gtw-link-input');
        var clearBtn = document.getElementById('gtw-clear-link-btn');
        var block = document.getElementById('gtw-link-verification');
        var urlEl = document.getElementById('gtw-link-verification-url');
        var raw = String(linkInput ? linkInput.value : '').trim();
        var normalized = normalizeTestingLink(raw);

        if (clearBtn) clearBtn.style.display = raw ? 'flex' : 'none';

        if (block && urlEl) {
            if (raw && isValidTestingLink(normalized)) {
                urlEl.textContent = normalized;
                block.style.display = 'block';
            } else {
                urlEl.textContent = '';
                block.style.display = 'none';
            }
            block.classList.toggle('is-confirmed', !!wizardState.linkConfirmed);
        }
    }

    function handleProceedToPayment() {
        var linkInput = document.getElementById('gtw-link-input');
        var link = normalizeTestingLink(String(linkInput ? linkInput.value : '').trim());

        if (!link) {
            var helperEmpty = document.getElementById('gtw-link-helper');
            if (helperEmpty) {
                helperEmpty.textContent = L('linkRequired');
                helperEmpty.classList.add('error');
            }
            updateLinkVerificationUI();
            if (linkInput) linkInput.focus();
            return;
        }

        if (!isValidTestingLink(link)) {
            var helperInvalid = document.getElementById('gtw-link-helper');
            if (helperInvalid) {
                helperInvalid.textContent = L('linkInvalid');
                helperInvalid.classList.add('error');
            }
            updateLinkVerificationUI();
            if (linkInput) linkInput.focus();
            return;
        }

        if (wizardState.prefillProject && wizardState.prefillStep2Active && !wizardState.linkConfirmed) {
            var warningStep2 = document.getElementById('gtw-link-confirm-warning');
            if (warningStep2) warningStep2.style.display = 'inline';
            return;
        }

        if (shouldShowProjectConsoleChecklist()) {
            var checklist = wizardState.consoleChecklist || {};
            if (!checklist.email || !checklist.countries || !checklist.review) {
                var helperChecklist = document.getElementById('gtw-link-helper');
                if (helperChecklist) {
                    helperChecklist.textContent = L('checklistRequired');
                    helperChecklist.classList.add('error');
                }
                return;
            }
        }

        if (linkInput) linkInput.value = link;
        wizardState.testingLink = link;
        updateLinkVerificationUI();

        hideGuaranteedTestWizardStep2();
        showGuaranteedTestWizardPayment();
    }

    function selectPaymentMethod(method) {
        wizardState.paymentMethod = method;

        var cryptoCard = document.getElementById('gtw-method-crypto');
        var paypalCard = document.getElementById('gtw-method-paypal');
        var rubCard = document.getElementById('gtw-method-rub');
        var payBtn = document.getElementById('gtw-pay-btn');

        if (cryptoCard) {
            cryptoCard.classList.toggle('selected', method === 'crypto');
            cryptoCard.classList.toggle('selected-crypto', method === 'crypto');
        }
        if (paypalCard) paypalCard.classList.toggle('selected', method === 'paypal');
        if (rubCard) rubCard.classList.toggle('selected', method === 'rub');

        if (payBtn) {
            if (method === 'crypto') {
                payBtn.disabled = !wizardState.paymentExchange;
                payBtn.textContent = wizardState.paymentExchange
                    ? L('openSteps', { amount: getPaymentAmount(method) })
                    : L('selectExchange');
            } else {
                payBtn.disabled = false;
                payBtn.textContent = L('openSteps', { amount: getPaymentAmount(method) });
            }
        }
        persistGuaranteedTestWizardDraft();
    }

    function handleExecutePayment() {
        if (wizardState.paymentMethod === 'rub' && wizardState.fiatOrderId) {
            attachFiatProofAndComplete().catch(function () {});
            return;
        }
        submitGuaranteedOrderAndOpenTelegram().catch(function () {});
    }

    function getGuaranteedOrderNotes(extraParts) {
        var notesParts = extraParts || [];
        if (wizardState.prefillProject && wizardState.prefillProject.id) {
            notesParts.push('app_id=' + String(wizardState.prefillProject.id));
            var pkg = String(wizardState.prefillProject.package || wizardState.prefillProject.package_name || '').trim();
            if (pkg) notesParts.push('package=' + pkg);
        }
        return notesParts.length ? notesParts.join('; ') : null;
    }

    function getInitDataPayload(payload) {
        if (typeof withInitData === 'function') return withInitData(payload);
        payload.init_data = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        return payload;
    }

    function getOrderDetails(payload) {
        return (payload && (payload.details || payload.detail)) || {};
    }

    async function createFiatOrderAndOpenTelegram(button) {
        var currency = getFiatCurrency(wizardState.fiatCurrency);
        var bankName = String(wizardState.fiatBankName || '').trim();
        var helper = document.getElementById('gtw-fiat-helper');
        if (!currency || !bankName) {
            if (helper) {
                helper.textContent = L('fiatMissing');
                helper.style.display = 'block';
            }
            return;
        }
        if (wizardState.fiatOrderId) {
            var existingCode = wizardState.fiatPublicCode || ('GT-' + (24766 + Number(wizardState.fiatOrderId || 0) * 41));
            openFiatManagerChat(existingCode, currency.code, bankName);
            markPaymentStep1Done();
            return;
        }

        var originalText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = L('fiatCreating');
        }
        try {
            var response = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/guaranteed-test-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getInitDataPayload({
                    app_name: wizardState.appName,
                    app_type: wizardState.appType,
                    testing_link: wizardState.testingLink,
                    payment_method: 'rub',
                    amount_usd: getPaymentAmount('rub'),
                    create_mode: 'requisites',
                    notes: getGuaranteedOrderNotes([
                        'currency=' + currency.code,
                        'bank=' + bankName,
                        'personal_account=' + (wizardState.fiatPersonalAccount ? 'yes' : 'no'),
                        'create_mode=requisites',
                        'base_amount=20',
                        'fee_amount=3'
                    ])
                }))
            });
            var payload = {};
            try { payload = await response.json(); } catch (_) {}
            var order = payload.order || {};
            if (!response.ok || payload.status === 'error') {
                var details = getOrderDetails(payload);
                if ((payload.code || '') === 'order_already_active') {
                    wizardState.fiatOrderId = details.id || details.order_id || null;
                    wizardState.fiatPublicCode = String(details.public_code || details.order_code || '');
                    if (!wizardState.fiatPublicCode && !wizardState.fiatOrderId) throw new Error('order_already_active');
                } else {
                    throw new Error((payload && (payload.code || payload.detail || payload.message)) || 'order_create_failed');
                }
            } else {
                wizardState.fiatOrderId = order.id || payload.id || null;
                wizardState.fiatPublicCode = String(order.public_code || payload.public_code || '');
                if (!wizardState.fiatOrderId) {
                    throw new Error('order_create_failed');
                }
            }

            var orderCode = wizardState.fiatPublicCode || ('GT-' + (24766 + Number(wizardState.fiatOrderId || 0) * 41));
            wizardState.fiatPublicCode = orderCode;
            // Official NEW ORDER + receipt only after submit with proof.
            openFiatManagerChat(orderCode, currency.code, bankName);
            markPaymentStep1Done();
            if (typeof showToast === 'function') {
                showToast(L('fiatToastRequested'));
            }
        } catch (error) {
            console.error('Fiat requisites request failed:', error);
            helper = document.getElementById('gtw-fiat-helper');
            if (helper) {
                helper.textContent = L('fiatCreateFailed');
                helper.style.display = 'block';
            }
            if (typeof showToast === 'function') {
                showToast(L('fiatCreateFailed'));
            }
            if (button && document.body.contains(button)) {
                button.disabled = false;
                button.textContent = originalText || L('fiatGetRequisites');
            } else {
                renderPaymentFlow();
            }
        }
    }

    async function uploadPaymentScreenshot() {
        var file = wizardState.paymentScreenshotFile;
        if (!file) return '';

        var apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : '') || (window.App && window.App.API_BASE) || '';
        var formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', String((window.App && window.App.userId) || window.userId || 0));
        if (typeof withInitData === 'function') {
            var payload = withInitData({});
            formData.append('init_data', payload.init_data || '');
        } else if (typeof getTelegramInitDataRaw === 'function') {
            formData.append('init_data', getTelegramInitDataRaw());
        }

        try {
            var resp = await fetch(apiBase + '/upload-icon', {
                method: 'POST',
                body: formData
            });
            var data = await resp.json();
            if (data && data.status === 'success' && data.url) {
                return String(data.url);
            }
        } catch (e) {
            console.error('Payment screenshot upload failed:', e);
        }
        return '';
    }

    async function submitGuaranteedOrderAndOpenTelegram() {
        var method = wizardState.paymentMethod;
        if (!method) return;

        var submitBtn = document.getElementById('gtw-flow-submit-btn');
        var originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = L('submitting');
        }

        try {
            var amountUsd = getPaymentAmount(method);
            var proofUrl = await uploadPaymentScreenshot();
            var exchange = getExchangeById(wizardState.paymentExchange);
            var notesParts = [];
            if (exchange) notesParts.push('exchange=' + exchange.name);
            if (proofUrl) notesParts.push('proof=' + proofUrl);

            var response = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/guaranteed-test-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(withInitData({
                    app_name: wizardState.appName,
                    app_type: wizardState.appType,
                    testing_link: wizardState.testingLink,
                    payment_method: method,
                    amount_usd: amountUsd,
                    notes: getGuaranteedOrderNotes(notesParts)
                }))
            });
            var payload = {};
            try {
                payload = await response.json();
            } catch (_) {}
            if (!response.ok || payload.status === 'error') {
                throw new Error((payload && (payload.code || payload.detail || payload.message)) || 'order_create_failed');
            }

            var order = payload.order || {};
            var publicCode = String(order.public_code || ('GT-' + (10000 + Number(order.id || 0))));
            if (typeof window.invalidateGuaranteedOrdersCache === 'function') {
                window.invalidateGuaranteedOrdersCache();
            }

            closePaymentFlow();
            hideGuaranteedTestWizardPayment();
            hideGuaranteedTestWizardStep2();
            hideGuaranteedTestWizardStep1();
            clearGuaranteedTestWizardDraft();
            if (typeof showToast === 'function') {
                showToast(L('toastSubmitted', { code: publicCode }));
            }
        } catch (error) {
            console.error('Guaranteed order submit failed:', error);
            if (typeof showToast === 'function') {
                showToast(L('toastFailed'));
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText || L('submitFallback');
            }
        }
    }

    async function attachFiatProofAndComplete() {
        var submitBtn = document.getElementById('gtw-flow-submit-btn');
        var originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = L('submitting');
        }
        try {
            var proofUrl = await uploadPaymentScreenshot();
            if (!proofUrl) throw new Error('proof_upload_failed');
            var response = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/guaranteed-test-orders/' + encodeURIComponent(wizardState.fiatOrderId) + '/attach-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(getInitDataPayload({ proof_url: proofUrl }))
            });
            var payload = {};
            try { payload = await response.json(); } catch (_) {}
            if (!response.ok || payload.status === 'error') {
                throw new Error((payload && (payload.code || payload.detail || payload.message)) || 'proof_attach_failed');
            }
            if (typeof window.invalidateGuaranteedOrdersCache === 'function') {
                window.invalidateGuaranteedOrdersCache();
            }
            closePaymentFlow();
            hideGuaranteedTestWizardPayment();
            hideGuaranteedTestWizardStep2();
            hideGuaranteedTestWizardStep1();
            clearGuaranteedTestWizardDraft();
            if (typeof showToast === 'function') {
                showToast(L('toastSubmitted', { code: wizardState.fiatPublicCode || '' }));
            }
        } catch (error) {
            console.error('Fiat proof attach failed:', error);
            if (typeof showToast === 'function') showToast(L('toastProofFailed'));
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText || L('submitFallback');
            }
        }
    }

    function openTelegramContact(text) {
        var targetUrl = 'https://t.me/' + TELEGRAM_SUPPORT + '?text=' + encodeURIComponent(text);
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink(targetUrl);
        } else {
            window.open(targetUrl, '_blank');
        }
    }

    function handleOpenLicenseSetupGuide() {
        openLicenseGuideModal();
    }

    function handleOpenGeneralTestingGuide() {
        openExternalUrl(GENERAL_TESTING_GUIDE_URL);
    }

    function openExternalUrl(url) {
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
            window.Telegram.WebApp.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    function copyTextWithFeedback(text, btnEl) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (btnEl) {
                    var originalText = btnEl.textContent;
                    btnEl.textContent = L('copied');
                    btnEl.style.color = '#30D158';
                    setTimeout(function () {
                        btnEl.textContent = originalText;
                        btnEl.style.color = '';
                    }, 1500);
                }
            }).catch(function () {});
        }
    }

    function handleCryptoCopyExitHint() {
        var exchange = getExchangeById(wizardState.paymentExchange);
        var exName = exchange ? exchange.name : L('selectedExchange');
        if (typeof showToast === 'function') {
            showToast(L('cryptoCopiedToast', { name: exName }));
        }
        try {
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg && typeof tg.showPopup === 'function') {
                tg.showPopup({
                    title: L('cryptoPopupTitle', { name: exName }),
                    message: L('cryptoPopupText', { name: exName }),
                    buttons: [
                        { id: 'later', type: 'cancel', text: L('cryptoPopupStay') },
                        { id: 'close', type: 'default', text: L('cryptoPopupGo') }
                    ]
                }, function (buttonId) {
                    if (buttonId === 'close' && typeof tg.close === 'function') {
                        if (typeof tg.openTelegramLink === 'function') {
                            try { tg.openTelegramLink('https://t.me/saved'); } catch (_) {}
                        }
                        tg.close();
                    }
                });
            } else if (tg && typeof tg.close === 'function') {
                tg.close();
            }
        } catch (_) {}
    }

    function resolveProjectById(projectId) {
        if (!projectId) return null;
        var projects = (typeof myProjects !== 'undefined' ? myProjects : []) || [];
        return projects.find(function (p) { return Number(p.id) === Number(projectId); }) || null;
    }

    /* =========================================================
       PUBLIC EXPORTS & DISPLAY CONTROLLERS
       ========================================================= */

    function showGuaranteedTestWizardStep1(options) {
        options = options || {};
        if (typeof window.hideGuaranteedTestOfferModal === 'function') {
            window.hideGuaranteedTestOfferModal();
        }

        if (!options.keepState) {
            resetWizardState(false);
        }

        if (options.projectId) {
            var project = resolveProjectById(options.projectId);
            if (project) applyProjectPrefill(project);
        }

        wizardState.step = 1;
        ensureWizardInDOM();
        syncStep1FormFromState();
        syncStep2FormFromState();
        persistGuaranteedTestWizardDraft();

        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (overlay1) overlay1.style.display = 'flex';
    }

    function hideGuaranteedTestWizardStep1() {
        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (overlay1) overlay1.style.display = 'none';
    }

    function showGuaranteedTestWizardStep2() {
        wizardState.step = 2;
        ensureWizardInDOM();
        syncStep2FormFromState();
        persistGuaranteedTestWizardDraft();
        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (overlay2) overlay2.style.display = 'flex';
    }

    function hideGuaranteedTestWizardStep2() {
        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (overlay2) overlay2.style.display = 'none';
    }

    function showGuaranteedTestWizardPayment(options) {
        options = options || {};
        ensureWizardInDOM();
        wizardState.step = 3;
        if (!options.keepState) {
            wizardState.paymentMethod = null;
            wizardState.paymentExchange = null;
        }
        var payBtn = document.getElementById('gtw-pay-btn');
        if (options.keepState && wizardState.paymentMethod) {
            selectPaymentMethod(wizardState.paymentMethod);
        } else if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = L('selectMethod');
        }
        persistGuaranteedTestWizardDraft();
        var overlayPay = document.getElementById('guaranteed-test-wizard-payment-overlay');
        if (overlayPay) overlayPay.style.display = 'flex';
    }

    function hideGuaranteedTestWizardPayment() {
        closePaymentFlow();
        var overlayPay = document.getElementById('guaranteed-test-wizard-payment-overlay');
        if (overlayPay) overlayPay.style.display = 'none';
    }

    window.showGuaranteedTestWizardStep1 = showGuaranteedTestWizardStep1;
    window.hideGuaranteedTestWizardStep1 = hideGuaranteedTestWizardStep1;
    window.showGuaranteedTestWizardStep2 = showGuaranteedTestWizardStep2;
    window.hideGuaranteedTestWizardStep2 = hideGuaranteedTestWizardStep2;
    window.showGuaranteedTestWizardPayment = showGuaranteedTestWizardPayment;
    window.hideGuaranteedTestWizardPayment = hideGuaranteedTestWizardPayment;
    window.getGuaranteedTestWizardDraft = readGuaranteedTestWizardDraft;
    window.clearGuaranteedTestWizardDraft = clearGuaranteedTestWizardDraft;
    window.resumeGuaranteedTestWizardFromDraft = resumeGuaranteedTestWizardFromDraft;
    window.persistGuaranteedTestWizardDraft = persistGuaranteedTestWizardDraft;
    window.gtwWizardState = wizardState;
})();
