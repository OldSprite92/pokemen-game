export type OfficialElement =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export interface ElementLesson {
  id: OfficialElement;
  label: string;
  english: string;
  stage: 'E1' | 'E2' | 'E3' | 'E4';
  color: string;
}

export interface LanguageLabCard {
  id: string;
  name: string;
  pinyin: string;
  syllables: string[];
  avatar: string;
  element: OfficialElement;
  surface: string;
}

export interface LessonPack {
  id: string;
  title: string;
  subtitle: string;
  cardIds?: string[];
  elements?: OfficialElement[];
}

export const ELEMENT_LESSONS: Record<OfficialElement, ElementLesson> = {
  normal: { id: 'normal', label: '一般', english: 'Normal', stage: 'E4', color: '#78716c' },
  fire: { id: 'fire', label: '火', english: 'Fire', stage: 'E1', color: '#e5484d' },
  water: { id: 'water', label: '水', english: 'Water', stage: 'E1', color: '#0284c7' },
  electric: { id: 'electric', label: '电', english: 'Electric', stage: 'E2', color: '#a16207' },
  grass: { id: 'grass', label: '草', english: 'Grass', stage: 'E1', color: '#16803c' },
  ice: { id: 'ice', label: '冰', english: 'Ice', stage: 'E1', color: '#0e7490' },
  fighting: { id: 'fighting', label: '格斗', english: 'Fighting', stage: 'E4', color: '#b45309' },
  poison: { id: 'poison', label: '毒', english: 'Poison', stage: 'E3', color: '#9333ea' },
  ground: { id: 'ground', label: '地面', english: 'Ground', stage: 'E2', color: '#92400e' },
  flying: { id: 'flying', label: '飞行', english: 'Flying', stage: 'E2', color: '#4f46e5' },
  psychic: { id: 'psychic', label: '超能力', english: 'Psychic', stage: 'E4', color: '#be185d' },
  bug: { id: 'bug', label: '虫', english: 'Bug', stage: 'E3', color: '#4d7c0f' },
  rock: { id: 'rock', label: '岩石', english: 'Rock', stage: 'E2', color: '#786442' },
  ghost: { id: 'ghost', label: '幽灵', english: 'Ghost', stage: 'E3', color: '#6d28d9' },
  dragon: { id: 'dragon', label: '龙', english: 'Dragon', stage: 'E3', color: '#4338ca' },
  dark: { id: 'dark', label: '恶', english: 'Dark', stage: 'E4', color: '#44403c' },
  steel: { id: 'steel', label: '钢', english: 'Steel', stage: 'E3', color: '#475569' },
  fairy: { id: 'fairy', label: '妖精', english: 'Fairy', stage: 'E3', color: '#db2777' },
};

