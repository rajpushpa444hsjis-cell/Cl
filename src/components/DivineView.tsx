import yaoData from '../data/yao.json';
import { type Divination, type Focus, guaGist, guaImage, isMoving, judgmentReading, positionText, valueName } from '../lib/divine';
import { CATEGORIES, type CategoryId, categoryLabel } from '../lib/storage';
import { GuaFig } from './GuaFig';
import { Terms } from './Terms';

const CN = ['一', '二', '三', '四', '五', '六'];
const YAO = yaoData.hexagrams as Record<string, { lines: { label: string; text: string }[] }>;

/** 一行卦：小眉标（本卦・现在／变卦・以后）、卦图、卦名与主题。 */
function GuaLine(props: { tag: string; g: Divination['base']; moving?: number[] }) {
  return (
    <div class="divine-gua">
      <GuaFig
        lines={props.g.lines}
        moving={props.moving}
        label={`${props.tag}：${props.g.full}${props.moving?.length ? `，第${props.moving.map((m) => CN[m - 1]).join('、')}爻会变` : ''}`}
      />
      <div>
        <p class="eyebrow">{props.tag}</p>
        <h2 class="theme">{props.g.full}</h2>
        <p class="lead">{props.g.theme}</p>
      </div>
    </div>
  );
}

/** 要看的那一句，用白话说它是哪里来的。 */
function plainLabel(f: Focus): string {
  const which = f.from === 'base' ? '本卦' : '变卦';
  if (f.kind === 'line') return `${which}第${CN[f.pos! - 1]}爻`;
  if (f.kind === 'judgment') return `${which}的总体意思`;
  return `${f.label}・六个爻全变时看这一句`;
}

/**
 * 起卦的结果，尽量用白话、由近到远排：
 * 一句话（所问那一方面，现在 → 以后）→ 这一卦的样子 → 重点看这几句（原文、白话，并说明为什么看这几句）
 * → 接下来（变卦）→ 各方面 → 细读（本卦六爻、看不懂的词）。
 * compact 用在签本里：只留一句话、重点与接下来。
 */
export function DivineView(props: { d: Divination; category: CategoryId; question: string; compact?: boolean }) {
  const { d, category } = props;
  const baseJudgmentInFocus = d.focus.some((f) => f.from === 'base' && f.kind === 'judgment');
  const changedJudgmentInFocus = d.focus.some((f) => f.from === 'changed' && f.kind === 'judgment');
  return (
    <article class={`divine-view ${props.compact ? 'compact' : ''}`}>
      <GuaLine tag="本卦・现在" g={d.base} moving={d.moving} />
      {d.changed && <GuaLine tag="变卦・以后" g={d.changed} />}

      <p class="qian-answer">
        <span>{categoryLabel(category)}</span>
        {guaGist(d.base.no, category)}
        {d.changed && (
          <>
            <i>→</i>
            {guaGist(d.changed.no, category)}
          </>
        )}
      </p>
      {!props.compact && props.question && <p class="divine-q">你问：{props.question}</p>}

      {!props.compact && (
        <section class="qian-sec">
          <h3>这一卦的样子</h3>
          <p>{guaImage(d.base.no)}</p>
          {!baseJudgmentInFocus && <p class="divine-more">{judgmentReading(d.base.no)}</p>}
        </section>
      )}

      <section class="qian-sec">
        <h3>重点看这几句</h3>
        <p class="divine-rule">{d.rule}</p>
        {d.focus.map((f) => (
          <section class={`divine-focus ${f.main ? 'main' : ''}`} key={f.label}>
            <p class="divine-label">
              {plainLabel(f)}
              {f.main && d.focus.length > 1 && <em>为主</em>}
            </p>
            {f.kind === 'line' && <p class="divine-pos">{positionText(f.pos!)}</p>}
            <p class="divine-text">
              {f.tag && <b>{f.tag}</b>}
              {f.text}
            </p>
            <p>{f.reading}</p>
          </section>
        ))}
      </section>

      {d.changed && (
        <section class="qian-sec">
          <h3>接下来</h3>
          <p>{d.changed.to}</p>
          {!props.compact && <p class="divine-more">变成{d.changed.full}：{guaImage(d.changed.no)}</p>}
          {!changedJudgmentInFocus && <p class="divine-more">{judgmentReading(d.changed.no)}</p>}
        </section>
      )}

      {!props.compact && (
        <section class="qian-sec aspects shown">
          <h3>各方面</h3>
          <div class="aspect-grid">
            {CATEGORIES.map((c) => (
              <div key={c.id} class={`aspect ${c.id === category ? 'asked' : ''}`}>
                <span>{c.label}</span>
                <b>{guaGist(d.base.no, c.id)}</b>
                {d.changed && <i>→ {guaGist(d.changed.no, c.id)}</i>}
              </div>
            ))}
          </div>
          {d.changed && <p class="aside">箭头后面是以后（变卦）的情况</p>}
        </section>
      )}

      {!props.compact && (
        <div class="qian-reads">
          <details class="qian-more">
            <summary>
              <span>
                本卦六爻<em>{d.base.full}</em>
              </span>
            </summary>
            <ol class="cast-list">
              {d.values.map((v, i) => (
                <li key={i} class={isMoving(v) ? 'moving' : ''}>
                  <b>{YAO[d.base.no].lines[i].label}</b>
                  <span>{YAO[d.base.no].lines[i].text}</span>
                  <em>{isMoving(v) ? `${valueName(v)}・会变` : valueName(v)}</em>
                </li>
              ))}
            </ol>
          </details>
          <Terms group="divine" />
        </div>
      )}
    </article>
  );
}
