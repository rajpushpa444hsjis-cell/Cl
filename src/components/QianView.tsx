import type { PersonalLine } from '../lib/personal';
import { type Advice, type Gua, type Qian, cnNumber } from '../lib/qian';
import { CATEGORIES, type CategoryId, categoryLabel } from '../lib/storage';
import { GradeSeal } from './ui';

function AdviceRows(props: { a: Advice }) {
  return (
    <dl class="advice-rows">
      <div>
        <dt>现况</dt>
        <dd>{props.a.now}</dd>
      </div>
      <div>
        <dt>建议</dt>
        <dd>{props.a.do}</dd>
      </div>
      <div>
        <dt>留意</dt>
        <dd>{props.a.note}</dd>
      </div>
    </dl>
  );
}

/** 卦象：六爻由上到下画出，阳爻一横、阴爻断开；上下卦之间留空。 */
function GuaBlock(props: { g: Gua }) {
  const { g } = props;
  return (
    <section class="gua">
      <div class="gua-fig" role="img" aria-label={`${g.full}卦，上卦${g.upper.name}，下卦${g.lower.name}`}>
        {g.lines.map((yang, i) => (
          <i key={i} class={yang ? 'yang' : 'yin'} />
        ))}
      </div>
      <div class="gua-body">
        <h3>
          <span>卦象</span>
          {g.full}
        </h3>
        <p class="gua-parts">
          上{g.upper.name}为{g.upper.image}，下{g.lower.name}为{g.lower.image}
        </p>
        <p>{g.note}</p>
      </div>
    </section>
  );
}

export function QianView(props: { qian: Qian; category: CategoryId; personal?: PersonalLine[]; compact?: boolean }) {
  const { qian: q, category } = props;
  return (
    <article class={`qian-view ${props.compact ? 'compact' : ''}`}>
      <header class="qian-head">
        <div>
          <p class="kicker">六十甲子签</p>
          <h2 class="qian-no">第{cnNumber(q.no)}签</h2>
          <p class="qian-gz">
            <b>{q.ganzhi}</b>　{q.attr}
          </p>
        </div>
        <GradeSeal grade={q.grade} />
      </header>

      <p class="qian-key">
        <span>签意</span>
        {q.key}
      </p>

      {/* 直书：每句一栏、由右至左；逐字排列，不依赖字型的直排支援 */}
      <div class="poem" lang="zh-Hans">
        <p class="sr-only">{q.lines.join('，')}。</p>
        <div class="poem-cols" aria-hidden="true">
          {q.lines.map((l, i) => (
            <div class="poem-col" key={i}>
              {[...l].map((ch, j) => <span key={j}>{ch}</span>)}
            </div>
          ))}
        </div>
      </div>

      <GuaBlock g={q.gua} />

      {!props.compact && (
        <section class="qian-sec">
          <h3>逐句解读</h3>
          <ol class="line-notes">
            {q.lines.map((l, i) => (
              <li key={i}>
                <b>{l}</b>
                <span>{q.lineNotes[i]}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section class="qian-sec">
        <h3>白话解说</h3>
        <p>{q.plain}</p>
      </section>

      <section class="qian-sec focus">
        <h3>所问【{categoryLabel(category)}】</h3>
        <AdviceRows a={q.advice[category]} />
      </section>

      {props.personal && (
        <section class="qian-sec personal">
          <h3>此签与你</h3>
          <dl class="advice-rows">
            {props.personal.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd>{l.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {!props.compact && (
        <details class="qian-more">
          <summary>其他类别的建议</summary>
          {CATEGORIES.filter((c) => c.id !== category).map((c) => (
            <section class="other-cat" key={c.id}>
              <h4>{c.label}</h4>
              <AdviceRows a={q.advice[c.id]} />
            </section>
          ))}
        </details>
      )}

      {q.variants.length > 0 && !props.compact && (
        <details class="qian-more">
          <summary>版本异文</summary>
          <ul class="variants">
            {q.variants.map((v) => (
              <li key={v.line}>
                第{cnNumber(v.line)}句：
                {Object.entries(v.others).map(([src, text]) => (
                  <span key={src}>
                    {src}本作“{text}”
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
