/* 点击释义弹窗 —— 点击盘面里的神煞/十神等名词，弹出对应解释
 *
 * 设计:
 *   · 与心盘编辑器同一套 overlay 交互(点击背景/Esc/关闭按钮 三种关闭方式)
 *   · 解释数据来自 window.QM.SHENSHA_TIPS / SHISHEN_TIPS(见 qimen_shensha_tips.js)
 *   · 调用方式: 渲染时给名词加 onclick="showTermTip('神煞','天乙贵人')"
 *     第一个参数是类别(用于取不同数据表与标题)，第二个是名词
 *   · 数据缺失时给出明确提示，不静默失败(便于发现漏写的条目)
 */
(function () {
  'use strict';

  var CATS = {
    '神煞': { table: 'SHENSHA_TIPS', title: '神煞', showJX: true, file: 'qimen_shensha_tips.js' },
    '十神': { table: 'SHISHEN_TIPS', title: '十神', showJX: false, file: 'qimen_term_tips.js' },
    '长生': { table: 'ZHANGSHENG_TIPS', title: '十二长生', showJX: false, file: 'qimen_term_tips.js' },
    '纳音': { table: 'NAYIN_TIPS', title: '纳音', showJX: false, file: 'qimen_term_tips.js' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function overlay() {
    var ov = document.getElementById('termTipOverlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'termTipOverlay';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);' +
      'z-index:1000;display:none;align-items:center;justify-content:center';
    ov.addEventListener('click', function (e) {
      if (e.target === ov) ov.style.display = 'none';
    });
    document.body.appendChild(ov);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.style.display === 'flex') ov.style.display = 'none';
    });
    return ov;
  }

  var JX_STYLE = {
    '吉': 'background:var(--wx-mu,#3a7);color:#fff',
    '凶': 'background:var(--wx-huo,#c33);color:#fff',
    '中': 'background:var(--c-text-3,#888);color:#fff'
  };

  /* 主入口: showTermTip('神煞', '天乙贵人') */
  window.showTermTip = function (cat, name) {
    var cfg = CATS[cat] || CATS['神煞'];
    var table = (window.QM && window.QM[cfg.table]) || null;
    var item = table ? table[name] : null;
    var ov = overlay();

    var h = '<div style="background:var(--c-bg,#fff);border-radius:12px;padding:16px;' +
      'max-width:400px;width:92%;max-height:var(--vh85,85vh);overflow-y:auto;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.25)">';

    /* 标题行 */
    h += '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">';
    h += '<span style="font-weight:bold;font-size:18px;color:var(--c-text,#222)">' + esc(name) + '</span>';
    if (item && cfg.showJX && item.jx) {
      h += '<span style="font-size:11px;padding:1px 8px;border-radius:10px;' +
        (JX_STYLE[item.jx] || JX_STYLE['中']) + '">' + esc(item.jx) + '</span>';
    }
    h += '<span style="font-size:11px;color:var(--c-text-3,#999)">' + esc(cfg.title) + '</span>';
    h += '</div>';

    if (!item) {
      h += '<div style="font-size:13px;color:var(--c-text-3,#999);text-align:center;padding:12px 0">' +
        '暂无「' + esc(name) + '」的释义。<br><span style="font-size:12px">' +
        '（可在 ' + esc(cfg.file || 'qimen_shensha_tips.js') + ' 中补充该条目）</span></div>';
    } else {
      function block(label, txt) {
        if (!txt) return '';
        return '<div style="margin-bottom:10px">' +
          '<div style="font-size:12px;color:var(--c-theme,#7a5);font-weight:bold;margin-bottom:3px">' + label + '</div>' +
          '<div style="font-size:14px;line-height:1.7;color:var(--c-text,#222)">' + esc(txt) + '</div></div>';
      }
      h += block('含义', item.c);
      h += block('查法', item.q);
      h += block('古诀', item.g);
    }

    h += '<div style="text-align:center;margin-top:6px">' +
      '<span id="termTipClose" style="font-size:13px;color:var(--c-text-3,#999);cursor:pointer;' +
      'padding:6px 18px;display:inline-block">关闭</span></div>';
    h += '</div>';

    ov.innerHTML = h;
    ov.style.display = 'flex';
    var btn = document.getElementById('termTipClose');
    if (btn) btn.onclick = function () { ov.style.display = 'none'; };
  };

  /* 盘面上神煞名词的吉凶着色 —— 与释义表里的 jx 严格一致，
     用的是一套独立的"语义色"变量(不是五行色, 免得绿=木/红=火与吉凶混淆)。 */
  var JX_COLOR = {
    '吉': 'var(--sha-ji,#2e7d32)',
    '凶': 'var(--sha-xiong,#c62828)',
    '中': 'var(--sha-ping,#7a7a7a)'
  };

  /* 给盘面里的名词生成可点击 span（渲染侧统一走这里，保证样式一致）
     name  = 释义表的键（可能是全名，如"正官"）
     label = 盘面上显示的文字（可省；省略则同 name）。
     十神这类"表里键为全名、盘面显示简称"的，靠 label 保住原有显示。 */
  window.termSpan = function (cat, name, colorStyle, label) {
    var cfg = CATS[cat] || CATS['神煞'];
    var table = (window.QM && window.QM[cfg.table]) || null;
    var item = table ? table[name] : null;
    var st = 'cursor:pointer;';
    var attr = '';
    if (cfg.showJX && item && item.jx && JX_COLOR[item.jx]) {
      st += 'color:' + JX_COLOR[item.jx] + ';' + (item.jx === '吉' ? 'font-weight:bold;' : '');
      attr = ' title="' + esc(item.jx) + '·' + esc(name) + '"';
    } else if (!item) {
      attr = ' title="暂无释义"';
    }
    if (colorStyle) st += colorStyle;
    return '<span class="term-tap" style="' + st + '" data-term-cat="' + esc(cat) + '" data-term-name="' +
      esc(name) + '"' + attr + '>' + esc(label || name) + '</span>';
  };

  /* 事件委托：任何带 data-term-name 的元素被点击都会弹释义
     （用委托而非内联 onclick，避免名词里出现引号时破坏 HTML） */
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-term-name')) {
        window.showTermTip(el.getAttribute('data-term-cat') || '神煞',
                           el.getAttribute('data-term-name'));
        e.stopPropagation();
        return;
      }
      el = el.parentNode;
    }
  }, true);
})();
