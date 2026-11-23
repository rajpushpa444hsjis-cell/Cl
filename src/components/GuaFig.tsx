/** 画出一卦的六爻：由上到下，阳爻一横、阴爻断开；上下卦之间留空。moving 为动爻（1–6，由下往上数），可以是一个或几个。 */
export function GuaFig(props: { lines: number[]; label: string; moving?: number | number[] }) {
  const moving = Array.isArray(props.moving) ? props.moving : props.moving ? [props.moving] : [];
  return (
    <div class="gua-fig" role="img" aria-label={props.label}>
      {props.lines.map((yang, i) => (
        <i key={i} class={`${yang ? 'yang' : 'yin'} ${moving.includes(6 - i) ? 'moving' : ''}`} style={{ '--i': i }} />
      ))}
    </div>
  );
}
