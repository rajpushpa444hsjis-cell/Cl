import { useEffect, useRef, useState } from 'preact/hooks';
import type { PersonalLine } from '../lib/personal';
import { type Advice, type Gua, type Qian, cnNumber } from '../lib/qian';
import { CATEGORIES, type CategoryId, categoryLabel } from '../lib/storage';
import { XiangBlock } from './DivineView';
import { GuaFig } from './GuaFig';
import { Terms } from './Terms';
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
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setShown(true), { threshold: 0.01 } /* 一露出来就开始浮现，免得从下面卷上来时看到空格子 */);
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
        <XiangBlock no={g.no} />
      </div>
    </section>
  );
}

export function QianView(props: { qian: Qian; category: CategoryId; personal?: PersonalLine[]; compact?: boolean }) {
  const { qian: q, category } = props;
  // 排列的原则：求签的人先看到签诗和自己问的那件事，其余由近到远——与自己有关的、各方面的总表，
  // 最后才是想细读的人再点开的卦象、逐句解读、典故。签本里的精简版只留签诗、白话和所问。
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

      {/* 你问的那件事，先给一句话；详细的在签诗下面 */}
      {!props.compact && (
        <p class="qian-answer">
          <span>{categoryLabel(category)}</span>
          {q.advice[category].gist}
        </p>
      )}

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

      <p class="qian-plain">{q.plain}</p>

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

      {/* 细读：一行一项，想看的再点开 */}
      {!props.compact && (
        <div class="qian-reads">
          <details class="qian-more">
            <summary>
              <span>
                卦象<em>{q.gua.full}</em>
              </span>
            </summary>
            <GuaBlock g={q.gua} />
          </details>

          <details class="qian-more">
            <summary>
              <span>逐句解读</span>
            </summary>
            <ol class="line-notes">
              {q.lines.map((l, i) => (
                <li key={i}>
                  <b>{l}</b>
                  <span>{q.lineNotes[i]}</span>
                </li>
              ))}
            </ol>
          </details>

          <details class="qian-more">
            <summary>
              <span>
                典故<em>{q.story.title}</em>
              </span>
            </summary>
            <p class="story-text">
              <b>{q.story.kind}</b>
              {q.story.text}
            </p>
          </details>

          {q.variants.length > 0 && (
            <details class="qian-more">
              <summary>
                <span>版本异文</span>
              </summary>
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
          <Terms group="qian" title="签上的字是什么意思" />
        </div>
      )}
    </article>
  );
}
