import { useState, useEffect } from 'react';
import { storage } from '../../services/storage';

export function SettingsProfile({ activeBikeId }: { activeBikeId: string }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [liquidGlass, setLiquidGlass] = useState<boolean>(true);
  const [rainWarningRadius, setRainWarningRadius] = useState<number>(10);

  useEffect(() => {
    const profile = storage.getUserProfile();
    setAvatar(profile.avatar || null);
    setNickname(profile.nickname || '');
    setLiquidGlass(profile.liquidGlassEnabled !== false);
    setRainWarningRadius(profile.rainWarningRadius || 10);
  }, [activeBikeId]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
        const profile = storage.getUserProfile();
        storage.saveUserProfile({ ...profile, avatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, nickname: e.target.value });
  };

  const handleLiquidGlassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLiquidGlass(e.target.checked);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, liquidGlassEnabled: e.target.checked });
  };

  const handleRainWarningRadiusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    setRainWarningRadius(val);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, rainWarningRadius: val });
  };

  return (
    <>
      <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Twój Profil</h2>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px' }}>
        <div 
          style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: avatar ? `url(${avatar}) center/cover` : '#333',
            border: '2px solid var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
        >
          {!avatar && <span style={{ fontSize: '2rem' }}>👤</span>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className="btn-outline" style={{ display: 'inline-block', textAlign: 'center', cursor: 'pointer', padding: '6px 12px', fontSize: '0.9rem' }}>
            Zmień Awatar
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Twój Nick..." 
            value={nickname}
            onChange={handleNicknameChange}
            style={{ padding: '8px', fontSize: '1rem' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={liquidGlass} 
              onChange={handleLiquidGlassChange} 
              style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
            />
            Efekt Liquid Glass (Głębia interfejsu)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer', marginTop: '4px' }}>
            <select 
              value={rainWarningRadius}
              onChange={handleRainWarningRadiusChange}
              style={{ background: 'var(--color-bg)', color: '#fff', border: '1px solid var(--color-glass-border)', padding: '4px', borderRadius: '4px' }}
            >
              <option value="10">10 km</option>
              <option value="30">30 km</option>
              <option value="50">50 km</option>
            </select>
            Promień ostrzegania przed burzą
          </label>
        </div>
      </div>
    </>
  );
}