export const LANGUAGE_LAB_CARDS: LanguageLabCard[] = [
  { id: 'bubblepig', name: '泡泡猪', pinyin: 'pào pào zhū', syllables: ['pào', 'pào', 'zhū'], avatar: '🐽', element: 'water', surface: '#dff5ff' },
  { id: 'firedrake', name: '火翼龙', pinyin: 'huǒ yì lóng', syllables: ['huǒ', 'yì', 'lóng'], avatar: '🐉', element: 'fire', surface: '#ffe7e4' },
  { id: 'goose', name: '冻原鹅', pinyin: 'dòng yuán é', syllables: ['dòng', 'yuán', 'é'], avatar: '🪿', element: 'ice', surface: '#e1f8fb' },
  { id: 'leafdeer', name: '藤叶鹿', pinyin: 'téng yè lù', syllables: ['téng', 'yè', 'lù'], avatar: '🦌', element: 'grass', surface: '#e6f8e9' },
  { id: 'sparkbunny', name: '雷耳兔', pinyin: 'léi ěr tù', syllables: ['léi', 'ěr', 'tù'], avatar: '🐰', element: 'electric', surface: '#fff7d1' },
  { id: 'rockturtle', name: '岩甲龟', pinyin: 'yán jiǎ guī', syllables: ['yán', 'jiǎ', 'guī'], avatar: '🐢', element: 'rock', surface: '#f1eadc' },
  { id: 'sandbear', name: '沙丘熊', pinyin: 'shā qiū xióng', syllables: ['shā', 'qiū', 'xióng'], avatar: '🐻', element: 'ground', surface: '#f8ead2' },
  { id: 'cloudbird', name: '云翅鸟', pinyin: 'yún chì niǎo', syllables: ['yún', 'chì', 'niǎo'], avatar: '🐦', element: 'flying', surface: '#e9edff' },
  { id: 'cottontail', name: '棉尾兽', pinyin: 'mián wěi shòu', syllables: ['mián', 'wěi', 'shòu'], avatar: '🐑', element: 'normal', surface: '#f4f1ee' },
  { id: 'fistmonkey', name: '拳风猴', pinyin: 'quán fēng hóu', syllables: ['quán', 'fēng', 'hóu'], avatar: '🐒', element: 'fighting', surface: '#fff0dc' },
  { id: 'mistsnake', name: '紫雾蛇', pinyin: 'zǐ wù shé', syllables: ['zǐ', 'wù', 'shé'], avatar: '🐍', element: 'poison', surface: '#f3e8ff' },
  { id: 'mindcat', name: '星念猫', pinyin: 'xīng niàn māo', syllables: ['xīng', 'niàn', 'māo'], avatar: '🐈', element: 'psychic', surface: '#ffe7f1' },
  { id: 'shellbug', name: '甲壳虫', pinyin: 'jiǎ qiào chóng', syllables: ['jiǎ', 'qiào', 'chóng'], avatar: '🐞', element: 'bug', surface: '#edf7d7' },
  { id: 'shadowfox', name: '夜影狐', pinyin: 'yè yǐng hú', syllables: ['yè', 'yǐng', 'hú'], avatar: '🦊', element: 'ghost', surface: '#eee8ff' },
  { id: 'scaledragon', name: '苍鳞龙', pinyin: 'cāng lín lóng', syllables: ['cāng', 'lín', 'lóng'], avatar: '🐲', element: 'dragon', surface: '#e8e9ff' },
  { id: 'moonwolf', name: '月牙狼', pinyin: 'yuè yá láng', syllables: ['yuè', 'yá', 'láng'], avatar: '🐺', element: 'dark', surface: '#ebe9e7' },
  { id: 'ironrhino', name: '铁甲犀', pinyin: 'tiě jiǎ xī', syllables: ['tiě', 'jiǎ', 'xī'], avatar: '🦏', element: 'steel', surface: '#e9eef3' },
  { id: 'flowerbunny', name: '花冠兔', pinyin: 'huā guān tù', syllables: ['huā', 'guān', 'tù'], avatar: '🐇', element: 'fairy', surface: '#ffe9f4' },
  { id: 'springotter', name: '流泉獭', pinyin: 'liú quán tǎ', syllables: ['liú', 'quán', 'tǎ'], avatar: '🦦', element: 'water', surface: '#dff5ff' },
  { id: 'lavon', name: '熔岩狮', pinyin: 'róng yán shī', syllables: ['róng', 'yán', 'shī'], avatar: '🦁', element: 'fire', surface: '#ffe7e4' },
  { id: 'meadowgoat', name: '青草羊', pinyin: 'qīng cǎo yáng', syllables: ['qīng', 'cǎo', 'yáng'], avatar: '🐐', element: 'grass', surface: '#e6f8e9' },
  { id: 'flashmouse', name: '闪电鼠', pinyin: 'shǎn diàn shǔ', syllables: ['shǎn', 'diàn', 'shǔ'], avatar: '🐭', element: 'electric', surface: '#fff7d1' },
  { id: 'crystalfox', name: '冰晶狐', pinyin: 'bīng jīng hú', syllables: ['bīng', 'jīng', 'hú'], avatar: '🦊', element: 'ice', surface: '#e1f8fb' },
  { id: 'feathereagle', name: '飞羽鹰', pinyin: 'fēi yǔ yīng', syllables: ['fēi', 'yǔ', 'yīng'], avatar: '🦅', element: 'flying', surface: '#e9edff' },
];

