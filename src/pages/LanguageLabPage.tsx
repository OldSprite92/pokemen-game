import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import {
  ELEMENT_LESSONS,
  ENGLISH_PACKS,
  getEnglishOptions,
  getEnglishPackCards,
  getPinyinPackCards,
  LANGUAGE_LAB_CARDS,
  PINYIN_PACKS,
  type LanguageLabCard,
} from '../game/languageLab';
import {
  completeLanguageSession,
  getEnglishOptionCount,
  getMasteryStatus,
  getWeeklySummary,
  loadLanguageProgress,
  resetLanguageProgress,
  saveLanguageProgress,
  type LanguageLabProgress,
  type LearningRecord,
  type MasteryStatus,
  type SessionCompletion,
  type SessionResultItem,
} from '../game/languageProgress';
import { getStoredPokeBalls, setStoredPokeBalls } from '../game/trainerInventory';
import { useGameStore } from '../stores/gameStore';

type LabView = 'hub' | 'briefing' | 'pinyin' | 'english' | 'report' | 'collection' | 'parent';

interface LabState {
  view: LabView;
  pinyinPackId: string;
  englishPackId: string;
  pinyinCards: LanguageLabCard[];
  englishCards: LanguageLabCard[];
  results: SessionResultItem[];
  completion: SessionCompletion | null;
}

type LabAction =
  | { type: 'choose-pinyin-pack'; id: string }
  | { type: 'choose-english-pack'; id: string }
  | { type: 'show'; view: LabView }
  | { type: 'start'; pinyinCards: LanguageLabCard[]; englishCards: LanguageLabCard[] }
  | { type: 'pinyin-complete'; results: SessionResultItem[] }
  | { type: 'session-complete'; results: SessionResultItem[]; completion: SessionCompletion }
  | { type: 'back-to-hub' };

const INITIAL_STATE: LabState = {
  view: 'hub',
  pinyinPackId: 'p1',
  englishPackId: 'E1',
  pinyinCards: [],
  englishCards: [],
  results: [],
  completion: null,
};

const STATUS_COPY: Record<MasteryStatus, string> = {
  new: '未学习',
  learning: '学习中',
  familiar: '已熟悉',
  mastered: '已掌握',
};

function labReducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case 'choose-pinyin-pack':
      return { ...state, pinyinPackId: action.id };
    case 'choose-english-pack':
      return { ...state, englishPackId: action.id };
    case 'show':
      return { ...state, view: action.view };
    case 'start':
      return {
        ...state,
        view: 'briefing',
        pinyinCards: action.pinyinCards,
        englishCards: action.englishCards,
        results: [],
        completion: null,
      };
    case 'pinyin-complete':
      return { ...state, view: 'english', results: action.results };
    case 'session-complete':
      return {
        ...state,
        view: 'report',
        results: [...state.results, ...action.results],
        completion: action.completion,
      };
    case 'back-to-hub':
      return { ...state, view: 'hub', results: [], completion: null };
    default:
      return state;
  }
}

function chooseSessionCards(
  cards: LanguageLabCard[],
  getRecord: (card: LanguageLabCard) => LearningRecord | undefined,
) {
  const weak = cards
    .filter((card) => {
      const status = getMasteryStatus(getRecord(card));
      return status === 'learning' || status === 'familiar';
    })
    .sort((a, b) => (getRecord(b)?.wrongStreak ?? 0) - (getRecord(a)?.wrongStreak ?? 0));
  const unseen = cards.filter((card) => getMasteryStatus(getRecord(card)) === 'new');
  const mastered = cards.filter((card) => getMasteryStatus(getRecord(card)) === 'mastered');
  const candidates = [...weak.slice(0, 2), ...unseen.slice(0, 2), ...mastered.slice(0, 1), ...cards];
  return candidates.filter((card, index) => candidates.findIndex((item) => item.id === card.id) === index).slice(0, 3);
}

