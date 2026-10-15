import { notFound } from 'next/navigation';

// Tadween: an address no page answers. The app has several root layouts, so
// Next's own 404 would render without them (unbranded, light, English); this
// sends it to app/(app)/not-found.tsx inside the app's layout instead.
export default function Missing() {
  notFound();
}
