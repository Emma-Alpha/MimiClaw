/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_MIMICLAW_CLOUD_ONLY?: string;
  readonly VITE_CLOUD_API_BASE_URL?: string;

  readonly VITE_XIAOJIU_AUTH_URL?: string;
  readonly VITE_XIAOJIU_CLIENT_ID?: string;
  readonly VITE_XIAOJIU_APP_ID?: string;
  readonly VITE_XIAOJIU_CALLBACK_URL?: string;
  readonly VITE_XIAOJIU_EXCHANGE_PATH?: string;
  /** HTTPS URL returning JSON update policy (see README / .env.example). */
  readonly VITE_UPDATE_POLICY_URL?: string;
  // Auto-fill defaults (applied on first login if user hasn't configured)
  readonly VITE_DEFAULT_CODE_AGENT_BASE_URL?: string;
  readonly VITE_DEFAULT_CODE_AGENT_API_KEY?: string;
  readonly VITE_DEFAULT_CODE_AGENT_MODEL?: string;
  readonly VITE_DEFAULT_AIHUB_API_URL?: string;
  readonly VITE_DEFAULT_AIHUB_API_KEY?: string;
  readonly VITE_DEFAULT_SPEECH_APP_ID?: string;
  readonly VITE_DEFAULT_SPEECH_CLUSTER?: string;
  readonly VITE_DEFAULT_SPEECH_TOKEN?: string;
  readonly VITE_DEFAULT_VOICE_CHAT_APP_ID?: string;
  readonly VITE_DEFAULT_VOICE_CHAT_ACCESS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace React.JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        allowpopups?: string | boolean;
        partition?: string;
        useragent?: string;
      },
      HTMLElement
    >;
  }
}

declare module '*.webm' {
  const src: string;
  export default src;
}
