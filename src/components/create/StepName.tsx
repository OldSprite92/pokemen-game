import VoiceInputButton from '../VoiceInputButton';

interface StepNameProps {
  name: string;
  onChange: (name: string) => void;
}

export default function StepName({ name, onChange }: StepNameProps) {
  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <div className="text-6xl celebrate-bounce">✏️</div>
      <h2 className="text-2xl font-bold text-yellow-300 pixel-title text-center">
        给它起个名字吧！
      </h2>
      <p className="text-lg text-gray-300 text-center">
        每个伟大的宝可梦都有一个响亮的名字 🌟
      </p>
      <div className="flex items-center gap-3 w-full max-w-sm">
        <input
          type="text"
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="给它起个酷酷的名字吧！"
          className="flex-1 text-center text-2xl font-bold
            bg-gray-800 border-3 border-yellow-400/50 rounded-xl
            px-6 py-4 text-white
            placeholder:text-gray-500 placeholder:text-lg
            focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30
            focus:outline-none transition-all duration-200"
          maxLength={20}
        />
        <VoiceInputButton onResult={onChange} />
      </div>
      {name && (
        <div className="text-lg text-yellow-200/80 pixel-border rounded-lg px-4 py-2 bg-gray-800/50">
          👋 你叫 <span className="text-yellow-300 font-bold">{name}</span> ，对吗？
        </div>
      )}
    </div>
  );
}
