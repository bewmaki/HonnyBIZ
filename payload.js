(() => {


    // === 🚨 REAL-TIME SYSTEM POLLING ===
    setInterval(async () => {
        try {
            let r = await fetch("https://diskey.honny.fun/api/status.php");
            let j = await r.json();

            // 1. Panic Button Check
            if (j.panic) {
                document.body.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100vh; background:#000; color:red; font-family:sans-serif;'><div><h1 style='font-size:40px;'>🚨 SYSTEM EMERGENCY LOCKDOWN 🚨</h1><p style='text-align:center;'>สคริปต์ถูกบังคับปิดโดยเครื่องแม่ข่าย (Panic Mode Activated)</p></div></div>";
                setTimeout(() => window.location.reload(), 3000);
            }

            // 2. Real-time Status & News Update
            if (j.status && j.status !== systemStatus) {
                systemStatus = j.status;
                if (typeof updateSystemStatusUI === "function") updateSystemStatusUI();
            }
            if (j.news && j.news !== systemNews) {
                systemNews = j.news;
                const newsEl = document.getElementById("newsContent");
                if (newsEl) newsEl.textContent = systemNews;
            }
        } catch (e) { }
    }, 15000);

    // 1. ระบบล้างตัวเก่า
    const oldPanel = document.getElementById("stealth-pro-v3");
    if (oldPanel) oldPanel.remove();

    // 2. ข้อมูลและการตั้งค่า
    if (!WebSocket.prototype.send._isHooked) {
        const nativeSend = WebSocket.prototype.send;
        WebSocket.prototype.send = function (data) {
            if (this.url && (this.url.includes("gateway.discord.gg") || this.url.includes("gateway-lattice"))) {
                window._discordGateway = this;
            }
            return nativeSend.apply(this, arguments);
        };
        WebSocket.prototype.send._isHooked = true;
    }

    if (!WebSocket.prototype.addEventListener._isHooked) {
        const originalAddEventListener = WebSocket.prototype.addEventListener;
        WebSocket.prototype.addEventListener = function (type, listener, options) {
            if (type === 'message' && this.url && (this.url.includes("gateway.discord.gg") || this.url.includes("gateway-lattice"))) {
                const originalListener = listener;
                const stealthListener = function (event) {
                    try {
                        let msg = JSON.parse(event.data);
                        let modified = false;

                        if (msg.t === 'READY') {
                            window._currentDiscordUserId = msg.d.user.id;
                        }

                        if (msg.t === 'VOICE_STATE_UPDATE' && msg.d && msg.d.user_id === window._currentDiscordUserId) {
                             // Red Mute Logic (Server Muted Appearance)
                            if (isRedMute) {
                                msg.d.mute = true;
                                msg.d.suppress = true;
                                modified = true;
                            }

                            if ((msg.d.mute === true || msg.d.suppress === true) && !spoofMute && !isRedMute) {
                                const log = document.getElementById("statusLog");
                                if (log) log.textContent = "🚨 CRITICAL: YOU WERE MUTED BY AN ADMIN!";
                            }
                        }

                        if (modified) {
                            const spoofedData = JSON.stringify(msg);
                            Object.defineProperty(event, 'data', { value: spoofedData, configurable: true });
                        }
                    } catch (e) { }
                    return originalListener.apply(this, arguments);
                };
                return originalAddEventListener.call(this, type, stealthListener, options);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };
        WebSocket.prototype.addEventListener._isHooked = true;
    }

    const originalSend = WebSocket.prototype.send;
    const originalFetch = window.fetch;
    let lastSocket = window._discordGateway || null;

    // === ระบบจัดการหน่วยความจำปลอดภัย (Fallback) ===
    const safeStorage = (() => {
        try {
            const ls = window.localStorage || localStorage;
            const testKey = "__test__";
            ls.setItem(testKey, "1");
            ls.removeItem(testKey);
            return ls;
        } catch (e) {
            console.warn("[HONNYBIZZ] Storage is blocked/disabled. Using MemoryStorage.");
            const memory = {};
            return {
                getItem: (key) => memory[key] || null,
                setItem: (key, val) => { memory[key] = String(val); },
                removeItem: (key) => delete memory[key]
            };
        }
    })();

    const SETTINGS_KEY = "stealth_settings";
    function loadSettings() {
        try { return JSON.parse(safeStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
    }
    function saveSettings() {
        safeStorage.setItem(SETTINGS_KEY, JSON.stringify({
            spoofMute, spoofDeafen, isRedMute, spoofActivity,
            activityName, gameMessage, activityHours, activityMaxHours,
            fakeVideoUrl, isFakeCameraActive, fakeVideoVolume, autoFixRtc,
            soundpadUrl, isSoundpadActive, soundpadVolume
        }));
    }
    // Fix: Using String check to avoid "Unexpected token '%'" if not replaced
    const isPublicMode = (String("%IS_PUBLIC%").toLowerCase() === "true" || "%IS_PUBLIC%" === "1");
    const currentKey = "%CURRENT_KEY%".startsWith("%") ? "ADMIN-DEBUG-MODE" : "%CURRENT_KEY%";
    const currentHwid = "%CURRENT_HWID%".startsWith("%") ? "HWID-DEBUG" : "%CURRENT_HWID%";
    const expirationDate = "%EXPIRATION_DATE%".startsWith("%") ? "Lifetime" : "%EXPIRATION_DATE%";
    const systemVersion = "4.0.0";
    let systemStatus = "%SYSTEM_STATUS%";
    if (systemStatus.startsWith("%")) systemStatus = "ready";
    let systemNews = "%SYSTEM_NEWS%";
    if (systemNews.startsWith("%")) systemNews = "HONNYBIZZ Premium Hub is now active! Enjoy the new sidebar design and enhanced stealth features.";
    const savedSettings = loadSettings();

    // Account Switcher: โหลดบัญชีที่บันทึกไว้
    const STORAGE_KEY = "stealth_saved_accounts";
    function loadAccounts() {
        try { return JSON.parse(safeStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
    }
    function saveAccounts(accounts) {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }

    // Fix: Safely handle cloud variables
    const getCloudVal = (val, fallback = "") => {
        if (typeof val === "string" && val.startsWith("%")) return fallback;
        return val;
    };

    const cloudName = getCloudVal("%CLOUD_NAME%", "");
    const cloudMsg = getCloudVal("%CLOUD_MSG%", "");
    const cloudHours = parseInt('%CLOUD_HOURS%') || 0;
    const cloudMaxHours = parseInt('%CLOUD_MAX_HOURS%') || 0;
    const cloudVideo = getCloudVal("%CLOUD_VIDEO%", "");

    // ใหม่: ฟังก์ชันเสริมจาก Cloud
    const cloudSettings = {
        spoofMute: parseInt('%S_MUTE%'),
        spoofDeafen: parseInt('%S_DEAFEN%'),
        isRedMute: parseInt('%S_RED_MUTE%'),
        spoofActivity: parseInt('%S_ACTIVITY%'),
        isFakeCamera: parseInt('%S_CAMERA%'),
        fakeVideoVolume: parseInt('%S_VOL%'),
        autoFixRtc: parseInt('%S_RTC%')
    };

    let spoofMute = (cloudSettings.spoofMute !== -1) ? !!cloudSettings.spoofMute : (savedSettings.spoofMute || false);
    let spoofDeafen = (cloudSettings.spoofDeafen !== -1) ? !!cloudSettings.spoofDeafen : (savedSettings.spoofDeafen || false);
    let isRedMute = (cloudSettings.isRedMute !== -1) ? !!cloudSettings.isRedMute : (savedSettings.isRedMute || false);
    let spoofActivity = (cloudSettings.spoofActivity !== -1) ? !!cloudSettings.spoofActivity : (savedSettings.spoofActivity || false);

    let activityName = (cloudName !== "") ? cloudName : (savedSettings.activityName ?? "GUS_TEST");
    let gameMessage = (cloudMsg !== "") ? cloudMsg : (savedSettings.gameMessage ?? "GUS_TEST");
    let activityHours = (cloudHours !== -1) ? cloudHours : (savedSettings.activityHours ?? 1);
    let activityMaxHours = (cloudMaxHours !== -1) ? cloudMaxHours : (savedSettings.activityMaxHours ?? 483333);
    let fakeVideoUrl = (cloudVideo !== "") ? cloudVideo : (savedSettings.fakeVideoUrl || "https://cdn.discordapp.com/");

    let isFakeCameraActive = (cloudSettings.isFakeCamera !== -1) ? !!cloudSettings.isFakeCamera : (savedSettings.isFakeCameraActive || false);
    let fakeVideoVolume = (cloudSettings.fakeVideoVolume !== -1) ? cloudSettings.fakeVideoVolume : (savedSettings.fakeVideoVolume ?? 50); // 0-100%
    let autoFixRtc = (cloudSettings.autoFixRtc !== -1) ? !!cloudSettings.autoFixRtc : (savedSettings.autoFixRtc || false);
    let activeFakeStream = null;

    let soundpadUrl = savedSettings.soundpadUrl || "";
    let isSoundpadActive = savedSettings.isSoundpadActive || false;
    let soundpadVolume = savedSettings.soundpadVolume ?? 50;

    // Lurk Settings
    const LURK_STORAGE = "stealth_lurk_settings";
    let lurkSettings = {};
    try { lurkSettings = JSON.parse(safeStorage.getItem(LURK_STORAGE)) || {}; } catch (e) { }
    let lurkGuildId = lurkSettings.guildId || "";
    let lurkChannelId = lurkSettings.channelId || "";
    let lurkVolume = lurkSettings.volume ?? 100;
    let isLurkActive = false;
    const saveLurkSettings = () => {
        safeStorage.setItem(LURK_STORAGE, JSON.stringify({ guildId: lurkGuildId, channelId: lurkChannelId, volume: lurkVolume }));
    };

    let isMinimized = false;

    const panel = document.createElement("div");
    panel.id = "stealth-pro-v4";
    panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 860px;
        height: 560px;
        background: #0d0d0f;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        z-index: 100000;
        display: ${isPublicMode ? 'none' : 'flex'};
        flex-direction: column;
        overflow: hidden;
        font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
        color: #e8e6f0;
        box-shadow: 0 12px 40px rgba(0,0,0,0.8);
        user-select: none;
        transition: opacity 0.3s;
    `;

    panel.innerHTML = `
        <style>
            :root {
                --hub-bg: #0d0d0f;
                --hub-bg2: #141418;
                --hub-bg3: #1a1a20;
                --hub-bg4: #202028;
                --hub-border: rgba(255,255,255,0.07);
                --hub-border2: rgba(255,255,255,0.12);
                --hub-accent: #7c6aff;
                --hub-accent2: #5a4fd4;
                --hub-accent-dim: rgba(124,106,255,0.12);
                --hub-accent-glow: rgba(124,106,255,0.2);
                --hub-text: #e8e6f0;
                --hub-text2: rgba(232,230,240,0.55);
                --hub-text3: rgba(232,230,240,0.3);
                --hub-green: #4ade80;
                --hub-green-dim: rgba(74,222,128,0.12);
                --hub-red: #f87171;
                --hub-red-dim: rgba(248,113,113,0.12);
                --hub-yellow: #facc15;
                --hub-yellow-dim: rgba(250,204,21,0.12);
            }

            .hub-container { display: flex; height: 100%; width: 100%; overflow: hidden; }

            /* SIDEBAR */
            .hub-sidebar {
                width: 190px; flex-shrink: 0; background: var(--hub-bg2);
                border-right: 1px solid var(--hub-border); display: flex; flex-direction: column;
            }
            .hub-logo { padding: 18px 16px; border-bottom: 1px solid var(--hub-border); cursor: grab; }
            .hub-logo-name { font-size: 14px; font-weight: 700; color: #c4a0ff; letter-spacing: 0.5px; }
            .hub-logo-sub { font-size: 10px; color: var(--hub-text3); margin-top: 2px; }

            .hub-sidebar-section { padding: 10px 8px; }
            .hub-sidebar-label {
                font-size: 9px; font-weight: 700; color: var(--hub-text3);
                letter-spacing: 1px; text-transform: uppercase; padding: 0 8px; margin-bottom: 6px;
            }
            .hub-nav-item {
                display: flex; align-items: center; gap: 10px; padding: 8px 10px;
                border-radius: 7px; cursor: pointer; color: var(--hub-text2);
                font-size: 12.5px; transition: all 0.15s; margin-bottom: 2px;
            }
            .hub-nav-item:hover { background: var(--hub-bg3); color: var(--hub-text); }
            .hub-nav-item.active {
                background: var(--hub-accent-dim); color: var(--hub-accent);
                border: 1px solid rgba(124,106,255,0.2);
            }
            .hub-nav-icon { width: 16px; height: 16px; flex-shrink: 0; opacity: 0.7; }
            .active .hub-nav-icon { opacity: 1; color: var(--hub-accent); }

            .hub-sidebar-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--hub-border); }
            .hub-key-badge {
                background: var(--hub-bg4); border: 1px solid var(--hub-border2);
                border-radius: 8px; padding: 10px;
            }
            .hub-key-label { font-size: 9px; color: var(--hub-text3); text-transform: uppercase; margin-bottom: 4px; }
            .hub-key-value { font-size: 10px; color: var(--hub-text2); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .hub-key-expire { font-size: 10px; color: var(--hub-green); margin-top: 4px; font-weight: 600; }

            /* MAIN */
            .hub-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--hub-bg); }
            .hub-topbar {
                display: flex; align-items: center; justify-content: space-between;
                padding: 0 20px; height: 50px; border-bottom: 1px solid var(--hub-border);
                background: var(--hub-bg); flex-shrink: 0; cursor: grab;
            }
            .hub-top-title { font-size: 14px; font-weight: 600; color: var(--hub-text); }
            .hub-top-btns { display: flex; align-items: center; gap: 8px; }
            .hub-status-text { font-size: 11px; color: var(--hub-green); margin-right: 8px; }
            .hub-btn-circle {
                width: 28px; height: 28px; border-radius: 6px; background: var(--hub-bg3);
                border: 1px solid var(--hub-border2); color: var(--hub-text2);
                display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
            }
            .hub-btn-circle:hover { background: var(--hub-bg4); color: white; border-color: var(--hub-accent); }
            
            .hub-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
            
            /* Custom Scrollbar */
            .hub-content::-webkit-scrollbar { width: 6px; }
            .hub-content::-webkit-scrollbar-track { background: var(--hub-bg); }
            .hub-content::-webkit-scrollbar-thumb { background: var(--hub-bg4); border-radius: 10px; }
            .hub-content::-webkit-scrollbar-thumb:hover { background: var(--hub-accent); }

            .hub-module { display: none; flex-direction: column; gap: 16px; animation: hubFadeIn 0.3s ease; }
            .hub-module.active { display: flex; }
            @keyframes hubFadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

            /* CARDS */
            .hub-card { background: var(--hub-bg2); border: 1px solid var(--hub-border); border-radius: 10px; overflow: hidden; }
            .hub-card-header { padding: 12px 16px; border-bottom: 1px solid var(--hub-border); display: flex; justify-content: space-between; align-items: center; }
            .hub-card-title { font-size: 10.5px; font-weight: 700; color: var(--hub-text3); text-transform: uppercase; letter-spacing: 0.8px; }
            .hub-card-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

            /* COMPONENTS */
            .hub-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
            .hub-label { font-size: 12.5px; color: var(--hub-text2); }
            .hub-sub { font-size: 10px; color: var(--hub-text3); margin-top: 2px; }
            .hub-input {
                background: var(--hub-bg3); border: 1px solid var(--hub-border); border-radius: 7px;
                color: var(--hub-text); padding: 8px 12px; width: 100%; outline: none; transition: 0.2s; font-size: 12px;
                resize: none; display: block; box-sizing: border-box; font-family: inherit;
            }
            .hub-input:focus { border-color: var(--hub-accent); background: var(--hub-bg4); }
            textarea.hub-input { 
                min-height: 60px; 
                line-height: 1.7; 
                padding: 12px; 
                overflow-y: hidden; 
                box-sizing: border-box; 
                display: block;
            }
            .hub-btn {
                background: var(--hub-bg3); border: 1px solid var(--hub-border2); border-radius: 8px;
                color: var(--hub-text2); padding: 8px 16px; cursor: pointer; transition: 0.2s; font-size: 12px; font-weight: 600;
                text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                width: fit-content; flex-shrink: 0;
            }
            .hub-btn:hover { background: var(--hub-bg4); color: white; }
            .hub-btn.primary { background: var(--hub-accent-dim); color: var(--hub-accent); border-color: var(--hub-accent-glow); }
            .hub-btn.primary:hover { background: var(--hub-accent); color: white; }
            .hub-btn.danger { background: var(--hub-red-dim); color: var(--hub-red); border-color: rgba(248,113,113,0.2); }
            .hub-btn.danger:hover { background: var(--hub-red); color: white; }

            .hub-toggle { position: relative; width: 34px; height: 18px; cursor: pointer; }
            .hub-toggle input { display: none; }
            .hub-toggle-track { position: absolute; inset: 0; background: var(--hub-bg4); border-radius: 10px; transition: 0.3s; }
            .hub-toggle input:checked + .hub-toggle-track { background: var(--hub-accent); }
            .hub-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; background: #fff; border-radius: 50%; transition: 0.3s; }
            .hub-toggle input:checked ~ .hub-toggle-thumb { left: 19px; }

            .hub-badge { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
            .hub-badge.green { background: var(--hub-green-dim); color: var(--hub-green); }
            .hub-badge.purple { background: var(--hub-accent-dim); color: var(--hub-accent); }

            .hub-footer-status { padding: 10px 20px; border-top: 1px solid var(--hub-border); font-size: 11px; color: var(--hub-text3); background: var(--hub-bg2); }
            
            #accountList { display: flex; flex-direction: column; gap: 8px; }
            .account-item { display: flex; align-items: center; justify-content: space-between; background: var(--hub-bg3); padding: 8px 12px; border-radius: 7px; border: 1px solid var(--hub-border); }
            
            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .stat-item { background: var(--hub-bg3); border: 1px solid var(--hub-border); border-radius: 8px; padding: 12px; }
            .stat-label { font-size: 9px; color: var(--hub-text3); text-transform: uppercase; margin-bottom: 4px; }
            .stat-val { font-size: 13px; font-weight: 600; color: var(--hub-text); }

            .status-row { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
            .status-dot-outer { width: 14px; height: 14px; border: 2px solid #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .status-dot-inner { width: 6px; height: 6px; background: transparent; border-radius: 50%; }

            @keyframes hubSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .hub-spinning { animation: hubSpin 1s linear infinite; }
        </style>
        
        <div class="hub-container">
            <!-- SIDEBAR -->
            <div class="hub-sidebar">
                <div class="hub-logo" id="dragHeader">
                    <div class="hub-logo-name" id="headerTitle">HONNYBIZZ</div>
                    <div class="hub-logo-sub">HONNYHAHA</div>
                </div>

                <div class="hub-sidebar-section">
                    <div class="hub-sidebar-label">Main</div>
                    <div class="hub-nav-item active" data-target="hub-mod-dashboard">
                        <svg class="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        Dashboard
                    </div>
                    <div class="hub-nav-item" data-target="hub-mod-profile">
                        <svg class="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Profile & Activity
                    </div>
                    <div class="hub-nav-item" data-target="hub-mod-av">
                        <svg class="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        Fake Camera & AV
                    </div>
                    <div class="hub-nav-item" data-target="hub-mod-soundpad">
                        <svg class="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        Soundpad
                    </div>
                </div>

                <div class="hub-sidebar-section">
                    <div class="hub-sidebar-label">Tools</div>
                    <div class="hub-nav-item" data-target="hub-mod-accounts">
                        <svg class="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Multi-Accounts
                    </div>
                    <div class="hub-nav-item" data-target="hub-mod-stealth">
                        <svg class="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Stealth & Exploits
                    </div>
                </div>

                <div class="hub-sidebar-footer">
                    <div class="hub-key-badge">
                        <div class="hub-key-label">License Key</div>
                        <div class="hub-key-value" id="licenseKeyText">${currentKey}</div>
                        <div class="hub-key-expire" id="expireTimer">Loading...</div>
                    </div>
                </div>
            </div>

            <!-- MAIN AREA -->
            <div class="hub-main">
                <div class="hub-topbar" id="dragHeader2">
                    <div class="hub-top-title" id="activeModTitle">Dashboard</div>
                    <div class="hub-top-btns">
                        <div id="statusIndicator" style="width:8px; height:8px; border-radius:50%; background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.4);"></div>
                        <div class="hub-status-text" id="currentStatusText">Ready</div>
                        <div class="hub-btn-circle" id="reloadBtn" title="Reload Script">↻</div>
                        <div class="hub-btn-circle" id="minBtn" title="Minimize">−</div>
                    </div>
                </div>

                <div class="hub-content" id="contentBody">
                    
                    <!-- MODULE: DASHBOARD -->
                    <div id="hub-mod-dashboard" class="hub-module active">
                        <div class="hub-card">
                            <div class="hub-card-header">ข่าวสารการอัปเดต (Update News)</div>
                            <div class="hub-card-body">
                                <div id="newsContent" style="background: rgba(0,0,0,0.2); border: 1px solid var(--hub-border); border-radius: 6px; padding: 12px; font-size: 13px; color: var(--hub-text2); line-height: 1.6; min-height: 80px;">
                                    กำลังพัฒนาระบบก็อปปี้ดิสคอร์ด ซึ่งต้องใช้ TOKEN ในการให้ระบบเข้าไปก็อปรูป, แบนเนอร์, ชื่อ, สังเขปดิสคอร์ด, และสามารถดาวน์โหลดรูปและแบนเนอร์ ได้
                                </div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                            <div class="hub-card">
                                <div class="hub-card-header">สถานะการเปิดใช้งาน (System Availability)</div>
                                <div class="hub-card-body" style="display:flex; flex-direction:column; gap:8px;" id="availabilityList">
                                    <div class="status-row" data-id="ready">
                                        <div class="status-dot-outer" style="border-color: #a855f7;"><div class="status-dot-inner" style="background:#a855f7;"></div></div>
                                        <span style="color:#4ade80;">🟢 ปกติ / พร้อมใช้งาน (Ready)</span>
                                    </div>
                                    <div class="status-row" data-id="maintenance">
                                        <div class="status-dot-outer"><div class="status-dot-inner"></div></div>
                                        <span style="color:#facc15;">🟡 กำลังปรับปรุง (Maintenance)</span>
                                    </div>
                                    <div class="status-row" data-id="disabled">
                                        <div class="status-dot-outer"><div class="status-dot-inner"></div></div>
                                        <span style="color:#f87171;">🔴 ปิดใช้งานชั่วคราว (Disabled)</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="hub-card">
                                <div class="hub-card-header">เวอร์ชั่นสคริปต์ (Script Version)</div>
                                <div class="hub-card-body">
                                    <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--hub-border); border-radius: 6px; padding: 12px; font-weight: 600; font-family: monospace; font-size: 16px; text-align: center;">
                                        V1.0
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="hub-card">
                            <div class="hub-card-header">Quick Fixes</div>
                            <div class="hub-card-body" id="fixGroup"></div>
                        </div>
                    </div>

                    <!-- MODULE: PROFILE -->
                    <div id="hub-mod-profile" class="hub-module">
                        <div class="hub-card">
                            <div class="hub-card-header">
                                <div class="hub-card-title">Activity Appearance</div>
                                <span class="hub-badge purple">Spoofing</span>
                            </div>
                            <div class="hub-card-body">
                                <div>
                                    <label class="hub-sidebar-label" style="padding:0; margin-bottom:4px; display:block;">Activity Name</label>
                                    <textarea id="actNameInput" class="hub-input" placeholder="GUS_TEST"></textarea>
                                </div>
                                <div>
                                    <label class="hub-sidebar-label" style="padding:0; margin-bottom:4px; display:block;">Details / Message</label>
                                    <textarea id="gameMsgInput" class="hub-input" placeholder="Playing Xenon Hub..."></textarea>
                                </div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                                    <div>
                                        <label class="hub-sidebar-label" style="padding:0; margin-bottom:4px; display:block;">Hours Played</label>
                                        <input type="number" id="hoursInput" class="hub-input" value="1">
                                    </div>
                                    <div style="display:none;">
                                        <input type="number" id="maxHoursInput">
                                    </div>
                                    <div>
                                        <label class="hub-sidebar-label" style="padding:0; margin-bottom:4px; display:block;">Spoof Activity</label>
                                        <div id="btnGroupActivity"></div>
                                    </div>
                                </div>
                                <div style="display:flex; justify-content: flex-end; gap:10px;">
                                    <button class="hub-btn primary" id="saveCloudBtn">Cloud Save Settings</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MODULE: AV -->
                    <div id="hub-mod-av" class="hub-module">
                        <div class="hub-card">
                            <div class="hub-card-header">
                                <div class="hub-card-title">Camera & Stream</div>
                            </div>
                            <div class="hub-card-body">
                                <div>
                                    <label class="hub-sidebar-label" style="padding:0; margin-bottom:4px; display:block;">Video Loop URL</label>
                                    <textarea id="videoUrlInput" class="hub-input" placeholder="https://cdn.discordapp.com/..."></textarea>
                                </div>
                                <div class="hub-row">
                                    <div class="hub-label">Output Volume: <span id="volLabel">50</span>%</div>
                                    <input type="range" id="volumeSlider" min="0" max="100" value="50" style="width: 120px; accent-color: var(--hub-accent);">
                                </div>
                                <div id="btnGroupAV" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                                    <!-- Mute/Deafen/Camera buttons injected here -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MODULE: SOUNDPAD -->
                    <div id="hub-mod-soundpad" class="hub-module">
                        <div class="hub-card">
                            <div class="hub-card-header"><div class="hub-card-title">Soundpad Integration</div></div>
                            <div class="hub-card-body">
                                <div>
                                    <label class="hub-sidebar-label" style="padding:0; margin-bottom:4px; display:block;">Audio Source URL</label>
                                    <textarea id="soundpadUrlInput" class="hub-input" placeholder="https://..."></textarea>
                                </div>
                                <div class="hub-row">
                                    <div class="hub-label">Volume: <span id="spVolLabel">50</span>%</div>
                                    <input type="range" id="spVolumeSlider" min="0" max="100" value="50" style="width: 120px; accent-color: var(--hub-accent);">
                                </div>
                                <div style="display:flex; gap:8px; justify-content: flex-end; margin-top:5px;">
                                    <button class="hub-btn primary" id="btnPlaySoundpad">Play</button>
                                    <button class="hub-btn danger" id="btnStopSoundpad">Stop</button>
                                </div>
                                <div id="btnGroupSoundpad"></div>
                            </div>
                        </div>
                    </div>

                    <!-- MODULE: ACCOUNTS -->
                    <div id="hub-mod-accounts" class="hub-module">
                        <div class="hub-card">
                            <div class="hub-card-header"><div class="hub-card-title">Saved Accounts</div></div>
                            <div class="hub-card-body">
                                <div id="accountList"></div>
                                <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px; align-items: flex-end;">
                                    <div style="display:flex; gap:8px; width: 100%;">
                                        <textarea id="newAliasInput" class="hub-input" placeholder="Alias" style="flex:0.4;"></textarea>
                                        <textarea id="newTokenInput" class="hub-input" placeholder="Token" style="flex:1;"></textarea>
                                    </div>
                                    <button class="hub-btn primary" id="addAccountBtn">Add Account (+)</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MODULE: STEALTH -->
                    <div id="hub-mod-stealth" class="hub-module">
                        <div class="hub-card">
                            <div class="hub-card-header"><div class="hub-card-title">Silent Voice Lurker</div></div>
                            <div class="hub-card-body">
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <textarea id="lurkGuildIdInput" class="hub-input" placeholder="Guild ID"></textarea>
                                    <textarea id="lurkChannelIdInput" class="hub-input" placeholder="Channel ID"></textarea>
                                </div>
                                <div class="hub-row">
                                    <div class="hub-label">Lurk Volume: <span id="lurkVolLabel">100</span>%</div>
                                    <input type="range" id="lurkVolumeSlider" min="0" max="200" value="100" style="width: 120px; accent-color: var(--hub-accent);">
                                </div>
                                <div id="lurkStatusDisplay" style="font-size:11px; text-align:center; padding:8px; background:var(--hub-bg3); border-radius:6px; border:1px solid var(--hub-border);">Off</div>
                                <div style="display:flex; gap:8px; justify-content: flex-end; margin-top:5px;">
                                    <button class="hub-btn primary" id="btnStartLurk">Start Lurking</button>
                                    <button class="hub-btn danger" id="btnStopLurk">Stop</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div class="hub-footer-status" id="statusLog">Ready</div>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Re-bind Navigation Logic
    const hubNavItems = panel.querySelectorAll('.hub-nav-item');
    const hubModules = panel.querySelectorAll('.hub-module');
    const hubTitle = panel.querySelector('#activeModTitle');

    hubNavItems.forEach(item => {
        item.onclick = () => {
            hubNavItems.forEach(i => i.classList.remove('active'));
            hubModules.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            panel.querySelector('#' + target).classList.add('active');
            hubTitle.textContent = item.textContent.trim();
        };
    });

    const contentBody = panel.querySelector("#contentBody");
    const minBtn = panel.querySelector("#minBtn");
    const reloadBtn = panel.querySelector("#reloadBtn");


    if (reloadBtn) {
        reloadBtn.onclick = async () => {
            // Reset Voice States to prevent "stuck" mute/deafen
            spoofMute = false;
            spoofDeafen = false;
            isRedMute = false;
            saveAll();
            triggerUpdateVoice();

            reloadBtn.style.display = "inline-block";
            reloadBtn.style.animation = "hubSpin 1s linear infinite";
            try {
                const endpoint = currentKey.startsWith("ADMIN-") ? "api/ADMINauth.php" : "api/auth.php";
                const resp = await fetch(`https://diskey.honny.fun/${endpoint}?key=${currentKey}&hwid=${currentHwid}`);
                const text = await resp.text();
                if (text.startsWith("ENCRYPTED:")) {
                    panel.remove();
                    let parts = text.substring(10).split(":");
                    let s = atob(parts[0]);
                    let enc = atob(parts[1]);
                    let b = new Uint8Array(enc.length);
                    for (let i = 0; i < enc.length; i++) b[i] = enc.charCodeAt(i) ^ s.charCodeAt(i % s.length);
                    new Function(new TextDecoder().decode(b))();
                } else {
                    alert("Reload Failed: " + text);
                }
            } catch (e) {
                alert("Reload Error: " + e.message);
            }
            reloadBtn.style.animation = "";
        };
    }

    // --- Login Modal System ---
    if (isPublicMode) {
        const loginModal = document.createElement("div");
        loginModal.id = "stealth-login-modal";
        loginModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(10, 5, 20, 0.8); backdrop-filter: blur(8px);
            z-index: 200000; display: flex; align-items: center; justify-content: center;
            font-family: 'Segoe UI', sans-serif;
        `;
        loginModal.innerHTML = `
            <div style="background: rgba(25, 20, 35, 0.95); border: 1px solid #a45cff; padding: 30px; border-radius: 16px; width: 320px; box-shadow: 0 0 30px rgba(164, 92, 255, 0.3); text-align: center;">
                <h2 style="color: #bfa1ff; margin-bottom: 20px; font-size: 22px;">HONNY LOGIN</h2>
                <div style="margin-bottom: 20px; text-align: left;">
                    <div style="font-size: 12px; color: rgba(224, 212, 255, 0.7); margin-bottom: 5px;">ENTER ACCESS KEY</div>
                    <input type="text" id="loginKeyInput" style="background: rgba(0,0,0,0.3); border: 1px solid #a45cff; border-radius: 8px; color: #fff; padding: 12px; width: 100%; box-sizing: border-box; outline: none; font-size: 16px; text-align: center; letter-spacing: 2px;" placeholder="HONNY-XXXX">
                </div>
                <button id="loginSubmitBtn" style="background: #a45cff; color: #fff; border: none; border-radius: 8px; padding: 12px; width: 100%; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 0 15px rgba(164, 92, 255, 0.4);">LOGIN TO SYSTEM</button>
                <div id="loginStatus" style="margin-top: 15px; font-size: 12px; color: #f38ba8;"></div>
            </div>
        `;
        document.body.appendChild(loginModal);

        const loginKeyInput = loginModal.querySelector("#loginKeyInput");
        const loginSubmitBtn = loginModal.querySelector("#loginSubmitBtn");
        const loginStatus = loginModal.querySelector("#loginStatus");

        loginSubmitBtn.onclick = async () => {
            const key = loginKeyInput.value.trim();
            if (!key) return loginStatus.textContent = "กรุณาใส่ Key";
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.textContent = "VERIFYING...";
            const hwid = btoa(navigator.userAgent + screen.width).slice(0, 20);
            try {
                const endpoint = key.startsWith("ADMIN-") ? "api/ADMINauth.php" : "api/auth.php";
                const resp = await fetch(`https://diskey.honny.fun/${endpoint}?key=` + key + "&hwid=" + hwid);
                const text = await resp.text();
                if (text.startsWith("ENCRYPTED:")) {
                    loginModal.remove();
                    let parts = text.substring(10).split(":");
                    let s = atob(parts[0]);
                    let enc = atob(parts[1]);
                    let b = new Uint8Array(enc.length);
                    for (let i = 0; i < enc.length; i++) b[i] = enc.charCodeAt(i) ^ s.charCodeAt(i % s.length);
                    new Function(new TextDecoder().decode(b))();
                } else {
                    loginStatus.textContent = text;
                }
            } catch (e) {
                loginStatus.textContent = "Connection Error";
            }
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = "LOGIN TO SYSTEM";
        };
    }

    // 4. Element Selectors & Initial State

    const sel = (id) => panel.querySelector("#" + id);
    const btnGroupActivity = sel("btnGroupActivity");
    const btnGroupAV = sel("btnGroupAV");
    const fixGroup = sel("fixGroup");
    const statusLog = sel("statusLog");
    const actNameInput = sel("actNameInput");
    const gameMsgInput = sel("gameMsgInput");
    const hoursInput = sel("hoursInput");
    const saveCloudBtn = sel("saveCloudBtn");
    const videoUrlInput = sel("videoUrlInput");
    const volumeSlider = sel("volumeSlider");
    const volLabel = sel("volLabel");

    const soundpadUrlInput = sel("soundpadUrlInput");
    const spVolumeSlider = sel("spVolumeSlider");
    const spVolLabel = sel("spVolLabel");
    const btnPlaySoundpad = sel("btnPlaySoundpad");
    const btnStopSoundpad = sel("btnStopSoundpad");
    const btnGroupSoundpad = sel("btnGroupSoundpad");

    const accountList = sel("accountList");
    const addAccountBtn = sel("addAccountBtn");
    const newAliasInput = sel("newAliasInput");
    const newTokenInput = sel("newTokenInput");

    const statusIndicator = sel("statusIndicator");
    const currentStatusText = sel("currentStatusText");
    const headerTitle = sel("headerTitle");
    const newsContent = sel("newsContent");
    const expireTimer = sel("expireTimer");

    // Initialize values
    if (headerTitle) headerTitle.textContent = "HONNYBIZZ " + systemVersion;
    if (newsContent) newsContent.textContent = systemNews;
    if (actNameInput) actNameInput.value = activityName;
    if (gameMsgInput) gameMsgInput.value = gameMessage;
    if (hoursInput) hoursInput.value = activityHours;
    if (videoUrlInput) videoUrlInput.value = fakeVideoUrl;
    if (volumeSlider) { volumeSlider.value = fakeVideoVolume; volLabel.textContent = fakeVideoVolume; }
    if (soundpadUrlInput) soundpadUrlInput.value = soundpadUrl;
    if (spVolumeSlider) { spVolumeSlider.value = soundpadVolume; spVolLabel.textContent = soundpadVolume; }

    // Event Listeners
    const autoResize = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight + 20) + 'px';
    };

    const saveAll = () => saveSettings();
    actNameInput.oninput = () => { activityName = actNameInput.value; autoResize(actNameInput); saveAll(); };
    gameMsgInput.oninput = () => { gameMessage = gameMsgInput.value; autoResize(gameMsgInput); saveAll(); };
    videoUrlInput.oninput = () => { fakeVideoUrl = videoUrlInput.value; autoResize(videoUrlInput); saveAll(); };

    volumeSlider.oninput = () => {
        fakeVideoVolume = parseInt(volumeSlider.value);
        volLabel.textContent = fakeVideoVolume;
        fakeVideoEl.volume = fakeVideoVolume / 100;
        saveAll();
    };
    if (soundpadUrlInput) soundpadUrlInput.oninput = () => { soundpadUrl = soundpadUrlInput.value; autoResize(soundpadUrlInput); saveAll(); };
    if (spVolumeSlider) spVolumeSlider.oninput = () => {
        soundpadVolume = parseInt(spVolumeSlider.value);
        spVolLabel.textContent = soundpadVolume;
        if (typeof soundpadAudioEl !== "undefined") soundpadAudioEl.volume = soundpadVolume / 100;
        saveAll();
    };
    hoursInput.oninput = () => { activityHours = parseInt(hoursInput.value) || 0; saveAll(); };

    if (newAliasInput) newAliasInput.oninput = () => autoResize(newAliasInput);
    if (newTokenInput) newTokenInput.oninput = () => autoResize(newTokenInput);

    const lurkG = sel("lurkGuildIdInput");
    const lurkC = sel("lurkChannelIdInput");
    if (lurkG) lurkG.oninput = () => autoResize(lurkG);
    if (lurkC) lurkC.oninput = () => autoResize(lurkC);

    // Initial resize for all
    setTimeout(() => {
        [actNameInput, gameMsgInput, videoUrlInput, soundpadUrlInput, newAliasInput, newTokenInput, lurkG, lurkC].forEach(autoResize);
    }, 150);

    // Cloud Save
    saveCloudBtn.onclick = async () => {
        saveCloudBtn.disabled = true;
        saveCloudBtn.innerHTML = `<span class="hub-spinning">↻</span> Saving... `;
        const params = new URLSearchParams();
        params.append("action", "save");
        params.append("key", currentKey);
        params.append("hwid", currentHwid);
        params.append("activity_name", activityName);
        params.append("activity_details", gameMessage);
        params.append("activity_hours", activityHours);
        params.append("video_url", fakeVideoUrl);
        params.append("spoof_mute", spoofMute ? 1 : 0);
        params.append("spoof_deafen", spoofDeafen ? 1 : 0);
        params.append("spoof_red_mute", isRedMute ? 1 : 0);
        params.append("spoof_activity", spoofActivity ? 1 : 0);
        params.append("is_fake_camera", isFakeCameraActive ? 1 : 0);
        params.append("fake_video_volume", fakeVideoVolume);
        params.append("auto_fix_rtc", autoFixRtc ? 1 : 0);

        try {
            const endpoint = currentKey.startsWith("ADMIN-") ? "api/ADMINauth.php" : "api/auth.php";
            const resp = await fetch(`https://diskey.honny.fun/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString()
            });
            const text = await resp.text();
            statusLog.textContent = "Cloud: " + text;
        } catch (e) {
            statusLog.textContent = "Cloud: Connection Error";
        }
        setTimeout(() => { saveCloudBtn.disabled = false; saveCloudBtn.textContent = "Cloud Save Settings"; }, 1500);
    };

    // System Status UI Integration
    const updateSystemStatusUI = () => {
        if (!statusIndicator || !currentStatusText) return;

        // Update top-bar
        if (systemStatus === "ready") {
            statusIndicator.style.background = "var(--hub-green)";
            currentStatusText.innerHTML = "Stable";
            currentStatusText.style.color = "var(--hub-green)";
        } else if (systemStatus === "maintenance") {
            statusIndicator.style.background = "var(--hub-yellow)";
            currentStatusText.innerHTML = "Maintenance";
            currentStatusText.style.color = "var(--hub-yellow)";
        } else {
            statusIndicator.style.background = "var(--hub-red)";
            currentStatusText.innerHTML = "Offline";
            currentStatusText.style.color = "var(--hub-red)";
        }

        // Update Dashboard indicators
        const rows = panel.querySelectorAll(".status-row");
        rows.forEach(row => {
            const id = row.dataset.id;
            const outer = row.querySelector(".status-dot-outer");
            const inner = row.querySelector(".status-dot-inner");
            if (id === systemStatus || (id === "disabled" && systemStatus === "offline")) {
                outer.style.borderColor = "#a855f7";
                inner.style.background = "#a855f7";
            } else {
                outer.style.borderColor = "#fff";
                inner.style.background = "transparent";
            }
        });
    };
    updateSystemStatusUI();

    // Expiry Timer
    const updateExpiry = () => {
        if (!expireTimer) return;
        if (expirationDate === "Lifetime") {
            expireTimer.textContent = "LIFETIME";
            expireTimer.style.color = "var(--hub-accent)";
            return;
        }
        const diff = new Date(expirationDate) - new Date();
        if (diff <= 0) {
            expireTimer.textContent = "EXPIRED";
            expireTimer.style.color = "var(--hub-red)";
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            expireTimer.textContent = `${days}d ${hours}h LEFT`;
        }
    };
    updateExpiry();
    setInterval(updateExpiry, 60000);

    // Minimize Logic
    if (minBtn) {
        minBtn.onclick = (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            if (isMinimized) {
                panel.style.height = "50px";
                panel.style.width = "220px";
                panel.querySelector(".hub-sidebar").style.display = "none";
                panel.querySelector(".hub-content").style.display = "none";
                panel.querySelector(".hub-footer-status").style.display = "none";
                minBtn.textContent = "+";
            } else {
                panel.style.height = "560px";
                panel.style.width = "860px";
                panel.querySelector(".hub-sidebar").style.display = "flex";
                panel.querySelector(".hub-content").style.display = "flex";
                panel.querySelector(".hub-footer-status").style.display = "block";
                minBtn.textContent = "−";
            }
        };
    }

    // Interactive Components Helpers
    function createHubSwitch(container, label, stateVar, onToggle) {
        const row = document.createElement("div");
        row.className = "hub-row";
        row.innerHTML = `
            <div class="hub-label">${label}</div>
            <label class="hub-toggle">
                <input type="checkbox" ${stateVar ? 'checked' : ''}>
                <div class="hub-toggle-track"></div>
                <div class="hub-toggle-thumb"></div>
            </label>
        `;
        const input = row.querySelector("input");
        input.onchange = () => { const newState = onToggle(); input.checked = newState; };
        if (container) container.appendChild(row);
    }

    // Component Initialization
    function triggerUpdateVoice() {
        if (lastSocket && window.lastVoiceChannelId) {
            lastSocket.send(JSON.stringify({
                op: 4,
                d: {
                    guild_id: window.lastVoiceGuildId,
                    channel_id: window.lastVoiceChannelId,
                    self_mute: spoofMute || isRedMute,
                    self_deaf: spoofDeafen,
                    self_video: isFakeCameraActive
                }
            }));
        }
    }

    createHubSwitch(btnGroupAV, "Spoof Mute ", spoofMute, () => { spoofMute = !spoofMute; saveAll(); triggerUpdateVoice(); return spoofMute; });
    createHubSwitch(btnGroupAV, "Spoof Deafen ", spoofDeafen, () => { spoofDeafen = !spoofDeafen; saveAll(); triggerUpdateVoice(); return spoofDeafen; });

    // Reset button – clears mute/deafen (and red mute) states to avoid stuck UI
    const resetBtn = sel('resetBtn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            // Reset states
            spoofMute = false;
            spoofDeafen = false;
            isRedMute = false;
            // Persist and notify server
            saveAll();
            triggerUpdateVoice();
            // Update UI toggles (checkboxes) to reflect cleared state
            document.querySelectorAll('.hub-toggle input').forEach(cb => cb.checked = false);
            console.log('[HONNYBIZZ] Reset mute/deafen states via UI button');
        };
    }
    createHubSwitch(btnGroupAV, "Red Mute ", isRedMute, () => { isRedMute = !isRedMute; saveAll(); triggerUpdateVoice(); return isRedMute; });

    function triggerUpdate() {
        if (lastSocket) {
            lastSocket.send(JSON.stringify({ op: 3, d: { status: "online", activities: [], afk: false, since: 0 } }));
        }
    }

    createHubSwitch(btnGroupActivity, "Active Spoofing", spoofActivity, () => { spoofActivity = !spoofActivity; saveAll(); triggerUpdate(); return spoofActivity; });

    // Fixes
    const hubFixGroup = panel.querySelector("#fixGroup");
    createHubSwitch(hubFixGroup, "Auto DTLS Fix", autoFixRtc, () => { autoFixRtc = !autoFixRtc; saveAll(); return autoFixRtc; });

    // --- Audio & Camera System ---
    const fakeVideoEl = document.createElement("video");
    fakeVideoEl.loop = true; fakeVideoEl.muted = false; fakeVideoEl.volume = fakeVideoVolume / 100;
    fakeVideoEl.style.cssText = "position:fixed; top:0; left:0; width:1px; height:1px; opacity:0; pointer-events:none;";
    document.body.appendChild(fakeVideoEl);

    const soundpadAudioEl = document.createElement("audio");
    soundpadAudioEl.crossOrigin = "anonymous"; soundpadAudioEl.volume = soundpadVolume / 100;
    document.body.appendChild(soundpadAudioEl);

    let audioCtx = null, videoSourceNode = null, soundpadSourceNode = null, micSourceNode = null, audioMixerDest = null;
    const getAudioMixer = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            videoSourceNode = audioCtx.createMediaElementSource(fakeVideoEl);
            soundpadSourceNode = audioCtx.createMediaElementSource(soundpadAudioEl);
            audioMixerDest = audioCtx.createMediaStreamDestination();
            videoSourceNode.connect(audioCtx.destination);
            soundpadSourceNode.connect(audioCtx.destination);
        }
        return { audioCtx, videoSourceNode, soundpadSourceNode, audioMixerDest };
    };

    // Camera Switch integration
    createHubSwitch(btnGroupAV, "Virtual Camera", isFakeCameraActive, () => {
        isFakeCameraActive = !isFakeCameraActive;
        if (!isFakeCameraActive) {
            fakeVideoEl.pause(); fakeVideoEl.src = "";
            ctx2d.clearRect(0, 0, fakeCanvasEl.width, fakeCanvasEl.height);
            if (activeFakeStream) {
                activeFakeStream.getTracks().forEach(t => { t.stop(); console.log("[HONNYBIZZ] Stopped track:", t.kind); });
                activeFakeStream = null;
            }
            if (micSourceNode) { micSourceNode.disconnect(); micSourceNode = null; }
            console.log("[HONNYBIZZ] Virtual Camera & Audio Cleanup done.");
        }
        saveAll(); return isFakeCameraActive;
    });

    // Soundpad logic
    if (btnPlaySoundpad) {
        btnPlaySoundpad.onclick = async () => {
            if (!soundpadUrl) return statusLog.textContent = "Audio URL required";
            try {
                statusLog.textContent = "Loading audio...";
                const resp = await fetch(soundpadUrl);
                const blob = await resp.blob();
                soundpadAudioEl.src = URL.createObjectURL(blob);
                if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
                await soundpadAudioEl.play();
                statusLog.textContent = "Playing Soundpad";
            } catch (e) { statusLog.textContent = "Error: " + e.message; }
        };
    }
    if (btnStopSoundpad) { btnStopSoundpad.onclick = () => { soundpadAudioEl.pause(); soundpadAudioEl.currentTime = 0; statusLog.textContent = "Stopped Soundpad"; }; }
    createHubSwitch(btnGroupSoundpad, "Mic Injection", isSoundpadActive, () => { isSoundpadActive = !isSoundpadActive; saveAll(); return isSoundpadActive; });

    // --- Accounts ---
    const renderAccounts = () => {
        const accounts = loadAccounts();
        accountList.innerHTML = "";
        accounts.forEach((acc, idx) => {
            const item = document.createElement("div");
            item.className = "account-item";
            item.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <div style="font-size:12px; font-weight:600;">${acc.alias}</div>
                    <div style="font-size:9px; opacity:0.5; font-family:monospace;">${acc.token.slice(0, 15)}...</div>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="hub-btn primary" style="padding:4px 8px;" id="switch-${idx}">Login</button>
                    <button class="hub-btn danger" style="padding:4px 8px;" id="del-${idx}">×</button>
                </div>
            `;
            item.querySelector(`#switch-${idx}`).onclick = () => {
                statusLog.textContent = "Switching account...";
                safeStorage.setItem("token", JSON.stringify(acc.token));
                location.reload();
            };
            item.querySelector(`#del-${idx}`).onclick = () => { accounts.splice(idx, 1); saveAccounts(accounts); renderAccounts(); };
            accountList.appendChild(item);
        });
    };
    if (addAccountBtn) {
        addAccountBtn.onclick = () => {
            const alias = newAliasInput.value.trim(), token = newTokenInput.value.trim();
            if (!alias || !token) return;
            const accounts = loadAccounts(); accounts.push({ alias, token }); saveAccounts(accounts);
            newAliasInput.value = ""; newTokenInput.value = ""; renderAccounts();
        };
    }
    renderAccounts();

    // --- WebSocket Hijacking (BACKUP EXACT LOGIC) ---
    WebSocket.prototype.send = function (data) {
        if (this.url && this.url.includes("gateway.discord.gg")) {
            lastSocket = this;
            if (statusLog && statusLog.textContent === "System Ready") {
                statusLog.textContent = "Gateway Connected 🟢";
            }
        }

        try {
            if (typeof data === "string" && data.trim().startsWith("{")) {
                let json = JSON.parse(data);

                if (json.op === 4 && json.d) {
                    if (typeof SilentLurker !== 'undefined' && SilentLurker.isActive && SilentLurker._isLocked && json.d.channel_id === null) {
                        console.log("[LURK] 🛡️ Blocked OP4 Leave to keep session alive!");
                        return;
                    }

                    if (json.d.channel_id) {
                        window.lastVoiceGuildId = json.d.guild_id;
                        window.lastVoiceChannelId = json.d.channel_id;
                    }
                    if (spoofMute || isRedMute) json.d.self_mute = true;
                    if (spoofDeafen) json.d.self_deaf = true;
                    data = JSON.stringify(json);
                }

                if (json.op === 3 && json.d && spoofActivity) {
                    let finalHours = activityHours;
                    if (activityMaxHours > 0 && activityHours > activityMaxHours) {
                        finalHours = activityMaxHours;
                    }

                    json.d.activities = [{
                        name: activityName,
                        type: 0,
                        details: gameMessage,
                        state: " ",
                        timestamps: { start: Date.now() - (1000 * 60 * 60 * finalHours) },
                        assets: {
                            large_image: "https://s.imgz.io/2026/03/19/IMG_20260219_204712_198abd03a9ec3a1d266.webp",
                            large_text: gameMessage
                        }
                    }];
                    data = JSON.stringify(json);
                }
            }
        } catch (e) { }
        return originalSend.call(this, data);
    };

    // --- DTLS Auto Fix System (BACKUP EXACT LOGIC) ---
    let dtlsStuckTime = 0;
    let autoFixRunning = false;
    setInterval(() => {
        if (!autoFixRtc || !window.lastVoiceChannelId || !lastSocket) return;

        const container = document.querySelector('section[class*="panels_"]');
        if (!container) return;

        const text = container.innerText.toLowerCase();
        const isConnecting = text.includes("dtls") || text.includes("rtc") || text.includes("awaiting endpoint") || text.includes("กำลังเชื่อมต่อ");

        if (isConnecting && (text.includes("voice") || text.includes("เสียง") || window.lastVoiceChannelId)) {
            dtlsStuckTime++;
            if (dtlsStuckTime >= 4 && !autoFixRunning) {
                console.log("[HONNYBIZZ] DTLS Stuck detected. Reconnecting...");
                statusLog.textContent = "♻️ RTC Stuck: Reconnecting...";
                dtlsStuckTime = 0;
                autoFixRunning = true;

                lastSocket.send(JSON.stringify({ op: 4, d: { guild_id: window.lastVoiceGuildId, channel_id: null, self_mute: false, self_deaf: false, self_video: false } }));

                setTimeout(() => {
                    if (lastSocket) {
                        lastSocket.send(JSON.stringify({
                            op: 4,
                            d: {
                                guild_id: window.lastVoiceGuildId,
                                channel_id: window.lastVoiceChannelId,
                                self_mute: spoofMute,
                                self_deaf: spoofDeafen,
                                self_video: isFakeCameraActive
                            }
                        }));
                    }
                    setTimeout(() => { autoFixRunning = false; statusLog.textContent = "Ready"; }, 1500);
                }, 1000);
            }
        } else {
            if (!autoFixRunning) dtlsStuckTime = 0;
        }
    }, 1000);

    // === SilentLurker Class — ระบบดักฟังล่องหน (BACKUP EXACT LOGIC) ===
    const SilentLurker = {
        audioCtxLurk: null,
        gainNode: null,
        isActive: false,
        voiceGuildId: null,
        _isLocked: false,
        _currentPC: null,

        init() {
            const self = this;
            const OrigPC = window.RTCPeerConnection;
            window.RTCPeerConnection = function (config, constraints) {
                const pc = new OrigPC(config, constraints);
                self._currentPC = pc;
                console.log("[LURK] 🎯 Intercepted RTCPeerConnection");

                pc.addEventListener('track', (event) => {
                    if (self.isActive && event.track.kind === 'audio') {
                        console.log("[LURK] 🔊 Track detected, routing audio...");
                        self.setupAudioFromTrack(event.track, event.streams[0]);
                    }
                });
                return pc;
            };
            window.RTCPeerConnection.prototype = OrigPC.prototype;

            const origPCClose = OrigPC.prototype.close;
            window.RTCPeerConnection.prototype.close = function () {
                if (self.isActive && self._isLocked) {
                    console.log("[LURK] 🛡️ Prevented RTCPeerConnection closure!");
                    return;
                }
                return origPCClose.apply(this, arguments);
            };
        },

        setupAudioFromTrack(track, stream) {
            try {
                if (!this.audioCtxLurk) {
                    this.audioCtxLurk = new (window.AudioContext || window.webkitAudioContext)();
                    this.gainNode = this.audioCtxLurk.createGain();
                    this.gainNode.gain.value = lurkVolume / 100;
                    this.gainNode.connect(this.audioCtxLurk.destination);
                }
                if (this.audioCtxLurk.state === 'suspended') this.audioCtxLurk.resume();

                const mediaStream = stream || new MediaStream([track]);
                const source = this.audioCtxLurk.createMediaStreamSource(mediaStream);
                source.connect(this.gainNode);
                console.log("[LURK] 🎵 Audio linked successfully!");
            } catch (e) {
                console.error("[LURK] ❌ Audio Setup Error:", e);
            }
        },

        async start(guildId, channelId) {
            const socket = window._discordGateway || lastSocket;
            if (!socket) {
                updateLurkStatus("⚠️ Socket Not Found", "#f38ba8");
                return;
            }

            this.isActive = true;
            this._isLocked = false;
            this.voiceGuildId = guildId;

            updateLurkStatus("🟡 Signaling...", "#f9e2af");

            socket.send(JSON.stringify({
                op: 4,
                d: {
                    guild_id: guildId,
                    channel_id: channelId,
                    self_mute: true,
                    self_deaf: false,
                    self_video: false
                }
            }));

            setTimeout(() => {
                if (this.isActive) {
                    this._isLocked = true;
                    updateLurkStatus("🟢 Active", "#a6e3a1");
                    console.log("[LURK] 🛡️ Session Locked.");
                }
            }, 2500);
        },

        stop() {
            this.isActive = false;
            this._isLocked = false;
            if (this.audioCtxLurk && this.audioCtxLurk.state !== 'closed') {
                try { this.audioCtxLurk.close(); } catch (e) { }
            }
            this.audioCtxLurk = null;

            const s = window._discordGateway || lastSocket;
            if (s) {
                s.send(JSON.stringify({
                    op: 4,
                    d: {
                        guild_id: this.voiceGuildId || window.lastVoiceGuildId,
                        channel_id: null,
                        self_mute: false,
                        self_deaf: false,
                        self_video: false
                    }
                }));
            }
            updateLurkStatus("🔴 Offline", "#f38ba8");
        },

        setVolume(vol) {
            if (this.gainNode) this.gainNode.gain.value = vol / 100;
        }
    };
    SilentLurker.init();

    // --- Silent Lurker UI Bindings ---
    const lurkStatusDisplay = sel("lurkStatusDisplay");
    const btnStartLurk = sel("btnStartLurk");
    const btnStopLurk = sel("btnStopLurk");
    const lurkVolLabel = sel("lurkVolLabel");
    const lurkVolumeSlider = sel("lurkVolumeSlider");

    const updateLurkStatus = (text, color) => {
        if (!lurkStatusDisplay) return;
        lurkStatusDisplay.textContent = text;
        lurkStatusDisplay.style.color = color;
    };

    if (btnStartLurk) {
        btnStartLurk.onclick = () => {
            lurkGuildId = sel("lurkGuildIdInput").value.trim();
            lurkChannelId = sel("lurkChannelIdInput").value.trim();
            saveLurkSettings();
            SilentLurker.start(lurkGuildId, lurkChannelId);
        };
    }
    if (btnStopLurk) btnStopLurk.onclick = () => SilentLurker.stop();
    if (lurkVolumeSlider) {
        lurkVolumeSlider.oninput = () => {
            lurkVolume = parseInt(lurkVolumeSlider.value);
            if (lurkVolLabel) lurkVolLabel.textContent = lurkVolume;
            SilentLurker.setVolume(lurkVolume);
            saveLurkSettings();
        };
    }

    // Canvas Draw Loop (Optimized)
    const fakeCanvasEl = document.createElement("canvas");
    fakeCanvasEl.width = 1280; fakeCanvasEl.height = 720;
    const ctx2d = fakeCanvasEl.getContext("2d");
    const drawLoop = () => {
        if (isFakeCameraActive && !fakeVideoEl.paused) ctx2d.drawImage(fakeVideoEl, 0, 0, 1280, 720);
        requestAnimationFrame(drawLoop);
    };
    drawLoop();

    // --- Hooks & RTC Interception (BACKUP EXACT LOGIC) ---
    const handleGetUserMedia = async function (constraints, originalFunc) {
        let bypassVideo = !!(isFakeCameraActive && constraints && constraints.video);
        let interceptAudio = !!(isSoundpadActive && constraints && constraints.audio);

        if (bypassVideo || interceptAudio) {
            console.log("[HONNYBIZZ] 🎯 Hijacking getUserMedia: Video=" + bypassVideo + ", Audio=" + interceptAudio);
            try {
                const finalStream = new MediaStream();

                if (bypassVideo) {
                    if (!fakeVideoUrl) throw new Error("Video URL required");

                    const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(fakeVideoUrl);
                    let fakeStream;

                    if (isImage) {
                        console.log("[HONNYBIZZ] 🖼️ Image detected (Bypass CSP)...");
                        const resp = await fetch(fakeVideoUrl);
                        const blob = await resp.blob();
                        const img = new Image();
                        const bUrl = URL.createObjectURL(blob);
                        img.src = bUrl;
                        await new Promise((res, rej) => {
                            img.onload = () => { URL.revokeObjectURL(bUrl); res(); };
                            img.onerror = () => rej(new Error("Image failed"));
                        });
                        fakeCanvasEl.width = img.width; fakeCanvasEl.height = img.height;
                        ctx2d.drawImage(img, 0, 0);
                        fakeStream = fakeCanvasEl.captureStream(30);
                    } else {
                        console.log("[HONNYBIZZ] 📹 Video detected (Bypass CSP)...");
                        const resp = await fetch(fakeVideoUrl);
                        const blob = await resp.blob();
                        const bUrl = URL.createObjectURL(blob);
                        fakeVideoEl.src = bUrl;
                        await new Promise((res, rej) => {
                            fakeVideoEl.oncanplay = res;
                            fakeVideoEl.onerror = () => rej(new Error("Video failed"));
                            setTimeout(() => rej(new Error("Timeout")), 15000);
                            fakeVideoEl.load();
                        });
                        await fakeVideoEl.play();
                        fakeStream = fakeVideoEl.captureStream ? fakeVideoEl.captureStream() : fakeVideoEl.mozCaptureStream();
                    }
                    fakeStream.getVideoTracks().forEach(t => finalStream.addTrack(t));
                } else if (constraints && constraints.video) {
                    try {
                        const real = await originalFunc({ video: constraints.video, audio: false });
                        real.getVideoTracks().forEach(t => finalStream.addTrack(t));
                    } catch (e) { }
                }

                if (constraints && constraints.audio) {
                    const { audioCtx, videoSourceNode, soundpadSourceNode, audioMixerDest } = getAudioMixer();
                    if (audioCtx.state === 'suspended') await audioCtx.resume();

                    try { videoSourceNode.disconnect(audioMixerDest); } catch (e) { }
                    if (soundpadSourceNode) { try { soundpadSourceNode.disconnect(audioMixerDest); } catch (e) { } }
                    if (micSourceNode) { try { micSourceNode.disconnect(); } catch (e) { } }

                    if (bypassVideo) videoSourceNode.connect(audioMixerDest);
                    if (interceptAudio && soundpadSourceNode) soundpadSourceNode.connect(audioMixerDest);

                    try {
                        const mic = await originalFunc({ audio: constraints.audio, video: false });
                        micSourceNode = audioCtx.createMediaStreamSource(mic);
                        micSourceNode.connect(audioMixerDest);
                        audioMixerDest.stream.getAudioTracks().forEach(t => finalStream.addTrack(t));
                    } catch (e) {
                        audioMixerDest.stream.getAudioTracks().forEach(t => finalStream.addTrack(t));
                    }
                }
                activeFakeStream = finalStream;
                return finalStream;
            } catch (err) {
                console.error("[HONNYBIZZ] Hijack Error:", err);
                statusLog.textContent = "Media Error: " + err.message;
            }
        }
        return originalFunc(constraints);
    };

    // --- Media Track Persistence Hook (Prevents client from muting while Red Mute is on) ---
    try {
        const originalEnabledDescriptor = Object.getOwnPropertyDescriptor(MediaStreamTrack.prototype, 'enabled');
        if (originalEnabledDescriptor && originalEnabledDescriptor.set) {
            Object.defineProperty(MediaStreamTrack.prototype, 'enabled', {
                set: function(val) {
                    if ((spoofMute || isRedMute) && this.kind === 'audio' && val === false) {
                        return originalEnabledDescriptor.set.call(this, true); 
                    }
                    return originalEnabledDescriptor.set.call(this, val);
                },
                get: function() { return originalEnabledDescriptor.get.call(this); },
                configurable: true
            });
        }
    } catch(e) { console.error("[HONNYBIZZ] Track Hook Error:", e); }

    // --- Hook Registration (BACKUP EXACT COMPATIBILITY) ---
    const hooks = [
        { obj: navigator.mediaDevices, name: 'getUserMedia' },
        { obj: navigator, name: 'getUserMedia' },
        { obj: navigator.mediaDevices, name: 'webkitGetUserMedia' },
        { obj: navigator, name: 'webkitGetUserMedia' },
        { obj: navigator.mozGetUserMedia, name: 'mozGetUserMedia' }
    ];

    hooks.forEach(h => {
        if (h.obj && h.obj[h.name]) {
            const original = h.obj[h.name].bind(h.obj);
            h.obj[h.name] = (c, s, e) => {
                if (typeof c === 'object' && s && e) { // Legacy style
                    return handleGetUserMedia(c, (cc) => new Promise((res, rej) => original(cc, res, rej))).then(s).catch(e);
                }
                return handleGetUserMedia(c, original); // Modern style
            };
        }
    });

    // Dragging
    let isDragging = false, offset = { x: 0, y: 0 };
    const handleStartDrag = (e) => {
        if (e.target.closest('button') || e.target.closest('.hub-btn-circle')) return;
        isDragging = true;
        offset = { x: e.clientX - panel.offsetLeft, y: e.clientY - panel.offsetTop };
    };
    sel("dragHeader").onmousedown = handleStartDrag;
    sel("dragHeader2").onmousedown = handleStartDrag;

    window.onmousemove = (e) => { if (isDragging) { panel.style.left = (e.clientX - offset.x) + "px"; panel.style.top = (e.clientY - offset.y) + "px"; } };
    window.onmouseup = () => isDragging = false;

    console.log(`[HONNYBIZZ] Premium Hub v${systemVersion} Loaded.`);
})();

