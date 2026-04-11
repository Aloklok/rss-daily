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

  // --- 逻辑重构：移除原生语音，实现异步轮询 ---
  const [isPolling, setIsPolling] = useState(false);

  // 轮询逻辑：当有文稿但没音频时启动
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPolling && !audioUrl && date) {
      timer = setInterval(() => {
        // 增加时间戳防止缓存
        fetch(`/api/podcasts/fetch?date=${date}&lang=${dict.lang}&_t=${Date.now()}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.audioUrl) {
              setAudioUrl(data.audioUrl);
              setIsPolling(false);
              // 自动切换到播放状态
              setAudioState('playing');
              setLoadingText(dict.podcast.status.preparing);
            }
          })
          .catch((err) => console.error('[Podcast] Polling failed:', err));
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPolling, audioUrl, date, dict.lang]);

  const handleGenerateAndPlay = async (forceRegenerate: boolean = false) => {
    if (audioState === 'loading') return;

    // 暂停/恢复逻辑
    if (audioState === 'playing' && !forceRegenerate) {
      if (audioRef.current) audioRef.current.pause();
      setAudioState('paused');
      return;
    }

    if (audioState === 'paused' && !forceRegenerate) {
      if (audioRef.current && audioUrl) {
        audioRef.current.play();
        setAudioState('playing');
      }
      return;
    }

    // 如果已有音频 URL 且未强制重生成，直接播放
    if (audioUrl && !forceRegenerate) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setAudioState('playing');
      }
      return;
    }

    // 重置状态开始生成
    setAudioState('loading');
    isGeneratingRef.current = true;
    setLoadingText(dict.podcast.status.checking);

    if (forceRegenerate) {
      setLoadingText(dict.podcast.status.redrafting);
      scriptRef.current = null;
      setAudioUrl(null);
      setIsPolling(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }

    try {
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

      if (data.error) throw new Error(data.error);

      if (data.script) {
        scriptRef.current = data.script;
        isGeneratingRef.current = false;

        if (data.audioUrl) {
          setAudioUrl(data.audioUrl);
          setAudioState('playing');
        } else {
          // 文稿已好，开始轮询音频
          setLoadingText(dict.podcast.status.recording || '正在录制语音播报...');
          setIsPolling(true);
          // 注意：此处保持 loading 状态，直到轮询拿到 URL
        }
      }
    } catch (err: any) {
      console.error('Podcast Generation Failed:', err);
      isGeneratingRef.current = false;
      setIsPolling(false);
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

  // 当 audioUrl 变化且已准备好播放时触发
  useEffect(() => {
    if (audioUrl && audioState === 'playing' && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn('[Podcast] Audio play blocked:', err);
      });
    }
  }, [audioUrl, audioState]);

  // 拉取最新讲稿
  const fetchLatestScript = useCallback(() => {
    setIsFetchingScript(true);
    fetch(`/api/podcasts/fetch?date=${date}&lang=${dict.lang}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.script) scriptRef.current = data.script;
        if (data.audioUrl) setAudioUrl(data.audioUrl);
      })
      .catch((err) => console.error('Failed to fetch script:', err))
      .finally(() => setIsFetchingScript(false));
  }, [date, dict.lang]);

  useEffect(() => {
    if (showScript && !scriptRef.current) {
      fetchLatestScript();
    }
  }, [showScript, fetchLatestScript]);

  return (
    <div className="flex flex-col gap-2">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setAudioState('idle')}
          onError={() => {
            console.error('[Podcast] Audio playback error');
            setAudioState('error');
            setLoadingText('语音文件加载失败');
          }}
          className="hidden"
        />
      )}
      <div
        className="group relative flex h-10 items-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
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

        <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />

        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex h-full w-10 items-center justify-center rounded-r-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-sky-500 dark:hover:bg-gray-800"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          />
        </button>

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
                <button
                  onClick={() => fetchLatestScript()}
                  disabled={isFetchingScript}
                  title={dict.podcast.actions.refresh}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-sky-500 disabled:opacity-50 dark:hover:bg-gray-800"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetchingScript ? 'animate-spin' : ''}`} />
                </button>
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
                    .replace(/([一二三四五六七八九十]、|(?:[1-9][0-9]?)、|(?:[1-9][0-9]?)\.(?!\d))/g, '\n$1')
                    .split('\n')
                    .filter((line: string) => line.trim() !== '')
                    .map((line: string, i: number) => {
                      const isListItem = /^([一二三四五六七八九十]、|(?:[1-9][0-9]?)、|(?:[1-9][0-9]?)\.(?!\d))/.test(line.trim());
                      const pClass = isListItem 
                        ? 'mb-6 pl-8 md:pl-10 -indent-5 leading-loose tracking-wide'
                        : 'mb-6 indent-8 leading-loose tracking-wide';
                      const fragments = line.split(/(关于[^，。；]+[，。；])/g);
                      return (
                        <p key={i} className={pClass}>
                          {fragments.map((frag, fragIdx) => {
                            if (frag.startsWith('关于') && frag.length > 2) {
                              return (
                                <strong key={fragIdx} className="font-bold text-indigo-700 dark:text-indigo-400">
                                  {frag.replace(/\*\*/g, '')}
                                </strong>
                              );
                            }
                            return <React.Fragment key={fragIdx}>{frag.replace(/\*\*/g, '')}</React.Fragment>;
                          })}
                        </p>
                      );
                    })}
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
