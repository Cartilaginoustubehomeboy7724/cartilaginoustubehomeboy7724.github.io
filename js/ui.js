/* ===== 通用 UI 工具与领域常量 ===== */
(function (global) {
  'use strict';

  /* ---------- 领域常量 ---------- */
  var C = {
    PLAN_STATUS: {
      planned:   { label: '计划中', cls: 'tag-blue' },
      done:      { label: '已完成', cls: 'tag-green' },
      cancelled: { label: '已取消', cls: 'tag-gray' }
    },
    PLAN_TYPE: {
      day:       { label: '单日往返', cls: 'tag-gray' },
      overnight: { label: '过夜露营', cls: 'tag-orange' },
      multi:     { label: '多日长线', cls: 'tag-orange' }
    },
    DIFFICULTY: ['', '轻松', '适中', '有挑战', '困难', '极限'],
    CATEGORY: ['背负系统', '睡眠系统', '炊事系统', '衣物', '鞋袜', '电子设备', '安全急救', '饮水', '其他'],
    CATEGORY_ICON: {
      '背负系统': '◲', '睡眠系统': '☾', '炊事系统': '⌂', '衣物': '⌘', '鞋袜': '⌒',
      '电子设备': '⚡', '安全急救': '✚', '饮水': '≈', '其他': '•'
    },
    CONDITION: {
      good:   { label: '良好', cls: 'tag-green' },
      worn:   { label: '有磨损', cls: 'tag-orange' },
      retire: { label: '待淘汰', cls: 'tag-red' }
    }
  };

  /* ---------- 格式化 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtWeight(g) {
    g = Number(g) || 0;
    return g >= 1000 ? (g / 1000).toFixed(2) + ' kg' : g + ' g';
  }

  function fmtDate(d) {
    if (!d) return '—';
    var p = String(d).split('-');
    return p.length === 3 ? p[0] + '/' + p[1] + '/' + p[2] : String(d);
  }

  function daysFromToday(d) {
    if (!d) return null;
    var target = new Date(d + 'T00:00:00');
    if (isNaN(target)) return null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function relDate(d) {
    var n = daysFromToday(d);
    if (n === null) return '未定日期';
    if (n === 0) return '今天出发';
    if (n === 1) return '明天出发';
    if (n > 0) return n + ' 天后出发';
    return Math.abs(n) + ' 天前';
  }

  function num(v, def) {
    var n = parseFloat(v);
    return isNaN(n) ? (def || 0) : n;
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- Toast（可选带撤销按钮） ---------- */
  function toast(msg, type, action) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'err' ? ' err' : '');
    var span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);

    var duration = 2200;
    if (action && action.text && typeof action.fn === 'function') {
      duration = 5200;   // 给用户足够时间点撤销
      var btn = document.createElement('button');
      btn.className = 'toast-act';
      btn.textContent = action.text;
      btn.onclick = function () { action.fn(); kill(); };
      el.appendChild(btn);
    }

    root.appendChild(el);
    var timer = setTimeout(kill, duration);
    function kill() {
      clearTimeout(timer);
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      setTimeout(function () { el.remove(); }, 250);
    }
  }

  /* ---------- Modal ---------- */
  var modalCleanup = null;

  function openModal(opt) {
    var root = document.getElementById('modal-root');
    var panel = document.getElementById('modal-panel');
    var titleEl = document.getElementById('modal-title');
    var bodyEl = document.getElementById('modal-body');
    var footEl = document.getElementById('modal-foot');

    titleEl.textContent = opt.title || '';
    bodyEl.innerHTML = opt.body || '';
    panel.className = 'modal-panel' + (opt.wide ? ' wide' : '');

    footEl.innerHTML = '';
    (opt.buttons || []).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || '');
      btn.textContent = b.text;
      btn.onclick = function () {
        if (b.onClick && b.onClick() === false) return;
        if (b.keepOpen !== true) closeModal();
      };
      footEl.appendChild(btn);
    });

    root.hidden = false;
    if (opt.onMount) {
      modalCleanup = opt.onMount(bodyEl) || null;
      var first = bodyEl.querySelector('input:not([type=checkbox]), select, textarea');
      if (first) first.focus();
    }
  }

  function closeModal() {
    var root = document.getElementById('modal-root');
    if (root.hidden) return;
    root.hidden = true;
    if (global.App && typeof App.clearHooks === 'function') App.clearHooks();
    if (typeof modalCleanup === 'function') { modalCleanup(); modalCleanup = null; }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !document.getElementById('modal-root').hidden) closeModal();
  });
  document.getElementById('modal-root').addEventListener('click', function (e) {
    if (e.target.dataset && e.target.dataset.close) closeModal();
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);

  function confirmBox(opt) {
    return new Promise(function (resolve) {
      openModal({
        title: opt.title || '确认操作',
        body: '<p class="muted" style="margin:0">' + esc(opt.message || '') + '</p>',
        buttons: [
          { text: '取消', cls: '', onClick: function () { resolve(false); } },
          { text: opt.okText || '确定', cls: opt.danger ? 'btn-danger' : 'btn-primary', onClick: function () { resolve(true); } }
        ],
        onMount: function () {
          return function () { if (!document.getElementById('modal-root').hidden) resolve(false); };
        }
      });
    });
  }

  /* ---------- 表单小工具 ---------- */
  function formRow(label, inner) {
    return '<div class="field"><label>' + esc(label) + '</label>' + inner + '</div>';
  }
  function input(name, value, attrs) {
    return '<input class="input" name="' + name + '" value="' + esc(value == null ? '' : value) + '" ' + (attrs || '') + '>';
  }
  function textarea(name, value, attrs) {
    return '<textarea class="textarea" name="' + name + '" ' + (attrs || '') + '>' + esc(value == null ? '' : value) + '</textarea>';
  }
  function select(name, options, value, attrs) {
    var html = '<select class="select" name="' + name + '" ' + (attrs || '') + '>';
    options.forEach(function (o) {
      var v = o.value != null ? o.value : o;
      var t = o.label != null ? o.label : o;
      html += '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    return html + '</select>';
  }
  function val(root, name) {
    var el = root.querySelector('[name="' + name + '"]');
    if (!el) return '';
    return el.type === 'checkbox' ? el.checked : el.value;
  }

  function emptyBox(icon, text, actionHtml) {
    return '<div class="empty"><div class="empty-icon">' + icon + '</div>'
      + '<div>' + esc(text) + '</div>'
      + (actionHtml ? '<div style="margin-top:12px">' + actionHtml + '</div>' : '') + '</div>';
  }

  global.UI = {
    C: C, esc: esc, toast: toast, openModal: openModal, closeModal: closeModal,
    confirm: confirmBox, fmtWeight: fmtWeight, fmtDate: fmtDate, relDate: relDate,
    daysFromToday: daysFromToday, num: num, todayStr: todayStr,
    formRow: formRow, input: input, textarea: textarea, select: select, val: val,
    emptyBox: emptyBox
  };
})(window);
