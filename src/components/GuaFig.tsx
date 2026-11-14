/** 画出一卦的六爻：由上到下，阳爻一横、阴爻断开；上下卦之间留空。moving 为动爻（1–6，由下往上数）。 */
export function GuaFig(props: { lines: number[]; label: string; moving?: number }) {
  return (
    <div class="gua-fig" role="img" aria-label={props.label}>
      {props.lines.map((yang, i) => (
        <i key={i} class={`${yang ? 'yang' : 'yin'} ${props.moving === 6 - i ? 'moving' : ''}`} style={{ '--i': i }} />
      ))}
    </div>
  );
}
