// Entry point. Webpack BannerPlugin prepends header.txt verbatim so the
// userscript manager sees the @grant / @match metadata before this code.
//
// Builds the service bag once, hands it to the renderEngine + initializer,
// kicks the SPA-aware boot poll. Warmup promises (topic readiness) start
// resolving in parallel with service wiring so the boot path can fail fast.

import { SCRIPT_CONFIG } from './bootstrap/config';
import { createApplicationServices } from './bootstrap/serviceFactory';
import { createRenderEngine } from './bootstrap/renderEngine/renderEngine';
import { createInitializer } from './bootstrap/initializer';
import { onDomReady } from './bootstrap/domReady';
import { isDiscoursePage } from './extractor/discourse';

const services = createApplicationServices(SCRIPT_CONFIG);

const warmup = {
    topicReadyPromise: Promise.resolve({
        isDiscourse: typeof document !== 'undefined' ? isDiscoursePage() : false,
    }),
};

services.logMain.info('warmup', { message: 'topic detection initiated' });

const { renderEngine } = createRenderEngine(services);

const initializer = createInitializer({
    ...services,
    renderEngine,
    warmup,
});

onDomReady(() => {
    void initializer.boot();
    initializer.bootPoll();
});
