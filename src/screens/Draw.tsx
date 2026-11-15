import { useEffect, useRef, useState } from 'preact/hooks';
import { Drawers, Knots } from '../components/Drawers';
import { JiaoThrow } from '../components/Jiao';
import { QianTong } from '../components/QianTong';
import { QianView } from '../components/QianView';
import { Footer, Icon, ScreenHeader } from '../components/ui';
import { playBell, playLow, playRattle, playStickDrop, unlockAudio } from '../lib/audio';
import type { DailyFortune } from '../lib/fortune';
import { vibrate } from '../lib/haptics';
import type { JiaoResult, Toss } from '../lib/jiao';
import { type Bazi, type DayInfo, HOURS } from '../lib/lunar';
import { listenShake, motionSupport, requestMotionPermission } from '../lib/motion';
import { personalReading } from '../lib/personal';
import { QIAN_COUNT, cnNumber, getQian, gradeTone } from '../lib/qian';
import { randInt } from '../lib/random';
import { CATEGORIES, type CategoryId, type JournalEntry, type Profile, type Settings, categoryLabel, newId } from '../lib/storage';

type Step = 'category' | 'report' | 'ask' | 'shake' | 'confirm' | 'drawer' | 'result';
const STEPS: { id: Step; label: string }[] = [
  { id: 'category', label: '问事' },
  { id: 'report', label: '禀告' },
  { id: 'ask', label: '请示' },
  { id: 'shake', label: '摇签' },
  { id: 'confirm', label: '确认' },
  { id: 'drawer', label: '取签' },
  { id: 'result', label: '解签' },
];

const SHAKE_GOAL = 6;

interface Props {
  active: boolean;
  profile: Profile;
  bazi: Bazi;
  day: DayInfo;
  fortune: DailyFortune;
  settings: Settings;
  onSave: (e: JournalEntry) => void;
  /** 凶签系在架上、不带走：这一笔不列在签本，改放到签架。 */
  onTie: (id: string) => void;
  onOpenJournal: (view: 'book' | 'rack') => void;
}

