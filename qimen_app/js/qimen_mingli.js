/*!
 * 命理奇门 (panType 6) —— 阴盘奇门 + 命理层
 *
 * 与「时盘/刻盘」的区别: 以**出生时间**排盘看命, 而非起局断事。
 *
 * ⚠ 结果页版式: 各区块的顺序与 id 约定如下, 渲染函数按此顺序拼装:
 *
 *   #panHead          头部表: 名称/性别/生肖 ｜ 出生(公历+农历) ｜ 节气·月将·局
 *                      ｜ 旬首·值符·值使·马星·空亡 ｜ 四柱(五行着色)
 *   #content          #ma1 + 外圈上(waipan6/7/8) + yinGan9 + #ma2
 *                     + leftTable(waipan5/4/3 + yinGan4/3/8) + #pan(九宫)
 *                     + rightTable(yinGan2/7/6 + waipan9/10/11)
 *                     + #ma3 + 外圈下(waipan2/1/12) + yinGan1 + #ma4
 *                     末尾 #Tip 颜色说明
 *   #dayun_liunian    大运表(yunTitle + dayun_year{n} + dayun{n} onclick=yunFocus)
 *                     + 流年表(yunTitle + liunian1_{c} + liunian2_{c})
 *   #btnTable1        移星换斗 | 天门地户 | 长生状态        (btn1/btn3/btn2)
 *   #yixinghuandouDIV + #tableTemp
 *
 * 外圈与状态复用本项目**已有的**函数(山向盘在用, 已导出到 window):
 *   shen12(1..4)    十二神将, 1=年 2=月 3=日 4=时
 *   tianmenDihu()   天门地户(月将加时 + 建除十二神)
 *   showState()     十二长生(写宫内 stateTian/stateDi)
 * 它们读 window._raw / window._sizhuObj / window._palaces, 故排盘后需设置。
 */
