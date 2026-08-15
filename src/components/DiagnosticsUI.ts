import { storage } from '../services/storage';

export const DiagnosticsUI = {
    init: () => {
        // Obsolete in React context, we'll call render directly on mount
    },
    render: () => {
        const wrapper = document.getElementById('diagnostics-content-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = `
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,152,0,0.3); margin-bottom: 20px;">
                <h3 style="color: #FF9800; margin-top: 0;">📦 Pełne Archiwum Bazy Danych</h3>
                <p style="font-size: 0.9em; color: #ccc;">Utwórz kompletną kopię bezpieczeństwa (motocykle, historia tankowań, serwisów, trasy i ustawienia) lub przywróć całą aplikację z pliku archiwum JSON.</p>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button id="db-export-btn" style="flex: 1; padding: 13px 10px; background: #222; border: 1px solid #00BFFF; color: #00BFFF; border-radius: 5px; cursor: pointer; font-size: 1em; font-weight: bold; text-align: center;">📦 Utwórz Archiwum</button>
                    <button id="db-import-btn" style="flex: 1; padding: 13px 10px; background: #222; border: 1px solid #FF9800; color: #FF9800; border-radius: 5px; cursor: pointer; font-size: 1em; font-weight: bold; text-align: center;">📥 Przywróć z Pliku</button>
                    <input type="file" id="db-import-file" accept=".json" style="display: none;">
                </div>
            </div>

            <div style="background: rgba(231,76,60,0.1); padding: 15px; border-radius: 8px; border: 1px solid #E74C3C; margin-bottom: 20px;">
                <h3 style="color: #E74C3C; margin-top: 0;">Przycisk Paniki (Twardy Reset PWA)</h3>
                <p style="font-size: 0.9em; color: #ccc;">Użyj tylko wtedy, gdy aplikacja przestała się aktualizować lub "utknęła" na starej wersji. <b>Konta i statystyki są bezpieczne</b> (baza nie jest usuwana).</p>
                <button id="pwa-hard-reset-btn" style="width: 100%; padding: 13px; font-weight: bold; font-size: 1em; background: #E74C3C; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px; text-align: center;">
                    ⚠️ WYKONAJ TWARDY RESET APLIKACJI
                </button>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 20px;">
                <h3 style="color: #eee; margin-top: 0;">Pamięć Podręczna</h3>
                <p style="font-size: 0.9em; color: #ccc;">Użyj tej opcji <b>tylko wtedy, gdy zaciął się interfejs</b> (np. nie ładuje się motyw). Zresetuje ona wyłącznie podręczne ustawienia wyglądu. <b>Twoja historia tankowań i serwisów jest w pełni bezpieczna!</b></p>
                <button id="db-clear-local-btn" style="width: 100%; padding: 13px; background: #444; color: #eee; border: 1px solid #666; border-radius: 5px; cursor: pointer; margin-top: 10px; font-size: 1em; font-weight: bold; text-align: center;">
                    Wyczyść tylko LocalStorage
                </button>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #fff;">Logi Błędów Aplikacji dla Pomocy Technicznej</h3>
                <div id="diagnostics-logs-container" style="background: #111; color: #00BFFF; font-family: monospace; font-size: 0.9em; padding: 12px; border-radius: 6px; min-height: 150px; max-height: 300px; overflow-y: auto; margin: 12px 0; word-break: break-all; white-space: pre-wrap; box-sizing: border-box; width: 100%;">
                    Ładowanie logów...
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button id="copy-errors-btn" style="flex: 1; padding: 13px 10px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 1em; text-align: center;">
                        Kopiuj Logi
                    </button>
                    <button id="share-errors-btn" style="flex: 1; padding: 13px 10px; background: #00BFFF; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 1em; text-align: center;">
                        Udostępnij Logi
                    </button>
                </div>
                <button id="clear-errors-btn" style="width: 100%; padding: 13px; background: rgba(255,255,255,0.05); color: #aaa; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold; text-align: center;">
                    Wyczyść Logi
                </button>
            </div>
        `;

        const logsContainer = document.getElementById('diagnostics-logs-container');
        if (logsContainer) {
            try {
                const logsStr = localStorage.getItem('uki_error_logs');
                if (!logsStr) {
                    logsContainer.innerText = 'Brak zarejestrowanych błędów :)';
                } else {
                    const logsArray = JSON.parse(logsStr);
                    if (Array.isArray(logsArray) && logsArray.length > 0) {
                    const grouped: any = {};
                    logsArray.forEach(log => {
                        const v = log.version || 'Starsze wersje';
                        if (!grouped[v]) grouped[v] = [];
                        grouped[v].push(log);
                    });
                    
                    let html = '';
                    for (const v in grouped) {
                        html += `<div style="color: #FF9800; font-weight: bold; font-size: 1.1em; border-bottom: 1px solid #333; margin-top: 10px; padding-bottom: 4px;">Wersja: ${v}</div>`;
                        grouped[v].forEach((l: any) => {
                            html += `<div style="margin: 8px 0; border-left: 2px solid #E74C3C; padding-left: 8px;">`;
                            html += `<span style="color: #888; font-size: 0.85em;">${l.time}</span><br>`;
                            html += `<span style="color: #E74C3C; font-weight: bold;">${l.msg}</span>`;
                            if (l.stack) html += `<br><span style="color: #aaa; font-size: 0.8em;">${l.stack.substring(0, 200)}...</span>`;
                            html += `</div>`;
                        });
                    }
                    logsContainer.innerHTML = html;
                    } else {
                        logsContainer.innerText = logsStr;
                    }
                }
            } catch(e) {
                logsContainer.innerText = localStorage.getItem('uki_error_logs') || 'Brak zarejestrowanych błędów :)';
            }
        }

        DiagnosticsUI.bindEvents();
    },

    bindEvents: () => {
        // Twardy Reset PWA
        const hardResetBtn = document.getElementById('pwa-hard-reset-btn');
        if (hardResetBtn) {
            hardResetBtn.addEventListener('click', async () => {
                const confirmed = confirm("Czy na pewno chcesz wykonać Twardy Reset?\\n\\nWyczyści to ukryty Cache aplikacji i zmusi ją do pobrania czystej wersji. Twoje dane pojazdów są bezpieczne.");
                if (confirmed) {
                    try {
                        if ('serviceWorker' in navigator) {
                            const regs = await navigator.serviceWorker.getRegistrations();
                            for (let r of regs) {
                                await r.unregister();
                            }
                        }
                        const keys = await caches.keys();
                        await Promise.all(keys.map(k => caches.delete(k)));
                        
                        alert("Cache wyczyszczony! Aplikacja zrestartuje się za chwilę...");
                        setTimeout(() => window.location.reload(), 1000);
                    } catch(e: any) {
                        alert("Błąd podczas czyszczenia cache: " + e.message);
                    }
                }
            });
        }

        // Import/Export
        const exportBtn = document.getElementById('db-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const dataStr = await storage.exportDatabase();
                const blob = new Blob([dataStr], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-mm-ss
                a.download = `bikelog_backup_${dateStr}_${timeStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }

        const importBtn = document.getElementById('db-import-btn');
        const importFile = document.getElementById('db-import-file');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e: any) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const jsonStr = ev.target?.result as string;
                        await storage.importDatabase(jsonStr);
                        alert("Dane przywrócone pomyślnie! Aplikacja zostanie zrestartowana.");
                        window.location.reload();
                    } catch (err: any) {
                        if (window.ukiLogError) window.ukiLogError("Import Error: " + err.message, err.stack);
                        alert("Błąd przywracania danych. Upewnij się, że to poprawny plik kopii zapasowej. Sprawdź logi w Diagnostyce.");
                    }
                };
                reader.readAsText(file);
            });
        }

        // Wyczyść LocalStorage
        const clearLocalBtn = document.getElementById('db-clear-local-btn');
        if (clearLocalBtn) {
            clearLocalBtn.addEventListener('click', () => {
                if (confirm("Usunąć dane konfiguracyjne UI z LocalStorage? (Motyw itp). Twoje tankowania w bazie nie zostaną ruszone.")) {
                    localStorage.clear();
                    alert("Zrobione. Aplikacja się odświeży.");
                    window.location.reload();
                }
            });
        }

        // Błędy
        const copyErrs = document.getElementById('copy-errors-btn');
        if (copyErrs) {
            copyErrs.addEventListener('click', () => {
                const logs = localStorage.getItem('uki_error_logs');
                if (logs) {
                    navigator.clipboard.writeText(logs).then(() => {
                        alert("Logi skopiowane do schowka.");
                    }).catch(() => {
                        alert("Brak dostępu do schowka. Skopiuj tekst ręcznie.");
                    });
                }
            });
        }

        const shareErrs = document.getElementById('share-errors-btn');
        if (shareErrs) {
            shareErrs.addEventListener('click', () => {
                const logsStr = localStorage.getItem('uki_error_logs');
                if (!logsStr) {
                    alert("Brak błędów do udostępnienia.");
                    return;
                }
                let text = "Logi błędów Uki's Bike Log:\\n\\n";
                try {
                    const logsArray = JSON.parse(logsStr);
                    const grouped: any = {};
                    logsArray.forEach((log: any) => {
                        const v = log.version || 'Starsze wersje';
                        if (!grouped[v]) grouped[v] = [];
                        grouped[v].push(log);
                    });
                    for (const v in grouped) {
                        text += `--- Wersja: ${v} ---\n`;
                        grouped[v].forEach((l: any) => {
                            text += `[${l.time}] ${l.msg}\n${l.stack}\n\n`;
                        });
                    }
                } catch (e) {
                    text += logsStr;
                }
                
                if (navigator.share) {
                    navigator.share({
                        title: 'Logi błędów aplikacji',
                        text: text
                    }).catch(err => {
                        console.log("Share failed:", err);
                    });
                } else {
                    window.location.href = `mailto:?subject=Uki%20Bike%20Log%20Logi&body=${encodeURIComponent(text)}`;
                }
            });
        }

        const clearErrs = document.getElementById('clear-errors-btn');
        const logsContainer = document.getElementById('diagnostics-logs-container');
        if (clearErrs) {
            clearErrs.addEventListener('click', () => {
                localStorage.removeItem('uki_error_logs');
                if (logsContainer) logsContainer.innerText = 'Brak zarejestrowanych błędów :)';
            });
        }
    }
};
