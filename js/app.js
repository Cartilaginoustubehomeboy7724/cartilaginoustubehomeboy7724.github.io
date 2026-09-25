/* ===== 应用外壳：路由 / 刷新 / 数据备份 ===== */
(function (global) {
  'use strict';

  var ROUTES = {
    dashboard: { title: '总览', render: function () { Dashboard.render(); } },
    plans:     { title: '徒步计划', render: function () { Plans.render(); } },
    gear:      { title: '装备库', render: function () { Gear.render(); } },
    packing:   { title: '打包清单', render: function () { Packing.render(); } }
  };

  var App = {
    hookRefresh: [],
    clearHooks: function () { App.hookRefresh.length = 0; },
    refresh: function () {
      App.hookRefresh.slice().forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
      renderRoute();
    }
  };
  global.App = App;

  /* ---------- 页面输出 ---------- */
  global.setPage = function (html) {
    document.getElementById('page').innerHTML = html;
    document.getElementById('page').scrollTop = 0;
  };

  global.UI.decorateActions = function (buttons) {
    var box = document.getElementById('topbar-actions');
    box.innerHTML = '';
    buttons.forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.text;
      el.onclick = b.onClick;
      box.appendChild(el);
    });
  };

  /* ---------- 路由 ---------- */
  function currentRoute() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    return ROUTES[h] ? h : 'dashboard';
  }

  function renderRoute() {
    var key = currentRoute();
    var route = ROUTES[key];
    document.getElementById('page-title').textContent = route.title;
    [].forEach.call(document.querySelectorAll('[data-route]'), function (a) {
      a.classList.toggle('active', a.dataset.route === key);
    });
    route.render();
  }

  function go(route) {
    var target = '#/' + route;
    if (location.hash === target) {
      // 已经在该页：强制重绘一次，避免点击后看起来"没反应"
      App.clearHooks();
      renderRoute();
    } else {
      location.hash = target;   // 触发 hashchange
    }
  }

  function bindNav() {
    // 覆盖侧边栏导航项与移动端底部标签栏
    [].forEach.call(document.querySelectorAll('[data-route]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        go(a.dataset.route);
      });
    });
    // 左上角标志：点击回到总览
    var brand = document.getElementById('brand');
    if (brand) {
      brand.title = '回到总览';
      brand.addEventListener('click', function () { go('dashboard'); });
    }
  }

  /* ---------- 备份操作（桌面侧边栏与移动端菜单共用） ---------- */
  function doExport() {
    var payload = Store.dump();
    var name = '行者备份-' + UI.todayStr() + '.json';
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
    UI.toast('已导出 ' + payload.plans.length + ' 条计划 / ' + payload.gears.length + ' 件装备');
  }

  function doImportPick() {
    document.getElementById('file-import').click();
  }

  function doReset() {
    UI.confirm({
      title: '清空所有数据',
      message: '将删除本机保存的全部计划与装备，建议先导出备份。确定继续？',
      okText: '清空', danger: true
    }).then(function (ok) {
      if (!ok) return;
      Store.reset();
      Store.seedIfEmpty();
      UI.toast('数据已重置为初始示例');
      App.refresh();
    });
  }

  /* ---------- 移动端「更多」菜单 ---------- */
  var deferredInstall = null;

  function bindMoreMenu() {
    var more = document.getElementById('topbar-more');
    var btn = document.getElementById('more-btn');
    var menu = document.getElementById('more-menu');
    if (!more || !btn || !menu) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) menu.hidden = true;
    });

    document.getElementById('m-export').addEventListener('click', function () { menu.hidden = true; doExport(); });
    document.getElementById('m-import').addEventListener('click', function () { menu.hidden = true; doImportPick(); });
    document.getElementById('m-reset').addEventListener('click', function () { menu.hidden = true; doReset(); });

    var installBtn = document.getElementById('m-install');
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstall = e;
      installBtn.hidden = false;
    });
    installBtn.addEventListener('click', function () {
      menu.hidden = true;
      if (!deferredInstall) return;
      deferredInstall.prompt();
      deferredInstall.userChoice.then(function () { deferredInstall = null; installBtn.hidden = true; });
    });
  }

  /* ---------- Service Worker（仅安全上下文注册，file:// 自动跳过） ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* 局域网 http 下注册失败属预期 */ });
  }

  global.addEventListener('hashchange', function () { App.clearHooks(); renderRoute(); });

  /* ---------- 备份：导入 ---------- */
  var pendingImport = null;

  document.getElementById('file-import').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        pendingImport = JSON.parse(reader.result);
      } catch (err) {
        UI.toast('文件不是合法的 JSON', 'err');
        return;
      }
      UI.openModal({
        title: '导入数据',
        body: '<p class="muted" style="margin:0 0 8px">文件包含 <strong>' + (pendingImport.plans || []).length
          + '</strong> 条计划、<strong>' + (pendingImport.gears || []).length + '</strong> 件装备。</p>'
          + '<p class="muted" style="margin:0;font-size:13px">当前本机有 ' + Store.counts().plans + ' 条计划、'
          + Store.counts().gears + ' 件装备。<br>「覆盖」会替换现有全部数据；「合并」保留现有数据并追加不重复的条目。</p>',
        buttons: [
          { text: '取消' },
          { text: '合并追加', onClick: function () { doImport('merge'); } },
          { text: '覆盖导入', cls: 'btn-primary', onClick: function () { doImport('replace'); } }
        ]
      });
    };
    reader.readAsText(file, 'utf-8');
  });

  function doImport(mode) {
    try {
      var c = Store.restore(pendingImport, mode === 'merge' ? 'merge' : 'replace');
      UI.toast('导入成功：现有 ' + c.plans + ' 条计划 / ' + c.gears + ' 件装备');
      App.refresh();
    } catch (err) {
      UI.toast(err.message || '导入失败', 'err');
    }
    pendingImport = null;
  }

  /* ---------- 启动 ---------- */
  Store.seedIfEmpty();
  bindNav();
  bindMoreMenu();
  document.getElementById('btn-export').addEventListener('click', doExport);
  document.getElementById('btn-import').addEventListener('click', doImportPick);
  document.getElementById('btn-reset').addEventListener('click', doReset);
  registerSW();
  renderRoute();
})(window);
