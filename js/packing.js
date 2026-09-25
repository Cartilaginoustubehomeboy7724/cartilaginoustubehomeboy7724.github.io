/* ===== 打包清单模块 ===== */
(function (global) {
  'use strict';

  var C = UI.C;
  var current = null; // 当前选中的计划 id

  /* ---------- 打包渲染（供详情页复用） ---------- */
  function packListHtml(plan) {
    var gears = (plan.gearIds || []).map(function (id) { return Store.get('gears', id); })
      .filter(function (g) { return !!g; });
    var packed = plan.packedIds || [];

    if (!gears.length) {
      return '<div class="card card-pad">' + UI.emptyBox('▤',
        '这条路线还没有规划装备。',
        '<button class="btn btn-sm" data-pack-act="auto" data-plan="' + plan.id + '">一键导入必带装备</button> '
        + '<button class="btn btn-primary btn-sm" data-pack-act="pick" data-plan="' + plan.id + '">手动选择</button>') + '</div>';
    }

    var byCat = {};
    gears.forEach(function (g) {
      (byCat[g.category] = byCat[g.category] || []).push(g);
    });

    var html = '';
    C.CATEGORY.forEach(function (cat) {
      if (!byCat[cat]) return;
      var arr = byCat[cat];
      var sub = arr.reduce(function (s, g) { return s + UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1)); }, 0);
      html += '<div class="group-title">' + (C.CATEGORY_ICON[cat] || '•') + ' ' + UI.esc(cat) + '　<span class="dim">' + UI.fmtWeight(sub) + '</span></div>';
      arr.forEach(function (g) {
        var w = UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1));
        var on = packed.indexOf(g.id) >= 0;
        html += '<div class="pack-row' + (on ? ' checked' : '') + '">'
          + '<label class="check" style="flex:0 0 auto"><input type="checkbox" data-pack-act="check" data-plan="' + plan.id + '" data-gear="' + g.id + '"' + (on ? ' checked' : '') + '></label>'
          + '<span class="pack-name">' + UI.esc(g.name)
          + (g.worn ? ' <span class="tag tag-blue">穿戴</span>' : '')
          + (g.consumable ? ' <span class="tag tag-orange">消耗</span>' : '')
          + (UI.num(g.quantity, 1) > 1 ? ' <span class="dim">×' + UI.num(g.quantity, 1) + '</span>' : '')
          + '</span>'
          + '<span class="pack-weight">' + UI.fmtWeight(w) + '</span>'
          + '<span style="width:26px;text-align:right"><button class="icon-btn" data-pack-act="remove" data-plan="' + plan.id + '" data-gear="' + g.id + '" title="移除">✕</button></span>'
          + '</div>';
      });
    });

    var total = gears.reduce(function (s, g) { return s + UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1)); }, 0);
    var isWorn = function (g) { return !!g.worn; };
    var isCons = function (g) { return !!g.consumable; };
    var base = gears.filter(function (g) { return !isCons(g) && !isWorn(g); })
      .reduce(function (s, g) { return s + UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1)); }, 0);
    var wornW = gears.filter(isWorn)
      .reduce(function (s, g) { return s + UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1)); }, 0);
    var consumable = gears.filter(isCons)
      .reduce(function (s, g) { return s + UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1)); }, 0);
    var packW = base + consumable;   // 背包实重 = 基础 + 消耗品（不含穿在身上的）
    var pct = gears.length ? Math.round(packed.length / gears.length * 100) : 0;

    var head = ''
      + '<div class="card" style="margin-bottom:12px"><div class="card-pad">'
      +   '<div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--text-2);margin-bottom:6px">'
      +     '<span>打包进度 <strong class="mono">' + packed.length + '</strong> / ' + gears.length + ' 件</span>'
      +     '<span class="mono">' + pct + '%</span>'
      +   '</div>'
      +   '<div class="bar"><i style="width:' + pct + '%"></i></div>'
      +   '<div class="stat-grid" style="margin:14px 0 0;gap:10px">'
      +     '<div class="stat" style="box-shadow:none"><div class="stat-label">背包实重</div>'
      +       '<div class="stat-value">' + UI.fmtWeight(packW) + '</div>'
      +       '<div class="stat-sub">基础 + 消耗品，不含穿戴</div></div>'
      +     '<div class="stat" style="box-shadow:none"><div class="stat-label">清单总重</div>'
      +       '<div class="stat-value">' + UI.fmtWeight(total) + '</div>'
      +       '<div class="stat-sub">含穿戴与全部物品</div></div>'
      +     '<div class="stat" style="box-shadow:none"><div class="stat-label">基础重量</div>'
      +       '<div class="stat-value">' + UI.fmtWeight(base) + '</div>'
      +       '<div class="stat-sub">背包内非消耗品</div></div>'
      +     '<div class="stat" style="box-shadow:none"><div class="stat-label">穿戴 / 消耗品</div>'
      +       '<div class="stat-value">' + UI.fmtWeight(wornW) + ' / ' + UI.fmtWeight(consumable) + '</div>'
      +       '<div class="stat-sub">穿在身上 / 食水燃料</div></div>'
      +   '</div>'
      + '</div></div>';

    return head + '<div class="card list-wrap">' + html + '</div>';
  }

  /* ---------- 详情页内嵌 ---------- */
  function renderEmbed(planId, container) {
    function paint() {
      var plan = Store.get('plans', planId);
      if (!plan) return;
      container.innerHTML = '<div style="margin-bottom:10px;display:flex;gap:8px">'
        + '<button class="btn btn-sm" data-pack-act="pick" data-plan="' + planId + '">选择装备</button>'
        + '<button class="btn btn-sm" data-pack-act="auto" data-plan="' + planId + '">导入必带</button>'
        + '</div>' + packListHtml(plan);
    }
    paint();
    container.removeEventListener('click', handler);
    container.addEventListener('click', handler);
    if (App && App.hookRefresh) App.hookRefresh.push(paint);
  }

  function handler(e) {
    var el = e.target.closest('[data-pack-act]');
    if (!el) return;
    var act = el.dataset.packAct;
    var planId = el.dataset.plan;
    var plan = Store.get('plans', planId);
    if (!plan) return;

    if (act === 'check') {
      var gid = el.dataset.gear;
      var packed = (plan.packedIds || []).slice();
      var i = packed.indexOf(gid);
      if (el.checked && i < 0) packed.push(gid);
      if (!el.checked && i >= 0) packed.splice(i, 1);
      Store.update('plans', planId, { packedIds: packed });
      App.refresh();
      return;
    }
    if (act === 'remove') {
      var rid = el.dataset.gear;
      Store.update('plans', planId, {
        gearIds: (plan.gearIds || []).filter(function (x) { return x !== rid; }),
        packedIds: (plan.packedIds || []).filter(function (x) { return x !== rid; })
      });
      UI.toast('已从清单移除');
      App.refresh();
      return;
    }
    if (act === 'auto') {
      var ess = Store.filter('gears', function (g) { return g.essential; }).map(function (g) { return g.id; });
      if (!ess.length) { UI.toast('装备库里还没有标记为「必带」的装备', 'err'); return; }
      var merged = dedupe((plan.gearIds || []).concat(ess));
      Store.update('plans', planId, { gearIds: merged });
      UI.toast('已导入 ' + ess.length + ' 件必带装备');
      App.refresh();
      return;
    }
    if (act === 'pick') picker(plan);
  }

  function dedupe(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  /* ---------- 装备选择面板 ---------- */
  function picker(plan) {
    var selected = (plan.gearIds || []).slice();
    var gears = Gear.sorted(Store.list('gears'));

    if (!gears.length) {
      UI.toast('装备库是空的，先去添加几件装备吧', 'err');
      return;
    }

    var body = ''
      + '<p class="muted" style="margin:0 0 10px;font-size:13px">勾选加入「' + UI.esc(plan.title) + '」的清单</p>'
      + '<div class="gear-picker">' + gears.map(function (g) {
          var on = selected.indexOf(g.id) >= 0;
          return '<label class="gear-picker-row' + (on ? ' on' : '') + '">'
            + '<input type="checkbox" value="' + g.id + '"' + (on ? ' checked' : '') + '>'
            + '<span style="flex:1;min-width:0">' + UI.esc(g.name)
            + (g.essential ? ' <span class="tag tag-green">必带</span>' : '')
            + '<span class="dim" style="font-size:12px"> · ' + UI.esc(g.category) + '</span></span>'
            + '<span style="width:80px;text-align:right;font-variant-numeric:tabular-nums">' + UI.fmtWeight(UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1))) + '</span>'
            + '</label>';
        }).join('') + '</div>';

    UI.openModal({
      title: '选择装备',
      body: body,
      buttons: [
        { text: '取消' },
        { text: '全选必带', onClick: function () {
            render();
            return false;
          } },
        { text: '保存清单', cls: 'btn-primary', onClick: function () {
            var root = document.getElementById('modal-body');
            var picked = [].map.call(root.querySelectorAll('input[type=checkbox]:checked'), function (i) { return i.value; });
            Store.update('plans', plan.id, {
              gearIds: picked,
              packedIds: (plan.packedIds || []).filter(function (id) { return picked.indexOf(id) >= 0; })
            });
            UI.toast('清单已更新，共 ' + picked.length + ' 件');
            App.refresh();
          } }
      ],
      onMount: function (bodyEl) {
        bodyEl.addEventListener('change', function (e) {
          if (e.target.matches('input[type=checkbox]')) {
            e.target.closest('.gear-picker-row').classList.toggle('on', e.target.checked);
          }
        });
      }
    });

    function render() { /* 全选必带：勾选所有 essential */
      var root = document.getElementById('modal-body');
      gears.forEach(function (g, i) {
        var box = root.querySelectorAll('input[type=checkbox]')[i];
        if (g.essential) {
          box.checked = true;
          box.closest('.gear-picker-row').classList.add('on');
        }
      });
    }
  }

  /* ---------- 独立页面 ---------- */
  function render() {
    var plans = Store.list('plans').slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    if (!plans.length) {
      setPage(UI.emptyBox('▤', '还没有计划，先创建一条徒步计划再来打包。',
        '<button class="btn btn-primary" id="go-plan">新建计划</button>'));
      var b = document.getElementById('go-plan');
      if (b) b.onclick = function () { location.hash = '#/plans'; setTimeout(function () { Plans.form(null); }, 80); };
      UI.decorateActions([]);
      return;
    }

    if (!current || !Store.get('plans', current)) current = plans[0].id;
    var plan = Store.get('plans', current);

    UI.decorateActions([
      { text: '选择装备', onClick: function () { picker(plan); } },
      { text: '导入必带', onClick: function () {
          var ess = Store.filter('gears', function (g) { return g.essential; }).map(function (g) { return g.id; });
          if (!ess.length) { UI.toast('没有标记为必带的装备', 'err'); return; }
          Store.update('plans', plan.id, { gearIds: dedupe((plan.gearIds || []).concat(ess)) });
          UI.toast('已导入 ' + ess.length + ' 件必带装备');
          App.refresh();
        } }
    ]);

    var opts = plans.map(function (p) {
      var st = C.PLAN_STATUS[p.status] || C.PLAN_STATUS.planned;
      return '<option value="' + p.id + '"' + (p.id === current ? ' selected' : '') + '>'
        + UI.esc(p.title) + '（' + UI.fmtDate(p.date) + ' · ' + st.label + '）</option>';
    }).join('');

    var html = ''
      + '<div class="toolbar">'
      +   '<label class="dim" style="font-size:13px">当前计划</label>'
      +   '<select class="select" id="plan-pick" style="width:320px">' + opts + '</select>'
      +   '<span class="spacer"></span>'
      +   '<span class="dim" style="font-size:12.5px">' + UI.relDate(plan.date) + '</span>'
      + '</div>'
      + '<div id="pack-body">' + packListHtml(plan) + '</div>';

    setPage(html);

    var sel = document.getElementById('plan-pick');
    sel.addEventListener('change', function () { current = sel.value; App.refresh(); });

    var bodyEl = document.getElementById('pack-body');
    bodyEl.removeEventListener('click', handler);
    bodyEl.addEventListener('click', handler);
  }

  global.Packing = { render: render, renderEmbed: renderEmbed, picker: picker, packListHtml: packListHtml };
})(window);
