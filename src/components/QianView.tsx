import { type Advice, GRADE_NOTE, type Qian, cnNumber } from '../lib/qian';
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

export function QianView(props: { qian: Qian; category: CategoryId; reminder?: string; compact?: boolean }) {
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

      {props.reminder && (
        <section class="qian-sec reminder">
          <h3>今日运势提醒</h3>
          <p>{props.reminder}</p>
        </section>
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
          <p class="hint small">原文依三个来源逐字比对、多数决定稿。</p>
        </details>
      )}

      <p class="hint small">{GRADE_NOTE}</p>
    </article>
  );
}
