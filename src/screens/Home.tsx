import { useEffect, useMemo, useState } from 'preact/hooks';
import { GuaFig } from '../components/GuaFig';
import { CardSheet } from '../components/CardSheet';
import { MonthSheet } from '../components/MonthSheet';
import { Icon, Modal } from '../components/ui';
import { renderFortuneCard } from '../lib/card';
import type { DailyGua } from '../lib/dailyGua';
import type { DailyFortune } from '../lib/fortune';
import { type Bazi, type DayInfo, getHours, hourIndex, parseKey } from '../lib/lunar';
import { cnNumber } from '../lib/qian';
import { type JournalEntry, type Profile, categoryLabel } from '../lib/storage';

interface Props {
  /** 现在看的这个人：自己，或切换到的某位家人。 */
  profile: Profile;
  bazi: Bazi;
  /** 正在看的日子：平常是今天，也可以从月历点到别的日子。 */
  day: DayInfo;
  isToday: boolean;
  todayKey: string;
  fortune: DailyFortune;
  gua: DailyGua;
  drawLabel: string;
  onDraw: () => void;
  /** 换一天看；null 为回到今天。 */
  onPickDay: (key: string | null) => void;
  /** 可以切换的人（自己排第一）；只有自己时不显示切换。 */
  people: { id: string; nickname: string }[];
  activeId: string;
  onSwitch: (id: string) => void;
  /** 今天该回看的签。 */
  due: JournalEntry[];
  onReview: (id: string, answer: 'yes' | 'no' | 'later') => void;
}

