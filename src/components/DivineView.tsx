import yaoData from '../data/yao.json';
import { type Divination, isMoving, valueName } from '../lib/divine';
import { categoryLabel, type CategoryId } from '../lib/storage';
import { GuaFig } from './GuaFig';

const POS = ['初', '二', '三', '四', '五', '上'];
const YAO = yaoData.hexagrams as Record<string, { lines: { label: string; text: string }[] }>;

/** 一行卦：小眉标（本卦／变卦）、卦图、卦名与主题。 */
function GuaLine(props: { tag: string; g: Divination['base']; moving?: number[] }) {
  return (
    <div class="divine-gua">
      <GuaFig lines={props.g.lines} moving={props.moving} label={`${props.tag}${props.g.full}${props.moving?.length ? `，动在${props.moving.map((m) => POS[m - 1]).join('、')}爻` : ''}`} />
      <div>
        <p class="eyebrow">{props.tag}</p>
        <h2 class="theme">{props.g.full}</h2>
        <p class="lead">{props.g.theme}</p>
      </div>
    </div>
  );
}

/**
 * 起卦的结果：本卦（动爻标红）与变卦，依规则要看的那几句（原文与白话，主的那句在前），变卦的走向。
 * compact 用在签本里：不重复所问，也不列细读。
 */
export function DivineView(props: { d: Divination; category: CategoryId; question: string; compact?: boolean }) {
  const { d } = props;
  return (
    <article class={`divine-view ${props.compact ? 'compact' : ''}`}>
      <GuaLine tag="本卦" g={d.base} moving={d.moving} />
      {d.changed && <GuaLine tag="变卦" g={d.changed} />}

      {!props.compact && (
        <p class="qian-answer">
          <span>{categoryLabel(props.category)}</span>
          {props.question || '心中所问之事'}
        </p>
      )}

      <p class="divine-rule">{d.rule}</p>
      {d.focus.map((f) => (
        <section class={`divine-focus ${f.main ? 'main' : ''}`} key={f.label}>
          <p class="divine-label">
            {f.label}
            {f.main && d.focus.length > 1 && <em>为主</em>}
          </p>
          <p class="divine-text">{f.text}</p>
          <p>{f.reading}</p>
        </section>
      ))}

      {d.changed && (
        <p class="divine-to">
          <b>走向</b>
          {d.changed.to}
        </p>
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
                  <em>{valueName(v)}</em>
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </article>
  );
}
