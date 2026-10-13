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
      /* 用 baziChart 的 curYun —— 它与 DOM 的 dayun0..9 同基准(下标 0 = 小运段)。
         computeBaZiDaYun 的 curDY 没有小运段, 直接拿来索引会整体早一步(实测多数盘如此)。 */
      yunIdx: (bzFull && bzFull.curYun) || 0,
    };
  };

  /* ───────────────── 外圈 / 状态切换 (各按钮互斥高亮 / 再点取消) ───────────────── */

  /** 按钮高亮: 1(移星换斗) 与 3..7 互斥, 再点同一个则取消并清空外圈 */
  window.mingliBtn = function (b, data) {
    /* 记账范围 = 互斥的外圈切换钮: 1(移星换斗) 与 3..7(神将/天门地户)。
       b=2(长生状态)不在内 —— 它是**独立开关、不动外圈**, 不参与互斥也不记账。 */
    let isRing = ((b >= 3 && b <= 7) || b === 1);
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
    /* ★ 记账: 此前**只有**取消分支写 ringKind('none'), 打开分支从不回写 ——
       于是 data.ringKind 恒为 'none', 上面那个取消分支永远进不去(互斥/取消形同虚设)。
       这是绑定竞态修好之后暴露出来的第二层: 光让按钮走到 mingliBtn 还不够。 */
    if (isRing && data) data.ringKind = b;
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
    function gzOfYun(k) {
      /* 大运序列以 baziChart 为准(其 dayun[0] 是月柱段、1..9 是各步大运,
         与第三方逐项对拍一致); computeBaZiDaYun 的 dayun 结构不同, 不用于渲染。 */
      let src = (window._mlData && window._mlData.bzFull && window._mlData.bzFull.dayun)
        ? window._mlData.bzFull.dayun : bz.dayun;
      let o = src[k] || {};
      return o.gz || ((o.g || '') + (o.z || ''));
    }
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
    /* 用**本段首年**推算当前年落在第几格 —— 与 DOM/流月/流日同源。
       (ln 数组在下方才生成, 此处不可引用; 也绝不能再用 bz.liuNian,
        那是 computeBaZiDaYun 的口径、起运年算错, 会导致高亮的流年与
        下方流月整表不是同一年、点流月展出的流日又是第三年。) */
    let segStartY = (data.bzFull && data.bzFull.dayun && data.bzFull.dayun[n])
      ? (data.bzFull.dayun[n].year || 0) : 0;
    if (segStartY && nowY >= segStartY && nowY < segStartY + 10) lnIdx = nowY - segStartY;
    let startYear = (bz.qiYunYear || 0) + 10 * n;
    let birthYear = (data.qr && data.qr.gongli ? parseInt(dec(data.qr.gongli).slice(0, 4), 10) : 0);
    /* 流年: 由**该步大运的起始年**推算 —— 弃用 bz.liuNian(computeBaZiDaYun),
       它把起运年算错(2006-10-12 盘给 2009, 而实际交运 2015),
       而 bzFull.dayun 已与第三方逐项对拍一致。 */
    let dySeg = (data.bzFull && data.bzFull.dayun) ? data.bzFull.dayun[n] : null;
    let ln = [];
    if (dySeg) {
      for (let i5 = 0; i5 < 10; i5++) {
        let yy5 = (dySeg.year || 0) + i5;
        let gz5 = (window.tyme && window.tyme.SixtyCycleYear)
          ? window.tyme.SixtyCycleYear.fromYear(yy5).getSixtyCycle().getName() : '';
        ln.push({ year: yy5, gz: gz5, g: gz5.charAt(0), z: gz5.charAt(1) });
      }
    }
    let curYunGz = gzOfYun(n);
    /* 小运段(n=0): 流年只有起运前那几年 —— **有几年显示几年**, 不凑满十年;
       小运段也不施加神煞(与流月/流日同规)。 */
    if (n === 0) {
      /* 用**干支年** birthGZYear: 立春前出生时它比公历年小 1; 用公历年会让小运段少一年,
         且末格与第一步大运的年份标签重叠。 */
      let by = (data.bzFull && data.bzFull.birthGZYear) ||
               ((data.qr && data.qr.gongli ? parseInt(dec(data.qr.gongli).slice(0, 4), 10) : 0) || window.Y || 0);
      /* 年数含起运年本身: 如 1992 生、1993 起运 → 1992/1993 共 2 年(1~2 岁)。
         起运年优先取 baziChart 的交运年 —— computeBaZiDaYun 的 qiYunYear 会给出出生年,
         用它会把小运段算少一年。 */
      let qyY = (data.bzFull && data.bzFull.jiaoYun && data.bzFull.jiaoYun.year) || bz.qiYunYear || by;
      let cnt = Math.max(0, Math.min(10, qyY - by + 1));
      for (let c2 = 0; c2 < 10; c2++) {
        let e1 = document.getElementById('liunian1_' + c2);
        let e2 = document.getElementById('liunian2_' + c2);
        let e3 = document.getElementById('liunian3_' + c2);
        if (c2 >= cnt) {                       /* 超出实际年数的格子一律清空 */
          if (e1) { e1.innerHTML = ''; markSel(e1, false); e1.removeAttribute('data-ln-year'); e1.style.cursor = ''; }
          if (e2) { e2.innerHTML = ''; markSel(e2, false); e2.removeAttribute('data-ln-year'); e2.style.cursor = ''; }
          if (e3) e3.innerHTML = '';
          continue;
        }
        let yy = by + c2;
        let gz = (window.tyme && window.tyme.SixtyCycleYear)
          ? window.tyme.SixtyCycleYear.fromYear(yy).getSixtyCycle().getName() : '';
        /* 年份标签行与干支行**行为一致**: 两者都带 data-ln-year 且可点 */
        if (e1) {
          e1.innerHTML = yy + '<br>' + (c2 + 1) + '岁';
          e1.style.cursor = 'pointer';
          e1.setAttribute('data-ln-year', String(yy));
        }
        if (e2) {
          e2.innerHTML = ganSpan(gz.charAt(0)) + zhiSpan(gz.charAt(1));
          e2.style.cursor = 'pointer';
          e2.setAttribute('data-ln-year', String(yy));
          markSel(e1, false); markSel(e2, false);
        }
        /* 小运段的第三行**留空** —— 按需求不再显示小运干支(大运段那一行才是神煞)。 */
        if (e3) e3.innerHTML = '';
      }
      /* 自动选中流年: 当前年若落在小运段内则选它, 否则选**第一个**流年 */
      let nowYY = new Date().getFullYear(), pickLn = 0;
      for (let c3 = 0; c3 < cnt; c3++) { if (by + c3 === nowYY) { pickLn = c3; break; } }
      for (let c4 = 0; c4 < cnt; c4++) {
        markSel(document.getElementById('liunian1_' + c4), c4 === pickLn);
        markSel(document.getElementById('liunian2_' + c4), c4 === pickLn);
      }
      data.yunIdx = n;
      data.lnIdx = pickLn;
      /* 传 -1 走默认(出生年自出生月起); 传 0 会落到未显示的寅月 → 12 格无一高亮 */
      paintLiuyue(by + pickLn, -1);
      hideLiuri();
      return;
    }
    for (let c = 0; c < 10; c++) {
      /* ln 现在就是"该段的 10 个流年"(按段起始年生成), 故直接用 c 索引 */
    let y = ln[c];
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
    let selY = ln[lnIdx];
    let lyPick = 0;
    if (selY && selY.year === nowY) lyPick = (nowM2 >= 2) ? (nowM2 - 2) : (nowM2 + 10);
    /* 不得早于该流年的起始月(出生年自出生月起) */
    if (selY && selY.year === (window.Y || 0)) {
      let arrS = window.baziLiuYue ? window.baziLiuYue(selY.year) : [];
      let bdS = new Date(window.Y || 0, (window.M || 1) - 1, window.D || 1);
      for (let i3 = arrS.length - 1; i3 >= 0; i3--) {
        let stS = new Date(arrS[i3].solarY, arrS[i3].solarM - 1, arrS[i3].jieD);
        if (bdS >= stS) { if (lyPick < i3) lyPick = i3; break; }
      }
    }
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
    /* 该流年若是今年 → 只画到"当前所在的节气月"为止, **有几个月显示几个月**,
       未来的月份一律不显示(与流年"有几年显示几年"同一规则)。 */
    /* 起点: 第一个流年(即出生年)自**出生所在的节气月**起 —— 之前那些月份不能算,
       如 1992-12-06 生于亥月, 该年流月只有 亥/子/丑 三个月。 */
    let start = 0;
    /* ★ 判"这是出生那一年"必须用**出生干支年**: year 传进来的一律是干支年(与 mingliPickYear
       的小运段、mingliYun 的小运段同基准)。此前用 window.Y(出生**公历**年) —— 立春前出生时
       两者差 1, 于是出生那一年既不被识别(画满 12 格)、也不自出生月起算。
       ⚠️ 但**构造出生日期只能用公历年 window.Y**: 上面 arr 里的 solarY 是公历年,
       拿干支年当日期年份会把出生日期整体前移一年, 一个节气月都对不上 → start 恒为 0。
       birthGZYear 缺失时逐级兜底(公历年 → 0), 不抛错。 */
    let byY = (window._mlData && window._mlData.bzFull && window._mlData.bzFull.birthGZYear) || window.Y || 0;
    if (year === byY) {
      let bd = new Date(window.Y || 0, (window.M || 1) - 1, window.D || 1);
      for (let i = arr.length - 1; i >= 0; i--) {
        let st = new Date(arr[i].solarY, arr[i].solarM - 1, arr[i].jieD);
        if (bd >= st) { start = i; break; }
      }
    }
    /* 终点: 就是该年最后一个流月 —— **不按当前时间截尾**
       (第三方只在出生年自出生月起算, 其余年份一律完整 12 个月)。 */
    /* 未指定(或越界) → 选第一个**显示的**月; 出生年自出生月起, 传 0 会落空 */
    if (pick === undefined || pick === null || pick < 0) pick = start;
    if (window._mlData) window._mlData.lyIdx = pick;
    let cap = arr.length;
    /* 显示的月份**靠左排**: 有几个月就占最左边几格(如出生年只有 亥/子/丑 三个月,
       就填第 1~3 格), 不按它在一年中的原始位置留空档。 */
    let shown = [];
    for (let k = start; k < cap && k < arr.length; k++) shown.push({ m: arr[k], idx: k });
    for (let i = 0; i < 12; i++) {
      let e1 = document.getElementById('liuyue1_' + i);
      let e2 = document.getElementById('liuyue2_' + i);
      let it = shown[i];
      if (!it) {
        if (e1) { e1.innerHTML = ''; markSel(e1, false); e1.removeAttribute('data-ly-idx'); }
        if (e2) { e2.innerHTML = ''; markSel(e2, false); e2.removeAttribute('data-ly-idx'); }
        continue;
      }
      let m = it.m, ri = it.idx;          /* ri = 该月在一年中的真实序号(供点击回查) */
      if (e1) {
        e1.innerHTML = ganSpan(m.gan) + zhiSpan(m.zhi);
        e1.style.cursor = 'pointer';
        e1.setAttribute('data-ly-idx', String(ri));
        markSel(e1, ri === pick);
      }
      if (e2) {
        e2.innerHTML = '<font class="shishen">' + m.jie + '</font><br>' + m.jieM + '/' + m.jieD;
        e2.style.cursor = 'pointer';
        e2.setAttribute('data-ly-idx', String(ri));
        markSel(e2, ri === pick);          /* 节气格与干支格同步高亮, 视觉一致 */
      }
    }
    return arr;
  }

  /** 选中某流年(供委托调用): 重画流年高亮 + 流月, 并按默认规则选流月 */
  window.mingliPickYear = function (year) {
    let d = window._mlData;
    if (!d || !d.bz) return;
    /* ① 小运段的流年来自"起运前那些年", **不在** d.bz.liuNian 里 —— 必须单独识别:
          否则点它们毫无反应, 或(交运年与首步大运重叠时)被当成大运段的年份而跳段。 */
    let by0 = (d.bzFull && d.bzFull.birthGZYear) ||
              ((d.qr && d.qr.gongli ? parseInt(dec(d.qr.gongli).slice(0, 4), 10) : 0) || window.Y || 0);
    let qyY0 = (d.bzFull && d.bzFull.jiaoYun && d.bzFull.jiaoYun.year) || d.bz.qiYunYear || by0;
    let cnt0 = Math.max(0, Math.min(10, qyY0 - by0 + 1));
    if ((d.yunIdx || 0) === 0 && cnt0 > 0 && year >= by0 && year < by0 + cnt0) {
      let k = year - by0;
      for (let c = 0; c < cnt0; c++) {
        markSel(document.getElementById('liunian1_' + c), c === k);
        markSel(document.getElementById('liunian2_' + c), c === k);
      }
      d.lnIdx = k;
      paintLiuyue(year, -1);        /* 流月随该年, 默认选它第一个显示的月 */
      hideLiuri();
      return;
    }
    /* ② 大运段: 按"年份落在哪一步大运"直接定位 —— bz.liuNian 的起运年不可用
          (它自算错的年份起排), 故一律以 bzFull.dayun 的起始年为准。 */
    let dyArr2 = (d.bzFull && d.bzFull.dayun) ? d.bzFull.dayun : [];
    let seg = -1, segStart = 0;
    for (let i = 1; i < dyArr2.length; i++) {
      let sy = dyArr2[i].year || 0;
      if (sy && year >= sy && year < sy + 10) { seg = i; segStart = sy; break; }
    }
    if (seg < 0) return;
    let k2 = year - segStart;
    if (seg !== d.yunIdx) {
      window.mingliYun(seg, d);                 /* 换运(会重绘流年表) */
    }
    for (let c2 = 0; c2 < 10; c2++) {
      markSel(document.getElementById('liunian1_' + c2), c2 === k2);
      markSel(document.getElementById('liunian2_' + c2), c2 === k2);
    }
    d.lnIdx = k2;
    /* 流月默认: 当年是今年则选对应月, 否则由 paintLiuyue 选该年第一个显示的月 */
    let now = new Date(), nowY = now.getFullYear(), nowM = now.getMonth() + 1;
    let pick = -1;
    if (year === nowY) pick = (nowM >= 2) ? (nowM - 2) : (nowM + 10);
    paintLiuyue(year, pick);
    hideLiuri();
  };

  /** 点流月 → 高亮该月并显示该月流日 */
  window.mingliPickMonth = function (idx) {
    let d = window._mlData;
    if (!d || !d.bz) return;
    /* 当前选中的流年: 由**该段的起始年 + 段内序号**推算 ——
       不用 bz.liuNian(computeBaZiDaYun 的起运年算错, 会取到不相干的年份)。 */
    let cur = null;
    let dyAll = (d.bzFull && d.bzFull.dayun) ? d.bzFull.dayun : [];
    if ((d.yunIdx || 0) === 0) {
      /* ★ 与 mingliPickYear / mingliYun 的小运段**同基准**: 必须取**干支年** birthGZYear。
         此前取公历年 d.qr.gongli —— 立春前出生时它比干支年大 1, 于是小运段点出来的
         整年流月/流日全部错位一年(A3 2026-01-01: 点"干支年2025"却出 2026 年的流日)。 */
      let byM = (d.bzFull && d.bzFull.birthGZYear) ||
                ((d.qr && d.qr.gongli ? parseInt(dec(d.qr.gongli).slice(0, 4), 10) : 0) || window.Y || 0);
      cur = { year: byM + (d.lnIdx || 0) };
    } else {
      let segM = dyAll[d.yunIdx || 0];
      cur = (segM && segM.year) ? { year: segM.year + (d.lnIdx || 0) } : null;
    }
    if (!cur) return;
    let rb0 = document.getElementById('liuriBox');
    /* 再次点击同一个流月 → 折叠流日(流月高亮保留, 它表示"正在看的月份") */
    if (d.lyIdx === idx && rb0 && rb0.style.display !== 'none' && rb0.innerHTML) {
      hideLiuri();
      return;
    }
    let arr = window.baziLiuYue ? window.baziLiuYue(cur.year) : [];
    d.lyIdx = idx;
    /* 按格子里记录的**真实月份序号**高亮 —— 流月靠左排之后, 格子序号 ≠ 月份序号,
       若用 i === idx 会比错: 点第 1 格(亥月, 序号 9)却去高亮第 10 格。 */
    for (let i = 0; i < 12; i++) {
      let e1 = document.getElementById('liuyue1_' + i);
      let e2 = document.getElementById('liuyue2_' + i);
      let ri = e1 ? parseInt(e1.getAttribute('data-ly-idx'), 10) : NaN;
      markSel(e1, ri === idx);
      markSel(e2, ri === idx);   /* 节气格同步 */
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
    /* 整月显示, 不按当前时间截尾 */
    let show = arr;
    box.innerHTML = '<div class="ly-title">流日 · ' + gz + ' 月（共 ' + show.length + ' 天）</div>' +
      lyGrid(show, 7, function (d, i) {
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
    /* 十二时辰全显示, 不按当前时间截尾 */
    let showS = arr;
    box.innerHTML = '<div class="ly-title">流时 · ' + y + '-' + m + '-' + d + '</div>' +
      lyGrid(showS, 6, function (x) {
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
        /* 标签竖排(与大运/流年/流月的左侧标签一致) */
        /* 用 span 包裹每个字: 固定条是 flex 列向容器(且隐藏了 br), 相邻的**纯文本节点**会被
           合并成一个 flex item 而变回横排; 用元素才能保证逐字成行。 */
        let _zl = (data.gender === '女') ? '坤造' : '乾造';
        let zaoLabel = '<span>' + _zl.charAt(0) + '</span><br><span>' + _zl.charAt(1) + '</span>';
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

      /* 操作按钮(移星换斗/天门地户/长生状态) —— 按需求放在交运说明之上。
         class="ml-btns" 是给 _bindActionButtons 认盘的**唯一判据**: 命理盘与其它盘型的
         #btn1/#btn2/#btn3 同名同 id, 只靠 panType 判断会在"排过命理盘再切回时盘"
         时把命理盘的处理器错挂到时盘按钮上(实测踩过)。 */
      h += '<TABLE id="btnTable1" class="ml-btns"><TR>';
      h += '<TD><div class="btn" id="btn1" onclick="showYixing();mingliBtn(1,window._mlData);">移星换斗</div></TD>';
      h += '<TD><div class="btn" id="btn3" onclick="mingliBtn(3,window._mlData);">天门地户</div></TD>';
      h += '<TD><div class="btn" id="btn2" onclick="mingliState();mingliBtn(2,window._mlData);">长生状态</div></TD>';
      h += '</TR></TABLE>';

      /* 交运说明: 置于九宫下方 —— 即原来颜色说明所在的位置 */
      if (bzInfo && window.baziJiaoYunBlock) h += window.baziJiaoYunBlock(bzInfo);
      /* 操作提示: 流日默认不显示, 点流月才打开 */
      h += '<div class="ml-tip">点击对应流月/流日/流时可打开月份，流日，和流时细节功能</div>';

      /* ── ③ #dayun_liunian 大运 + 流年(两个独立 TABLE) ── */
      if (bz && bz.dayun && bz.dayun.length) {
        /* 大运干支一律取 baziChart 的 dayun(含第 0 个=月柱段); 年份自交运年起 */
        let dyArr = (data.bzFull && data.bzFull.dayun && data.bzFull.dayun.length)
          ? data.bzFull.dayun : bz.dayun;
        let n = Math.min(dyArr.length, 10);

        h += '<div id="dayun_liunian"><TABLE class="pan">';
        h += '<TR><TD class="yunTitle" rowspan="2">大<br>运</TD>';
        /* 第 1 格固定为「小运」段(起运前) —— 与第三方同构: 该格只标"小运"二字,
           值行给出起运前的岁数区间; 从第 2 格起才是各步大运。 */
        /* 小运段岁数区间 = 1 ~ N 岁, N = 起运年 − 出生年 + 1(与流年表年数同源);
           起运年取 baziChart 的交运年, 不用 computeBaZiDaYun 的 qiYunYear(会给出生年)。 */
        let qyYr0 = (data.bzFull && data.bzFull.jiaoYun && data.bzFull.jiaoYun.year) || bz.qiYunYear || 0;
        let byR0 = (data.bzFull && data.bzFull.birthGZYear) || window.Y || qyYr0;
        /* 与流年表年数同源, 并受同样的 10 格上限约束(否则标签写"1~11岁"而表只有 10 格) */
        let qyAge = Math.max(1, Math.min(10, qyYr0 - byR0 + 1));
        for (let d = 0; d < n; d++) {
          /* 首格(小运段)与大运格一样可点 —— 小运/大运来回切换, 选中态同款 */
          h += '<TD class="yun1" id="dayun_year' + d + '"' +
               (d === 0 ? ' onclick="mingliYun(0,window._mlData)" style="cursor:pointer;font-size:13px"' : '') + '>' +
               (d === 0 ? '小运' : (qyYr0 + (d - 1) * 10)) + '</TD>';
        }
        h += '</TR><TR>';
        for (let d2 = 0; d2 < n; d2++) {
          if (d2 === 0) {
            /* 横排金色标签(与顶部标签同款), 点它切回小运段 */
            h += '<TD class="yun2" id="dayun0" onclick="mingliYun(0,window._mlData)" style="cursor:pointer">' +
                 '1~' + qyAge + '<br>岁</TD>';
            continue;
          }
          let dy = dyArr[d2] || {};
          /* 十神只取**本气**那一个 —— baziChart 的 siShen 是各藏干十神简称的拼接(如伤官财),
             而第三方每位只显示一个主十神。简称均为单字, 故取首字。 */
          let ss = String(dy.siShen !== undefined ? dy.siShen : ((bz.dayunSS || [])[d2] || '')).charAt(0);
          let cur = (d2 === data.yunIdx);
          h += '<TD class="yun2" id="dayun' + d2 + '" onclick="mingliYun(' + d2 + ',window._mlData)"' +
               (cur ? ' style="font-weight:bold"' : '') + '>' +
               ganSpan(dy.gan || (dy.gz || ' ').charAt(0)) + '<br>' + zhiSpan(dy.zhi || (dy.gz || '  ').charAt(1)) + '<br><font class="shishen">' + ss + '</font></TD>';
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
    _stickyBuilt = false;     /* 每次渲染都重建四柱固定条(见 ensureStickyBar) */
    return h;
  };

  /** 四柱行吸附顶部: 在 CSS sticky 之外补一条 fixed 固定条(原理说明见 css 第 ⑦ 节)
   *
   *  为什么不能只靠 position:sticky: td 的包含块是 <tbody> 的内容盒(受控实验证实 ——
   *  只有 tbody 变高, 吸附失效的临界滚动量才跟着变大; 改 tr 高度 / table 的 padding
   *  都无效)。命理信息表只有 591px 高, 而命理盘文档约 1500px —— 四柱行滚过九宫格就
   *  脱开, 达不到"始终显示"。
   *  试过在 tbody 末尾插"撑高行"把包含块拉长: 能吸住, 但它改变了文档高度, 而 Chrome
   *  对 sticky 做惰性布局 —— 同一页面同一滚动量会量到 top=34(吸住)与 top=-1274(脱开)
   *  两种结果, 不稳定, 故放弃。
   *
   *  现在的做法: CSS 保留 sticky(近距离吸附由它负责, 无 JS 时行为也不退化), 另在滚动
   *  越过四柱行原位时显示一条 .sz-bar 固定条 —— 按四柱行**实测列宽**逐列复刻的 flex
   *  行(实测列宽与左边界误差均为 0.000px), 内容取四柱行原样的 innerHTML, top 与
   *  sticky 的 --topbar-h 同源, 故视觉上与四柱行完全一致。 */
  let _stickyBuilt = false, _sizhuTopDoc = 0, _colW = null, _bar = null, _barListeners = false;
  function ensureStickyBar() {
    if (_stickyBuilt) return;
    let tr = document.getElementById('sizhu');
    if (!tr) return;
    let tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    let wrap = document.getElementById('panWrap');
    if (!wrap) return;
    /* 列宽必须在四柱行"在原位"时量 —— 那时才与 #headTable 的列严格对齐 */
    let r = tr.getBoundingClientRect();
    _sizhuTopDoc = r.top + (window.pageYOffset || document.documentElement.scrollTop || 0);
    _colW = [];
    for (let i = 0; i < tds.length; i++) _colW.push(+tds[i].getBoundingClientRect().width.toFixed(3));
    /* doMingli 用 panWrap.innerHTML 整体重渲染, 旧固定条会随旧 DOM 一起被丢弃 ——
       此时必须重建, 否则切回命理盘后固定条永远不出现(实测踩过)。 */
    if (_bar && !wrap.contains(_bar)) _bar = null;
    if (!_bar) {
      _bar = document.createElement('div');
      _bar.className = 'sz-bar';
      for (let i = 0; i < tds.length; i++) {
        let d = document.createElement('div');
        d.className = 'sz-bar-cell';
        _bar.appendChild(d);
      }
      wrap.appendChild(_bar);
    }
    if (!_barListeners) {
      _barListeners = true;                  /* 监听器只注册一次, 内部走 _bar 变量 */
      window.addEventListener('scroll', syncStickyBar, { passive: true });
      window.addEventListener('resize', function () {
        _stickyBuilt = false;                /* 视口变了: 列宽要重测 */
        if (!_bar || !document.body.contains(_bar)) _bar = null;
        ensureStickyBar();
      });
    }
    _bar.style.width = r.width + 'px';
    /* 高度取**下限**而非定高: .sizhu-v 的字号是响应式的(桌面 30px/行高 34px, 竖排两行需 68px),
       若在此锁死测量瞬间的高度, 竖排内容会被截断(实测桌面下"丙/午"只露下半)。
       故用 min-height: 内容更高时自动撑开, 不高时与原行等高、接替不留错位。 */
    /* 逐格复制原 td 的 padding —— 它是响应式的, 写死会让固定条与原行不等高。 */
    {
      let _tds = document.querySelectorAll('#sizhu td');
      for (let _i = 0; _i < _bar.children.length; _i++) {
        let _c = _bar.children[_i], _t = _tds[_i];
        if (_c && _t) {
          let _cs = getComputedStyle(_t);
          _c.style.padding = _cs.paddingTop + ' ' + _cs.paddingRight + ' ' + _cs.paddingBottom + ' ' + _cs.paddingLeft;
        }
      }
    }
    _bar.style.height = 'auto';
    _bar.style.minHeight = r.height + 'px';
    for (let i = 0; i < tds.length; i++) {
      let cell = _bar.children[i];
      cell.style.flex = '0 0 ' + _colW[i] + 'px';
      cell.innerHTML = tds[i].innerHTML;
    }
    _stickyBuilt = true;
    syncStickyBar();
  }

  function syncStickyBar() {
    if (!_stickyBuilt || !_bar) return;
    let tr = document.getElementById('sizhu');
    if (!tr || !tr.querySelector('td')) return;
    let wrap = document.getElementById('panWrap');
    if (!wrap) return;
    let barH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 34;
    let y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (y >= _sizhuTopDoc - barH - 1) {
      /* 生效期间原行留在文档流里占位(不动它的布局), 视觉上由固定条替代 */
      tr.style.visibility = 'hidden';
      _bar.style.display = 'flex';
      _bar.style.left = wrap.getBoundingClientRect().left + 'px';
    } else {
      tr.style.visibility = '';
      _bar.style.display = 'none';
    }
  }
  window.mingliSyncStickyBar = syncStickyBar;

  /** 命理盘渲染后处理: 宫位正方形 + 左右行高同步 + 阴干对齐(照时盘/山向) */
  window.mingliFixLayout = function () {
    if (!_stickyBuilt) { try { ensureStickyBar(); } catch (e) { if (window._logErr) window._logErr('mingli.stickyBar', e && e.message); } }
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

  /** 移星换斗: 命理盘与时盘**共用同一套逻辑**
      —— 两者的九宫都由 yinpan_app.js 的 buildPaipanGrid 生成(同构),
         故直接用窗口的 showYixing, 不再另做占位实现。
      保留本函数名作为别名, 以防外部按旧名调用。 */
  window.showMingliYixing = function () {
    if (window.showYixing) window.showYixing();
  };
})();
