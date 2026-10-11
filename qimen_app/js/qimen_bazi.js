/* 八字排盘 —— 传统模式(四柱/十神/大运/流年)
 *
 * 用途: 八字的十神/藏干/纳音/地势/自坐/空亡/神煞/胎元·命宫·身宫/交运
 *       已并入命理主盘(见 qimen_mingli.js), 由 baziMainRows() 提供那几行;
 *       renderBazi() 保留完整传统盘版式(四柱+大运+流年)备用 —— 当前无调用方, 见其注释。
 * 计算: tyme4ts (window.tyme); 配色走主题变量, 暗色自动适配
 *
 * 各字段取法(全部由 tyme4ts 计算得出):
 *   四柱   ec.getYear/Month/Day/Hour()
 *   十神   日干.getTenStar(该柱天干) -> 简称
 *   藏干   EarthBranch.getHideHeavenStems() + 各自对日干的十神简称
 *   纳音   SixtyCycle.getSound()
 *   地势   日干.getTerrain(各柱地支)      <- 注意不是"天干对本柱"
 *   自坐   各柱天干.getTerrain(本柱地支)
 *   空亡   SixtyCycle.getExtraEarthBranches()
 *   胎元   ec.getFetalOrigin()
 *   命宫   ec.getOwnSign()                 <- tyme 的 ownSign 即命宫
 *   身宫   ec.getBodySign()
 *   大运   ChildLimit.fromSolarTime(时间, 1男/0女).getStartDecadeFortune()
 *   流年   DecadeFortune.getStartFortune()
 *
 * 注意: browser 构建里 tyme 的 next() 默认参数丢失, 必须显式传 1。
 */
