// Aggregator — order matters slightly (root first so its z-index applies,
// glass after dock so the rim pseudo-elements sit on top of the dock surface,
// animations last so its !important overrides win during theme transitions).

import { ROOT_CSS } from './root';
import { DOCK_CSS } from './dock';
import { GLASS_CSS } from './glass';
import { TABS_CSS } from './tabs';
import { BUTTONS_CSS } from './buttons';
import { CONTROLS_CSS } from './controls';
import { MODAL_CSS } from './modal';
import { TOAST_CSS } from './toast';
import { ACTIVITY_CSS } from './activity';
import { ANIMATIONS_CSS } from './animations';

export const PARTIAL_CSS_LIST = [
    ROOT_CSS,
    DOCK_CSS,
    GLASS_CSS,
    TABS_CSS,
    BUTTONS_CSS,
    CONTROLS_CSS,
    MODAL_CSS,
    TOAST_CSS,
    ACTIVITY_CSS,
    ANIMATIONS_CSS,
];