export function Home({ profile, bazi, day, isToday, todayKey, fortune: f, gua, drawLabel, onDraw, onPickDay, people, activeId, onSwitch, due, onReview }: Props) {
  const [cardOpen, setCardOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);

  // ---- 时辰：每分钟看一次现在走到哪一格 ----
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setClock(new Date());
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  const nowIdx = isToday ? hourIndex(clock) : -1;
  const lateZi = isToday && clock.getHours() === 23;
  const hours = useMemo(() => getHours(parseKey(day.key), lateZi), [day.key, lateZi]);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [day.key]); // 换一天，回到预设
  const shownIdx = picked ?? (nowIdx >= 0 ? nowIdx : null);
  const hour = shownIdx === null ? null : hours[shownIdx];

  const [, , month, date] = day.solarText.match(/(\d+)年(\d+)月(\d+)日/)!;

  return (
    <section class="screen-body">
      <header class="cover">
        <div class="cover-top">
          <p class="cover-eyebrow">
            {day.weekday}
            {day.jieqi && `・${day.jieqi}`}
          </p>
          <div class="cover-tools">
            {people.length > 1 && (
              <button class="who" aria-label={`现在看的是${profile.nickname}，换一个人`} onClick={() => setWhoOpen(true)}>
                {profile.nickname}
                <Icon name="down" size={14} />
              </button>
            )}
            <button class="icon-btn" aria-label="月历" onClick={() => setMonthOpen(true)}>
              <Icon name="calendar" size={20} />
            </button>
          </div>
        </div>
        <h1 class="cover-title">{month}月{date}日</h1>
        <p class="cover-sub">
          农历{day.lunarText}・{day.lunarYearGz}{day.lunarYearSx}年・{day.dayGz}日
        </p>
        {!isToday && (
          <button class="link back-today" onClick={() => onPickDay(null)}>
            <Icon name="back" size={16} /> 回到今天
          </button>
        )}
        {f.chong && (
          <p class="cover-note" role="note">
            <b>{isToday ? f.chong.title : f.chong.title.replace('今日', '这天')}</b>
            {f.chong.text}
          </p>
        )}
        {isToday && due.length > 0 && (
          <div class="review" role="group" aria-label="回看">
            <p>
              {md(due[0].dateKey)}
              {due[0].who ? `替${due[0].who}` : ''}问的{categoryLabel(due[0].category)}（第{cnNumber(due[0].qianNo)}签），应验了吗？
            </p>
            <div class="review-acts">
              <button onClick={() => onReview(due[0].id, 'yes')}>应验</button>
              <button onClick={() => onReview(due[0].id, 'no')}>未应验</button>
              <button onClick={() => onReview(due[0].id, 'later')}>再等等</button>
            </div>
          </div>
        )}
      </header>

      <section class="sec">
        <p class="eyebrow">{f.god}日</p>
        <h2 class="theme">{f.theme}</h2>
        <p>{f.line}</p>
      </section>

      <section class="sec">
        <div class="gua-row">
          <GuaFig lines={gua.lines} moving={gua.moving} label={`今日一卦：${gua.full}，动爻${gua.yao.label}`} />
          <div>
            <h2 class="theme">{gua.full}</h2>
            <p class="lead">{gua.theme}</p>
          </div>
        </div>
        <p>{gua.text}</p>
        <p class="yao" lang="zh-Hans">
          <b>{gua.yao.label}</b>
          {gua.yao.text}
        </p>
        <p>{gua.yao.reading}</p>
        <p class="soft">{gua.tiyongText}</p>
        <p class="soft">{gua.changeText}</p>
      </section>

      <section class="sec">
        <dl class="yiji-list">
          <div>
            <dt>宜</dt>
            <dd>{day.yi.map((w) => <span key={w}>{w}</span>)}</dd>
          </div>
          <div>
            <dt>忌</dt>
            <dd>{day.ji.map((w) => <span key={w}>{w}</span>)}</dd>
          </div>
        </dl>
      </section>

      {/* 十二时辰：黄道为吉、黑道为凶；看今天时标出现在走到哪一格，点任何一格看那个时辰 */}
      <section class="sec">
        <div class="hour-grid" role="group" aria-label="十二时辰">
          {hours.map((h, i) => {
            const chong = h.chongSx === bazi.shengxiao;
            return (
              <button
                key={h.zhi}
                class={`hour ${i === nowIdx ? 'now' : ''} ${i === shownIdx ? 'on' : ''} ${chong ? 'chong' : h.lucky ? 'ji' : 'xiong'}`}
                aria-label={`${h.zhi}时，${h.lucky ? '吉' : '凶'}${chong ? `，冲${bazi.shengxiao}` : ''}${i === nowIdx ? '，现在' : ''}`}
                aria-pressed={i === shownIdx}
                onClick={() => setPicked(i)}
              >
                <b>{h.zhi}</b>
                <span>{chong ? '冲' : h.lucky ? '吉' : '凶'}</span>
              </button>
            );
          })}
        </div>
        {hour && (
          <div class="hour-detail">
            <p class="hour-line">
              <b>{hour.zhi}时</b>
              {hour.range}・{hour.gz}・{hour.god}（{hour.type}）
              {hour.chongSx === bazi.shengxiao && `・冲${bazi.shengxiao}`}
            </p>
            <dl class="yiji-list">
              <div>
                <dt>宜</dt>
                <dd>{hour.yi.length ? hour.yi.slice(0, 8).map((w) => <span key={w}>{w}</span>) : <span>无</span>}</dd>
              </div>
              <div>
                <dt>忌</dt>
                <dd>{hour.ji.length ? hour.ji.slice(0, 8).map((w) => <span key={w}>{w}</span>) : <span>无</span>}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      <div class="actions">
        <button class="btn primary big" onClick={onDraw}>{drawLabel}</button>
        {isToday && (
          <button class="btn quiet big" onClick={() => setCardOpen(true)}>
            <Icon name="image" size={18} /> 生成今日运势卡片
          </button>
        )}
      </div>

      <MonthSheet
        open={monthOpen}
        onClose={() => setMonthOpen(false)}
        todayKey={todayKey}
        selectedKey={day.key}
        birth={profile.birth}
        bazi={bazi}
        onPick={(key) => {
          setMonthOpen(false);
          onPickDay(key === todayKey ? null : key);
          window.scrollTo({ top: 0 });
        }}
      />

      <Modal open={whoOpen} onClose={() => setWhoOpen(false)} title="看谁的">
        <div class="who-list" role="radiogroup" aria-label="看谁的">
          {people.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={p.id === activeId}
              class={`ask ${p.id === activeId ? 'on' : ''}`}
              onClick={() => {
                onSwitch(p.id);
                setWhoOpen(false);
              }}
            >
              {p.nickname}
            </button>
          ))}
        </div>
      </Modal>

      <CardSheet
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        title="今日运势卡片"
        filename={`清吉-${day.key}.png`}
        render={() => renderFortuneCard({ nickname: profile.nickname, day, fortune: f, gua })}
      />
    </section>
  );
}

/** 2026-11-17 → 11月17日 */
function md(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${m}月${d}日`;
}
