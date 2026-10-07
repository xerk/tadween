import {
  Color,
  DirectionalLight,
  Euler,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Shape,
  Vector3,
  WebGLRenderer,
} from 'three';
import { BEST, COLS, ROWS, TILE_KINDS } from '../heroGrid';

/** Shared with the GSAP side: `assemble` 0→1 flies the tiles into the grid,
    `tilt` 0→1 flattens and lifts the grid as the hero scrolls away. */
export interface HeroState {
  assemble: number;
  tilt: number;
}

export interface Hero3D {
  dispose: () => void;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';

/** The 3D hero: a week of rounded post tiles in one InstancedMesh (35 tiles, one draw
    call) that assemble into a calendar grid, a breathing Papyrus best-time tile, a damped
    pointer tilt and a scroll-driven flatten. Renders only while the canvas is on screen
    and the tab is visible, at a device pixel ratio capped at 1.75, in the theme's colours. */
export function createHero3D(
  canvas: HTMLCanvasElement,
  opts: { state: HeroState; reduced: boolean; rtl: boolean; onFirstFrame: () => void },
): Hero3D | null {
  const { state, reduced, rtl } = opts;
  // No WebGL (blocked, or an old device): keep the static poster, quietly.
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return null;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null; // No WebGL: the static poster stays.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  // three r155+ uses physical light units; these are the design's 0.85 / 0.75 scaled by π.
  scene.add(new HemisphereLight(0xffffff, 0x9aa0a6, 2.6));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);

  // One rounded tile, extruded with a soft bevel.
  const w = 1.18, h = 0.78, r = 0.16;
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 8 });
  geo.center();
  const mat = new MeshStandardMaterial({ roughness: 0.55, metalness: 0 });
  const N = COLS * ROWS;
  const mesh = new InstancedMesh(geo, mat, N);
  const group = new Group();
  group.add(mesh);
  scene.add(group);

  const paint = () => {
    const c = new Color();
    const map = { empty: css('--card'), post: css('--primary'), soft: css('--primary-soft'), best: css('--smart') };
    for (let i = 0; i < N; i++) mesh.setColorAt(i, c.set(map[TILE_KINDS[i]]));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  paint();

  const GAP_X = 1.36, GAP_Y = 0.98, dirX = rtl ? -1 : 1;
  const tiles = Array.from({ length: N }, (_, j) => {
    const cx = j % COLS, cy = Math.floor(j / COLS);
    return {
      // In Arabic the week runs right to left, like the app's calendar.
      gx: (cx - (COLS - 1) / 2) * GAP_X * dirX,
      gy: ((ROWS - 1) / 2 - cy) * GAP_Y,
      sx: (Math.random() - 0.5) * 16,
      sy: (Math.random() - 0.5) * 10,
      sz: -4 - Math.random() * 10,
      rx: (Math.random() - 0.5) * 3,
      ry: (Math.random() - 0.5) * 3,
      delay: ((cx + cy) / (COLS + ROWS)) * 0.55,
    };
  });

  const pointer = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const m4 = new Matrix4(), q = new Quaternion(), e = new Euler(), p = new Vector3(), sc = new Vector3();
  const ease = (t: number) => 1 - Math.pow(1 - t, 4);
  const layout = (time: number) => {
    for (let i = 0; i < N; i++) {
      const t = tiles[i];
      const k = ease(Math.min(1, Math.max(0, (state.assemble - t.delay) / (1 - 0.55))));
      const kind = TILE_KINDS[i];
      const breathe = reduced ? 0 : Math.sin(time * 2.4);
      const lift = kind === 'post' ? 0.18 : i === BEST ? 0.32 + breathe * 0.08 : 0;
      const bob = reduced ? 0 : Math.sin(time * 0.9 + i * 0.6) * 0.04 * k;
      p.set(t.sx + (t.gx - t.sx) * k, t.sy + (t.gy - t.sy) * k + bob, t.sz + (lift - t.sz) * k);
      e.set(t.rx * (1 - k), t.ry * (1 - k), 0);
      q.setFromEuler(e);
      const s1 = i === BEST ? 1 + breathe * 0.04 : 1;
      sc.set(s1, s1, s1);
      m4.compose(p, q, sc);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  const resize = () => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.position.z = width < 640 ? 17.5 : width < 1000 ? 15.5 : 12.4;
  };

  let running = false, raf = 0, first = true, onScreen = true;
  const t0 = performance.now();
  const frame = (now: number) => {
    raf = 0;
    const time = (now - t0) / 1000;
    cur.x += (pointer.x - cur.x) * 0.06;
    cur.y += (pointer.y - cur.y) * 0.06;
    group.rotation.x = -0.52 + state.tilt * -0.5 + cur.y * 0.12;
    group.rotation.y = (0.32 - state.tilt * 0.3) * dirX + cur.x * 0.18;
    group.rotation.z = 0.06 * dirX;
    group.position.y = -0.2 + state.tilt * 1.2;
    layout(time);
    renderer.render(scene, camera);
    if (first) {
      first = false;
      opts.onFirstFrame();
    }
    if (running) raf = requestAnimationFrame(frame);
  };
  const draw = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  // Reduced motion draws on demand (first paint, resize, theme); otherwise a loop runs while visible.
  const start = () => {
    if (reduced) return draw();
    if (!running) {
      running = true;
      draw();
    }
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = () => (onScreen && !document.hidden ? start() : stop());

  const ro = new ResizeObserver(() => {
    resize();
    draw();
  });
  ro.observe(canvas);
  resize();

  const onMove = (ev: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - b.left) / b.width - 0.5) * 2;
    pointer.y = ((ev.clientY - b.top) / b.height - 0.5) * 2;
  };
  if (!reduced) window.addEventListener('pointermove', onMove, { passive: true });
  const io = new IntersectionObserver((en) => {
    onScreen = en[0].isIntersecting;
    sync();
  });
  io.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  const mo = new MutationObserver(() => {
    paint();
    draw();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  draw();

  return {
    dispose() {
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', sync);
      geo.dispose();
      mat.dispose();
      mesh.dispose();
      renderer.dispose();
    },
  };
}

