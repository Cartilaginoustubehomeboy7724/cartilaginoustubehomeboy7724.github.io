/* ===== 总览页 ===== */
(function (global) {
  'use strict';

  var C = UI.C;

  function render() {
    UI.decorateActions([
      { text: '+ 新建计划', cls: 'btn-primary', onClick: function () { Plans.form(null); } },
      { text: '+ 新增装备', onClick: function () { Gear.form(null); } }
    ]);

    var plans = Store.list('plans');
    var gears = Store.list('gears');

    var done = plans.filter(function (p) { return p.status === 'done'; });
    var upcoming = plans.filter(function (p) {
      return p.status === 'planned' && UI.daysFromToday(p.date) !== null && UI.daysFromToday(p.date) >= 0;
    }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

    var km = done.reduce(function (s, p) { return s + UI.num(p.distance); }, 0);
    var elev = done.reduce(function (s, p) { return s + UI.num(p.elevation); }, 0);

    // 分类重量分布
    var byCat = {};
    gears.forEach(function (g) {
      var w = UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1));
      byCat[g.category] = (byCat[g.category] || 0) + w;
    });
    var totalGearWeight = gears.reduce(function (s, g) { return s + UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1)); }, 0);

    var needCare = gears.filter(function (g) { return g.condition === 'worn' || g.condition === 'retire'; });

    var html = ''
      + '<div class="stat-grid">'
      +   statBox('◈', '累计里程', km.toFixed(1), 'km', '完成 ' + done.length + ' 条路线')
      +   statBox('▲', '累计爬升', elev.toLocaleString(), 'm', '相当于 ' + Math.round(elev / 8848 * 100) / 100 + ' 座珠峰')
      +   statBox('▤', '我的装备', gears.length, '件', '总重 ' + UI.fmtWeight(totalGearWeight))
      +   statBox('☀', '即将出发', upcoming.length, '条', upcoming.length ? '最近 ' + UI.relDate(upcoming[0].date) : '暂无待出发计划')
      + '</div>'
      + '<div class="grid-2">'
      +   '<div>' + upcomingCard(upcoming) + recentCard(done) + '</div>'
      +   '<div>' + categoryCard(byCat, totalGearWeight) + careCard(needCare) + '</div>'
      + '</div>';

    setPage(html);
    bindClick();
  }

  function statBox(icon, label, value, unit, sub) {
    return '<div class="stat">'
      + '<div class="stat-label">' + icon + ' ' + label + '</div>'
      + '<div class="stat-value">' + value + '<span class="stat-unit">' + unit + '</span></div>'
      + '<div class="stat-sub">' + UI.esc(sub) + '</div></div>';
  }

  function upcomingCard(list) {
    var body = list.length ? list.slice(0, 5).map(function (p) {
      var n = UI.daysFromToday(p.date);
      var gid = (p.gearIds || []).length, packed = (p.packedIds || []).length;
      return '<div class="list-row clickable" data-plan="' + p.id + '">'
        + '<div class="list-main">'
        +   '<div class="list-title">' + UI.esc(p.title)
        +     '<span class="tag ' + (n === 0 ? 'tag-orange' : 'tag-blue') + '">' + (n === 0 ? '今天' : n + ' 天后') + '</span>'
        +   '</div>'
        +   '<div class="list-meta"><span>' + UI.fmtDate(p.date) + '</span><span>' + UI.esc(p.location || '未填地点') + '</span>'
        +     '<span>' + (p.distance || 0) + ' km</span><span>↑' + (p.elevation || 0) + ' m</span>'
        +     (gid ? '<span>打包 ' + packed + '/' + gid + '</span>' : '<span>未规划装备</span>')
        +   '</div>'
        + '</div>'
        + '<span class="dim" style="font-size:18px">›</span></div>';
    }).join('') : UI.emptyBox('◎', '近期没有待出发的计划');

    return '<div class="card" style="margin-bottom:18px">'
      + '<div class="card-head"><h3>即将到来</h3><span class="dim" style="font-size:12px">点击查看计划详情</span></div>'
      + '<div class="list-wrap">' + body + '</div></div>';
  }

  function recentCard(done) {
    var list = done.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 5);
    var body = list.length ? list.map(function (p) {
      var tp = C.PLAN_TYPE[p.type] || C.PLAN_TYPE.day;
      return '<div class="list-row clickable" data-plan="' + p.id + '">'
        + '<div class="list-main">'
        +   '<div class="list-title">' + UI.esc(p.title) + '<span class="tag ' + tp.cls + '">' + tp.label + '</span></div>'
        +   '<div class="list-meta"><span>' + UI.fmtDate(p.date) + '</span><span>' + UI.esc(p.location || '') + '</span>'
        +     '<span>' + (p.distance || 0) + ' km</span><span>↑' + (p.elevation || 0) + ' m</span></div>'
        + '</div>'
        + '<span class="tag tag-green">已完成</span><span class="dim" style="font-size:18px;margin-left:8px">›</span></div>';
    }).join('') : UI.emptyBox('▲', '还没有完成的路线，出发吧！');

    return '<div class="card"><div class="card-head"><h3>走过的路</h3>'
      + '<span class="dim" style="font-size:12px">' + done.length + ' 条已完成</span></div>'
      + '<div class="list-wrap">' + body + '</div></div>';
  }

  function categoryCard(byCat, total) {
    var rows = C.CATEGORY.filter(function (c) { return byCat[c]; })
      .sort(function (a, b) { return byCat[b] - byCat[a]; });

    var body = rows.length ? rows.map(function (c) {
      var w = byCat[c];
      var pct = total ? Math.round(w / total * 100) : 0;
      return '<div style="padding:9px 0">'
        + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">'
        +   '<span>' + (C.CATEGORY_ICON[c] || '•') + ' ' + UI.esc(c) + '</span>'
        +   '<span class="mono">' + UI.fmtWeight(w) + '　<span class="dim">' + pct + '%</span></span>'
        + '</div>'
        + '<div class="bar"><i style="width:' + pct + '%"></i></div>'
        + '</div>';
    }).join('') : UI.emptyBox('⬢', '装备库还是空的');

    return '<div class="card" style="margin-bottom:18px"><div class="card-head"><h3>装备重量分布</h3>'
      + '<span class="dim mono" style="font-size:12px">' + UI.fmtWeight(total) + '</span></div>'
      + '<div class="card-pad">' + body + '</div></div>';
  }

  function careCard(list) {
    var body = list.length ? list.map(function (g) {
      var cond = C.CONDITION[g.condition] || C.CONDITION.good;
      return '<div class="list-row">'
        + '<div class="list-main"><div class="list-title">' + UI.esc(g.name) + '<span class="tag ' + cond.cls + '">' + cond.label + '</span></div>'
        +   '<div class="list-meta"><span>' + UI.esc(g.category) + '</span>'
        +   (g.brand ? '<span>' + UI.esc(g.brand) + '</span>' : '')
        +   (g.purchaseDate ? '<span>购入 ' + UI.fmtDate(g.purchaseDate) + '</span>' : '') + '</div></div>'
        + '<span class="mono dim">' + UI.num(g.weight) + ' g</span></div>';
    }).join('') : UI.emptyBox('✚', '所有装备状态良好');

    return '<div class="card"><div class="card-head"><h3>装备维护提醒</h3>'
      + '<span class="dim" style="font-size:12px">' + list.length + ' 件需关注</span></div>'
      + '<div class="list-wrap">' + body + '</div></div>';
  }

  function bindClick() {
    var page = document.getElementById('page');
    page.removeEventListener('click', onDashClick);
    page.addEventListener('click', onDashClick);
  }

  function onDashClick(e) {
    var el = e.target.closest('[data-plan]');
    if (el) Plans.detail(el.dataset.plan);
  }

  global.Dashboard = { render: render };
})(window);
