import { useState, useRef, useCallback } from 'react';

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  lang?: string;
}

/** 检测浏览器是否支持语音识别 */
function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/** 获取 SpeechRecognition 构造函数 */
function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SpeechRecognitionInstance) | undefined;
  return ctor ?? null;
}

export default function VoiceInputButton({ onResult, lang = 'zh-CN' }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      alert('你的设备不支持语音输入，请手动输入哦！');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.error('语音识别错误:', event.error);
      if (event.error === 'not-allowed') {
        alert('请允许使用麦克风权限才能语音输入哦！');
      } else if (event.error === 'no-speech') {
        alert('没有听到声音，请大声一点试试！');
      } else {
        alert('语音识别出错了，请再试一次！');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`
        flex items-center justify-center
        w-10 h-10 rounded-full
        transition-all duration-200 active:scale-95
        ${isListening
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50'
          : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 hover:text-blue-300'
        }
      `}
      title={isListening ? '点击停止录音' : '点击语音输入'}
    >
      {isListening ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <rect x="6" y="4" width="4" height="12" rx="1" />
          <rect x="12" y="7" width="4" height="9" rx="1" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 10-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

export { isSpeechRecognitionSupported };
