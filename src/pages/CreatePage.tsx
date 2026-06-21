import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StepName from '../components/create/StepName';
import StepElement from '../components/create/StepElement';
import StepSkills from '../components/create/StepSkills';
import StepAvatar from '../components/create/StepAvatar';
import StepStats from '../components/create/StepStats';
import { generateStats } from '../components/create/StepStats';
import { db } from '../db/database';
import { useGameStore } from '../stores/gameStore';
import type { ElementType, Monster } from '../types';

interface SkillEntry {
  name: string;
  description: string;
}

const STEPS = [
  { id: 'name', label: '名字' },
  { id: 'element', label: '属性' },
  { id: 'skills', label: '技能' },
  { id: 'avatar', label: '形象' },
  { id: 'stats', label: '数值' },
];

export default function CreatePage() {
  const navigate = useNavigate();
  const currentTrainer = useGameStore((state) => state.currentTrainer);
  const setCurrentTrainer = useGameStore((state) => state.setCurrentTrainer);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 表单数据
  const [name, setName] = useState('');
  const [elements, setElements] = useState<ElementType[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([{ name: '', description: '' }]);
  const [avatar, setAvatar] = useState('');

  // 步骤验证
  const canProceed = () => {
    switch (currentStep) {
      case 0: return name.trim().length >= 1;
      case 1: return elements.length >= 1;
      case 2: return skills.some((s) => s.name.trim().length > 0);
      case 3: return avatar !== '';
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!canProceed()) return;

    setIsSaving(true);

    const stats = generateStats(elements);
    const validSkills = skills
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        id: `skill-${Date.now()}-${i}`,
        name: s.name.trim(),
        element: elements[0] || 'fire',
        power: 15 + Math.floor(Math.random() * 16), // 15-30
        accuracy: 90 + Math.floor(Math.random() * 11), // 90-100
        description: s.description.trim() || `${s.name.trim()}攻击`,
      }));

    const monster: Monster = {
      name: name.trim(),
      element: elements[0] || 'fire',
      skills: validSkills,
      avatar,
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      level: 1,
      exp: 0,
      createdBy: 'user',
      createdAt: new Date(),
    };

    try {
      const monsterId = await db.monsters.add(monster);

      // 关联到当前训练师
      if (currentTrainer && currentTrainer.id) {
        const updatedMonsterIds = [...currentTrainer.monsterIds, monsterId as number];
        await db.trainers.update(currentTrainer.id, {
          monsterIds: updatedMonsterIds,
        });
        setCurrentTrainer({
          ...currentTrainer,
          monsterIds: updatedMonsterIds,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试！');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepName name={name} onChange={setName} />;
      case 1:
        return <StepElement elements={elements} onChange={setElements} />;
      case 2:
        return <StepSkills skills={skills} onChange={setSkills} elements={elements} />;
      case 3:
        return <StepAvatar avatar={avatar} onChange={setAvatar} />;
      case 4:
        return <StepStats name={name} elements={elements} skills={skills} avatar={avatar} />;
      default:
        return null;
    }
  };

  if (saveSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <div className="text-8xl celebrate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-yellow-300 pixel-title text-center">
          创造成功！
        </h2>
        <p className="text-xl text-gray-300 text-center">
          {name} 已经加入你的宝可梦队伍！
        </p>
        <p className="text-sm text-gray-500">即将返回主页...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-blue-400 hover:text-blue-300 text-lg font-bold flex items-center gap-1"
        >
          <span>←</span> 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-300 pixel-title">🎨 创造宝可梦</h1>
        <div className="w-12" />
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-2 py-2">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`step-dot w-3 h-3 rounded-full transition-all ${
                index === currentStep
                  ? 'active bg-yellow-400 scale-125'
                  : index < currentStep
                    ? 'bg-green-400'
                    : 'bg-gray-600'
              }`}
            />
            <span
              className={`text-xs font-bold hidden sm:inline ${
                index === currentStep ? 'text-yellow-300' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div className="w-4 h-0.5 bg-gray-700 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* 步骤内容 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {renderStep()}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between gap-4 pt-2 pb-4">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
            currentStep === 0
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600 active:scale-95'
          }`}
        >
          ← 上一步
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
              canProceed()
                ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 active:scale-95 shadow-lg'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            下一步 →
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving || !canProceed()}
            className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
              canProceed() && !isSaving
                ? 'bg-green-500 text-white hover:bg-green-400 active:scale-95 shadow-lg'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isSaving ? '💾 保存中...' : '✅ 完成创造'}
          </button>
        )}
      </div>
    </div>
  );
}
