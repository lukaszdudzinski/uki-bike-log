// pwa-updater.js (Independent PWA Updater)
(function() {
    window.PWAUpdateUI = {
        pwaWorker: null,
        
        init: () => {
            if (!('serviceWorker' in navigator)) return;
            // Disable SW in Playwright E2E tests to prevent random reloads
            if (window.navigator.webdriver) return;
            
            // CLEANUP: Usuń zepsute service workery z poprzednich błędnych rejestracji
            navigator.serviceWorker.getRegistrations().then(registrations => {
                let needsReload = false;
                for (let reg of registrations) {
                    if (reg.active && reg.active.scriptURL.includes('?update=')) {
                        reg.unregister();
                        needsReload = true;
                    }
                }
                if (needsReload) {
                    // Odczekaj chwilę i odśwież by system załadował czysty stan
                    setTimeout(() => window.location.reload(true), 500);
                }
            }).catch(e => {
                console.warn("getRegistrations failed:", e);
            });

            window.PWAUpdateUI.injectBannerHTML();
            window.PWAUpdateUI.bindEvents();
            window.PWAUpdateUI.registerAndMonitor();
        },

        injectBannerHTML: () => {
            if (document.getElementById('pwa-update-banner')) return;
            
            const html = `
                <div id="pwa-update-banner" style="display: none; position: fixed; top: 0; left: 0; right: 0; background: #FF9800; color: #000; padding: 15px; text-align: center; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.3); animation: slideDown 0.5s ease-out;">
                    <div style="font-weight: bold; margin-bottom: 10px;">Dostępna nowa aktualizacja! 🚀</div>
                    <div style="display: flex; justify-content: center; gap: 10px;">
                        <button id="pwa-update-btn-refresh" style="padding: 8px 16px; background: #000; color: #FF9800; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
                            Zaktualizuj
                        </button>
                        <button id="pwa-update-btn-changelog" style="padding: 8px 16px; background: rgba(0,0,0,0.1); color: #000; border: 1px solid #000; border-radius: 4px; font-weight: bold; cursor: pointer;">
                            Co nowego?
                        </button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        },

        doPwaUpdate: async () => {
            if (window.PWAUpdateUI.pwaWorker) {
                window.PWAUpdateUI.pwaWorker.postMessage('SKIP_WAITING');
                setTimeout(async () => {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                    window.location.reload(true);
                }, 1000);
            } else {
                // Twarde czyszczenie jeśli nie złapaliśmy nowego workera
                try {
                    if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (let reg of regs) {
                            await reg.unregister();
                        }
                    }
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                } catch(e) { console.error('Hard reset error:', e); }
                window.location.reload(true);
            }
        },

        bindEvents: () => {
            document.getElementById('pwa-update-btn-refresh').addEventListener('click', window.PWAUpdateUI.doPwaUpdate);
            
            document.getElementById('pwa-update-btn-changelog').addEventListener('click', () => {
                const btn = document.getElementById('changelog-update-now-container');
                if (btn) btn.style.display = 'block';
                if (window.showChangelogModal) {
                    const metaVersion = document.querySelector('meta[name="app-version"]')?.content || 'v.0.0.0';
                    window.showChangelogModal(metaVersion);
                }
            });

            // Kiedy nowy SW przejmuje kontrole - restart
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload(true);
                }
            });
        },

        showUpdateBanner: (worker) => {
            window.PWAUpdateUI.pwaWorker = worker;
            const banner = document.getElementById('pwa-update-banner');
            if (banner) banner.style.display = 'block';
        },

        registerAndMonitor: () => {
            // Używamy ścieżki base dla PWA rejestracji
            navigator.serviceWorker.register('/uki-bike-log/sw.js')
                .then(registration => {
                    console.log('PWA Service Worker Registered (Isolated Updater)');

                    if (registration.waiting) {
                        window.PWAUpdateUI.showUpdateBanner(registration.waiting);
                    }

                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                window.PWAUpdateUI.showUpdateBanner(newWorker);
                            }
                        });
                    });

                    // Wbudowany mechanizm PWA - co 5 minut
                    setInterval(() => {
                        registration.update();
                    }, 1000 * 60 * 5);

                    // Powrót do widoku aplikacji
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') registration.update();
                    });
                    
                    // Pasywne intencje
                    document.body.addEventListener('click', () => {
                        if (Math.random() < 0.05) registration.update();
                    }, { passive: true });
                    
                    // Agresywny Fallback niezależny od JS modules
                    setInterval(async () => {
                        try {
                            const res = await fetch(\`/uki-bike-log/changelog.json?_t=\${Date.now()}\`);
                            const data = await res.json();
                            const serverVersion = data[0].version;
                            const localVersion = window.__APP_VERSION__ || document.querySelector('meta[name="app-version"]')?.content || '1.0.0';
                            
                            const parseVersion = (v) => {
                                const parts = v.replace(/^v\.?/, '').split('.').map(n => parseInt(n, 10) || 0);
                                return (parts[0] * 10000000000) + (parts[1] * 100000000) + (parts[2] * 1000000) + (parts[3] || 0);
                            };
                            
                            if (localVersion && parseVersion(serverVersion) > parseVersion(localVersion)) {
                                registration.update();
                            }
                        } catch(e) {}
                    }, 1000 * 60 * 2);

                })
                .catch(err => console.log('SW Registration Failed', err));
        }
    };

    // Initialize independently
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.PWAUpdateUI.init);
    } else {
        window.PWAUpdateUI.init();
    }
})();