(function () {
  'use strict';

  // 共享常量(见 qimen_constants.js): 显式挂接, 不依赖加载顺序
  let QM = window.QM || {};
  let GAN = '甲乙丙丁戊己庚辛壬癸';
  let ZHI = '子丑寅卯辰巳午未申酉戌亥';
  let SX = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  let dec = function (s) { return String(s == null ? '' : s); };
  /* 五行着色统一走 QM.wxSpan(qimen_constants.js 的单字表), 不再各模块自备色表 ——
     否则同一干支在不同盘里出现色差。保留这两个别名只为调用处读起来清楚。 */
  let wx = function (s) { return (window.QM && QM.wxSpan) ? QM.wxSpan(s) : dec(s); };
  let ganSpan = wx, zhiSpan = wx;

  /** 某一柱的旬空: 旬空偏移 = 10 - (干序+1), 与地支序相加取模(旬空 = 10-(干序+1) 与地支序相加取模) */
  function xunKongOf(gz) {
    gz = dec(gz);
    if (gz.length < 2) return '';
    let gi = GAN.indexOf(gz[0]), zi = ZHI.indexOf(gz[1]);
    if (gi < 0 || zi < 0) return '';
    let b = ((zi + (10 - (gi + 1))) % 12 + 12) % 12;
    return ZHI[(b + 1) % 12] + ZHI[(b + 2) % 12];
  }

  /**
   * 命理奇门排盘。
   * opts: { year, month, day, hour, minute, gender('男'|'女'), name }
   */
  window.mingliChart = function (opts) {
    opts = opts || {};
    let year = opts.year, month = opts.month, day = opts.day, hour = opts.hour, minute = opts.minute || 0;
    let gender = opts.gender || '男';

    let qr = window.qimenChart({ year: year, month: month, day: day, hour: hour, minute: minute, panType: 1 });

    let bz = null;
    try { bz = window.computeBaZiDaYun({ year: year, month: month, day: day, hour: hour, gender: gender }); }
    catch (e) { if (window._logErr) window._logErr('mingli.bazi', e && e.message); }

    /* 完整八字盘（含四柱 pillars 的纳音等）—— 大运/流年神煞要按"本命四柱 + 运年干支"
       一起判定，光有 computeBaZiDaYun 的结果不够；点击释义也需要 pillars。 */
    let bzFull = null;
    try {
      bzFull = window.baziChart({ year: year, month: month, day: day, hour: hour, minute: minute, gender: gender });
    } catch (e) { if (window._logErr) window._logErr('mingli.baziFull', e && e.message); }

    // 四柱 —— qimenChart 的 sizhu 是**对象**(与 chuanRenChart 的字符串不同)
    let gzOf = function (k) { return dec(qr.sizhu && qr.sizhu[k] && qr.sizhu[k].ganZhi); };
    let siZhu = { nian: gzOf('y'), yue: gzOf('m'), ri: gzOf('d'), shi: gzOf('h') };

    let kong = { nian: xunKongOf(siZhu.nian), yue: xunKongOf(siZhu.yue),
                 ri: xunKongOf(siZhu.ri), shi: xunKongOf(siZhu.shi) };

    // 供 shen12 / tianmenDihu / showState 使用
    window._raw = qr.raw || '';
    window._sizhuObj = qr.sizhu || null;
    let palsForState = {};
    for (let g = 1; g <= 9; g++) { if (g !== 5) palsForState['gong' + g] = (qr.pals && qr.pals[g]) || null; }
    window._palaces = palsForState;

    // 生肖: 按年支
    let shengXiao = SX[ZHI.indexOf(siZhu.nian[1])] || '';

    return {
      qr: qr, bz: bz, bzFull: bzFull, sizhu: siZhu, gender: gender, shengXiao: shengXiao,
      name: opts.name || '未知',
      kong: kong,
      yueJiang: dec(qr.yueJiang),
      juLabel: qr.juLabel,
      /** 当前外圈: 'none' | 1..4(神将) | 'tmdh' | 'state' | 1|3(移星换斗) */
      ringKind: 'none',
      /** 当前高亮的大运序号 */
      yunIdx: (bz && bz.curDY) || 0,
    };
  };

  /* ───────────────── 外圈 / 状态切换 (各按钮互斥高亮 / 再点取消) ───────────────── */

  /** 按钮高亮: 3..7 互斥, 再点同一个则取消并清空外圈 */
  window.mingliBtn = function (b, data) {
    let isRing = (b >= 3 && b <= 7);   // 神将按钮已下线, 保留分支不影响
    let bz = document.getElementById('yixinghuandouDIV');   // 切神将时收起八字盘
    if (bz && bz.getAttribute('data-mode') === 'bazi') {
      bz.innerHTML = ''; bz.removeAttribute('data-mode'); bz.style.display = 'none';
    }
    if (isRing && data && data.ringKind === b) {          // 再点一次 → 取消
      data.ringKind = 'none';
      if (window.clearWaipan) { try { window.clearWaipan(); } catch (e) { if (window._logErr) window._logErr('clearWaipan', e && e.message); } }
      return 'none';
    }
    if (window.clearWaipan) { try { window.clearWaipan(); } catch (e) { if (window._logErr) window._logErr('clearWaipan', e && e.message); } }
    try {
      if (b === 3) { if (window.tianmenDihu) window.tianmenDihu(); }      // 天门地户
    } catch (e) { if (window._logErr) window._logErr('mingliBtn', e && e.message); }
    return isRing ? b : (data ? data.ringKind : 'none');
  };

  /** 长生状态(btn2): 写宫内, 独立开关, 不动外圈 */
  window.mingliState = function () { if (window.showState) window.showState(); };

  /* ───────────────── 大运 / 流年 ───────────────── */

  /**
   * 高亮第 n 步大运, 并把该运的 10 个流年填进 liunian1_{c}/liunian2_{c}。
   * 大运切换行为: 一步大运 10 年, 虚岁 = 流年-出生年+1。
   */
  window.mingliYun = function (n, data) {
    let bz = data && data.bz;
    if (!bz || !bz.dayun || !bz.dayun.length) return;
    n = parseInt(n, 10) || 0;
    if (n < 0) n = 0;
    if (n >= bz.dayun.length) n = bz.dayun.length - 1;

    /* 大运/流年神煞：按「本命四柱 + 运/年干支」判定。
       规则表里本就含 大运干(5)/流年干(6)/大运支(11)/流年支(12)/大运柱(19) 位置码，
       此前"盘面暂只用四柱"，这里把运年槽位启用起来。 */
    let full = data.bzFull;
    function shaCalc(gz, lnGz) {
      if (!window.baziYunShenSha || !full || !full.pillars || !gz) return { yun: [], ln: [] };
      try { return window.baziYunShenSha(full.pillars, data.gender, gz, lnGz); }
      catch (e) { return { yun: [], ln: [] }; }
    }
    function gzOfYun(k) { let o = bz.dayun[k] || {}; return o.gz || ((o.g || '') + (o.z || '')); }
    /* 流年格窄(屏宽/10列 ≈ 40px)，4 字全名(天乙贵人 ≈ 44px)物理上放不下必然拆行 ——
       故显示走简称、释义键仍传全名（用 termSpan 的 label 参数）。
       规则: 去掉 贵人/煞/日 后缀; 个别无后缀的四字名单独映射。 */
    let SHA_SHORT_MAP = { '天罗地网': '罗网' };
    function shaShort(nm) {
      if (SHA_SHORT_MAP[nm]) return SHA_SHORT_MAP[nm];
      return nm.replace(/(贵人|煞|日)$/, '') || nm;
    }

    // 大运格高亮 + 悬停显示该运神煞
    for (let i = 0; i < 10; i++) {
      let el = document.getElementById('dayun' + i);
      let yr = document.getElementById('dayun_year' + i);
      let on = (i === n);
      if (el) {
        el.style.color = '';
        el.style.fontWeight = on ? 'bold' : '';
        /* 选中态: 灰底 + 内描边, 清楚标示当前查看的是哪一步大运
           (此前只有文字变色, 在密集的干支格里不够醒目) */
        el.style.background = on ? 'var(--c-gray-bg)' : '';
        el.style.boxShadow = on ? 'inset 0 0 0 2px var(--c-border)' : '';
        let list = shaCalc(gzOfYun(i), null).yun;
        el.title = list.length ? ('大运神煞：' + list.join('、')) : '';
      }
      if (yr) {
        yr.style.background = on ? 'var(--c-gray-bg)' : '';
        yr.style.color = on ? 'var(--c-text)' : '';
        yr.style.fontWeight = on ? 'bold' : '';
      }
    }
    // 流年: 该运第 c 年（并附该流年神煞）
    /* 流年默认选中: 当前年若落在本运十年内则选它, 否则选第一个 */
    let nowY = new Date().getFullYear(), lnIdx = 0;
    let lnAll = bz.liuNian || [];
    for (let k = 0; k < 10; k++) {
      let yy = lnAll[n * 10 + k];
      if (yy && yy.year === nowY) { lnIdx = k; break; }
    }
    let startYear = (bz.qiYunYear || 0) + 10 * n;
    let birthYear = (data.qr && data.qr.gongli ? parseInt(dec(data.qr.gongli).slice(0, 4), 10) : 0);
    let ln = bz.liuNian || [];
    let curYunGz = gzOfYun(n);
    for (let c = 0; c < 10; c++) {
      let y = ln[n * 10 + c];
      let e1 = document.getElementById('liunian1_' + c);
      let e2 = document.getElementById('liunian2_' + c);
      if (!y) {
        if (e1) e1.innerHTML = '';
        if (e2) e2.innerHTML = '';
        let e0 = document.getElementById('liunian3_' + c);
        if (e0) e0.innerHTML = '';
        continue;
      }
      let age = birthYear ? (y.year - birthYear + 1) : '';
      if (e1) e1.innerHTML = y.year + '<br>' + age + '岁';
      if (e2) {
        e2.innerHTML = ganSpan(y.g) + zhiSpan(y.z);
        /* 点流年 → 切换该年(并重画流月)。只打标记, 点击交给事件委托 */
        e2.style.cursor = 'pointer';
        e2.setAttribute('data-ln-year', String(y.year | 0));
        if (e1) e1.setAttribute('data-ln-year', String(y.year | 0));
        markSel(e1, c === lnIdx);
        markSel(e2, c === lnIdx);
      }
      /* 流年神煞改到独立一行(liunian3_c), 不再挤在干支格里 */
      let e3 = document.getElementById('liunian3_' + c);
      if (e3) {
        e3.innerHTML = shaCalc(curYunGz, (y.g || '') + (y.z || '')).ln.map(function (s2) {
          return window.termSpan ? window.termSpan('神煞', s2, '', shaShort(s2)) : shaShort(s2);
        }).join('<br>');
      }
    }
    data.yunIdx = n;
    data.lnIdx = lnIdx;
    /* 流月默认: 选中的流年若是今年 → 按月序选; 否则(起运晚于当前/往年)选第一个月 */
    let nowM2 = new Date().getMonth() + 1;
    let selY = lnAll[n * 10 + lnIdx];
    let lyPick = 0;
    if (selY && selY.year === nowY) lyPick = (nowM2 >= 2) ? (nowM2 - 2) : (nowM2 + 10);
    data.lyIdx = lyPick;
    paintLiuyue(selY ? selY.year : (bz.qiYunYear || nowY), lyPick);
    /* 流日**一律默认不显示** —— 只有用户点流月时才打开(届时默认选中当下日期)。 */
    hideLiuri();
    void startYear;
  };

  /* ─────────────── 流月 / 流日 / 流时（三级下钻）───────────────
     口径见 qimen_bazi.js 的 baziLiuYue/Ri/Shi。
     按需求：流月与流日**不施加神煞**（仅列干支与节气/日期）。 */

  /* 展开新表后把它滚进视野 —— 流日/流时都在下方, 不滚用户看不到。
     老 WebView 可能不支持 options 形式, 退回无参调用; 整体 try 兜底。 */
  function scrollIntoViewSoon(el) {
    if (!el) return;
    setTimeout(function () {
      try {
        if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        try { el.scrollIntoView(); } catch (e2) { /* 忽略 */ }
      }
    }, 40);
  }

  function lyGrid(arr, cols, cellFn) {
    let h = '<div class="ly-grid' + (cols === 7 ? ' ly-grid7' : '') + '">';
    arr.forEach(function (x, i) { h += cellFn(x, i); });
    return h + '</div>';
  }

  /* 隐藏流日/流时 —— 流月虽默认选中, 但流日要等用户点流月才出现 */
  function hideLiuri() {
    let rb = document.getElementById('liuriBox');
    if (rb) { rb.innerHTML = ''; rb.style.display = 'none'; }
    let sb = document.getElementById('liushiBox');
    if (sb) { sb.innerHTML = ''; sb.style.display = 'none'; }
  }

  /* 选中态统一样式 —— 与大运格一致: 变色 + 加粗 + 灰底 + 内描边 */
  function markSel(el, on) {
    if (!el) return;
    /* 不改字色 —— 此前选中变红, 与盘面五行配色打架; 选中只靠 加粗 + 灰底 + 内描边 */
    el.style.color = '';
    el.style.fontWeight = on ? 'bold' : '';
    el.style.background = on ? 'var(--c-gray-bg)' : '';
    el.style.boxShadow = on ? 'inset 0 0 0 2px var(--c-border)' : '';
  }

  /** 画出某流年的 12 个流月到常驻表格; pick = 选中第几个月(决定流日) */
  function paintLiuyue(year, pick) {
    let arr = window.baziLiuYue ? window.baziLiuYue(year) : [];
    for (let i = 0; i < 12; i++) {
      let e1 = document.getElementById('liuyue1_' + i);
      let e2 = document.getElementById('liuyue2_' + i);
      let m = arr[i];
      if (!m) { if (e1) e1.innerHTML = ''; if (e2) e2.innerHTML = ''; continue; }
      if (e1) {
        e1.innerHTML = ganSpan(m.gan) + zhiSpan(m.zhi);
        e1.style.cursor = 'pointer';
        e1.setAttribute('data-ly-idx', String(i));
        markSel(e1, i === pick);
      }
      if (e2) {
        e2.innerHTML = '<font class="shishen">' + m.jie + '</font><br>' + m.jieM + '/' + m.jieD;
        e2.style.cursor = 'pointer';
        e2.setAttribute('data-ly-idx', String(i));
        markSel(e2, i === pick);          /* 节气格与干支格同步高亮, 视觉一致 */
      }
    }
    return arr;
  }

  /** 选中某流年(供委托调用): 重画流年高亮 + 流月, 并按默认规则选流月 */
  window.mingliPickYear = function (year) {
    let d = window._mlData;
    if (!d || !d.bz) return;
    let ln = d.bz.liuNian || [];
    let hit = -1;
    for (let i = 0; i < ln.length; i++) { if (ln[i] && ln[i].year === year) { hit = i; break; } }
    if (hit < 0) return;
    let yunIdx = Math.floor(hit / 10);
    if (yunIdx !== d.yunIdx) { window.mingliYun(yunIdx, d); return; }  // 换运 → 走原路径
    for (let c = 0; c < 10; c++) {
      let e1 = document.getElementById('liunian1_' + c);
      let e2 = document.getElementById('liunian2_' + c);
      let on = ((d.lnIdx || 0) === c);
      markSel(e1, on); markSel(e2, on);
    }
    d.lnIdx = hit % 10;
    /* 流月默认: 当前年月落在此流年则选对应月, 否则第一个月 */
    let now = new Date(), nowY = now.getFullYear(), nowM = now.getMonth() + 1;
    let pick = 0;
    if (year === nowY) pick = (nowM >= 2) ? (nowM - 2) : (nowM + 10);
    paintLiuyue(year, pick);
    d.lyIdx = pick;
    hideLiuri();
  };

  /** 点流月 → 高亮该月并显示该月流日 */
  window.mingliPickMonth = function (idx) {
    let d = window._mlData;
    if (!d || !d.bz) return;
    let ln = d.bz.liuNian || [];
    let cur = ln[(d.yunIdx || 0) * 10 + (d.lnIdx || 0)];
    if (!cur) return;
    let rb0 = document.getElementById('liuriBox');
    /* 再次点击同一个流月 → 折叠流日(流月高亮保留, 它表示"正在看的月份") */
    if (d.lyIdx === idx && rb0 && rb0.style.display !== 'none' && rb0.innerHTML) {
      hideLiuri();
      return;
    }
    let arr = window.baziLiuYue ? window.baziLiuYue(cur.year) : [];
    d.lyIdx = idx;
    for (let i = 0; i < 12; i++) {
      markSel(document.getElementById('liuyue1_' + i), i === idx);
      markSel(document.getElementById('liuyue2_' + i), i === idx);   /* 节气格同步 */
    }
    let m = arr[idx];
    if (!m) return;
    window.mingliLiuri(m.solarY, m.solarM, m.gz, cur.year);
  };

  /** 兼容旧入口: 直接给年份 → 选该年 */
  window.mingliLiuyue = function (year) { window.mingliPickYear(year); };

  /** 点流月 → 该节气月内的流日 */
  window.mingliLiuri = function (y, m, gz, lyYear) {
    let box = document.getElementById('liuriBox');
    if (!box) return;
    let arr = window.baziLiuRi ? window.baziLiuRi(y, m, gz) : [];
    let shi = document.getElementById('liushiBox');
    if (shi) { shi.innerHTML = ''; shi.style.display = 'none'; }
    box.style.display = arr.length ? 'block' : 'none';
    if (!arr.length) { box.innerHTML = ''; return; }
    /* 默认选中: 该月正是当前月 → 选当前日; 否则选第 1 日 */
    /* 仅当所显示月份**正好是当前月**时才自动选中当下日期; 其他月一律不预选 */
    let now = new Date(), pick = -1;
    if (y === now.getFullYear() && m === now.getMonth() + 1) {
      for (let i = 0; i < arr.length; i++) { if (arr[i].d === now.getDate()) { pick = i; break; } }
    }
    box.innerHTML = '<div class="ly-title">流日 · ' + gz + ' 月（共 ' + arr.length + ' 天）</div>' +
      lyGrid(arr, 7, function (d, i) {
        return '<div class="ly-cell" data-lr-idx="' + i + '"' +
          ' data-lr-y="' + d.y + '" data-lr-m="' + d.m + '" data-lr-d="' + d.d + '">' +
          '<div class="ly-gz">' + ganSpan(d.gan) + zhiSpan(d.zhi) + '</div>' +
          '<div class="ly-sub">' + d.m + '/' + d.d + '</div></div>';
      });
    window.mingliPickDay(pick, true);      // 默认高亮, 但不展开时辰
    scrollIntoViewSoon(box);               // 展开后自动滚进视野
  };

  /** 点流日 → 高亮该日(silent=true 时不展开流时) */
  window.mingliPickDay = function (idx, silent) {
    let box = document.getElementById('liuriBox');
    if (!box) return;
    /* 再次点击同一天 → 折叠流时(只收流时, 流日与当日高亮都保留) */
    if (!silent && window._mlDayIdx === idx) {
      let sb0 = document.getElementById('liushiBox');
      if (sb0 && sb0.style.display !== 'none' && sb0.innerHTML) {
        sb0.innerHTML = '';
        sb0.style.display = 'none';
        return;
      }
    }
    let cells = box.querySelectorAll('[data-lr-idx]');
    let hit = null;
    for (let i = 0; i < cells.length; i++) {
      let on = (parseInt(cells[i].getAttribute('data-lr-idx'), 10) === idx);
      markSel(cells[i], on);
      if (on) hit = cells[i];
    }
    window._mlDayIdx = idx;
    if (silent || !hit) return;
    let y = +hit.getAttribute('data-lr-y'), m = +hit.getAttribute('data-lr-m'), dd = +hit.getAttribute('data-lr-d');
    let sb = document.getElementById('liushiBox');
    if (sb) sb.style.display = 'block';
    window.mingliLiushi(y, m, dd);
  };

  /** 点流日 → 该日 12 时辰 */
  window.mingliLiushi = function (y, m, d) {
    let box = document.getElementById('liushiBox');
    if (!box) return;
    let arr = window.baziLiuShi ? window.baziLiuShi(y, m, d) : [];
    if (!arr.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="ly-title">流时 · ' + y + '-' + m + '-' + d + '</div>' +
      lyGrid(arr, 6, function (x) {
        return '<div class="ly-cell"><div class="ly-gz">' + ganSpan(x.gan) + zhiSpan(x.zhi) + '</div>' +
          '<div class="ly-sub">' + String(x.hour).padStart(2, '0') + '时</div></div>';
      });
    scrollIntoViewSoon(box);               // 展开后自动滚进视野
  };

  /* 事件委托：点带 data-ln-year 的流年格 → 展开该年流月。
     用委托而非逐元素绑事件，既避开 WebView 对 element.onclick 的怪癖，
     也让流年表重绘后无需重新绑定。 */
  if (!window._mlLnDelegated) {
    window._mlLnDelegated = 1;
    document.addEventListener('click', function (e) {
      let el = e.target;
      while (el && el !== document.body) {
        let lr = el.getAttribute && el.getAttribute('data-lr-idx');
        if (lr !== null && lr !== undefined && lr !== '') {
          if (window.mingliPickDay) window.mingliPickDay(parseInt(lr, 10));
          return;
        }
        let ly = el.getAttribute && el.getAttribute('data-ly-idx');
        if (ly !== null && ly !== undefined && ly !== '') {
          if (window.mingliPickMonth) window.mingliPickMonth(parseInt(ly, 10));
          return;
        }
        if (el.getAttribute && el.getAttribute('data-ln-year')) {
          let yy = parseInt(el.getAttribute('data-ln-year'), 10);
          if (yy && window.mingliPickYear) window.mingliPickYear(yy);
          return;
        }
        el = el.parentNode;
      }
    }, true);
  }

  /* ───────────────── 输入面板 ───────────────── */

  /** 命理输入面板(姓名 + 性别)。出生时间复用页面顶部的年月日时选择器。 */
  window.renderMingliInputs = function (d) {
    d = d || {};
    let gender = d.gender || '男';
    let name = d.name || '';
    let h = '<div class="ml-input-panel"><table style="width:100%;border-collapse:collapse"><tr>';
    h += '<td style="width:44px;font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">姓名</td>';
    h += '<td style="width:34%"><input id="mlName" class="sel-date" style="width:100%;box-sizing:border-box" type="text" maxlength="20" value="' + name.replace(/"/g, '&quot;') + '" onchange="doMingli()"></td>';
    h += '<td style="width:44px;font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">性别</td>';
    h += '<td><select id="mlGender" class="sel-date" style="width:100%" onchange="doMingli()">';
    ['男', '女'].forEach(function (g) { h += '<option value="' + g + '"' + (g === gender ? ' selected' : '') + '>' + g + '</option>'; });
    h += '</select></td>';
    h += '</tr></table></div>';
    return h;
  };

  /* ───────────────── 渲染 ───────────────── */

  window.renderMingli = function (data, containerId) {
    let h = '';
    try {
      let qr = data.qr, bz = data.bz, sz = data.sizhu;

      /* ── ① #panHead 头部表 ── */
      h += '<div id="panHead" class="bz-pan"><TABLE class="pan" id="headTable">';
      h += '<TR><TD colspan="5" style="line-height:30px">' +
           '<font style="color:var(--c-gold)">名称：</font><font id="name">' + (window._esc ? window._esc(data.name) : data.name) + '</font>&emsp;' +
           '<font style="color:var(--c-gold)">性别：</font><font id="gender">' + data.gender + '</font>&emsp;' +
           '<font style="color:var(--c-gold)">生肖：</font>' + data.shengXiao + '</TD></TR>';
      // 日期格式: 1986-12-11(农历十一月初十)
      let birthYmd = qr.gongli.replace(/^(\d+)年(\d+)月(\d+)日.*$/, function (m, a, b, c) {
        return a + '-' + ('0' + b).slice(-2) + '-' + ('0' + c).slice(-2);
      });
      h += '<TR><TD style="width:16%;color:var(--c-gold)">出生</TD>' +
           '<TD colspan="4" id="datetime">' + birthYmd + '(' + qr.nongli + ')</TD></TR>';
      h += '<TR><TD style="color:var(--c-gold)">节气</TD>' +
           '<TD colspan="2">' + qr.jieqi + '&nbsp;&nbsp;&nbsp;月将<B>' + wx(data.yueJiang) + '</B></TD>' +
           '<TD colspan="2">' + qr.juLabel.replace(/^(\D+)/, '$1<B>').replace(/(\d+)$/, '$1</B>') + '</TD></TR>';
      /* 旬首/值符/值使/马星/空亡: 小标签内联在值上方, 省掉纯标题行 */
      // 旬首显示为「旬首+遁干」(格式: 甲子戊), 六甲遁于六仪
      let XUN_DUN = { 子: '戊', 戌: '己', 申: '庚', 午: '辛', 辰: '壬', 寅: '癸' };
      let xunShouTxt = dec(qr.xs.gz) + (XUN_DUN[dec(qr.xs.gz)[1]] || '');
      h += '<TR class="hd-row"><TD id="xunShou"><span class="hd-lbl">旬首</span>' + wx(xunShouTxt) + '</TD>' +
           '<TD><span class="hd-lbl">值符</span>天<font id="zhiFu">' + qr.zf.s + '</font></TD>' +
           '<TD><span class="hd-lbl">值使</span><font id="zhiShi">' + qr.zs.s + '</font>门</TD>' +
           '<TD id="maXing"><span class="hd-lbl">马星</span>' + wx(qr.ma.z) + '</TD>' +
           '<TD><span class="hd-lbl">空亡</span>' + wx(qr.kw.gz) + '</TD></TR>';
      /* ── 八字信息(原「八字排盘」主盘, 合并进命理主盘): 十神/藏干/纳音/地势/
            自坐/空亡/神煞/胎元·命宫·身宫/旺相休囚死/交运; 四柱行主盘已有, 不重复 ── */
      let bzInfo = null;   /* 声明提块外: 270 行交运说明在 try 外使用, 原 var 提升语义 */
      try {
        bzInfo = window.baziChart ? window.baziChart({
          year: window.Y, month: window.M, day: window.D,
          hour: window.hr, minute: window.mn,
          name: data.name, gender: data.gender
        }) : null;
        let tipHtml = '颜色说明：<span class="cx-mu">入墓</span>、<span class="cx-xing">击刑</span>、' +
                      '<span class="cx-po">门迫</span>、<span class="cx-xingmu">刑+墓</span>';
        /* 四柱行: 标签按性别作 乾造/坤造(与其它标签同为金色), 交 baziMainRows 插到十神行之下 */
        let zaoLabel = (data.gender === '女') ? '坤造' : '乾造';
        /* 标签样式与「出生」「节气」等左侧标签完全相同(内联金色, 不用 .hd-side
           —— 那个类另有 12px 字号与 2px 字距, 会比其它标签小而散)。 */
        let sizhuRow = '<TR id="sizhu" class="hd-row"><TD style="color:var(--c-gold)">' + zaoLabel + '</TD>';
        [sz.nian, sz.yue, sz.ri, sz.shi].forEach(function (gz) {
          gz = gz || '';
          /* 用 .sizhu(时盘同款): 复用 #panHead .sizhu 的整套响应式尺寸 */
          sizhuRow += '<TD class="sizhu sizhu-v">' + ganSpan(gz[0] || '') + '<br>' + zhiSpan(gz[1] || '') + '</TD>';
        });
        sizhuRow += '</TR>';
        if (bzInfo && window.baziMainRows) h += window.baziMainRows(bzInfo, false, 'bz-sec', tipHtml, true, sizhuRow);
      } catch (e) {
        if (window._logErr) window._logErr('mingli.baziRows', e && e.message);
      }
      h += '</TABLE></div>';

      /* ── ② #content 盘体 + 外圈 ── */
      if (window.buildPaipanGrid && qr.pals) {
        let pals = {}, kongGongs = {};
        for (let g = 1; g <= 9; g++) {
          if (g === 5) continue;
          let p = qr.pals[g] || {};
          pals['gong' + g] = {
            shen: p.shen || '', tian: p.tian || '', di: p.di || '', xing: p.xing || '',
            men: p.men || '', anGan: p.anGan || '', kong: !!p.kong, isMenPo: !!p.mp,
            isTianXing: !!p.tx, isTianMu: !!p.tm, isDiXing: !!p.dx, isDiMu: !!p.dm,
          };
          if (p.kong) kongGongs[g] = true;
        }
        if (window.recalcColors) window.recalcColors(pals);
        let csFn = window._colorSpan || function (v) { return v || ''; };
        /* 阴干: 照时盘的做法, 取本宫 anGan 并着色(入墓/击刑用同一套标记) */
        let agFn = function (g) {
          let p2 = pals['gong' + g];
          let ag = p2 ? p2.anGan : '';
          return ag ? (window._anGanColor ? window._anGanColor(ag, g) : ag) : '';
        };
        // 不传 wrapperClass/panClass, 让 buildPaipanGrid 生成标准的
        // <div id="content"> 与 <TABLE id="pan">
        h += window.buildPaipanGrid(pals, kongGongs, (qr.ma && qr.ma.p) || 'ma2', agFn,
               { colorSpan: csFn, panClass: 'ml-pan' });
        /* 颜色说明已上移到主盘内, 见上方 baziMainRows 调用处 */
      }

      /* 操作按钮(移星换斗/天门地户/长生状态) —— 按需求放在交运说明之上 */
      h += '<TABLE id="btnTable1"><TR>';
      h += '<TD><div class="btn" id="btn1" onclick="showMingliYixing();mingliBtn(1,window._mlData);">移星换斗</div></TD>';
      h += '<TD><div class="btn" id="btn3" onclick="mingliBtn(3,window._mlData);">天门地户</div></TD>';
      h += '<TD><div class="btn" id="btn2" onclick="mingliState();mingliBtn(2,window._mlData);">长生状态</div></TD>';
      h += '</TR></TABLE>';

      /* 交运说明: 置于九宫下方 —— 即原来颜色说明所在的位置 */
      if (bzInfo && window.baziJiaoYunBlock) h += window.baziJiaoYunBlock(bzInfo);
      /* 操作提示: 流日默认不显示, 点流月才打开 */
      h += '<div class="ml-tip">点击对应流月/流日/流时可打开月份，流日，和流时细节功能</div>';

      /* ── ③ #dayun_liunian 大运 + 流年(两个独立 TABLE) ── */
      if (bz && bz.dayun && bz.dayun.length) {
        let n = Math.min(bz.dayun.length, 10);

        h += '<div id="dayun_liunian"><TABLE class="pan">';
        h += '<TR><TD class="yunTitle" rowspan="2">大<br>运</TD>';
        /* 第 1 格固定为「小运」段(起运前) —— 与第三方同构: 该格只标"小运"二字,
           值行给出起运前的岁数区间; 从第 2 格起才是各步大运。 */
        let qyAge = (bz.qiYunYear || 0) - (window.Y || bz.qiYunYear || 0);
        if (!(qyAge > 0)) qyAge = 1;
        for (let d = 0; d < n; d++) {
          /* 首格(小运段)与大运格一样可点 —— 小运/大运来回切换, 选中态同款 */
          h += '<TD class="yun1" id="dayun_year' + d + '"' +
               (d === 0 ? ' onclick="mingliYun(0,window._mlData)" style="cursor:pointer"' : '') + '>' +
               (d === 0 ? '小<br>运' : (bz.qiYunYear + (d - 1) * 10)) + '</TD>';
        }
        h += '</TR><TR>';
        for (let d2 = 0; d2 < n; d2++) {
          if (d2 === 0) {
            /* 竖排(与大运标题同款); 点它切回小运段 */
            h += '<TD class="yun2" id="dayun0" onclick="mingliYun(0,window._mlData)" style="cursor:pointer">' +
                 '1~' + qyAge + '<br>岁</TD>';
            continue;
          }
          let dy = bz.dayun[d2], ss = (bz.dayunSS || [])[d2] || '';
          let cur = (d2 === data.yunIdx);
          h += '<TD class="yun2" id="dayun' + d2 + '" onclick="mingliYun(' + d2 + ',window._mlData)"' +
               (cur ? ' style="font-weight:bold"' : '') + '>' +
               ganSpan(dy.g) + '<br>' + zhiSpan(dy.z) + '<br><font class="shishen">' + ss + '</font></TD>';
        }
        h += '</TR></TABLE>';

        h += '<TABLE class="pan">';
        h += '<TR><TD class="yunTitle" rowspan="3">流<br>年</TD>';
        for (let c = 0; c < 10; c++) h += '<TD class="liunian1" id="liunian1_' + c + '"></TD>';
        h += '</TR><TR>';
        for (let c2 = 0; c2 < 10; c2++) h += '<TD class="liunian2" id="liunian2_' + c2 + '"></TD>';
        /* 流年神煞单独占一行 —— 与顶部命理盘神煞栏同构(一格管一年, 格内纵向排列)。
           此前塞在干支格(liunian2)里, 空间不足会与相邻内容重叠。 */
        h += '</TR><TR>';
        for (let c3 = 0; c3 < 10; c3++) h += '<TD class="liunian3" id="liunian3_' + c3 + '"></TD>';
        h += '</TR>';
        h += '</TR></TABLE>';

        /* 流月表: 与流年同区、紧接其下(视觉上同一个表), 12 个月正月建寅,
           由"选中的流年"驱动 —— 常驻显示, 不需点击才出现。 */
        h += '<TABLE class="pan"><TR><TD class="yunTitle" rowspan="2">流<br>月</TD>';
        for (let q = 0; q < 12; q++) h += '<TD class="liuyue1" id="liuyue1_' + q + '"></TD>';
        h += '</TR><TR>';
        for (let q2 = 0; q2 < 12; q2++) h += '<TD class="liuyue2" id="liuyue2_' + q2 + '"></TD>';
        h += '</TR></TABLE>';

        /* 流日: 点选流月后才出现(默认隐藏) */
        h += '<div id="liuyueBox"></div><div id="liuriBox" style="display:none"></div>' +
             '<div id="liushiBox" style="display:none"></div></div>';
      }



      /* ── ⑤ 移星换斗容器 ── */
      h += '<div id="yixinghuandouDIV"></div><div id="tableTemp" style="display:none"></div>';
    } catch (e) {
      h += '<div style="color:var(--c-po);padding:12px">命理渲染错误: ' + (e && e.message) + '</div>';
      if (window._logErr) window._logErr('renderMingli', e && e.message);
    }

    h += '<style>' +
      '.ml-dy-wrap{width:100%;margin:0 auto}' +
      '</style>';

    if (containerId) {
      let el = document.getElementById(containerId);
      if (el) el.innerHTML = h;
    }
    return h;
  };

  /** 命理盘渲染后处理: 宫位正方形 + 左右行高同步 + 阴干对齐(照时盘/山向) */
  window.mingliFixLayout = function () {
    let wrap = document.getElementById('panWrap');
    if (!wrap) return;
    let box = wrap.querySelector('#content');
    if (!box) return;
    /* 宫位正方形: 已由 .pan-cell 的 aspect-ratio 保证, 旧环境才回写高度 */
    let _noAR = !(window.CSS && CSS.supports && CSS.supports('aspect-ratio', '1 / 1'));
    if (_noAR) {
      [4, 9, 2, 3, 7, 8, 1, 6].forEach(function (g) {
        let el = box.querySelector('#gong' + g);
        if (el) { let w = el.getBoundingClientRect().width; if (w > 0) el.style.height = w + 'px'; }
      });
    }
    /* 左右外圈行高与中宫对齐 */
    let pRows = box.querySelectorAll('#pan tr'),
        lRows = box.querySelectorAll('#leftTable tr'),
        rRows = box.querySelectorAll('#rightTable tr');
    for (let i = 0; i < 3 && i < pRows.length; i++) {
      let rh = pRows[i].getBoundingClientRect().height;
      if (rh > 0) {
        if (lRows[i]) lRows[i].style.height = rh + 'px';
        if (rRows[i]) rRows[i].style.height = rh + 'px';
      }
    }
    /* 阴干对齐: 左列(4/3/8)贴天盘干, 右列(2/7/6)贴九星 */
    [4, 3, 8].forEach(function (g) {
      let y = box.querySelector('#yinGan' + g), t = box.querySelector('#tian' + g), go = box.querySelector('#gong' + g);
      if (y && t && go) {
        y.style.paddingTop = Math.max(0, t.getBoundingClientRect().top - go.getBoundingClientRect().top) + 'px';
        y.style.textAlign = 'right';
      }
      if (y) { y.style.verticalAlign = 'top'; y.style.fontSize = 'var(--pan-fs-sm)'; y.style.lineHeight = 'var(--pan-lh-sm)'; y.style.color = 'var(--c-text)'; }
    });
    [2, 7, 6].forEach(function (g) {
      let y = box.querySelector('#yinGan' + g), x = box.querySelector('#xing' + g), go = box.querySelector('#gong' + g);
      if (y && x && go) {
        y.style.paddingTop = Math.max(0, x.getBoundingClientRect().top - go.getBoundingClientRect().top) + 'px';
        y.style.textAlign = 'left';
      }
      if (y) { y.style.verticalAlign = 'top'; y.style.fontSize = 'var(--pan-fs-sm)'; y.style.lineHeight = 'var(--pan-lh-sm)'; y.style.color = 'var(--c-text)'; }
    });
    let y9 = box.querySelector('#yinGan9'), y1 = box.querySelector('#yinGan1');
    if (y9) { y9.style.verticalAlign = 'bottom'; y9.style.fontSize = 'var(--pan-fs-sm)'; y9.style.color = 'var(--c-text)'; }
    if (y1) { y1.style.verticalAlign = 'top'; y1.style.fontSize = 'var(--pan-fs-sm)'; y1.style.color = 'var(--c-text)'; }
  };

  /** 移星换斗(占位: 按钮结构已就位, 功能待补) */
  window.showMingliYixing = function () {
    let d = document.getElementById('yixinghuandouDIV');
    if (!d) return;
    if (d.getAttribute('data-mode') === 'bazi') {   // 八字盘占着容器时先让位
      d.innerHTML = ''; d.removeAttribute('data-mode'); d.style.display = 'none';
    }
    d.style.display = (d.style.display === 'block') ? 'none' : 'block';
    if (d.style.display === 'block' && !d.innerHTML) {
      d.innerHTML = '<div style="text-align:center;color:var(--c-text-3);font-size:12px;padding:8px">' +
                    '移星换斗：点击盘面宫位查看各宫换斗星（待补全）</div>';
    }
  };
})();
