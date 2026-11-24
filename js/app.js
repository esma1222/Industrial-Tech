(function () {
  'use strict';
  var cfg = window.WP_CONFIG || {};

  // ---- Segment picker -------------------------------------------------------
  var SEGMENTS = {
    sense: ['1', 'Sense', 'Sensors, machine vision and metrology: the instruments that let machines and plants perceive position, quality and condition, and the data layer every higher level of automation depends on.'],
    control: ['2', 'Control', 'Programmable logic controllers, distributed control systems and automation control: the decision layer that turns sensor input into coordinated machine and process actions.'],
    act: ['3', 'Act', 'Robotics, motion control and intralogistics: the systems that physically move, handle and assemble, from robot arms to automated material flow.'],
    connect: ['4', 'Connect', 'Industrial networks and edge connectivity: the communication backbone linking machines, controllers and software across the shop floor and beyond.'],
    optimise: ['5', 'Optimise', 'Industrial software, MES/MOM and OT cybersecurity: the software that plans, monitors and secures production operations.'],
    power: ['6', 'Power', 'Drives, power electronics and conversion: the components that supply, convert and control the electrical energy machines and infrastructure run on.'],
    manufacture: ['7', 'Manufacture', 'Machine tools, additive manufacturing and process equipment: the production assets that shape, build and process physical goods.']
  };
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-seg]'));
  function pick(key, focus) {
    var d = SEGMENTS[key];
    if (!d) return;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-seg') === key;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    document.getElementById('seg-num').textContent = d[0];
    document.getElementById('seg-name').textContent = d[1];
    document.getElementById('seg-def').textContent = d[2];
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { pick(t.getAttribute('data-seg')); });
    t.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (j === null) return;
      e.preventDefault();
      j = (j + tabs.length) % tabs.length;
      pick(tabs[j].getAttribute('data-seg'), true);
    });
  });
  pick('sense');

  // ---- Language toggle (DE copy pending approval) --------------------------
  var langBtns = document.querySelectorAll('[aria-label="Language"] button');
  if (langBtns[1]) { langBtns[1].disabled = true; langBtns[1].title = 'German version coming soon'; }

  // ---- Whitepaper request form ---------------------------------------------
  var form = document.getElementById('wp-form');
  var nameEl = document.getElementById('wp-name');
  var emailEl = document.getElementById('wp-email');
  var subEl = document.getElementById('wp-sub');
  var errEl = document.getElementById('wp-error');
  var btn = document.getElementById('wp-submit');
  var success = document.getElementById('wp-success');
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function showError(msg, field) {
    errEl.textContent = msg;
    errEl.hidden = false;
    [nameEl, emailEl].forEach(function (f) { f.removeAttribute('aria-invalid'); });
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }

  function unlock(subscribed) {
    document.body.classList.add('unlocked');
    form.hidden = true;
    success.hidden = false;
    document.getElementById('wp-sub-note').hidden = !(subscribed && cfg.emailDeliveryEnabled);
    document.getElementById('wp-mail-note').hidden = !cfg.emailDeliveryEnabled;
    var dl = document.getElementById('wp-download');
    if (cfg.pdfUrl) { dl.href = cfg.pdfUrl; } else { dl.hidden = true; }
    success.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.hidden = true;
    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    if (!name) return showError('Please enter your full name.', nameEl);
    if (!EMAIL_RE.test(email)) return showError('Please enter a valid email address.', emailEl);
    if (!subEl.checked) {
      subEl.focus();
      return showError('Please subscribe to TechSphere to receive the whitepaper.');
    }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Sending…';

    fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + cfg.table, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.supabasePublishableKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        full_name: name.slice(0, 200),
        email: email.slice(0, 320),
        newsletter_opt_in: true,
        source: cfg.source,
        language: document.documentElement.lang === 'de' ? 'de' : 'en',
        page_url: location.href.slice(0, 2000)
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      unlock(!!subEl.checked);
    }).catch(function () {
      showError('Something went wrong. Please try again in a moment.');
    }).then(function () {
      btn.disabled = false;
      btn.textContent = label;
    });
  });
})();
