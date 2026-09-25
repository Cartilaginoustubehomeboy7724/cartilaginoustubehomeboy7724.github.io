/* ===== 数据层：localStorage 持久化 ===== */
(function (global) {
  'use strict';

  var KEY = 'hiking-app:v1';

  /* ---- 存储适配：localStorage 不可用时降级到内存 ---- */
  var memory = {};
  var backend = (function () {
    try {
      var t = '__t__';
      global.localStorage.setItem(t, '1');
      global.localStorage.removeItem(t);
      return global.localStorage;
    } catch (e) {
      console.warn('[store] localStorage 不可用，已降级为内存存储（本次关闭后数据丢失）');
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null; },
        setItem: function (k, v) { memory[k] = String(v); },
        removeItem: function (k) { delete memory[k]; }
      };
    }
  })();

  /* ---- 默认数据骨架 ---- */
  function emptyData() {
    return { version: 1, plans: [], gears: [] };
  }

  var data = load();

  function load() {
    try {
      var raw = backend.getItem(KEY);
      if (!raw) return emptyData();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyData();
      return {
        version: parsed.version || 1,
        plans: Array.isArray(parsed.plans) ? parsed.plans : [],
        gears: Array.isArray(parsed.gears) ? parsed.gears : []
      };
    } catch (e) {
      console.error('[store] 数据解析失败，已重置', e);
      return emptyData();
    }
  }

  function persist() {
    try {
      backend.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[store] 写入失败', e);
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---- 通用 CRUD ---- */
  var Store = {
    uid: uid,

    list: function (collection) {
      return data[collection].slice();
    },

    get: function (collection, id) {
      for (var i = 0; i < data[collection].length; i++) {
        if (data[collection][i].id === id) return data[collection][i];
      }
      return null;
    },

    // where: { key: value } 或 function(item)
    filter: function (collection, where) {
      var fn = typeof where === 'function' ? where : function (item) {
        for (var k in where) {
          if (item[k] !== where[k]) return false;
        }
        return true;
      };
      return data[collection].filter(fn);
    },

    add: function (collection, obj) {
      var now = new Date().toISOString();
      var row = Object.assign({ id: uid(collection.slice(0, -1)), createdAt: now, updatedAt: now }, obj);
      data[collection].unshift(row);
      persist();
      return row;
    },

    update: function (collection, id, patch) {
      var row = Store.get(collection, id);
      if (!row) return null;
      Object.assign(row, patch, { updatedAt: new Date().toISOString() });
      persist();
      return row;
    },

    remove: function (collection, id) {
      var before = data[collection].length;
      data[collection] = data[collection].filter(function (r) { return r.id !== id; });
      persist();
      return data[collection].length < before;
    },

    // 撤销删除：按原样放回（保留原 id 与时间戳）
    restoreRow: function (collection, row) {
      if (!row || !row.id) return null;
      if (Store.get(collection, row.id)) return row;   // 已存在则不重复插入
      data[collection].unshift(row);
      persist();
      return row;
    },

    /* ---- 备份 / 恢复 ---- */
    dump: function () { return JSON.parse(JSON.stringify(data)); },

    restore: function (payload, mode) {
      if (!payload || !Array.isArray(payload.plans) || !Array.isArray(payload.gears)) {
        throw new Error('文件格式不正确：缺少 plans / gears 字段');
      }
      if (mode === 'merge') {
        var pidMap = {};
        payload.plans.forEach(function (p) {
          if (!Store.get('plans', p.id)) data.plans.push(p); else pidMap[p.id] = true;
        });
        payload.gears.forEach(function (g) {
          if (!Store.get('gears', g.id)) data.gears.push(g);
        });
      } else {
        data.plans = payload.plans;
        data.gears = payload.gears;
      }
      persist();
      return { plans: data.plans.length, gears: data.gears.length };
    },

    reset: function () {
      data = emptyData();
      persist();
    },

    counts: function () {
      return { plans: data.plans.length, gears: data.gears.length };
    }
  };

  /* ---- 首次运行：写入一份示例数据，方便立刻看到效果 ---- */
  Store.seedIfEmpty = function () {
    var c = Store.counts();
    if (c.plans || c.gears) return false;

    var gears = [
      ['Osprey Atmos 65 背包', '背负系统', 2100, '良好', true, false],
      ['登山杖（一对）', '背负系统', 480, '良好', true, false],
      ['防雨罩', '背负系统', 120, '良好', false, false],
      ['三季帐篷', '睡眠系统', 1900, '良好', false, false],
      ['羽绒睡袋 -5℃', '睡眠系统', 1150, '良好', false, false],
      ['充气防潮垫', '睡眠系统', 430, '良好', false, false],
      ['气罐炉头', '炊事系统', 180, '良好', false, false],
      ['钛合金锅 750ml', '炊事系统', 130, '良好', false, false],
      ['打火石 / 打火机', '炊事系统', 25, '良好', true, false],
      ['硬壳冲锋衣', '衣物', 480, '良好', true, true],
      ['抓绒中层', '衣物', 330, '良好', true, false],
      ['羽绒服', '衣物', 380, '良好', false, false],
      ['速干长裤', '衣物', 290, '良好', true, true],
      ['防水徒步鞋', '鞋袜', 1050, '磨损', true, true],
      ['羊毛袜 x2', '鞋袜', 120, '良好', true, true],
      ['头灯 + 备用电池', '电子设备', 145, '良好', true, false],
      ['充电宝 10000mAh', '电子设备', 220, '良好', true, false],
      ['运动手表', '电子设备', 55, '良好', false, true],
      ['急救包', '安全急救', 320, '良好', true, false],
      ['多功能刀具', '安全急救', 95, '良好', false, false],
      ['水袋 2L', '饮水', 180, '良好', true, false, false],
      ['净水药片', '饮水', 30, '良好', true, false, false],
      ['能量胶 / 路餐', '饮水', 400, '良好', true, false, true]
    ];

    gears.forEach(function (g) {
      Store.add('gears', {
        name: g[0], category: g[1], weight: g[2], condition: g[3],
        essential: g[4], worn: !!g[5], consumable: !!g[6], quantity: 1,
        brand: '', purchaseDate: '', notes: ''
      });
    });

    var today = new Date();
    function offset(n) {
      var d = new Date(today.getTime() + n * 86400000);
      return d.toISOString().slice(0, 10);
    }
    var essentialIds = Store.filter('gears', function (g) { return g.essential; }).map(function (g) { return g.id; });

    Store.add('plans', {
      title: '香山后山穿越', date: offset(-12), endDate: '', location: '北京 · 海淀',
      distance: 14.5, elevation: 820, difficulty: 2, type: 'day',
      status: 'done', companions: '独自', notes: '秋色不错，后半段碎石路偏滑，建议带登山杖。',
      gearIds: essentialIds, packedIds: essentialIds.slice()
    });
    Store.add('plans', {
      title: '海坨山两日重装', date: offset(9), endDate: offset(10), location: '河北 · 延庆',
      distance: 23, elevation: 1650, difficulty: 4, type: 'overnight',
      status: 'planned', companions: '老张、小林', notes: '需在鞍部扎营，注意取水点；提前查防火期。',
      gearIds: [], packedIds: []
    });
    Store.add('plans', {
      title: '西湖群山拉练', date: offset(24), endDate: '', location: '浙江 · 杭州',
      distance: 18, elevation: 900, difficulty: 3, type: 'day',
      status: 'planned', companions: '', notes: '',
      gearIds: [], packedIds: []
    });

    return true;
  };

  global.Store = Store;
})(window);
