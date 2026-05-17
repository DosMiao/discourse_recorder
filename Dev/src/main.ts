// Entry point. Webpack BannerPlugin prepends header.txt verbatim so the
// userscript manager sees the @grant / @match metadata before this code.
//
// Builds the service bag once, hands it to the initializer, and kicks the
// SPA-aware boot poll.

import { createApplicationServices } from './bootstrap/serviceFactory';
import { createInitializer } from './bootstrap/initializer';
import { onDomReady } from './bootstrap/domReady';

const services = createApplicationServices();
const initializer = createInitializer(services);

onDomReady(() => {
    initializer.boot();
    initializer.bootPoll();
});
