import { useEffect, useMemo, useState } from 'preact/hooks';
import { dailyGua } from '../lib/dailyGua';
import { type Bazi, type Birth, dateKey, getDayInfo } from '../lib/lunar';
import { Icon, Modal } from './ui';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

interface Cell {
  key: string;
  d: number;
  gua: string; // 这一天的卦名
  chong: boolean; // 这一天的日支冲这个人的生肖
}

function buildMonth(y: number, m: number, birth: Birth, yearZhi: string): { blanks: number; cells: Cell[] } {
  const days = new Date(y, m, 0).getDate();
  const cells: Cell[] = [];
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m - 1, d);
    const key = dateKey(date);
    cells.push({ key, d, gua: dailyGua(birth, key).name, chong: getDayInfo(date).chongZhi === yearZhi });
  }
  // 一周从星期一排起
  return { blanks: (new Date(y, m - 1, 1).getDay() + 6) % 7, cells };
}

/**
 * 月历：一整个月一眼看完——每天是什么卦、哪几天冲这个人的生肖；点任何一天，首页就换成那一天。
 */
export function MonthSheet(props: {
  open: boolean;
  onClose: () => void;
  todayKey: string;
  selectedKey: string;
  birth: Birth;
  bazi: Bazi;
  onPick: (key: string) => void;
}) {
  const [ym, setYm] = useState(() => props.selectedKey.slice(0, 7));
  // 每次打开，回到正在看的那一天所在的月份
  useEffect(() => {
    if (props.open) setYm(props.selectedKey.slice(0, 7));
  }, [props.open]);

  const [y, m] = ym.split('-').map(Number);
  const month = useMemo(
    () => (props.open ? buildMonth(y, m, props.birth, props.bazi.yearZhi) : { blanks: 0, cells: [] }),
    [props.open, ym, props.birth, props.bazi.yearZhi],
  );
  const move = (step: number) => {
    const d = new Date(y, m - 1 + step, 1);
    if (d.getFullYear() < 1901 || d.getFullYear() > 2099) return;
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <Modal open={props.open} onClose={props.onClose} title="月历">
      <div class="month-nav">
        <button class="icon-btn" aria-label="上个月" onClick={() => move(-1)}>
          <Icon name="back" />
        </button>
        <b aria-live="polite">
          {y}年{m}月
        </b>
        <button class="icon-btn" aria-label="下个月" onClick={() => move(1)}>
          <Icon name="chevron" />
        </button>
      </div>
      <div class="month-grid">
        {WEEK.map((w) => (
          <span class="wk" key={w} aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: month.blanks }, (_, i) => <span key={`b${i}`} />)}
        {month.cells.map((c) => (
          <button
            key={c.key}
            class={`mday ${c.key === props.todayKey ? 'today' : ''} ${c.key === props.selectedKey ? 'sel' : ''} ${c.chong ? 'chong' : ''}`}
            aria-label={`${m}月${c.d}日，${c.gua}卦${c.chong ? `，冲${props.bazi.shengxiao}` : ''}`}
            aria-current={c.key === props.selectedKey ? 'date' : undefined}
            onClick={() => props.onPick(c.key)}
          >
            <b>{c.d}</b>
            <span>{c.gua}</span>
          </button>
        ))}
      </div>
      <p class="aside">红色的日子冲{props.bazi.shengxiao}</p>
    </Modal>
  );
}
