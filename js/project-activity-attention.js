(function (root) {
    'use strict';

    // Mirrors the project roster / mutual-exchange-ui status semantics. In project
    // context left is the tester's leg and right is the project owner's leg.
    function isLeft(status) {
        return ['abandoned', 'justified_exit', 'kicked_by_owner', 'canceled_neutral', 'dropped']
            .indexOf(String(status || '').trim().toLowerCase()) !== -1;
    }

    function relationship(tester) {
        var exchange = tester.exchange_state && Number(tester.exchange_state.version || 0) >= 1
            ? tester.exchange_state : null;
        var mutual = ['mutual', 'prelaunch'].indexOf(String(tester.join_type || '').toLowerCase()) !== -1;
        var testerLeft = !!tester.is_left_soft || (exchange
            ? isLeft(exchange.left && exchange.left.leg_status) : isLeft(tester.status));
        var viewerLeft = exchange
            ? isLeft(exchange.right && exchange.right.leg_status)
            : isLeft(tester.reciprocal_partner_progress_status);
        var broken = mutual && (exchange ? !!exchange.is_broken
            : (Number(tester.reciprocal_app_id || 0) <= 0 || !!tester.is_broken_reciprocal || viewerLeft));
        return { testerLeft: testerLeft, viewerLeft: viewerLeft, broken: broken };
    }

    function priority(item) {
        return (item.reasons || []).reduce(function (result, reason) {
            var value = 4;
            if (reason.code === 'skips') value = 0;
            else if (reason.code === 'tester_left') value = 1;
            else if (reason.code === 'not_opened') value = 2;
            else if (reason.code === 'missed_control') {
                value = reason.proofRequested && !reason.proofReceived ? 3 : 2;
            }
            return Math.min(result, value);
        }, 4);
    }

    // Keeps the existing collector's proof/catch-up objects intact; only enriches
    // relationship reasons and orders urgency. Never mutates cached input rows.
    function augment(project, existingItems, options) {
        options = options || {};
        var ru = String(options.lang || 'en').toLowerCase().indexOf('ru') === 0;
        var dismissed = options.isDismissed || root.isBrokenTesterDismissed;
        var byId = new Map();
        (existingItems || []).forEach(function (item) {
            byId.set(Number(item.testerId), Object.assign({}, item, { reasons: (item.reasons || []).slice() }));
        });
        (project && project.testers || []).forEach(function (tester) {
            if (!tester || tester.is_guest_tester || tester.is_external) return;
            var id = Number(tester.tester_id || 0);
            if (id <= 0) return;
            var state = relationship(tester);
            if (state.broken && !tester.is_left_soft && typeof dismissed === 'function'
                && dismissed(Number(project.id), id)) {
                byId.delete(id);
                return;
            }
            if (!state.testerLeft && !state.broken) return;
            var item = byId.get(id) || { tester: tester, testerId: id, reasons: [] };
            // A departed tester needs a decision, not check-in reminders.
            if (state.testerLeft) item.reasons = [];
            var code = state.testerLeft ? 'tester_left' : 'broken_link';
            if (!item.reasons.some(function (reason) { return reason.code === code; })) {
                item.reasons.push({
                    code: code,
                    label: state.testerLeft
                        ? (ru ? 'Тестер вышел' : 'Tester left')
                        : (state.viewerLeft
                            ? (ru ? 'Вы вышли · тестер продолжает' : 'You left · tester continues')
                            : (ru ? 'Связь разорвана' : 'Link broken')),
                    action: state.testerLeft ? 'left_status' : 'link_status',
                    actionLabel: state.testerLeft
                        ? (ru ? 'Решить' : 'Review') : (ru ? 'Связь' : 'Link'),
                });
            }
            byId.set(id, item);
        });
        return Array.from(byId.values()).map(function (item) {
            item.priority = priority(item);
            return item;
        }).sort(function (a, b) { return a.priority - b.priority; });
    }

    root.ProjectActivityAttention = { augment: augment, priority: priority };
})(window);
