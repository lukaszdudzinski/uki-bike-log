import { useState, useEffect, useRef } from 'react';
import { storage } from '../services/storage';

export function DiagnosticsUI() {
    const [logsStr, setLogsStr] = useState<string | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            const logs = localStorage.getItem('uki_error_logs');
            setLogsStr(logs);
        } catch (e) {
            setLogsStr(localStorage.getItem('uki_error_logs') || 'Brak zarejestrowanych błędów :)');
        }
    }, []);

    const renderLogs = () => {
        if (!logsStr) {
            return 'Brak zarejestrowanych błędów :)';
        }

        try {
            const logsArray = JSON.parse(logsStr);
            if (Array.isArray(logsArray) && logsArray.length > 0) {
                const grouped: any = {};
                logsArray.forEach(log => {
                    const v = log.version || 'Starsze wersje';
                    if (!grouped[v]) grouped[v] = [];
                    grouped[v].push(log);
                });

                return Object.keys(grouped).map(v => (
                    <div key={v}>
                        <div style={{ color: '#FF9800', fontWeight: 'bold', fontSize: '1.1em', borderBottom: '1px solid #333', marginTop: '10px', paddingBottom: '4px' }}>
                            Wersja: {v}
                        </div>
                        {grouped[v].map((l: any, idx: number) => (
                            <div key={idx} style={{ margin: '8px 0', borderLeft: '2px solid #E74C3C', paddingLeft: '8px' }}>
                                <span style={{ color: '#888', fontSize: '0.85em' }}>{l.time}</span><br />
                                <span style={{ color: '#E74C3C', fontWeight: 'bold' }}>{l.msg}</span>
                                {l.stack && <><br /><span style={{ color: '#aaa', fontSize: '0.8em' }}>{l.stack.substring(0, 200)}...</span></>}
                            </div>
                        ))}
                    </div>
                ));
            } else {
                return logsStr;
            }
        } catch (e) {
            return logsStr;
        }
    };

    const handleHardReset = async () => {
        const confirmed = window.confirm("Czy na pewno chcesz wykonać Twardy Reset?\\n\\nWyczyści to ukryty Cache aplikacji i zmusi ją do pobrania czystej wersji. Twoje dane pojazdów są bezpieczne.");
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
            } catch (e: any) {
                alert("Błąd podczas czyszczenia cache: " + e.message);
            }
        }
    };

    const handleExportDB = async () => {
        const dataStr = await storage.exportDatabase();
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        a.download = `bikelog_backup_${dateStr}_${timeStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        if (importFileRef.current) {
            importFileRef.current.click();
        }
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const jsonStr = ev.target?.result as string;
                await storage.importDatabase(jsonStr);
                alert("Dane przywrócone pomyślnie! Aplikacja zostanie zrestartowana.");
                window.location.reload();
            } catch (err: any) {
                if ((window as any).ukiLogError) {
                    (window as any).ukiLogError("Import Error: " + err.message, err.stack);
                }
                alert("Błąd przywracania danych. Upewnij się, że to poprawny plik kopii zapasowej. Sprawdź logi w Diagnostyce.");
            }
        };
        reader.readAsText(file);
    };

    const handleClearLocalStorage = () => {
        if (window.confirm("Usunąć dane konfiguracyjne UI z LocalStorage? (Motyw itp). Twoje tankowania w bazie nie zostaną ruszone.")) {
            localStorage.clear();
            alert("Zrobione. Aplikacja się odświeży.");
            window.location.reload();
        }
    };

    const handleCopyLogs = () => {
        if (logsStr) {
            navigator.clipboard.writeText(logsStr).then(() => {
                alert("Logi skopiowane do schowka.");
            }).catch(() => {
                alert("Brak dostępu do schowka. Skopiuj tekst ręcznie.");
            });
        }
    };

    const handleShareLogs = () => {
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
    };

    const handleClearLogs = () => {
        localStorage.removeItem('uki_error_logs');
        setLogsStr(null);
    };

    return (
        <div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,152,0,0.3)', marginBottom: '20px' }}>
                <h3 style={{ color: '#FF9800', marginTop: 0 }}>📦 Pełne Archiwum Bazy Danych</h3>
                <p style={{ fontSize: '0.9em', color: '#ccc' }}>Utwórz kompletną kopię bezpieczeństwa (motocykle, historia tankowań, serwisów, trasy i ustawienia) lub przywróć całą aplikację z pliku archiwum JSON.</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button onClick={handleExportDB} style={{ flex: 1, padding: '13px 10px', background: '#222', border: '1px solid #00BFFF', color: '#00BFFF', borderRadius: '5px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold', textAlign: 'center' }}>
                        📦 Utwórz Archiwum
                    </button>
                    <button onClick={handleImportClick} style={{ flex: 1, padding: '13px 10px', background: '#222', border: '1px solid #FF9800', color: '#FF9800', borderRadius: '5px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold', textAlign: 'center' }}>
                        📥 Przywróć z Pliku
                    </button>
                    <input type="file" ref={importFileRef} accept=".json" style={{ display: 'none' }} onChange={handleImportFileChange} />
                </div>
            </div>

            <div style={{ background: 'rgba(231,76,60,0.1)', padding: '15px', borderRadius: '8px', border: '1px solid #E74C3C', marginBottom: '20px' }}>
                <h3 style={{ color: '#E74C3C', marginTop: 0 }}>Przycisk Paniki (Twardy Reset PWA)</h3>
                <p style={{ fontSize: '0.9em', color: '#ccc' }}>Użyj tylko wtedy, gdy aplikacja przestała się aktualizować lub "utknęła" na starej wersji. <b>Konta i statystyki są bezpieczne</b> (baza nie jest usuwana).</p>
                <button onClick={handleHardReset} style={{ width: '100%', padding: '13px', fontWeight: 'bold', fontSize: '1em', background: '#E74C3C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '15px', textAlign: 'center' }}>
                    ⚠️ WYKONAJ TWARDY RESET APLIKACJI
                </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '20px' }}>
                <h3 style={{ color: '#eee', marginTop: 0 }}>Pamięć Podręczna</h3>
                <p style={{ fontSize: '0.9em', color: '#ccc' }}>Użyj tej opcji <b>tylko wtedy, gdy zaciął się interfejs</b> (np. nie ładuje się motyw). Zresetuje ona wyłącznie podręczne ustawienia wyglądu. <b>Twoja historia tankowań i serwisów jest w pełni bezpieczna!</b></p>
                <button onClick={handleClearLocalStorage} style={{ width: '100%', padding: '13px', background: '#444', color: '#eee', border: '1px solid #666', borderRadius: '5px', cursor: 'pointer', marginTop: '10px', fontSize: '1em', fontWeight: 'bold', textAlign: 'center' }}>
                    Wyczyść tylko LocalStorage
                </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#fff' }}>Logi Błędów Aplikacji dla Pomocy Technicznej</h3>
                <div style={{ background: '#111', color: '#00BFFF', fontFamily: 'monospace', fontSize: '0.9em', padding: '12px', borderRadius: '6px', minHeight: '150px', maxHeight: '300px', overflowY: 'auto', margin: '12px 0', wordBreak: 'break-all', whiteSpace: 'pre-wrap', boxSizing: 'border-box', width: '100%' }}>
                    {renderLogs()}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button onClick={handleCopyLogs} style={{ flex: 1, padding: '13px 10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em', textAlign: 'center' }}>
                        Kopiuj Logi
                    </button>
                    <button onClick={handleShareLogs} style={{ flex: 1, padding: '13px 10px', background: '#00BFFF', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em', textAlign: 'center' }}>
                        Udostępnij Logi
                    </button>
                </div>
                <button onClick={handleClearLogs} style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold', textAlign: 'center' }}>
                    Wyczyść Logi
                </button>
            </div>
        </div>
    );
}
