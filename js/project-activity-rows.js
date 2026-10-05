/* Shared identity presentation for the filtered project activity lists.
   Keep source precedence aligned with Testing Control's history avatar. */
(function () {
    'use strict';

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function text(key, fallback) {
        if (typeof window.t === 'function') {
            var value = window.t(key, {}, typeof lang !== 'undefined' ? lang : undefined);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function localLink(tester, project) {
        var id = Number(tester.tester_id || tester.id || 0);
        var rows = project && project.testers;
        if (!id || !Array.isArray(rows)) return {};
        return rows.find(function (row) {
            return Number(row.tester_id || row.id || 0) === id;
        }) || {};
    }

    function appBadgeHtml(tester, project) {
        tester = tester || {};
        var local = localLink(tester, project);
        var source = Object.assign({}, local, tester);
        // External guests must never inherit a reciprocal app from another link.
        var guest = !!(source.is_guest_tester || source.is_external
            || String(source.external_source || '').trim()
            || String(source.external_guest_app_id || '').trim()
            || Number(source.external_source_app_id || 0) > 0);
        var appId = Number(tester.reciprocal_app_id || local.reciprocal_app_id || 0);
        var name = String(tester.reciprocal_app_name || local.reciprocal_app_name || '').trim();
        var icon = String(tester.reciprocal_app_icon_url || local.reciprocal_app_icon_url || '').trim();
        var joinType = String(tester.join_type || local.join_type || 'invite').toLowerCase();
        var title;
        var content;
        if (guest) {
            title = text('linkedBadgeGuest', 'Guest project');
            content = '👽';
        } else if (appId > 0) {
            title = name || text('testingControlReciprocalProject', 'Mutual project');
            if (icon && typeof window.resolveIconUrl === 'function') {
                try { icon = String(window.resolveIconUrl(icon) || icon); } catch (_err) { /* Keep original URL. */ }
            }
            content = icon ? '<img src="' + esc(icon) + '" alt="" loading="lazy" decoding="async">'
                : esc((name.charAt(0) || 'A').toUpperCase());
        } else if (joinType === 'bounty') {
            title = text('testerSourceBountyFull', 'Contract test');
            content = '💎';
        } else if (joinType === 'mutual' || joinType === 'prelaunch') {
            title = text('testerSourceMutualFull', 'Mutual test');
            content = '🤝';
        } else {
            title = text('testerSourceInviteNoMutualFull', 'Invite (No Mutual)');
            content = '🔗';
        }
        return '<span class="pc-identity-app" role="img" title="' + esc(title) + '" aria-label="' + esc(title) + '">' + content + '</span>';
    }

    function avatarHtml(tester, project) {
        tester = tester || {};
        var url = String(tester.avatar_url || '').trim();
        var label = String(tester.username || tester.full_name || tester.name || '?').replace(/^@+/, '');
        var main = url ? '<img class="pc-avatar" src="' + esc(url) + '" loading="lazy" decoding="async" alt="">'
            : '<span class="pc-avatar pc-avatar--letter">' + esc((label.charAt(0) || '?').toUpperCase()) + '</span>';
        return '<span class="pc-person__avatar">' + main + appBadgeHtml(tester, project) + '</span>';
    }

    window.ProjectActivityRows = { avatarHtml: avatarHtml, appBadgeHtml: appBadgeHtml };
})();
