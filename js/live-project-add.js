/* A pending ownership request never masquerades as an active Live project. */
(function(){
  'use strict';
  var U = LiveMarketUI, t = U.t, e = U.e;
  var request = null, busy = false, layer = null, master = null;
  var timerInterval = null, timerSeconds = 900;

  function button(key, action, primary, extraClass) {
    return '<button type="button" class="lm-action ' + (primary ? 'lm-action-primary ' : '') + (extraClass || '') + '" data-la="' + action + '">' + e(t(key)) + '</button>';
  }

  function clean(value) {
    try {
      var u = new URL(value);
      if (u.hostname === 'play.google.com') return u.searchParams.get('id') || value;
    } catch (_) {}
    return String(value || '').trim();
  }

  async function call(path, body) {
    return (await U.api('/live-ownership' + path, 'POST', body || {})).result;
  }

  function body(html) {
    if (layer && layer.isConnected) {
      layer.querySelector('.lm-sheet-body').innerHTML = html + '<p class="lm-error" role="alert"></p>';
    }
  }

  function setTitle(key) {
    if (layer && layer.isConnected) {
      var h2 = layer.querySelector('header.lm-sheet-header h2');
      if (h2) h2.textContent = t(key);
    }
  }

  function err(ex) {
    if (layer && layer.isConnected) {
      var msg = ex && ex.message || ex;
      var msgKey = 'laError_' + msg;
      var text = t(msgKey) !== msgKey ? t(msgKey) : t('laError');
      if (ex && ex.retry_after) text = text.replace('{n}', ex.retry_after);
      var alertEl = layer.querySelector('[role=alert]');
      if (alertEl) alertEl.textContent = text;
    }
  }

  function clearTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startTimer(sec) {
    clearTimer();
    timerSeconds = sec || 900;
    function renderTime() {
      if (!layer || !layer.isConnected) {
        clearTimer();
        return;
      }
      var timerEl = layer.querySelector('[data-la-timer]');
      if (!timerEl) return;
      if (timerSeconds <= 0) {
        clearTimer();
        timerEl.textContent = '00:00';
        var alertEl = layer.querySelector('[role=alert]');
        if (alertEl) alertEl.textContent = t('laOtpExpired');
        layer.querySelectorAll('.la-otp-cell').forEach(function(c) { c.disabled = true; });
        var vBtn = layer.querySelector('[data-la=verify]');
        if (vBtn) vBtn.disabled = true;
      } else {
        var m = Math.floor(timerSeconds / 60);
        var s = timerSeconds % 60;
        timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        timerSeconds--;
      }
    }
    renderTime();
    timerInterval = setInterval(renderTime, 1000);
  }

  function startCooldown(btn, sec, origText) {
    if (!btn || !btn.isConnected) return;
    btn.setAttribute('data-cooldown', '1');
    btn.disabled = true;
    function tick() {
      if (!btn.isConnected) return;
      if (sec <= 0) {
        btn.removeAttribute('data-cooldown');
        btn.disabled = false;
        btn.textContent = origText;
      } else {
        btn.textContent = t('laTokenCooldownBtn', {n: sec});
        sec--;
        setTimeout(tick, 1000);
      }
    }
    tick();
  }

  function open() {
    clearTimer();
    request = null;
    layer = U.sheet(
      t('laTitle'),
      '<p class="la-subtitle">' + e(t('laSubtitle')) + '</p>' +
      '<div class="la-field-row">' +
        '<span class="la-field-label">' + e(t('laFieldLabel')) + '</span>' +
        '<a class="la-link-subtle" href="https://play.google.com/store/apps" target="_blank" rel="noopener noreferrer">' + e(t('laOpenPlayLink')) + '</a>' +
      '</div>' +
      '<div class="la-input-wrap">' +
        '<input class="la-input" data-la-link placeholder="com.example.app" maxlength="2048">' +
        '<button type="button" class="la-paste-chip" data-la="paste-link">' + e(t('laPaste')) + '</button>' +
      '</div>' +
      button('laPreview', 'preview', true) +
      '<p class="lm-error" role="alert"></p>'
    );
    bind();
  }

  function preview() {
    var p = request.passport || {};
    master = layer;
    layer = U.sheet(
      t('laIsYours'),
      '<div class="la-passport-heading">' +
        (/^https:\/\//.test(p.icon_url || '') ? '<img class="la-passport-icon" src="' + e(p.icon_url) + '" alt="">' : '') +
        '<div class="la-passport-info">' +
          '<strong class="la-passport-title">' + e(p.title) + '</strong>' +
          '<span class="la-passport-meta">' + e(request.developer || p.developer || '') + (p.category ? ' · ' + e(p.category) : '') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="la-desc-box">' +
        '<p class="la-desc-text is-clamped" data-la-desc>' + e(p.description || '') + '</p>' +
        ((p.description || '').length > 120 ? '<button type="button" class="la-desc-toggle" data-la="toggle-desc">' + e(t('laShowMore')) + '</button>' : '') +
      '</div>' +
      button('laConfirm', 'confirm', true) +
      button('laNotMine', 'not-mine') +
      '<div class="la-ghost-actions" data-la-alternatives hidden>' +
        button('laOtherLink', 'other-link', false, 'lm-action-ghost') +
        button('laFeedback', 'feedback', false, 'lm-action-ghost') +
      '</div>' +
      '<p class="lm-error" role="alert"></p>',
      {presentation: 'dialog', onclose: function() { layer = master; }}
    );
    bind();
    layer.addEventListener('click', function(ev) {
      var b = ev.target.closest('[data-la]');
      if (!b || busy) return;
      var act = b.dataset.la;
      if (act === 'toggle-desc') {
        var descEl = layer.querySelector('[data-la-desc]');
        if (descEl) {
          var clamped = descEl.classList.toggle('is-clamped');
          b.textContent = t(clamped ? 'laShowMore' : 'laShowLess');
        }
      } else if (act === 'not-mine') {
        var alt = layer.querySelector('[data-la-alternatives]');
        if (alt) {
          alt.hidden = false;
          var otherBtn = layer.querySelector('[data-la=other-link]');
          if (otherBtn) otherBtn.focus();
        }
      } else if (act === 'other-link') {
        U.close(layer);
        request = null;
        if (master) {
          var inp = master.querySelector('[data-la-link]');
          if (inp) inp.focus();
        }
      } else if (act === 'feedback' && window.sendFeedback) {
        window.sendFeedback('question');
        var feedback = document.getElementById('feedback-modal');
        if (feedback) {
          feedback.style.zIndex = String(Number(layer.style.zIndex || 10000) + 10);
          var input = feedback.querySelector('textarea');
          if (input) input.focus();
        }
        if (window.syncTelegramBackButton) syncTelegramBackButton();
      }
    });
  }

  function verification() {
    var isSent = request.state === 'code_sent';
    body(
      '<p>' + e(t(isSent ? 'laEmailIntro' : 'laEmailPrompt', {email: request.email_masked || t('laNoEmail')})) + '</p>' +
      button(isSent ? 'laResendCode' : 'laSend', 'send') +
      '<div class="la-otp-grid" data-la-otp>' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="la-otp-cell" data-idx="0" autocomplete="one-time-code">' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="la-otp-cell" data-idx="1">' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="la-otp-cell" data-idx="2">' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="la-otp-cell" data-idx="3">' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="la-otp-cell" data-idx="4">' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" class="la-otp-cell" data-idx="5">' +
      '</div>' +
      '<div class="la-otp-meta">' +
        '<span class="la-otp-timer">⏳ <b data-la-timer>15:00</b></span>' +
      '</div>' +
      button('laVerify', 'verify', true) +
      '<details class="la-alternative">' +
        '<summary>' + e(t('laAlternative')) + '</summary>' +
        '<div class="la-alt-body">' +
          '<p>' + e(t('laTokenHint')) + '</p>' +
          '<div class="la-token-box">' +
            '<code class="la-token-value">' + e(request.token) + '</code>' +
            '<button type="button" class="la-token-copy" data-la="copy-token" title="Копировать">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
                '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          button('laCheckToken', 'check-token', true) +
          button('laAdminSubmit', 'alternative', false, 'lm-action-ghost') +
        '</div>' +
      '</details>'
    );
    startTimer(900);
    bindOtp();
  }

  function bindOtp() {
    var grid = layer ? layer.querySelector('[data-la-otp]') : null;
    if (!grid) return;
    var cells = Array.from(grid.querySelectorAll('.la-otp-cell'));

    function getCode() {
      return cells.map(function(c) { return c.value; }).join('');
    }

    function triggerVerify() {
      if (getCode().length === 6) {
        var vBtn = layer.querySelector('[data-la=verify]');
        if (vBtn && !vBtn.disabled && !vBtn.hasAttribute('data-cooldown')) {
          vBtn.click();
        }
      }
    }

    grid.addEventListener('input', function(ev) {
      var cell = ev.target;
      if (!cell.classList.contains('la-otp-cell')) return;
      var val = cell.value.replace(/\D/g, '');
      cell.value = val ? val.slice(-1) : '';
      var idx = parseInt(cell.dataset.idx, 10);
      if (cell.value && idx < 5) {
        var next = cells[idx + 1];
        if (next) next.focus();
      }
      triggerVerify();
    });

    grid.addEventListener('keydown', function(ev) {
      var cell = ev.target;
      if (!cell.classList.contains('la-otp-cell')) return;
      var idx = parseInt(cell.dataset.idx, 10);
      if (ev.key === 'Backspace' && !cell.value && idx > 0) {
        var prev = cells[idx - 1];
        if (prev) {
          prev.focus();
          prev.value = '';
        }
      }
    });

    grid.addEventListener('paste', function(ev) {
      var clip = (ev.clipboardData || window.clipboardData).getData('text') || '';
      var digits = clip.replace(/\D/g, '').slice(0, 6);
      if (!digits.length) return;
      ev.preventDefault();
      for (var i = 0; i < 6; i++) {
        cells[i].value = digits[i] || '';
      }
      var targetIdx = Math.min(digits.length, 5);
      cells[targetIdx].focus();
      triggerVerify();
    });

    if (cells[0]) cells[0].focus();
  }

  function pendingView() {
    clearTimer();
    setTitle('laPendingTitle');
    body(
      '<div class="la-pending-view">' +
        '<div class="la-pending-icon">⏳</div>' +
        '<h3 class="la-pending-heading">' + e(t('laPendingHeading')) + '</h3>' +
        '<p class="la-pending-desc">' + e(t('laPendingDesc')) + '</p>' +
        button('laGotIt', 'close-pending', true) +
      '</div>'
    );
  }

  async function done(value) {
    if (!value) return;
    if (value.app_id) {
      clearTimer();
      body('<p>' + e(t('laVerified')) + '</p>');
      if (window.loadData) loadData();
      mount();
      window.dispatchEvent(new CustomEvent('live-market:changed'));
    } else if (value.state === 'admin_pending') {
      pendingView();
      mount();
    } else if (value.error) {
      if (value.error === 'verification_wrong_code') {
        err({message: value.error});
        if (typeof value.attempts_left === 'number' && value.attempts_left > 0 && value.attempts_left <= 3) {
          if (window.showToast) showToast(t('laAttemptsLeft', {n: value.attempts_left}));
        }
      } else if (value.error === 'verification_attempts_exhausted' || value.attempts_left === 0) {
        clearTimer();
        err({message: 'verification_attempts_exhausted'});
        if (layer) {
          layer.querySelectorAll('.la-otp-cell').forEach(function(c) { c.disabled = true; });
          var vBtn = layer.querySelector('[data-la=verify]');
          if (vBtn) vBtn.disabled = true;
        }
      } else {
        err({message: value.error, retry_after: value.retry_after});
      }
    } else {
      verification();
    }
  }

  function bind() {
    layer.addEventListener('paste', function(ev) {
      if (ev.target.hasAttribute('data-la-link')) {
        setTimeout(function() {
          ev.target.value = clean(ev.target.value);
        }, 0);
      }
    });

    layer.addEventListener('click', async function(ev) {
      var b = ev.target.closest('[data-la]');
      if (!b || busy || b.hasAttribute('data-cooldown')) return;
      var action = b.dataset.la, value;

      if (action === 'paste-link') {
        try {
          var clip = await navigator.clipboard.readText();
          if (clip) {
            var input = layer.querySelector('[data-la-link]');
            if (input) {
              input.value = clean(clip);
              input.focus();
            }
          }
        } catch (_) {
          if (window.showToast) showToast(t('laError'));
        }
        return;
      }

      if (action === 'copy-token') {
        try {
          await navigator.clipboard.writeText(request && request.token || '');
          if (window.showToast) showToast(t('laTokenCopied'));
        } catch (_) {
          if (window.showToast) showToast(t('laError'));
        }
        return;
      }

      if (action === 'close-pending') {
        clearTimer();
        U.close(layer);
        if (window.loadData) loadData();
        mount();
        return;
      }

      busy = true;
      b.disabled = true;
      try {
        if (action === 'preview') {
          var linkInput = layer.querySelector('[data-la-link]');
          linkInput.value = clean(linkInput.value);
          request = await call('/preview', {value: linkInput.value});
          preview();
        } else if (action === 'confirm') {
          value = await call('/' + request.id + '/confirm');
          await done(value);
        } else if (action === 'send') {
          value = await call('/' + request.id + '/send-code');
          if (window.showToast) showToast(t('laSending'));
          request.state = 'code_sent';
          verification();
        } else if (action === 'verify') {
          var cells = layer.querySelectorAll('.la-otp-cell');
          var code = Array.from(cells).map(function(c) { return c.value; }).join('').replace(/\s/g, '');
          value = await call('/' + request.id + '/verify', {code: code});
          await done(value);
        } else if (action === 'check-token') {
          var orig = b.textContent;
          b.textContent = t('laTokenChecking');
          try {
            value = await call('/' + request.id + '/check-token');
            if (value && value.error) {
              err({message: value.error, retry_after: value.retry_after});
              if (value.retry_after) startCooldown(b, value.retry_after, orig);
            } else {
              await done(value);
            }
          } finally {
            if (!b.hasAttribute('data-cooldown')) b.textContent = orig;
          }
        } else if (action === 'alternative') {
          value = await call('/' + request.id + '/alternative');
          await done(value);
        }
      } catch (ex) {
        err(ex);
      } finally {
        busy = false;
        if (b.isConnected && !b.hasAttribute('data-cooldown')) b.disabled = false;
      }
    });
  }

  async function mount() {
    if (!U.auth()) return;
    try {
      var auth = U.auth(), data = (await U.api('/live-ownership')).result;
      if (auth !== U.auth()) return;
      var root = document.getElementById('projects-list');
      if (!root) return;
      var prior = root.querySelector('.la-pending');
      if (prior) prior.remove();

      var rows = (data.requests || []).filter(function(r) { return r.state === 'admin_pending'; });
      if (rows.length || data.admin) {
        var host = document.createElement('div');
        host.className = 'la-pending';
        host.innerHTML = rows.map(function(r) {
          var p = r.passport || {};
          return '<article class="la-pending-card">' +
            '<div class="la-pending-card-head">' +
              (/^https:\/\//.test(p.icon_url || '') ? '<img class="la-pending-card-icon" src="' + e(p.icon_url) + '" alt="">' : '') +
              '<div class="la-pending-card-meta">' +
                '<strong class="la-pending-card-title">' + e(p.title || r.package_name) + '</strong>' +
                '<span class="la-pending-badge">' + e(t('laCardBadge')) + '</span>' +
              '</div>' +
            '</div>' +
            '<p class="la-pending-card-desc">' + e(t('laCardDesc')) + '</p>' +
            '<div class="la-pending-card-actions">' +
              '<button type="button" class="lm-action lm-action-primary la-card-check-btn" data-la-card-check="' + e(r.id) + '">' + e(t('laCardCheckToken')) + '</button>' +
              '<a class="la-card-link" href="https://play.google.com/store/apps/details?id=' + encodeURIComponent(r.package_name) + '" target="_blank" rel="noopener noreferrer">Google Play ↗</a>' +
            '</div>' +
          '</article>';
        }).join('') + (data.admin ? button('laAdminQueue', 'admin') : '');

        root.appendChild(host);

        host.addEventListener('click', async function(ev) {
          var adminBtn = ev.target.closest('[data-la=admin]');
          if (adminBtn) {
            admin();
            return;
          }
          var checkBtn = ev.target.closest('[data-la-card-check]');
          if (checkBtn && !checkBtn.hasAttribute('data-cooldown') && !busy) {
            var reqId = checkBtn.dataset.laCardCheck;
            var origText = checkBtn.textContent;
            checkBtn.textContent = t('laTokenChecking');
            busy = true;
            checkBtn.disabled = true;
            try {
              var val = await call('/' + reqId + '/check-token');
              if (val && val.app_id) {
                if (window.showToast) showToast(t('laCardTokenVerified'));
                if (window.loadData) loadData();
                mount();
                window.dispatchEvent(new CustomEvent('live-market:changed'));
              } else if (val && val.error) {
                var msgKey = 'laError_' + val.error;
                var txt = t(msgKey) !== msgKey ? t(msgKey) : t('laError');
                if (val.retry_after) txt = txt.replace('{n}', val.retry_after);
                if (window.showToast) showToast(txt);
                if (val.retry_after) startCooldown(checkBtn, val.retry_after, origText);
              }
            } catch (ex) {
              if (window.showToast) showToast(t('laError'));
            } finally {
              busy = false;
              if (checkBtn.isConnected && !checkBtn.hasAttribute('data-cooldown')) {
                checkBtn.disabled = false;
                checkBtn.textContent = origText;
              }
            }
          }
        });
      }
    } catch (_) {}
  }

  async function admin() {
    var data = (await U.api('/live-ownership/admin/pending')).result;
    var s = U.sheet(
      t('laAdminQueue'),
      data.map(function(r) {
        return '<article class="lm-task">' +
          '<strong>' + e(r.passport.title) + '</strong>' +
          '<p><code>' + e(r.token) + '</code></p>' +
          '<a class="lm-action" target="_blank" rel="noopener noreferrer" href="https://play.google.com/store/apps/details?id=' + encodeURIComponent(r.package_name) + '">Google Play ↗</a>' +
          '<button class="lm-action" data-la-decision="' + r.id + '" data-approve="1">' + e(t('laApprove')) + '</button>' +
          '<button class="lm-action" data-la-decision="' + r.id + '" data-approve="0">' + e(t('laReject')) + '</button>' +
        '</article>';
      }).join('') || e(t('laAdminEmpty'))
    );
    s.addEventListener('click', async function(ev) {
      var b = ev.target.closest('[data-la-decision]');
      if (!b) return;
      b.disabled = true;
      try {
        await call('/' + b.dataset.laDecision + '/admin-decision', {approve: b.dataset.approve === '1'});
        b.closest('article').remove();
      } catch (_) {
        if (window.showToast) showToast(t('laError'));
        b.disabled = false;
      }
    });
  }

  window.LiveProjectAdd = {open: open, mount: mount, admin: admin};
})();
