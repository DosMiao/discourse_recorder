// Root mount node — fixed-position invisible host that provides the
// stacking context for the dock, modal, and toast layers. Children opt back
// into pointer-events; the host itself is fully transparent to clicks.

import { NS, Z } from '../../../bootstrap/config';

export const ROOT_CSS = `
#${NS}-root {
    position: fixed; inset: 0; pointer-events: none;
    z-index: ${Z.dock};
    font-family: var(--${NS}-font);
    color: var(--${NS}-text-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
#${NS}-root > * { pointer-events: auto; }
`;
