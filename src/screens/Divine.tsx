import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type AskMode, AskPicker, ModeSwitch, nextQuestion } from '../components/AskPicker';
import { DivineView } from '../components/DivineView';
import { Footer, ScreenHeader } from '../components/ui';
import { playBell, playCoins, unlockAudio } from '../lib/audio';
import { type Coin, type LineValue, coinsValue, divine, isMoving, isYang, tossCoins, valueCoins, valueMark, valueName } from '../lib/divine';
import { vibrate } from '../lib/haptics';
import type { DayInfo } from '../lib/lunar';
import { listenShake, motionSupport } from '../lib/motion';
import { REVIEW_CHOICES, reviewDate } from '../lib/review';
import { type CategoryId, type JournalEntry, type Profile, newId } from '../lib/storage';

type Step = 'category' | 'cast' | 'result';
const STEPS: { id: Step; label: string }[] = [
  { id: 'category', label: '问事' },
  { id: 'cast', label: '掷钱' },
  { id: 'result', label: '解卦' },
];
const POS = ['初', '二', '三', '四', '五', '上'];
const CN = ['一', '二', '三', '四', '五', '六'];

interface Props {
  active: boolean;
  profile: Profile;
  /** 替家人起卦时，那位家人的称呼。 */
  who?: string;
  day: DayInfo;
  onSave: (e: JournalEntry) => void;
  onReview: (id: string, reviewAt: string | undefined) => void;
  onOpenJournal: () => void;
  mode: AskMode;
  onMode: (m: AskMode) => void;
}

/** 一枚方孔钱：字面在孔的四周有四个字（这里画成四个小方块），背面素的。 */
function CoinFig(props: { back: boolean }) {
  const mark = (x: number, y: number) => `M${x - 3.5} ${y - 3.5}h7v7h-7zM${x - 3.5} ${y}h7M${x} ${y - 3.5}v7`;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" class={`rim ${props.back ? 'back' : 'face'}`} />
      <circle cx="32" cy="32" r="23" class="ring" />
      <rect x="25" y="25" width="14" height="14" rx="1.5" class="hole" />
      {!props.back && <path class="marks" d={[mark(32, 14.5), mark(32, 49.5), mark(14.5, 32), mark(49.5, 32)].join('')} />}
    </svg>
  );
}

