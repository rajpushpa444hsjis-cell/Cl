import { useEffect, useState } from 'preact/hooks';
import { GuaFig } from '../components/GuaFig';
import { Footer, Icon, Modal, ScreenHeader } from '../components/ui';
import { canShareFiles, renderFortuneCard, shareImage } from '../lib/card';
import { IS_PREVIEW, saveFile } from '../lib/platform';
import type { DailyGua } from '../lib/dailyGua';
import type { DailyFortune } from '../lib/fortune';
import type { Bazi, DayInfo } from '../lib/lunar';
import type { Profile } from '../lib/storage';

interface Props {
  profile: Profile;
  bazi: Bazi;
  day: DayInfo;
  fortune: DailyFortune;
  gua: DailyGua;
  onDraw: () => void;
}

export function Home({ profile, bazi, day, fortune: f, gua, onDraw }: Props) {
  const [cardOpen, setCardOpen] = useState(false);
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [cardErr, setCardErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => () => card && URL.revokeObjectURL(card.url), [card]);

  const makeCard = async () => {
    setCardOpen(true);
    setCardErr('');
    setMsg('');
    try {
      const blob = await renderFortuneCard({
        nickname: profile.nickname,
        day,
        fortune: f,
        gua,
        dayMaster: bazi.dayMaster,
        element: bazi.element,
      });
      setCard((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
    } catch (e) {
      setCardErr((e as Error).message || '卡片产生失败');
    }
  };

  const filename = `今日一签-${day.key}.png`;
  const share = async () => {
    if (!card) return;
    const r = await shareImage(card.blob, filename);
    setMsg(r === 'downloaded' ? '已下载图片' : '');
  };
  const save = async () => {
    if (!card) return;
    const r = await saveFile(card.blob, filename);
    setMsg(r === 'saved' ? '已保存图片' : r === 'declined' ? '' : '这里无法直接保存，请长按上方图片。');
  };

  const day2 = day.solarText.match(/(\d+)年(\d+)月(\d+)日/)!;

  return (
    <section class="screen-body">
      <ScreenHeader title="今日运势" sub={`${profile.nickname}，${greeting()}`} />

      <div class="card date-card">
        <div class="date-big">
          <span class="d">{day2[3]}</span>
          <span class="m">{day2[2]}月・{day.weekday}</span>
          <span class="y">{day2[1]}</span>
        </div>
        <div class="date-lunar">
          <div class="lunar-main">农历{day.lunarText}</div>
          <div>{day.lunarYearGz}年（{day.lunarYearSx}）</div>
          <div class="gz">
            <b>{day.dayGz}日</b>
            {day.jieqi && <span class="tag gold">{day.jieqi}</span>}
          </div>
        </div>
      </div>

      <div class="card yiji">
        <div class="yiji-row">
          <span class="yiji-badge yi">宜</span>
          <div class="chips">{day.yi.map((w) => <span class="chip" key={w}>{w}</span>)}</div>
        </div>
        <div class="yiji-row">
          <span class="yiji-badge ji">忌</span>
          <div class="chips">{day.ji.map((w) => <span class="chip" key={w}>{w}</span>)}</div>
        </div>
      </div>

      {f.chong && (
        <div class="card alert" role="note">
          <Icon name="alert" />
          <div>
            <b>{f.chong.title}</b>
            <p>{f.chong.text}</p>
          </div>
        </div>
      )}

      <div class="card fortune-card">
        <div class="fortune-top">
          <div class="seal" aria-label={`十神：${f.god}`}>
            <span>{f.god[0]}</span>
            <span>{f.god[1]}</span>
          </div>
          <h2 class="theme">{f.theme}</h2>
        </div>
        <p class="fortune-line">{f.line}</p>
      </div>

      <div class="card daily-gua">
        <div class="daily-gua-head">
          <GuaFig lines={gua.lines} moving={gua.moving} label={`今日一卦：${gua.full}，动爻在第 ${gua.moving} 爻`} />
          <div>
            <h2 class="theme">{gua.full}</h2>
            <p class="daily-gua-theme">{gua.theme}</p>
          </div>
        </div>
        <p>{gua.text}</p>
        <p>{gua.lineText}</p>
        <p>{gua.tiyongText}</p>
        <p>{gua.changeText}</p>
      </div>

      <div class="actions">
        <button class="btn primary big" onClick={onDraw}>掷筊求签</button>
        <button class="btn ghost big" onClick={makeCard}>
          <Icon name="image" /> 生成今日运势卡片
        </button>
      </div>

      <Footer />

      <Modal open={cardOpen} onClose={() => setCardOpen(false)} title="今日运势卡片">
        {cardErr && <p class="err">{cardErr}</p>}
        {!card && !cardErr && <p class="hint center">卡片绘制中…</p>}
        {card && (
          <>
            <img class="card-preview" src={card.url} alt="今日运势卡片" />
            <div class="row">
              {canShareFiles() && (
                <button class="btn primary" onClick={share}>
                  <Icon name="share" /> 分享
                </button>
              )}
              <button class={`btn ${IS_PREVIEW ? 'primary' : 'ghost'}`} onClick={save}>
                <Icon name="download" /> 保存图片
              </button>
            </div>
            {msg && <p class="hint center">{msg}</p>}
          </>
        )}
      </Modal>
    </section>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return '夜深了，早点休息';
  if (h < 11) return '早安';
  if (h < 14) return '午安';
  if (h < 18) return '下午好';
  return '晚上好';
}
