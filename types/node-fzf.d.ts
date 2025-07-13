declare module 'node-fzf' {
  interface FzfOptions {
    list: string[];
    mode?: 'fuzzy' | 'normal';
    query?: string;
    selectOne?: boolean;
    height?: number;
    prelinehook?: (index: number) => string;
    postlinehook?: (index: number) => string;
  }

  interface FzfResult {
    selected?: {
      value: string;
      index: number;
    };
    query: string;
  }

  function nfzf(options: FzfOptions): Promise<FzfResult>;

  export = nfzf;
}
