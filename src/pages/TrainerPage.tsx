import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import { STARTER_CONFIG } from '../game/starterMonsters';
import MonsterElementBadges from '../components/MonsterElementBadges';
import TrainerAvatar from '../components/TrainerAvatar';
import VoiceTextInput from '../components/VoiceTextInput';
import { TRAINER_AVATARS, getTrainerAvatarOption, isCustomTrainerAvatar } from '../game/trainerAvatars';
import type { Monster, Trainer } from '../types';

type Step = 'trainer' | 'starter';

function resizeTrainerAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片格式不支持'));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法处理图片'));
          return;
        }
        canvas.width = size;
        canvas.height = size;
        const sourceSize = Math.min(img.width, img.height);
        const sx = (img.width - sourceSize) / 2;
        const sy = (img.height - sourceSize) / 2;
        ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function TrainerPage() {
  const navigate = useNavigate();
  const { setCurrentTrainer } = useGameStore();
  const [step, setStep] = useState<Step>('trainer');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedStarter, setSelectedStarter] = useState<Monster | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('请选择图片文件');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError('图片太大啦，换一张小一点的');
      return;
    }
    try {
      const resized = await resizeTrainerAvatar(file);
      setAvatar(resized);
      setAvatarError('');
    } catch (err) {
      console.error('头像上传失败:', err);
      setAvatarError('头像处理失败，请换一张图片');
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !avatar || !selectedStarter) return;

    setIsSaving(true);

    try {
      let savedTrainer: Trainer | null = null;
      await db.transaction('rw', db.trainers, db.monsters, async () => {
        const trainerId = await db.trainers.add({
          name: name.trim(),
          avatar,
          monsterIds: [],
          createdAt: new Date(),
        });
        if (typeof trainerId !== 'number') throw new Error('保存训练师失败');

        const starterId = await db.monsters.add({
          ...selectedStarter,
          id: undefined,
          trainerId,
          createdAt: new Date(),
        });
        if (typeof starterId !== 'number') throw new Error('保存宝可梦失败');

        savedTrainer = {
          id: trainerId,
          name: name.trim(),
          avatar,
          monsterIds: [starterId],
          activeMonsterId: starterId,
          createdAt: new Date(),
        };
        await db.trainers.update(trainerId, {
          monsterIds: savedTrainer.monsterIds,
          activeMonsterId: starterId,
        });
      });
      if (!savedTrainer) throw new Error('保存训练师失败');
      setCurrentTrainer(savedTrainer);
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
    <div className="trainer-page flex flex-col min-h-[100dvh] p-4 gap-4">
      {/* 顶部 */}
      <div className="page-topbar sticky top-0 z-40 flex items-center justify-between">
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
        <div className="trainer-workspace flex-1 flex flex-col items-center justify-center gap-6 min-h-0 overflow-y-auto">
          <div className="text-6xl">🧑‍🎤</div>
          <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
            创建训练师！
          </h2>
          <p className="text-lg text-gray-300 text-center">
            你是谁？选择一个形象开始冒险吧！
          </p>

          {/* 名字输入 */}
          <div className="w-full max-w-sm">
            <VoiceTextInput
              type="text"
              value={name}
              onChangeText={setName}
              placeholder="输入你的名字"
              wrapperClassName="w-full"
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
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-1 h-20 rounded-xl transition-all duration-200 active:scale-95 ${
                  isCustomTrainerAvatar(avatar) ? 'ring-2 ring-yellow-400 scale-105 shadow-lg' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: '#22c55e20',
                  boxShadow: isCustomTrainerAvatar(avatar) ? '0 0 16px #22c55e60' : undefined,
                }}
              >
                {isCustomTrainerAvatar(avatar) ? (
                  <TrainerAvatar avatar={avatar} className="w-9 h-9 rounded-lg" imageClassName="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-3xl">📷</span>
                )}
                <span className="text-xs font-bold text-green-300">
                  上传
                </span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            {avatarError && (
              <p className="text-center text-sm text-red-300 mt-3">{avatarError}</p>
            )}
          </div>

          {/* 预览 */}
          {name && avatar && (
            <div className="pixel-border rounded-xl px-6 py-4 bg-gray-800/50 text-center flex flex-col items-center gap-2">
              <p className="text-lg text-yellow-200/80">你好，训练师！</p>
              {(() => {
                const opt = getTrainerAvatarOption(avatar);
                return (
                  <div className="flex items-center gap-3">
                    <TrainerAvatar
                      avatar={avatar}
                      className="w-14 h-14 rounded-xl"
                      imageClassName="w-full h-full object-cover rounded-xl"
                      emojiClassName="text-4xl"
                    />
                    <div className="text-left">
                      <span className="text-xl font-bold text-white">{name}</span>
                      <p className="text-xs text-gray-400">{opt?.label || '自定义头像'}</p>
                    </div>
                  </div>
                );
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
        <div className="trainer-workspace flex-1 flex flex-col items-center gap-6 min-h-0 overflow-y-auto">
          <div className="text-6xl">⚡</div>
          <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
            选择你的初始宝可梦！
          </h2>
          <p className="text-lg text-gray-300 text-center">
            三只宝可梦，选一个作为你的伙伴吧！
          </p>

          {/* 初始宝可梦卡片 */}
          <div className="flex flex-col gap-4 w-full max-w-sm">
            {STARTER_CONFIG.map(({ monster, emoji, bgColor, description }) => {
              const isSelected = selectedStarter?.name === monster.name;

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
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">{monster.name}</span>
                        <MonsterElementBadges monster={monster} />
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
