export const ChangelogUI = {
    init: () => {
        ChangelogUI.injectModalHTML();
        ChangelogUI.bindEvents();
        
        // Expose globally for PWA Update calls and React
        window.showChangelogModal = ChangelogUI.showChangelogModal;
    },

    injectModalHTML: () => {
        if (document.getElementById('changelog-modal-overlay')) return;

        const html = `
            <div id="changelog-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 99999; justify-content: center; align-items: center; padding: 20px;">
                <div style="background: #1a1a1a; width: 100%; max-width: 500px; border-radius: 12px; border: 1px solid #333; display: flex; flex-direction: column; max-height: 80vh; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                    
                    <div style="padding: 16px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #00C3FF; font-size: 1.2rem;">Co nowego? 🚀</h3>
                        <button id="changelog-close-btn" style="background: transparent; border: none; color: #888; font-size: 1.5rem; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
                    </div>
                    
                    <div id="changelog-content" style="padding: 20px; overflow-y: auto; flex: 1; font-size: 0.95rem; line-height: 1.5;">
                        <p style="text-align: center; color: #888;">Ładowanie zmian...</p>
                    </div>
                    
                    <div id="changelog-update-now-container" style="padding: 16px 20px; border-top: 1px solid #333; text-align: center; display: none; background: #1a1a1a;">
                        <button id="changelog-update-now-btn" style="width: 100%; padding: 14px; font-size: 1.1rem; font-weight: bold; background: #FF9800; color: #000; border: none; border-radius: 8px; cursor: pointer;">
                            Zaktualizuj
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    bindEvents: () => {
        const closeBtn = document.getElementById('changelog-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('changelog-modal-overlay').style.display = 'none';
            });
        }

        const updateBtn = document.getElementById('changelog-update-now-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                if (window.PWAUpdateUI && typeof window.PWAUpdateUI.doPwaUpdate === 'function') {
                    window.PWAUpdateUI.doPwaUpdate();
                } else {
                    window.location.reload();
                }
            });
        }
    },

    showChangelogModal: async (compareVersionStr) => {
        const overlay = document.getElementById('changelog-modal-overlay');
        if (overlay) overlay.style.display = 'flex';
        
        // Hide update button by default, pwa-updater will show it if needed
        const updateContainer = document.getElementById('changelog-update-now-container');
        if (updateContainer) updateContainer.style.display = 'none';
        
        try {
            const res = await fetch(\`changelog.json?t=\${new Date().getTime()}\`);
            const data = await res.json();
            
            let updatesToShow = [];
            if (compareVersionStr === 'latest_only') {
                updatesToShow = data.length > 0 ? [data[0]] : [];
            } else if (compareVersionStr === 'all') {
                updatesToShow = data.slice(0, 10); // Show up to 10 latest versions
            } else {
                const compareVer = compareVersionStr || document.querySelector('meta[name="app-version"]')?.content || 'v.0.0.0';
                const parseVersion = (v) => {
                    const parts = v.replace(/^v\.?/, '').split('.').map(n => parseInt(n, 10) || 0);
                    return (parts[0] * 10000000000) + (parts[1] * 100000000) + (parts[2] * 1000000) + (parts[3] || 0);
                };
                const compareScore = parseVersion(compareVer);
                const newerUpdates = data.filter(log => parseVersion(log.version) > compareScore);
                
                updatesToShow = newerUpdates.length > 0 ? newerUpdates : [data[0]];
                
                // If it was called with a version comparison and we found newer versions, show the update button
                if (newerUpdates.length > 0 && updateContainer) {
                    updateContainer.style.display = 'block';
                }
            }
            
            let html = '';
            if (updatesToShow && updatesToShow.length > 0 && updatesToShow[0]) {
                html += '<div style="display: flex; flex-direction: column; gap: 24px;">';
                updatesToShow.forEach((log) => {
                    html += \`<div>\`;
                    html += \`<h4 style="margin: 0 0 12px 0; color: #fff; font-size: 1.05rem;">Wersja \${log.version} <span style="color: #888; font-size: 0.85em; font-weight: normal;">(\${log.date})</span></h4>\`;
                    html += \`<ul style="margin: 0; padding-left: 20px; color: #aaa; font-size: 0.95rem;">\`;
                    log.changes.forEach(change => {
                        html += \`<li style="margin-bottom: 10px; line-height: 1.4;">\${change}</li>\`;
                    });
                    html += \`</ul></div>\`;
                });
                html += '</div>';
            } else {
                html = '<p style="color: #888;">Brak danych o zmianach.</p>';
            }

            document.getElementById('changelog-content').innerHTML = html;
        } catch(e) {
            document.getElementById('changelog-content').innerHTML = "<p style='color: #888;'>Nie udało się załadować listy zmian.</p>";
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ChangelogUI.init);
} else {
    ChangelogUI.init();
}
