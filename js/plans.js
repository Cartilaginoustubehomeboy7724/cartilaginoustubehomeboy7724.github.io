/* ===== 徒步计划模块 ===== */
(function (global) {
  'use strict';

  var C = UI.C;
  var state = { keyword: '', status: 'all' };

  /* ---------- 列表页 ---------- */
  function render() {
    var all = Store.list('plans').slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    var kw = state.keyword.trim().toLowerCase();
    var rows = all.filter(function (p) {
      if (state.status !== 'all' && p.status !== state.status) return false;
      if (!kw) return true;
      return [p.title, p.location, p.companions, p.notes].join(' ').toLowerCase().indexOf(kw) >= 0;
    });

    UI.decorateActions([
      { text: '+ 新建计划', cls: 'btn-primary', onClick: function () { form(null); } }
    ]);

    var segHtml = ['all:全部', 'planned:计划中', 'done:已完成', 'cancelled:已取消'].map(function (s) {
      var p = s.split(':');
      return '<button data-st="' + p[0] + '" class="' + (state.status === p[0] ? 'active' : '') + '">' + p[1] + '</button>';
    }).join('');

    var html = ''
      + '<div class="toolbar">'
      +   '<div class="search"><input class="input" id="q" placeholder="搜索路线 / 地点 / 同伴" value="' + UI.esc(state.keyword) + '"></div>'
      +   '<div class="seg" id="seg">' + segHtml + '</div>'
      +   '<span class="spacer"></span>'
      +   '<span class="dim" style="font-size:12.5px">筛选到 ' + rows.length + ' 条 · 已完成累计 ' + totalKm(all) + ' km</span>'
      + '</div>'
      + '<div class="card list-wrap">' + (rows.length ? rows.map(row).join('') : UI.emptyBox('▲', '还没有徒步计划，点击右上角新建一条。', '<button class="btn btn-primary" data-new="1">新建计划</button>')) + '</div>';

    setPage(html);
    bindToolbar();
  }

  function totalKm(list) {
    return list.filter(function (p) { return p.status === 'done'; })
      .reduce(function (s, p) { return s + UI.num(p.distance); }, 0).toFixed(1);
  }

  function row(p) {
    var st = C.PLAN_STATUS[p.status] || C.PLAN_STATUS.planned;
    var tp = C.PLAN_TYPE[p.type] || C.PLAN_TYPE.day;
    var gid = p.gearIds || [];
    var packed = p.packedIds || [];
    var pct = gid.length ? Math.round(packed.length / gid.length * 100) : 0;

    var meta = ['出发 ' + UI.fmtDate(p.date), UI.esc(p.location || '未填地点')];
    if (p.endDate) meta.push('返程 ' + UI.fmtDate(p.endDate));
    if (p.distance) meta.push(p.distance + ' km');
    if (p.elevation) meta.push('↑' + p.elevation + ' m');
    if (p.companions) meta.push('同伴：' + UI.esc(p.companions));

    return ''
      + '<div class="list-row clickable" data-id="' + p.id + '">'
      +   '<div class="list-main">'
      +     '<div class="list-title">' + UI.esc(p.title)
      +       '<span class="tag ' + st.cls + '">' + st.label + '</span>'
      +       '<span class="tag ' + tp.cls + '">' + tp.label + '</span>'
      +       '<span class="difficulty">' + '★'.repeat(UI.num(p.difficulty, 1)) + '</span>'
      +     '</div>'
      +     '<div class="list-meta">' + meta.map(function (m) { return '<span>' + m + '</span>'; }).join('')
      +       (gid.length ? '<span>打包 ' + packed.length + '/' + gid.length + '（' + pct + '%）</span>' : '')
      +     '</div>'
      +   '</div>'
      +   '<div style="width:120px">'
      +     (gid.length ? '<div class="bar"><i style="width:' + pct + '%"></i></div>' : '<span class="dim" style="font-size:12px">未规划装备</span>')
      +   '</div>'
      +   '<div class="list-actions">'
      +     '<button class="btn btn-sm" data-act="toggle" data-id="' + p.id + '">' + (p.status === 'done' ? '取消完成' : '标记完成') + '</button>'
      +     '<button class="btn btn-sm" data-act="edit" data-id="' + p.id + '">编辑</button>'
      +     '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + p.id + '">删除</button>'
      +   '</div>'
      + '</div>';
  }

  /* ---------- 交互绑定 ---------- */
  function bindToolbar() {
    var q = document.getElementById('q');
    if (q) {
      q.addEventListener('input', function () { state.keyword = q.value; renderListOnly(); });
    }
    var seg = document.getElementById('seg');
    if (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        state.status = b.dataset.st; render();
      });
    }
    var page = document.getElementById('page');
    page.removeEventListener('click', onListClick);
    page.addEventListener('click', onListClick);
  }

  // 仅重绘列表，保持搜索框焦点
  function renderListOnly() {
    var all = Store.list('plans').slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    var kw = state.keyword.trim().toLowerCase();
    var rows = all.filter(function (p) {
      if (state.status !== 'all' && p.status !== state.status) return false;
      if (!kw) return true;
      return [p.title, p.location, p.companions, p.notes].join(' ').toLowerCase().indexOf(kw) >= 0;
    });
    var wrap = document.querySelector('#page .list-wrap');
    if (wrap) wrap.innerHTML = rows.length ? rows.map(row).join('') : UI.emptyBox('▲', '没有匹配的计划');
  }

  function onListClick(e) {
    var btn = e.target.closest('[data-act]');
    if (btn) {
      e.stopPropagation();
      var id = btn.dataset.id;
      if (btn.dataset.act === 'edit') form(Store.get('plans', id));
      else if (btn.dataset.act === 'del') del(id);
      else if (btn.dataset.act === 'toggle') toggle(id);
      return;
    }
    if (e.target.closest('[data-new]')) { form(null); return; }
    var rowEl = e.target.closest('.list-row');
    if (rowEl) detail(rowEl.dataset.id);
  }

  /* ---------- 新建 / 编辑 ---------- */
  function form(p) {
    var isEdit = !!p;
    var d = p || {
      title: '', location: '', date: UI.todayStr(), endDate: '', distance: '', elevation: '',
      difficulty: 2, type: 'day', status: 'planned', companions: '', notes: ''
    };

    var body = ''
      + UI.formRow('路线名称 *', UI.input('title', d.title, 'placeholder="例如：海坨山两日穿越"'))
      + '<div class="row">'
      +   UI.formRow('地点', UI.input('location', d.location, 'placeholder="省 · 市 / 山区"'))
      +   UI.formRow('难度', UI.select('difficulty', [1, 2, 3, 4, 5].map(function (i) {
            return { value: i, label: i + ' · ' + C.DIFFICULTY[i] };
          }), d.difficulty))
      + '</div>'
      + '<div class="row">'
      +   UI.formRow('出发日期', UI.input('date', d.date, 'type="date"'))
      +   UI.formRow('返程日期（可选）', UI.input('endDate', d.endDate, 'type="date"'))
      + '</div>'
      + '<div class="row">'
      +   UI.formRow('里程 (km)', UI.input('distance', d.distance, 'type="number" step="0.1" min="0" placeholder="0"'))
      +   UI.formRow('累计爬升 (m)', UI.input('elevation', d.elevation, 'type="number" step="10" min="0" placeholder="0"'))
      + '</div>'
      + '<div class="row">'
      +   UI.formRow('类型', UI.select('type', [
            { value: 'day', label: '单日往返' }, { value: 'overnight', label: '过夜露营' }, { value: 'multi', label: '多日长线' }
          ], d.type))
      +   UI.formRow('状态', UI.select('status', [
            { value: 'planned', label: '计划中' }, { value: 'done', label: '已完成' }, { value: 'cancelled', label: '已取消' }
          ], d.status))
      + '</div>'
      + UI.formRow('同行伙伴', UI.input('companions', d.companions, 'placeholder="用顿号分隔"'))
      + UI.formRow('备注 / 路线笔记', UI.textarea('notes', d.notes, 'placeholder="路况、取水点、注意事项…"'));

    UI.openModal({
      title: isEdit ? '编辑计划' : '新建徒步计划',
      body: body,
      buttons: [
        { text: '取消' },
        { text: isEdit ? '保存' : '创建', cls: 'btn-primary', onClick: function () {
            var root = document.getElementById('modal-body');
            var title = UI.val(root, 'title').trim();
            if (!title) { UI.toast('请填写路线名称', 'err'); return false; }
            var payload = {
              title: title,
              location: UI.val(root, 'location').trim(),
              date: UI.val(root, 'date'),
              endDate: UI.val(root, 'endDate'),
              distance: UI.num(UI.val(root, 'distance'), 0),
              elevation: UI.num(UI.val(root, 'elevation'), 0),
              difficulty: parseInt(UI.val(root, 'difficulty'), 10) || 1,
              type: UI.val(root, 'type'),
              status: UI.val(root, 'status'),
              companions: UI.val(root, 'companions').trim(),
              notes: UI.val(root, 'notes').trim()
            };
            if (isEdit) {
              Store.update('plans', p.id, payload);
              UI.toast('计划已更新');
            } else {
              Store.add('plans', Object.assign({ gearIds: [], packedIds: [] }, payload));
              UI.toast('计划已创建');
            }
            App.refresh();
          } }
      ]
    });
  }

  function toggle(id) {
    var p = Store.get('plans', id);
    if (!p) return;
    Store.update('plans', id, { status: p.status === 'done' ? 'planned' : 'done' });
    UI.toast(p.status === 'done' ? '已取消完成标记' : '已完成打卡');
    App.refresh();
  }

  function del(id) {
    var p = Store.get('plans', id);
    if (!p) return;
    UI.confirm({ title: '删除计划', message: '确定删除「' + p.title + '」？此操作可在提示条里撤销。', okText: '删除', danger: true })
      .then(function (ok) {
        if (!ok) return;
        var snapshot = JSON.parse(JSON.stringify(p));
        Store.remove('plans', id);
        UI.toast('已删除「' + p.title + '」', null, {
          text: '撤销',
          fn: function () {
            Store.restoreRow('plans', snapshot);
            UI.toast('已恢复「' + p.title + '」');
            App.refresh();
          }
        });
        App.refresh();
      });
  }

  /* ---------- 详情 ---------- */
  function detail(id) {
    var p = Store.get('plans', id);
    if (!p) return;
    var st = C.PLAN_STATUS[p.status] || C.PLAN_STATUS.planned;
    var tp = C.PLAN_TYPE[p.type] || C.PLAN_TYPE.day;

    var kv = [
      ['出发日期', UI.fmtDate(p.date) + '<div class="dim" style="font-size:11.5px;font-weight:400">' + UI.relDate(p.date) + '</div>'],
      ['返程日期', p.endDate ? UI.fmtDate(p.endDate) : '—'],
      ['里程', (p.distance || 0) + ' km'],
      ['累计爬升', (p.elevation || 0) + ' m'],
      ['难度', (C.DIFFICULTY[p.difficulty] || '—') + ' <span class="difficulty">' + '★'.repeat(UI.num(p.difficulty, 1)) + '</span>'],
      ['同行', p.companions ? UI.esc(p.companions) : '独自']
    ];

    var html = ''
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">'
      +   '<span class="tag ' + st.cls + '">' + st.label + '</span>'
      +   '<span class="tag ' + tp.cls + '">' + tp.label + '</span>'
      +   '<span class="tag">' + UI.esc(p.location || '未填地点') + '</span>'
      + '</div>'
      + '<div class="kv">' + kv.map(function (i) {
          return '<div class="kv-item"><div class="kv-label">' + i[0] + '</div><div class="kv-value">' + i[1] + '</div></div>';
        }).join('') + '</div>'
      + (p.notes ? '<div class="section"><div class="section-title">路线笔记</div><div class="card card-pad" style="white-space:pre-wrap;font-size:13.5px">' + UI.esc(p.notes) + '</div></div>' : '')
      + '<div class="section"><div class="section-title">打包清单</div><div id="pack-embed"></div></div>';

    UI.openModal({
      title: p.title,
      wide: true,
      body: html,
      buttons: [
        { text: '关闭', cls: '' },
        { text: p.status === 'done' ? '取消完成' : '标记完成', cls: '', onClick: function () { toggle(id); } },
        { text: '编辑', cls: 'btn-primary', onClick: function () { setTimeout(function () { form(Store.get('plans', id)); }, 60); } }
      ],
      onMount: function (bodyEl) {
        Packing.renderEmbed(id, bodyEl.querySelector('#pack-embed'));
      }
    });
  }

  global.Plans = { render: render, form: form, detail: detail, row: row };
})(window);