export function Draw(props: Props) {
  const { profile, bazi, day, settings } = props;
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [question, setQuestion] = useState('');
  const [askResult, setAskResult] = useState<JiaoResult | null>(null);
  const [qianNo, setQianNo] = useState<number | null>(null);
  const [dropKey, setDropKey] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [confirmCount, setConfirmCount] = useState(0);
  const [confirmFail, setConfirmFail] = useState<JiaoResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [tied, setTied] = useState(false);
  // 掷筊确认要几个圣筊；0 是不掷筊，摇到哪支取哪支
  const needed = settings.confirmMode;
  const steps = needed === 0 ? STEPS.filter((s) => s.id !== 'ask' && s.id !== 'confirm') : STEPS;

  // ---- 摇签 ----
  const support = motionSupport();
  const [motionOn, setMotionOn] = useState(support === 'available');
  const [motionActive, setMotionActive] = useState(false);
  const [permDenied, setPermDenied] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const energy = useRef(0);
  const dropping = useRef(false);
  const shakeOff = useRef<number>();
  const holdTimer = useRef<number>();
  const topRef = useRef<HTMLDivElement>(null);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const go = (s: Step) => {
    setStep(s);
    requestAnimationFrame(scrollTop);
  };

  const addEnergy = (n: number) => {
    if (dropping.current) return;
    energy.current += n;
    setProgress(Math.min(1, energy.current / SHAKE_GOAL));
    if (energy.current >= SHAKE_GOAL) drop();
  };

  const drop = () => {
    if (dropping.current) return;
    dropping.current = true;
    stopHold();
    setShaking(false);
    const no = randInt(QIAN_COUNT) + 1;
    setQianNo(no);
    setDropKey((k) => k + 1);
    setTimeout(() => {
      playStickDrop();
      vibrate(70);
    }, 880);
  };

  // 只有真的抽出签时才往下走：要掷筊就去确认，不掷筊就直接去签柜
  const onDropDone = () => {
    if (!dropping.current) return;
    if (needed === 0) setTimeout(() => go('drawer'), 700);
    else go('confirm');
  };

  // 摇动侦测：只在摇签步骤、且画面在前景时监听
  useEffect(() => {
    if (!props.active || step !== 'shake' || !motionOn) return;
    return listenShake(
      (intensity) => {
        if (dropping.current) return;
        playRattle(intensity);
        setShaking(true);
        clearTimeout(shakeOff.current);
        shakeOff.current = window.setTimeout(() => setShaking(false), 380);
        addEnergy(intensity);
      },
      () => setMotionActive(true),
    );
  }, [props.active, step, motionOn, attempt]);

  const enableMotion = async () => {
    unlockAudio();
    const ok = await requestMotionPermission();
    setMotionOn(ok);
    setPermDenied(!ok);
  };

  const startHold = (e: PointerEvent) => {
    e.preventDefault();
    if (dropping.current) return;
    unlockAudio();
    setShaking(true);
    clearInterval(holdTimer.current);
    holdTimer.current = window.setInterval(() => {
      playRattle(0.8);
      addEnergy(0.5);
    }, 130);
  };
  const stopHold = () => {
    clearInterval(holdTimer.current);
    holdTimer.current = undefined;
    if (!dropping.current) setShaking(false);
  };
  useEffect(() => () => { stopHold(); clearTimeout(shakeOff.current); }, []);
  useEffect(() => { if (!props.active) stopHold(); }, [props.active]);

  // ---- 掷筊 ----
  const onAsk = (t: Toss) => {
    setAskResult(t.result);
    if (t.result === 'sheng') playBell(523);
    else playLow();
  };

  const onConfirm = (t: Toss) => {
    if (t.result === 'sheng') {
      const c = confirmCount + 1;
      setConfirmCount(c);
      if (c >= needed) {
        setTimeout(() => {
          playBell(523);
          go('drawer');
        }, 900);
      }
    } else {
      setConfirmFail(t.result);
      playLow();
    }
  };

  const putBack = () => {
    setConfirmFail(null);
    setConfirmCount(0);
    setQianNo(null);
    setProgress(0);
    energy.current = 0;
    dropping.current = false;
    setDropKey(0);
    setAttempt((a) => a + 1);
    go('shake');
  };

  // 拉开抽屉，取出签纸
  const onDrawerOpen = () => {
    playBell();
    vibrate([40, 60, 120]);
    go('result');
  };

  // ---- 存入签本 ----
  useEffect(() => {
    if (step !== 'result' || !qianNo || !category || savedId) return;
    const q = getQian(qianNo);
    const entry: JournalEntry = {
      id: newId(),
      ts: Date.now(),
      dateKey: day.key,
      solarText: day.solarText,
      lunarText: `${day.lunarYearGz}年${day.lunarText}`,
      dayGz: day.dayGz,
      category,
      question: question.trim(),
      qianNo,
      qianGz: q.ganzhi,
      grade: q.grade,
      outcome: 'pending',
      note: '',
    };
    props.onSave(entry);
    setSavedId(entry.id);
  }, [step]);

  // 凶签系在架上：留在签架，不带回签本
  const tie = () => {
    if (savedId) props.onTie(savedId);
    setTied(true);
    playLow();
    vibrate(40);
    requestAnimationFrame(scrollTop);
  };

  const restart = () => {
    setCategory(null);
    setQuestion('');
    setAskResult(null);
    setQianNo(null);
    setConfirmCount(0);
    setConfirmFail(null);
    setSavedId(null);
    setTied(false);
    setProgress(0);
    energy.current = 0;
    dropping.current = false;
    setDropKey(0);
    setAttempt((a) => a + 1);
    go('category');
  };

  const stepIdx = steps.findIndex((s) => s.id === step);
  const hourLabel = profile.birth.hour ? HOURS.find((h) => h.key === profile.birth.hour)?.label : '';
  const qian = qianNo ? getQian(qianNo) : null;

  return (
    <section class="screen-body">
      <div ref={topRef} />
      <ScreenHeader title={needed === 0 ? '求签' : '掷筊求签'} sub="诚心正意，一事一问" />
      <ol class="steps" aria-label="求签步骤">
        {steps.map((s, i) => (
          <li key={s.id} class={i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''} aria-current={i === stepIdx ? 'step' : undefined}>
            {s.label}
          </li>
        ))}
      </ol>

      {step === 'category' && (
        <div class="card">
          <h2 class="card-title">想问哪一方面？</h2>
          <div class="cat-grid" role="radiogroup" aria-label="问事类别">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                role="radio"
                aria-checked={category === c.id}
                class={`cat ${category === c.id ? 'on' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label class="field">
            <span>想问的事</span>
            <textarea
              rows={3}
              maxLength={100}
              value={question}
              placeholder={CATEGORIES.find((c) => c.id === category)?.ask ? `例如：${CATEGORIES.find((c) => c.id === category)!.ask}` : '写下来，或在心里默念'}
              onInput={(e) => setQuestion((e.target as HTMLTextAreaElement).value)}
            />
          </label>
          <button class="btn primary big" disabled={!category} onClick={() => { unlockAudio(); go('report'); }}>
            下一步
          </button>
        </div>
      )}

      {step === 'report' && category && (
        <div class="card report">
          <h2 class="card-title">禀告</h2>
          <div class="report-text">
            <p>弟子　<b>{profile.nickname}</b></p>
            <p>
              公历{profile.birth.y}年{profile.birth.m}月{profile.birth.d}日{hourLabel ? `${hourLabel}` : ''}生
              <br />
              农历{bazi.lunarBirth}，属{bazi.shengxiao}
            </p>
            <p>今日{day.solarText}，{day.dayGz}日，诚心祈求指点：</p>
            <p class="ask">
              【{categoryLabel(category)}】{question.trim() || '心中所问之事'}
            </p>
            <p>恳请神明慈悲，赐予灵签，指点迷津。</p>
          </div>
          <div class="row">
            <button class="btn ghost" onClick={() => go('category')}>
              <Icon name="back" /> 修改
            </button>
            <button
              class="btn primary"
              onClick={() => {
                setAskResult(null);
                go(needed === 0 ? 'shake' : 'ask');
              }}
            >
              {needed === 0 ? '摇签' : '掷筊请示'}
            </button>
          </div>
        </div>
      )}

      {step === 'ask' && (
        <div class="card">
          <h2 class="card-title">可否求签？</h2>
          <JiaoThrow onResult={onAsk} label="掷筊" disabled={askResult !== null} />
          {askResult === 'sheng' && (
            <div class="verdict">
              <p>神明应允。</p>
              <button class="btn primary big" onClick={() => go('shake')}>开始摇签</button>
            </div>
          )}
          {askResult && askResult !== 'sheng' && (
            <div class="verdict">
              <p>{askResult === 'xiao' ? '神明笑而不答，换个问法再问。' : '神明未允，想清楚了再问。'}</p>
              <button class="btn primary big" onClick={() => { setAskResult(null); go('category'); }}>
                换个问法
              </button>
            </div>
          )}
        </div>
      )}

      {(step === 'shake' || step === 'confirm') && (
        <div class="card shake-card">
          <h2 class="card-title">{step === 'shake' ? '摇动签筒' : '掷筊确认'}</h2>
          <QianTong key={attempt} shaking={shaking} dropKey={dropKey} onDropDone={onDropDone} />

          {step === 'shake' && (
            <>
              <div class="meter" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></div>
              <button
                class="btn primary big hold"
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onContextMenu={(e) => e.preventDefault()}
              >
                按住摇签
              </button>
              {/* 摇手机是另一种摇法：能用时轻轻带一句，需要授权时给一个不抢眼的入口 */}
              {support === 'needs-permission' && !motionOn && !permDenied && (
                <button class="btn quiet big" onClick={enableMotion}>
                  <Icon name="phone" size={18} /> 改用摇一摇
                </button>
              )}
              {motionOn && motionActive && <p class="aside">也可以直接摇手机</p>}
              {permDenied && <p class="aside">没有取得动作权限，按住按钮就好</p>}
            </>
          )}

          {step === 'confirm' && qian && (
            <>
              <div class="stick-card">
                <span class="stick-no">第{cnNumber(qian.no)}签</span>
                <span class="stick-gz">{qian.ganzhi}</span>
              </div>
              {needed > 1 && (
                <div class="dots" aria-label={`已掷出 ${confirmCount} 个圣筊，需要 ${needed} 个`}>
                  {Array.from({ length: needed }, (_, i) => <i key={i} class={i < confirmCount ? 'on' : ''} />)}
                </div>
              )}
              <JiaoThrow key={`c${attempt}`} onResult={onConfirm} disabled={confirmFail !== null || confirmCount >= needed} label={confirmCount ? `再掷（第 ${confirmCount + 1} 次）` : '掷筊确认'} />
              {confirmCount === 0 && !confirmFail && <p class="aside">{needed === 1 ? '掷出圣筊，才是这一支' : '连续三个圣筊，才是这一支'}</p>}
              {confirmCount >= needed && <p class="verdict center">就是这一支。</p>}
              {confirmFail && (
                <div class="verdict">
                  <p>不是这一支。</p>
                  <button class="btn primary big" onClick={putBack}>放回签筒重抽</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 'drawer' && qian && (
        <div class="card">
          <h2 class="card-title">取签</h2>
          <div class="stick-card">
            <span class="stick-no">第{cnNumber(qian.no)}签</span>
            <span class="stick-gz">{qian.ganzhi}</span>
          </div>
          <p class="aside">拉开同号的抽屉</p>
          <Drawers key={`d${attempt}`} no={qian.no} total={QIAN_COUNT} onOpen={onDrawerOpen} />
        </div>
      )}

      {step === 'result' && qian && category && !tied && (
        <>
          <div class="sheet">
            <QianView qian={qian} category={category} personal={personalReading(qian, bazi, day, props.fortune)} />
          </div>
          <div class="actions">
            <button class="btn primary big" onClick={() => props.onOpenJournal('book')}>查看签本</button>
            <button class="btn ghost big" onClick={restart}>再求一签</button>
            {gradeTone(qian.grade) === 'bad' && (
              <button class="btn quiet big" onClick={tie}>系在架上，不带走</button>
            )}
          </div>
        </>
      )}

      {step === 'result' && tied && (
        <div class="card tied">
          <Knots />
          <h2 class="card-title">系好了</h2>
          <p>凶签留在签架上，不带回去。往后谨慎些，事情会转。</p>
          <button class="btn primary big" onClick={restart}>再求一签</button>
          <button class="btn quiet big" onClick={() => props.onOpenJournal('rack')}>去看签架</button>
        </div>
      )}

      {/* “结果仅供参考”只在签文出来的时候放在最下面 */}
      {step === 'result' && !tied && <Footer />}
    </section>
  );
}
