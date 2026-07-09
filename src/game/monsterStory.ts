import type { ElementType, Monster } from '../types';

interface StoryOptions {
  discoveredPlace?: string;
}

const ELEMENT_MOOD: Record<ElementType, {
  cradle: string;
  glow: string;
  detail: string;
  treasure: string;
  action: string;
}> = {
  fire: {
    cradle: '暖烘烘的火山石缝旁',
    glow: '像小火苗一样跳动的红光',
    detail: '身上常带着一点温暖的火星，跑起来会留下一串亮亮的脚印',
    treasure: '会发光的黑色火山石',
    action: '用尾巴点亮了被烟雾遮住的小路',
  },
  water: {
    cradle: '清澈见底的蓝水潭边',
    glow: '像泡泡一样圆滚滚的蓝光',
    detail: '鳞片或毛尖总是湿润亮晶晶的，靠近时能听见轻轻的水声',
    treasure: '一颗装着浪花声音的贝壳',
    action: '把水流卷成小桥，带大家越过了深沟',
  },
  grass: {
    cradle: '长满嫩芽的树根洞里',
    glow: '像新叶一样舒展开的绿光',
    detail: '身上有淡淡的青草香，开心时会抖落几片小叶子',
    treasure: '一粒会唱歌的种子',
    action: '让藤蔓变成绳梯，帮大家爬上了高坡',
  },
  electric: {
    cradle: '暴雨后闪闪发亮的山顶',
    glow: '像小闪电一样噼啪作响的金光',
    detail: '耳尖或尾巴常冒出细小电花，兴奋时全身会亮一下',
    treasure: '一颗会储存笑声的电光石',
    action: '用电光打开了沉睡的机关门',
  },
  normal: {
    cradle: '铺着软草和羽毛的小窝里',
    glow: '像星星一样安静的白光',
    detail: '长相亲切又好记，越被夸奖越会挺起小胸膛',
    treasure: '一枚写着勇气的圆徽章',
    action: '凭着不放弃的劲头找到了回家的路标',
  },
  ice: {
    cradle: '雪花堆成的小冰洞里',
    glow: '像冰晶一样清亮的蓝白光',
    detail: '呼出的气会变成小雪花，走过的地方会短短地结出霜纹',
    treasure: '一片永远不会融化的雪花',
    action: '吹出冰晶把摇晃的石桥稳住了',
  },
  fighting: {
    cradle: '回声很响的训练岩场旁',
    glow: '像鼓点一样一下一下变亮的红光',
    detail: '站姿特别有精神，握紧小拳头时眼睛会变得很认真',
    treasure: '一条小小的冠军头带',
    action: '用连续跳跃把落下的木箱稳稳接住',
  },
  poison: {
    cradle: '长着紫色蘑菇的湿地边',
    glow: '像神秘药水一样冒泡的紫光',
    detail: '身边常飘着淡淡的紫雾，但对朋友会把气味收得很轻',
    treasure: '一瓶不会伤人的彩色泡泡药水',
    action: '用气味分辨出哪条路藏着陷阱',
  },
  ground: {
    cradle: '软乎乎的黄土洞里',
    glow: '像沙粒一样聚在一起的土黄色光',
    detail: '爪子或脚掌很结实，轻轻一踩就能听出地下有没有空洞',
    treasure: '一块刻着地图线条的泥板',
    action: '挖出了一条只有伙伴知道的秘密通道',
  },
  flying: {
    cradle: '能看见云海的高树顶上',
    glow: '像旋风一样转圈的淡紫光',
    detail: '动作轻快，转身时会带起一阵小风',
    treasure: '一根会指向天空的羽毛',
    action: '乘着风把大家丢失的地图带了回来',
  },
  psychic: {
    cradle: '月光照着的安静遗迹里',
    glow: '像梦一样一闪一闪的粉色光',
    detail: '眼神像在听很远的声音，偶尔能猜到伙伴下一句想说什么',
    treasure: '一颗会记录梦境的水晶珠',
    action: '用念力把散落的拼图石块排回原位',
  },
  bug: {
    cradle: '叶子卷成的小帐篷里',
    glow: '像萤火虫一样轻轻闪烁的绿光',
    detail: '身体小巧灵活，最会钻进别人看不见的小缝里',
    treasure: '一片像盾牌一样结实的叶子',
    action: '从小洞里发现了藏起来的宝箱钥匙',
  },
  rock: {
    cradle: '叮当作响的岩石洞口',
    glow: '像矿石一样沉稳的灰光',
    detail: '身体边缘有石头般的花纹，被阳光照到会闪出小亮点',
    treasure: '一颗刻着古老花纹的圆石',
    action: '把滚落的石块推到一边，露出了新的道路',
  },
  ghost: {
    cradle: '夜里会发光的旧钟楼下',
    glow: '像薄雾一样飘来飘去的蓝紫光',
    detail: '走路几乎没有声音，喜欢突然出现逗朋友笑',
    treasure: '一盏只在勇敢时亮起的小灯',
    action: '穿过影子找到了迷路伙伴留下的脚印',
  },
  dragon: {
    cradle: '风和火一起盘旋的古老巢穴里',
    glow: '像龙鳞一样一片片亮起的紫光',
    detail: '轮廓威风又可爱，抬头时像在守护一座小城堡',
    treasure: '一枚温热的龙鳞护符',
    action: '用一声响亮的吼叫吓退了挡路的坏天气',
  },
  dark: {
    cradle: '月影最深的树林边',
    glow: '像黑宝石一样安静发亮的暗紫光',
    detail: '眼睛在暗处特别明亮，行动时像小侦探一样谨慎',
    treasure: '一枚能照见影子的月亮扣子',
    action: '在黑暗里发现了别人错过的安全出口',
  },
  steel: {
    cradle: '回荡着叮叮声的旧工坊里',
    glow: '像刚擦亮的金属一样银光闪闪',
    detail: '身体有结实的金属光泽，被敲到会发出清脆的小声音',
    treasure: '一颗不会生锈的小齿轮',
    action: '把坏掉的机关重新卡回了正确位置',
  },
  fairy: {
    cradle: '花瓣和星光围成的小圆圈里',
    glow: '像糖果纸一样闪闪发亮的粉光',
    detail: '身边常有亮晶晶的小点点，笑起来像铃铛响',
    treasure: '一枚会带来好心情的花瓣贴纸',
    action: '用温柔的光让吵架的伙伴重新牵手',
  },
  light: {
    cradle: '第一束晨光照到的山坡上',
    glow: '像太阳碎片一样暖暖的金光',
    detail: '靠近时会觉得心里亮了一点，影子也变得很精神',
    treasure: '一片装着早晨颜色的光羽毛',
    action: '照亮了迷宫墙上的隐藏箭头',
  },
};

