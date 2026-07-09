import { useState, useRef, useCallback } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  lang?: string;
  label?: string;
  className?: string;
}

/** 检测是否支持语音识别（Web 或 Capacitor 原生） */
function isSpeechRecognitionSupported(): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/** 获取 Web SpeechRecognition 构造函数 */
function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SpeechRecognitionInstance) | undefined;
  return ctor ?? null;
}

export default function VoiceInputButton({ onResult, lang = 'zh-CN', label = '说', className = '' }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isNative = Capacitor.isNativePlatform();

  /** 使用 Capacitor 原生语音识别 */
  const startNativeListening = useCallback(async () => {
    try {
      // 检查权限状态
      const permission = await SpeechRecognition.checkPermissions();
      
      if (permission.speechRecognition !== 'granted') {
        // 申请权限 - 这会直接调用 Android 原生权限弹窗
        const requestResult = await SpeechRecognition.requestPermissions();
        if (requestResult.speechRecognition !== 'granted') {
          setPermissionDenied(true);
          alert('需要麦克风权限才能使用语音输入哦！');
          return;
        }
      }

      setPermissionDenied(false);
      setIsListening(true);

      // 开始原生语音识别 - 直接返回结果
      const result = await SpeechRecognition.start({
        language: lang,
        maxResults: 1,
        prompt: '请说话...',
        popup: true,
        partialResults: false,
      });

      if (result.matches && result.matches.length > 0) {
        onResult(result.matches[0]);
      }
      setIsListening(false);

    } catch (err) {
      console.error('启动语音识别失败:', err);
      alert('语音识别启动失败，请重试！');
      setIsListening(false);
    }
  }, [lang, onResult]);

  /** 使用 Web SpeechRecognition */
  const startWebListening = useCallback(() => {
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
        setPermissionDenied(true);
        alert('麦克风权限被拒绝，请在设置中允许访问麦克风。');
      } else if (event.error === 'no-speech') {
        alert('没有听到声音，请大声一点试试！');
      } else if (event.error === 'aborted') {
        // 用户主动取消，不提示错误
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

  const stopWebListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (isNative) {
      startNativeListening();
    } else {
      startWebListening();
    }
  }, [isNative, startNativeListening, startWebListening]);

  const stopListening = useCallback(() => {
    if (!isNative) {
      stopWebListening();
    }
    setIsListening(false);
  }, [isNative, stopWebListening]);

  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`
        flex items-center justify-center
        min-w-14 h-12 px-3 gap-1 rounded-xl
        text-sm font-bold
        transition-all duration-200 active:scale-95
        ${isListening
          ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50'
          : permissionDenied
            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40'
            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 hover:text-blue-300'
        }
        ${className}
      `}
      title={isListening ? '点击停止录音' : permissionDenied ? '麦克风权限被拒绝' : '点击语音输入'}
    >
      {isListening ? (
        <>
          <span className="text-lg">■</span>
          <span>停</span>
        </>
      ) : (
        <>
          <span className="text-lg">🎙️</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export { isSpeechRecognitionSupported };
