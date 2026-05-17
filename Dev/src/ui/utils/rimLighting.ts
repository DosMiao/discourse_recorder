// Mouse-tracked rim lighting. Writes three custom properties on the element
// every mousemove; the corresponding pseudo-element gradients in
// styles/partials/glass.ts read them via var(--dtr-rim-mx / -my / -hover).
//
// Values:
//   --dtr-rim-mx     : -50..50  (horizontal position relative to center, %)
//   --dtr-rim-my     : -50..50
//   --dtr-rim-hover  : 0|1      (binary, gates extra opacity boost)

import { NS } from '../../bootstrap/config';

const MX = `--${NS}-rim-mx`;
const MY = `--${NS}-rim-my`;
const HOVER = `--${NS}-rim-hover`;

export function attachRimLighting(el: HTMLElement): void {
    const set = (mx: number, my: number, hover: number): void => {
        el.style.setProperty(MX, String(mx));
        el.style.setProperty(MY, String(my));
        el.style.setProperty(HOVER, String(hover));
    };

    el.addEventListener('mouseenter', () => set(0, 0, 1));
    el.addEventListener('mouseleave', () => set(0, 0, 0));
    el.addEventListener('mousemove', (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const mx = ((e.clientX - r.left) / r.width - 0.5) * 100;
        const my = ((e.clientY - r.top) / r.height - 0.5) * 100;
        set(mx, my, 1);
    });
}
