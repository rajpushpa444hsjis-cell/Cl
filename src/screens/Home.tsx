import { useEffect, useState } from 'preact/hooks';
import { GuaFig } from '../components/GuaFig';
import { Footer, Icon, Modal } from '../components/ui';
import { canShareFiles, renderFortuneCard, shareImage } from '../lib/card';
import { IS_PREVIEW, saveFile } from '../lib/platform';
import type { DailyGua } from '../lib/dailyGua';
import type { DailyFortune } from '../lib/fortune';
import type { DayInfo } from '../lib/lunar';
import type { Profile } from '../lib/storage';

interface Props {
  profile: Profile;
  day: DayInfo;
  fortune: DailyFortune;
  gua: DailyGua;
  onDraw: () => void;
}

export function Home({ profile, day, fortune: f, gua, onDraw }: Props) {
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

  const [, , month, date] = day.solarText.match(/(\d+)年(\d+)月(\d+)日/)!;

  return (
    <section class="screen-body">
      <header class="cover">
        <p class="cover-eyebrow">
          {day.weekday}
          {day.jieqi && `・${day.jieqi}`}
        </p>
        <h1 class="cover-title">{month}月{date}日</h1>
        <p class="cover-sub">
          农历{day.lunarText}・{day.lunarYearGz}{day.lunarYearSx}年・{day.dayGz}日
        </p>
      </header>

      {f.chong && (
        <div class="notice" role="note">
          <b>{f.chong.title}</b>
          <p>{f.chong.text}</p>
        </div>
      )}

      <div class="card">
        <p class="eyebrow">{f.god}日</p>
        <h2 class="theme">{f.theme}</h2>
        <p>{f.line}</p>
      </div>

      <div class="card">
        <div class="gua-row">
          <GuaFig lines={gua.lines} moving={gua.moving} label={`今日一卦：${gua.full}，动爻在第 ${gua.moving} 爻`} />
          <div>
            <h2 class="theme">{gua.full}</h2>
            <p class="lead">{gua.theme}</p>
          </div>
        </div>
        <p>{gua.text}</p>
        <p>{gua.lineText}</p>
        <p>{gua.tiyongText}</p>
        <p>{gua.changeText}</p>
      </div>

      <div class="card">
        <dl class="yiji-list">
          <div>
            <dt>宜</dt>
            <dd>{day.yi.join('　')}</dd>
          </div>
          <div>
            <dt>忌</dt>
            <dd>{day.ji.join('　')}</dd>
          </div>
        </dl>
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
