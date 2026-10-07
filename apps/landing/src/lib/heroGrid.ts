// The hero's week: 7 columns × 5 rows of tiles. Scheduled posts are Nile, published posts
// are the soft tint, and one Papyrus tile is the suggested best time. Shared by the static
// poster (server-rendered) and the three.js scene so both show the same week.
export const COLS = 7;
export const ROWS = 5;
export type TileKind = 'empty' | 'post' | 'soft' | 'best';

const POSTS: [number, number][] = [[1, 0], [2, 1], [4, 1], [0, 2], [3, 2], [5, 3], [2, 4], [6, 1]];
const SOFT: [number, number][] = [[1, 3], [4, 4], [6, 3]];
export const BEST = 3 * COLS + 3;

export const TILE_KINDS: TileKind[] = (() => {
  const kinds: TileKind[] = Array.from({ length: COLS * ROWS }, () => 'empty');
  POSTS.forEach(([x, y]) => (kinds[y * COLS + x] = 'post'));
  SOFT.forEach(([x, y]) => (kinds[y * COLS + x] = 'soft'));
  kinds[BEST] = 'best';
  return kinds;
})();