/** 正在起的卦：由下往上，上爻在最上面；还没掷到的爻是虚线。 */
function CastLines(props: { values: LineValue[] }) {
  return (
    <ol class="cast-lines" aria-label={`已掷 ${props.values.length} 次`}>
      {[6, 5, 4, 3, 2, 1].map((pos) => {
        const v = props.values[pos - 1];
        const next = pos === props.values.length + 1;
        return (
          <li key={pos} class={`${v ? 'done' : ''} ${next ? 'next' : ''}`}>
            <span class="pos">{POS[pos - 1]}</span>
            <i class={v ? `${isYang(v) ? 'yang' : 'yin'} ${isMoving(v) ? 'moving' : ''}` : 'blank'} />
            <span class="val">
              {v ? valueName(v) : ''}
              {v && valueMark(v) ? <b>{valueMark(v)}</b> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Divine(props: Props) {
  const { day } = props;
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [question, setQuestion] = useState('');
  const [picking, setPicking] = useState(true);
  const [values, setValues] = useState<LineValue[]>([]);
  const [coins, setCoins] = useState<Coin[]>([1, 1, 1]);
  const [tossKey, setTossKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [reviewDays, setReviewDays] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);
  const busyRef = useRef(false);
  const countRef = useRef(0);

  const go = (s: Step) => {
    setStep(s);
    requestAnimationFrame(() => {
      if ((s === 'category' && !category) || s === 'result') topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else stepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const pickCategory = (id: CategoryId) => {
    setQuestion(nextQuestion(category, id, question));
    setCategory(id);
    setPicking(false);
    requestAnimationFrame(() => stepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // 掷一次：三枚钱抛起、翻转、落下，再把这一爻画上去
  const toss = () => {
    if (busyRef.current || countRef.current >= 6) return;
    busyRef.current = true;
    unlockAudio();
    const c = tossCoins();
    setCoins(c);
    setTossKey((k) => k + 1);
    setBusy(true);
    setTimeout(() => {
      playCoins();
      vibrate([15, 30, 15]);
    }, 560);
    setTimeout(() => {
      countRef.current += 1;
      setValues((vs) => [...vs, coinsValue(c)]);
      busyRef.current = false;
      setBusy(false);
      if (countRef.current === 6) playBell(523);
    }, 980);
  };

  // 摇手机也能掷（不用另外授权的装置，例如 Android）
  useEffect(() => {
    if (!props.active || step !== 'cast' || motionSupport() !== 'available') return;
    let energy = 0;
    return listenShake((intensity) => {
      energy += intensity;
      if (energy >= 2.2) {
        energy = 0;
        toss();
      }
    });
  }, [props.active, step]);

  const d = useMemo(() => (values.length === 6 ? divine(values) : null), [values]);

  // 解卦时记进签本
  useEffect(() => {
    if (step !== 'result' || !d || !category || savedId) return;
    const entry: JournalEntry = {
      id: newId(),
      ts: Date.now(),
      dateKey: day.key,
      solarText: day.solarText,
      lunarText: `${day.lunarYearGz}年${day.lunarText}`,
      dayGz: day.dayGz,
      category,
      question: question.trim(),
      qianNo: 0,
      qianGz: '',
      grade: '',
      outcome: 'pending',
      note: '',
      kind: 'gua',
      cast: values,
      ...(props.who ? { who: props.who } : {}),
    };
    props.onSave(entry);
    setSavedId(entry.id);
  }, [step]);

  const pickReview = (days: number) => {
    const next = reviewDays === days ? null : days;
    setReviewDays(next);
    if (savedId) props.onReview(savedId, next ? reviewDate(day.key, next) : undefined);
  };

  const restart = () => {
    setPicking(true);
    setCategory(null);
    setQuestion('');
    setValues([]);
    setCoins([1, 1, 1]);
    setTossKey(0);
    setSavedId(null);
    setReviewDays(null);
    countRef.current = 0;
    busyRef.current = false;
    setBusy(false);
    go('category');
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const last = values[values.length - 1];

  return (
    <section class="screen-body">
      <div ref={topRef} />
      {step !== 'result' && <ScreenHeader title="起卦" sub="心中默念，掷钱六次" />}
      {step === 'category' && (picking || !category) && <ModeSwitch mode={props.mode} onChange={props.onMode} />}
      <ol class="steps" aria-label="起卦步骤" ref={stepsRef} hidden={step === 'result'}>
        {STEPS.map((s, i) => (
          <li key={s.id} class={i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''} aria-current={i === stepIdx ? 'step' : undefined}>
            {s.label}
          </li>
        ))}
      </ol>

      {step === 'category' && (
        <AskPicker
          category={category}
          question={question}
          picking={picking}
          onCategory={pickCategory}
          onPicking={() => setPicking(true)}
          onQuestion={setQuestion}
          onNext={() => {
            unlockAudio();
            go('cast');
          }}
        />
      )}

      {step === 'cast' && (
        <div class="card cast-card">
          <div class="ask-head">
            <h2 class="card-title">掷钱六次</h2>
            <span class="cast-count">{values.length}／6</span>
          </div>
          <CastLines values={values} />
          <div class="coins" key={tossKey} aria-hidden="true">
            {coins.map((c, i) => (
              <div class={`coin ${tossKey ? 'spin' : ''}`} key={i} style={{ '--i': i }}>
                <CoinFig back={c === 1} />
                <span>{tossKey ? (c === 1 ? '背' : '字') : ''}</span>
              </div>
            ))}
          </div>
          <p class="cast-last" aria-live="polite">
            {last && !busy ? `${POS[values.length - 1]}爻　${valueCoins(last)}，${valueName(last)}` : busy ? ' ' : '心里默念所问之事，由下往上起'}
          </p>
          {values.length < 6 ? (
            <button class="btn primary big" disabled={busy} onClick={toss}>
              掷第{CN[values.length]}次
            </button>
          ) : (
            <button class="btn primary big" onClick={() => go('result')}>
              看卦
            </button>
          )}
        </div>
      )}

      {step === 'result' && d && category && (
        <>
          <div class="sheet">
            <DivineView d={d} category={category} question={question.trim()} />
          </div>
          <div class="review-pick" role="group" aria-label="回看">
            <span>到时候提醒我回来看</span>
            <div>
              {REVIEW_CHOICES.map((c) => (
                <button key={c.days} class={`cat ${reviewDays === c.days ? 'on' : ''}`} aria-pressed={reviewDays === c.days} onClick={() => pickReview(c.days)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div class="actions">
            <button class="btn primary big" onClick={props.onOpenJournal}>查看签本</button>
            <button class="btn ghost big" onClick={restart}>再起一卦</button>
          </div>
          <Footer />
        </>
      )}
    </section>
  );
}