const AVATAR_FEATURES: Record<string, string> = {
  pig: '有圆圆的鼻子和短短的小腿',
  pinkpig: '有粉粉的鼻尖和棉花糖一样的脸颊',
  darkpig: '有硬硬的小獠牙和不服输的眼神',
  bubblepig: '鼻尖总能吹出圆滚滚的泡泡',
  vanilla: '身上有一股甜甜的草叶香',
  fish: '尾巴像小桨一样灵活',
  bird: '翅膀小小的，却总想飞得更高',
  lightbird: '羽毛边缘像阳光一样闪亮',
  swallow: '翅尖带着细细的电光纹路',
  eagle: '眼神锐利，像能看见很远很远的地方',
  cat: '脚步轻得像踩在云上',
  dog: '一听到伙伴呼唤就会飞快跑来',
  firedog: '脖子边有一圈像火焰的鬃毛',
  dragon: '头上有小角，尾巴总是得意地晃来晃去',
  firedrake: '翅膀边缘像燃着不烫人的小火苗',
  dragon2: '身形像会变魔术的小龙，转圈时会留下彩色影子',
  fox: '尾巴蓬松，走路时会轻轻扫过地面',
  fox2: '尾巴像开花的樱枝，跑起来会飘出花瓣',
  bear: '爪子厚厚的，抱东西特别稳',
  rabbit: '耳朵很灵，远处一点声音都逃不过',
  tiger: '额头纹路像一枚勇气标记',
  monkey: '手脚灵活，最会爬到高处看热闹',
  panda: '黑白花纹像穿着冒险小披风',
  wolf: '耳朵尖尖的，听见风声会立刻抬头',
  lion: '鬃毛蓬蓬的，生气时也有点可爱',
  frog: '眼睛圆亮，跳起来像弹簧',
  crab: '钳子结实，夹住宝箱钥匙绝不松手',
  mouse: '个头小但动作快，能从脚边嗖地一下溜过去',
  snake: '身体柔软，盘起来像一条会思考的彩带',
  turtle: '背壳像小盾牌，遇事会先保护朋友',
  turtle2: '背壳上长着像海藻的花纹',
  unicorn: '额头的小角会在开心时发亮',
  dino: '脚印大大的，像把“我来啦”盖在地上',
  bat: '翅膀安静展开时像一把夜色小伞',
  goose: '走路一摇一摆，却很会照顾队伍',
  rhino: '头顶的角像一顶小王冠',
  croc: '嘴巴大大的，笑起来像在炫耀勇气',
  elephant: '鼻子灵巧，能卷起很小很小的东西',
  orchid: '头顶像开着一朵小花',
  cotton: '身体软得像一团会冒险的云',
  icesaw: '背脊有冰锯一样亮晶晶的小棱角',
  rocklizard: '皮肤有岩石花纹，趴着时像一块会眨眼的石头',
  lightning: '尾巴像一截小闪电',
  snow: '身上落着不会融化的小雪点',
};

