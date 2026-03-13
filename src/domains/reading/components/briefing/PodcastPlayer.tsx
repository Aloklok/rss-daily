'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Headphones,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  ChevronDown,
  FileText,
  X,
} from 'lucide-react';
import { Dictionary } from '@/app/i18n/dictionaries';
import { ModelSelector } from '@/domains/intelligence/components/ai/ModelSelector';
import { ReasoningToggle } from '@/domains/intelligence/components/ai/ReasoningToggle';
import { DEFAULT_MODEL_ID, MODELS } from '@/domains/intelligence/constants';
import { useUIStore } from '@/shared/store/uiStore';

interface PodcastPlayerProps {
  date: string;
  dict: Dictionary;
}

type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function PodcastPlayer({ date, dict }: PodcastPlayerProps) {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [loadingText, setLoadingText] = useState(dict.podcast.status.preparing);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [isFetchingScript, setIsFetchingScript] = useState(false);
  const isAdmin = useUIStore((state) => state.isAdmin);
  const isGeneratingRef = useRef(false);
  const scriptRef = useRef<string | null>(null);
  const chunksRef = useRef<string[]>([]); // 切分后的文本块
  const currentChunkIndexRef = useRef(0); // 当前播放到第几块
  const audioRef = useRef<HTMLAudioElement | null>(null); // Edge TTS MP3 播放器
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // Edge TTS 音频 URL
  const [ttsSource, setTtsSource] = useState<'edge' | 'web' | null>(null); // 当前激活的音频源
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('alok-podcast-model') || DEFAULT_MODEL_ID;
    }
    return DEFAULT_MODEL_ID;
  });
  const [enableThinking, setEnableThinking] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alok-podcast-thinking');
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  // 衍生状态：模型元数据
  const selectedModelMeta = MODELS.find((m) => m.id === selectedModel.split('@')[0]);

  // 持久化选中的模型
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('alok-podcast-model', selectedModel);
    }
  }, [selectedModel]);

  // 持久化思考模式
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('alok-podcast-thinking', enableThinking.toString());
    }
  }, [enableThinking]);

  // 自动降级逻辑：如果模型不支持推理，则关闭开关
  useEffect(() => {
    if (selectedModelMeta && !selectedModelMeta.hasReasoning && enableThinking) {
      setEnableThinking(false);
    }
  }, [selectedModel, selectedModelMeta, enableThinking]);

  // Eagerly trigger voice loading in browser
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // This forces voices to populate in Safari/Chrome
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync state with native synthesis engine in case system interrupts
  // 注意：当通过 <audio> 播放 MP3 时，跳过 Web Speech 状态同步
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        audioState === 'idle' ||
        audioState === 'loading' ||
        audioState === 'error' ||
        audioState === 'paused'
      )
        return;

      // 如果正在用 <audio> 播放 MP3，不检查 speechSynthesis 的状态
      if (audioUrl) return;

      if (window.speechSynthesis) {
        if (window.speechSynthesis.speaking) {
          if (audioState !== 'playing') setAudioState('playing');
        } else if (!window.speechSynthesis.speaking && audioState === 'playing') {
          setAudioState('idle'); // Finished
          currentChunkIndexRef.current = 0;
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [audioState, audioUrl]);

  const playScript = (text: string, startFrom: number = 0) => {
    if (!window.speechSynthesis) {
      setLoadingText(dict.podcast.status.unsupported);
      setAudioState('error');
      return;
    }

    window.speechSynthesis.cancel(); // 彻底清空队列
    scriptRef.current = text;
    setTtsSource('web'); // 明确标记当前使用 Web Speech

    // 如果是从头开始，重新切分文本块
    if (startFrom === 0) {
      const cleanText = text.replace(/[*_#`~]/g, '');
      const chunkRegex = /[^。！？.!?\n]+[。！？.!?\n]+/g;
      chunksRef.current = cleanText.match(chunkRegex) || [cleanText];
      currentChunkIndexRef.current = 0;
    }

    const chunks = chunksRef.current;
    if (startFrom >= chunks.length) {
      setAudioState('idle');
      currentChunkIndexRef.current = 0;
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const validVoices = voices.filter((v) => v.lang.includes('zh'));

    // Edge 浏览器检测：Edge 的 Xiaoxiao 神经语音中英混读效果最佳
    const isEdge = /Edg\//i.test(navigator.userAgent);

    const preferredVoice = isEdge
      ? // Edge 优先：Xiaoxiao 神经语音 > 其他中文语音
        validVoices.find((v) => v.name.includes('Xiaoxiao')) ||
        validVoices.find((v) => v.name.includes('Microsoft') && v.lang === 'zh-CN') ||
        validVoices.find((v) => v.lang === 'zh-CN') ||
        validVoices[0]
      : // 其他浏览器：Google 普通话 > Premium > Xiaoxiao > Ting-Ting
        validVoices.find((v) => v.name.includes('Google') && v.name.includes('普通话')) ||
        validVoices.find((v) => v.name.includes('Premium')) ||
        validVoices.find((v) => v.name.includes('Xiaoxiao')) ||
        validVoices.find((v) => v.name.includes('Ting-Ting')) ||
        validVoices.find((v) => v.lang === 'zh-CN') ||
        validVoices[0];

    // 从 startFrom 位置开始播放剩余的 chunks
    const remainingChunks = chunks.slice(startFrom);
    remainingChunks.forEach((chunkText, relativeIndex) => {
      if (!chunkText.trim()) return;
      const absoluteIndex = startFrom + relativeIndex;
      const utterance = new SpeechSynthesisUtterance(chunkText.trim());

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // 每个 chunk 开始播放时更新位置标记
      utterance.onstart = () => {
        currentChunkIndexRef.current = absoluteIndex;
      };

      // 最后一个 chunk 播放结束时重置状态
      if (absoluteIndex === chunks.length - 1) {
        utterance.onend = () => {
          setAudioState('idle');
          currentChunkIndexRef.current = 0;
        };
      }

      window.speechSynthesis.speak(utterance);
    });

    setAudioState('playing');
  };

  const handleGenerateAndPlay = async (forceRegenerate: boolean = false) => {
    if (audioState === 'loading') return;

    if (audioState === 'playing' && !forceRegenerate) {
      // 暂停：优先处理 <audio> 元素，否则处理 Web Speech
      if (audioRef.current && audioUrl) {
        audioRef.current.pause();
      } else {
        window.speechSynthesis?.cancel();
      }
      setAudioState('paused');
      return;
    }

    if (audioState === 'paused' && !forceRegenerate) {
      // 恢复：优先处理 <audio> 元素，否则处理 Web Speech
      if (audioRef.current && audioUrl && ttsSource === 'edge') {
        audioRef.current.play();
        setAudioState('playing');
      } else if (scriptRef.current) {
        playScript(scriptRef.current, currentChunkIndexRef.current);
      }
      return;
    }

    // 如果已有音频 URL 且未强制重生成，直接播放 MP3
    if (audioUrl && !forceRegenerate) {
      if (audioRef.current) {
        setTtsSource('edge');
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setAudioState('playing');
      }
      return;
    }

    // 如果已有脚本但没有音频 URL，降级到 Web Speech
    if (scriptRef.current && !forceRegenerate) {
      playScript(scriptRef.current);
      return;
    }

    setAudioState('loading');
    isGeneratingRef.current = true;
    setLoadingText(dict.podcast.status.checking);

    if (forceRegenerate) {
      setLoadingText(dict.podcast.status.redrafting);
      scriptRef.current = null;
      setAudioUrl(null);
      setTtsSource(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }

    try {
      // A tiny silent synthesis to unlock Web Speech context on Safari safely within the interaction event
      if (window.speechSynthesis) {
        const unlock = new SpeechSynthesisUtterance('');
        unlock.volume = 0;
        window.speechSynthesis.speak(unlock);
      }

      const response = await fetch('/api/podcasts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          forceRegenerate,
          modelId: selectedModel,
          enableThinking: enableThinking,
          language: dict.lang,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || dict.podcast.status.serverError);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.script) {
        isGeneratingRef.current = false;
        scriptRef.current = data.script;

        if (data.audioUrl) {
          // 优先用 Edge TTS 生成的 MP3
          setAudioUrl(data.audioUrl);
          setTtsSource('edge'); // 锁定为 Edge 模式
          setAudioState('playing');
          // useEffect 会监听 audioUrl 变化并触发播放
        } else {
          // 降级到 Web Speech API
          setTtsSource('web');
          playScript(data.script);
        }
      }
    } catch (err: any) {
      console.error('Podcast Generation Failed:', err);
      isGeneratingRef.current = false;
      setAudioState('error');
      setLoadingText(err.message || dict.podcast.status.draftingFailed);
      setTimeout(() => setAudioState('idle'), 4000);
    }
  };

  const getButtonContent = () => {
    switch (audioState) {
      case 'loading':
        return (
          <span className="text-primary-500 flex animate-pulse items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </span>
        );
      case 'playing':
        return (
          <span className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium transition">
            <Pause className="h-4 w-4" />
            {dict.podcast.status.paused}
          </span>
        );
      case 'paused':
        return (
          <span className="text-primary-600 hover:text-primary-700 flex items-center gap-2 font-medium transition">
            <Play className="h-4 w-4" />
            {dict.podcast.status.playing}
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-2 font-medium text-red-500">
            <Headphones className="h-4 w-4" />
            {dict.podcast.status.failed}
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-2 font-medium text-gray-600 transition dark:text-gray-300">
            <Play className="text-primary-500 fill-primary-500/10 h-4 w-4" />
            {dict.podcast.status.idle}
          </span>
        );
    }
  };

  // Add click-outside listener for dropdown
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = () => setShowDropdown(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  // 当 audioUrl 变化且 audioState 为 playing 时，主动触发播放
  useEffect(() => {
    if (audioUrl && audioState === 'playing' && audioRef.current && ttsSource === 'edge') {
      // 确保在尝试播放 MP3 之前，Web Speech 是完全取消的
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      audioRef.current.play().catch((err) => {
        // 浏览器可能阻止自动播放，或者网络加载极慢
        console.warn('[Podcast] Audio play blocked or failed:', err);

        // 只有当 TtsSource 依然是 edge 且真的失败了，才考虑降级
        // 增加一个微小的延迟判断，避免状态切换瞬间的误判
        setTimeout(() => {
          if (audioState === 'playing' && audioRef.current?.paused && ttsSource === 'edge') {
            console.warn('[Podcast] Falling back to Web Speech after verification');
            setTtsSource('web');
            if (scriptRef.current) playScript(scriptRef.current);
          }
        }, 300);
      });
    }
  }, [audioUrl, audioState, ttsSource]);

  // 拉取最新讲稿（弹窗打开时自动调用 + 手动刷新）
  const fetchLatestScript = useCallback(() => {
    setIsFetchingScript(true);
    fetch(`/api/podcasts/fetch?date=${date}&lang=${dict.lang}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.script) {
          scriptRef.current = data.script;
        }
        if (data.audioUrl) {
          setAudioUrl(data.audioUrl);
        }
      })
      .catch((err) => console.error('Failed to fetch existing script:', err))
      .finally(() => setIsFetchingScript(false));
  }, [date]);

  useEffect(() => {
    if (showScript && !scriptRef.current) {
      fetchLatestScript();
    }
  }, [showScript, fetchLatestScript]);

  return (
    <div className="flex flex-col gap-2">
      {/* 隐藏的 <audio> 元素：Edge TTS MP3 播放器（不自动播放，由用户主动触发） */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setAudioState('idle')}
          onError={() => {
            // MP3 播放失败，降级到 Web Speech
            console.warn('[Podcast] Audio playback failed, falling back to Web Speech');
            setAudioUrl(null);
            if (scriptRef.current) playScript(scriptRef.current);
          }}
          className="hidden"
        />
      )}
      <div
        className="group relative flex h-10 items-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Main Play Button */}
        <button
          type="button"
          onClick={() => {
            setShowDropdown(false);
            handleGenerateAndPlay(false);
          }}
          className="z-10 flex h-full items-center justify-center rounded-l-full pr-3 pl-5 whitespace-nowrap transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {getButtonContent()}
        </button>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />

        {/* Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex h-full w-10 items-center justify-center rounded-r-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-sky-500 dark:hover:bg-gray-800"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-[100] mt-2 w-32 rounded-2xl border border-gray-200 bg-white py-2 shadow-2xl duration-200 dark:border-gray-800 dark:bg-gray-950">
            {isAdmin && (
              <button
                onClick={() => {
                  handleGenerateAndPlay(true);
                  setShowDropdown(false);
                }}
                disabled={audioState === 'loading'}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-sky-600 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <RefreshCw
                  className={`h-4 w-4 ${audioState === 'loading' ? 'animate-spin' : ''}`}
                />
                {dict.podcast.actions.regenerate}
              </button>
            )}

            {/* 模型选择器 */}
            {isAdmin && (
              <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                <div className="mb-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  {dict.podcast.actions.model}
                </div>
                <ModelSelector
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  disabled={audioState === 'loading'}
                  align="right"
                  popDirection="down"
                  className="w-full"
                  dict={dict}
                />
              </div>
            )}

            {/* 深度思考开关 */}
            {isAdmin && (
              <div className="flex items-center justify-center border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                <ReasoningToggle
                  enabled={enableThinking}
                  onToggle={setEnableThinking}
                  disabled={audioState === 'loading' || !selectedModelMeta?.hasReasoning}
                  modelName={selectedModelMeta?.name}
                  size="sm"
                  dict={dict}
                />
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setShowScript(!showScript);
                  setShowDropdown(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FileText className="h-4 w-4" />
                {dict.podcast.actions.content}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Script Content Viewer */}
      {showScript && (
        <div className="animate-in fade-in fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 duration-200 md:p-6">
          <div className="animate-in zoom-in-[0.98] flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-sky-50 p-2 dark:bg-sky-900/30">
                  <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {dict.podcast.actions.content}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {/* 刷新讲稿按钮 */}
                <button
                  onClick={() => fetchLatestScript()}
                  disabled={isFetchingScript}
                  title={dict.podcast.actions.refresh}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-sky-500 disabled:opacity-50 dark:hover:bg-gray-800"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetchingScript ? 'animate-spin' : ''}`} />
                </button>
                {/* 播放讲稿按钮 */}
                {scriptRef.current && (
                  <button
                    onClick={() => {
                      handleGenerateAndPlay(false);
                    }}
                    title={
                      audioState === 'playing'
                        ? dict.podcast.status.paused
                        : dict.podcast.actions.play
                    }
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-sky-500 dark:hover:bg-gray-800"
                  >
                    {audioState === 'playing' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                )}
                {/* 关闭按钮 */}
                <button
                  onClick={() => setShowScript(false)}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
              {isFetchingScript ? (
                <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                  <p className="text-sm text-gray-500 md:text-base">
                    {dict.podcast.status.querying}
                  </p>
                </div>
              ) : scriptRef.current ? (
                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none leading-relaxed text-gray-700 dark:text-gray-300">
                  {scriptRef.current
                    .split('\n')
                    .filter((line: string) => line.trim() !== '') // Added type annotation for 'line'
                    .map(
                      (
                        line: string,
                        i: number, // Added type annotations for 'line' and 'i'
                      ) => (
                        <p key={i} className="mb-4 indent-8">
                          {line}
                        </p>
                      ),
                    )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
                  <p className="text-sm text-gray-500 md:text-base">
                    {dict.podcast.empty.noScript}
                  </p>
                  <button
                    onClick={() => {
                      handleGenerateAndPlay(false);
                      setShowScript(false);
                    }}
                    className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
                  >
                    {dict.podcast.actions.generateNow}
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <button
                onClick={() => setShowScript(false)}
                className="rounded-full bg-stone-800 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-900 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-white"
              >
                {dict.podcast.actions.gotIt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