function speak(text: string, lang: 'zh-CN' | 'en-US') {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = lang === 'zh-CN' ? 0.78 : 0.72;
  window.speechSynthesis.speak(utterance);
}

function MissionProgress({ view }: { view: LabView }) {
  const steps = [
    { id: 'briefing', label: '认识' },
    { id: 'pinyin', label: '拼音' },
    { id: 'english', label: '英语' },
  ] as const;
  const currentIndex = view === 'report' ? 3 : steps.findIndex((step) => step.id === view);

  return (
    <ol className="lab-progress lab-progress-three" aria-label="本局研究进度">
      {steps.map((step, index) => (
        <li key={step.id} className={index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-current' : ''}>
          <span>{index < currentIndex ? '✓' : index + 1}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}

function StatusPill({ status }: { status: MasteryStatus }) {
  return <span className={`lab-status-pill is-${status}`}>{STATUS_COPY[status]}</span>;
}

function HubStage({
  state,
  progress,
  trainerName,
  onChoosePinyinPack,
  onChooseEnglishPack,
  onStart,
  onShowCollection,
  onShowParent,
}: {
  state: LabState;
  progress: LanguageLabProgress;
  trainerName?: string;
  onChoosePinyinPack: (id: string) => void;
  onChooseEnglishPack: (id: string) => void;
  onStart: () => void;
  onShowCollection: () => void;
  onShowParent: () => void;
}) {
  const mastered = [
    ...Object.values(progress.pinyin),
    ...Object.values(progress.english),
  ].filter((record) => getMasteryStatus(record) === 'mastered').length;

  return (
    <section className="lab-stage lab-hub" aria-labelledby="lab-hub-title">
      <div className="lab-hub-hero">
        <div className="lab-hub-copy">
          <p className="lab-eyebrow">{trainerName ? `${trainerName}的每日研究` : '每日语言研究'}</p>
          <h2 id="lab-hub-title">今天来破译 6 份资料</h2>
          <p>先认识本轮伙伴，再完成 3 个拼音配对和 3 道属性英语。</p>
        </div>
        <div className="lab-hub-stats" role="group" aria-label="学习进度">
          <div><strong>{progress.researchStamps}/5</strong><span>研究章</span></div>
          <div><strong>{progress.sessions.length}</strong><span>完成局数</span></div>
          <div><strong>{mastered}</strong><span>已掌握</span></div>
        </div>
      </div>

      <div className="lab-pack-section">
        <div className="lab-section-heading">
          <div><p>拼音卡组</p><h3>选择这次要认识的伙伴</h3></div>
          <span>每局抽 3 只</span>
        </div>
        <div className="lab-pack-grid" role="group" aria-label="拼音卡组">
          {PINYIN_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`lab-pack-card${state.pinyinPackId === pack.id ? ' is-selected' : ''}`}
              aria-pressed={state.pinyinPackId === pack.id}
              onClick={() => onChoosePinyinPack(pack.id)}
            >
              <strong>{pack.title}</strong>
              <span>{pack.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lab-pack-section">
        <div className="lab-section-heading">
          <div><p>英语卡组</p><h3>18 个正式属性分 4 组学习</h3></div>
          <span>每局抽 3 个</span>
        </div>
        <div className="lab-pack-grid" role="group" aria-label="英语属性卡组">
          {ENGLISH_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`lab-pack-card lab-english-pack${state.englishPackId === pack.id ? ' is-selected' : ''}`}
              aria-pressed={state.englishPackId === pack.id}
              onClick={() => onChooseEnglishPack(pack.id)}
            >
              <strong>{pack.id} · {pack.title}</strong>
              <span lang="en" translate="no">{pack.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lab-hub-actions">
        <button type="button" className="lab-primary-action" onClick={onStart}>开始今天的研究</button>
        <button type="button" className="lab-secondary-action" onClick={onShowCollection}>查看学习图鉴</button>
        <button type="button" className="lab-text-action" onClick={onShowParent}>家长概览</button>
      </div>
      <p className="lab-reward-note">每天首次完成可获得 1 枚研究章和 1 个普通精灵球；答错不扣奖励。</p>
    </section>
  );
}

function BriefingStage({
  pinyinCards,
  englishCards,
  onContinue,
}: {
  pinyinCards: LanguageLabCard[];
  englishCards: LanguageLabCard[];
  onContinue: () => void;
}) {
  return (
    <section className="lab-stage lab-briefing" aria-labelledby="lab-briefing-title">
      <div className="lab-stage-heading">
        <p>先认识，再挑战</p>
        <h2 id="lab-briefing-title" tabIndex={-1}>本轮研究资料</h2>
        <span>可以反复听读，不计对错。</span>
      </div>

      <div className="lab-briefing-grid">
        <section aria-labelledby="briefing-pinyin-title">
          <h3 id="briefing-pinyin-title">伙伴名字</h3>
          <div className="lab-study-cards">
            {pinyinCards.map((card) => (
              <article key={card.id} className="lab-study-card">
                <span className="lab-study-avatar" aria-hidden="true">{card.avatar}</span>
                <strong>{card.name}</strong>
                <p>{card.pinyin}</p>
                <button type="button" onClick={() => speak(card.name, 'zh-CN')} aria-label={`听读${card.name}`}>听读名字</button>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="briefing-english-title">
          <h3 id="briefing-english-title">属性单词</h3>
          <div className="lab-word-list">
            {englishCards.map((card) => {
              const lesson = ELEMENT_LESSONS[card.element];
              return (
                <article key={card.element}>
                  <div><strong lang="en" translate="no">{lesson.english}</strong><span>{lesson.label}属性</span></div>
                  <button type="button" onClick={() => speak(lesson.english, 'en-US')} aria-label={`听读 ${lesson.english}`}>听读单词</button>
                </article>
              );
            })}
          </div>
          <p className="lab-no-icon-note">正式答题时只显示英文单词，不提供属性图标。</p>
        </section>
      </div>

      <button type="button" className="lab-primary-action" onClick={onContinue}>我准备好了</button>
    </section>
  );
}

interface ConnectionLine {
  id: string;
  path: string;
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function PinyinMission({ cards, onComplete }: {
  cards: LanguageLabCard[];
  onComplete: (results: SessionResultItem[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('先点左边的拼音，再点右边的伙伴。');
  const [lines, setLines] = useState<ConnectionLine[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pinyinRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const monsterRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pinyinOptions = useMemo(() => [cards[2], cards[0], cards[1]].filter(Boolean), [cards]);

  const updateLines = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const nextLines = connectedIds.flatMap((id) => {
      const pinyinButton = pinyinRefs.current[id];
      const monsterButton = monsterRefs.current[id];
      const card = cards.find((item) => item.id === id);
      if (!pinyinButton || !monsterButton || !card) return [];
      const start = pinyinButton.getBoundingClientRect();
      const end = monsterButton.getBoundingClientRect();
      const startX = start.right - boardRect.left;
      const startY = start.top + start.height / 2 - boardRect.top;
      const endX = end.left - boardRect.left;
      const endY = end.top + end.height / 2 - boardRect.top;
      const curve = Math.max(24, (endX - startX) * 0.45);
      return [{
        id,
        color: ELEMENT_LESSONS[card.element].color,
        startX,
        startY,
        endX,
        endY,
        path: `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`,
      }];
    });
    setLines(nextLines);
  }, [cards, connectedIds]);

  useLayoutEffect(() => {
    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, [updateLines]);

  const selectPinyin = (card: LanguageLabCard) => {
    if (connectedIds.includes(card.id)) return;
    setSelectedId(card.id);
    setWrongId(null);
    setMessage(`选中了“${card.pinyin}”，现在找找它是谁。`);
  };

  const selectMonster = (card: LanguageLabCard) => {
    if (connectedIds.includes(card.id)) return;
    if (!selectedId) {
      setMessage('先从左边选一个拼音吧。');
      return;
    }
    if (selectedId !== card.id) {
      setWrongId(card.id);
      setMissedIds((current) => current.includes(selectedId) ? current : [...current, selectedId]);
      setMessage('很接近！读一遍拼音，再换一位伙伴试试。');
      return;
    }

    const nextConnected = [...connectedIds, card.id];
    setConnectedIds(nextConnected);
    setSelectedId(null);
    setWrongId(null);
    setMessage(nextConnected.length === cards.length ? '3 组都连对啦！' : `连对了！${card.pinyin}就是${card.name}。`);
  };

  const finish = () => onComplete(cards.map((card) => ({
    kind: 'pinyin',
    key: card.id,
    firstCorrect: !missedIds.includes(card.id),
    hints: missedIds.includes(card.id) ? 1 : 0,
  })));

  const isFinished = connectedIds.length === cards.length;

  return (
    <section className="lab-stage" aria-labelledby="pinyin-mission-title">
      <div className="lab-stage-heading">
        <p>第 1～3 题 · 名字研究</p>
        <h2 id="pinyin-mission-title" tabIndex={-1}>把拼音和伙伴连起来</h2>
      </div>

      <div className="lab-pair-board" ref={boardRef}>
        <svg className="lab-connection-layer" aria-hidden="true">
          {lines.map((line) => (
            <g key={line.id}>
              <path d={line.path} stroke={line.color} />
              <circle cx={line.startX} cy={line.startY} r="5" fill={line.color} />
              <circle cx={line.endX} cy={line.endY} r="5" fill={line.color} />
            </g>
          ))}
        </svg>

        <div className="lab-pair-column" role="group" aria-label="拼音选项">
          <p className="lab-column-label">拼音卡</p>
          {pinyinOptions.map((card) => {
            const connected = connectedIds.includes(card.id);
            const selected = selectedId === card.id;
            return (
              <button
                key={card.id}
                ref={(node) => { pinyinRefs.current[card.id] = node; }}
                type="button"
                className={`lab-pinyin-card${selected ? ' is-selected' : ''}${connected ? ' is-connected' : ''}`}
                style={{ '--pair-color': ELEMENT_LESSONS[card.element].color } as React.CSSProperties}
                aria-pressed={selected}
                disabled={connected}
                onClick={() => selectPinyin(card)}
              >
                <span>{card.pinyin}</span>
                <small>{connected ? '连好啦 ✓' : '点我选择'}</small>
              </button>
            );
          })}
        </div>

        <div className="lab-pair-column" role="group" aria-label="伙伴选项">
          <p className="lab-column-label">伙伴卡</p>
          {cards.map((card) => {
            const connected = connectedIds.includes(card.id);
            return (
              <button
                key={card.id}
                ref={(node) => { monsterRefs.current[card.id] = node; }}
                type="button"
                className={`lab-monster-card${connected ? ' is-connected' : ''}${wrongId === card.id ? ' is-try-again' : ''}`}
                style={{ '--pair-color': ELEMENT_LESSONS[card.element].color, '--monster-surface': card.surface } as React.CSSProperties}
                aria-label={`伙伴 ${card.name}`}
                aria-pressed={selectedId === card.id}
                disabled={connected}
                onAnimationEnd={() => setWrongId(null)}
                onClick={() => selectMonster(card)}
              >
                <span className="lab-monster-avatar" aria-hidden="true">{card.avatar}</span>
                <strong>{connected ? card.name : '这是谁？'}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`lab-feedback${isFinished ? ' is-success' : ''}`} role="status" aria-live="polite">
        <span aria-hidden="true">{isFinished ? '★' : '提示'}</span>
        <p>{message}</p>
      </div>

      {isFinished ? <button type="button" className="lab-primary-action" onClick={finish}>去做属性英语</button> : null}
    </section>
  );
}

function EnglishMission({
  cards,
  packId,
  optionCount,
  onComplete,
}: {
  cards: LanguageLabCard[];
  packId: string;
  optionCount: number;
  onComplete: (results: SessionResultItem[]) => void;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [wrongAnswer, setWrongAnswer] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [currentResult, setCurrentResult] = useState<SessionResultItem | null>(null);
  const [answers, setAnswers] = useState<SessionResultItem[]>([]);
  const currentCard = cards[questionIndex];
  const lesson = ELEMENT_LESSONS[currentCard.element];
  const options = getEnglishOptions(currentCard, packId, optionCount);
  const answered = currentResult !== null;

  const chooseAnswer = (elementId: string) => {
    if (answered) return;
    if (elementId === currentCard.element) {
      setWrongAnswer(null);
      setCurrentResult({ kind: 'english', key: currentCard.element, firstCorrect: wrongCount === 0, hints: wrongCount > 0 ? 1 : 0 });
      return;
    }
    const nextWrongCount = wrongCount + 1;
    setWrongCount(nextWrongCount);
    setWrongAnswer(elementId);
    if (nextWrongCount >= 2) {
      setCurrentResult({ kind: 'english', key: currentCard.element, firstCorrect: false, hints: 1 });
    }
  };

  const goNext = () => {
    if (!currentResult) return;
    const nextAnswers = [...answers, currentResult];
    if (questionIndex === cards.length - 1) {
      onComplete(nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
    setQuestionIndex((index) => index + 1);
    setWrongAnswer(null);
    setWrongCount(0);
    setCurrentResult(null);
  };

  return (
    <section className="lab-stage" aria-labelledby="english-mission-title">
      <div className="lab-stage-heading">
        <p>第 {questionIndex + 4} 题 · 属性研究</p>
        <h2 id="english-mission-title" tabIndex={-1}>选出属性的英文单词</h2>
        <span>选项里没有属性图标，请认真看单词。</span>
      </div>

      <div className="lab-question-count" aria-label={`英语第 ${questionIndex + 1} 题，共 ${cards.length} 题`}>
        {cards.map((card, index) => (
          <span key={card.id} className={index < questionIndex ? 'is-complete' : index === questionIndex ? 'is-current' : ''} />
        ))}
      </div>

      <article className="lab-english-monster lab-english-monster-neutral">
        <span aria-hidden="true">{currentCard.avatar}</span>
        <div><p>研究对象</p><h3>{currentCard.name}</h3><small>{answered ? `${lesson.label}属性` : '它是什么属性？'}</small></div>
      </article>

      <div className="lab-english-options lab-text-only-options" role="group" aria-label="英文属性选项">
        {options.map((option) => {
          const isCorrect = answered && option.id === currentCard.element;
          const isWrong = wrongAnswer === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`lab-english-option${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-try-again' : ''}`}
              aria-label={option.english}
              aria-pressed={isCorrect}
              onAnimationEnd={() => setWrongAnswer(null)}
              onClick={() => chooseAnswer(option.id)}
              disabled={answered && !isCorrect}
            >
              <strong lang="en" translate="no">{option.english}</strong>
            </button>
          );
        })}
      </div>

      <div className={`lab-feedback${answered ? ' is-success' : ''}`} role="status" aria-live="polite">
        <span aria-hidden="true">{answered ? '★' : wrongCount ? '再想想' : '提示'}</span>
        <p>
          {answered
            ? <><b lang="en" translate="no">{lesson.english}</b> 就是{lesson.label}属性。</>
            : wrongCount
              ? `再试一次：正确单词以“${lesson.english.slice(0, 1)}”开头。`
              : '先在心里读一遍每个单词，再作选择。'}
        </p>
        {answered ? <button type="button" className="lab-listen-inline" onClick={() => speak(lesson.english, 'en-US')}>听读 {lesson.english}</button> : null}
      </div>

      {answered ? <button type="button" className="lab-primary-action" onClick={goNext}>{questionIndex === cards.length - 1 ? '完成研究' : '下一题'}</button> : null}
    </section>
  );
}

function ReportStage({
  results,
  completion,
  hasTrainer,
  onReplay,
  onCollection,
}: {
  results: SessionResultItem[];
  completion: SessionCompletion;
  hasTrainer: boolean;
  onReplay: () => void;
  onCollection: () => void;
}) {
  const correct = results.filter((result) => result.firstCorrect).length;
  const reviewed = results.filter((result) => !result.firstCorrect).length;

  return (
    <section className="lab-stage lab-complete" aria-labelledby="lab-report-title">
      <div className="lab-complete-mark" aria-hidden="true"><span>✓</span>{Array.from({ length: 6 }).map((_, index) => <i key={index} />)}</div>
      <p className="lab-eyebrow">研究任务完成</p>
      <h2 id="lab-report-title" tabIndex={-1}>6 份资料都整理好了！</h2>
      <div className="lab-result-grid lab-result-grid-three">
        <div><strong>{correct}</strong><span>首答正确</span></div>
        <div><strong>{reviewed}</strong><span>重点复习</span></div>
        <div><strong>{completion.progress.researchStamps}/5</strong><span>研究章</span></div>
      </div>

      <section className={`lab-reward-card${completion.dailyReward ? ' is-earned' : ''}`} aria-live="polite">
        <h3>{completion.dailyReward ? '今日奖励已领取' : '今天的奖励已经领过啦'}</h3>
        {completion.dailyReward ? (
          <p>{hasTrainer ? '研究章 +1，普通精灵球 +1。' : '研究章 +1；创建训练师后还能领取精灵球。'}</p>
        ) : <p>学习记录仍会保存，再练一局也很有价值。</p>}
        {completion.researcherPack ? <p className="lab-bonus-copy">集齐 5 枚研究章：获得研究员贴纸和高级球！</p> : null}
        {completion.newStageBadges.length > 0 ? <p className="lab-bonus-copy">新获得：{completion.newStageBadges.join('、')} 属性研究徽章。</p> : null}
      </section>

      <p className="lab-complete-copy">答错的内容已经进入复习队列，下次研究会优先再见到它们。</p>
      <div className="lab-complete-actions">
        <button type="button" className="lab-secondary-action" onClick={onReplay}>再来一局</button>
        <button type="button" className="lab-primary-action" onClick={onCollection}>查看学习图鉴</button>
      </div>
    </section>
  );
}

function CollectionStage({ progress, onBack }: { progress: LanguageLabProgress; onBack: () => void }) {
  return (
    <section className="lab-stage lab-collection" aria-labelledby="lab-collection-title">
      <div className="lab-stage-heading">
        <p>24 位伙伴 · 18 个正式属性</p>
        <h2 id="lab-collection-title" tabIndex={-1}>学习图鉴</h2>
        <span>拼音和对应属性英语都掌握后，伙伴卡会点亮金框。</span>
      </div>
      <section className="lab-course-badges" aria-labelledby="lab-course-badges-title">
        <div>
          <h3 id="lab-course-badges-title">属性研究徽章</h3>
          <p>每组单词全部掌握，就会点亮一枚课程徽章。</p>
        </div>
        <div className="lab-course-badge-list">
          {ENGLISH_PACKS.map((pack) => {
            const earned = progress.earnedStageBadges.includes(pack.id);
            return <span key={pack.id} className={earned ? 'is-earned' : ''}>{pack.id}<small>{earned ? '已点亮' : '待学习'}</small></span>;
          })}
        </div>
        {progress.earnedStageBadges.length === ENGLISH_PACKS.length ? <strong>属性词大师</strong> : null}
      </section>
      <div className="lab-collection-grid">
        {LANGUAGE_LAB_CARDS.map((card) => {
          const pinyinStatus = getMasteryStatus(progress.pinyin[card.id]);
          const englishStatus = getMasteryStatus(progress.english[card.element]);
          const gold = pinyinStatus === 'mastered' && englishStatus === 'mastered';
          const lesson = ELEMENT_LESSONS[card.element];
          return (
            <article key={card.id} className={`lab-collection-card${gold ? ' is-gold' : ''}`}>
              <span className="lab-collection-avatar" aria-hidden="true">{card.avatar}</span>
              <h3>{card.name}</h3>
              <p>{card.pinyin}</p>
              <strong lang="en" translate="no">{lesson.english}</strong>
              <div><span>拼音</span><StatusPill status={pinyinStatus} /></div>
              <div><span>English</span><StatusPill status={englishStatus} /></div>
            </article>
          );
        })}
      </div>
      <button type="button" className="lab-secondary-action" onClick={onBack}>返回研究所</button>
    </section>
  );
}

function ParentStage({
  progress,
  onReset,
  onBack,
}: {
  progress: LanguageLabProgress;
  onReset: () => void;
  onBack: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const summary = getWeeklySummary(progress);
  const weakEnglish = Object.entries(progress.english)
    .filter(([, record]) => record && getMasteryStatus(record) !== 'mastered')
    .sort(([, a], [, b]) => (b?.wrongStreak ?? 0) - (a?.wrongStreak ?? 0))
    .slice(0, 3)
    .map(([element]) => ELEMENT_LESSONS[element as keyof typeof ELEMENT_LESSONS].english);

  return (
    <section className="lab-stage lab-parent" aria-labelledby="lab-parent-title">
      <div className="lab-stage-heading">
        <p>只看趋势，不给孩子排名</p>
        <h2 id="lab-parent-title" tabIndex={-1}>家长概览</h2>
        <span>快速了解这周练了什么、掌握了什么、接下来复习什么。</span>
      </div>
      <div className="lab-parent-summary">
        <article><strong>{summary.sessionCount}</strong><span>本周完成局数</span></article>
        <article><strong>{summary.practicedCount}</strong><span>本周练习项目</span></article>
        <article><strong>{summary.masteredCount}</strong><span>累计已掌握</span></article>
        <article><strong>{summary.reviewCount}</strong><span>现在需要复习</span></article>
      </div>
      <section className="lab-parent-card">
        <h3>建议优先复习</h3>
        <p>{weakEnglish.length > 0 ? weakEnglish.join('、') : '目前还没有明显薄弱项，先完成一局生成学习记录。'}</p>
      </section>
      <section className="lab-parent-card">
        <h3>掌握规则</h3>
        <p>至少在 3 个不同日期练习，累计首答正确 4 次，并且提示不超过 1 次，才会标记为“已掌握”。</p>
      </section>
      <div className="lab-parent-actions">
        <button type="button" className="lab-secondary-action" onClick={onBack}>返回研究所</button>
        {confirmReset ? (
          <button type="button" className="lab-danger-action" onClick={onReset}>确认清空学习记录</button>
        ) : (
          <button type="button" className="lab-text-action" onClick={() => setConfirmReset(true)}>重置学习记录</button>
        )}
      </div>
      {confirmReset ? <p className="lab-reset-warning" role="alert">这只清空语言研究进度，不会删除训练师、伙伴或冒险存档。</p> : null}
    </section>
  );
}

export default function LanguageLabPage() {
  const currentTrainer = useGameStore((store) => store.currentTrainer);
  const trainerId = currentTrainer?.id;
  const [state, dispatch] = useReducer(labReducer, INITIAL_STATE);
  const [progress, setProgress] = useState(() => loadLanguageProgress(trainerId));
  const stageFrameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setProgress(loadLanguageProgress(trainerId));
  }, [trainerId]);

  useEffect(() => {
    if (state.view === 'hub') return;
    stageFrameRef.current?.querySelector<HTMLElement>('h2')?.focus();
  }, [state.view]);

  const startSession = () => {
    const offset = progress.sessions.length;
    const pinyinPool = getPinyinPackCards(state.pinyinPackId, offset, 24);
    const englishPool = getEnglishPackCards(state.englishPackId, offset, 18);
    dispatch({
      type: 'start',
      pinyinCards: chooseSessionCards(pinyinPool, (card) => progress.pinyin[card.id]),
      englishCards: chooseSessionCards(englishPool, (card) => progress.english[card.element]),
    });
  };

  const finishSession = (englishResults: SessionResultItem[]) => {
    const allResults = [...state.results, ...englishResults];
    const completion = completeLanguageSession(progress, allResults);
    saveLanguageProgress(completion.progress, trainerId);
    setProgress(completion.progress);

    if (completion.dailyReward && trainerId !== undefined) {
      const balls = getStoredPokeBalls(trainerId);
      setStoredPokeBalls({
        ...balls,
        normal: balls.normal + 1,
        great: balls.great + (completion.researcherPack ? 1 : 0),
      }, trainerId);
    }

    if (completion.researcherPack && trainerId !== undefined) {
      const stickerId = `language-researcher-${completion.progress.researcherPacks}`;
      void db.stickers
        .where('trainerId').equals(trainerId)
        .and((sticker) => sticker.stickerId === stickerId)
        .first()
        .then(async (existing) => {
          if (existing) return;
          await db.stickers.add({
            trainerId,
            stickerId,
            name: `语言研究员 ${completion.progress.researcherPacks} 级`,
            emoji: '🧪',
            continentId: 'language-lab',
            earnedAt: new Date(),
          });
        });
    }

    dispatch({ type: 'session-complete', results: englishResults, completion });
  };

  const resetProgress = () => {
    setProgress(resetLanguageProgress(trainerId));
    dispatch({ type: 'back-to-hub' });
  };

  const showProgress = !['hub', 'collection', 'parent'].includes(state.view);

  return (
    <main className="language-lab-page">
      <a className="lab-skip-link" href="#lab-mission-content">跳到研究内容</a>
      <div className="lab-shell">
        <header className="lab-topbar">
          <Link to="/" aria-label="返回游戏首页">← 返回首页</Link>
          <div><span aria-hidden="true">🧪</span><h1>语言研究所</h1></div>
          <span className="lab-demo-chip">完整课程</span>
        </header>

        {showProgress ? <MissionProgress view={state.view} /> : null}

        <div id="lab-mission-content" className="lab-stage-frame" key={state.view} ref={stageFrameRef} tabIndex={-1}>
          {state.view === 'hub' ? (
            <HubStage
              state={state}
              progress={progress}
              trainerName={currentTrainer?.name}
              onChoosePinyinPack={(id) => dispatch({ type: 'choose-pinyin-pack', id })}
              onChooseEnglishPack={(id) => dispatch({ type: 'choose-english-pack', id })}
              onStart={startSession}
              onShowCollection={() => dispatch({ type: 'show', view: 'collection' })}
              onShowParent={() => dispatch({ type: 'show', view: 'parent' })}
            />
          ) : null}
          {state.view === 'briefing' ? <BriefingStage pinyinCards={state.pinyinCards} englishCards={state.englishCards} onContinue={() => dispatch({ type: 'show', view: 'pinyin' })} /> : null}
          {state.view === 'pinyin' ? <PinyinMission cards={state.pinyinCards} onComplete={(results) => dispatch({ type: 'pinyin-complete', results })} /> : null}
          {state.view === 'english' ? <EnglishMission cards={state.englishCards} packId={state.englishPackId} optionCount={getEnglishOptionCount(progress)} onComplete={finishSession} /> : null}
          {state.view === 'report' && state.completion ? <ReportStage results={state.results} completion={state.completion} hasTrainer={trainerId !== undefined} onReplay={startSession} onCollection={() => dispatch({ type: 'show', view: 'collection' })} /> : null}
          {state.view === 'collection' ? <CollectionStage progress={progress} onBack={() => dispatch({ type: 'back-to-hub' })} /> : null}
          {state.view === 'parent' ? <ParentStage progress={progress} onReset={resetProgress} onBack={() => dispatch({ type: 'back-to-hub' })} /> : null}
        </div>
      </div>
    </main>
  );
}
