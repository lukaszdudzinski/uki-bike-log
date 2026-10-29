// pwa-updater.js — Standalone PWA Updater + Changelog UI
// Jeden plik, zero zewnętrznych zależności.
(function () {
    'use strict';

    // ─── Konfiguracja ────────────────────────────────────────────────────────────
    const BASE = '/uki-bike-log';
    const CHANGELOG_URL = BASE + '/changelog.json';

    // ─── Izolacja UKIS (R2) ──────────────────────────────────────────────────────
    // Domena lukaszdudzinski.github.io jest wspólna dla rodziny UKIS: dotykamy tylko
    // własnego service workera i własnych cache Bike Log.
    var OWN_SCOPE = new URL(BASE + '/', location.href).href;
    var OWN_CACHE_PREFIX = 'ukis-bikelog-';

    function isOwnCache(key) {
        return key.indexOf(OWN_CACHE_PREFIX) === 0 ||
            (key.indexOf('workbox-') === 0 && key.endsWith('-' + OWN_SCOPE));
    }

    function clearOwnCaches() {
        return caches.keys().then(function (keys) {
            return Promise.all(keys.filter(isOwnCache).map(function (k) { return caches.delete(k); }));
        }).then(function () {});
    }

    // ─── „Co nowego” po aktualizacji (jak BodyBuild) ─────────────────────────────
    var LAST_VERSION_KEY = 'ukis.bike-log.last-version';
    var UPDATED_FROM_KEY = 'ukis.bike-log.updated-from';
    // Ostatnia wersja z produkcji sprzed zapamiętywania wersji: pierwsze uruchomienie pokazuje zmiany od niej
    var FIRST_TRACKED_SINCE = '2026.10.22.1';

    function currentVersion() {
        var meta = document.querySelector('meta[name="app-version"]');
        return meta ? meta.content : null;
    }

    // Zwraca wersję, od której pokazać zmiany (albo null), i zapamiętuje bieżącą jako obejrzaną.
    function changelogSinceAfterUpdate(storage, current) {
        if (!current) return null;
        var from = storage.getItem(UPDATED_FROM_KEY);
        var last = storage.getItem(LAST_VERSION_KEY);
        storage.removeItem(UPDATED_FROM_KEY);
        storage.setItem(LAST_VERSION_KEY, current);
        var since = from || last || FIRST_TRACKED_SINCE;
        return since !== current ? since : null;
    }

    function unregisterOwnServiceWorker() {
        return navigator.serviceWorker.getRegistration(OWN_SCOPE).then(function (reg) {
            return reg && reg.scope === OWN_SCOPE ? reg.unregister() : false;
        });
    }

    // ─── Changelog Modal ─────────────────────────────────────────────────────────
    const ChangelogModal = {
        _updateAvailable: false,

        inject: function () {
            if (document.getElementById('pwa-changelog-overlay')) return;
            var html = [
                '<div id="pwa-changelog-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;',
                'background:rgba(0,0,0,0.85);z-index:99999;justify-content:center;align-items:center;padding:20px;">',
                '  <div style="background:#1a1a1a;width:100%;max-width:500px;border-radius:12px;border:1px solid #333;',
                '  display:flex;flex-direction:column;max-height:80vh;box-shadow:0 10px 25px rgba(0,0,0,0.5);">',
                '    <div style="padding:16px 20px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">',
                '      <h3 style="margin:0;color:#00C3FF;font-size:1.2rem;">Co nowego? 🚀</h3>',
                '      <button id="pwa-changelog-close" style="background:none;border:none;color:#888;font-size:1.5rem;cursor:pointer;padding:0;line-height:1;">&times;</button>',
                '    </div>',
                '    <div id="pwa-changelog-content" style="padding:20px;overflow-y:auto;flex:1;font-size:0.95rem;line-height:1.5;color:#aaa;">',
                '      <p style="text-align:center;">Ładowanie...</p>',
                '    </div>',
                '    <div id="pwa-changelog-footer" style="padding:16px 20px;border-top:1px solid #333;flex-shrink:0;display:none;">',
                '      <button id="pwa-changelog-update-btn" style="width:100%;padding:14px;font-size:1.1rem;font-weight:bold;',
                '      background:#FF9800;color:#000;border:none;border-radius:8px;cursor:pointer;">Zaktualizuj</button>',
                '    </div>',
                '  </div>',
                '</div>'
            ].join('');
            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('pwa-changelog-close').addEventListener('click', function () {
                document.getElementById('pwa-changelog-overlay').style.display = 'none';
            });

            document.getElementById('pwa-changelog-update-btn').addEventListener('click', function () {
                PWAUpdater.doUpdate();
            });
        },

        show: function (compareVersion, showUpdateBtn) {
            var overlay = document.getElementById('pwa-changelog-overlay');
            if (!overlay) { this.inject(); overlay = document.getElementById('pwa-changelog-overlay'); }
            overlay.style.display = 'flex';

            var footer = document.getElementById('pwa-changelog-footer');
            if (footer) footer.style.display = showUpdateBtn ? 'block' : 'none';

            var content = document.getElementById('pwa-changelog-content');
            if (content) content.innerHTML = '<p style="text-align:center;color:#888;">Ładowanie...</p>';

            fetch(CHANGELOG_URL + '?t=' + Date.now())
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var toShow = [];

                    if (!compareVersion || compareVersion === 'all') {
                        toShow = data.slice(0, 10);
                    } else {
                        var parse = function (v) {
                            var p = v.replace(/^v\.?/, '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
                            return (p[0] * 10000000000) + (p[1] * 100000000) + (p[2] * 1000000) + (p[3] || 0);
                        };
                        var localScore = parse(compareVersion);
                        var newer = data.filter(function (e) { return parse(e.version) > localScore; });
                        toShow = newer.length > 0 ? newer : [data[0]];

                        // Jeśli znaleźliśmy nowsze wersje i NIE zostało pokazane przez "co nowego" z opcji, pokaż przycisk
                        if (newer.length > 0 && showUpdateBtn !== false) {
                            if (footer) footer.style.display = 'block';
                        }
                    }

                    if (!toShow || toShow.length === 0) {
                        if (content) content.innerHTML = '<p style="color:#888;">Brak danych o zmianach.</p>';
                        return;
                    }

                    var html = '<div style="display:flex;flex-direction:column;gap:24px;">';
                    toShow.forEach(function (log) {
                        html += '<div>';
                        html += '<h4 style="margin:0 0 12px 0;color:#fff;font-size:1.05rem;">Wersja ' + log.version;
                        html += ' <span style="color:#888;font-size:0.85em;font-weight:normal;">(' + log.date + ')</span></h4>';
                        html += '<ul style="margin:0;padding-left:20px;color:#aaa;font-size:0.95rem;">';
                        log.changes.forEach(function (c) {
                            html += '<li style="margin-bottom:10px;line-height:1.4;">' + c + '</li>';
                        });
                        html += '</ul></div>';
                    });
                    html += '</div>';
                    if (content) content.innerHTML = html;
                })
                .catch(function () {
                    if (content) content.innerHTML = '<p style="color:#888;">Nie udało się załadować listy zmian.</p>';
                });
        }
    };

    // ─── Baner Aktualizacji ───────────────────────────────────────────────────────
    var Banner = {
        inject: function () {
            if (document.getElementById('pwa-update-banner')) return;
            var html = [
                '<style>@keyframes pwaBannerSlide{from{transform:translateY(-100%)}to{transform:translateY(0)}}</style>',
                '<div id="pwa-update-banner" style="display:none;position:fixed;top:0;left:0;right:0;',
                'background:#FF9800;color:#000;padding:14px 16px;text-align:center;z-index:10000;',
                'box-shadow:0 4px 8px rgba(0,0,0,0.3);animation:pwaBannerSlide 0.4s ease-out;">',
                '  <div style="font-weight:bold;margin-bottom:10px;">Dostępna nowa aktualizacja! 🚀</div>',
                '  <div style="display:flex;justify-content:center;gap:10px;">',
                '    <button id="pwa-btn-update" style="padding:8px 18px;background:#000;color:#FF9800;border:none;border-radius:4px;font-weight:bold;cursor:pointer;font-size:0.95rem;">Zaktualizuj</button>',
                '    <button id="pwa-btn-whatsnew" style="padding:8px 18px;background:rgba(0,0,0,0.12);color:#000;border:1px solid #000;border-radius:4px;font-weight:bold;cursor:pointer;font-size:0.95rem;">Co nowego?</button>',
                '  </div>',
                '</div>'
            ].join('');
            document.body.insertAdjacentHTML('beforeend', html);

            document.getElementById('pwa-btn-update').addEventListener('click', function () {
                PWAUpdater.doUpdate();
            });

            document.getElementById('pwa-btn-whatsnew').addEventListener('click', function () {
                var localVer = document.querySelector('meta[name="app-version"]');
                var ver = localVer ? localVer.content : null;
                ChangelogModal.show(ver, true);
            });
        },

        show: function (worker) {
            PWAUpdater._pendingWorker = worker;
            var b = document.getElementById('pwa-update-banner');
            if (b) b.style.display = 'block';
        },

        setUpdating: function () {
            var b = document.getElementById('pwa-update-banner');
            if (b) b.innerHTML = '<div style="font-weight:bold;padding:6px;">⏳ Trwa aktualizacja...</div>';
        }
    };

    // ─── Główny silnik PWA ───────────────────────────────────────────────────────
    var PWAUpdater = {
        _pendingWorker: null,
        _userClickedUpdate: false,

        init: function () {
            if (!('serviceWorker' in navigator)) return;
            if (window.navigator.webdriver) return;

            Banner.inject();
            ChangelogModal.inject();

            // Globalny hook dla przycisku w zakładce Opcje
            window.showChangelogModal = function (compareVer) {
                ChangelogModal.show(compareVer, false);
            };

            // Po aktualizacji sama lista zmian od wersji, której użytkownik używał
            try {
                var since = changelogSinceAfterUpdate(localStorage, currentVersion());
                if (since) setTimeout(function () { ChangelogModal.show(since, false); }, 800);
            } catch (e) {
                console.warn('[PWA] Co nowego:', e);
            }

            // Nasłuchuj controllerchange — reload TYLKO gdy użytkownik kliknął
            navigator.serviceWorker.addEventListener('controllerchange', function () {
                if (PWAUpdater._userClickedUpdate) {
                    window.location.reload(true);
                }
            });

            PWAUpdater._register();
        },

        _register: function () {
            navigator.serviceWorker.register(BASE + '/sw.js')
                .then(function (reg) {
                    console.log('[PWA] SW zarejestrowany');

                    // Czy nowy SW już czeka?
                    if (reg.waiting) {
                        Banner.show(reg.waiting);
                    }

                    reg.addEventListener('updatefound', function () {
                        var newSW = reg.installing;
                        newSW.addEventListener('statechange', function () {
                            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                                Banner.show(newSW);
                            }
                        });
                    });

                    // Sprawdzaj co 5 minut
                    setInterval(function () { reg.update(); }, 5 * 60 * 1000);

                    // Sprawdź gdy użytkownik wraca do aplikacji
                    document.addEventListener('visibilitychange', function () {
                        if (document.visibilityState === 'visible') reg.update();
                    });

                    // Fallback: porównaj wersję z changelog.json co 2 minuty
                    setInterval(function () {
                        fetch(CHANGELOG_URL + '?_t=' + Date.now())
                            .then(function (r) { return r.json(); })
                            .then(function (data) {
                                var serverVer = data[0].version;
                                var meta = document.querySelector('meta[name="app-version"]');
                                var localVer = meta ? meta.content : null;
                                if (!localVer) return;
                                var parse = function (v) {
                                    var p = v.replace(/^v\.?/, '').split('.').map(function (n) { return parseInt(n, 10) || 0; });
                                    return (p[0] * 10000000000) + (p[1] * 100000000) + (p[2] * 1000000) + (p[3] || 0);
                                };
                                if (parse(serverVer) > parse(localVer)) reg.update();
                            })
                            .catch(function () {});
                    }, 2 * 60 * 1000);
                })
                .catch(function (err) { console.warn('[PWA] SW registration failed:', err); });
        },

        doUpdate: function () {
            PWAUpdater._userClickedUpdate = true;
            try {
                var from = currentVersion();
                if (from) localStorage.setItem(UPDATED_FROM_KEY, from);
            } catch (e) { /* pamięć niedostępna: lista zmian pojawi się dzięki LAST_VERSION_KEY */ }
            Banner.setUpdating();

            if (PWAUpdater._pendingWorker) {
                PWAUpdater._pendingWorker.postMessage('SKIP_WAITING');
                setTimeout(function () {
                    clearOwnCaches().then(function () {
                        window.location.reload(true);
                    });
                }, 800);
            } else {
                unregisterOwnServiceWorker()
                    .then(clearOwnCaches)
                    .then(function () { window.location.reload(true); })
                    .catch(function () { window.location.reload(true); });
            }
        }
    };

    // Tylko do testów; reguły izolacji UKIS (R2)
    window.__ukisBikeLogPwa = {
        OWN_SCOPE: OWN_SCOPE,
        isOwnCache: isOwnCache,
        clearOwnCaches: clearOwnCaches,
        unregisterOwnServiceWorker: unregisterOwnServiceWorker,
        PWAUpdater: PWAUpdater,
        LAST_VERSION_KEY: LAST_VERSION_KEY,
        UPDATED_FROM_KEY: UPDATED_FROM_KEY,
        changelogSinceAfterUpdate: changelogSinceAfterUpdate
    };

    // ─── Start ───────────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { PWAUpdater.init(); });
    } else {
        PWAUpdater.init();
    }

})();
