import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_PET_ANIMATION,
  PET_ANIMATION_SOURCES,
  PET_ANIMATIONS,
  type PetAnimation,
} from '@/lib/pet-floating';
import { useSettingsStore } from '@/stores/settings';
import type { PetRuntimeState } from '../../shared/pet';

const FALLBACK_RUNTIME_STATE: PetRuntimeState = {
  animation: DEFAULT_PET_ANIMATION,
  activity: 'idle',
  showTerminal: false,
  updatedAt: 0,
};

export function PetFloating() {
  const { i18n } = useTranslation('settings');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const initSettings = useSettingsStore((state) => state.init);
  const petAnimation = useSettingsStore((state) => state.petAnimation);
  const [runtimeState, setRuntimeState] = useState<PetRuntimeState>(FALLBACK_RUNTIME_STATE);

  const currentAnimation = useMemo<PetAnimation>(() => {
    const preferred = runtimeState.activity === 'idle'
      ? petAnimation
      : runtimeState.animation;
    return PET_ANIMATIONS.includes(preferred)
      ? preferred
      : DEFAULT_PET_ANIMATION;
  }, [petAnimation, runtimeState.activity, runtimeState.animation]);

  useEffect(() => {
    void initSettings();
  }, [initSettings]);

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === 'clawx-settings') {
        void initSettings();
      }
    };

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, [initSettings]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [currentAnimation]);

  useEffect(() => {
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const rootStyle = document.getElementById('root')?.style;
    const previous = {
      htmlBackground: htmlStyle.background,
      bodyBackground: bodyStyle.background,
      rootBackground: rootStyle?.background ?? '',
      bodyOverflow: bodyStyle.overflow,
      bodyMargin: bodyStyle.margin,
    };

    htmlStyle.background = 'transparent';
    bodyStyle.background = 'transparent';
    bodyStyle.overflow = 'hidden';
    bodyStyle.margin = '0';
    if (rootStyle) {
      rootStyle.background = 'transparent';
    }

    return () => {
      htmlStyle.background = previous.htmlBackground;
      bodyStyle.background = previous.bodyBackground;
      bodyStyle.overflow = previous.bodyOverflow;
      bodyStyle.margin = previous.bodyMargin;
      if (rootStyle) {
        rootStyle.background = previous.rootBackground;
      }
    };
  }, []);

  useEffect(() => {
    void window.electron.ipcRenderer.invoke('pet:getRuntimeState')
      .then((state) => {
        if (state && typeof state === 'object') {
          setRuntimeState(state as PetRuntimeState);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('pet:settings-updated', () => {
      void initSettings();
    });
    return () => {
      unsubscribe?.();
    };
  }, [initSettings]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('pet:runtime-state', (payload) => {
      if (payload && typeof payload === 'object') {
        setRuntimeState(payload as PetRuntimeState);
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <div
      className="drag-region relative flex h-screen w-screen items-end justify-center bg-transparent"
      onContextMenu={(event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        void window.electron.ipcRenderer.invoke('pet:showContextMenu', {
          x: event.clientX,
          y: event.clientY,
          language: i18n.resolvedLanguage || i18n.language,
        });
      }}
    >
      {runtimeState.showTerminal && (
        <div className="pointer-events-none absolute inset-x-10 bottom-1 z-0 h-20 rounded-[28px] bg-black/92 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.48)]">
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-300/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/90" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-4/5 animate-pulse rounded-full bg-emerald-300/75" />
            <div className="h-2 w-3/5 animate-pulse rounded-full bg-emerald-200/55 [animation-delay:180ms]" />
            <div className="h-2 w-2/3 animate-pulse rounded-full bg-emerald-100/35 [animation-delay:320ms]" />
          </div>
        </div>
      )}

      <video
        key={currentAnimation}
        ref={videoRef}
        className="relative z-10 h-full w-full object-contain"
        src={PET_ANIMATION_SOURCES[currentAnimation]}
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
}
