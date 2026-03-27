/// <reference types="vite/client" />

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
