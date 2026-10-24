/* A lost response is not proof of a failed check-in. Read server state once;
   never blindly repeat a write or calculate rewards on the client. */
async function fetchCheckinWithRecovery(url, options, identity) {
    async function recover() {
        if (!identity || !identity.progressId || String(userId) !== identity.actor
            || getLocalDate() !== identity.date) return null;
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 8000);
        try {
            var response = await fetch(API_BASE + '/tasks/' + identity.actor
                + '?init_data=' + encodeURIComponent(getTelegramInitDataRaw()), {
                cache: 'no-store', signal: controller.signal,
            });
            if (!response.ok) return null;
            var data = await response.json();
            if (String(userId) !== identity.actor || getLocalDate() !== identity.date) return null;
            var row = (data.to_test_today || []).find(function(item) {
                return Number(item.app_id) === identity.appId
                    && Number(item.progress_id) === identity.progressId
                    && (!identity.run || Number(item.run_iteration) === identity.run)
                    && item.last_check_date === identity.date;
            });
            if (!row) return null;
            return { status: 'success', already_checked_today: true,
                last_check_date: row.last_check_date, checkins_count: row.checkins_count,
                skips_count: row.skips_count, daily_timeline: row.daily_timeline,
                testing_day: row.testing_days, access_pause_days: row.access_pause_days,
                play_feedback_submitted: !!row.play_feedback_submitted,
                earned_bust: 0, earned_karma: 0 };
        } catch (error) { return null; }
        finally { clearTimeout(timeout); }
    }
    if (window.DeployStatus) Promise.resolve().then(function() {
        return window.DeployStatus.refresh();
    }).catch(function() {});
    var response, result;
    try {
        response = await fetch(url, options);
        try { result = await response.json(); } catch (error) { result = null; }
    } catch (error) {
        var recovered = await recover();
        if (!recovered) throw error;
        return { ok: true, status: 200, json: async function() { return recovered; } };
    }
    if (response.status >= 500 || !result || result.code === 'database_error') {
        var saved = await recover();
        if (saved) return { ok: true, status: 200, json: async function() { return saved; } };
    }
    return { ok: response.ok, status: response.status, json: async function() { return result; } };
}
