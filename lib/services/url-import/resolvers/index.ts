
import type { MediaUrlResolver } from "./types";
import { giphyResolver } from "./giphy-resolver";
import { tenorResolver } from "./tenor-resolver";
import { xResolver } from "./x-resolver";

const RESOLVERS: readonly MediaUrlResolver[] = [xResolver, giphyResolver, tenorResolver];

export function findResolver(url: URL): MediaUrlResolver | undefined {
  return RESOLVERS.find((resolver) => resolver.matches(url));
}

export type { MediaUrlResolver, ResolveContext, ResolvedMedia } from "./types";


