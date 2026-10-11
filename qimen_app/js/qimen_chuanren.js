// 奇门遁甲排盘引擎  作者: 地天泰  微信/手机: 18626256203
// 项目地址: https://github.com/wrz1911/daojiayinpan
// 开源依赖: tyme4ts (MIT) https://github.com/6tail/tyme4ts
// 开源依赖: Tauri (MIT) https://github.com/tauri-apps/tauri
(function(){
'use strict';
// 共享常量(见 qimen_constants.js): 原先写在 IIFE 外的顶层 var, 是全局声明,
// 且本文件是五个自有模块里唯一没有 'use strict' 的 —— 该文件内任何笔误赋值
// 都会静默创建全局变量(项目历史上正因此踩过坑)。现移入 IIFE 并开启严格模式。
let QM=window.QM||{};
let T=typeof tyme4j!=='undefined'?tyme4j:(typeof tyme!=='undefined'?tyme:{});
let G='甲乙丙丁戊己庚辛壬癸',Z='子丑寅卯辰巳午未申酉戌亥';
let Z12=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
let DUTY=['建','除','满','平','定','执','破','危','成','收','开','闭'];

// === 节气→月将 ===
let YJ_TERM=[1,1,0,0,11,11,10,10,9,9,8,8,7,7,6,6,5,5,4,4,3,3,2,2];
let YJ_FULL=['神后子','大吉丑','功曹寅','太冲卯','天罡辰','太乙巳','胜光午','小吉未','传送申','从魁酉','河魁戌','登明亥'];

// === 贵人表 [日干][0=阳贵,1=阴贵] ===
let GR_TAB={甲:[1,7],戊:[1,7],庚:[1,7],乙:[0,8],己:[0,8],丙:[11,9],丁:[11,9],辛:[6,2],壬:[5,3],癸:[5,3]};

// === 十二天将 ===
let TJ=['贵人','腾蛇','朱雀','六合','勾陈','青龙','天空','白虎','太常','玄武','太阴','天后'];
let TJ1=['贵','腾','朱','六','勾','青','空','白','常','玄','阴','后'];

// === 天干寄宫 ===
let TGJG={甲:3,乙:5,丙:6,戊:6,丁:8,己:8,庚:9,辛:11,壬:12,癸:2};

// === 地支相刑/冲 ===
let XING={子:'卯',丑:'戌',寅:'巳',卯:'子',巳:'申',申:'寅',午:'午',未:'丑',酉:'酉',戌:'未',亥:'亥',辰:'辰'};
let CHONG={子:'午',丑:'未',寅:'申',卯:'酉',辰:'戌',巳:'亥',午:'子',未:'丑',申:'寅',酉:'卯',戌:'辰',亥:'巳'};

function zi(s){return Z.indexOf(s);}
function gn(s){return G.indexOf(s);}

// === chuanRenChart: 穿壬核心计算, 输出天盘/神将/三传/建除等 ===
window.chuanRenChart= opts => {
  opts=opts||{};
  let yr=opts.year,mo=opts.month,dy=opts.day,hr=opts.hour,mi=opts.minute||0;
  let st=T.SolarTime.fromYmdHms(yr,mo,dy,hr,mi,0);
  let sch=st.getSixtyCycleHour();
  let yGz=sch.getYear(),mGz=sch.getMonth(),dGz=sch.getDay(),hGz=sch.getSixtyCycle();
  let yI=yGz.getIndex(),mI=mGz.getIndex(),dI=dGz.getIndex(),hI=hGz.getIndex();
  let riGan=dGz.getHeavenStem(),riZhi=dGz.getEarthBranch();
  let riG=riGan.getIndex(),riZ=riZhi.getIndex();
  let shiZhi=hGz.getEarthBranch(),shiZ=shiZhi.getIndex();
  let lh=st.getLunarHour(),ld=lh.getLunarDay();
  let solarDay=T.SolarDay.fromYmd(yr,mo,dy);

  // 刻家: 对齐主引擎刻盘算法(时柱天干推刻柱, 偶数小时分钟+60)
  let shiKe=opts.shiKe||'时家';
  let keGzStr='',keG=0,keZ=0;
  if(shiKe==='刻家'){
    // 刻盘: 偶数小时分钟+60(阳刻), 奇数小时不变(阴刻)
    let tMin = (hr % 2 === 0) ? 60 + mi : mi;
    // 刻柱 = 时柱天干*12 + floor(tMin/10)
    let keG2 = hI % 10;
    if (keG2 > 4) keG2 -= 5;
    let kz = Math.floor(tMin / 10);
    let cMin = (keG2 * 12 + kz) % 60;
    keG = cMin % 10;
    keZ = cMin % 12;
    keGzStr = G[keG] + Z[keZ];
    shiZ = keZ; hI = cMin;
  }

  // 自选局
  let ziJu=opts.ziJu||'自动';
  let customJu=null;
  if(ziJu!=='自动'){
    let zjYY=ziJu[0], zjNum=parseInt(ziJu.substring(1));
    customJu={yinYang:zjYY, number:zjNum};
  }

  // 1. 月将: 节气→月将地支索引→月将全名
  let term=solarDay.getTerm(),ti=term.getIndex()%24;
  let yjIdx=YJ_TERM[ti],yjName=YJ_FULL[yjIdx],yjZhi=Z[yjIdx];

  // 2. 天盘十二地支: 月将加时支顺排, tp[1]=时支位天盘支
  let yjPos=zi(yjZhi),offset=yjPos-shiZ;
  let tp=[]; for(let i=0;i<12;i++){let pos=offset+i+1;if(pos<1)pos+=12;if(pos>12)pos-=12;tp[i+1]=Z[pos-1];}

  // 3. 贵人: 用神天干查贵人表
  let ysGan=opts.yongShen?opts.yongShen[0]:riGan.getName();
  let rgChar=ysGan;
  let gr=opts.guiRen||'阳贵';
  let grPair=GR_TAB[rgChar]||[2,8];
  let grZhiIdx=gr==='阴贵'?grPair[1]:grPair[0];
  let grZhi=Z[grZhiIdx];
  let grTpPos=-1;for(let i=1;i<=12;i++){if(tp[i]===grZhi){grTpPos=i;break;}}

  // 4. 十二天将: 贵人起, 阳贵顺排/阴贵逆排
  let sun=(grTpPos>=1&&grTpPos<=5)||grTpPos===12;
  let tjs=[],tjs2={},tjsChar={};
  for(let i=1;i<=12;i++){let di=i-grTpPos;if(!sun)di=-di;if(di<0)di+=12;tjs[i]=TJ1[di];tjs2[tp[i]]=TJ1[di];tjsChar[tp[i]]=TJ1[di];}

  // 5. 天干分布: 用神天干→地支偏移, 查14字天干表按12位置clamp
  let ysGanChar=opts.yongShen?opts.yongShen[0]:riGan.getName();
  let ysZhiChar=opts.yongShen?opts.yongShen[1]:riZhi.getName();
  let gzCha=G.indexOf(ysGanChar)-Z.indexOf(ysZhiChar);
  let tgstr='甲乙丙丁戊己庚辛壬癸甲乙';
  let tgs=[],tgs2={};
  for(let i=1;i<=12;i++){
    let gi=gzCha+zi(tp[i])+1; // +1: 地支索引从1开始(子=1)
    if(gi>12)gi-=12; else if(gi<1)gi+=12;
    tgs[i]=tgstr[gi-1]; tgs2[tp[i]]=tgstr[gi-1];
  }

  // 6. 空亡: 用神地支减天干之差→查表(0戌亥,2子丑,4寅卯,6辰巳,8午未,10申酉)
  let kwDiff=(zi(ysZhiChar)-G.indexOf(ysGanChar)+12)%12;
  let kwMap={0:['戌','亥'],2:['子','丑'],4:['寅','卯'],6:['辰','巳'],8:['午','未'],10:['申','酉']};
  let kwPair=kwMap[kwDiff]||['子','丑'];
  let kw={};kw[kwPair[0]]=true;kw[kwPair[1]]=true;

  // 7. 建除: 时支起建顺排十二神
  let dutyMap={};
  for(let i=0;i<12;i++){let dp=(shiZ+i)%12;dutyMap[Z[dp]]=DUTY[i];}

  // 8. 天干寄宫 + 三传: 用神起四课推三传
  let yrg=ysGanChar;
  let jg=TGJG[yrg]||3;
  let tgsz=['','','','',''];
  tgsz[1]=yrg;tgsz[2]=tp[jg];let zt1=zi(tgsz[2])+1;tgsz[3]=tp[zt1];let zt2=zi(tgsz[3])+1;tgsz[4]=tp[zt2];

  // 9. 地支三传: 用神地支→天盘→初/中/末传
  let dzsz=['','','','',''];
  let yrz=ysZhiChar;dzsz[1]=yrz;let a1=zi(dzsz[1])+1;dzsz[2]=tp[a1];let a2=zi(dzsz[2])+1;dzsz[3]=tp[a2];let a3=zi(dzsz[3])+1;dzsz[4]=tp[a3];

  // 10. 伏吟刑冲: 月将=时支时触发, 中末传取刑(亥刑巳,非自刑)
  let isFuYin=(yjZhi===Z[shiZ]);
  let XING_VF={子:'卯',丑:'戌',寅:'巳',卯:'子',辰:'戌',巳:'申',午:'子',未:'丑',申:'寅',酉:'卯',戌:'未',亥:'巳'};
  if(isFuYin){
    let _v3=XING_VF[tgsz[2]]||tgsz[2],_v4=XING_VF[_v3]||_v3;
    tgsz[3]=_v3;tgsz[4]=_v4;
    let _d3=XING_VF[dzsz[2]]||dzsz[2],_d4=XING_VF[_d3]||_d3;
    dzsz[3]=_d3;dzsz[4]=_d4;
  }

  // 11. 时运命: 时支(shí)/月将(yùn)/年命(mìng)
  let sm={shi:Z[shiZ],yun:yjZhi,ming:opts.nianMing||Z[shiZ]};

  // 12. 排盘表头: 局数/值符/值使/旬首/空亡/马星
  let xsIdxH=Math.floor(hI/10)*10; // 时柱旬首(旬首/空亡/值符一致)
  let _kongWang=Z[(xsIdxH+10)%12]+Z[(xsIdxH+11)%12];
  let _maXing=Z[[2,11,8,5][hI%4]];
  let jieqiStr='';
  try{let t2=solarDay.getTerm(),nt=t2.next(1);jieqiStr=t2.getName()+'~'+nt.getName();}catch(e){jieqiStr='节气';}
  let juNum=0,juLabel='',zfVal='',zsVal='',_xunShou='';
  /* 引擎结果只算一次: 局数与九宫都要用, 分两处各调一次 qimenChart 会白白翻倍
     (实测穿壬渲染 13.6ms, 是时盘的近 3 倍, 重复计算是主因之一)。 */
  let qrShared=null;
  try{
    let isY2=ti>=12;let lM2=Math.abs(ld.getLunarMonth().getMonthWithLeap());if(lM2===0)lM2=12;
    /* 局数必须与九宫同源。九宫由 qimenChart({panType:刻家?2:1}) 排, 而刻家的引擎公式
       比时家多一项时柱 —— v+lD+(hCyl%12+1)+(cMin%12+1)+(yI%12+1); 这里原先自算成
       (yI%12+1)+lM2+day+(hI%12+1)(刻家分支下 hI 已被换成刻柱), 于是盘头显示的局数
       与九宫实际排布对不上, 只在个别时柱下偶然相等。改为直接取引擎结果。 */
    try{ qrShared=window.qimenChart?window.qimenChart({year:opts.year,month:opts.month,day:opts.day,hour:opts.hour,minute:opts.minute,panType:opts.shiKe==='刻家'?2:1,customJu:customJu||undefined}):null; }catch(e3){}
    if(qrShared&&qrShared.juNum){ juNum=qrShared.juNum; isY2=(qrShared.yinYang==='阴'); }
    else { juNum=((yI%12+1)+lM2+ld.getDay()+(hI%12+1))%9;if(juNum===0)juNum=9; }
    juLabel=(isY2?'阴遁':'阳遁')+juNum+'局';
    let GAN9='戊己庚辛壬癸丁丙乙';
    let juMap={};for(let i=0;i<9;i++){let g=isY2?juNum-i:juNum+i;if(g>9)g-=9;if(g<1)g+=9;juMap[g]=GAN9[i];}
    // 值符/值使用已计算的时柱旬首(六甲遁于六仪)
    let hiddenGan=['戊','己','庚','辛','壬','癸'][xsIdxH/10%6]; // 六甲所遁之干
    _xunShou='甲'+Z[xsIdxH%12]+hiddenGan; // 格式: 甲申庚
    // 旬首仪落宫 —— **中宫(5)必须参与匹配**: 六仪飞布时中宫同样有一干; 若跳过宫5,
    // 旬首仪在中宫时 dgGong 恒为 0, 下面的 dgGong===5 分支永不执行, 退化成
    // FZ2[1] 得到值符"蓬"/值使"休"(错)。参照实现 chuanrenPan.js 的写法:
    //   var zhiShiGong = 5==zhiFuGong ? 2 : zhiFuGong;
    //   $("#zhiFu").html(jiuXing[zhiFuGong]);   // jiuXing[5]='禽', 值符不做替换
    //   $("#zhiShi").html(baMen[zhiShiGong]);   // 值使寄坤2 → '死'
    let dgGong=0;for(let g2=1;g2<=9;g2++){if(juMap[g2]===hiddenGan){dgGong=g2;break;}}
    let XN2=' 蓬任冲辅英芮柱心',MN2=' 休生伤杜景死惊开',FZ2=[0,1,6,3,4,6,8,7,2,5];
    if(dgGong===5){zfVal='天禽星';zsVal='死门';} // 宫5: 值符取本位星「禽」, 值使寄坤2取「死」
    else{let zfI=dgGong===0?1:FZ2[dgGong];zfVal='天'+XN2[zfI]+'星';zsVal=MN2[zfI]+'门';}
  }catch(e){juLabel=''}

  let nongliStr='';
  try{nongliStr=ld.getLunarMonth().getLunarYear().getYear()+'年'+ld.getLunarMonth().getName()+ld.getName();}catch(e){ window._logErr && window._logErr('nongli', e && e.message); }



  return {
    gongli:yr+'年'+mo+'月'+dy+'日 '+hr+':'+(mi<10?'0':'')+mi,
    nongli:nongliStr,
    sizhu:yGz.getName()+' '+mGz.getName()+' '+dGz.getName()+' '+hGz.getName()+(keGzStr?' '+keGzStr:''),
    jieqi:jieqiStr,juLabel:juLabel,qr:qrShared,
    zhiFu:zfVal,zhiShi:zsVal,
    xunShou:_xunShou,kongWang:_kongWang,maXing:_maXing,
    riGz:dGz.getName(),
    yueJiang:{idx:yjIdx,name:yjName,zhi:yjZhi},
    tianPan:tp,tianGans:tgs,tianGansMap:tgs2,
    guiRen:{zhi:grZhi,pos:grTpPos,sun:sun},
    tianJiangs:tjs,tianJiangsMap:tjs2,tianJiangsChar:tjsChar,
    kongWangMap:kw,dutyMap:dutyMap,
    shiZhi:shiZ,shiZhiName:Z[shiZ],shiKe:shiKe,keGzStr:keGzStr,
    tgsz:tgsz,dzsz:dzsz,isFuYin:isFuYin,
    shiYunMing:sm,opts:opts,customJu:customJu
  };
};

// === 十神: 释义键(全名) ↔ 盘面显示(单字简称) ===
/* 与 qimen_bazi.js 的 SHISHEN_ABBR 同表(偏印作"枭")。
   释义表(qimen_term_tips.js 的 SHISHEN_TIPS)的键是**全名**, 而盘面按惯例显示单字简称;
   window.termSpan(cat, name, colorStyle, label) 用 name 查表、用 label 显示 —— 所以渲染前
   必须把简称还原成全名(命理盘 qimen_bazi.js 的 tenFull 同一做法)。
   注: 本文件在 bundle 里排在 qimen_bazi.js 之前, 不能借用它的内部函数, 故自备一张反向表。 */
let SS_ABBR={'比肩':'比','劫财':'劫','食神':'食','伤官':'伤','偏财':'才',
             '正财':'财','七杀':'杀','正官':'官','偏印':'枭','正印':'印'};
let SS_FULL={};
for(let _k in SS_ABBR)SS_FULL[SS_ABBR[_k]]=_k;
/* 简称 → 全名(已是全名或空值时原样返回, 与 tenFull 同语义) */
function ssFull(short){
  if(!short)return short;
  if(SS_ABBR[short]!==undefined)return short;
  return SS_FULL[short]||short;
}

// === 八字大运计算 (口径统一: 委托 tyme4ts) ===
/* 本函数原先自算起运岁数/十神/十二长生 —— 三处同源出错, 且都与项目基准(tyme4ts)不同源:
     ① 起运 取 solarDay.getTerm().next(1): 那是**中气**(如立秋→处暑), 应取**节**(→白露);
        顺行、逆行两支都错, 实测约 68% 的生辰起运年与 baziChart 不一致(偏差 −10…+5 年),
        整张"大运 + 流年 + 交运"表随之错位;
     ② 十神 用五行生克自排分支, 与 tyme getTenStar 呈整齐互换
        (食←袅、伤←印、才←杀、财←官、杀←才、官←财、枭←食、印←伤), 90 组中 80 组不符;
        且偏印写作"袅"(U+8885), 与 qimen_bazi.js 的 SHISHEN_ABBR("枭")、释义表键("偏印")都不一致;
     ③ 十二长生 CS/CS_YANG/CS_YIN 起点错(甲/丁/己/庚/癸 各 12/12 全错, 120 格错 70 格),
        表内还有错别字("淋浴"应为"沐浴"、"库"应为"墓", 释义表 ZHANGSHENG_TIPS 的键正是"沐浴/墓")。
   现不再自算: 整体委托 window.baziChart(qimen_bazi.js —— 同一套 tyme 口径, 已与第三方逐项对拍
   一致), 这里只做一层字段适配。**返回的字段名/类型/语义与原先保持一致**
   (穿壬盘 renderChuanRen 与命理盘 mingliChart 都按这些字段取值)。 */
window.computeBaZiDaYun= opts => {
  opts=opts||{};
  let yr=opts.year,mo=opts.month,dy=opts.day,hr=opts.hour;
  let gender=opts.gender||'男';
  /* 唯一数据来源: 完整八字盘 —— 四柱/十神/藏干/纳音/地势/自坐/空亡/大运均由 tyme 算 */
  if(!window.baziChart)throw new Error('computeBaZiDaYun 依赖 qimen_bazi.js 的 baziChart(tyme 口径)');
  let bzFull=window.baziChart({year:yr,month:mo,day:dy,hour:hr,minute:opts.minute||0,gender:gender});
  let G2='甲乙丙丁戊己庚辛壬癸',Z2='子丑寅卯辰巳午未申酉戌亥';

  // 四柱 (字段同原先: gz/g/z/gIdx/zIdx)
  let bz=bzFull.pillars.map(p => {
    return {gz:p.gz,g:p.gan,z:p.zhi,gIdx:G2.indexOf(p.gan),zIdx:Z2.indexOf(p.zhi)};
  });

  // 年干顺逆: 阳年男/阴年女顺行(实测与 tyme DecadeFortune 的实际方向完全一致)
  let isYangNian=bz[0].gIdx%2===0; // 甲丙戊庚壬为阳年
  let isMale=gender==='男';
  let shun=(isYangNian&&isMale)||(!isYangNian&&!isMale)?'顺':'逆';

  /* 起运: 直接取 tyme ChildLimit 的结果 —— "顺行到下一个节 / 逆行到上一个节"以及
     3天=1岁、1天=4月、1时辰=10天 的折算全由它内部完成, 不再拿节气儒略日相减 */
  let jy=bzFull.jiaoYun;
  /* 大运**年份标签**与命理盘同口径: 取 baziChart.dayun[1].year(干支年口径)。
     原因: baziChart 自身 jiaoYun.year(公历口径) 与 dayun[i].year(干支年口径) 在
     "交运日落在立春前"的约一成生辰上本就相差 1 年, 而命理盘的大运年份标签用的是后者;
     此处对齐后者, 两盘年份标签才能完全一致。起运**岁数/月/日**仍取 jy(ChildLimit)。 */
  let qiYunYear=(bzFull.dayun && bzFull.dayun[1] && bzFull.dayun[1].year) || jy.year;
  let qiYunSui=jy.y, qiYunMonth=jy.m, qiYunDay=jy.d;

  // 大运 10 步: 干支取 tyme 的九步 DecadeFortune, 第 10 步按其顺逆再推一位
  let step=shun==='顺'?1:-1;
  let lastGz=bzFull.dayun[bzFull.dayun.length-1].gz;
  let dayun=[];
  for(let i=0;i<10;i++){
    let gz=(i<9)?bzFull.dayun[i+1].gz:T.SixtyCycle.fromName(lastGz).next(step).getName();
    dayun.push({gz:gz,g:gz[0],z:gz[1],age:qiYunSui+i*10,year:qiYunYear+i*10});
  }

  /* 十神: 一律走 tyme getTenStar(简称表见模块级 SS_ABBR, 偏印作"枭") */
  let dayGan=T.HeavenStem.fromName(bz[2].g);
  function ssOf(gan){return SS_ABBR[dayGan.getTenStar(T.HeavenStem.fromName(gan)).getName()]||'';}
  let shishen=bzFull.pillars.map(p => ssOf(p.gan));   // 日柱对自身 = 比肩

  /* 藏干: 字序与十神**一律取 tyme**(baziChart 的 pillars[].cang = EarthBranch.getHideHeavenStems(),
     本气→中气→余气; 每项的 shen 已是简称)。原先此处用 QM.CANG_GAN 的字序, 再由渲染端排成
     c2,c0,c1 —— 该排列与 tyme 次序在 寅/辰/巳/未/申 五支上不同, 且与紧随其后的藏干十神错位
     (同一格里藏干字与十神对不上)。改为逐字取自 tyme 后, 藏干与它自己的十神天然逐字对齐。
     数组形状保持不变: cangGan 每柱一个字符串, cgSS 每柱固定 3 槽(不足补空串), 供渲染端按
     i*3+j 取用。 */
  let cangGan=[],cgSS=[];
  bzFull.pillars.forEach(p => {
    let list=p.cang||[];
    cangGan.push(list.map(c => c.gan).join(''));
    for(let j=0;j<3;j++){cgSS.push(list[j]?list[j].shen:'');}
  });

  // 纳音 / 地势 / 自坐 / 空亡: 全部取 baziChart(地势=日干对该柱地支, 自坐=本柱天干对该支)
  let nayin=bzFull.pillars.map(p => {return p.naYin;});
  let dishi=bzFull.pillars.map(p => {return p.diShi;});
  let zizuo=bzFull.pillars.map(p => {return p.ziZuo;});
  let xunKong=bzFull.pillars.map(p => {return p.kong;});

  // 五行色统一走 QM.wxSpan(qimen_constants.js 的单字表), 不再自备色表
  function wxSpanBZ(ch){return QM.wxSpan?QM.wxSpan(ch):ch;}

  // 大运十神(大运天干 vs 日干, 同走 tyme getTenStar)
  let dayunSS=dayun.map(o => ssOf(o.g));

  // 流年: 从起运年开始 100 年(10 步大运 × 10 年), 干支取 tyme 的干支年
  let liuNian=[];
  for(let ln=0;ln<100;ln++){
    let lnYear=qiYunYear+ln;
    let lnGz=T.SixtyCycleYear.fromYear(lnYear).getSixtyCycle().getName();
    liuNian.push({year:lnYear, gz:lnGz, g:lnGz[0], z:lnGz[1]});
  }

  // 当前大运index (0-based)
  let curYear=new Date().getFullYear();
  let curDY=0;
  for(let di=0;di<dayun.length;di++){if(curYear>=dayun[di].year){curDY=di;}}

  // 交运信息: 出生后多久起运 + 交运年天干/交运月日(口径与命理盘的交运行一致)
  let jiaoYunGan=jy.gan; // 交运年的年干(tyme ChildLimit 给出)
  let qiYunDesc='出生后'+qiYunSui+'年'+(qiYunMonth?qiYunMonth+'个月':'')+(qiYunDay?qiYunDay+'日':'')+
    '起大运，每逢'+wxSpanBZ(jiaoYunGan)+'年'+jy.month+'月'+jy.day+'日前后交运';

  return {
    bz:bz, shun:shun, nayin:nayin, cangGan:cangGan, shishen:shishen, cgSS:cgSS,
    dishi:dishi, zizuo:zizuo, xunKong:xunKong,
    qiYunSui:qiYunSui, qiYunMonth:qiYunMonth, qiYunYear:qiYunYear,
    dayun:dayun, dayunSS:dayunSS, liuNian:liuNian, curDY:curDY, curYear:curYear,
    qiYunDesc:qiYunDesc, wxSpanBZ:wxSpanBZ
  };
};

// === 穿壬渲染 (完整信息栏+排盘区) ===
window.renderChuanRen=(data,containerId) => {
  let d=data;
  let szParts=d.sizhu.split(' ');
  let nianGz=szParts[0]||'',yueGz=szParts[1]||'',riGz=szParts[2]||'',shiGz=szParts[3]||'';
  /* 五行着色统一走 QM.wxSpan / QM.WX_OF(qimen_constants.js 的单字表)。
     该表涵盖天干/地支/十二将神/建除十二神: 干支按本气, 将神与建除各按其配支,
     全项目一张表, 盘头/外圈/三传/大运各处同字同色。 */
  function wxSpan(s){return QM.wxSpan?QM.wxSpan(s):(s||'');}
  function wxSpanX(s){return wxSpan(s);}
  /* 术语可点释义: 与命理盘(qimen_bazi.js baziMainRows)同一套 —— 有 window.termSpan 就渲染成
     可点元素(点击弹 qimen_term_tips.js / qimen_shensha_tips.js 的释义), 未加载则退回纯文本。
     十神这类"释义键是全名、盘面显示简称"的, 第 4 参传显示用简称(label)。 */
  function term(cat,name,label){
    if(!window.termSpan)return (label||name||'');
    return window.termSpan(cat,name,'',label);
  }
  function termSS(short){return term('十神',ssFull(short),short);}

  let h='';

  // ====== 信息栏 ======
  let isKe=d.shiKe==='刻家';
  let keGan=d.keGzStr?d.keGzStr[0]:'',keZhi=d.keGzStr?d.keGzStr[1]:'';
  let cols=isKe?5:4;
    /* 时辰 0 时(子时)是合法值, 不能写成 `d.opts.hour||12` —— 0 是 falsy, 会被换成 12,
       于是盘头「四柱」按子时显示、而下面这几行八字信息(十神/藏干/纳音/地势/自坐)按午时算,
       两者不同源(实拍: 2027-01-01 00:35 盘头时柱丙子, 八字行却是壬午那一路的纳音/藏干)。 */
    let bzHour=(d.opts.hour==null?12:d.opts.hour);
    let bzdy=window.computeBaZiDaYun({
      year:d.opts.year||2026, month:d.opts.month||7, day:d.opts.day||5,
      hour:bzHour, gender:d.opts.gender||'男'
    });
    let ssg=bzdy.shishen||[], cg=bzdy.cangGan||[], cgS=bzdy.cgSS||[];
    let dishi=bzdy.dishi||[], zizuo=bzdy.zizuo||[], xk=bzdy.xunKong||[];
    let ws=bzdy.wxSpanBZ|| (c => c);
  h+='<div id="panHead"><TABLE class="pan" id="headTable">';
  h+='<TR><TD id="dTitle">日期</TD><TD colspan="'+cols+'" id="dateTime">'+d.gongli+' ('+d.nongli+')</TD></TR>';
  let juTitle=d.juLabel+(d.customJu?'<b>自选</b>':'')+(isKe?' <b>刻家</b>':'');
  h+='<TR><TD style="color:var(--c-gold)">节气</TD><TD colspan="'+Math.floor(cols/2)+'">'+d.jieqi+(d.isFuYin?' <b style=color:#c00>伏吟</b>':'')+'</TD><TD colspan="'+Math.ceil(cols/2)+'">'+juTitle+'</TD></TR>';
  h+='<TR class="tdTitle"><TD>值符</TD><TD>值使</TD><TD>旬首</TD><TD>空亡</TD><TD>马星</TD>'+(isKe?'<TD></TD>':'')+'</TR>';
  h+='<TR><TD>'+d.zhiFu+'</TD><TD>'+d.zhiShi+'</TD><TD>'+d.xunShou+'</TD><TD>'+d.kongWang+'</TD><TD>'+d.maXing+'</TD>'+(isKe?'<TD></TD>':'')+'</TR>';
  h+='<TR class="tdTitle"><TD>月将</TD><TD>年命</TD><TD>用神</TD><TD colspan="'+(isKe?3:2)+'">贵人</TD></TR>';
  h+='<TR><TD>'+d.yueJiang.name+'</TD><TD>'+(d.opts.nianMing||'子')+'</TD><TD>'+(d.opts.yongShen||d.riGz||'')+'</TD><TD colspan="'+(isKe?3:2)+'">'+(d.opts.guiRen||'阳贵')+' ('+(d.opts.gender||'男')+') '+(d.guiRen.sun?'顺':'逆')+'</TD></TR>';
    // 十神行置于四柱之上(与命理盘同序: 十神在上、四柱在下)
    /* 「日元」不是十神, 不参与点击释义(与命理盘 baziMainRows 同规) */
    h+='<TR><TD>十神</TD>';
    bzdy.bz.forEach((b, i) => {h+='<TD>'+(i===2?'日元':(ssg[i]?termSS(ssg[i]):''))+'</TD>';});
    h+='</TR>';
    // 四柱标题+数据(紧接十神下方)
    h+='<TR class="tdTitle"><TD>'+(isKe?'五柱':'四柱')+'</TD><TD class="sizhuTitle">年柱</TD><TD class="sizhuTitle">月柱</TD><TD class="sizhuTitle">日柱</TD><TD class="sizhuTitle">时柱</TD>'+(isKe?'<TD class="sizhuTitle">刻柱</TD>':'')+'</TR>';
    h+='<TR><TD></TD>';
    h+='<TD class="sizhu sizhu-v" id="nianzhu">'+wxSpan(nianGz[0]||'')+'<br>'+wxSpan(nianGz[1]||'')+'</TD>';
    h+='<TD class="sizhu sizhu-v" id="yuezhu">'+wxSpan(yueGz[0]||'')+'<br>'+wxSpan(yueGz[1]||'')+'</TD>';
    h+='<TD class="sizhu sizhu-v" id="rizhu">'+wxSpan(riGz[0]||'')+'<br>'+wxSpan(riGz[1]||'')+'</TD>';
    h+='<TD class="sizhu sizhu-v" id="shizhu">'+wxSpan(shiGz[0]||'')+'<br>'+wxSpan(shiGz[1]||'')+'</TD>';
    if(isKe)h+='<TD class="sizhu sizhu-v" id="kezhu">'+wxSpan(keGan)+'<br>'+wxSpan(keZhi)+'</TD>';
    h+='</TR>';
    // 八字信息(藏干/纳音/地势/自坐/空亡): 紧接四柱下方, 与四柱同表对齐
    // 干支已在盘头「四柱」处显示, 此处不再重复(表头保留供十神/藏干等行对齐)
    h+='<TR><TD>藏干</TD>';
    bzdy.bz.forEach((b, i) => {
      /* 藏干字按 tyme 次序(getHideHeavenStems)逐字着色; 其下的十神与它逐字对齐
         (cgS 与 cg 同源同序, 见 computeBaZiDaYun), 每个十神可点弹释义 */
      let cs=cg[i]||'',chars='';
      for(let k=0;k<cs.length;k++)chars+=ws(cs[k]);
      let ss='';
      for(let k=0;k<3;k++){let t=cgS[i*3+k]||'';ss+=(t?termSS(t):'')+(k<2?' ':'');}
      h+='<TD>'+chars+'<br><span class="cr-bz-cgss">'+ss+'</span></TD>';
    });
    h+='</TR>';
    /* 纳音/地势(十二长生)/自坐 三行的词条都可点弹释义(释义表见 qimen_term_tips.js);
       空亡是"戌亥"这类组合, 与命理盘一样不做点击 */
    h+='<TR><TD>纳音</TD>';
    bzdy.nayin.forEach(n => {h+='<TD>'+(n?term('纳音',n):'')+'</TD>';});
    h+='</TR>';
    h+='<TR><TD>地势</TD>';
    dishi.forEach(d => {h+='<TD>'+(d?term('长生',d):'')+'</TD>';});
    h+='</TR>';
    h+='<TR><TD>自坐</TD>';
    zizuo.forEach(d => {h+='<TD>'+(d?term('长生',d):'')+'</TD>';});
    h+='</TR>';
    h+='<TR><TD>空亡</TD>';
    xk.forEach(k => {h+='<TD>'+k+'</TD>';});
    h+='</TR>';
  /* 四柱以下的八字信息行(十神/藏干/纳音/地势/自坐/空亡)就在上面这张盘头表里, 与四柱同表对齐;
     本盘**不渲染神煞行**(computeBaZiDaYun 亦不返回 sha), 故神煞无可点化对象。
     (旧注释称"下方 .cr-bz-tbl 已给出完整四柱…神煞", 该表在渲染端早已不存在, 一并更正。) */
  // 颜色
  h+='<TR><TD style="color:var(--c-gold);font-size:12px">颜色</TD><TD colspan="'+cols+'" style="font-size:12px;line-height:20px">'+
    '<font style="color:var(--c-mu)">入墓</font> <font style="color:var(--c-xing)">击刑</font> <font style="color:var(--c-po)">门破</font> <font style="color:var(--c-xingmu)">刑墓</font></TD></TR>';
  h+='</TABLE></div><div style="height:40px"></div>';

  // ====== 穿壬外圈 + 奇门九宫 (时盘风格, 无额外框线) ======
  // 使用 buildPaipanGrid 生成标准奇门九宫 (含外圈yinGan位置)
  let qimenGridHTML='';
  try{
    if(window.qimenChart&&window.buildPaipanGrid){
      let qopts={year:d.opts.year||2026,month:d.opts.month||7,day:d.opts.day||5,hour:bzHour,minute:d.opts.minute||0,panType:d.shiKe==='刻家'?2:1};
      if(d.customJu)qopts.customJu=d.customJu;
      let qr=d.qr||window.qimenChart(qopts);   // 复用上面算好的那次, 拿不到再算
      if(qr&&qr.pals){
        let qimenPalaces={};
        for(let g=1;g<=9;g++){if(g===5)continue;
          let pp=qr.pals[g];
          qimenPalaces['gong'+g]={shen:pp.shen||'',tian:pp.tian||'',di:pp.di||'',xing:pp.xing||'',men:pp.men||'',anGan:pp.anGan||'',kong:pp.kong||false,isMenPo:!!pp.mp,isTianXing:!!pp.tx,isTianMu:!!pp.tm,isDiXing:!!pp.dx,isDiMu:!!pp.dm};
        }
        // 与时盘一致: 重新计算四害颜色
        if(window.recalcColors)window.recalcColors(qimenPalaces);
        let kongG={};for(let g=1;g<=9;g++){if(qr.pals[g]&&qr.pals[g].kong)kongG[g]=true;}
        let maPosId=qr.ma?qr.ma.p:'ma2';
        // 穿壬外圈: 绝对定位标签 (left/right/top/bottom)
        let csFn=window._colorSpan|| (v => v||'');
        qimenGridHTML='<div class="cr-grid-wrap"><div class="cr-content">'+
          window.buildPaipanGrid(qimenPalaces,kongG,maPosId,function(g){return g===5?'':(qr.pals[g]?(qr.pals[g].anGan||''):'');},{colorSpan:csFn,wrapperClass:'cr-inner',panClass:'cr-pan',noClick:true})+
          '</div>';
        // 穿壬12地支外圈卡片
        let ringOrder=['巳','午','未','辰','卯','寅','申','酉','戌','亥','子','丑'];
        let ringSides=['top','top','top','left','left','left','right','right','right','bot','bot','bot'];
        let gongRef={巳:4,午:9,未:2,辰:4,卯:3,寅:8,申:2,酉:7,戌:6,亥:6,子:1,丑:8};
        let ringLabels=[];
        for(let i=0;i<12;i++){
          let zhi=ringOrder[i],side=ringSides[i],gRef=gongRef[zhi]||1;
          let pos=zi(zhi)+1; // 地盘位置 1-based
          let tg=d.tianGans[pos]||''; // 天干按地盘位置
          let tj=d.tianJiangs[pos]||''; // 天将单字(按地盘位置)
          let tpZhi=d.tianPan[pos]||zhi; // 天盘支
          let du=d.dutyMap[zhi]||'';
          let label='<div class="cr-card" data-zhi="'+zhi+'" data-side="'+side+'" data-gref="'+gRef+'" data-ri="'+i+'">';
          // 排版: 建除(近宫)→天盘支→神→干(远宫)
          // 四层各自按五行着色(天干/将神/贵神/十二建除)
          let cTg=wxSpanX(tg),cTj=wxSpanX(tj),cZhi=wxSpanX(tpZhi),cDu=wxSpanX(du);
          if(side==='top'){
            label+='<span class=cr-ctg>'+cTg+'</span><span class=cr-ctj>'+cTj+'</span><span class=cr-czhi>'+cZhi+'</span><span class=cr-cdu>'+cDu+'</span>';
          } else if(side==='left'){
            label+='<span class=cr-hrow><span class=cr-ctg>'+cTg+'</span><span class=cr-ctj>'+cTj+'</span><span class=cr-czhi>'+cZhi+'</span><span class=cr-cdu>'+cDu+'</span></span>';
          } else if(side==='right'){
            label+='<span class=cr-hrow><span class=cr-cdu>'+cDu+'</span><span class=cr-czhi>'+cZhi+'</span><span class=cr-ctj>'+cTj+'</span><span class=cr-ctg>'+cTg+'</span></span>';
          } else {
            label+='<span class=cr-cdu>'+cDu+'</span><span class=cr-czhi>'+cZhi+'</span><span class=cr-ctj>'+cTj+'</span><span class=cr-ctg>'+cTg+'</span>';
          }
          label+='</div>';
          ringLabels.push(label);
        }
        qimenGridHTML+=ringLabels.join('');
        // 四课(时/运/命/末)
        // 三传表格: 天干/地支/时运命(时支/月将/年命)
        let scLabels=['','初传','中传','末传','四课'];
        let scExtra=['','','时','运','命'];
        let scExtraVal=['','','','',''];
        scExtraVal[3]=d.shiZhiName; // i=3 时支
        scExtraVal[2]=d.yueJiang.zhi; // i=2 月将
        scExtraVal[1]=d.opts.nianMing||'子'; // i=1 年命
        qimenGridHTML+='<div class="cr-sanchuan"><table class="cr-sc-tbl">';
        for(let i=4;i>=1;i--){
          let lb=scLabels[i]||'', ex=scExtra[i]||'', exv=scExtraVal[i]||'';
          // 三传/四课三列同样按五行着色: 天干列在"四课"行落的是地支, 统一走
          // wxSpanX 的单字表, 干支都能取到色, 不必按列区分干支
          qimenGridHTML+='<tr><td class="cr-sc-lb">'+lb+'</td><td class="cr-sc-tg">'+wxSpanX(d.tgsz[i])+'</td><td class="cr-sc-dz">'+wxSpanX(d.dzsz[i])+'</td><td class="cr-sc-ex">'+wxSpanX(exv)+'</td></tr>';
        }
        qimenGridHTML+='</table></div>';
        qimenGridHTML+='</div></div>';
      }
    }
  }catch(e){qimenGridHTML='<div style=color:var(--c-po);text-align:center;padding:20px>九宫错误:'+e.message+'</div>';}
  if(!qimenGridHTML){
    let reason='';
    if(!window.qimenChart) reason='qimenChart未定义';
    else if(!window.buildPaipanGrid) reason='buildPaipanGrid未定义';
    else{let qr2=window.qimenChart({year:2026,month:7,day:11,hour:14,minute:0,panType:1}); reason='qr.pals='+(qr2&&qr2.pals?'有':'无');}
    qimenGridHTML='<div style=color:var(--c-po);text-align:center;padding:20px>九宫:'+reason+'</div>';
  }

  h+=qimenGridHTML;

  // ====== 八字大运区 ======
  try{

    // 大运流年 (独立表格, 无边距)
    h+='<table class="cr-dy-tbl">';
    // 交运信息行
    h+='<tr class="cr-dy-info-row"><td class="cr-dy-lbl" colspan="'+(Math.min(bzdy.dayun.length,10)+1)+'">'+bzdy.qiYunDesc+'</td></tr>';
    // 年份表头
    h+='<tr class="cr-dy-hdr"><td class="cr-dy-lbl cr-dy-lbl-v" rowspan="2">大运</td>';
    for(let di=0;di<Math.min(bzdy.dayun.length,10);di++){let isCurYr=di===bzdy.curDY; h+='<td'+(isCurYr?' class="cr-dy-cur"':'')+'>'+(bzdy.qiYunYear+di*10)+'</td>';}
    h+='</tr>';
    // 大运干支+十神 (与年份同行标签)
    h+='<tr>';
    let curY=new Date().getFullYear();
    for(let di=0;di<Math.min(bzdy.dayun.length,10);di++){
      let dy=bzdy.dayun[di], dss=(bzdy.dayunSS||[])[di]||'';
      let isCur=(curY>=dy.year&&curY<dy.year+10);
      h+='<td><span class="cr-dy-gz'+(isCur?' cr-dy-cur':'')+'">'+wxSpan(dy.g)+'<br>'+wxSpan(dy.z)+'</span><br><span class="cr-dy-ss">'+dss+'</span></td>';
    }
    h+='</tr>';
    // 流年: 每行显示最多年份的流年
    let dyCount=Math.min(bzdy.dayun.length,10);
    let lns=bzdy.liuNian||[];
    h+='<tr class="cr-dy-liu"><td class="cr-dy-lbl cr-dy-lbl-v" rowspan="10">流年</td>';
    for(let di=0;di<dyCount;di++){let ln0=lns[di*10]; let isCL0=ln0&&ln0.year===curY; h+='<td>'+(isCL0?'<span class="cr-dy-cur">':'')+wxSpan(ln0?ln0.g:'')+wxSpan(ln0?ln0.z:'')+(isCL0?'</span>':'')+'</td>';}
    h+='</tr>';
    for(let r=1;r<10;r++){
      h+='<tr class="cr-dy-liu">';
      for(let di=0;di<dyCount;di++){
        let ln=lns[di*10+r]; let isCurLn=ln&&ln.year===curY;
        h+='<td>'+(isCurLn?'<span class="cr-dy-cur">':'')+wxSpan(ln?ln.g:'')+wxSpan(ln?ln.z:'')+(isCurLn?'</span>':'')+'</td>';
      }
      h+='</tr>';
    }
    h+='</table>';
  }catch(e){ window._logErr && window._logErr('renderChuanRen', e && e.message); }

  // ====== CSS ======
  h+='<style>'+
  // 宽度交给 #mainDIV 统一约束, 与主盘/九宫等宽
  '.cr-grid-wrap{position:relative;margin:0 auto;width:100%}'+
  '.cr-content table{width:100%;border-collapse:collapse}'+
  '.cr-pan{border:solid 1px var(--c-border);width:100%;border-collapse:collapse;table-layout:fixed!important}'+
  // 关键: 这两条必须用 #pan.cr-pan 提高特异性。全局规则 #pan .panItem(1,1,0)
  // 与 #pan td(1,0,1) 带 !important, 会压掉原先的 .cr-pan 写法(0,2,0/0,1,1),
  // 导致宫格沿用 26px 字/40px 行高与 14px 内边距 —— 内容把格子顶高, 失去正方形。
  // 宫格字号/行高一律交给 --pan-fs-sm / --pan-lh-sm(yinpan_app.css 已按变量声明)。
  // 这里原先写死 `font-size:14px!important;line-height:22px!important`, 与 CSS 里
  // 那条规则特异性相同(1,2,0)又同带 !important, 而本 <style> 由 innerHTML 注入 body、
  // 层叠顺序更靠后 —— 结果窄屏设的 --pan-fs-sm:13px 被彻底压掉, 变量形同虚设。
  '#pan.cr-pan td{vertical-align:top!important;padding-left:4px!important;padding-right:4px!important;padding-top:6px!important;padding-bottom:6px!important}'+
  // 穿壬外圈标签
  '.cr-card{position:absolute;display:flex;flex-direction:column;align-items:center;background:var(--c-bg);padding:4px 6px;text-align:center;white-space:nowrap;font-size:12px}'+
  // 外圈四层(天干/将神/贵神/十二建除)尺寸必须一致 —— 它们是并排的一组, 大小不齐
  // 会显得错落。颜色由 JS 按五行写在内层 <font> 上, 这里只留无着色时的兜底色。
  '.cr-ctg,.cr-ctj,.cr-czhi,.cr-cdu{font-size:var(--pan-fs-sm);line-height:1.15}'+
  '.cr-ctg{color:var(--c-text);font-weight:bold}'+
  '.cr-ctj{color:var(--c-gold)}'+
  '.cr-czhi{color:var(--c-text)}'+
  '.cr-ckw{color:var(--c-po);font-size:10px}'+
  '.cr-cdu{color:var(--c-text-2);display:flex;flex-direction:column}'+
  '.cr-hrow{display:flex;flex-direction:row;align-items:center;gap:3px;white-space:nowrap}'+
  '.cr-sanchuan{display:flex;justify-content:center;margin-top:40px}'+
  '.cr-sc-tbl{border-collapse:collapse;font-size:14px}'+
  '.cr-sc-tbl td{padding:2px 10px;text-align:center}'+
  '.cr-sc-lb{color:var(--c-theme);font-size:12px;text-align:right!important}'+
  // 三列颜色一律由 JS 按五行写在内层 <font> 上(原先天干列写死红色, 与五行色打架)
  '.cr-sc-tg,.cr-sc-dz,.cr-sc-ex{font-size:14px;font-weight:bold}'+
  '.cr-bz-tbl{width:100%;margin:0 auto;border-collapse:collapse;font-size:12px}'+
  '.cr-bz-tbl td{border:1px solid var(--c-border);text-align:center;vertical-align:middle;padding:4px 2px;line-height:1.3}'+
  '.cr-bz-tbl tr td:first-child{color:var(--c-gold);font-weight:500;font-size:11px}'+
  '.cr-bz-zao td{font-size:18px;font-weight:bold;padding:2px 1px!important}'+
  '.cr-bz-cg td{font-size:13px;padding:2px 1px!important}'+
  '.cr-bz-cgss{font-size:10px;color:var(--c-text-3)}'+
  '.cr-dy-tbl{width:100%;margin:0 auto;border-collapse:collapse;border:1px solid var(--c-border);border-top:none}'+
  '.cr-dy-tbl td{border:1px solid var(--c-border);text-align:center;vertical-align:middle;padding:4px 2px;font-size:14px;line-height:1.35}'+
  '.cr-dy-lbl{color:var(--c-gold);font-weight:500;font-size:14px!important}'+
  '.cr-dy-lbl-v{width:24px;writing-mode:vertical-rl;letter-spacing:4px}'+
  '.cr-dy-hdr td:not(.cr-dy-lbl-v){color:var(--c-gold);font-size:10px!important}'+
  '.cr-dy-gz{font-size:14px}'+
  '.cr-dy-ss{font-size:11px;color:var(--c-text-3);display:block;margin-top:0}'+
  '.cr-dy-cur{color:var(--c-po);font-weight:bold}'+
  '.cr-dy-liu td{font-size:12px}'+
  '.cr-dy-info-row td{font-size:14px;padding:6px;text-align:center;color:var(--c-text)}'+
  '.cr-dy-info-row td{}'+
  // 窄屏(手机)是穿壬最吃紧的场合: 外圈 12 张卡片 + 九宫要挤在 400px 里。
  // 此前九宫只剩 182px(每格 60px), 而格内三行文字需要 88~116px, 宫格被内容
  // 顶成竖长方形(宽高比 0.44)。宽度问题由 .cr-content 的补偿式宽度解决(见
  // yinpan_app.css), 这里解决"格内内容"与"卡片体积":
  //   - 上下内边距与左右取齐(padding:2px), 否则 td 高比宽多 4px, 正方形被破坏
  //   - 字号 13px/行高 20px: 三行共 60px, 放得进 88px 的宫格, 且手机 dpr=3 下可读
  //   - 卡片缩到 10px, 左右卡片各 64px, 正好落在九宫两侧 68px 的空档里
  // 宫格与整组外圈标签共用 --pan-fs-sm: 两者同号才整齐。
  // 注意系统字体缩放(本机 fontScale 1.25)会放大 font-size 但不放大 calc 里的
  // px, 所以卡片实际宽度比按字号推算的更大, .cr-content 的扣除值是按真机实测
  // 留的余量, 不能简单写成 calc(100% - 4*var(--pan-fs-sm))。
  '@media(max-width:500px){'+
  '.cr-grid-wrap{--pan-fs-sm:13px;--pan-lh-sm:20px}'+
  '#pan.cr-pan td{padding:2px!important}'+
  '.cr-card{font-size:10px;line-height:13px;padding:1px 2px}'+
  '.cr-ckw{font-size:8px}'+
  '}'+
  // 500~700px 的窄窗口: 宫格仍有富余, 字号回到 14px —— 同样只改变量, 不写死字号
  '@media(min-width:501px) and (max-width:700px){.cr-grid-wrap{--pan-fs-sm:14px;--pan-lh-sm:22px}}'+
  '</style>';

  if(containerId){let el=document.getElementById(containerId);if(el)el.innerHTML=h;else return h;}
  return h;
};

// === 穿壬输入面板 ===
window.renderChuanRenInputs= d => {
  d=d||{};
  let GZ=[];for(let i=0;i<60;i++)GZ.push(G[i%10]+Z[i%12]);
  let selYS=d.yongShen||'',selGR=d.guiRen||'阳贵',selNM=d.nianMing||'子',selGD=d.gender||'男';
  let selZJ=d.ziJu||'自动',selSK=d.shiKe||'时家';
  let ZJ_OPTS=['自动','阳1','阳2','阳3','阳4','阳5','阳6','阳7','阳8','阳9','阴1','阴2','阴3','阴4','阴5','阴6','阴7','阴8','阴9'];
  let h='<div class="cr-input-panel">';
  h+='<table style="width:100%;border-collapse:collapse"><tr>';
  h+='<td style="width:40px;font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">用神</td>';
  h+='<td><select id="crYongShen" class="sel-date" style="width:100%" onchange="doChuanRen()">';
  GZ.forEach(gz => {h+='<option value="'+gz+'"'+(gz===selYS?' selected':'')+'>'+gz+'</option>';});
  h+='</select></td>';
  h+='<td style="width:40px;font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">贵人</td>';
  h+='<td><select id="crGuiRen" class="sel-date" style="width:100%" onchange="doChuanRen()"><option value="阳贵"'+(selGR==='阳贵'?' selected':'')+'>阳贵</option><option value="阴贵"'+(selGR==='阴贵'?' selected':'')+'>阴贵</option></select></td>';
  h+='</tr><tr>';
  h+='<td style="font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">年命</td>';
  h+='<td><select id="crNianMing" class="sel-date" style="width:100%" onchange="doChuanRen()">';
  Z12.forEach((z, i) => {h+='<option value="'+z+'"'+(z===selNM?' selected':'')+'>'+z+'</option>';});
  h+='</select></td>';
  h+='<td style="font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">性别</td>';
  h+='<td><select id="crGender" class="sel-date" style="width:100%" onchange="doChuanRen()"><option value="男"'+(selGD==='男'?' selected':'')+'>男</option><option value="女"'+(selGD==='女'?' selected':'')+'>女</option></select></td>';
  h+='</tr><tr>';
  h+='<td style="font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">自选</td>';
  h+='<td><select id="crZiJu" class="sel-date" style="width:100%" onchange="doChuanRen()">';
  ZJ_OPTS.forEach(z => {h+='<option value="'+z+'"'+(z===selZJ?' selected':'')+'>'+z+'</option>';});
  h+='</select></td>';
  h+='<td style="font-size:13px;color:var(--c-text-2);text-align:right;padding-right:4px">时刻</td>';
  h+='<td><select id="crShiKe" class="sel-date" style="width:100%" onchange="doChuanRen()"><option value="时家"'+(selSK==='时家'?' selected':'')+'>时家</option><option value="刻家"'+(selSK==='刻家'?' selected':'')+'>刻家</option></select></td>';
  h+='</tr></table>';
  h+='</div>';
  return h;
};
})();