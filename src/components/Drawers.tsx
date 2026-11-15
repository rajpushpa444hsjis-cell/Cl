import { useState } from 'preact/hooks';
import { playWhoosh } from '../lib/audio';
import { vibrate } from '../lib/haptics';
import { cnNumber } from '../lib/qian';

const COUNT = 12; // 眼前这一面签柜：四列三排

/**
 * 签柜。摇出签号之后，在一格格抽屉里找到同号的那一格拉开，取出签纸（浅草寺等寺院的取签方式）。
 * 显示连号的十二格，自己的号码落在哪一格每次不同；拉错了那一格只会轻轻晃一下。
 */
export function Drawers(props: { no: number; total: number; onOpen: () => void }) {
  // 这里只决定画面上从几号排起，与抽到哪支签无关，所以不用求签的乱数
  const [start] = useState(() => {
    const before = Math.floor(Math.random() * COUNT);
    return Math.min(Math.max(1, props.no - before), props.total - COUNT + 1);
  });
  const [opened, setOpened] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);

  const pull = (n: number) => {
    if (opened) return;
    if (n !== props.no) {
      setWrong(n);
      vibrate(20);
      setTimeout(() => setWrong((w) => (w === n ? null : w)), 380);
      return;
    }
    setOpened(true);
    playWhoosh();
    vibrate([20, 40, 60]);
    setTimeout(props.onOpen, 1050);
  };

  return (
    <div class={`drawers ${opened ? 'done' : ''}`} role="group" aria-label="签柜">
      {Array.from({ length: COUNT }, (_, i) => start + i).map((n) => (
        <button
          key={n}
          class={`drawer ${n === props.no ? 'mine' : ''} ${opened && n === props.no ? 'open' : ''} ${wrong === n ? 'wrong' : ''}`}
          aria-label={`第${cnNumber(n)}签的抽屉`}
          onClick={() => pull(n)}
        >
          <i class="slip" aria-hidden="true" />
          <span>{cnNumber(n)}</span>
        </button>
      ))}
    </div>
  );
}

/** 系在架上的凶签：一条绳，上面系着几张折起的签纸，中间那张是刚系上的。 */
export function Knots() {
  const knot = (x: number, key: string, cls = '') => (
    <g key={key} class={cls} transform={`translate(${x} 0)`}>
      <path d="M-4 30 -11 66 -2 61 0 30Z" />
      <path d="M4 30 10 72 2 64 0 30Z" />
      <rect x="-7" y="18" width="14" height="13" rx="2" />
    </g>
  );
  return (
    <svg class="knots" viewBox="0 0 240 84" aria-hidden="true">
      <line x1="0" y1="24" x2="240" y2="24" />
      {knot(34, 'a', 'old')}
      {knot(74, 'b', 'old')}
      {knot(206, 'c', 'old')}
      {knot(124, 'me', 'me')}
    </svg>
  );
}