(function () {
  'use strict';

  // 共享常量(见 qimen_constants.js): 显式挂接, 不依赖加载顺序
  let QM = window.QM || {};
  let GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
  let ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
  /* 天干/地支五行色: 由 QM.WX_OF 统一单字表派生(见 qimen_constants.js),
     这里不再自备一份, 免得与盘头/三传/命理出现同字不同色 */
  let WX_VAR = { mu: 'var(--wx-mu)', huo: 'var(--wx-huo)', tu: 'var(--wx-tu)',
                 jin: 'var(--wx-jin)', shui: 'var(--wx-shui)' };
  let wxColorOf = function (ch) {
    let of = (window.QM && QM.WX_OF) || {};
    return WX_VAR[of[ch]] || 'var(--c-text)';
  };
  let GAN_COLOR = GAN.map(wxColorOf);
  let ZHI_COLOR = ZHI.map(wxColorOf);
  let ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('');
  /* 十神全称 -> 单字简称 */
  let SHISHEN_ABBR = {
    '比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤', '偏财': '才',
    '正财': '财', '七杀': '杀', '正官': '官', '偏印': '枭', '正印': '印'
  };
  let YUE_NAME = ['正月', '二月', '三月', '四月', '五月', '六月',
                  '七月', '八月', '九月', '十月', '十一月', '十二月'];
  let WX_SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };  // 生
  let WX_KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };     // 克

  /* ── 人元司令（月令分野）────────────────────────────────────
     按月支给出"当令藏干"及其天数(自立节起算)，通行口径：
     如寅月立春后 戊7日 → 丙7日 → 甲16日。 */
  let RYSL = {
    '寅': [['戊', 7], ['丙', 7], ['甲', 16]],
    '卯': [['甲', 10], ['乙', 20]],
    '辰': [['乙', 9], ['癸', 3], ['戊', 18]],
    '巳': [['戊', 5], ['庚', 9], ['丙', 16]],
    '午': [['丙', 10], ['己', 9], ['丁', 11]],
    '未': [['丁', 9], ['乙', 3], ['己', 18]],
    '申': [['戊', 7], ['壬', 7], ['庚', 16]],
    '酉': [['庚', 10], ['辛', 20]],
    '戌': [['辛', 9], ['丁', 3], ['戊', 18]],
    '亥': [['戊', 7], ['甲', 7], ['壬', 16]],
    '子': [['壬', 10], ['癸', 20]],
    '丑': [['癸', 9], ['辛', 3], ['己', 18]]
  };
  /* 十二节在 SolarTerm.fromIndex 里的索引(实测 0=冬至, 3=立春, 每节 +2) */
  let JIE_IDX = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 1];

  /* 出生日距"最近一个不晚于它的十二节"的天数(当天记 1) */
  function jieDays(t, y, mo, d) {
    let bd = new Date(y, mo - 1, d), best = null;
    [y - 1, y, y + 1].forEach(function (yy) {
      for (let k = 0; k < 12; k++) {
        let term = t.SolarTerm.fromIndex(yy, JIE_IDX[k]);
        let st = term.getJulianDay().getSolarTime();
        let jd = new Date(st.getYear(), st.getMonth() - 1, st.getDay());
        if (jd <= bd && (!best || jd > best)) best = jd;
      }
    });
    return best ? Math.floor((bd - best) / 86400000) + 1 : 1;
  }
  /** 人元司令：返回当令的那个藏干(天干) */
  function siLingOf(t, y, mo, d, yueZhi) {
    let arr = RYSL[yueZhi];
    if (!arr) return '';
    let days = jieDays(t, y, mo, d), acc = 0;
    for (let i = 0; i < arr.length; i++) {
      acc += arr[i][1];
      if (days <= acc) return arr[i][0];
    }
    return arr[arr.length - 1][0];
  }

  /**
   * 小运：阳男阴女顺行、阴男阳女逆行；自**月柱**起，一年一位。
   * 传统上用于起运之前那些年(通常 1 岁到起运岁)。
   * @returns string[]  第 1 岁、第 2 岁… 的小运干支
   */
  window.baziXiaoYun = function (pillars, gender, cnt) {
    if (!pillars || pillars.length < 2) return [];
    let GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
    let yang = '甲丙戊庚壬'.indexOf(pillars[0].gan) >= 0;
    let fwd = (yang === (gender === '男'));
    /* 自**时柱**起(不是月柱) —— 依第三方数据实测: 该盘时柱甲子, 其 xiaoyun 首项即乙丑 */
    let g0 = GAN.indexOf(pillars[3].gan), z0 = ZHI.indexOf(pillars[3].zhi);
    let out = [];
    for (let i = 1; i <= (cnt || 10); i++) {
      let k = fwd ? i : -i;
      out.push(GAN[((g0 + k) % 10 + 10) % 10] + ZHI[((z0 + k) % 12 + 12) % 12]);
    }
    return out;
  };

  /* ── 神煞规则表（第三方验证口径）────────────────────────────────────
     位置码: 1年干 2月干 3日干 4时干 | 7年支 8月支 9日支 10时支
             13年柱 14月柱 15日柱 16时柱(=23~26) | 17年纳音 20月纳音 21日纳音 22时纳音
             5大运干 6流年干 11大运支 12流年支 19大运柱 (引擎支持, 盘面暂只用四柱)
     判定: 以 m 所指位置取值 → 查 d 表得目标 → 在 t 所指位置中查找（t 不含 m，避免自比）
     x: 性别限制 0不限 1仅男 2仅女 */
  let SS_RULES = [
    { n:'天乙贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'丑',乙:'子',丙:'亥',丁:'亥',戊:'丑',己:'子',庚:'丑',辛:'午',壬:'巳',癸:'巳'} },
    { n:'天乙贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'未',乙:'申',丙:'酉',丁:'酉',戊:'未',己:'申',庚:'未',辛:'寅',壬:'卯',癸:'卯'} },
    { n:'太极贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'子',乙:'子',丙:'卯',丁:'卯',戊:'辰',己:'辰',庚:'寅',辛:'寅',壬:'巳',癸:'巳'} },
    { n:'太极贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'午',乙:'午',丙:'酉',丁:'酉',戊:'丑',己:'丑',庚:'亥',辛:'亥',壬:'申',癸:'申'} },
    { n:'太极贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{戊:'戌',己:'戌'} },
    { n:'太极贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{戊:'未',己:'未'} },
    { n:'文昌', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'巳',乙:'午',丙:'申',丁:'酉',戊:'申',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯'} },
    { n:'国印', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'戌',乙:'亥',丙:'丑',丁:'寅',戊:'丑',己:'寅',庚:'辰',辛:'巳',壬:'未',癸:'申'} },
    { n:'金舆', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'辰',乙:'巳',丙:'未',丁:'申',戊:'未',己:'申',庚:'戌',辛:'亥',壬:'丑',癸:'寅'} },
    { n:'禄神', m:[3], t:[7,8,9,10,11,12], x:0, d:{甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'} },
    { n:'羊刃', m:[3], t:[7,8,9,10,11,12], x:0, d:{甲:'卯',乙:'寅',丙:'午',丁:'巳',戊:'午',己:'巳',庚:'酉',辛:'申',壬:'子',癸:'亥'} },
    { n:'飞刃', m:[3], t:[7,8,9,10,11,12], x:0, d:{甲:'酉',乙:'申',丙:'子',丁:'亥',戊:'子',己:'亥',庚:'卯',辛:'寅',壬:'午',癸:'巳'} },
    { n:'流霞', m:[3], t:[7,8,9,10,11,12], x:0, d:{甲:'酉',乙:'戌',丙:'未',丁:'申',戊:'巳',己:'午',庚:'辰',辛:'卯',壬:'亥',癸:'寅'} },
    { n:'红艳', m:[3], t:[7,8,9,10,11,12], x:0, d:{甲:'午',乙:'午',丙:'寅',丁:'未',戊:'辰',己:'辰',庚:'戌',辛:'酉',壬:'子',癸:'申'} },
    { n:'驿马', m:[7], t:[8,9,10,11,12], x:0, d:{子:'寅',丑:'亥',寅:'申',卯:'巳',辰:'寅',巳:'亥',午:'申',未:'巳',申:'寅',酉:'亥',戌:'申',亥:'巳'} },
    { n:'驿马', m:[9], t:[7,8,10,11,12], x:0, d:{子:'寅',丑:'亥',寅:'申',卯:'巳',辰:'寅',巳:'亥',午:'申',未:'巳',申:'寅',酉:'亥',戌:'申',亥:'巳'} },
    { n:'将星', m:[7], t:[8,9,10,11,12], x:0, d:{子:'子',丑:'酉',寅:'午',卯:'卯',辰:'子',巳:'酉',午:'午',未:'卯',申:'子',酉:'酉',戌:'午',亥:'卯'} },
    { n:'将星', m:[9], t:[7,8,10,11,12], x:0, d:{子:'子',丑:'酉',寅:'午',卯:'卯',辰:'子',巳:'酉',午:'午',未:'卯',申:'子',酉:'酉',戌:'午',亥:'卯'} },
    { n:'华盖', m:[7], t:[8,9,10,11,12], x:0, d:{子:'辰',丑:'丑',寅:'戌',卯:'未',辰:'辰',巳:'丑',午:'戌',未:'未',申:'辰',酉:'丑',戌:'戌',亥:'未'} },
    { n:'华盖', m:[9], t:[7,8,10,11,12], x:0, d:{子:'辰',丑:'丑',寅:'戌',卯:'未',辰:'辰',巳:'丑',午:'戌',未:'未',申:'辰',酉:'丑',戌:'戌',亥:'未'} },
    { n:'劫煞', m:[7], t:[8,9,10,11,12], x:0, d:{子:'巳',丑:'寅',寅:'亥',卯:'申',辰:'巳',巳:'寅',午:'亥',未:'申',申:'巳',酉:'寅',戌:'亥',亥:'申'} },
    { n:'劫煞', m:[9], t:[7,8,10,11,12], x:0, d:{子:'巳',丑:'寅',寅:'亥',卯:'申',辰:'巳',巳:'寅',午:'亥',未:'申',申:'巳',酉:'寅',戌:'亥',亥:'申'} },
    { n:'亡神', m:[7], t:[8,9,10,11,12], x:0, d:{子:'亥',丑:'申',寅:'巳',卯:'寅',辰:'亥',巳:'申',午:'巳',未:'寅',申:'亥',酉:'申',戌:'巳',亥:'寅'} },
    { n:'亡神', m:[9], t:[7,8,10,11,12], x:0, d:{子:'亥',丑:'申',寅:'巳',卯:'寅',辰:'亥',巳:'申',午:'巳',未:'寅',申:'亥',酉:'申',戌:'巳',亥:'寅'} },
    { n:'天罗地网', m:[7], t:[8,9,10,11,12], x:0, d:{辰:'巳',巳:'辰',戌:'亥',亥:'戌'} },
    { n:'天罗地网', m:[9], t:[7,8,10,11,12], x:0, d:{辰:'巳',巳:'辰',戌:'亥',亥:'戌'} },
    { n:'桃花', m:[7], t:[8,9,10,11,12], x:0, d:{子:'酉',丑:'午',寅:'卯',卯:'子',辰:'酉',巳:'午',午:'卯',未:'子',申:'酉',酉:'午',戌:'卯',亥:'子'} },
    { n:'桃花', m:[9], t:[7,8,10,11,12], x:0, d:{子:'酉',丑:'午',寅:'卯',卯:'子',辰:'酉',巳:'午',午:'卯',未:'子',申:'酉',酉:'午',戌:'卯',亥:'子'} },
    { n:'灾煞', m:[7], t:[8,9,10,11,12], x:0, d:{子:'午',丑:'卯',寅:'子',卯:'酉',辰:'午',巳:'卯',午:'子',未:'酉',申:'午',酉:'卯',戌:'子',亥:'酉'} },
    { n:'孤辰', m:[7], t:[8,9,10,11,12], x:0, d:{子:'寅',丑:'寅',寅:'巳',卯:'巳',辰:'巳',巳:'申',午:'申',未:'申',申:'亥',酉:'亥',戌:'亥',亥:'寅'} },
    { n:'寡宿', m:[7], t:[8,9,10,11,12], x:0, d:{子:'戌',丑:'戌',寅:'丑',卯:'丑',辰:'丑',巳:'辰',午:'辰',未:'辰',申:'未',酉:'未',戌:'未',亥:'戌'} },
    { n:'勾绞煞', m:[7], t:[8,9,10,11,12], x:0, d:{子:'卯',丑:'辰',寅:'巳',卯:'午',辰:'未',巳:'申',午:'酉',未:'戌',申:'亥',酉:'子',戌:'丑',亥:'寅'} },
    { n:'天喜', m:[7], t:[8,9,10,11,12], x:0, d:{子:'酉',丑:'申',寅:'未',卯:'午',辰:'巳',巳:'辰',午:'卯',未:'寅',申:'丑',酉:'子',戌:'亥',亥:'戌'} },
    { n:'红鸾', m:[7], t:[8,9,10,11,12], x:0, d:{子:'卯',丑:'寅',寅:'丑',卯:'子',辰:'亥',巳:'戌',午:'酉',未:'申',申:'未',酉:'午',戌:'巳',亥:'辰'} },
    { n:'元辰', m:[7], t:[8,9,10,11,12], x:1, d:{子:'未',丑:'申',寅:'酉',卯:'戌',辰:'亥',巳:'子',午:'丑',未:'寅',申:'卯',酉:'辰',戌:'巳',亥:'午'} },
    { n:'元辰', m:[7], t:[8,9,10,11,12], x:2, d:{子:'巳',丑:'午',寅:'未',卯:'申',辰:'酉',巳:'戌',午:'亥',未:'子',申:'丑',酉:'寅',戌:'卯',亥:'辰'} },
    { n:'披麻', m:[7], t:[8,9,10,11,12], x:0, d:{子:'酉',丑:'戌',寅:'亥',卯:'子',辰:'丑',巳:'寅',午:'卯',未:'辰',申:'巳',酉:'午',戌:'未',亥:'申'} },
    { n:'吊客', m:[7], t:[8,9,10,11,12], x:0, d:{子:'戌',丑:'亥',寅:'子',卯:'丑',辰:'寅',巳:'卯',午:'辰',未:'巳',申:'午',酉:'未',戌:'申',亥:'酉'} },
    { n:'丧门', m:[7], t:[8,9,10,11,12], x:0, d:{子:'寅',丑:'卯',寅:'辰',卯:'巳',辰:'午',巳:'未',午:'申',未:'酉',申:'戌',酉:'亥',戌:'子',亥:'丑'} },
    { n:'天德贵人', m:[8], t:[1,2,3,4,5], x:0, d:{丑:'庚',寅:'丁',辰:'壬',巳:'辛',未:'甲',申:'癸',戌:'丙',亥:'乙'} },
    { n:'月德贵人', m:[8], t:[1,2,3,4,5,6,7,8,9,10,11,12], x:0, d:{子:'壬',丑:'庚',寅:'丙',卯:'甲',辰:'壬',巳:'庚',午:'丙',未:'甲',申:'壬',酉:'庚',戌:'丙',亥:'甲'} },
    { n:'天德合', m:[8], t:[1,2,3,4,5], x:0, d:{丑:'乙',寅:'壬',辰:'丁',巳:'丙',未:'己',申:'戊',戌:'辛',亥:'庚'} },
    { n:'月德合', m:[8], t:[1,2,3,4,5], x:0, d:{子:'丁',丑:'乙',寅:'辛',卯:'己',辰:'丁',巳:'乙',午:'辛',未:'己',申:'丁',酉:'乙',戌:'辛',亥:'己'} },
    { n:'天医', m:[8], t:[7,8,9,10,11,12], x:0, d:{子:'亥',丑:'子',寅:'丑',卯:'寅',辰:'卯',巳:'辰',午:'巳',未:'午',申:'未',酉:'申',戌:'酉',亥:'戌'} },
    { n:'血刃', m:[8], t:[7,8,9,10,11,12], x:0, d:{子:'午',丑:'子',寅:'丑',卯:'未',辰:'寅',巳:'申',午:'卯',未:'酉',申:'辰',酉:'戌',戌:'巳',亥:'亥'} },
    { n:'金神', m:[25,26], t:[], x:0, d:{乙丑:'',癸酉:'',己巳:''} },
    { n:'十恶大败', m:[25], t:[], x:0, d:{壬申:'',庚辰:'',辛巳:'',丁亥:'',己丑:'',丙申:'',戊戌:'',甲辰:'',乙巳:'',癸亥:''} },
    { n:'十灵日', m:[25], t:[], x:0, d:{乙亥:'',癸未:'',庚寅:'',丁酉:'',壬寅:'',甲辰:'',庚戌:'',辛亥:'',丙辰:'',戊午:''} },
    { n:'阴差阳错', m:[25], t:[], x:0, d:{丙子:'',丁丑:'',戊寅:'',辛卯:'',壬辰:'',丙午:'',丁未:'',戊申:'',辛酉:'',壬戌:'',癸亥:'',癸巳:''} },
    { n:'九丑日', m:[25], t:[], x:0, d:{己卯:'',壬午:'',戊子:'',辛卯:'',丁酉:'',己酉:'',壬子:'',戊午:'',辛酉:''} },
    { n:'魁罡', m:[25], t:[], x:0, d:{庚辰:'',壬辰:'',戊戌:'',庚戌:''} },
    { n:'六秀日', m:[25], t:[], x:0, d:{戊子:'',己丑:'',丙午:'',丁未:'',戊午:'',己未:''} },
    { n:'八专日', m:[25], t:[], x:0, d:{戊戌:'',丁未:'',癸丑:'',甲寅:'',乙卯:'',己未:'',庚申:'',辛酉:''} },
    { n:'孤鸾煞', m:[25], t:[], x:0, d:{丁巳:'',乙巳:'',丙午:'',戊申:'',辛亥:'',壬子:'',甲寅:'',戊午:''} },
    { n:'学堂', m:[17], t:[8,9,10,11,12], x:0, d:{金:'巳',木:'亥',水:'申',土:'申',火:'寅'} },
    { n:'三奇贵人', m:[18], t:[], x:0, d:{甲戊庚:'',乙丙丁:'',壬癸辛:''} },
    { n:'天罗', m:[17], t:[9,11,12], x:0, d:{火:'戌、亥'} },
    { n:'地网', m:[17], t:[9,11,12], x:0, d:{水:'辰、巳',土:'辰、巳'} },
    { n:'天转日', m:[8], t:[15], x:0, d:{寅:'乙卯',卯:'乙卯',辰:'乙卯',巳:'丙午',午:'丙午',未:'丙午',申:'辛酉',酉:'辛酉',戌:'辛酉',亥:'壬子',子:'壬子',丑:'壬子'} },
    { n:'地转日', m:[8], t:[15], x:0, d:{寅:'辛卯',卯:'辛卯',辰:'辛卯',巳:'戊午',午:'戊午',未:'戊午',申:'癸酉',酉:'癸酉',戌:'癸酉',亥:'丙子',子:'丙子',丑:'丙子'} },
    { n:'词馆', m:[17], t:[8,9,10,11,12], x:0, d:{金:'申',木:'寅',水:'亥',土:'亥',火:'巳'} },
    { n:'童子', m:[8], t:[9,10], x:0, d:{子:'卯未辰',丑:'卯未辰',寅:'寅子',卯:'寅子',辰:'寅子',巳:'卯未辰',午:'卯未辰',未:'卯未辰',申:'寅子',酉:'寅子',戌:'寅子',亥:'卯未辰'} },
    { n:'童子', m:[17], t:[9,10], x:0, d:{金:'午、卯',木:'午、卯',水:'酉、戌',火:'酉、戌',土:'辰、巳'} },
    { n:'天赦日', m:[8], t:[15], x:0, d:{寅:'戊寅',卯:'戊寅',辰:'戊寅',巳:'甲午',午:'甲午',未:'甲午',申:'戊申',酉:'戊申',戌:'戊申',亥:'甲子',子:'甲子',丑:'甲子'} },
    { n:'四废日', m:[8], t:[15], x:0, d:{寅:'庚申',卯:'庚申',辰:'庚申',巳:'壬子',午:'壬子',未:'壬子',申:'甲寅',酉:'甲寅',戌:'甲寅',亥:'丙午',子:'丙午',丑:'丙午'} },
    { n:'四废日', m:[8], t:[15], x:0, d:{寅:'辛酉',卯:'辛酉',辰:'辛酉',巳:'癸亥',午:'癸亥',未:'癸亥',申:'乙卯',酉:'乙卯',戌:'乙卯',亥:'丁巳',子:'丁巳',丑:'丁巳'} },
    { n:'天厨贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'巳',乙:'午',丙:'巳',丁:'午',戊:'申',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯'} },
    { n:'福星贵人', m:[1,3], t:[7,8,9,10,11,12], x:0, d:{甲:'寅子',丙:'寅子',乙:'卯丑',癸:'卯丑',戊:'申',己:'未',丁:'亥',庚:'午',辛:'巳',壬:'辰'} },
    { n:'德秀贵人', m:[8], t:[1,2,3,4,5,6], x:0, d:{寅:'丙丁戊癸',午:'丙丁戊癸',戌:'丙丁戊癸',申:'壬癸戊己丙辛甲',子:'壬癸戊己丙辛甲',辰:'壬癸戊己丙辛甲',巳:'乙庚辛',酉:'乙庚辛',丑:'乙庚辛',亥:'甲乙丁壬',卯:'甲乙丁壬',未:'甲乙丁壬'} },
    { n:'拱禄', m:[16], t:[15], x:0, d:{癸丑:'癸亥',癸亥:'癸丑',丁未:'丁巳',己巳:'己未',戊午:'戊辰'} },
    { n:'正学堂', m:[17], t:[14,15,16,19], x:0, d:{金:'辛巳',木:'己亥',水:'甲申',土:'戊申',火:'丙寅'} },
    { n:'正词馆', m:[17], t:[14,15,16,19], x:0, d:{金:'壬申',木:'庚寅',水:'癸亥',土:'丁亥',火:'乙巳'} },
    { n:'天德贵人', m:[8], t:[7,8,9,10,11], x:0, d:{子:'巳',卯:'申',午:'亥',酉:'寅'} },
    { n:'天德合', m:[8], t:[7,8,9,10,11], x:0, d:{子:'申',卯:'巳',午:'寅',酉:'亥'} },
    /* 空亡：年柱旬空与日柱旬空分别判定（各拆两支两条规则），
       且不查自己那一柱 —— 第三方验证规则表即如此组织 */
    { n:'空亡', m:[13], t:[8,9,10,11,12], x:0, d:{甲子:'戌',乙丑:'戌',丙寅:'戌',丁卯:'戌',戊辰:'戌',己巳:'戌',庚午:'戌',辛未:'戌',壬申:'戌',癸酉:'戌',甲戌:'申',乙亥:'申',丙子:'申',丁丑:'申',戊寅:'申',己卯:'申',庚辰:'申',辛巳:'申',壬午:'申',癸未:'申',甲申:'午',乙酉:'午',丙戌:'午',丁亥:'午',戊子:'午',己丑:'午',庚寅:'午',辛卯:'午',壬辰:'午',癸巳:'午',甲午:'辰',乙未:'辰',丙申:'辰',丁酉:'辰',戊戌:'辰',己亥:'辰',庚子:'辰',辛丑:'辰',壬寅:'辰',癸卯:'辰',甲辰:'寅',乙巳:'寅',丙午:'寅',丁未:'寅',戊申:'寅',己酉:'寅',庚戌:'寅',辛亥:'寅',壬子:'寅',癸丑:'寅',甲寅:'子',乙卯:'子',丙辰:'子',丁巳:'子',戊午:'子',己未:'子',庚申:'子',辛酉:'子',壬戌:'子',癸亥:'子'} },
    { n:'空亡', m:[15], t:[7,8,10,11,12], x:0, d:{甲子:'戌',乙丑:'戌',丙寅:'戌',丁卯:'戌',戊辰:'戌',己巳:'戌',庚午:'戌',辛未:'戌',壬申:'戌',癸酉:'戌',甲戌:'申',乙亥:'申',丙子:'申',丁丑:'申',戊寅:'申',己卯:'申',庚辰:'申',辛巳:'申',壬午:'申',癸未:'申',甲申:'午',乙酉:'午',丙戌:'午',丁亥:'午',戊子:'午',己丑:'午',庚寅:'午',辛卯:'午',壬辰:'午',癸巳:'午',甲午:'辰',乙未:'辰',丙申:'辰',丁酉:'辰',戊戌:'辰',己亥:'辰',庚子:'辰',辛丑:'辰',壬寅:'辰',癸卯:'辰',甲辰:'寅',乙巳:'寅',丙午:'寅',丁未:'寅',戊申:'寅',己酉:'寅',庚戌:'寅',辛亥:'寅',壬子:'寅',癸丑:'寅',甲寅:'子',乙卯:'子',丙辰:'子',丁巳:'子',戊午:'子',己未:'子',庚申:'子',辛酉:'子',壬戌:'子',癸亥:'子'} },
    { n:'空亡', m:[13], t:[8,9,10,11,12], x:0, d:{甲子:'亥',乙丑:'亥',丙寅:'亥',丁卯:'亥',戊辰:'亥',己巳:'亥',庚午:'亥',辛未:'亥',壬申:'亥',癸酉:'亥',甲戌:'酉',乙亥:'酉',丙子:'酉',丁丑:'酉',戊寅:'酉',己卯:'酉',庚辰:'酉',辛巳:'酉',壬午:'酉',癸未:'酉',甲申:'未',乙酉:'未',丙戌:'未',丁亥:'未',戊子:'未',己丑:'未',庚寅:'未',辛卯:'未',壬辰:'未',癸巳:'未',甲午:'巳',乙未:'巳',丙申:'巳',丁酉:'巳',戊戌:'巳',己亥:'巳',庚子:'巳',辛丑:'巳',壬寅:'巳',癸卯:'巳',甲辰:'卯',乙巳:'卯',丙午:'卯',丁未:'卯',戊申:'卯',己酉:'卯',庚戌:'卯',辛亥:'卯',壬子:'卯',癸丑:'卯',甲寅:'丑',乙卯:'丑',丙辰:'丑',丁巳:'丑',戊午:'丑',己未:'丑',庚申:'丑',辛酉:'丑',壬戌:'丑',癸亥:'丑'} },
    { n:'空亡', m:[15], t:[7,8,10,11,12], x:0, d:{甲子:'亥',乙丑:'亥',丙寅:'亥',丁卯:'亥',戊辰:'亥',己巳:'亥',庚午:'亥',辛未:'亥',壬申:'亥',癸酉:'亥',甲戌:'酉',乙亥:'酉',丙子:'酉',丁丑:'酉',戊寅:'酉',己卯:'酉',庚辰:'酉',辛巳:'酉',壬午:'酉',癸未:'酉',甲申:'未',乙酉:'未',丙戌:'未',丁亥:'未',戊子:'未',己丑:'未',庚寅:'未',辛卯:'未',壬辰:'未',癸巳:'未',甲午:'巳',乙未:'巳',丙申:'巳',丁酉:'巳',戊戌:'巳',己亥:'巳',庚子:'巳',辛丑:'巳',壬寅:'巳',癸卯:'巳',甲辰:'卯',乙巳:'卯',丙午:'卯',丁未:'卯',戊申:'卯',己酉:'卯',庚戌:'卯',辛亥:'卯',壬子:'卯',癸丑:'卯',甲寅:'丑',乙卯:'丑',丙辰:'丑',丁巳:'丑',戊午:'丑',己未:'丑',庚申:'丑',辛酉:'丑',壬戌:'丑',癸亥:'丑'} },
  ];

  /* 输出顺序（第三方验证顺序表序，去掉空亡） */
  let SS_ORDER = [
    '天乙贵人', '太极贵人', '文昌', '天德贵人', '月德贵人',
    '三奇贵人', '空亡', '福星贵人', '德秀贵人', '天厨贵人', '国印',
    '天德合', '月德合', '天罗地网', '天罗', '地网',
    '十恶大败', '阴差阳错', '天赦日', '十灵日', '六秀日',
    '四废日', '孤鸾煞', '勾绞煞', '红艳', '童子',
    '华盖', '驿马', '禄神', '将星', '学堂',
    '正学堂', '词馆', '正词馆', '天医', '金舆',
    '桃花', '红鸾', '天喜', '金神', '拱禄',
    '天转日', '地转日', '丧门', '吊客', '披麻',
    '八专日', '九丑日', '元辰', '魁罡', '孤辰',
    '寡宿', '流霞', '亡神', '劫煞', '灾煞',
    '血刃', '飞刃', '羊刃',
    /* 以下 4 个为本项目特有、第三方验证规则表无对应条目，暂无判定规则（保留输出序位）*/
    '六厄', '大耗', '隔角', '五鬼',
  ];

  /* ── 神煞判定引擎（第三方验证口径）──────────────────────────────────
     规则：以 m 所指位置取值 → 查 d 表得目标 → 在 t 所指位置中查找；
     t 不含 m 自身（第三方验证 tags 即如此，避免"自己比自己"，例如将星子局在子，
     年支取的将星不会标回年柱）；t 为空的规则属"名单类"（魁罡/十恶大败/
     九丑日…）：main 值命中 d 的键即成立。 */
  function ssVal(code, C) {
    if (code >= 1 && code <= 4) return C.g[code - 1];
    if (code === 5) return C.g[4] || '';      // 大运干（仅传 extra 时存在）
    if (code === 6) return C.g[5] || '';      // 流年干
    if (code >= 7 && code <= 10) return C.z[code - 7];
    if (code === 11) return C.z[4] || '';     // 大运支
    if (code === 12) return C.z[5] || '';     // 流年支
    if (code >= 13 && code <= 16) return C.gz[code - 13];
    if (code === 19) return C.gz[4] || '';    // 大运柱
    if (code >= 23 && code <= 26) return C.gz[code - 23];
    if (code === 17 || code === 20 || code === 21 || code === 22) {
      /* 纳音类规则(学堂/词馆/天罗/地网/童子煞/正学堂/正词馆)的 data 键是五行，
         故取纳音末字(如"沙中金"→金)去查表 */
      let k = code === 17 ? 0 : code === 20 ? 1 : code === 21 ? 2 : 3;
      let ny = C.ny[k];
      return ny ? ny.slice(-1) : '';
    }
    if (code === 18) return C.g.slice(0, 4).join('');  // 天干(跨柱)：三奇贵人，只取四柱干
    return '';
  }
  function ssPillar(code) {
    if (code >= 1 && code <= 4) return code - 1;
    if (code >= 7 && code <= 10) return code - 7;
    if (code >= 13 && code <= 16) return code - 13;
    if (code >= 23 && code <= 26) return code - 23;
    if (code === 17) return 0;
    if (code === 20) return 1;
    if (code === 21) return 2;
    if (code === 22) return 3;
    /* 运/年槽位：4 = 大运、5 = 流年（仅在传入 extra 时有效） */
    if (code === 5 || code === 11 || code === 19) return 4;
    if (code === 6 || code === 12) return 5;
    return -1;
  }
  function shenShaOf(pillars, gender, extra) {
    let C = {
      g: pillars.map(function (p) { return p.gan; }),
      z: pillars.map(function (p) { return p.zhi; }),
      gz: pillars.map(function (p) { return p.gz; }),
      ny: pillars.map(function (p) { return p.naYin; })
    };
    /* extra: { yunGz:'甲子', lnGz:'乙丑' } —— 把神煞算到大运/流年上。
       第三方验证规则表的位置码本就含 大运干(5)/流年干(6)/大运支(11)/流年支(12)/
       大运柱(19)，此前只是"盘面暂只用四柱"，这里把槽位补上即可。 */
    if (extra) {
      let yg = String(extra.yunGz || ''), lg = String(extra.lnGz || '');
      C.g = C.g.concat([yg.charAt(0), lg.charAt(0)]);
      C.z = C.z.concat([yg.charAt(1), lg.charAt(1)]);
      C.gz = C.gz.concat([yg]);
    }
    let top = extra ? 5 : 3;
    let out = [[], [], [], [], [], []], seen = [{}, {}, {}, {}, {}, {}];
    function mark(pi, n) {
      if (pi < 0 || pi > top || seen[pi][n]) return;
      seen[pi][n] = 1;
      out[pi].push(n);
    }
    /* x 字段的语义是"用哪张表"，不是直接等于性别：第三方验证规则里
       x=1 对应「阳男·阴女」、x=2 对应「阴男·阳女」，以**年干阴阳**判定。
       例（已对第三方服务端实测吻合）：元辰在辛丑(阴)年 —— 男命取 x=2 那张表
       (丑→午)，女命取 x=1 那张表(丑→申)。 */
    let tableNo = (('甲丙戊庚壬'.indexOf(C.g[0]) >= 0) === (gender === '男')) ? 1 : 2;
    SS_RULES.forEach(function (r) {
      if (r.x && r.x !== tableNo) return;
      r.m.forEach(function (mc) {
        let key = ssVal(mc, C);
        if (!key) return;
        /* 取值命中查表：常规与名单类是"键 == 值"；跨柱天干串(mc=18，如三奇贵人)
           的键只有 3 个字，而值是四柱天干的 4 字串，故改为**子串匹配**。 */
        let hit = (key in r.d) ? key : '';
        if (!hit && mc === 18) {
          for (let k in r.d) if (key.indexOf(k) >= 0) { hit = k; break; }
        }
        if (!hit) return;
        if (!r.t.length) {
          /* 名单类：键即答案。三奇贵人标在**末柱**——第三方验证实测：
             壬癸辛出现在年/月/日干时，三奇贵人标在日柱而非年柱。 */
          if (mc === 18) mark(key.indexOf(hit) + hit.length - 1, r.n);
          else mark(ssPillar(mc), r.n);
          return;
        }
        let target = r.d[hit];
        if (!target) return;
        r.t.forEach(function (tc) {
          if (tc === mc) return;                 // 避免自比（第三方验证 tags 不含 main）
          let val = ssVal(tc, C);
          if (val && target.indexOf(val) >= 0) mark(ssPillar(tc), r.n);
        });
      });
    });
    /* 同柱互斥：正学堂命中时抑制学堂、正词馆命中时抑制词馆。
       依据第三方服务端实测：年纳音金 → 学堂巳、正学堂辛巳；当月柱为辛巳时
       服务端只报「正学堂」不报「学堂」（干支全匹配的更高层次覆盖仅地支匹配的那条）。 */
    out.forEach(function (arr) {
      [['正学堂', '学堂'], ['正词馆', '词馆']].forEach(function (pair) {
        let i = arr.indexOf(pair[1]);
        if (i >= 0 && arr.indexOf(pair[0]) >= 0) arr.splice(i, 1);
      });
    });
    return out.map(function (arr) {
      return SS_ORDER.filter(function (n) { return arr.indexOf(n) >= 0; });
    });
  }

  /**
   * 供命理盘调用：算「某一步大运」与「某个流年」落在本命局上的神煞。
   * 四柱之外的位置（大运干支、流年干支）由 extra 槽位提供，
   * 规则表里的 大运干/支、流年干/支 条目因此得以生效。
   * @param pillars 四柱数组(baziChart 的 bz.pillars，需含 gan/zhi/gz/naYin)
   * @param gender  '男'|'女'
   * @param yunGz   大运干支，如 '甲子'（可空）
   * @param lnGz    流年干支，如 '乙丑'（可空）
   * @returns {{yun:string[], ln:string[]}}
   */
  window.baziYunShenSha = function (pillars, gender, yunGz, lnGz) {
    if (!pillars || !pillars.length) return { yun: [], ln: [] };
    let all = shenShaOf(pillars, gender, { yunGz: yunGz, lnGz: lnGz });
    return { yun: all[4] || [], ln: all[5] || [] };
  };

  /* ── 流月 / 流日 / 流时 ────────────────────────────────────────────
     口径对齐第三方验证（均在其前端本地计算）：
       · 流月：一年 12 个月，正月建寅（对应公历 2 月）；月干按五虎遁 ——
         即 tyme 直接给出的月柱，无需自算。
       · 流日：本"节"到下一"节"之间的日子，且**只保留月柱与该流月干支一致者**
         （节气在月中的那几天仍属上一月，第三方即以此过滤）。
       · 流时：五鼠遁 —— 即 tyme 直接给出的时柱。
     按需求：流月/流日**不施加神煞**。 */
  function jieOfMonth(t, year, month) {
    /* 公历 month 月所属的"节"：2月=立春(SolarTerm 索引 3)，每进一月 +2；
       索引 25 折回 1(小寒) 且仍在同一年 —— 实测 fromIndex(y,1)=小寒 y-01-05。 */
    let idx = 3 + 2 * ((month - 2 + 12) % 12);
    if (idx > 23) idx -= 24;
    let term = t.SolarTerm.fromIndex(year, idx);
    let st = term.getJulianDay().getSolarTime();
    return { y: st.getYear(), m: st.getMonth(), d: st.getDay(), name: term.getName() };
  }

  /** 流月：returns [{gan,zhi,gz,jie,jieY,jieM,jieD,solarY,solarM}] 自正月(寅)起 */
  window.baziLiuYue = function (year) {
    let t = window.tyme;
    if (!t) return [];
    let out = [];
    for (let i = 0; i < 12; i++) {
      let mm = i + 2, yy = year;
      if (mm > 12) { mm -= 12; yy = year + 1; }        // 丑月落在次年 1 月
      /* 注意年号用 yy 而非 year: 丑月的小寒落在**次年 1 月**,
         用 year 会取到上一年的小寒, 日期差一天。 */
      let jie = jieOfMonth(t, yy, mm);
      let st = t.SolarTime.fromYmdHms(yy, mm, 15, 12, 0, 0);   // 月中取月柱，避开交节当日
      let mGz = st.getLunarHour().getEightChar().getMonth();
      out.push({
        gan: mGz.getHeavenStem().getName(), zhi: mGz.getEarthBranch().getName(), gz: mGz.getName(),
        jie: jie.name, jieY: jie.y, jieM: jie.m, jieD: jie.d,
        solarY: yy, solarM: mm
      });
    }
    return out;
  };

  /** 流日：某节气月内的日子（月柱须与 monthGz 相同）。month 为公历月，monthGz 为该流月干支 */
  window.baziLiuRi = function (year, month, monthGz) {
    let t = window.tyme;
    if (!t) return [];
    let a = jieOfMonth(t, year, month);
    let ny = month === 12 ? year + 1 : year, nm = month === 12 ? 1 : month + 1;
    let b = jieOfMonth(t, ny, nm);
    let cur = new Date(a.y, a.m - 1, a.d);
    let end = new Date(b.y, b.m - 1, b.d);
    let out = [];
    while (cur < end) {
      let yy = cur.getFullYear(), mm = cur.getMonth() + 1, dd = cur.getDate();
      let st = t.SolarTime.fromYmdHms(yy, mm, dd, 12, 0, 0);
      let ec = st.getLunarHour().getEightChar();
      if (!monthGz || ec.getMonth().getName() === monthGz) {
        let dGz = ec.getDay();
        out.push({
          gan: dGz.getHeavenStem().getName(), zhi: dGz.getEarthBranch().getName(), gz: dGz.getName(),
          y: yy, m: mm, d: dd
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  };

  /** 流时：该日 12 时辰（子时以 0 时为代表） */
  window.baziLiuShi = function (year, month, day) {
    let t = window.tyme;
    if (!t) return [];
    let out = [];
    for (let i = 0; i < 12; i++) {
      let hh = (i * 2) % 24;
      let st = t.SolarTime.fromYmdHms(year, month, day, hh, 0, 0);
      let hGz = st.getLunarHour().getEightChar().getHour();
      out.push({
        gan: hGz.getHeavenStem().getName(), zhi: hGz.getEarthBranch().getName(), gz: hGz.getName(),
        hour: hh
      });
    }
    return out;
  };

  /* 十神简称 → 全名：盘面显示用简称（印/劫/杀），点释义要用全名做键 */
  function tenFull(short) {
    if (!short) return short;
    if (SHISHEN_ABBR[short] !== undefined) return short;          // 本身已是全名
    for (let full in SHISHEN_ABBR) { if (SHISHEN_ABBR[full] === short) return full; }
    return short;
  }

  /* 纳音用字统一: tyme 作"霹雳火/砂中金", 本盘按通行写法作"霹雷火/沙中金" */
  let NAYIN_FIX = { '霹雳火': '霹雷火', '砂中金': '沙中金', '砂中土': '沙中土', '砂石金': '沙石金' };
  function naYin(sound) {
    let n = sound ? sound.getName() : '';
    return NAYIN_FIX[n] || n;
  }

  /* ══════════════ 排盘 ══════════════ */
  function baziChart(o) {
    let t = window.tyme;
    if (!t) throw new Error('tyme4ts 未加载');
    let y = o.year, mo = o.month, d = o.day, h = o.hour, mi = o.minute || 0;
    let st = t.SolarTime.fromYmdHms(y, mo, d, h, mi, 0);
    let lh = st.getLunarHour();
    /* 早晚子时: 默认晚子时日柱算次日; 开启后算当天(晚子时算当天)。
       tyme 的 LunarHour.getEightChar() 不接受参数, 只能临时改静态 provider, 用完还原。 */
    let ec;
    /* ⚠ 备用；当前无入口(全项目无调用): 没有任何调用方传 o.zaoWanZi, 故本分支恒不走。
       两口径确有差异(**不是等价写法**): tyme 默认(DefaultEightCharProvider)晚子时日柱算**次日**;
       走本分支(LunarSect2)才算**当天** —— 实测 5 例 23 点生辰日柱差一位, 早子时两口径相同。
       若要启用「晚子时算当天」, 需补 UI 入口把此参数传进来。勿误以为在用、勿误删。 */
    if (o.zaoWanZi) {
      let oldProvider = t.LunarHour.provider;
      t.LunarHour.provider = new t.LunarSect2EightCharProvider();
      try { ec = lh.getEightChar(); } finally { t.LunarHour.provider = oldProvider; }
    } else {
      ec = lh.getEightChar();
    }
    let SC = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getHour()];
    let dayGan = SC[2].getHeavenStem();
    let gender = o.gender === '女' ? '女' : '男';

    function abbr(star) { return SHISHEN_ABBR[star] || star; }
    function tenOf(stem) { return abbr(dayGan.getTenStar(stem).getName()); }

    /* 四柱 */
    let pillars = SC.map(function (p) {
      let g = p.getHeavenStem(), z = p.getEarthBranch();
      return {
        gz: p.getName(), gan: g.getName(), zhi: z.getName(),
        ganColor: GAN_COLOR[g.getIndex()], zhiColor: ZHI_COLOR[z.getIndex()],
        shiShen: (p === SC[2]) ? '日元' : tenOf(g),
        cang: z.getHideHeavenStems().map(function (hs) {
          return { gan: hs.getHeavenStem().getName(), shen: tenOf(hs.getHeavenStem()) };
        }),
        naYin: naYin(p.getSound()),
        diShi: dayGan.getTerrain(z).getName(),              // 地势: 日干 vs 该柱地支
        ziZuo: g.getTerrain(z).getName(),                   // 自坐: 本柱天干 vs 本柱地支
        kong: p.getExtraEarthBranches().map(function (x) { return x.getName(); }).join(''),
        sha: []
      };
    });

    /* ── 神煞（第三方验证口径：以规则表 SS_RULES 统一判定，见上方引擎）── */
    let ssAll = shenShaOf(pillars, gender);
    pillars.forEach(function (p, i) { p.sha = ssAll[i]; });

    /* ── 旺相休囚死: 按"当月五行"推出 旺/相/休/囚/死 顺序的五行名 ── */
    let yueWx = SC[1].getEarthBranch().getElement().getName();
    let wangXiang = [yueWx, WX_SHENG[yueWx], shengWo(yueWx), keWo(yueWx), WX_KE[yueWx]];
    function shengWo(w) { for (let k in WX_SHENG) if (WX_SHENG[k] === w) return k; return ''; }
    function keWo(w) { for (let k in WX_KE) if (WX_KE[k] === w) return k; return ''; }

    /* ── 童限 / 大运 / 流年 ── */
    let cl = t.ChildLimit.fromSolarTime(st, gender === '男' ? 1 : 0);
    /* 出生所属干支年(立春为界): 童限给的是公历年, 需按年柱校正 */
    let birthGZYear = y;
    if (t.SixtyCycleYear.fromYear(y).getSixtyCycle().getName() !== SC[0].getName()) birthGZYear = y - 1;
    let startYear = cl.getEndSixtyCycleYear().getYear();       // 交运年
    let jiaoYun = {
      y: cl.getYearCount(), m: cl.getMonthCount(), d: cl.getDayCount(),
      year: startYear,
      gan: cl.getEndSixtyCycleYear().getSixtyCycle().getHeavenStem().getName(),
      month: cl.getEndTime().getMonth(), day: cl.getEndTime().getDay()
    };
    /* 第一柱固定为月柱(出生年 ~ 交运前一年), 之后是 tyme 的九步大运 */
    let dayun = [{ gz: pillars[1].gz, gan: pillars[1].gan, zhi: pillars[1].zhi,
                   year: birthGZYear, siShen: pillars[1].cang.map(function (c) { return c.shen; }).join('') }];
    /* 交运时刻所属干支年(tyme 给的是公历年, 立春前的要减 1) */
    let jyTime = cl.getEndTime();
    function gzYearAt(year) {
      try {
        let tt = t.SolarTime.fromYmdHms(year, jyTime.getMonth(), jyTime.getDay(), 12, 0, 0);
        return tt.getLunarHour().getEightChar().getYear().getName() ===
               t.SixtyCycleYear.fromYear(year).getSixtyCycle().getName() ? year : year - 1;
      } catch (e) {
        if (window._logErr) window._logErr('gzYearAt', e && e.message);
        return year;
      }
    }
    let df = cl.getStartDecadeFortune();
    for (let i = 0; i < 9; i++) {
      let g2 = df.getSixtyCycle().getHeavenStem(), z2 = df.getSixtyCycle().getEarthBranch();
      dayun.push({
        gz: df.getSixtyCycle().getName(), gan: g2.getName(), zhi: z2.getName(),
        year: gzYearAt(jyTime.getYear() + i * 10),
        siShen: z2.getHideHeavenStems().map(function (hs) { return tenOf(hs.getHeavenStem()); }).join('')
      });
      df = df.next(1);
    }
    /* 每步大运覆盖的流年干支: 按干支年逐年查表(Fortune.getSixtyCycle 不可靠) */
    for (let k = 0; k < 9; k++) {
      let list = [];
      for (let j = 0; j < 10; j++) {
        let yr = dayun[k + 1].year + j;
        if (yr < startYear) list.push(t.SixtyCycleYear.fromYear(yr).getSixtyCycle().getName());
      }
      dayun[k + 1].liunian = list;
    }
    dayun[0].liunian = [];
    for (let yy = birthGZYear; yy < startYear; yy++) {
      dayun[0].liunian.push(t.SixtyCycleYear.fromYear(yy).getSixtyCycle().getName());
    }

    /* 当前大运下标(按本年) */
    let nowY = new Date().getFullYear(), curYun = 0;
    for (let q = 0; q < dayun.length; q++) if (dayun[q].year <= nowY) curYun = q;

    /* 当前大运的十个流年: 直接以该运的干支年起算十年 */
    let curFortune = [];
    for (let e = 0; e < 10; e++) {
      let y2 = dayun[curYun].year + e;
      curFortune.push({ year: y2, gz: t.SixtyCycleYear.fromYear(y2).getSixtyCycle().getName(),
                        age: y2 - birthGZYear + 1 });
    }
    /* 流年十神 */
    curFortune.forEach(function (f2) {
      let sc2 = t.SixtyCycle.fromName(f2.gz);
      let g3 = sc2.getHeavenStem(), z3 = sc2.getEarthBranch();
      f2.gan = g3.getName(); f2.zhi = z3.getName();
      f2.ganColor = GAN_COLOR[g3.getIndex()]; f2.zhiColor = ZHI_COLOR[z3.getIndex()];
      f2.siShen = z3.getHideHeavenStems().map(function (hs) { return tenOf(hs.getHeavenStem()); }).join('');
    });

    /* 节气文本: 出生时刻在相邻两节气之间的位置, 形如「大雪后3天16小时，冬至前11天2小时」 */
    let term = st.getTerm(), nextTerm = term.next(1);
    function fmtSpan(days) {
      let h = Math.round(days * 24);
      return Math.floor(h / 24) + '天' + (h % 24) + '小时';
    }
    let jieQi = term.getName() + '后' + fmtSpan(st.getJulianDay() - term.getJulianDay()) +
                '，' + nextTerm.getName() + '前' + fmtSpan(nextTerm.getJulianDay() - st.getJulianDay());

    let lunarMonth = lh.getMonth();
    return {
      name: o.name || '', gender: gender,
      zodiac: ZODIAC[SC[0].getEarthBranch().getIndex()],
      solar: { y: y, month: mo, day: d, hour: h, minute: mi },
      dateText: y + '年' + mo + '月' + d + '日 ' + hourText(h) + '时' + mi + '分' +
                '(' + (lunarMonth < 0 ? '闰' : '') + YUE_NAME[Math.abs(lunarMonth) - 1] +
                lh.getLunarDay().getName() + ')',
      jieQi: jieQi,
      pillars: pillars,
      zao: gender === '男' ? '乾造' : '坤造',
      taiYuan: ec.getFetalOrigin().getName(), taiYuanNaYin: naYin(ec.getFetalOrigin().getSound()),
      mingGong: ec.getOwnSign().getName(), mingGongNaYin: naYin(ec.getOwnSign().getSound()),
      shenGong: ec.getBodySign().getName(), shenGongNaYin: naYin(ec.getBodySign().getSound()),
      wangXiang: wangXiang.join(''),
      /* 人元司令: 月支中当令的藏干(按出生日距本月节气的天数分野) */
      siLing: siLingOf(t, y, mo, d, SC[1].getEarthBranch().getName()),
      birthGZYear: birthGZYear,
      jiaoYun: jiaoYun,
      dayun: dayun, curYun: curYun, curFortune: curFortune
    };
  }

  function hourText(h) { return ZHI[Math.floor(((h + 1) % 24) / 2)]; }

  /* 十神/藏干/纳音/地势/自坐/空亡/神煞/胎元命宫身宫/旺相/交运 —— 命理主盘与本模块共用 */
  function baziMainRows(bz, withGz, rowCls, tipHtml, skipJy, sizhuRowHtml) {
    let h = '';
    let rc = rowCls ? ' class="' + rowCls + '"' : '';
    /* 十神 */
    h += '<TR' + rc + ' style="height:25px"><TD style="color:var(--c-gold);line-height:25px">十神</TD>';
    bz.pillars.forEach(function (p) {
      /* "日元"不是十神，不参与点击释义；显示仍用盘面惯例的简称(label) */
      let t = (window.termSpan && p.shiShen && p.shiShen !== '日元')
        ? window.termSpan('十神', tenFull(p.shiShen), '', p.shiShen) : p.shiShen;
      h += '<TD class="shiShen">' + t + '</TD>';
    });
    h += '</TR>';
    /* 命理盘的四柱行插在「十神」之下(四柱在十神之下、藏干之上), HTML 由调用方给,
       这样各盘可各自决定标签与样式(命理盘用 乾造/坤造 + .sizhu 响应式字号)。 */
    if (sizhuRowHtml) h += sizhuRowHtml;
    /* 干支(命理主盘已自带四柱, 那边传 withGz=false 跳过) */
    if (withGz) {
      h += '<TR><TD style="color:var(--c-gold)">' + bz.zao + '</TD>';
      bz.pillars.forEach(function (p) {
        h += '<TD class="sizhuTd"><font style="color:' + p.ganColor + '">' + p.gan + '</font><br>' +
             '<font style="color:' + p.zhiColor + '">' + p.zhi + '</font></TD>';
      });
      h += '</TR>';
    }
    /* 藏干 */
    h += '<TR' + rc + '><TD style="color:var(--c-gold)">藏干</TD>';
    bz.pillars.forEach(function (p) {
      h += '<TD class="cangGanTd">';
      p.cang.forEach(function (c, i) {
        h += '<font style="color:' + GAN_COLOR[GAN.indexOf(c.gan)] + '">' + c.gan + '</font>' +
             (i === p.cang.length - 1 ? '<br>' : '');
      });
      h += '<font class="ganShen">' + p.cang.map(function (c) {
        /* 同上：键用全名、显示用简称，藏干行的字距是按简称排的 */
        return window.termSpan ? window.termSpan('十神', tenFull(c.shen), '', c.shen) : c.shen;
      }).join('') + '</font></TD>';
    });
    h += '</TR>';
    /* 纳音 / 地势 / 自坐 / 空亡 */
    /* 纳音 → 纳音释义；地势/自坐 → 十二长生释义；空亡是"戌亥"这类组合，不做点击 */
    [['纳音', 'naYin', '纳音'], ['地势', 'diShi', '长生'], ['自坐', 'ziZuo', '长生'], ['空亡', 'kong', '']]
      .forEach(function (row) {
        h += '<TR' + rc + '><TD style="color:var(--c-gold)">' + row[0] + '</TD>';
        bz.pillars.forEach(function (p) {
          let v = p[row[1]];
          h += '<TD>' + ((row[2] && window.termSpan) ? window.termSpan(row[2], v) : v) + '</TD>';
        });
        h += '</TR>';
      });
    /* 神煞 */
    h += '<TR' + rc + '><TD style="color:var(--c-gold);line-height:15px">神煞<br></TD>';
    bz.pillars.forEach(function (p) {
      h += '<TD class="shenShaTd"><div class="ssDiv shensha">';
      /* 名词可点击弹出释义；qimen_click_tips.js 未加载时退回纯文本 */
      p.sha.forEach(function (s) {
        h += (window.termSpan ? window.termSpan('神煞', s) : '<span>' + s + '</span>') + '<br>';
      });
      h += '</div></TD>';
    });
    h += '</TR>';
    /* 胎元 命宫 身宫 旺相休囚死 司令(人元司令) */
    h += '<TR' + rc + '><TD style="color:var(--c-gold)">胎元</TD><TD style="color:var(--c-gold)">命宫</TD>' +
         '<TD style="color:var(--c-gold)">身宫</TD><TD style="color:var(--c-gold)">旺相休囚死</TD>' +
         '<TD style="color:var(--c-gold)">司令</TD></TR>';
    h += '<TR' + rc + '><TD class="gong">' + bz.taiYuan + '<br><font>' + bz.taiYuanNaYin + '</font></TD>' +
         '<TD class="gong">' + bz.mingGong + '<br><font>' + bz.mingGongNaYin + '</font></TD>' +
         '<TD class="gong">' + bz.shenGong + '<br><font>' + bz.shenGongNaYin + '</font></TD>' +
         '<TD>' + bz.wangXiang + '</TD>' +
         '<TD>' + (bz.siLing || '') + '</TD></TR>';
    /* 颜色说明(命理主盘把它插在交运之前, 八字盘不传则无此行) */
    if (tipHtml) h += '<TR' + rc + '><TD colspan="5" class="bz-tip">' + tipHtml + '</TD></TR>';
    /* 交运: 命理主盘把它移到九宫下方(skipJy=true), 八字盘留在主盘内 */
    if (!skipJy) h += baziJiaoYunRow(bz, rc);
    h += '</TABLE>';
    return h;
  }

  /** 交运说明行/块(主盘内用 <TR>, 主盘外用 <div class="bz-jy-out">) */
  function baziJiaoYunRow(bz, rc) {
    let d = bz.jiaoYun;
    let dur = d.y + '年' + (d.m ? d.m + '个月' : '') + (d.d ? d.d + '日' : '');
    return '<TR' + (rc || '') + '><TD colspan="5" id="jiaoYun">出生后' + dur +
           '起大运，每逢<font style="color:var(--wx-huo)">' + d.gan + '</font>年' + d.month + '月' +
           d.day + '日前后交运。</TD></TR>';
  }

  /** 主盘外版本(命理把交运放在九宫下面, 沿用原来颜色说明的位置) */
  function baziJiaoYunBlock(bz) {
    let d = bz.jiaoYun;
    let dur = d.y + '年' + (d.m ? d.m + '个月' : '') + (d.d ? d.d + '日' : '');
    return '<div class="bz-jy-out">出生后' + dur +
           '起大运，每逢<font style="color:var(--wx-huo)">' + d.gan + '</font>年' + d.month + '月' +
           d.day + '日前后交运。</div>';
  }

  /* ══════════════ 渲染(传统模式) ══════════════ */
  /* ⚠ 备用；当前无入口(全项目无调用): 仅被下面的 showBaziPan() 调用, 而它自己也无调用方 ——
     命理盘实际走 qimen_mingli.js 的 baziMainRows。勿误以为在用、勿误删(补 UI 入口即可复活;
     「晚子时算当天」同为无入口的备用路径, 见 baziChart 的 o.zaoWanZi)。 */
  function renderBazi(d) {
    if (!d) return '';
    let h = '<div class="panDiv bz-pan">';
    /* ── 主盘 ── */
    h += '<TABLE class="pan"><TR><TD colspan="5" style="line-height:28px">' +
         '<font style="color:var(--c-gold)">名称：</font><font class="name">' + (d.name || '') + '</font>&emsp;' +
         '<font style="color:var(--c-gold)">性别：</font>' + d.gender + '&emsp;' +
         '<font style="color:var(--c-gold)">生肖：</font>' + d.zodiac + '</TD></TR>';
    h += '<TR><TD id="dateTitle">日期</TD><TD colspan="4" id="date">' + d.dateText + '</TD></TR>';
    h += '<TR id="jieqiTr"><TD style="color:var(--c-gold)">节气</TD>' +
         '<TD colspan="4" id="jieqi">' + d.jieQi + '</TD></TR>';
    /* 四柱表头 */
    h += '<TR><TD class="sizhuTitle" style="width:16%">四柱</TD>' +
         '<TD class="sizhuTitle">年柱</TD><TD class="sizhuTitle">月柱</TD>' +
         '<TD class="sizhuTitle">日柱</TD><TD class="sizhuTitle">时柱</TD></TR>';
    h += baziMainRows(d, true);

    /* ── 大运 ── */
    h += '<TABLE class="pan" id="dayun"><TR><TD class="title" rowspan=2>大<br>运</TD>';
    d.dayun.forEach(function (y2, i) {
      h += '<TD class="year"' + (i === d.curYun ? '' : '') +
           ' id="bz_dayun_year' + i + '">' + y2.year + '</TD>';
    });
    h += '</TR><TR>';
    d.dayun.forEach(function (y2, i) {
      let st = (i === d.curYun) ? 'font-weight:bold;color:var(--c-po)' : '';
      h += '<TD class="gz"' + (st ? ' style="' + st + '"' : '') + ' id="bz_dayun' + i + '">' +
           '<font style="color:' + GAN_COLOR[GAN.indexOf(y2.gan)] + '">' + y2.gan + '</font><br>' +
           '<font style="color:' + ZHI_COLOR[ZHI.indexOf(y2.zhi)] + '">' + y2.zhi + '</font><br>' +
           '<font>' + (y2.siShen || '') + '</font></TD>';
    });
    h += '</TR></TABLE>';

    /* ── 流年(当前大运的十年) ── */
    h += '<TABLE class="pan" id="year1"><TR><TD class="title" rowspan=2>流<br>年</TD>';
    d.curFortune.forEach(function (f, i) {
      h += '<TD class="liunian1" id="bz_liunian1_' + i + '">' + f.year + '<br>' + f.age + '岁</TD>';
    });
    h += '</TR><TR>';
    d.curFortune.forEach(function (f, i) {
      let nowY = new Date().getFullYear();
      let st = (f.year === nowY) ? " style='color:var(--c-po);font-weight:bold'" : '';
      h += '<TD class="liunian2" id="bz_liunian2_' + i + '"><span' + st + '>' +
           '<font style="color:' + f.ganColor + '">' + f.gan + '</font><br>' +
           '<font style="color:' + f.zhiColor + '">' + f.zhi + '</font></span><br>' +
           '<font>' + (f.siShen || '') + '</font></TD>';
    });
    h += '</TR></TABLE>';

    /* ── 流年总表(各步大运对应的十年干支) ── */
    h += '<TABLE class="pan" id="year2"><TR><TD class="title" rowspan=2>流<br>年</TD>';
    d.dayun.forEach(function (y2, i) {
      h += '<TD class="gz"' + (i === d.curYun ? '' : '') +
           ' id="bz_dayun_liunian' + i + '">' +
           (y2.liunian || []).map(function (g) { return g + '<br>'; }).join('') + '</TD>';
    });
    h += '</TR></TABLE>';
    h += '</div>';
    return h;
  }

  /* ══════════════ 入口: 命理模块「八字排盘」按钮 ══════════════ */
  /* ⚠ 备用；当前无入口(全项目无调用): HTML 与各 JS 均不调用它, 只有文件尾 window.showBaziPan
     导出 —— 八字显示实际走 qimen_mingli.js 的 mingliChart。勿误以为在用、勿误删(补 UI 入口
     即可复活; 「晚子时算当天」同为无入口的备用路径, 见 baziChart 的 o.zaoWanZi)。 */
  function showBaziPan() {
    try {
      let box = document.getElementById('yixinghuandouDIV');
      if (!box) return;
      if (box.getAttribute('data-mode') === 'bazi') {   // 再点一次收起
        box.innerHTML = ''; box.style.display = 'none'; box.removeAttribute('data-mode');
        return;
      }
      let y = window.Y, mo = window.M, dd = window.D, hh = window.hr, mi = window.mn;
      if (y === undefined) { let now = new Date(); y = now.getFullYear(); mo = now.getMonth() + 1; dd = now.getDate(); hh = now.getHours(); mi = now.getMinutes(); }
      let nm = '', gd = '男';
      let el = document.getElementById('mlName'); if (el && el.value) nm = el.value;
      let eg = document.getElementById('mlGender'); if (eg && eg.value) gd = eg.value;
      let data = baziChart({ year: y, month: mo, day: dd, hour: hh, minute: mi, name: nm, gender: gd });
      box.innerHTML = renderBazi(data);
      box.style.display = 'block';
      box.setAttribute('data-mode', 'bazi');
    } catch (e) {
      if (window._logErr) window._logErr('showBaziPan', e && e.message);
      let b2 = document.getElementById('yixinghuandouDIV');
      if (b2) { b2.style.display = 'block'; b2.innerHTML = '<div style="color:var(--c-po);padding:8px">八字错误:' + (e && e.message) + '</div>'; }
    }
  }

  window.baziChart = baziChart;
  window.baziMainRows = baziMainRows;
  window.baziJiaoYunBlock = baziJiaoYunBlock;
  window.renderBazi = renderBazi;         /* ⚠ 备用；当前无入口(全项目无调用), 见上方 renderBazi 注释 */
  window.showBaziPan = showBaziPan;       /* ⚠ 备用；当前无入口(全项目无调用), 见上方 showBaziPan 注释 */
})();
