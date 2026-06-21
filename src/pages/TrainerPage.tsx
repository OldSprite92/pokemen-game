import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { STARTER_CONFIG } from '../game/starterMonsters';
import { ELEMENT_CONFIG } from '../components/create/StepElement';
import type { Monster } from '../types';

/** 训练师头像选项 */
export const TRAINER_AVATARS: Record<string, { emoji: string; label: string; color: string }> = {
  boy1: { emoji: '👦', label: '男孩', color: '#3b82f6' },
  girl1: { emoji: '👧', label: '女孩', color: '#ec4899' },
  man1: { emoji: '👨', label: '爸爸', color: '#1e40af' },
  woman1: { emoji: '👩', label: '妈妈', color: '#be185d' },
  boy2: { emoji: '🧑‍🎤', label: '少年', color: '#8b5cf6' },
  girl2: { emoji: '👸', label: '公主', color: '#f472b6' },
  grandpa: { emoji: '👴', label: '爷爷', color: '#78716c' },
  grandma: { emoji: '👵', label: '奶奶', color: '#a8a29e' },
};

type Step = 'trainer' | 'starter';

export default function TrainerPage() {
  const navigate = useNavigate();
  const { setCurrentTrainer } = useGameStore();
  const [step, setStep] = useState<Step>('trainer');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedStarter, setSelectedStarter] = useState<Monster | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !avatar || !selectedStarter) return;

    setIsSaving(true);

    try {
      // 先保存初始宝可梦到数据库
      const starterId = await db.monsters.add(selectedStarter);
      if (typeof starterId !== 'number') throw new Error('保存宝可梦失败');

      const trainer = {
        name: name.trim(),
        avatar,
        monsterIds: [starterId],
        activeMonsterId: starterId,
        createdAt: new Date(),
      };

      const id = await db.trainers.add(trainer);
      setCurrentTrainer({ ...trainer, id });
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试！');
    } finally {
      setIsSaving(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <div className="text-8xl celebrate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-yellow-300 pixel-title text-center">
          训练师创建成功！
        </h2>
        <p className="text-xl text-gray-300 text-center">
          {name} 和 {selectedStarter?.name} 准备好开始冒险了！
        </p>
        <p className="text-sm text-gray-500">即将返回主页...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-400 hover:text-blue-300 text-lg font-bold">
          ← 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">
          {step === 'trainer' ? '🧑‍🎤 训练师' : '⚡ 初始宝可梦'}
        </h1>
        <div className="w-12" />
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${step === 'trainer' ? 'bg-yellow-500/30 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>
          <span className="text-lg">1</span>
          <span className="text-sm font-bold">创建训练师</span>
        </div>
        <div className="text-gray-500">→</div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${step === 'starter' ? 'bg-yellow-500/30 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>
          <span className="text-lg">2</span>
          <span className="text-sm font-bold">选择宝可梦</span>
        </div>
      </div>

      {step === 'trainer' ? (
        /* ===== 步骤1：创建训练师 ===== */
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-6xl">🧑‍🎤</div>
          <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
            创建训练师！
          </h2>
          <p className="text-lg text-gray-300 text-center">
            你是谁？选择一个形象开始冒险吧！
          </p>

          {/* 名字输入 */}
          <div className="w-full max-w-sm flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的名字"
              className="flex-1 text-center text-2xl font-bold
                bg-gray-800 border-3 border-yellow-400/50 rounded-xl
                px-6 py-4 text-white
                placeholder:text-gray-500 placeholder:text-lg
                focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30
                focus:outline-none transition-all duration-200"
              maxLength={12}
            />
          </div>

          {/* 头像选择 */}
          <div className="w-full max-w-sm">
            <p className="text-center text-sm text-gray-400 mb-3">选择你的形象：</p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(TRAINER_AVATARS).map(([id, opt]) => {
                const isSelected = avatar === id;
                return (
                  <button
                    key={id}
                    onClick={() => setAvatar(id)}
                    className={`flex flex-col items-center justify-center gap-1 h-20 rounded-xl transition-all duration-200 active:scale-95 ${
                      isSelected ? 'ring-2 ring-yellow-400 scale-105 shadow-lg' : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: opt.color + '20',
                      boxShadow: isSelected ? `0 0 16px ${opt.color}60` : undefined,
                    }}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-xs font-bold" style={{ color: opt.color }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 预览 */}
          {name && avatar && (
            <div className="pixel-border rounded-xl px-6 py-4 bg-gray-800/50 text-center flex flex-col items-center gap-2">
              <p className="text-lg text-yellow-200/80">你好，训练师！</p>
              {(() => {
                const opt = TRAINER_AVATARS[avatar];
                return opt ? (
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{opt.emoji}</span>
                    <span className="text-xl font-bold text-white">{name}</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* 下一步按钮 */}
          <button
            onClick={() => setStep('starter')}
            disabled={!name.trim() || !avatar}
            className={`w-full max-w-sm py-4 rounded-xl font-bold text-xl transition-all ${
              name.trim() && avatar
                ? 'bg-blue-500 text-white hover:bg-blue-400 active:scale-95 shadow-lg'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            下一步：选择宝可梦 →
          </button>
        </div>
      ) : (
        /* ===== 步骤2：选择初始宝可梦 ===== */
        <div className="flex-1 flex flex-col items-center gap-6">
          <div className="text-6xl">⚡</div>
          <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
            选择你的初始宝可梦！
          </h2>
          <p className="text-lg text-gray-300 text-center">
            三只宝可梦，选一个作为你的伙伴吧！
          </p>

          {/* 初始宝可梦卡片 */}
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {STARTER_CONFIG.map(({ monster, emoji, bgColor, description, secondaryElement }) => {
              const isSelected = selectedStarter?.name === monster.name;
              const mainElement = ELEMENT_CONFIG[monster.element];
              const subElement = ELEMENT_CONFIG[secondaryElement];

              return (
                <button
                  key={monster.name}
                  onClick={() => setSelectedStarter(monster)}
                  className={`pixel-border rounded-xl p-4 text-left transition-all active:scale-95 ${
                    isSelected ? 'border-yellow-400 border-2 bg-yellow-400/10' : 'bg-gray-800/70 hover:bg-gray-700/70'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                      style={{ backgroundColor: bgColor + '30' }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">{monster.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: mainElement?.color + '30', color: mainElement?.color }}>
                          {mainElement?.emoji} {mainElement?.label}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: subElement?.color + '30', color: subElement?.color }}>
                          {subElement?.emoji} {subElement?.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{description}</p>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>HP {monster.hp}</span>
                        <span>攻击 {monster.attack}</span>
                        <span>防御 {monster.defense}</span>
                        <span>速度 {monster.speed}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        技能: {monster.skills.map((s) => s.name).join('、')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 已选预览 */}
          {selectedStarter && (
            <div className="pixel-border rounded-xl px-6 py-4 bg-gray-800/50 text-center">
              <p className="text-lg text-yellow-200/80">你选择了：</p>
              <p className="text-2xl font-bold text-white mt-2">
                {STARTER_CONFIG.find((s) => s.monster.name === selectedStarter.name)?.emoji} {selectedStarter.name}
              </p>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={handleSave}
              disabled={!selectedStarter || isSaving}
              className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
                selectedStarter && !isSaving
                  ? 'bg-green-500 text-white hover:bg-green-400 active:scale-95 shadow-lg'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {isSaving ? '💾 保存中...' : '✅ 开始冒险！'}
            </button>
            <button
              onClick={() => setStep('trainer')}
              className="w-full py-3 rounded-xl bg-gray-700 text-gray-300 font-bold hover:bg-gray-600 transition-all"
            >
              ← 返回修改
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
