import { useMemo, useState } from 'preact/hooks';
import { type AskMode, ModeSwitch } from '../components/AskPicker';
import { Terms } from '../components/Terms';
import { Icon, ScreenHeader } from '../components/ui';
import { type Bazi, addDays } from '../lib/lunar';
import { ACTIVITIES, type Activity, pickDays } from '../lib/zeri';

const STEP = 30; // 一次多看几天
const MAX = 180;
const NEAR = ['今天', '明天', '后天'];

interface Props {
  bazi: Bazi;
  todayKey: string;
  /** 替家人挑日子时，那位家人的称呼。 */
  who?: string;
  mode: AskMode;
  onMode: (m: AskMode) => void;
  /** 点一天：首页换成那一天。 */
  onShowDay: (key: string) => void;
}

/** 择日：挑一件事，列出接下来合适的日子；点一天回首页看那天的运势与时辰。 */
export function ZeRi(props: Props) {
  const [act, setAct] = useState<Activity | null>(null);
  const [range, setRange] = useState(STEP);
  const list = useMemo(
    () => (act ? pickDays(props.todayKey, range, act, props.bazi.shengxiao) : []),
    [act, range, props.todayKey, props.bazi.shengxiao],
  );
  const near = (key: string) => [0, 1, 2].find((i) => addDays(props.todayKey, i) === key);

  return (
    <section class="screen-body">
      <ScreenHeader title="择日" sub={props.who ? `替${props.who}挑日子` : '挑一件事，看哪天合适'} />
      <ModeSwitch mode={props.mode} onChange={props.onMode} />

      <div class="card">
        <h2 class="card-title">想办什么事？</h2>
        <div class="cat-grid" role="radiogroup" aria-label="要办的事">
          {ACTIVITIES.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={act?.id === a.id}
              class={`cat ${act?.id === a.id ? 'on' : ''}`}
              onClick={() => {
                setAct(a);
                setRange(STEP);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {act && (
        <section class="zeri" aria-live="polite">
          <p class="zeri-head">
            接下来 {range} 天，适合{act.label}的有 <b>{list.length}</b> 天
          </p>
          {list.length > 0 && (
            <ol class="zeri-list">
              {list.map(({ day, hours }) => {
                const [, m, d] = day.key.split('-').map(Number);
                const n = near(day.key);
                return (
                  <li key={day.key}>
                    <button onClick={() => props.onShowDay(day.key)} aria-label={`${m}月${d}日，${day.weekday}，看这天的运势`}>
                      <div class="zeri-main">
                        <p class="zeri-date">
                          <b>
                            {m}月{d}日
                          </b>
                          <span>{n !== undefined ? NEAR[n] : day.weekday}</span>
                          {day.huangdao && <em>黄道</em>}
                        </p>
                        <p class="zeri-sub">
                          农历{day.lunarText}・{day.dayGz}日
                          {hours.length > 0 && `・吉时 ${hours.join(' ')}`}
                        </p>
                      </div>
                      <Icon name="chevron" size={18} />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {range < MAX && (
            <button class="btn ghost big" onClick={() => setRange((r) => Math.min(MAX, r + STEP))}>
              再往后看 {STEP} 天
            </button>
          )}
          <p class="aside">已避开冲{props.bazi.shengxiao}的日子・点一天看那天的运势</p>
        </section>
      )}

      <Terms group="zeri" title="这些词是什么意思" />
    </section>
  );
}
