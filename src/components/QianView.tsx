import { useEffect, useRef, useState } from 'preact/hooks';
import type { PersonalLine } from '../lib/personal';
import { type Advice, type Gua, type Qian, cnNumber } from '../lib/qian';
import { CATEGORIES, type CategoryId, categoryLabel } from '../lib/storage';
import { GuaFig } from './GuaFig';
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

/**
 * 各方面：一张签同时回答十二个方面，每个方面一句短语，一眼看完；点任何一格再展开那个方面的现况、建议、留意。
 * 做法参考贵船神社的水占签纸：一张纸上列着各个方面，字是浮在水面上才慢慢显出来的，这里在卷到这一节时让字依次浮现。
 */
function Aspects(props: { qian: Qian; asked: CategoryId }) {
  const [open, setOpen] = useState<CategoryId | null>(null);
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const detail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setShown(true);
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setShown(true), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = (id: CategoryId) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next) requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  return (
    <section class={`qian-sec aspects ${shown ? 'shown' : ''}`} ref={ref}>
      <h3>各方面</h3>
      <div class="aspect-grid">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            class={`aspect ${c.id === props.asked ? 'asked' : ''} ${open === c.id ? 'on' : ''}`}
            style={{ '--i': i }}
            aria-expanded={open === c.id}
            onClick={() => toggle(c.id)}
          >
            <span>{c.label}</span>
            <b>{props.qian.advice[c.id].gist}</b>
          </button>
        ))}
      </div>
      {open && (
        <div class="aspect-detail" ref={detail}>
          <h4>{categoryLabel(open)}</h4>
          <AdviceRows a={props.qian.advice[open]} />
        </div>
      )}
    </section>
  );
}

function GuaBlock(props: { g: Gua }) {
  const { g } = props;
  return (
    <section class="gua">
      <GuaFig lines={g.lines} label={`${g.full}卦，上卦${g.upper.name}，下卦${g.lower.name}`} />
      <div class="gua-body">
        <h3>{g.full}</h3>
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
          <h2 class="qian-no">第{cnNumber(q.no)}签</h2>
          <p class="qian-gz">
            <b>{q.ganzhi}</b>　{q.attr}
          </p>
        </div>
        <GradeSeal grade={q.grade} />
      </header>

      <p class="qian-key">{q.key}</p>

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

      {!props.compact && (
        <section class="qian-sec story">
          <h3>典故</h3>
          <p class="story-title">
            <b>{q.story.title}</b>
            <span>{q.story.kind}</span>
          </p>
          <p>{q.story.text}</p>
        </section>
      )}

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

      {!props.compact && <Aspects qian={q} asked={category} />}

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
