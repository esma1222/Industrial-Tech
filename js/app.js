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
  var $ = function (id) { return document.getElementById(id); };
  var fields = {
    first_name: $('wp-first'), last_name: $('wp-last'), email: $('wp-email'),
    company: $('wp-company'), position: $('wp-position')
  };
  var subEl = $('wp-sub');
  var errEl = $('wp-error');
  var btn = $('wp-submit');
  var success = $('wp-success');
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var MESSAGES = {
    salutation: 'Please select a salutation.',
    first_name: 'Please enter your first name.',
    last_name: 'Please enter your last name.',
    email: 'Please enter a valid email address.',
    consent: 'Please subscribe to TechSpheres to receive the whitepaper.'
  };

  function focusFor(key) {
    if (key === 'salutation') return form.querySelector('input[name="salutation"]');
    if (key === 'consent') return subEl;
    return fields[key];
  }

  function showError(key, msg) {
    errEl.textContent = msg || MESSAGES[key];
    errEl.hidden = false;
    form.querySelectorAll('[aria-invalid]').forEach(function (f) { f.removeAttribute('aria-invalid'); });
    var f = key && focusFor(key);
    if (f) { if (fields[key]) f.setAttribute('aria-invalid', 'true'); f.focus(); }
  }

  function unlock(status) {
    document.body.classList.add('unlocked');
    form.hidden = true;
    success.hidden = false;
    $('wp-sub-note').hidden = status !== 'pending_confirmation';
    var dl = $('wp-download');
    if (cfg.pdfUrl) { dl.href = cfg.pdfUrl; } else { dl.hidden = true; }
    success.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.hidden = true;
    var sal = form.querySelector('input[name="salutation"]:checked');
    var v = {};
    Object.keys(fields).forEach(function (k) { v[k] = fields[k].value.trim(); });
    if (!sal) return showError('salutation');
    if (!v.first_name) return showError('first_name');
    if (!v.last_name) return showError('last_name');
    if (!EMAIL_RE.test(v.email)) return showError('email');
    if (!subEl.checked) return showError('consent');

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Sending…';

    fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1/' + cfg.signupFunction, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': cfg.supabasePublishableKey },
      body: JSON.stringify({
        salutation: sal.value,
        first_name: v.first_name, last_name: v.last_name, email: v.email,
        company: v.company, position: v.position,
        consent: true,
        website: ($('wp-website') || {}).value || '',
        source: cfg.source,
        language: document.documentElement.lang === 'de' ? 'de' : 'en',
        page_url: location.href.slice(0, 2000)
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok && data.ok) return unlock(data.status);
        if (res.status === 400 && MESSAGES[data.error]) return showError(data.error);
        throw new Error('HTTP ' + res.status);
      });
    }).catch(function () {
      showError(null, 'Something went wrong. Please try again in a moment.');
    }).then(function () {
      btn.disabled = false;
      btn.textContent = label;
    });
  });
})();