export const PINYIN_PACKS: LessonPack[] = [
  { id: 'p1', title: '初遇伙伴', subtitle: '熟悉的三音节名字', cardIds: LANGUAGE_LAB_CARDS.slice(0, 6).map((card) => card.id) },
  { id: 'p2', title: '山野伙伴', subtitle: '练习声调和前后鼻音', cardIds: LANGUAGE_LAB_CARDS.slice(6, 12).map((card) => card.id) },
  { id: 'p3', title: '神秘伙伴', subtitle: '读准稍难的名字', cardIds: LANGUAGE_LAB_CARDS.slice(12, 18).map((card) => card.id) },
  { id: 'p4', title: '进阶伙伴', subtitle: '换一组名字来复习', cardIds: LANGUAGE_LAB_CARDS.slice(18, 24).map((card) => card.id) },
];

export const ENGLISH_PACKS: LessonPack[] = [
  { id: 'E1', title: '自然属性', subtitle: 'Fire · Water · Grass · Ice', elements: ['fire', 'water', 'grass', 'ice'] },
  { id: 'E2', title: '大地与天空', subtitle: 'Electric · Rock · Ground · Flying', elements: ['electric', 'rock', 'ground', 'flying'] },
  { id: 'E3', title: '神秘属性', subtitle: 'Bug · Poison · Ghost · Dragon · Steel · Fairy', elements: ['bug', 'poison', 'ghost', 'dragon', 'steel', 'fairy'] },
  { id: 'E4', title: '高手属性', subtitle: 'Normal · Fighting · Psychic · Dark', elements: ['normal', 'fighting', 'psychic', 'dark'] },
];

export function getPinyinPackCards(packId: string, sessionOffset = 0, count = 3): LanguageLabCard[] {
  const pack = PINYIN_PACKS.find((item) => item.id === packId) ?? PINYIN_PACKS[0];
  const cards = (pack.cardIds ?? []).map((id) => LANGUAGE_LAB_CARDS.find((card) => card.id === id)!).filter(Boolean);
  const offset = (sessionOffset * 3) % cards.length;
  return [...cards.slice(offset), ...cards.slice(0, offset)].slice(0, count);
}

export function getEnglishPackCards(packId: string, sessionOffset = 0, count = 3): LanguageLabCard[] {
  const pack = ENGLISH_PACKS.find((item) => item.id === packId) ?? ENGLISH_PACKS[0];
  const cards = (pack.elements ?? []).map((element) => LANGUAGE_LAB_CARDS.find((card) => card.element === element)!).filter(Boolean);
  const offset = sessionOffset % cards.length;
  return [...cards.slice(offset), ...cards.slice(0, offset)].slice(0, count);
}

export function getEnglishOptions(card: LanguageLabCard, packId: string, optionCount: number): ElementLesson[] {
  const pack = ENGLISH_PACKS.find((item) => item.id === packId) ?? ENGLISH_PACKS[0];
  const elements = pack.elements ?? [];
  const correctIndex = elements.indexOf(card.element);
  const ordered = [card.element, ...elements.slice(correctIndex + 1), ...elements.slice(0, correctIndex)];
  return ordered
    .slice(0, Math.max(2, Math.min(optionCount, 4)))
    .map((element) => ELEMENT_LESSONS[element])
    .sort((a, b) => a.english.localeCompare(b.english));
}

export function getCardById(id: string) {
  return LANGUAGE_LAB_CARDS.find((card) => card.id === id);
}
