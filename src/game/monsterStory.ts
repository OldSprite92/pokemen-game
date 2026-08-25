import type { ElementType, Monster } from '../types';

interface StoryOptions {
  discoveredPlace?: string;
}

// Each resident has a deliberately different kind of tiny adventure: a mystery,
// a promise, a funny habit, a rescue, or a secret job. The Pokedex should feel
// like a book of discoveries, not a spreadsheet with names swapped in.
const CURATED_MONSTER_STORIES: Record<string, string> = {
  '粉仙猪': '粉仙猪刚出生时，鼻尖上只有一粒会变色的小花粉。它把花粉吹进风里，迷路的蜜蜂就会顺着粉色小路飞回家。它最喜欢把花瓣贴在朋友头上，还会一本正经地宣布：“今天你是花园队长！”',
  '炎鬃犬': '炎鬃犬小时候把自己的火鬃毛误当成围巾，追着尾巴转了整整一下午。现在它会在火山夜巡时用鬃毛照亮山路，却从不烧到小草。听见有人害怕黑，它会立刻坐到身边，尾巴啪地亮一下。',
  '幽冥蝠': '幽冥蝠住在一座会打瞌睡的钟楼里，专门替夜班猫头鹰叫醒迟到的星星。它飞行时没有声音，却爱用超声波给石头们讲笑话。石头听不懂，只会咚咚点头，这让它觉得自己是最棒的喜剧演员。',
  '冻原鹅': '冻原鹅孵出来的那天，整片湖面结成了一面镜子。它学飞前总在镜子上练习摆翅膀，摔倒也要假装是在滑冰。后来它发现自己的冰风能把快要塌的雪桥冻牢，于是成了雪原小队的桥梁检查员。',
  '雷冠犀': '雷冠犀头上的角会在雷雨前噼啪作响，村里的孩子便把它当成天气预报员。它讨厌打雷突然吓到朋友，所以每次都先用脚跺三下提醒大家。暴雨过后，它会把被吹歪的路牌一块块顶正。',
  '藻铠龟': '藻铠龟背上的海藻会跟着心情换发型，高兴时卷成小浪花，害羞时就盖住脑袋。它曾背着三只不会游泳的小甲虫穿过急流，从此总在壳边留出“乘客座”。它的口头禅是：“慢一点，也会到。”',
  '裂空鹰': '裂空鹰小时候总想把云朵叼回巢里，结果每次嘴里只剩一团凉凉的雾。后来它学会观察云层，能在暴风到来前带大家飞到安全岩台。它最骄傲的不是飞得高，而是从不落下最后一位伙伴。',
  '樱尾狐': '樱尾狐的尾巴会在跑步时飘出樱花瓣，可它最初以为那是自己掉毛，急得躲了三天。直到小鸟们把花瓣做成了巢，它才明白那是一份礼物。现在它会挑最漂亮的花瓣送人，但一定要先听一句真心的夸奖。',
  '炽泥鳄': '炽泥鳄最喜欢在温热泥潭里做泥巴城堡，鼻尖冒烟时就是它想到了新城门。一次山洪冲走了小动物的窝，它用火焰把泥巴烤成结实的砖，连夜盖了许多小房子。它说自己不是大厨，是“泥城总工程师”。',
  '萤菇蛙': '萤菇蛙背上的小蘑菇会在月光下发亮，不过它只肯给讲完晚安故事的人看。它把露珠藏在蘑菇伞下，遇到口渴的伙伴就轻轻一跳送过去。有人问它为什么总在夜里忙，它眨眨眼说：“因为月亮也需要帮手。”',
  '磁羽燕': '磁羽燕收集过很多闪亮的扣子，却总把它们吸到翅膀上，飞起来像一串叮当作响的铃铛。后来它发现磁力能捡起山路上的铁钉，保护大家的脚掌。现在它的巢边挂着一块牌子：闪亮物品请排队登机。',
  '大舌象': '大舌象小时候说话太快，长鼻子会把自己的话卷成一团。它练习了很久，终于能用鼻子把散落的拼图一块块送到正确位置。遇到队友争论时，它从不急着发表意见，只会递上水果，等大家笑出来再说重点。',
  '香草猪': '香草猪走过的地方会留下一点甜甜的草叶香，它却固执地说那是“认真冒险的味道”。它会把最香的叶子夹进书里，送给想家的伙伴。每当有人闻到那股味道，就会想起第一次出发时背包里装着的勇气。',
  '泡泡猪': '泡泡猪的鼻尖能吹出不会破的泡泡，它最爱把自己装进最大的一颗里滚下雪坡。一次小松鼠的风筝卡在冰缝中，它让泡泡变成透明小船，载着大家飘过去。它后来给那颗泡泡取名叫“勇敢一号”。',
  '草蜜兰': '草蜜兰把清晨的露水酿成淡淡的花蜜，只送给真正累坏的旅行者。它看起来安静，其实最会记路，每片叶子都像一张小地图。有人迷路时，它不说话，只把花瓣一片片铺向正确的方向。',
  '水棉兰': '水棉兰像一团会游泳的云，最怕别人说它软绵绵没力气。后来干旱时，它把身体吸满水，整整三天为小池塘补水。伙伴们这才知道，柔软不是没用，而是能把珍贵的东西好好抱住。',
  '火翼龙': '火翼龙从一枚总是微微发烫的蛋里出生。它第一次张开翅膀时，差点把自己的尾巴火焰吹灭，于是决定先学会照顾小火苗，再学飞翔。现在它喜欢在火山岛上收集形状奇怪的黑曜石，并把最像星星的一块送给新伙伴。',
  '冰锯蜥': '冰锯蜥背上的冰晶像一排小锯齿，但它从不用来吓人。它会把卡住的冰块锯成整齐台阶，方便小个子的伙伴爬坡。它很爱听石头被风吹出的声音，还说那是雪山在悄悄唱歌。',
  '岩陆蜥': '岩陆蜥小时候把一块圆石当作蛋，守了七天才发现里面住着一只睡懒觉的甲虫。它没有生气，反而给甲虫建了一个石头小屋。现在它遇到滚落的岩石总会先推开，因为它相信每块石头后面都可能藏着一个家。',
  '闪电蜥': '闪电蜥跑得太快，尾巴常常比它先到终点。它因此学会在出发前深呼吸三次，把电光收成一条细细的线。后来它用这招穿过暴雨，把求救纸条送到山脚，成了大家公认的闪电邮差。',
  '翼幻接龙': '翼幻接龙每换一个方向飞，鳞片就会闪出不同颜色，所以它喜欢在云层里画彩虹迷宫。它只邀请敢于承认“我迷路了”的伙伴进去，因为迷路的人才会认真看地图。出口总有一颗它偷偷藏好的星形糖。',
  '雪百纳': '雪百纳出生在一场大雪后，身上的白点像没有融化的雪花。它不喜欢大声讲话，却会把大家丢失的脚印一一记住。暴风雪来时，它用尾巴扫出一条安静的小路，带着队伍回到暖暖的营地。',
  '黑仙猪': '黑仙猪总在月光最暗的地方出现，因此被误会成爱捣乱的家伙。其实它在替害羞的小动物把忘在路上的东西悄悄送回去。它最得意的恶作剧，是把礼物放在门口后躲起来，等听见一句“是谁这么贴心”才偷笑。',
  '烈光鸟': '烈光鸟并不是一直耀眼，它每天清晨都要飞到最高的山脊，收集第一束太阳光。它会把光羽分给仍在害怕黑夜的伙伴，自己只留下最小的一根。等所有人都能看清路时，它才张开翅膀，像太阳一样大声笑。',
  '苦力猪': '苦力猪出生在一辆坏掉的矿车旁，第一件学会的事就是用鼻子把车推回轨道。它力气很大，却从不抢着表现，总会先问：“这件重东西，需要我吗？”它把每一次帮忙都记成一道小小的闪电纹，藏在耳朵后面。',
  '洞居蟹': '洞居蟹把自己的洞穴整理得像一座海底图书馆，贝壳按颜色排队，石头按声音编号。它的钳子看起来凶，其实最会修补破掉的水桶。有人迷路时，它会敲着不同节奏的石壁，让回声带人找到出口。',
};

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
  earthmage: '披着会随脚步扬起细沙的法师斗篷',
  jellypig: '圆滚滚的身体里浮着一颗会发光的小泡泡',
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
  const curatedStory = CURATED_MONSTER_STORIES[monster.name];
  if (curatedStory) return curatedStory;

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

  const storyRoutes = [
    `${origin}${monster.name}${avatarFeature}，${mood.detail}。它的性格${personality}，最喜欢${favorite}。有一次它使出“${skillName}”，${mood.action}，从此总会得意地喊：“${catchphrase}！”`,
    `大家第一次注意到${monster.name}，是因为它在${place}附近认真研究一件小事。${avatarFeature}的它发现${mood.treasure}后，没有独占，而是用“${skillName}”${mood.action}。它最喜欢${favorite}，所以悄悄把这次冒险叫作“${catchphrase}计划”。`,
    `${monster.name}有个不太愿意承认的小秘密：${avatarFeature}的它以前总担心自己做得不够好。后来一次迷路时，它凭着${personality}的劲头使出“${skillName}”，${mood.action}。现在它依然爱${favorite}，却会先对自己说：“${catchphrase}！”`,
    `在${place}，伙伴们给${monster.name}取了一个外号，因为它${mood.detail}。别看它${personality}，遇到需要帮忙的事就会安静靠近，用“${skillName}”${mood.action}。做完后它只想去${favorite}，再小声说一句：“${catchphrase}。”`,
    `如果你看见${monster.name}在${place}附近绕圈，不用担心，它多半是在寻找${favorite}。${avatarFeature}的它把每一次发现都当作藏宝图，连${mood.treasure}也会编号收藏。真正危险时，它会立刻用“${skillName}”${mood.action}，然后宣布：“${catchphrase}！”`,
  ];

  return pick(storyRoutes, `${monster.name}-${place}-${monster.avatar}`, 7);
}
