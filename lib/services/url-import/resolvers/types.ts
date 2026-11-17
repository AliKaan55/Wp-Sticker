
export interface ResolveContext {
  remainingMs(): number;
}

export interface ResolvedMedia {
  readonly candidates: readonly URL[];
  readonly filenameHint: string;
}

export interface MediaUrlResolver {
  readonly id: string;
  matches(url: URL): boolean;
  resolve(url: URL, context: ResolveContext): Promise<ResolvedMedia>;
}