const FALLBACK_PERSONALITIES = ['好奇', '勇敢', '有点害羞', '爱撒娇', '很讲义气', '认真'];
const FALLBACK_FAVORITES = ['亮晶晶的小石头', '被伙伴摸摸头', '听爸爸妈妈讲冒险故事', '收集奇怪形状的叶子', '胜利后转一圈', '在地图上发现新路'];
const FALLBACK_CATCHPHRASES = ['我来试试看', '伙伴们跟我来', '今天也要冒险', '一点都不怕', '发现秘密啦', '冲呀'];

function pick<T>(items: T[], seed: string, salt: number): T {
  let hash = salt * 97;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return items[Math.abs(hash) % items.length];
}

function cleanSentencePart(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/[。！!，,]$/g, '');
}

export function generateMonsterBackstory(monster: Monster, options: StoryOptions = {}) {
  const mood = ELEMENT_MOOD[monster.element] || ELEMENT_MOOD.normal;
  const place = options.discoveredPlace || '冒险路上';
  const skillName = monster.skills[0]?.name || `${monster.name}的小绝招`;
  const avatarFeature = AVATAR_FEATURES[monster.avatar] || '长相特别，一眼就能从伙伴中认出来';
  const personality = cleanSentencePart(
    monster.personality,
    pick(FALLBACK_PERSONALITIES, monster.name, 1)
  );
  const favorite = cleanSentencePart(
    monster.favoriteThing,
    pick(FALLBACK_FAVORITES, monster.name, 2)
  );
  const catchphrase = cleanSentencePart(
    monster.catchphrase,
    pick(FALLBACK_CATCHPHRASES, monster.name, 3)
  );
  const wildCradle = place === '冒险路上'
    ? `冒险路上的${mood.cradle}`
    : `${place}附近的${mood.cradle}`;
  const origin = monster.createdBy === 'user'
    ? `传说${monster.name}是在训练师第一次喊出它名字时，从${mood.glow}里醒来的。`
    : `${monster.name}出生在${wildCradle}，第一次被发现时，正守着${mood.treasure}。`;

  return [
    origin,
    `它${avatarFeature}，${mood.detail}。`,
    `它的性格${personality}，最喜欢${favorite}；一紧张或开心，就会小声喊：“${catchphrase}！”`,
    `有一次冒险里，它使出“${skillName}”，${mood.action}，从那以后，大家都知道${monster.name}不是普通伙伴，而是队伍里的小英雄。`,
  ].join('');
}
