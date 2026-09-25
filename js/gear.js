/* ===== 装备库模块 ===== */
(function (global) {
  'use strict';

  var C = UI.C;
  var state = { keyword: '', category: 'all', condition: 'all' };

  function sorted(list) {
    return list.slice().sort(function (a, b) {
      var ca = C.CATEGORY.indexOf(a.category), cb = C.CATEGORY.indexOf(b.category);
      if (ca !== cb) return ca - cb;
      return String(a.name).localeCompare(String(b.name), 'zh');
    });
  }

  function filtered() {
    var kw = state.keyword.trim().toLowerCase();
    return Store.list('gears').filter(function (g) {
      if (state.category !== 'all' && g.category !== state.category) return false;
      if (state.condition !== 'all' && g.condition !== state.condition) return false;
      if (!kw) return true;
      return [g.name, g.brand, g.category, g.notes].join(' ').toLowerCase().indexOf(kw) >= 0;
    });
  }

  function totalWeight(list) {
    return list.reduce(function (s, g) { return s + UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1)); }, 0);
  }

  function render() {
    UI.decorateActions([
      { text: '+ 新增装备', cls: 'btn-primary', onClick: function () { form(null); } }
    ]);

    var all = Store.list('gears');
    var rows = sorted(filtered());
    var tw = totalWeight(rows);
    var needCare = all.filter(function (g) { return g.condition === 'worn' || g.condition === 'retire'; }).length;

    var catBtns = ['all:全部'].concat(C.CATEGORY.map(function (c) { return c + ':' + c; }))
      .map(function (s) {
        var p = s.split(':');
        return '<button data-cat="' + UI.esc(p[0]) + '" class="' + (state.category === p[0] ? 'active' : '') + '">' + p[1] + '</button>';
      }).join('');

    var condBtns = ['all:全部状态', 'good:良好', 'worn:有磨损', 'retire:待淘汰'].map(function (s) {
      var p = s.split(':');
      return '<button data-cond="' + p[0] + '" class="' + (state.condition === p[0] ? 'active' : '') + '">' + p[1] + '</button>';
    }).join('');

    var twParts = UI.fmtWeight(tw).split(' ');
    var html = ''
      + '<div class="stat-grid">'
      +   stat('装备总数', all.length, '件', rows.length + ' 件在当前筛选中')
      +   stat('当前称重', twParts[0], twParts[1] || '', '按数量折算后的合计')
      +   stat('必带装备', all.filter(function (g) { return g.essential; }).length, '件', '打包时可一键导入')
      +   stat('需要关注', needCare, '件', '存在磨损或临近淘汰')
      + '</div>'
      + '<div class="toolbar">'
      +   '<div class="search"><input class="input" id="gq" placeholder="搜索装备 / 品牌" value="' + UI.esc(state.keyword) + '"></div>'
      +   '<div class="seg" id="gcond">' + condBtns + '</div>'
      + '</div>'
      + '<div class="toolbar"><div class="seg" id="gcat">' + catBtns + '</div></div>'
      + '<div class="card"><div id="gear-table">' + tableHtml(rows) + '</div></div>';

    setPage(html);
    bind();
  }

  function stat(label, value, unit, sub) {
    return '<div class="stat"><div class="stat-label">' + label + '</div>'
      + '<div class="stat-value">' + value + '<span class="stat-unit">' + (unit || '') + '</span></div>'
      + '<div class="stat-sub">' + UI.esc(sub || '') + '</div></div>';
  }

  function tableHtml(rows) {
    if (!rows.length) return UI.emptyBox('⬢', '没有匹配的装备。', '<button class="btn btn-primary" data-new="1">新增装备</button>');

    var lastCat = null, body = '';
    rows.forEach(function (g) {
      if (g.category !== lastCat) {
        lastCat = g.category;
        var catTotal = totalWeight(rows.filter(function (x) { return x.category === g.category; }));
        body += '<tr><td colspan="6" style="background:var(--surface-2);font-size:12px;color:var(--text-3);font-weight:600;padding:7px 14px">'
             + (C.CATEGORY_ICON[g.category] || '•') + ' ' + UI.esc(g.category) + '　·　' + UI.fmtWeight(catTotal) + '</td></tr>';
      }
      var cond = C.CONDITION[g.condition] || C.CONDITION.good;
      body += '<tr data-id="' + g.id + '">'
        + '<td><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
        +   '<strong style="font-weight:550">' + UI.esc(g.name) + '</strong>'
        +   (g.essential ? '<span class="tag tag-green">必带</span>' : '')
        +   (g.worn ? '<span class="tag tag-blue">穿戴</span>' : '')
        +   (g.consumable ? '<span class="tag tag-orange">消耗</span>' : '')
        + '</div>'
        + (g.brand ? '<div class="dim" style="font-size:12px">' + UI.esc(g.brand) + '</div>' : '')
        + '</td>'
        + '<td>' + UI.esc(g.category) + '</td>'
        + '<td class="num">' + UI.num(g.weight) + ' g</td>'
        + '<td class="num">' + Math.max(1, UI.num(g.quantity, 1)) + '</td>'
        + '<td class="num"><strong>' + UI.fmtWeight(UI.num(g.weight) * Math.max(1, UI.num(g.quantity, 1))) + '</strong></td>'
        + '<td><span class="tag ' + cond.cls + '">' + cond.label + '</span></td>'
        + '<td class="num" style="white-space:nowrap">'
        +   '<button class="btn btn-sm" data-act="edit" data-id="' + g.id + '">编辑</button> '
        +   '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + g.id + '">删除</button>'
        + '</td></tr>';
    });

    return '<div class="table-scroll"><table class="table"><thead><tr>'
      + '<th>装备</th><th>分类</th><th class="num">单件重</th><th class="num">数量</th>'
      + '<th class="num">小计</th><th>状态</th><th></th>'
      + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function redrawTable() {
    var el = document.getElementById('gear-table');
    if (el) el.innerHTML = tableHtml(sorted(filtered()));
  }

  function bind() {
    var page = document.getElementById('page');
    page.removeEventListener('click', onClick);
    page.addEventListener('click', onClick);

    var q = document.getElementById('gq');
    if (q) q.addEventListener('input', function () { state.keyword = q.value; redrawTable(); });

    var cat = document.getElementById('gcat');
    if (cat) cat.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      [].forEach.call(cat.children, function (c) { c.classList.remove('active'); });
      b.classList.add('active');
      state.category = b.dataset.cat; redrawTable();
    });

    var cond = document.getElementById('gcond');
    if (cond) cond.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      [].forEach.call(cond.children, function (c) { c.classList.remove('active'); });
      b.classList.add('active');
      state.condition = b.dataset.cond; redrawTable();
    });
  }

  function onClick(e) {
    var btn = e.target.closest('[data-act]');
    if (btn) {
      if (btn.dataset.act === 'edit') form(Store.get('gears', btn.dataset.id));
      if (btn.dataset.act === 'del') del(btn.dataset.id);
      return;
    }
    if (e.target.closest('[data-new]')) form(null);
  }

  /* ---------- 表单 ---------- */
  function form(g) {
    var isEdit = !!g;
    var d = g || {
      name: '', category: '背负系统', weight: '', quantity: 1, brand: '',
      purchaseDate: '', condition: 'good', essential: false, consumable: false, notes: ''
    };

    var body = ''
      + UI.formRow('装备名称 *', UI.input('name', d.name, 'placeholder="例如：Osprey Atmos 65 背包"'))
      + '<div class="row">'
      +   UI.formRow('分类', UI.select('category', C.CATEGORY, d.category))
      +   UI.formRow('状态', UI.select('condition', [
            { value: 'good', label: '良好' }, { value: 'worn', label: '有磨损' }, { value: 'retire', label: '待淘汰' }
          ], d.condition))
      + '</div>'
      + '<div class="row">'
      +   UI.formRow('单件重量 (g)', UI.input('weight', d.weight, 'type="number" min="0" step="1" placeholder="0"'))
      +   UI.formRow('数量', UI.input('quantity', d.quantity, 'type="number" min="1" step="1"'))
      + '</div>'
      + '<div class="row">'
      +   UI.formRow('品牌 / 型号', UI.input('brand', d.brand, 'placeholder="选填"'))
      +   UI.formRow('购入日期', UI.input('purchaseDate', d.purchaseDate, 'type="date"'))
      + '</div>'
      + '<div style="display:flex;gap:18px;margin-bottom:14px;flex-wrap:wrap">'
      +   '<label class="check"><input type="checkbox" name="essential"' + (d.essential ? ' checked' : '') + '> 每次必带</label>'
      +   '<label class="check"><input type="checkbox" name="worn"' + (d.worn ? ' checked' : '') + '> 穿在身上</label>'
      +   '<label class="check"><input type="checkbox" name="consumable"' + (d.consumable ? ' checked' : '') + '> 消耗品</label>'
      + '</div>'
      + UI.formRow('备注', UI.textarea('notes', d.notes, 'placeholder="使用心得、替换周期…"'));

    UI.openModal({
      title: isEdit ? '编辑装备' : '新增装备',
      body: body,
      buttons: [
        { text: '取消' },
        { text: isEdit ? '保存' : '添加', cls: 'btn-primary', onClick: function () {
            var root = document.getElementById('modal-body');
            var name = UI.val(root, 'name').trim();
            if (!name) { UI.toast('请填写装备名称', 'err'); return false; }
            var payload = {
              name: name,
              category: UI.val(root, 'category'),
              condition: UI.val(root, 'condition'),
              weight: UI.num(UI.val(root, 'weight'), 0),
              quantity: Math.max(1, UI.num(UI.val(root, 'quantity'), 1)),
              brand: UI.val(root, 'brand').trim(),
              purchaseDate: UI.val(root, 'purchaseDate'),
              essential: !!UI.val(root, 'essential'),
              worn: !!UI.val(root, 'worn'),
              consumable: !!UI.val(root, 'consumable'),
              notes: UI.val(root, 'notes').trim()
            };
            if (isEdit) { Store.update('gears', g.id, payload); UI.toast('装备已更新'); }
            else { Store.add('gears', payload); UI.toast('装备已添加'); }
            App.refresh();
          } }
      ]
    });
  }

  function del(id) {
    var g = Store.get('gears', id);
    if (!g) return;
    UI.confirm({
      title: '删除装备',
      message: '确定从装备库删除「' + g.name + '」？所有计划中的打包清单也会移除它。',
      okText: '删除', danger: true
    }).then(function (ok) {
      if (!ok) return;
      var snapshot = JSON.parse(JSON.stringify(g));
      Store.remove('gears', id);
      // 同步清理所有计划的引用
      Store.list('plans').forEach(function (p) {
        var changed = false;
        var gi = (p.gearIds || []).filter(function (x) { if (x === id) { changed = true; return false; } return true; });
        var pi = (p.packedIds || []).filter(function (x) { return x !== id; });
        if (changed) Store.update('plans', p.id, { gearIds: gi, packedIds: pi });
      });
      UI.toast('已删除「' + g.name + '」', null, {
        text: '撤销',
        fn: function () {
          Store.restoreRow('gears', snapshot);
          UI.toast('已恢复「' + g.name + '」');
          App.refresh();
        }
      });
      App.refresh();
    });
  }

  global.Gear = { render: render, form: form, totalWeight: totalWeight, sorted: sorted };
})(window);
