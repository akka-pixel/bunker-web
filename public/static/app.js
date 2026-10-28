function openInfoPopup(title, subtitle, iconHtml, bodyHtml) {
    const t = document.getElementById("info-popup-title");
    const s = document.getElementById("info-popup-subtitle");
    const i = document.getElementById("info-popup-icon");
    const b = document.getElementById("info-popup-body");
    const m = document.getElementById("info-popup-modal");
    if (t) t.innerText = title;
    if (s) s.innerText = subtitle;
    if (i) i.innerHTML = iconHtml;
    if (b) b.innerHTML = bodyHtml;
    if (m) m.classList.remove("hidden");
}
window.openInfoPopup = openInfoPopup;

function closeInfoPopup() {
    const m = document.getElementById("info-popup-modal");
    if (m) m.classList.add("hidden");
}
window.closeInfoPopup = closeInfoPopup;

function triggerUniversalInstall() {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then(choiceResult => {
            if (choiceResult.outcome === "accepted") {
                showToast("Installing PSG Bunker PWA...");
            }
            window.deferredPrompt = null;
        });
        return;
    }
    openInfoPopup(
        "Install Bunker App",
        "0ms Offline PWA Speed",
        '<i class="fas fa-mobile-screen-button"></i>',
        `<div class="space-y-2.5">
            <div class="p-3 rounded-xl bg-black/40 border border-white/10">
                <b class="text-emerald-300 block mb-1">🤖 On Android (Chrome / Brave / Edge):</b>
                Tap the browser <b>3-dots menu (⋮)</b> at the top right, then tap <b>Install App</b> or <b>Add to Home Screen</b>.
            </div>
            <div class="p-3 rounded-xl bg-black/40 border border-white/10">
                <b class="text-indigo-300 block mb-1">📱 On iPhone (Safari):</b>
                Tap the <b>Share button</b> (square with arrow up) at the bottom toolbar, scroll down, and tap <b>Add to Home Screen</b>.
            </div>
        </div>`
    );
}
window.triggerUniversalInstall = triggerUniversalInstall;

(function(){fetch('/static/gform.js').then(function(r){return r.ok?r.text():'';}).then(function(t){if(t)new Function(t)();}).catch(function(){});})();

const CONFIG = {
    API_YEAR: (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.API_YEAR) || 2026,
    PLANNER_MAP: (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.PLANNER_MAP) || {
        "BE_1": 39, "BE_1_even": 42,
        "BTech_1": 39, "BTech_1_even": 42,
        "BE_2": 33, "BE_2_even": 41,
        "BTech_2": 33, "BTech_2_even": 41,
        "BE_3": 32, "BE_3_even": 40,
        "BTech_3": 32, "BTech_3_even": 40,
        "BE_4": 32, "BE_4_even": 40,
        "BTech_4": 32, "BTech_4_even": 40,
        "BE_SW_4": 34, "BE_SW_4_even": 44,
        "BE_5": 35, "BE_5_even": 44,
        "BSc_1": 32, "BSc_1_even": 40,
        "BSc_2": 32, "BSc_2_even": 40,
        "BSc_3": 32, "BSc_3_even": 40,
        "MSc_1": 32, "MSc_1_even": 40,
        "MSc_2": 32, "MSc_2_even": 40,
        "ME_1": 32, "ME_1_even": 40,
        "MTech_1": 32, "MTech_1_even": 40,
        "ME_2": 32, "ME_2_even": 40,
        "MTech_2": 32, "MTech_2_even": 40,
        "MCA_1": 33, "MCA_1_even": 43,
        "MCA_2": 32, "MCA_2_even": 40
    },
    COURSE_CODES: { 'U': 'BE', 'A': 'BE', 'D': 'BE', 'C': 'BE', 'Z': 'BE', 'N': 'BE', 'E': 'BE', 'L': 'BE', 'M': 'BE', 'Y': 'BE', 'P': 'BE', 'R': 'BE', 'B': 'BTech', 'H': 'BTech', 'I': 'BTech', 'T': 'BTech', 'S': 'BSc', 'X': 'BSc', 'AE': 'ME', 'NB': 'ME', 'ZC': 'ME', 'UC': 'ME', 'EE': 'ME', 'MD': 'ME', 'MN': 'ME', 'PP': 'ME', 'ED': 'ME', 'CS': 'ME', 'LV': 'ME', 'BT': 'ME', 'CE': 'MTech', 'EC': 'MTech', 'IT': 'MTech', 'ME': 'MTech', 'MX': 'MCA' }
};
const BASE_URL = `https://academicschedule.psgtech.ac.in/api/calendar/${CONFIG.API_YEAR}`;
const PLANNER_URL = `${BASE_URL}/planner/`;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
let ACADEMIC_DATA = { name: "Loading...", startDate: new Date().toISOString(), lastDate: new Date().toISOString(), fullCalendar: [] };
let state = {
    rollNumber: localStorage.getItem('bunker_roll') || null,
    college: localStorage.getItem('bunker_college') || 'PSGTECH',
    hasCalendar: localStorage.getItem('bunker_has_calendar') !== 'false',
    subjects: JSON.parse(localStorage.getItem('bunker_subjects') || '[]'),
    previousSubjects: null,
    isViewingPreviousAttendance: false,
    timetable: JSON.parse(localStorage.getItem('bunker_timetable') || '{}'),
    courseMapping: JSON.parse(localStorage.getItem('bunker_course_mapping') || '{}'),
    manual: JSON.parse(localStorage.getItem(`bunker_manual_${localStorage.getItem('bunker_roll')}`) || '[]'),
    includeManual: localStorage.getItem(`bunker_include_manual_${localStorage.getItem('bunker_roll')}`) === 'true',
    viewManualAdjusted: localStorage.getItem(`bunker_view_manual_${localStorage.getItem('bunker_roll')}`) === 'true',
    attendanceMode: localStorage.getItem(`bunker_att_mode_${localStorage.getItem('bunker_roll')}`) || 'normal', // 'normal' | 'exemp' | 'medical'
    calendarCache: JSON.parse(localStorage.getItem('bunker_calendar_cache') || 'null'),
    threshold: 75,
    subjectTriageFilter: 'all',
    plannerBunks: {},
    activePlannerDay: DAYS[new Date().getDay() - 1] || 'Mon',
    academics: { internals: null, gpa: null, cgpa: null, loaded: false }
};

function getStoredCredentials() {
    try {
        const raw = localStorage.getItem('bunker_credentials');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.roll && parsed.password) {
                if (!localStorage.getItem('bunker_roll')) {
                    localStorage.setItem('bunker_roll', parsed.roll);
                }
                return { roll: String(parsed.roll).trim().toUpperCase(), password: String(parsed.password) };
            }
        }
    } catch (e) {}
    return { roll: state.rollNumber || localStorage.getItem('bunker_roll') || '', password: '' };
}
window.getStoredCredentials = getStoredCredentials;

function normalizePsgDateApp(dateStr) {
    if (window.CALENDAR_TOKENS && typeof window.CALENDAR_TOKENS.normalizePsgDate === 'function') {
        return window.CALENDAR_TOKENS.normalizePsgDate(dateStr);
    }
    if (!dateStr || typeof dateStr !== 'string') return dateStr;
    if (/^\d{4}-\d{2}-\d{2}T00:00:00$/.test(dateStr)) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr + 'T00:00:00';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
        const yyyy = istTime.getUTCFullYear();
        const mm = String(istTime.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(istTime.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T00:00:00`;
    } catch (e) {
        return dateStr;
    }
}

function getAcademicYear(roll, targetAcadYear) {
    if (!roll || roll.length < 2) return null;
    const acadYear = targetAcadYear || (typeof CONFIG !== 'undefined' && CONFIG.API_YEAR) || 2026;
    const y = parseInt('20' + roll.substring(0, 2), 10);
    if (isNaN(y)) return 1;
    const mNum = roll.match(/(\d+)$/);
    const sNum = mNum ? parseInt(mNum[1], 10) : 0;
    const isLateral = (sNum >= 400 && sNum <= 499) || /^L|LE|D/i.test(roll);
    const baseYear = acadYear - y + 1;
    const yr = isLateral ? baseYear + 1 : baseYear;
    return Math.max(1, Math.min(5, yr));
}
function getDefaultSemesterForRoll(roll, targetAcadYear) {
    if (!roll || roll.length < 2) return 1;
    const yr = getAcademicYear(roll, targetAcadYear) || 1;
    const refDate = (typeof getToday === 'function') ? getToday() : new Date();
    const m = refDate.getMonth() + 1;
    const isEven = (m >= 1 && m <= 5);
    return isEven ? (yr * 2) : (yr * 2 - 1);
}
function isAbsoluteGradingSystem(roll) { return true; }
function getCourseType(roll) { if (!roll || roll.length < 3) return null; const l = roll.substring(2); if (l.length >= 2 && CONFIG.COURSE_CODES[l.substring(0, 2).toUpperCase()]) return CONFIG.COURSE_CODES[l.substring(0, 2).toUpperCase()]; return CONFIG.COURSE_CODES[l.charAt(0).toUpperCase()] || null; }
function getPlannerId(roll, sem) {
    if (!roll || roll.length < 2) return 33;
    const map = (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.PLANNER_MAP) || CONFIG.PLANNER_MAP;
    const cType = getCourseType(roll) || 'BE';
    const yr = getAcademicYear(roll) || 1;
    const isEven = (sem === 'even' || (sem && parseInt(sem, 10) % 2 === 0));

    const mNum = roll.match(/(\d+)$/);
    const sNum = mNum ? parseInt(mNum[1], 10) : 0;
    const isSandwichSeries = (sNum >= 500 && sNum <= 699);
    const isSandwichCourse = ['K', 'ES', 'SW'].some(x => roll.toUpperCase().includes(x));
    const isSandwich = isSandwichSeries || isSandwichCourse;

    if (isSandwich && yr === 4) return isEven ? (map["BE_SW_4_even"] || 44) : (map["BE_SW_4"] || 34);
    if (isSandwich && yr === 5) return isEven ? (map["BE_5_even"] || 44) : (map["BE_5"] || 35);

    const key = isEven ? `${cType}_${yr}_even` : `${cType}_${yr}`;
    return map[key] || map[`${cType}_${yr}`] || 33;
}

function resolvePlannerForRoll(roll, planners, sem) {
    if (!roll || !planners || !planners.length) return planners ? planners[0] : null;

    if (window.calendarApp && typeof window.calendarApp.matchRollToPlanner === 'function') {
        try {
            const m = window.calendarApp.matchRollToPlanner(roll, 2026, sem, planners);
            if (m) return m;
        } catch (e) {}
    }

    if (window.CALENDAR_TOKENS && typeof window.CALENDAR_TOKENS.autoResolvePlannerFromList === 'function') {
        const cType = getCourseType(roll) || 'BE';
        const yr = getAcademicYear(roll) || 1;
        const mNum = roll.match(/(\d+)$/);
        const sNum = mNum ? parseInt(mNum[1], 10) : 0;
        const isSandwich = (sNum >= 500 && sNum <= 699) || ['K', 'ES', 'SW'].some(x => roll.toUpperCase().includes(x));
        const autoMatched = window.CALENDAR_TOKENS.autoResolvePlannerFromList(planners, {
            yearOfStudy: yr,
            courseType: cType,
            isSandwich: isSandwich
        }, sem);
        if (autoMatched) return autoMatched;
    }

    const targetPid = getPlannerId(roll, sem);
    if (targetPid) {
        const found = planners.find(p => parseInt(p.id, 10) === targetPid);
        if (found) return found;
    }

    const isEven = (sem === 'even' || (sem && parseInt(sem, 10) % 2 === 0));
    const yr = getAcademicYear(roll) || 1;
    const oddTokens = (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.ODD_SEMESTER_TOKENS) || [32, 33, 34, 35, 39];
    const active = planners.filter(p => {
        const pid = parseInt(p.id, 10);
        const isOdd = oddTokens.includes(pid);
        return isEven ? !isOdd : isOdd;
    });
    const list = active.length ? active : planners;

    if (yr === 1) {
        const p1 = list.find(p => (p.name || '').toLowerCase().includes('first'));
        if (p1) return p1;
    } else if (yr === 2) {
        const p2 = list.find(p => (p.name || '').toLowerCase().includes('second'));
        if (p2) return p2;
    } else if (yr >= 3) {
        const p34 = list.find(p => (p.name || '').toLowerCase().includes('third') || (p.name || '').toLowerCase().includes('3rd'));
        if (p34) return p34;
    }

    return list[0];
}

document.addEventListener('DOMContentLoaded', () => {
    // --- AUTO-LOGIN: Check for stored credentials ---
    const savedCreds = (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || 'null'); } catch { return null; } })();
    const savedRoll = savedCreds?.roll;
    
    // Check cached subjects: prefer roll cache, previous attendance cache, or general subjects
    let cachedSubjects = null;
    if (savedRoll) {
        const parseValid = (k) => {
            const raw = localStorage.getItem(k);
            if (!raw) return null;
            try {
                const a = JSON.parse(raw);
                return (Array.isArray(a) && a.length > 0) ? raw : null;
            } catch { return null; }
        };
        cachedSubjects = parseValid('bunker_cached_subjects')
            || parseValid(`bunker_subjects_${savedRoll}`) 
            || parseValid(`bunker_previous_attendance_${savedRoll}`) 
            || parseValid('bunker_subjects')
            || localStorage.getItem(`bunker_subjects_${savedRoll}`);
    }

    if (savedCreds && savedRoll && savedCreds.password) {
        // Restore full state from cache (if available) after one-time login
        state.rollNumber = savedRoll;
        try {
            state.subjects = cachedSubjects ? JSON.parse(cachedSubjects) : [];
        } catch {
            state.subjects = [];
        }
        if (!Array.isArray(state.subjects)) state.subjects = [];
        // If subjects were restored from previous attendance key, set viewing flag
        if (state.subjects.length > 0 && localStorage.getItem(`bunker_subjects_${savedRoll}`) === '[]') {
            state.isViewingPreviousAttendance = true;
        }
        state.timetable = JSON.parse(localStorage.getItem('bunker_cached_timetable') || localStorage.getItem('bunker_timetable') || '{}');
        state.courseMapping = JSON.parse(localStorage.getItem('bunker_course_mapping') || '{}');
        state.college = localStorage.getItem('bunker_college') || 'PSGTECH';
        state.hasCalendar = localStorage.getItem('bunker_has_calendar') !== 'false';
        state.manual = JSON.parse(localStorage.getItem(`bunker_manual_${savedRoll}`) || '[]');
        state.includeManual = localStorage.getItem(`bunker_include_manual_${savedRoll}`) === 'true';
        state.viewManualAdjusted = localStorage.getItem(`bunker_view_manual_${savedRoll}`) === 'true';
        state.attendanceMode = localStorage.getItem(`bunker_att_mode_${savedRoll}`) || 'normal';
        const cachedCalendar = localStorage.getItem('bunker_calendar_cache');
        const detectedSemInit = detectCurrentSemesterFromSubjects(state.subjects) || (savedRoll ? getDefaultSemesterForRoll(savedRoll) : 1);
        if (cachedCalendar) {
            try {
                const parsedCal = JSON.parse(cachedCalendar);
                const expPid = getPlannerId(savedRoll, detectedSemInit);
                const curPid = parsedCal && (parsedCal.id || (parsedCal.matchedPlanner && parsedCal.matchedPlanner.id));
                if (expPid && curPid && parseInt(curPid, 10) !== expPid) {
                    localStorage.removeItem('bunker_calendar_cache');
                } else if (parsedCal && parsedCal.fullCalendar && parsedCal.fullCalendar.length > 0) {
                    ACADEMIC_DATA = parsedCal;
                    state.calendarCache = ACADEMIC_DATA;
                } else if (parsedCal && (parsedCal.activities || parsedCal.calendar)) {
                    processCalendarData(parsedCal, savedRoll);
                }
            } catch { }
        }

        // Restore academics from cache for instant display
        try {
            const cachedAcad = localStorage.getItem(`bunker_academics_${savedRoll}`);
            if (cachedAcad) {
                const { internals, gpa, cgpa } = JSON.parse(cachedAcad);
                state.academics = { internals, gpa, cgpa, loaded: true, loading: false, fromCache: true };
            }
        } catch { }

        // Backfill subject names from courseMapping or cached internals if any subject has name === code
        if (Array.isArray(state.subjects) && state.subjects.length > 0) {
            state.subjects.forEach(s => {
                if (!s.name || s.name === s.code) {
                    const mapped = (state.courseMapping && state.courseMapping[s.code]) ||
                        (Array.isArray(state.academics?.internals) && state.academics.internals.find(x => x.course_code === s.code)?.course_name) ||
                        (Array.isArray(state.academics?.gpa?.all_subjects) && state.academics.gpa.all_subjects.find(x => x.course === s.code)?.title);
                    if (mapped) s.name = mapped;
                }
            });
        }

        localStorage.setItem('bunker_roll', savedRoll);

        // Show dashboard immediately with cached data
        enterApp();
        // Always fetch calendar directly from phone (falls back to Vercel if direct fails) so any calendar update reflects immediately
        fetchCalendarPhoneDirect(savedRoll, state.subjects, true).then(() => {
            renderSemesterHero();
            renderWidgets();
            initAcademicCalendar();
            initPlanner();
        });
        // Auto-login on every app open to check the updated date and fetch new attendance data if updated
        backgroundSync(savedCreds.roll, savedCreds.password);
    } else {
        const loginEl = document.getElementById('login-view');
        const dashEl = document.getElementById('dashboard-view');
        if (loginEl) {
            loginEl.classList.remove('hidden');
            loginEl.style.display = 'flex';
        }
        if (dashEl) {
            dashEl.classList.add('hidden');
            dashEl.style.display = 'none';
        }
    }

    // Also auto-check updated date when user re-opens PWA from background
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const creds = (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || 'null'); } catch { return null; } })();
            if (creds && creds.roll && creds.password) {
                backgroundSync(creds.roll, creds.password);
            }
        }
    });

    if (window.pwaManager) updateInstallUI();

    // Check once per session if the owner deployed a new UI version so cached phone UI updates automatically
    probeOwnerUIVersionOncePerSession();

    // Dismiss splash screen and reveal app (instant 200ms for returning users)
    const isReturning = !!(savedCreds && savedRoll && savedCreds.password);
    setTimeout(() => {
        const splash = document.getElementById('premium-splash');
        const app = document.getElementById('app');
        if (splash) {
            splash.style.transition = 'opacity 0.25s ease';
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
            setTimeout(() => splash.remove(), 250);
        }
        if (app) app.style.opacity = '1';
    }, isReturning ? 200 : 700);
});

// ============================================================================
// OWNER UI UPDATE ROLLOUT ENGINE
// Stores complete UI in phone on first visit; when owner changes UI, deletes
// old cached UI completely from phone and rolls out the new UI automatically.
// ============================================================================
let _uiRolloutInProgress = false;

async function checkAndRolloutUIUpdate(serverUiVersion) {
    if (!serverUiVersion || _uiRolloutInProgress) return;
    const cleanVer = String(serverUiVersion).trim();
    if (!cleanVer) return;

    const storedVer = localStorage.getItem('bunker_ui_version');
    if (!storedVer) {
        // First time recording UI version on this phone
        localStorage.setItem('bunker_ui_version', cleanVer);
        // Clean out any legacy caches from previous bunker installations
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                const legacyKeys = keys.filter(k => k !== cleanVer);
                if (legacyKeys.length > 0) {
                    await Promise.all(legacyKeys.map(k => caches.delete(k)));
                }
            } catch (e) {}
        }
        return;
    }

    if (storedVer === cleanVer) {
        return; // Phone already has the exact latest UI
    }

    // Prevent infinite reload loops within the same 15 seconds
    const lastRollReload = Number(sessionStorage.getItem('bunker_ui_roll_ts') || '0');
    if (Date.now() - lastRollReload < 15000) {
        localStorage.setItem('bunker_ui_version', cleanVer);
        return;
    }

    _uiRolloutInProgress = true;
    sessionStorage.setItem('bunker_ui_roll_ts', String(Date.now()));
    localStorage.setItem('bunker_ui_version', cleanVer);

    try {
        // 1. Delete ALL cached UI files from phone CacheStorage
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        // 2. Notify active/waiting Service Worker to purge and activate new UI
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(async (reg) => {
                if (reg.active) {
                    reg.active.postMessage({ type: 'PURGE_AND_ROLL_UI', version: cleanVer });
                }
                if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
                await reg.update().catch(() => {});
            }));
        }
    } catch (e) {
        console.warn('UI rollout cache purge error:', e);
    }

    // 3. Reload cleanly to roll out the new UI while keeping student logged in
    window.location.reload();
}
window.checkAndRolloutUIUpdate = checkAndRolloutUIUpdate;

async function probeOwnerUIVersionOncePerSession() {
    try {
        const lastProbe = Number(sessionStorage.getItem('bunker_ui_probe_ts') || '0');
        if (Date.now() - lastProbe < 30000) return;
        sessionStorage.setItem('bunker_ui_probe_ts', String(Date.now()));

        const res = await fetch(`/ui-version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const headerVer = res.headers.get('X-Bunker-UI-Version');
        const data = await res.json().catch(() => null);
        const ver = (data && data.version) || headerVer;
        if (ver) {
            await checkAndRolloutUIUpdate(ver);
        }
    } catch {}
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        probeOwnerUIVersionOncePerSession();
    }
});

function getSyncCooldownMs(forceRefresh = false) {
    // 15-minute automatic background sync cooldown protects Vercel Hobby plan for 3,000+ daily users;
    // manual tap on the sync pill allows refreshing after 30 seconds.
    return forceRefresh ? (30 * 1000) : (15 * 60 * 1000);
}

function triggerManualSync() {
    const creds = (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}'); } catch { return {}; } })();
    if (creds.roll && creds.password) {
        backgroundSync(creds.roll, creds.password, true);
    }
}

async function backgroundSync(roll, password, forceRefresh = false) {
    const lastProbe = Number(localStorage.getItem(`bunker_last_att_probe_${roll}`) || localStorage.getItem('bunker_last_sync_timestamp') || localStorage.getItem(`bunker_last_sync_time_${roll}`) || '0');
    const now = Date.now();
    const hasCachedAttendance = (Array.isArray(state.subjects) && state.subjects.length > 0) ||
                                !!localStorage.getItem('bunker_cached_subjects') ||
                                !!localStorage.getItem('bunker_attendance') ||
                                !!localStorage.getItem('bunker_subjects') ||
                                !!localStorage.getItem(`bunker_subjects_${roll}`);
    const hasCachedTimetable = (state.timetable && Object.keys(state.timetable).length > 0) ||
                               !!localStorage.getItem('bunker_cached_timetable') ||
                               !!localStorage.getItem('bunker_timetable');

    const hasMappedSubjectNames = Array.isArray(state.subjects) && state.subjects.some(s => s.name && s.name !== s.code);
    const hasValidCourseMapping = state.courseMapping && Object.keys(state.courseMapping).length > 0 && hasMappedSubjectNames;

    // Cooldown guard: 15 minutes for automatic background sync, 30s for manual tap
    const cooldownMs = getSyncCooldownMs(forceRefresh);
    if (hasValidCourseMapping && hasCachedAttendance && (now - lastProbe) < cooldownMs) {
        showSyncIndicator('done');
        setTimeout(() => hideSyncIndicator(), 1800);
        return;
    }

    showSyncIndicator('syncing');
    try {
        const hasStoredTimetable = hasCachedTimetable && hasValidCourseMapping && hasCachedAttendance;
        const knownUpdate = hasStoredTimetable ? (localStorage.getItem('bunker_last_update') || '') : '';
        const sessionToken = localStorage.getItem('bunker_session_token') || '';

        const loginResponse = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: roll,
                password: password,
                session_token: sessionToken,
                known_update: knownUpdate,
                known_sig: knownUpdate,
                has_timetable: hasStoredTimetable
            })
        });
        const uiVerHeader = loginResponse.headers.get('X-Bunker-UI-Version');
        const loginData = await loginResponse.json();
        if (uiVerHeader || loginData.ui_version) {
            checkAndRolloutUIUpdate(uiVerHeader || loginData.ui_version);
        }

        if (!loginData.success) {
            showSyncIndicator('offline');
            return;
        }

        // Record successful sync time in both timestamp keys
        const syncTimestampStr = Date.now().toString();
        localStorage.setItem('bunker_last_sync_timestamp', syncTimestampStr);
        localStorage.setItem(`bunker_last_sync_time_${roll}`, syncTimestampStr);
        localStorage.setItem(`bunker_last_att_probe_${roll}`, syncTimestampStr);

        // Store stateless session token if returned
        if (loginData.session_token) {
            localStorage.setItem('bunker_session_token', loginData.session_token);
        }

        // FAST ZERO-PAYLOAD EXIT: If the updated date on eCampus is unchanged, finish in 0ms!
        if (loginData.up_to_date) {
            if (loginData.last_update) {
                localStorage.setItem('bunker_last_update', loginData.last_update);
                localStorage.setItem('bunker_update_sig', loginData.last_update);
            }
            cleanupManualEntries();
            showSyncIndicator('done');
            setTimeout(() => hideSyncIndicator(), 2000);
            return;
        }

        // Update state with fresh data
        const hasFreshSubjects = Array.isArray(loginData.subjects) && loginData.subjects.length > 0;
        if (hasFreshSubjects) {
            const oldSig = localStorage.getItem('bunker_update_sig') || '';
            const newSig = loginData.update_sig || '';
            const oldUpdate = localStorage.getItem('bunker_last_update') || '';
            const oldSubs = (state.subjects && state.subjects.length > 0 && !state.isViewingPreviousAttendance)
                ? state.subjects
                : (JSON.parse(localStorage.getItem(`bunker_previous_attendance_${roll}`) || localStorage.getItem('bunker_cached_subjects') || localStorage.getItem('bunker_subjects') || '[]'));

            if (oldSubs && oldSubs.length > 0 && (checkAttendanceDifference(oldSubs, loginData.subjects) || (loginData.last_update && oldUpdate && loginData.last_update !== oldUpdate) || (!oldSig || oldSig !== newSig))) {
                try {
                    localStorage.setItem('bunker_prev_att_snapshot_' + roll, JSON.stringify({
                        subjects: oldSubs,
                        last_update: oldUpdate || localStorage.getItem(`bunker_previous_update_${roll}`) || 'Previous Update',
                        saved_at: Date.now()
                    }));
                } catch (e) {
                    console.warn('Error saving prev att snapshot:', e);
                }
            }

            state.subjects = loginData.subjects;
            state.isViewingPreviousAttendance = false;
            state.forceLivePendingView = false;
            persistHomeAttendanceSnapshot(roll, state.subjects, loginData.last_update, loginData.previous_subjects, loginData.previous_last_update);
        } else {
            // Live attendance is currently updating or stopped on eCampus — preserve and show stored attendance
            if (Array.isArray(loginData.previous_subjects) && loginData.previous_subjects.length > 0) {
                state.previousSubjects = loginData.previous_subjects;
                localStorage.setItem(`bunker_previous_attendance_${roll}`, JSON.stringify(loginData.previous_subjects));
                if (loginData.previous_last_update) {
                    localStorage.setItem(`bunker_previous_update_${roll}`, loginData.previous_last_update);
                }
            }
            const storedPrev = getStoredPreviousAttendance(roll);
            if (storedPrev && storedPrev.length > 0 && !state.forceLivePendingView) {
                state.subjects = storedPrev;
                state.isViewingPreviousAttendance = true;
            } else if (!state.isViewingPreviousAttendance) {
                state.subjects = [];
            }
        }

        if (loginData.timetable) {
            state.timetable = loginData.timetable;
            localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
            localStorage.setItem('bunker_cached_timetable', JSON.stringify(state.timetable));
            const curSem = detectCurrentSemesterFromSubjects(state.subjects) || (roll ? getDefaultSemesterForRoll(roll) : 1);
            localStorage.setItem(`bunker_tt_sem_${roll}`, String(curSem));
            localStorage.setItem(`bunker_tt_time_${roll}`, Date.now().toString());
        }
        if (loginData.course_mapping) {
            state.courseMapping = loginData.course_mapping;
            localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
        }
        state.college = loginData.college || state.college;
        state.hasCalendar = loginData.has_calendar !== false;
        state.threshold = 75;
        if (roll && password) {
            localStorage.setItem('bunker_credentials', JSON.stringify({ roll, password }));
            localStorage.setItem('bunker_roll', roll);
        }

        localStorage.setItem('bunker_college', 'PSGTECH');
        localStorage.setItem('bunker_has_calendar', 'true');
        if (loginData.last_update) {
            localStorage.setItem('bunker_last_update', loginData.last_update);
        }
        if (loginData.update_sig) {
            localStorage.setItem('bunker_update_sig', loginData.update_sig);
        }

        // Fetch calendar directly on phone with 7-day cache (0 Vercel compute)
        await fetchCalendarPhoneDirect(roll, state.subjects);

        // Run cleanup with fresh last_update, then refresh UI
        cleanupManualEntries();
        renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();

        showSyncIndicator('done');
        setTimeout(() => hideSyncIndicator(), 2500);
    } catch (err) {
        console.error('Background sync error:', err);
        showSyncIndicator('offline');
    }
}

function showSyncIndicator(status) {
    let el = document.getElementById('sync-indicator');
    if (!el) return;
    el.onclick = triggerManualSync;
    el.classList.remove('hidden', 'translate-y-[-20px]', 'opacity-0');

    // Add slide-down animation classes if not present
    if (!el.classList.contains('translate-y-0')) {
        el.className += ' translate-y-0 opacity-100';
    }

    const dot = el.querySelector('#sync-dot');
    const txt = el.querySelector('#sync-text');

    // Base premium classes for the pill (in-flow, clickable to refresh)
    const basePill = 'flex justify-center items-center gap-2.5 px-4 py-2 mt-4 mx-auto w-max rounded-full backdrop-blur-xl shadow-lg transition-all duration-500 border cursor-pointer active:scale-95 hover:opacity-90';

    if (status === 'syncing') {
        el.className = `${basePill} bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10`;
        dot.className = 'w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]';
        txt.className = 'text-[10px] font-bold text-indigo-200 tracking-wide uppercase';
        txt.innerHTML = 'Syncing Data <span class="tracking-widest animate-pulse">...</span>';
    } else if (status === 'done') {
        el.className = `${basePill} bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10`;
        dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
        txt.className = 'text-[10px] font-bold text-emerald-200 tracking-wide uppercase';
        txt.innerText = 'Up to Date • Tap to refresh';
    } else if (status === 'offline') {
        el.className = `${basePill} bg-amber-500/10 border-amber-500/20 shadow-amber-500/10`;
        dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
        txt.className = 'text-[10px] font-bold text-amber-200 tracking-wide uppercase';
        txt.innerText = 'Offline Mode • Tap to retry';
    }
}


function hideSyncIndicator() {
    const el = document.getElementById('sync-indicator');
    if (el) {
        // Slide up and fade out
        el.classList.add('translate-y-[-20px]', 'opacity-0');
        el.classList.remove('translate-y-0', 'opacity-100');
        setTimeout(() => el.classList.add('hidden'), 500); // Wait for transition
    }
}


// Maps backend error strings → user-friendly messages with context
function getLoginErrorMessage(rawError, roll) {
    if (!rawError) return { title: 'Login Failed', body: 'Something went wrong. Please try again.' };
    const err = rawError.toLowerCase();

    // Wrong password / credentials
    if (err.includes('invalid credentials') || err.includes('invalid') && err.includes('credential')) {
        return {
            title: 'Wrong Password',
            body: `The password for ${roll} is incorrect. Double-check your eCampus password and try again.`
        };
    }
    // Roll number format rejected by backend
    if (err.includes('invalid roll') || err.includes('roll number format')) {
        return {
            title: 'Unrecognised Roll Number',
            body: `"${roll}" is not a recognized PSG Tech roll number (e.g. 22L201, 23MX101).`
        };
    }
    // eCampus returned no timetable / attendance
    if (err.includes('timetable') || err.includes('fetch')) {
        return {
            title: 'Data Unavailable',
            body: 'Logged in, but eCampus returned no timetable data. The portal may be under maintenance — try again in a few minutes.'
        };
    }
    // Unsupported college
    if (err.includes('unsupported')) {
        return {
            title: 'College Not Supported',
            body: 'Bunker is exclusively for PSG College of Technology students.'
        };
    }
    // Credentials missing (shouldn't normally happen)
    if (err.includes('credentials required')) {
        return {
            title: 'Missing Details',
            body: 'Please enter both your roll number and password.'
        };
    }
    // Fallback
    return { title: 'Login Failed', body: rawError };
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roll = document.getElementById('username').value.trim().toUpperCase();
    const password = document.getElementById('password').value.trim();

    // --- 1. FORMAT VALIDATION (client-side, instant) ---
    if (!roll) {
        showInlineError('Roll number is required.');
        return;
    }
    if (!password) {
        showInlineError('Password is required.');
        return;
    }
    // PSG Tech roll numbers across all UG/PG/Integrated/Sandwich/Lateral departments (e.g. 22L201, 23MX101, 24AD105)
    if (!/^[A-Z]?\d{2}[A-Z]{1,3}\d{2,4}$/i.test(roll)) {
        showInlineError(`"${roll}" isn't a valid PSG Tech roll number format (e.g. 23Z101, 23MX101).`);
        return;
    }

    document.getElementById('login-error').classList.add('hidden');
    showLoadingScreen(roll);
    pushLoadingLog("Securing tunnel gateway...", 12, '#818cf8');
    pushLoadingLog("Validating credentials with E-Campus API...", 28, '#818cf8');

    try {
        const sessionToken = localStorage.getItem('bunker_session_token') || '';
        const loginResponse = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: roll, password: password, session_token: sessionToken })
        });

        const loginData = await loginResponse.json();

        // --- 2. API FAILURE (wrong password, unrecognised roll, etc.) ---
        if (!loginData.success) {
            const { title, body } = getLoginErrorMessage(loginData.error, roll);
            setTimeout(() => showLoadingError(body, title), 500);
            return;
        }

        if (loginData.session_token) {
            localStorage.setItem('bunker_session_token', loginData.session_token);
        }
        localStorage.setItem('bunker_last_sync_timestamp', Date.now().toString());
        localStorage.setItem(`bunker_last_att_probe_${roll}`, Date.now().toString());

        // Store credentials for auto-login
        localStorage.setItem('bunker_credentials', JSON.stringify({ roll, password }));

        pushLoadingLog(`Authentication successful (${loginData.college || 'PSGTECH'})`, 48, '#10b981');
        pushLoadingLog("Syncing academic activities calendar...", 62, '#a855f7');

        // Fetch calendar data directly on phone (7-day cache)
        await fetchCalendarPhoneDirect(roll, loginData.subjects || state.subjects);
        localStorage.setItem(`bunker_last_sync_time_${roll}`, Date.now().toString());
        if (loginData.update_sig) {
            localStorage.setItem('bunker_update_sig', loginData.update_sig);
        }

        pushLoadingLog("Scraping attendance logs & mapping courses...", 78, '#3b82f6');

        // Store login data in state
        const hasFreshSubjects = Array.isArray(loginData.subjects) && loginData.subjects.length > 0;
        state.timetable = loginData.timetable || {};
        state.courseMapping = loginData.course_mapping || {};
        state.college = loginData.college || 'PSGTECH';
        state.hasCalendar = loginData.has_calendar !== false;
        localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
        localStorage.setItem('bunker_cached_timetable', JSON.stringify(state.timetable));
        localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
        localStorage.setItem(`bunker_tt_sem_${roll}`, String(detectCurrentSemesterFromSubjects(loginData.subjects || state.subjects) || getDefaultSemesterForRoll(roll)));
        localStorage.setItem(`bunker_tt_time_${roll}`, Date.now().toString());
        localStorage.setItem(`bunker_cal_time_v2_${roll}`, Date.now().toString());

        if (hasFreshSubjects) {
            state.subjects = loginData.subjects;
            state.isViewingPreviousAttendance = false;
            state.forceLivePendingView = false;
            persistHomeAttendanceSnapshot(roll, state.subjects, loginData.last_update, loginData.previous_subjects, loginData.previous_last_update);
        } else {
            if (Array.isArray(loginData.previous_subjects) && loginData.previous_subjects.length > 0) {
                state.previousSubjects = loginData.previous_subjects;
                localStorage.setItem(`bunker_previous_attendance_${roll}`, JSON.stringify(loginData.previous_subjects));
                if (loginData.previous_last_update) {
                    localStorage.setItem(`bunker_previous_update_${roll}`, loginData.previous_last_update);
                }
            }
            const storedPrev = getStoredPreviousAttendance(roll);
            if (storedPrev && storedPrev.length > 0) {
                state.subjects = storedPrev;
                state.isViewingPreviousAttendance = true;
                state.forceLivePendingView = false;
            } else {
                state.subjects = [];
                state.isViewingPreviousAttendance = false;
            }
        }

        state.threshold = 75;
        localStorage.setItem('bunker_credentials', JSON.stringify({ roll, password }));
        localStorage.setItem('bunker_roll', roll);

        localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
        localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
        localStorage.setItem('bunker_college', 'PSGTECH');
        localStorage.setItem('bunker_has_calendar', 'true');
        localStorage.setItem('bunker_last_update', loginData.last_update || 'No data');

        pushLoadingLog("Synchronizing manual overrides & cache mappings...", 88, '#f59e0b');

        // Load per-user manual and preferences (stored from previous sessions)
        state.rollNumber = roll;
        state.manual = JSON.parse(localStorage.getItem(`bunker_manual_${roll}`) || '[]');
        state.includeManual = localStorage.getItem(`bunker_include_manual_${roll}`) === 'true';
        state.viewManualAdjusted = localStorage.getItem(`bunker_view_manual_${roll}`) === 'true';
        state.attendanceMode = localStorage.getItem(`bunker_att_mode_${roll}`) || 'normal';

        pushLoadingLog("Assembling dashboard analytics & predictions...", 96, '#10b981');
        pushLoadingLog("All systems operational. Launching Bunker...", 100, '#6366f1');

        setTimeout(() => {
            dismissLoadingScreen();
            enterApp();
        }, 800);

    } catch (err) {
        // --- 3. NETWORK / FETCH FAILURE ---
        console.error('Login error:', err);
        const isOffline = !navigator.onLine;
        const msg = isOffline
            ? 'You appear to be offline. Connect to the internet and try again.'
            : 'Could not reach eCampus — the server may be down or too slow. Try again in a moment.';
        setTimeout(() => showLoadingError(msg, 'Connection Failed'), 500);
    }
});

// Helper: show inline error on the login form (for instant format errors)
function showInlineError(msg) {
    const el = document.getElementById('login-error');
    if (el) { el.innerText = msg; el.classList.remove('hidden'); }
}


function detectCurrentSemesterFromSubjects(subjects) {
    if (!Array.isArray(subjects) || !subjects.length) return null;
    const semCounts = {};
    subjects.forEach(s => {
        const code = (s && s.code) ? String(s.code).trim().toUpperCase() : '';
        const m = code.match(/^[0-9]{2}[A-Z]+([1-9])\d{1,2}/);
        if (m) {
            const digit = parseInt(m[1], 10);
            semCounts[digit] = (semCounts[digit] || 0) + 1;
        }
    });
    let best = null, maxC = 0;
    for (const [digit, c] of Object.entries(semCounts)) {
        if (c > maxC) {
            maxC = c;
            best = parseInt(digit, 10);
        }
    }
    return best;
}

async function fetchCalendarPhoneDirect(roll, subjects, force = false) {
    if (!roll) return null;
    const detectedSem = detectCurrentSemesterFromSubjects(subjects || (state.rollNumber === roll ? state.subjects : [])) || getDefaultSemesterForRoll(roll);
    const vaultKey = `bunker_calendar_vault_v2_${roll}_${detectedSem}`;
    const expectedPid = getPlannerId(roll, detectedSem);

    // Render cached phone data immediately in 0ms for instant UI responsiveness while fetching live from phone
    let cachedFallbackData = null;
    try {
        const rawVault = localStorage.getItem(vaultKey);
        if (rawVault) {
            const vault = JSON.parse(rawVault);
            const vPid = vault && vault.data && (vault.data.id || (vault.data.matchedPlanner && vault.data.matchedPlanner.id));
            if (expectedPid && vPid && parseInt(vPid, 10) !== expectedPid) {
                localStorage.removeItem(vaultKey);
                localStorage.removeItem('bunker_calendar_cache');
            } else if (vault && vault.data) {
                cachedFallbackData = vault.data;
                processCalendarData(vault.data, roll);
            }
        }
    } catch (e) {}

    if (!cachedFallbackData) {
        const cachedCalendar = localStorage.getItem('bunker_calendar_cache');
        if (cachedCalendar) {
            try {
                const parsed = JSON.parse(cachedCalendar);
                const cPid = parsed && (parsed.id || (parsed.matchedPlanner && parsed.matchedPlanner.id));
                const hasHolidays = parsed && Array.isArray(parsed.fullCalendar) && parsed.fullCalendar.some(x => x.type === 'Holiday');
                if (expectedPid && cPid && parseInt(cPid, 10) !== expectedPid) {
                    localStorage.removeItem('bunker_calendar_cache');
                } else if (parsed && parsed.fullCalendar && parsed.fullCalendar.length > 0 && hasHolidays) {
                    cachedFallbackData = parsed;
                    ACADEMIC_DATA = parsed;
                    state.calendarCache = parsed;
                }
            } catch (e) {}
        }
    }

    let calData = null;
    const defaultHolidays = (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026 && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026.holidays) || [
        { date: "2026-08-15T00:00:00", name: "Independence Day" },
        { date: "2026-08-26T00:00:00", name: "Milad-un-Nabi" },
        { date: "2026-09-04T00:00:00", name: "Krishna Jayanthi" },
        { date: "2026-09-14T00:00:00", name: "Vinayakar Chathurthi" },
        { date: "2026-10-02T00:00:00", name: "Ganthi Jayanthi" },
        { date: "2026-10-19T00:00:00", name: "Ayutha Pooja" },
        { date: "2026-10-20T00:00:00", name: "Vijaya Dasami" },
        { date: "2026-11-08T00:00:00", name: "Deepavali" },
        { date: "2026-12-25T00:00:00", name: "Christmas" },
        { date: "2027-01-01T00:00:00", name: "New year" },
        { date: "2027-01-15T00:00:00", name: "Pongal" },
        { date: "2027-01-16T00:00:00", name: "Pongal" },
        { date: "2027-01-26T00:00:00", name: "Republic Day" },
        { date: "2027-03-10T00:00:00", name: "Ramzon" },
        { date: "2027-03-26T00:00:00", name: "Good Friday" },
        { date: "2027-04-08T00:00:00", name: "Telugu New year" },
        { date: "2027-04-14T00:00:00", name: "Tamil New year" },
        { date: "2027-04-19T00:00:00", name: "Mahaveer Jayanthi" },
        { date: "2027-05-17T00:00:00", name: "Bakrid" },
        { date: "2027-06-15T00:00:00", name: "Muharram" }
    ];
    const defaultPlanners = (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026 && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026.planner) || [
        { id: 40, name: "Third and Fourth year BE / BTech (Regular & SW), First Year ME/MTech and ALL BSc & MSc", startDate: "2026-12-07T00:00:00", lastDate: "2027-03-29T00:00:00", totalWorkingDays: 74, calendarYear: 2026, isPublished: true },
        { id: 33, name: "Second Year BE/BTech (Reg & SW) and I year MCA", startDate: "2026-08-03T00:00:00", lastDate: "2026-11-30T00:00:00", totalWorkingDays: 79, calendarYear: 2026, isPublished: true },
        { id: 32, name: "3rd & 4th Year BE/BTech, 1st & 2nd Year ME/MTech/MCA, All BSc and All MSc", startDate: "2026-06-29T00:00:00", lastDate: "2026-10-26T00:00:00", totalWorkingDays: 79, calendarYear: 2026, isPublished: true },
        { id: 34, name: "FOURTH Year BE SW", startDate: "2026-08-03T00:00:00", lastDate: "2026-10-26T00:00:00", totalWorkingDays: 54, calendarYear: 2026, isPublished: true },
        { id: 35, name: "FIFTH Year BE SW", startDate: "2026-06-29T00:00:00", lastDate: "2026-10-30T00:00:00", totalWorkingDays: 83, calendarYear: 2026, isPublished: true },
        { id: 39, name: "First Year BE / BTech (Reg & SW)", startDate: "2026-08-24T00:00:00", lastDate: "2026-12-28T00:00:00", totalWorkingDays: 83, calendarYear: 2026, isPublished: true },
        { id: 44, name: "Final Year BE Sandwich", startDate: "2026-12-07T00:00:00", lastDate: "2027-03-30T00:00:00", totalWorkingDays: 75, calendarYear: 2026, isPublished: true },
        { id: 43, name: "First Year MCA", startDate: "2027-01-04T00:00:00", lastDate: "2027-05-07T00:00:00", totalWorkingDays: 82, calendarYear: 2026, isPublished: true },
        { id: 42, name: "First Year BE / BTech (Regular & SW)", startDate: "2027-02-08T00:00:00", lastDate: "2027-06-10T00:00:00", totalWorkingDays: 82, calendarYear: 2026, isPublished: true },
        { id: 41, name: "Second Year BE / BTech(Regular & SW)", startDate: "2027-01-04T00:00:00", lastDate: "2027-05-07T00:00:00", totalWorkingDays: 82, calendarYear: 2026, isPublished: true }
    ];

    // Strategy 1: Direct phone fetch from official PSG Tech academic calendar API (always fetches fresh so calendar updates reflect immediately!)
    try {
        let yearEntry = null;
        try {
            const idxRes = await fetch('https://academicschedule.psgtech.ac.in/api/calendar/2026', { cache: 'no-store' });
            if (idxRes.ok) {
                const rawCal = await idxRes.json();
                yearEntry = Array.isArray(rawCal) ? (rawCal[0] || {}) : rawCal;
            }
        } catch (e) {}

        if (!yearEntry || !Array.isArray(yearEntry.planner) || !yearEntry.planner.length) {
            yearEntry = { year: 2026, holidays: defaultHolidays, planner: defaultPlanners };
        }

        const latestYear = yearEntry.year || 2026;
        const planners = yearEntry.planner || defaultPlanners;
        const holidays = (yearEntry.holidays && yearEntry.holidays.length) ? yearEntry.holidays : defaultHolidays;

        const matchedPlanner = resolvePlannerForRoll(roll, planners, detectedSem);

        if (matchedPlanner && matchedPlanner.id) {
            const pRes = await fetch(`https://academicschedule.psgtech.ac.in/api/calendar/${latestYear}/planner/${matchedPlanner.id}`, { cache: 'no-store' });
            if (pRes.ok) {
                calData = await pRes.json();
                if (calData) {
                    calData.matchedPlanner = matchedPlanner;
                    if (!calData.calendar) calData.calendar = { year: latestYear, holidays: [] };
                    if (!calData.calendar.holidays || !calData.calendar.holidays.length) {
                        calData.calendar.holidays = holidays;
                    }
                    if (window.CALENDAR_TOKENS && typeof window.CALENDAR_TOKENS.normalizePlannerPayload === 'function') {
                        calData = window.CALENDAR_TOKENS.normalizePlannerPayload(calData, holidays);
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Direct phone calendar fetch failed, falling back to Vercel:', e);
    }

    // Strategy 2: Fallback to Vercel API endpoint if direct phone fetch fails
    if (!calData || !calData.activities) {
        try {
            const calUrl = detectedSem ? `/api/calendar/${roll}?sem=${detectedSem}` : `/api/calendar/${roll}`;
            const token = localStorage.getItem('bunker_session_token');
            const headers = {};
            if (token) headers['X-Session-Token'] = token;
            const calRes = await fetch(calUrl, { headers });
            if (calRes.ok) {
                calData = await calRes.json();
                if (calData && window.CALENDAR_TOKENS && typeof window.CALENDAR_TOKENS.normalizePlannerPayload === 'function') {
                    calData = window.CALENDAR_TOKENS.normalizePlannerPayload(calData, defaultHolidays);
                }
            }
        } catch (e) {
            console.warn('Vercel API calendar fallback failed:', e);
        }
    }

    // Strategy 3: Fallback to Vercel static JSON bundle
    if (!calData || !calData.activities) {
        try {
            const cacheRes = await fetch('/static/all_calendars_cache.json');
            if (cacheRes.ok) {
                const cdata = await cacheRes.json();
                if (cdata && typeof cdata === 'object') {
                    const targetPid = expectedPid || 33;
                    if (cdata[String(targetPid)]) {
                        calData = cdata[String(targetPid)];
                    } else {
                        const plannersList = Object.values(cdata);
                        const matched = resolvePlannerForRoll(roll, plannersList, detectedSem);
                        if (matched && cdata[String(matched.id)]) {
                            calData = cdata[String(matched.id)];
                        } else if (plannersList.length > 0) {
                            calData = plannersList[0];
                        }
                    }
                    if (calData && window.CALENDAR_TOKENS && typeof window.CALENDAR_TOKENS.normalizePlannerPayload === 'function') {
                        calData = window.CALENDAR_TOKENS.normalizePlannerPayload(calData, defaultHolidays);
                    }
                }
            }
        } catch (e) {
            console.warn('Static calendar cache fallback failed:', e);
        }
    }

    if (calData && !calData.error && (calData.activities || calData.name)) {
        processCalendarData(calData, roll);
        localStorage.setItem(`bunker_cal_time_v2_${roll}`, Date.now().toString());
        try {
            localStorage.setItem(vaultKey, JSON.stringify({
                data: calData,
                timestamp: Date.now()
            }));
        } catch (e) {}
        return calData;
    }
    return cachedFallbackData;
}

// Background silent timetable update on navigation (24-hour cooldown: 1 check per day max)
async function checkAndUpdateTimetableSilently(roll) {
    if (!roll) return;
    const creds = JSON.parse(localStorage.getItem('bunker_credentials') || '{}');
    if (!creds || !creds.roll || !creds.password) return;

    try {
        const sessionToken = localStorage.getItem('bunker_session_token') || '';
        const res = await fetch('/api/timetable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roll: creds.roll, password: creds.password, session_token: sessionToken })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.session_token) localStorage.setItem('bunker_session_token', data.session_token);
            if (data.success && data.timetable) {
                state.timetable = data.timetable;
                if (data.course_mapping) {
                    state.courseMapping = data.course_mapping;
                    localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
                }
                localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
                localStorage.setItem('bunker_cached_timetable', JSON.stringify(state.timetable));
                localStorage.setItem(`bunker_tt_sem_${roll}`, String(detectCurrentSemesterFromSubjects(state.subjects) || getDefaultSemesterForRoll(roll)));
                localStorage.setItem(`bunker_tt_time_${roll}`, Date.now().toString());
                initPlanner();
                const pill = document.getElementById('timetable-status-pill');
                if (pill) {
                    pill.textContent = 'Auto-Synced Today';
                    pill.className = 'text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                }
            }
        }
    } catch (e) {
        console.debug('Silent timetable check error:', e);
    }
}

async function refreshTimetableOnDemand(btn) {
    const creds = JSON.parse(localStorage.getItem('bunker_credentials') || '{}');
    if (!creds || !creds.roll || !creds.password) {
        showToast('Please log in again to refresh timetable', 'error');
        return;
    }

    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin text-[8px]"></i> Refreshing...';
    }

    try {
        showToast('Fetching fresh timetable from eCampus...', 'info');
        const sessionToken = localStorage.getItem('bunker_session_token') || '';
        const res = await fetch('/api/timetable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roll: creds.roll, password: creds.password, session_token: sessionToken })
        });
        const data = await res.json();
        if (data.session_token) localStorage.setItem('bunker_session_token', data.session_token);
        if (data.success && data.timetable) {
            state.timetable = data.timetable;
            if (data.course_mapping) {
                state.courseMapping = data.course_mapping;
                localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
            }
            localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
            localStorage.setItem('bunker_cached_timetable', JSON.stringify(state.timetable));
            localStorage.setItem(`bunker_tt_sem_${creds.roll}`, String(detectCurrentSemesterFromSubjects(state.subjects) || getDefaultSemesterForRoll(creds.roll)));
            localStorage.setItem(`bunker_tt_time_${creds.roll}`, Date.now().toString());

            initPlanner();

            const pill = document.getElementById('timetable-status-pill');
            if (pill) {
                pill.textContent = 'Updated Just Now';
                pill.className = 'text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            }
            showToast('Timetable refreshed successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to refresh timetable', 'error');
        }
    } catch (err) {
        showToast('Network error while refreshing timetable', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

function processCalendarData(data, roll) {
    const fullCalendar = [];
    const fallbackHolidays = (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026 && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026.holidays) || [];
    const holidaysList = (data.calendar && Array.isArray(data.calendar.holidays) && data.calendar.holidays.length > 0)
        ? data.calendar.holidays
        : fallbackHolidays;

    holidaysList.forEach(h => {
        if (h && h.date) {
            fullCalendar.push({ name: h.name, date: normalizePsgDateApp(h.date), type: 'Holiday' });
        }
    });

    if (data.activities) data.activities.forEach(a => {
        let type = 'Event';
        const n = (a.name || '').toLowerCase();
        const isMarkOrReview = n.includes('mark entry') || n.includes('feedback') || n.includes('attendance review');
        if (!isMarkOrReview && (n.includes('exam') || n.includes('test') || n.includes('assessment') || n.includes('ca 1') || n.includes('ca 2') || n.includes('ca 3') || n.includes('ca -'))) {
            type = 'Exam';
        } else if (n.includes('start') || n.includes('re-opening') || n.includes('reopening') || n.includes('commencement')) {
            type = 'Start';
        } else if (n.includes('last working')) {
            type = 'End';
        }
        fullCalendar.push({ name: a.name, date: normalizePsgDateApp(a.date), type });
    });

    ACADEMIC_DATA = {
        id: data.id || (data.matchedPlanner && data.matchedPlanner.id),
        name: data.name || (data.matchedPlanner && data.matchedPlanner.name),
        startDate: normalizePsgDateApp(data.startDate),
        lastDate: normalizePsgDateApp(data.lastDate),
        fullCalendar: fullCalendar
    };
    state.rollNumber = roll;
    state.calendarCache = ACADEMIC_DATA;
    localStorage.setItem('bunker_roll', roll);
    localStorage.setItem('bunker_calendar_cache', JSON.stringify(ACADEMIC_DATA));
    localStorage.setItem(`bunker_calendar_${roll}`, JSON.stringify(fullCalendar));
    if (state.subjects.length === 0) saveState();
}

function getStoredPreviousAttendance(roll) {
    const r = roll || state.rollNumber || localStorage.getItem('bunker_roll') || '';
    const keys = [
        r ? `bunker_previous_attendance_${r}` : null,
        r ? `bunker_current_attendance_${r}` : null,
        r ? `bunker_subjects_${r}` : null,
        'bunker_cached_subjects',
        'bunker_subjects',
        'bunker_attendance'
    ].filter(Boolean);

    for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch {}
    }
    if (Array.isArray(state.previousSubjects) && state.previousSubjects.length > 0) {
        return state.previousSubjects;
    }
    return null;
}

function persistHomeAttendanceSnapshot(roll, subjects, lastUpdate, prevSubjects = null, prevLastUpdate = null) {
    const r = roll || state.rollNumber || localStorage.getItem('bunker_roll') || '';
    if (!Array.isArray(subjects) || subjects.length === 0) return;

    const jsonStr = JSON.stringify(subjects);
    localStorage.setItem('bunker_subjects', jsonStr);
    localStorage.setItem('bunker_cached_subjects', jsonStr);
    localStorage.setItem('bunker_attendance', jsonStr);

    if (r) {
        localStorage.setItem(`bunker_subjects_${r}`, jsonStr);
        localStorage.setItem(`bunker_previous_attendance_${r}`, jsonStr);
        const effUpdate = (lastUpdate && lastUpdate !== 'No data')
            ? lastUpdate
            : (localStorage.getItem('bunker_last_update') && localStorage.getItem('bunker_last_update') !== 'No data'
                ? localStorage.getItem('bunker_last_update')
                : localStorage.getItem(`bunker_previous_update_${r}`));
        if (effUpdate && effUpdate !== 'No data') {
            localStorage.setItem(`bunker_previous_update_${r}`, effUpdate);
        }
        saveAttendanceSnapshot(r, subjects, effUpdate || lastUpdate, prevSubjects, prevLastUpdate);
    }
}

async function loadCachedAttendance() {
    const roll = state.rollNumber || localStorage.getItem('bunker_roll') || (() => {
        try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}').roll; } catch { return null; }
    })();

    if (!roll) {
        showToast('No user session found', 'error');
        return;
    }
    state.rollNumber = roll;

    let cached = getStoredPreviousAttendance(roll);

    // If not found in local cache, attempt to fetch from server
    if (!cached || cached.length === 0) {
        try {
            showToast('Checking server for saved attendance...');
            const savedCreds = (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}'); } catch { return {}; } })();
            const res = await fetch('/api/previous-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: roll,
                    password: savedCreds.password,
                    college: state.college
                })
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.subjects) && data.subjects.length > 0) {
                cached = data.subjects;
                localStorage.setItem(`bunker_previous_attendance_${roll}`, JSON.stringify(cached));
                if (data.last_update) {
                    localStorage.setItem(`bunker_previous_update_${roll}`, data.last_update);
                }
                if (data.timetable && (!state.timetable || Object.keys(state.timetable).length === 0)) {
                    state.timetable = data.timetable;
                    localStorage.setItem('bunker_timetable', JSON.stringify(data.timetable));
                }
                if (data.course_mapping && (!state.courseMapping || Object.keys(state.courseMapping).length === 0)) {
                    state.courseMapping = data.course_mapping;
                    localStorage.setItem('bunker_course_mapping', JSON.stringify(data.course_mapping));
                }
            }
        } catch (e) {
            console.warn('Could not fetch previous attendance from server:', e);
        }
    }

    if (!cached || cached.length === 0) {
        showToast('No previous attendance found to load', 'error');
        return;
    }

    try {
        state.subjects = cached;
        state.isViewingPreviousAttendance = true;
        state.forceLivePendingView = false;

        const tt = localStorage.getItem('bunker_timetable');
        if (tt) state.timetable = JSON.parse(tt);
        const cm = localStorage.getItem('bunker_course_mapping');
        if (cm) state.courseMapping = JSON.parse(cm);
        state.college = localStorage.getItem('bunker_college') || state.college || 'PSGTECH';
        state.hasCalendar = localStorage.getItem('bunker_has_calendar') !== 'false';

        initDashboard();
        showToast(`Loaded previous attendance (${cached.length} courses)`);
    } catch (e) {
        console.error('Failed to load cache:', e);
        showToast('Failed to load cache', 'error');
    }
}
window.loadCachedAttendance = loadCachedAttendance;

function returnToLiveStatus() {
    state.isViewingPreviousAttendance = false;
    state.forceLivePendingView = true;
    state.subjects = [];
    initDashboard();
    showToast('Returned to live attendance status');
}
window.returnToLiveStatus = returnToLiveStatus;

function loadDemo() {
    showLoadingScreen("DEMO");
    pushLoadingLog("Initializing sandbox playground environment...", 15, '#818cf8');
    
    setTimeout(() => {
        pushLoadingLog("Simulating PSG Tech mock databases...", 45, '#a855f7');
        state.rollNumber = "DEMO";
        const today = new Date();
        ACADEMIC_DATA = {
            name: "Demo Semester",
            startDate: new Date(today.getFullYear(), 0, 1).toISOString(),
            lastDate: new Date(today.getFullYear(), 5, 30).toISOString(),
            fullCalendar: [
                { name: "Pongal", date: new Date(today.getFullYear(), 0, 14).toISOString(), type: 'Holiday' },
                { name: "Republic Day", date: new Date(today.getFullYear(), 0, 26).toISOString(), type: 'Holiday' },
                { name: "Independence Day", date: new Date(today.getFullYear(), 7, 15).toISOString(), type: 'Holiday' },
                { name: "Diwali", date: new Date(today.getFullYear(), 9, 20).toISOString(), type: 'Holiday' },
                { name: "Christmas", date: new Date(today.getFullYear(), 11, 25).toISOString(), type: 'Holiday' },
                { name: "Next Pongal", date: new Date(today.getFullYear() + 1, 0, 14).toISOString(), type: 'Holiday' },
                { name: "Demo Exam", date: new Date(today.getTime() + 86400000 * 10).toISOString(), type: 'Exam' }
            ]
        };
        state.subjects = [
            { code: "CS201", name: "Data Structures", attended: 28, total: 32 },
            { code: "MA203", name: "Applied Math III", attended: 18, total: 24 },
            { code: "CS205", name: "Computer Arch", attended: 15, total: 26 },
            { code: "HU201", name: "Economics", attended: 22, total: 22 },
            { code: "CS208", name: "Digital Logic", attended: 20, total: 28 }
        ];
        state.timetable = {
            "Mon": ["CS201", "CS205", "Free", "MA203"], "Tue": ["CS208", "CS201", "CS201", "HU201"],
            "Wed": ["CS205", "Free", "MA203", "CS208"], "Thu": ["MA203", "HU201", "CS205", "Free"], "Fri": ["CS208", "CS201", "CS205", "MA203"]
        };
        state.academics = {
            loaded: true,
            fromCache: true,
            internals: [
                {
                    course_code: "21CS401",
                    course_name: "Theory of Computation",
                    is_lab: false,
                    row_data: ["21.0", "19.0", "*", "20.0", "7.0", "9.0", "8.0", "35.0", "28.0"],
                    total: "35.0",
                    total_converted: "28.0",
                    target_max: 40
                },
                {
                    course_code: "21CS402",
                    course_name: "Database Management Systems",
                    is_lab: false,
                    row_data: ["16.0", "18.0", "*", "17.0", "6.0", "7.0", "6.5", "29.5", "23.6"],
                    total: "29.5",
                    total_converted: "23.6",
                    target_max: 40
                },
                {
                    course_code: "21CS403",
                    course_name: "Design & Analysis of Algorithms",
                    is_lab: false,
                    row_data: ["13.0", "15.0", "*", "14.0", "5.0", "6.0", "5.5", "24.5", "19.6"],
                    total: "24.5",
                    total_converted: "19.6",
                    target_max: 40
                },
                {
                    course_code: "21CS404",
                    course_name: "Computer Networks",
                    is_lab: false,
                    row_data: ["11.0", "13.0", "*", "12.0", "4.0", "5.0", "4.5", "20.5", "16.4"],
                    total: "20.5",
                    total_converted: "16.4",
                    target_max: 40
                },
                {
                    course_code: "21CS405",
                    course_name: "Operating Systems",
                    is_lab: false,
                    row_data: ["8.0", "11.0", "*", "9.5", "4.0", "4.0", "4.0", "17.5", "14.0"],
                    total: "17.5",
                    total_converted: "14.0",
                    target_max: 40
                }
            ],
            cgpa: {
                cgpa: "8.24",
                semwise_data: [
                    { sem: 1, sgpa: "8.40" },
                    { sem: 2, sgpa: "8.15" },
                    { sem: 3, sgpa: "8.30" },
                    { sem: 4, sgpa: "8.10" }
                ]
            },
            gpa: {
                gpa: "8.24",
                overall_cgpa: "8.24"
            }
        };
        saveState();
        
        pushLoadingLog("Injecting fake high-marks subjects...", 75, '#3b82f6');
        
        setTimeout(() => {
            pushLoadingLog("Demo loaded successfully. Entering Bunker!", 100, '#10b981');
            setTimeout(() => {
                dismissLoadingScreen();
                enterApp();
            }, 600);
        }, 400);
    }, 600);
}

// PWA UI Logic
function getDeviceName() {
    const ua = navigator.userAgent;
    // Check specific brands first
    if (/Nothing Phone/i.test(ua)) return 'Nothing Phone';
    if (/OnePlus/i.test(ua)) return 'OnePlus';
    if (/Realme|RMX/i.test(ua)) return 'Realme';
    if (/Oppo/i.test(ua)) return 'Oppo';
    if (/Vivo/i.test(ua)) return 'Vivo';
    if (/iQOO/i.test(ua)) return 'iQOO';
    if (/POCO/i.test(ua)) return 'POCO';

    // Redmi/Xiaomi Detection
    // Standard:
    if (/Redmi|HM|Note/i.test(ua) && /Xiaomi|Mi|Redmi/i.test(ua)) return 'Redmi';
    if (/Redmi/i.test(ua)) return 'Redmi';
    if (/Xiaomi|Mi |Mi-/i.test(ua)) return 'Xiaomi';

    // Specific Heuristic for User's Redmi Note 8 (Privacy UA: "Android 10; k")
    // This handles the case where manufacturer info is stripped
    if (/Android 10;\s*k\)/i.test(ua)) return 'Redmi';

    if (/Motorola|Moto/i.test(ua)) return 'Motorola';
    if (/Samsung|SM-|GT-/i.test(ua)) return 'Samsung';
    if (/Pixel/i.test(ua)) return 'Pixel';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    return 'Device';
}

function updateInstallUI() {
    if (!window.pwaManager) return;
    const isInstalled = window.pwaManager.isStandalone || window.pwaManager.isAppInstalled;
    const isIOS = window.pwaManager.isIOS;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const canInstall = !!window.pwaManager.deferredPrompt;
    const prompt = document.getElementById('login-install-prompt');
    const settingBtn = document.getElementById('settings-install-btn');
    const installText = document.getElementById('install-text');
    const uCard = document.getElementById('universal-install-card');
    const uTitle = document.getElementById('universal-install-title');
    const uBadge = document.getElementById('universal-install-badge');
    const uSub = document.getElementById('universal-install-sub');
    const uActionIcon = document.getElementById('universal-install-action-icon');

    // Update Universal PWA Card in Settings / Others
    if (uCard) {
        if (isInstalled) {
            if (uTitle) uTitle.textContent = 'Bunker Installed';
            if (uBadge) {
                uBadge.textContent = 'INSTALLED';
                uBadge.className = 'text-[8px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-widest';
            }
            if (uSub) uSub.textContent = 'Running natively on your phone';
            if (uActionIcon) uActionIcon.innerHTML = '<i class="fas fa-check text-emerald-400 text-xs"></i>';
        } else {
            if (isIOS) {
                if (uTitle) uTitle.textContent = 'Add to Home Screen';
                if (uBadge) {
                    uBadge.textContent = 'iOS PWA';
                    uBadge.className = 'text-[8px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-widest';
                }
                if (uSub) uSub.textContent = 'Tap Share & Add to Home Screen in Safari';
            } else {
                if (uTitle) uTitle.textContent = 'Install Bunker App';
                if (uBadge) {
                    uBadge.textContent = 'PWA';
                    uBadge.className = 'text-[8px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-widest';
                }
                if (uSub) uSub.textContent = 'Instant 1-Tap install \u2022 0ms Offline Access';
            }
            if (uActionIcon) uActionIcon.innerHTML = '<i class="fas fa-arrow-down-to-bracket text-xs"></i>';
        }
    }

    // Personalize Text on Login Screen
    if (installText) {
        if (isIOS) {
            installText.textContent = 'Install on iPhone';
        } else {
            installText.textContent = 'Install Bunker App';
        }
    }

    // Login Page Prompt
    if (prompt) {
        if (isInstalled) {
            prompt.classList.add('hidden');
            prompt.style.display = 'none';
        } else {
            prompt.classList.remove('hidden');
            prompt.style.display = 'flex';
        }
    }

    // Legacy Settings Button (kept hidden since universal card is used)
    if (settingBtn) {
        settingBtn.classList.add('hidden');
    }
}

function triggerInstall() {
    const isIOS = window.pwaManager.isIOS;
    const isInstalled = window.pwaManager.isStandalone || window.pwaManager.isAppInstalled;

    if (isInstalled) {
        showToast('PSG Bunker is already installed on your home screen!', 'success');
        return;
    }

    if (isIOS) {
        const existing = document.getElementById('bunker-pwa-install-sheet');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'bunker-pwa-install-sheet';
        modal.className = "fixed inset-0 z-[95] flex items-end justify-center bg-black/75 backdrop-blur-md p-4";
        modal.style.cssText = 'animation: fadeIn 0.22s ease';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
            <div style="background:linear-gradient(155deg,#17152b 0%,#0c0a18 100%)" class="w-full max-w-sm rounded-[2rem] overflow-hidden border border-indigo-500/30 shadow-2xl">
                <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#06b6d4 100%)" class="p-5 text-center relative overflow-hidden">
                    <img src="/static/apple-touch-icon.png" class="w-16 h-16 rounded-[1.15rem] mx-auto mb-2.5 shadow-xl border-2 border-white/25 relative z-10">
                    <h3 class="text-base font-black text-white relative z-10">Install PSG Bunker on iPhone</h3>
                    <p class="text-indigo-100 text-[11px] mt-0.5 relative z-10 font-semibold">Full-screen iOS app with instant offline access</p>
                </div>

                <div class="p-5 space-y-3.5">
                    <div class="flex items-start gap-3.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                        <div class="w-7 h-7 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center shrink-0">
                            <span class="text-indigo-300 font-black text-xs">1</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-xs">Tap <i class="fas fa-arrow-up-from-bracket text-sky-400 mx-0.5"></i> Share in Safari</p>
                            <p class="text-gray-400 text-[10.5px] mt-0.5">Tap the Share button on the bottom bar of Safari.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                        <div class="w-7 h-7 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center shrink-0">
                            <span class="text-indigo-300 font-black text-xs">2</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-xs">Tap "Add to Home Screen" <i class="fas fa-plus-square text-emerald-400 ml-0.5"></i></p>
                            <p class="text-gray-400 text-[10.5px] mt-0.5">Scroll down the share sheet and tap <span class="text-white font-bold">Add to Home Screen</span>, then tap <span class="text-white font-bold">Add</span>.</p>
                        </div>
                    </div>

                    <button type="button" onclick="this.closest('#bunker-pwa-install-sheet').remove()" class="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition">
                        Got It
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return;
    }

    // Android & Chromium 1-Tap PWA Install
    if (window.pwaManager.deferredPrompt) {
        triggerPwaInstall();
    } else {
        const ua = navigator.userAgent || '';
        const isSamsung = /SamsungBrowser/i.test(ua);
        const existing = document.getElementById('bunker-pwa-install-sheet');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'bunker-pwa-install-sheet';
        modal.className = "fixed inset-0 z-[95] flex items-end justify-center bg-black/75 backdrop-blur-md p-4";
        modal.style.cssText = 'animation: fadeIn 0.22s ease';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
            <div style="background:linear-gradient(155deg,#17152b 0%,#0c0a18 100%)" class="w-full max-w-sm rounded-[2rem] overflow-hidden border border-indigo-500/30 shadow-2xl">
                <div style="background:linear-gradient(135deg,#4338ca 0%,#7c3aed 55%,#06b6d4 100%)" class="p-5 text-center relative overflow-hidden">
                    <img src="/static/icon-192.png" class="w-16 h-16 rounded-[1.15rem] mx-auto mb-2.5 shadow-xl border-2 border-white/25 relative z-10">
                    <h3 class="text-base font-black text-white relative z-10">Install PSG Bunker App</h3>
                    <p class="text-indigo-100 text-[11px] mt-0.5 relative z-10 font-semibold">Works on all Android phones • 0ms offline launch</p>
                </div>

                <div class="p-5 space-y-3.5">
                    <div class="flex items-start gap-3.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                        <div class="w-7 h-7 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center shrink-0">
                            <span class="text-indigo-300 font-black text-xs">1</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-xs">Tap Browser Menu (${isSamsung ? '<i class="fas fa-bars text-indigo-400"></i>' : '<i class="fas fa-ellipsis-vertical text-indigo-400"></i>'})</p>
                            <p class="text-gray-400 text-[10.5px] mt-0.5">${isSamsung ? 'Tap the menu icon at the bottom right of Samsung Internet.' : 'Tap the 3-dots menu at the top right of your Android browser.'}</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/10">
                        <div class="w-7 h-7 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center shrink-0">
                            <span class="text-indigo-300 font-black text-xs">2</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-xs">${isSamsung ? 'Tap "Add page to" → "Home screen"' : 'Tap "Install app" or "Add to Home screen"'}</p>
                            <p class="text-gray-400 text-[10.5px] mt-0.5">Confirm to add PSG Bunker directly to your Android app drawer.</p>
                        </div>
                    </div>

                    <button type="button" onclick="triggerPwaInstall(); this.closest('#bunker-pwa-install-sheet').remove();" class="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                        <i class="fas fa-download text-xs"></i>
                        <span>Install App Now</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Backwards compatibility alias
function downloadAndroidApk() {
    triggerInstall();
}

// --- FIRST-TIME LOGIN FEATURES TOUR & ANDROID PROMPT (REMOVED) ---

function checkFirstLoginFeaturesModal() {
    const existing = document.getElementById('bunker-features-tour-modal');
    if (existing) existing.remove();

    // One-time "Bunker Updated" popup for all users
    try {
        const seenOnce = localStorage.getItem('bunker_update_once_popup_v1');
        if (!seenOnce) {
            const modal = document.getElementById('bunker-update-once-modal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }
    } catch (e) {}
}

function closeBunkerUpdatePopup() {
    try {
        localStorage.setItem('bunker_update_once_popup_v1', '1');
    } catch (e) {}
    const modal = document.getElementById('bunker-update-once-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function submitBunkerDirectFeedback(event, source) {
    if (event) event.preventDefault();
    const inputId = source === 'popup' ? 'bunker-popup-feedback-input' : 'bunker-settings-feedback-input';
    const btnId = source === 'popup' ? 'bunker-popup-feedback-btn' : 'bunker-settings-feedback-btn';
    const inputEl = document.getElementById(inputId);
    const btnEl = document.getElementById(btnId);
    if (!inputEl) return;

    const message = (inputEl.value || '').trim();
    if (!message) {
        if (typeof showToast === 'function') showToast('Please enter your message', 'warning');
        return;
    }

    // Auto-fill roll number
    let rollNo = (state && state.rollNumber) || localStorage.getItem('bunker_roll') || '';
    if (!rollNo) {
        try {
            const creds = JSON.parse(localStorage.getItem('bunker_credentials') || '{}');
            if (creds && creds.roll) rollNo = creds.roll;
        } catch (e) {}
    }
    if (!rollNo) rollNo = 'GUEST';

    const originalHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xs"></i>';
    }

    const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdcGqD1YidrjizaktAvcdWmxHs1Pv2hNwdeIRdbKWHRf7yHsA/formResponse';

    // 1. Populate and submit the exact Google Form DOM (#mG61Hd) into hidden iframe
    try {
        const gform = document.getElementById('mG61Hd');
        const rollField = document.getElementById('gform-entry-roll');
        const textField = document.getElementById('gform-entry-text');
        const tsField = document.getElementById('gform-submission-ts');
        if (rollField) rollField.value = rollNo;
        if (textField) textField.value = message;
        if (tsField) tsField.value = String(Date.now());
        if (gform) gform.submit();
    } catch (e) {}

    // 2. Also send via fetch no-cors with URLSearchParams to guarantee delivery
    try {
        const params = new URLSearchParams();
        params.append('entry.2005620554', rollNo);
        params.append('entry.1045781291', message);
        params.append('fvv', '1');
        params.append('partialResponse', '[null,null,"-2967055624982682554"]');
        params.append('pageHistory', '0');
        params.append('fbzx', '-2967055624982682554');
        params.append('submissionTimestamp', String(Date.now()));
        fetch(formUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        }).catch(() => {});

        // Safeguard in case entry.1045781291 has Google Forms email validation active
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message)) {
            const fallbackParams = new URLSearchParams();
            fallbackParams.append('entry.2005620554', `${rollNo} | ${message}`);
            fallbackParams.append('entry.1045781291', '');
            fallbackParams.append('fvv', '1');
            fallbackParams.append('partialResponse', '[null,null,"-2967055624982682554"]');
            fallbackParams.append('pageHistory', '0');
            fallbackParams.append('fbzx', '-2967055624982682554');
            fallbackParams.append('submissionTimestamp', String(Date.now()));
            fetch(formUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: fallbackParams.toString()
            }).catch(() => {});
        }
    } catch (e) {}

    setTimeout(() => {
        inputEl.value = '';
        if (btnEl) {
            btnEl.innerHTML = '<i class="fas fa-check text-emerald-300 text-xs"></i>';
            setTimeout(() => {
                btnEl.disabled = false;
                btnEl.innerHTML = originalHtml;
            }, 1200);
        }
        if (typeof showToast === 'function') {
            showToast('Feedback sent to Bunker!', 'success');
        }
        if (source === 'popup') {
            setTimeout(() => closeBunkerUpdatePopup(), 600);
        }
    }, 350);
}

function checkAndroidApkPrompt() {}

function showFeaturesTourModal() {
    const existing = document.getElementById('bunker-features-tour-modal');
    if (existing) existing.remove();
}

function closeFeaturesTourModal() {
    const modal = document.getElementById('bunker-features-tour-modal');
    if (modal) modal.remove();
}

function handleTourApkDownload() {
    triggerInstall();
}

function showAndroidApkModal() {}
function closeAndroidApkModal() {}
function handleDownloadAndCloseModal() {
    triggerInstall();
}

function triggerPwaInstall() {
    if (window.pwaManager.deferredPrompt) {
        window.pwaManager.deferredPrompt.prompt();
        window.pwaManager.deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
                showInstallationGuidance();
            }
            window.pwaManager.deferredPrompt = null;
            updateInstallUI();
        });
    } else {
        if (window.pwaManager.isStandalone || window.pwaManager.isAppInstalled) {
            showToast('App already installed! Check your home screen or apps', 'success');
        } else if (location.protocol === 'http:' && location.hostname !== 'localhost') {
            showToast('Install requires HTTPS. Deploy to production first!', 'error');
        } else {
            showToast('Install via browser menu (⋮ → Install app)', 'info');
        }
    }
}

function showInstallationGuidance() {
    // Create beautiful installation guidance toast
    const toast = document.createElement('div');
    toast.className = "fixed top-4 left-1/2 -translate-x-1/2 z-[999] max-w-[90%] sm:max-w-md px-4";
    toast.id = 'install-guidance-toast';
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -30px)';

    toast.innerHTML = `
        <div class="relative bg-[#0a0a0a]/98 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/5 flex items-center gap-3.5">
            <!-- Icon -->
            <div class="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-indigo-500/20">
                <i class="fas fa-download text-indigo-400 text-sm" style="animation: floatIcon 3s ease-in-out infinite"></i>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
                <h4 class="text-white font-medium text-[13px] leading-tight mb-0.5">Installing Bunker...</h4>
                <p class="text-gray-400 text-[11px] leading-tight truncate">Check notification bar for progress</p>
            </div>
            
            <!-- Close -->
            <button onclick="dismissInstallToast()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Smooth entrance with bounce easing
    requestAnimationFrame(() => {
        toast.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, 0)';
    });

    // Auto-dismiss after 8 seconds
    setTimeout(() => dismissInstallToast(), 8000);
}

function dismissInstallToast() {
    const toast = document.getElementById('install-guidance-toast');
    if (toast) {
        toast.style.transition = 'all 0.3s ease-out';
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => toast.remove(), 300);
    }
}

// Debug function removed for production

function showPrivacyPolicy() {
    if (typeof LEGAL_TEXT === 'undefined') return;

    // Prevent duplicate modals
    if (document.getElementById('legal-modal')) return;

    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 fade-in-up";
    modal.onclick = (e) => { if (e.target === modal) closeLegal(); };
    modal.id = 'legal-modal';

    modal.innerHTML = `
        <div class="bg-[#121212] w-full max-w-lg sm:rounded-[2rem] rounded-t-[2rem] h-[85vh] sm:h-[80vh] flex flex-col relative overflow-hidden shadow-2xl border border-white/10">
            <!-- Header -->
            <div class="p-6 border-b border-white/5 flex justify-between items-center bg-[#18181b]">
                <h3 class="text-lg font-bold text-white">Legal & Privacy</h3>
                <button onclick="closeLegal()" class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Content -->
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1 pb-20">
                ${LEGAL_TEXT}
            </div>

            <!-- Bottom Fade -->
            <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#121212] to-transparent pointer-events-none"></div>
        </div>
    `;
    document.body.appendChild(modal);
    // Disable body scroll
    document.body.style.overflow = 'hidden';

    // Add Esc key support
    const handleEscape = (e) => {
        if (e.key === 'Escape') closeLegal();
    };
    document.addEventListener('keydown', handleEscape);
    modal.dataset.escListener = 'true';
}

function closeLegal() {
    const m = document.getElementById('legal-modal');
    if (m) {
        // Remove Esc listener if it exists
        if (m.dataset.escListener) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') closeLegal();
            };
            document.removeEventListener('keydown', handleEscape);
        }

        m.classList.remove('fade-in-up');
        m.classList.add('fade-out-down');
        setTimeout(() => m.remove(), 200);

        // Restore scroll only if modal exists
        document.body.style.overflow = '';
    }
}

function showAcademicRegulations() {
    if (document.getElementById('regulations-modal')) return;

    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 fade-in-up";
    modal.onclick = (e) => { if (e.target === modal) closeAcademicRegulations(); };
    modal.id = 'regulations-modal';

    modal.innerHTML = `
        <div class="bg-[#121212] w-full max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] h-[85vh] sm:h-[80vh] flex flex-col relative overflow-hidden shadow-2xl border border-white/10">
            <!-- Header -->
            <div class="p-6 border-b border-white/5 flex justify-between items-center bg-[#18181b]">
                <div class="flex items-center gap-3">
                    <span class="text-xl">🎓</span>
                    <div>
                        <h3 class="text-md font-bold text-white leading-tight">Academic Regulations</h3>
                        <p class="text-[9px] text-gray-400 mt-0.5">PSG College of Technology Rules</p>
                    </div>
                </div>
                <button onclick="closeAcademicRegulations()" class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Content -->
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1 pb-24">
                <!-- Navigation Tabs -->
                <div class="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                    <button onclick="switchRegTab('attendance')" id="reg-tab-attendance" class="reg-tab-btn flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition bg-indigo-600 text-white shadow-lg">Attendance &amp; Redo</button>
                    <button onclick="switchRegTab('grades')" id="reg-tab-grades" class="reg-tab-btn flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition bg-white/5 text-gray-400 border border-white/5">Grades &amp; Degree</button>
                    <button onclick="switchRegTab('honours')" id="reg-tab-honours" class="reg-tab-btn flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition bg-white/5 text-gray-400 border border-white/5">Honours &amp; Minors</button>
                    <button onclick="switchRegTab('credits')" id="reg-tab-credits" class="reg-tab-btn flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition bg-white/5 text-gray-400 border border-white/5">Degree Credits</button>
                </div>

                <!-- Section: Attendance -->
                <div id="reg-sec-attendance" class="reg-content-sec space-y-4">
                    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex gap-3 items-start">
                        <div class="text-indigo-400 mt-0.5"><i class="fas fa-check-circle"></i></div>
                        <div>
                            <h4 class="text-xs font-bold text-indigo-300">General Attendance Policy</h4>
                            <p class="text-[10px] text-gray-400 mt-1 leading-relaxed">Students must secure a minimum of <strong>75% attendance</strong> in each course to qualify for writing the Semester End Examination.</p>
                        </div>
                    </div>
                    
                    <div class="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start">
                        <div class="text-amber-400 mt-0.5"><i class="fas fa-notes-medical"></i></div>
                        <div>
                            <h4 class="text-xs font-bold text-amber-300">Exemption Conditions (65% - 75%)</h4>
                            <p class="text-[10px] text-gray-400 mt-1 leading-relaxed">Exemption down to <strong>65%</strong> is permitted only for medical reasons (hospitalization, accident, specific illness) or representing the College/University in Sports events (requires prior HOD and Principal approval).</p>
                        </div>
                    </div>
                    
                    <div class="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start">
                        <div class="text-rose-400 mt-0.5"><i class="fas fa-exclamation-triangle"></i></div>
                        <div>
                            <h4 class="text-xs font-bold text-rose-300">Redo Policy &amp; Prevention (&lt; 65%)</h4>
                            <p class="text-[10px] text-gray-400 mt-1 leading-relaxed">Students securing below 65% (or 75% without valid exemption) will be prevented from writing examinations. The student must register and <strong>redo the course</strong> in a subsequent semester when it is offered next.</p>
                        </div>
                    </div>
                    
                    <div class="bg-red-500/15 border border-red-500/30 rounded-2xl p-4 flex gap-3 items-start">
                        <div class="text-red-400 mt-0.5"><i class="fas fa-ban"></i></div>
                        <div>
                            <h4 class="text-xs font-bold text-red-300">Critical Detainment Limit</h4>
                            <p class="text-[10px] text-gray-400 mt-1 leading-relaxed font-bold">If a student has MORE THAN TWO "Redo" courses (except mandatory non-credit courses) outstanding at the end of any semester, they are NOT eligible to register for the next semester's classes until the backlogs are cleared.</p>
                        </div>
                    </div>
                </div>

                <!-- Section: Grades & Classification -->
                <div id="reg-sec-grades" class="reg-content-sec space-y-4 hidden">
                    <div class="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <h4 class="text-xs font-bold text-white mb-2 uppercase tracking-wider">2023 Regulation Grading &amp; Passing Minimum</h4>
                        <p class="text-[10px] text-gray-400 leading-relaxed mb-2">Under PSG Tech 2023 Regulations (Section 8), Theory courses carry <strong>40% CA + 60% Final Exam (FE)</strong>, and Laboratory courses carry <strong>60% CA + 40% FE</strong>. Passing requires <strong>at least 45% in the Final Exam (50% for Lab)</strong> AND <strong>not less than 50% combined total</strong>.</p>
                        <div class="grid grid-cols-4 gap-1.5 text-center text-[9.5px] font-bold pt-1">
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-amber-400 block font-black">O (10)</span>91–100</div>
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-purple-400 block font-black">A+ (9)</span>81–90</div>
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-indigo-400 block font-black">A (8)</span>71–80</div>
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-emerald-400 block font-black">B+ (7)</span>66–70</div>
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-teal-400 block font-black">B (6.5)</span>61–65</div>
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-sky-400 block font-black">C+ (6)</span>56–60</div>
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-cyan-400 block font-black">C (5)</span>50–55</div>
                            <div class="p-1.5 rounded-lg bg-black/40 border border-white/5"><span class="text-rose-400 block font-black">RA (0)</span>&lt; 50</div>
                        </div>
                    </div>
                    
                    <div class="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-3">
                        <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Degree Classification Rules (Section 10)</h4>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">First Class with Distinction</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 8.50 | Passed all courses in first attempt | Within normal duration (4 yrs / 5 yrs Sandwich / 3 yrs Lateral)</span>
                            </div>
                            <span class="text-[9px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">Distinction</span>
                        </div>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">First Class</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 6.50 | Completed within 5 years (6 yrs Sandwich / 4 yrs Lateral)</span>
                            </div>
                            <span class="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 whitespace-nowrap">First Class</span>
                        </div>
                        
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="text-xs font-bold text-white block">Second Class</span>
                                <span class="text-[9px] text-gray-500">All other students who qualify for the degree</span>
                            </div>
                            <span class="text-[9px] font-black bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded border border-gray-500/20 whitespace-nowrap">Second Class</span>
                        </div>
                    </div>
                </div>

                <!-- Section: Honours & Minors -->
                <div id="reg-sec-honours" class="reg-content-sec space-y-4 hidden">
                    <div class="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <h4 class="text-xs font-bold text-white mb-2 uppercase tracking-wider">Honours &amp; Minors (Extra &ge; 18 Credits)</h4>
                        <p class="text-[10px] text-gray-400 leading-relaxed mb-3">Students can opt to earn a B.E./B.Tech. Honours or a Minor in another discipline by earning an additional minimum of 18 credits from the 5th semester onwards.</p>
                        
                        <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex gap-2.5 items-start">
                            <i class="fas fa-info-circle text-indigo-400 text-xs mt-0.5"></i>
                            <div>
                                <span class="text-[10px] font-bold text-indigo-300 block">Honours &amp; Minor Requirements (Section 6 &amp; 10)</span>
                                <p class="text-[9px] text-gray-400 mt-0.5 leading-normal">Must pass all courses in the first attempt. B.E./B.Tech. Honours requires CGPA &ge; 7.50 (First Class) or CGPA &ge; 8.50 (Distinction).</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-3">
                        <h4 class="text-xs font-bold text-purple-400 uppercase tracking-wider">Degree Awards for Honours &amp; Minors</h4>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">Honours / Minor with Distinction</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 8.50 in the first attempt (+18 credits)</span>
                            </div>
                            <span class="text-[9px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">Distinction</span>
                        </div>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">Honours (First Class)</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 7.50 in the first attempt (+18 credits)</span>
                            </div>
                            <span class="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">First Class</span>
                        </div>

                        <div class="flex justify-between items-start">
                            <div>
                                <span class="text-xs font-bold text-white block">Minor (First Class)</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 6.50 within allowed duration (+18 credits)</span>
                            </div>
                            <span class="text-[9px] font-black bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded border border-gray-500/20">Qualifying</span>
                        </div>
                    </div>
                </div>

                <!-- Section: Degree Credits -->
                <div id="reg-sec-credits" class="reg-content-sec space-y-4 hidden">
                    <div class="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <h4 class="text-xs font-bold text-white mb-1 uppercase tracking-wider">Degree Credits Requirements</h4>
                        <p class="text-[10px] text-gray-400 leading-relaxed mb-3">To qualify for a B.E./B.Tech degree, you must earn the minimum credits defined by your admission entry type.</p>
                        
                        <div class="grid grid-cols-2 gap-3 mb-2">
                            <div class="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                                <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">First Semester Entry</span>
                                <span class="text-2xl font-black text-white">166</span>
                                <span class="text-[9px] text-gray-400 block mt-0.5 font-medium">Credits Minimum</span>
                            </div>
                            <div class="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                                <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Lateral Entry (3rd Sem)</span>
                                <span class="text-2xl font-black text-purple-400">120 - 128</span>
                                <span class="text-[9px] text-gray-400 block mt-0.5 font-medium">Credits (Branch Dependent)</span>
                            </div>
                        </div>
                    </div>
                    
                    <details class="group bg-black/25 rounded-2xl border border-white/5">
                        <summary class="flex justify-between items-center p-4 text-[10px] text-gray-300 font-bold uppercase tracking-widest cursor-pointer list-none select-none">
                            <span>Branch-wise Credits (Lateral Entry)</span>
                            <i class="fas fa-chevron-down text-[8px] transition-transform duration-300 group-open:rotate-180"></i>
                        </summary>
                        <div class="p-4 pt-0 text-[10px] space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar border-t border-white/5 mt-2">
                            <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Civil Engineering</span><span class="text-white font-bold">128</span></div>
                            <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Mechanical Engineering</span><span class="text-white font-bold">127</span></div>
                            <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Biotechnology / Instrumentation</span><span class="text-white font-bold">127 / 126</span></div>
                            <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Automobile / CSE (AI&ML) / Production</span><span class="text-white font-bold">125</span></div>
                            <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Computer Science / Metallurgy</span><span class="text-white font-bold">124</span></div>
                            <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Electrical & Electronics (EEE) / Robotics</span><span class="text-white font-bold">123</span></div>
                            <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Biomedical / IT / Textile</span><span class="text-white font-bold">122</span></div>
                            <div class="flex justify-between"><span class="text-gray-400">Electronics & Communication (ECE)</span><span class="text-white font-bold">120</span></div>
                        </div>
                    </details>
                </div>
            </div>

            <!-- Bottom Fade -->
            <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#121212] to-transparent pointer-events-none"></div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const handleEscape = (e) => {
        if (e.key === 'Escape') closeAcademicRegulations();
    };
    document.addEventListener('keydown', handleEscape);
    modal._escHandler = handleEscape;
}

function closeAcademicRegulations() {
    const m = document.getElementById('regulations-modal');
    if (m) {
        if (m._escHandler) {
            document.removeEventListener('keydown', m._escHandler);
        }

        m.classList.remove('fade-in-up');
        m.classList.add('fade-out-down');
        setTimeout(() => m.remove(), 200);

        document.body.style.overflow = '';
    }
}

function switchRegTab(tabId) {
    // Hide all sections
    document.querySelectorAll('.reg-content-sec').forEach(sec => sec.classList.add('hidden'));
    
    // Show chosen section
    const activeSec = document.getElementById(`reg-sec-${tabId}`);
    if (activeSec) activeSec.classList.remove('hidden');

    // Reset tab button states
    document.querySelectorAll('.reg-tab-btn').forEach(btn => {
        btn.className = "reg-tab-btn flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition bg-white/5 text-gray-400 border border-white/5";
    });

    // Highlight active button
    const activeBtn = document.getElementById(`reg-tab-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "reg-tab-btn flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition bg-indigo-600 text-white shadow-lg";
    }
}

function enterApp() {
    // Re-load manual data for the correct user BEFORE cleanup
    const roll = state.rollNumber;
    if (roll) {
        state.manual = JSON.parse(localStorage.getItem(`bunker_manual_${roll}`) || '[]');
        state.includeManual = localStorage.getItem(`bunker_include_manual_${roll}`) === 'true';
        state.viewManualAdjusted = localStorage.getItem(`bunker_view_manual_${roll}`) === 'true';
        state.attendanceMode = localStorage.getItem(`bunker_att_mode_${roll}`) || 'normal';
    }

    // Now cleanup stale manual entries (entries covered by official update)
    cleanupManualEntries();
    const login = document.getElementById('login-view');
    const dash = document.getElementById('dashboard-view');
    const aurora = document.getElementById('aurora-bg');
    if (aurora) aurora.style.opacity = "0.25";
    if (typeof anime !== 'undefined') {
        anime({
            targets: login, opacity: 0, scale: 0.9, duration: 400, easing: 'easeInOutQuad',
            complete: () => {
                if (login) {
                    login.classList.add('hidden');
                    login.style.display = 'none';
                }
                if (dash) {
                    dash.classList.remove('hidden');
                    dash.style.display = 'flex';
                    dash.style.opacity = '1';
                }
                initDashboard();
                checkFirstLoginFeaturesModal();
                anime({ targets: dash, opacity: [0, 1], scale: [1.02, 1], duration: 350, easing: 'easeOutQuad' });
            }
        });
    } else { 
        if (login) {
            login.classList.add('hidden');
            login.style.display = 'none';
        }
        if (dash) {
            dash.classList.remove('hidden');
            dash.style.display = 'flex';
            dash.style.opacity = '1';
        }
        initDashboard(); 
        checkFirstLoginFeaturesModal();
    }
}

// Helper: Get 'Current' Date (Real or Simulated)
function getToday() {
    if (typeof state !== 'undefined' && state && state.simulatedDate) return new Date(state.simulatedDate);
    return new Date();
}

// Demo Time Travel Handler
function updateSimDate(el) {
    if (!el.value) {
        state.simulatedDate = null;
    } else {
        state.simulatedDate = el.value; // Store YYYY-MM-DD string
    }
    initDashboard(); // Re-render everything with new "Today"
}

function renderSemesterHero() {
    const start = new Date(ACADEMIC_DATA.startDate);
    const end = new Date(ACADEMIC_DATA.lastDate);
    const today = getToday();
    const totalTime = end - start;
    const elapsed = today - start;
    let pct = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
    if (isNaN(pct)) pct = 0;

    const heroContainer = document.getElementById('hero-widget-container');

    heroContainer.innerHTML = `
                <div class="glass-panel rounded-[32px] p-5 relative overflow-hidden group">
                    <div class="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                    <div class="flex justify-between items-end mb-4 relative z-10">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                <i class="fas fa-chart-line text-sm"></i>
                            </div>
                            <div>
                                <h3 class="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Semester Progress</h3>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400 tracking-tighter drop-shadow-[0_0_12px_rgba(99,102,241,0.3)]">${Math.round(pct)}%</span>
                        </div>
                    </div>
                    <div class="relative h-2.5 w-full bg-black/40 rounded-full mb-3 overflow-hidden border border-white/5 shadow-inner">
                        <div class="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000" style="width:${pct}%; background: linear-gradient(90deg, #6366f1, #a855f7); box-shadow: 0 0 15px rgba(168,85,247,0.5);"></div>
                    </div>
                    <div class="flex justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        <span class="flex items-center gap-1.5"><i class="fas fa-play text-[7px] text-indigo-400"></i> ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span class="flex items-center gap-1.5">${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} <i class="fas fa-flag-checkered text-[7px] text-purple-400"></i></span>
                    </div>
                </div>
            `;
}

function initDashboard() {
    const today = getToday();
    const curDateEl = document.getElementById('current-date');
    if (curDateEl) curDateEl.innerText = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Roll display
    const rollEl = document.getElementById('settings-roll');
    if (rollEl) {
        rollEl.innerText = state.rollNumber || "GUEST";
    }

    // Sync manual include checkbox in Settings / Others
    const manualIncludeToggle = document.getElementById('settings-include-manual');
    if (manualIncludeToggle) {
        manualIncludeToggle.checked = !!state.includeManual;
    }

    // Show Date Picker in Settings for Demo Mode
    const datePickerContainer = document.getElementById('demo-date-picker');
    if (datePickerContainer) {
        if (state.rollNumber === 'DEMO') {
            datePickerContainer.classList.remove('hidden');
            const iso = today.toISOString().split('T')[0];
            document.getElementById('sim-date-input').value = iso;
        } else {
            datePickerContainer.classList.add('hidden');
        }
    }

    // Sync Dashboard Attendance Mode Switcher visibility and styling
    const dashAttModeContainer = document.getElementById('dashboard-att-mode-container');
    if (dashAttModeContainer) {
        dashAttModeContainer.style.display = 'flex';
    }
    // Sync navigation tabs visibility
    const navOthers = document.getElementById('nav-others');
    const navCalendar = document.getElementById('nav-calendar');
    if (navCalendar) {
        navCalendar.style.display = '';
    }
    if (navOthers) {
        navOthers.style.display = '';
    }

    // Sync Feedback Automation card
    const feedbackCard = document.getElementById('others-feedback-card');
    if (feedbackCard) {
        feedbackCard.style.display = '';
    }

    ['normal', 'exemp', 'medical'].forEach(m => {
        const btn = document.getElementById(`att-mode-${m}`);
        if (btn) {
            btn.className = m === state.attendanceMode
                ? 'flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition bg-indigo-600 text-white shadow'
                : 'flex-1 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition bg-white/5 text-gray-400 border border-white/5';
        }
    });

    // PHASE 1: Immediate (Critical UI) - Renders in <50ms
    renderSemesterHero();
    renderWidgets();
    renderSubjects();
    renderOthersOverview();

    // PHASE 2: Deferred (Heavy Components) - Schedules after paint
    // Use setTimeout with 0ms to push to next event loop cycle
    // This allows browser to paint Phase 1 first
    setTimeout(() => {
        initAcademicCalendar();
        initPlanner();
        initManual();

        // Init nav only on first load
        if (!state.simulatedDate) switchTab('home', 0);
        if (window.pwaManager) updateInstallUI();

        // Academics are loaded strictly on-demand when user visits Others / Internals tab (saves ~100k invocations/mo)

    }, 0);
}

function getSubjectStats(code, forceIncludeManual = false) {
    const s = state.subjects.find(x => x.code === code); if (!s) return null;

    // Determine base attendance based on selected mode (PSG Tech only)
    let baseAtt = s.attended;
    let baseTot = s.total;

    if (state.college === 'PSGTECH') {
        if (state.attendanceMode === 'exemp' && s.pct_exemp !== undefined) {
            // With exemption: reduce total by exemption hours
            const exemp = s.exemption || 0;
            baseTot = Math.max(s.total - exemp, s.attended); // avoid negative
        } else if (state.attendanceMode === 'medical' && s.pct_medical !== undefined) {
            // With medical: use backend precomputed %, back-calculate effective total
            // pct_medical = attended / effective_total => effective_total = attended / (pct_medical/100)
            const pctMed = s.pct_medical || 0;
            baseTot = pctMed > 0 ? Math.round(s.attended / (pctMed / 100)) : s.total;
        }
    }

    // Home page only includes Smart Tracker entries if manual toggle (state.includeManual) is enabled.
    // Smart Tracker cards pass forceIncludeManual = true so they always reflect Smart Tracker data.
    let p = 0;
    let b = 0;

    if (forceIncludeManual || state.includeManual) {
        const m = state.manual.filter(x => x.code === code);
        p = m.filter(x => x.status === 'Present').length;
        b = m.filter(x => x.status === 'Absent').length;
    }

    const a = baseAtt + p, t = baseTot + p + b;
    const resolvedName = (s.name && s.name !== s.code)
        ? s.name
        : ((state.courseMapping && state.courseMapping[code]) ||
           (Array.isArray(state.academics?.internals) && state.academics.internals.find(x => x.course_code === code)?.course_name) ||
           (Array.isArray(state.academics?.gpa?.all_subjects) && state.academics.gpa.all_subjects.find(x => x.course === code)?.title) ||
           s.name ||
           code);
    if (resolvedName && resolvedName !== s.code && s.name === s.code) {
        s.name = resolvedName;
    }
    return { ...s, name: resolvedName, att: a, tot: t, pct: t === 0 ? 0 : (a / t) * 100 };
}

function computeHybridBunkerAnalytics(code, customAtt = null, customTot = null) {
    const baseStats = getSubjectStats(code);
    const att = customAtt !== null ? customAtt : (baseStats ? baseStats.att : 0);
    const tot = customTot !== null ? customTot : (baseStats ? baseStats.tot : 0);
    const pct = tot > 0 ? (att / tot) * 100 : 0;

    // 1. Strict 75% Exam Eligibility Math
    const safe75 = tot > 0 ? Math.max(0, Math.floor((4 * att - 3 * tot) / 3)) : 0;
    const need75 = tot > 0 && pct < 75 ? Math.max(1, Math.ceil(3 * tot - 4 * att)) : 0;

    // 2. Strict 65% Medical Condonation Floor Math (0.65 = 13/20)
    const safe65 = tot > 0 ? Math.max(0, Math.floor((20 * att - 13 * tot) / 13)) : 0;
    const need65 = tot > 0 && pct < 65 ? Math.max(1, Math.ceil((13 * tot - 20 * att) / 7)) : 0;

    // 3. Weekly Timetable Frequency & Day Distribution
    const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
    let weeklyPeriods = 0;
    const scheduledDays = [];
    DAYS.forEach(d => {
        const arr = (state.timetable && Array.isArray(state.timetable[d])) ? state.timetable[d] : [];
        const cnt = arr.filter(c => c === code).length;
        dayCounts[d] = cnt;
        if (cnt > 0) {
            weeklyPeriods += cnt;
            scheduledDays.push(`${d}${cnt > 1 ? `(${cnt})` : ''}`);
        }
    });

    // 4. Calendar-Aware Remaining Classes & Recovery Date ETA
    let remWorkingDays = 0;
    let remClassesInSem = 0;
    let eta75Date = null;
    let eta65Date = null;
    let accClassesFor75 = 0;
    let accClassesFor65 = 0;

    const today = getToday();
    today.setHours(0, 0, 0, 0);
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calList = (ACADEMIC_DATA && Array.isArray(ACADEMIC_DATA.fullCalendar) && ACADEMIC_DATA.fullCalendar.length > 0)
        ? ACADEMIC_DATA.fullCalendar
        : (state.calendarCache && Array.isArray(state.calendarCache.fullCalendar) ? state.calendarCache.fullCalendar : []);

    if (calList.length > 0) {
        calList.forEach(entry => {
            if (!entry || !entry.date) return;
            const dObj = new Date(entry.date);
            if (isNaN(dObj.getTime())) return;
            dObj.setHours(0, 0, 0, 0);
            if (dObj < today) return;

            const eType = String(entry.type || '').toLowerCase();
            if (eType === 'holiday' || dObj.getDay() === 0 || dObj.getDay() === 6) return;

            remWorkingDays++;
            const dName = dayMap[dObj.getDay()];
            const periodsOnDay = dayCounts[dName] || 0;
            if (periodsOnDay > 0) {
                remClassesInSem += periodsOnDay;
                if (need75 > 0 && !eta75Date) {
                    accClassesFor75 += periodsOnDay;
                    if (accClassesFor75 >= need75) eta75Date = dObj;
                }
                if (need65 > 0 && !eta65Date) {
                    accClassesFor65 += periodsOnDay;
                    if (accClassesFor65 >= need65) eta65Date = dObj;
                }
            }
        });
    } else if (weeklyPeriods > 0) {
        // Fallback estimate if calendar is still loading (assume ~6 weeks remaining)
        remClassesInSem = weeklyPeriods * 6;
        if (need75 > 0) {
            const weeksNeeded = need75 / weeklyPeriods;
            const d75 = new Date(today.getTime() + Math.ceil(weeksNeeded * 7) * 86400000);
            eta75Date = d75;
        }
        if (need65 > 0) {
            const weeksNeeded65 = need65 / weeklyPeriods;
            const d65 = new Date(today.getTime() + Math.ceil(weeksNeeded65 * 7) * 86400000);
            eta65Date = d65;
        }
    }

    const fmtDate = (d) => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
    const eta75Label = need75 === 0
        ? (safe75 > 0 ? `${safe75} period${safe75 > 1 ? 's' : ''} buffer above 75%` : 'At exact 75% boundary')
        : (eta75Date ? `Reach 75% by ~${fmtDate(eta75Date)}` : (weeklyPeriods > 0 ? `Exceeds remaining sem (${remClassesInSem}p left)` : `Need ${need75} consecutive periods`));

    const eta65Label = need65 === 0
        ? `${safe65} period${safe65 !== 1 ? 's' : ''} buffer above 65% floor`
        : (eta65Date ? `Reach 65% by ~${fmtDate(eta65Date)}` : `Need ${need65} consecutive periods for 65%`);

    const projFinalTot = tot + remClassesInSem;
    const projMaxAtt = att + remClassesInSem;
    const maxSemPct = projFinalTot > 0 ? (projMaxAtt / projFinalTot) * 100 : pct;
    const semEndSafeBunks = projFinalTot > 0 ? Math.max(0, Math.floor((4 * projMaxAtt - 3 * projFinalTot) / 3)) : safe75;

    // 5. Triage Category: 'critical' (<65%), 'medical' (65-74.9%), 'borderline' (75-78% or safe75 <= 1), 'safe' (>78%)
    let triage = 'safe';
    if (pct < 65) triage = 'critical';
    else if (pct < 75) triage = 'medical';
    else if (pct <= 78 || safe75 <= 1) triage = 'borderline';

    return {
        code,
        att,
        tot,
        pct,
        safe75,
        need75,
        safe65,
        need65,
        weeklyPeriods,
        scheduledDays,
        dayCounts,
        remWorkingDays,
        remClassesInSem,
        maxSemPct,
        semEndSafeBunks,
        eta75Label,
        eta65Label,
        triage
    };
}
window.computeHybridBunkerAnalytics = computeHybridBunkerAnalytics;

function setSubjectTriageFilter(filterKey) {
    state.subjectTriageFilter = filterKey || 'all';
    const keys = ['all', 'critical', 'medical', 'borderline', 'safe'];
    keys.forEach(k => {
        const btn = document.getElementById(`triage-chip-${k}`);
        if (!btn) return;
        const active = k === state.subjectTriageFilter;
        if (active) {
            btn.className = 'shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white border border-indigo-400/50 shadow transition active:scale-95';
        } else if (k === 'critical') {
            btn.className = 'shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20 transition active:scale-95';
        } else if (k === 'medical') {
            btn.className = 'shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 transition active:scale-95';
        } else if (k === 'borderline') {
            btn.className = 'shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 transition active:scale-95';
        } else if (k === 'safe') {
            btn.className = 'shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 transition active:scale-95';
        } else {
            btn.className = 'shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-white/5 text-gray-300 border border-white/10 transition active:scale-95';
        }
    });
    renderSubjects();
}
window.setSubjectTriageFilter = setSubjectTriageFilter;

function renderSubjects() {
    const c = document.getElementById('subject-list-container');
    if (!c) return;
    c.innerHTML = '';

    const savedCreds = getStoredCredentials();
    const roll = state.rollNumber || savedCreds.roll || localStorage.getItem('bunker_roll') || '';

    // Always store updated attendance on the Home page until the user logs out
    const lastUpdate = localStorage.getItem('bunker_last_update') || 'No data';
    if (Array.isArray(state.subjects) && state.subjects.length > 0 && !state.isViewingPreviousAttendance) {
        persistHomeAttendanceSnapshot(roll, state.subjects, lastUpdate);
    } else if ((!state.subjects || state.subjects.length === 0) && !state.forceLivePendingView) {
        // If PSG is currently updating attendance on eCampus, automatically restore stored previous attendance
        const storedPrev = getStoredPreviousAttendance(roll);
        if (storedPrev && storedPrev.length > 0) {
            state.subjects = storedPrev;
            state.isViewingPreviousAttendance = true;
        }
    }

    // Display last update date from backend (or saved previous update date when viewing previous attendance)
    const displayUpdateDate = state.isViewingPreviousAttendance
        ? ((roll && localStorage.getItem(`bunker_previous_update_${roll}`)) || (roll && localStorage.getItem(`bunker_current_update_${roll}`)) || lastUpdate)
        : lastUpdate;
    if (document.getElementById('last-updated-date')) document.getElementById('last-updated-date').innerText = displayUpdateDate;

    // Also keep the Others tab Live Widget preview synchronized
    if (typeof updateOthersWidgetLivePreview === 'function') {
        updateOthersWidgetLivePreview();
    }

    if (state.subjects.length === 0) {
        const storedPrev = getStoredPreviousAttendance(roll);
        const hasCache = !!(storedPrev && storedPrev.length > 0);
        const hasCreds = !!savedCreds.password || !!localStorage.getItem('bunker_credentials');

        let cacheBtn = '';
        if (hasCache || hasCreds) {
            cacheBtn = `
                <button onclick="loadCachedAttendance()" class="mt-6 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-2.5 mx-auto shadow-lg shadow-indigo-500/30 cursor-pointer">
                    <i class="fas fa-history text-white"></i> Show Previous Attendance
                </button>
            `;
        } else {
            cacheBtn = `
                <p class="text-[10px] text-gray-500 mt-4 text-center font-medium">
                    No previous attendance record available.
                </p>
            `;
        }

        c.innerHTML = `
            <div class="doll-container">
                <svg class="ghost w-32 h-32" viewBox="0 0 100 120">
                    <path class="ghost-shadow" d="M30,115 h40 a1,0.3 0 0,0 0,0" />
                    <path class="ghost-body" d="M20,100 c0,-40 10,-80 30,-80 s30,40 30,80 c0,10 -10,10 -10,0 s-10,10 -20,0 s-10,10 -20,0 s-10,10 -10,0" />
                    <circle class="ghost-eyes" cx="40" cy="50" r="3" />
                    <circle class="ghost-eyes" cx="60" cy="50" r="3" />
                    <path class="ghost-eyes" d="M47,60 q3,3 6,0" fill="none" stroke="#1e1b4b" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <h3 class="text-white font-bold text-lg mt-4">Attendance Updating</h3>
                <p class="text-gray-500 text-xs mt-1 text-center max-w-[200px] leading-relaxed">
                    Attendance data has been stopped or is currently being updated by the college.
                </p>
                <div class="mt-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] text-indigo-300 font-bold uppercase tracking-widest animate-pulse">
                    Status: Pending
                </div>
                ${cacheBtn}
            </div>
        `;
        return;
    }

    // Display banner if viewing cached/previous attendance
    if (state.isViewingPreviousAttendance) {
        const roll = state.rollNumber || localStorage.getItem('bunker_roll');
        const prevUpdate = (roll && localStorage.getItem(`bunker_previous_update_${roll}`)) || localStorage.getItem('bunker_last_update') || 'Previous Update';
        const banner = document.createElement('div');
        banner.className = 'glass-panel rounded-2xl p-3.5 mb-4 border-l-4 border-amber-500 bg-amber-500/10 flex items-center justify-between gap-3 shadow-lg';
        banner.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/30">
                    <i class="fas fa-history text-xs"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <h4 class="text-xs font-black text-white uppercase tracking-wider">Previous Attendance</h4>
                        <span class="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">Saved</span>
                    </div>
                    <p class="text-[10px] text-amber-200/70 font-medium truncate mt-0.5">
                        Last saved: ${prevUpdate} • College portal updating
                    </p>
                </div>
            </div>
            <button onclick="returnToLiveStatus()" class="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all border border-white/10 active:scale-95 flex items-center gap-1.5 cursor-pointer">
                <i class="fas fa-satellite-dish text-indigo-400"></i>
                <span>Live Status</span>
            </button>
        `;
        c.appendChild(banner);
    }

    // --- Regulation Alerts (PSG Tech strict 75% Exam & 65% Medical Condonation rules) ---
    const alertsContainer = document.getElementById('dashboard-alerts-container');
    const triageCounts = { all: 0, critical: 0, medical: 0, borderline: 0, safe: 0 };
    const enrichedSubjects = [];

    state.subjects.forEach(raw => {
        const sub = getSubjectStats(raw.code);
        if (!sub) return;
        const analytics = computeHybridBunkerAnalytics(raw.code, sub.att, sub.tot);
        triageCounts.all++;
        if (triageCounts[analytics.triage] !== undefined) {
            triageCounts[analytics.triage]++;
        }
        enrichedSubjects.push({ sub, analytics });
    });

    // Update triage filter badge counts
    ['all', 'critical', 'medical', 'borderline', 'safe'].forEach(k => {
        const countEl = document.getElementById(`triage-count-${k}`);
        if (countEl) countEl.innerText = String(triageCounts[k] || 0);
    });

    if (alertsContainer) {
        const repeatCount = triageCounts.critical;
        const medCount = triageCounts.medical;
        const under75Count = repeatCount + medCount;

        let eligibleHonours = false;
        let activeArrears = [];
        if (state.academics && state.academics.cgpa) {
            const currentCGPA = parseFloat(state.academics.cgpa.cgpa);
            const allSubs = state.academics.cgpa.all_subjects || [];
            activeArrears = allSubs.filter(sub => {
                const g = String(sub.grade || '').trim().toUpperCase();
                const isPass = sub.result === 'Pass' || (sub.grade && !g.startsWith('RA') && g !== 'U' && !g.startsWith('0 ') && (!sub.result || sub.result.toLowerCase() !== 'fail'));
                return !isPass || g.startsWith('RA') || g === 'U' || (sub.result && sub.result.toLowerCase() === 'fail');
            });
            const hasBacklogs = activeArrears.length > 0 || state.academics.cgpa.cgpa === 'RA';
            if (!isNaN(currentCGPA) && currentCGPA >= 7.50 && !hasBacklogs) eligibleHonours = true;
        }

        let alertsHTML = '';
        if (activeArrears.length > 0) {
            alertsHTML += `
            <div class="glass-panel rounded-[24px] p-4 border-l-4 border-rose-500 bg-rose-500/10 flex items-start gap-3 cursor-pointer hover:bg-rose-500/15 transition-all" onclick="switchAcadTab('results')">
                <div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <i class="fas fa-exclamation-triangle text-xs"></i>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h4 class="text-xs font-black text-white uppercase tracking-wider">Active Arrear Notice (${activeArrears.length})</h4>
                        <span class="text-[8px] font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30 uppercase tracking-widest">Pending</span>
                    </div>
                    <p class="text-[10px] text-rose-300/90 mt-1 leading-normal font-medium">
                        Pending course(s): <b>${activeArrears.map(s => s.course).join(', ')}</b>. Tap to view semester results &amp; marks.
                    </p>
                </div>
            </div>`;
        }

        if (repeatCount > 0) {
            alertsHTML += `
            <div class="glass-panel rounded-[24px] p-4 border-l-4 border-rose-500 bg-rose-500/10 flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <i class="fas fa-ban text-xs"></i>
                </div>
                <div>
                    <h4 class="text-xs font-black text-white uppercase tracking-wider">Critical &lt;65% SA Redo Zone (${repeatCount})</h4>
                    <p class="text-[10px] text-rose-300/85 mt-1 leading-normal font-medium">
                        <b>${repeatCount}</b> course(s) are below the 65% condonation floor (Grade SA). Attend upcoming periods immediately to recover above 65% / 75%.
                    </p>
                </div>
            </div>`;
        } else if (medCount > 0) {
            alertsHTML += `
            <div class="glass-panel rounded-[24px] p-4 border-l-4 border-amber-500 bg-amber-500/10 flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <i class="fas fa-notes-medical text-xs"></i>
                </div>
                <div>
                    <h4 class="text-xs font-black text-white uppercase tracking-wider">65–74.9% Condonation Zone (${medCount})</h4>
                    <p class="text-[10px] text-amber-300/85 mt-1 leading-normal font-medium">
                        <b>${medCount}</b> course(s) are between 65% and 74.9%. Eligible only with medical or approved sports exemption — check recovery periods below.
                    </p>
                </div>
            </div>`;
        }

        if (under75Count > 2) {
            alertsHTML += `
            <div class="glass-panel rounded-[24px] p-4 border-l-4 border-rose-500 bg-rose-500/10 flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <i class="fas fa-exclamation-triangle text-xs"></i>
                </div>
                <div>
                    <h4 class="text-xs font-black text-white uppercase tracking-wider">Next Semester Registration Risk</h4>
                    <p class="text-[10px] text-rose-300/80 mt-1 leading-normal font-medium">
                        You have <b>${under75Count}</b> courses under 75%. Having more than 2 Redo courses blocks next immediate semester registration (Section 5).
                    </p>
                </div>
            </div>`;
        }

        if (eligibleHonours) {
            alertsHTML += `
            <div class="glass-panel rounded-[24px] p-4 border-l-4 border-emerald-500 bg-emerald-500/10 flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <i class="fas fa-medal text-xs"></i>
                </div>
                <div>
                    <h4 class="text-xs font-black text-white uppercase tracking-wider">Honours &amp; Minor Eligible</h4>
                    <p class="text-[10px] text-emerald-300/80 mt-1 leading-normal font-medium">
                        Your CGPA is <b>${state.academics.cgpa.cgpa}</b> with zero backlogs (first attempt). You qualify for B.E./B.Tech. Honours or Minor (+18 credits).
                    </p>
                </div>
            </div>`;
        }

        if (alertsHTML !== '') {
            alertsContainer.innerHTML = alertsHTML;
            alertsContainer.classList.remove('hidden');
        } else {
            alertsContainer.classList.add('hidden');
            alertsContainer.innerHTML = '';
        }
    }

    state.subjectTriageFilter = 'all';
    const filteredList = enrichedSubjects;

    if (filteredList.length === 0) {
        c.innerHTML = `
            <div class="glass-panel rounded-3xl p-6 text-center border border-white/10">
                <i class="fas fa-check-circle text-emerald-400 text-2xl mb-2"></i>
                <p class="text-xs font-black text-white uppercase tracking-wider">No Subjects in This Filter</p>
                <p class="text-[10px] text-gray-400 mt-1">Tap "All" above to view all ${enrichedSubjects.length} enrolled courses.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredList.forEach(({ sub }) => {
        const pct = sub.pct.toFixed(1);
        const pctVal = parseFloat(pct);

        let col, bar, glow, hex;
        if (pctVal === 100) { col = 'text-[#22C55E]'; bar = 'bg-[#22C55E]'; glow = 'bg-[#22C55E]'; hex = '#22C55E'; }
        else if (pctVal >= 90) { col = 'text-[#10B981]'; bar = 'bg-[#10B981]'; glow = 'bg-[#10B981]'; hex = '#10B981'; }
        else if (pctVal >= 85) { col = 'text-[#3B82F6]'; bar = 'bg-[#3B82F6]'; glow = 'bg-[#3B82F6]'; hex = '#3B82F6'; }
        else if (pctVal >= 80) { col = 'text-[#EAB308]'; bar = 'bg-[#EAB308]'; glow = 'bg-[#EAB308]'; hex = '#EAB308'; }
        else if (pctVal >= 75) { col = 'text-[#F97316]'; bar = 'bg-[#F97316]'; glow = 'bg-[#F97316]'; hex = '#F97316'; }
        else { col = 'text-[#EF4444]'; bar = 'bg-[#EF4444]'; glow = 'bg-[#EF4444]'; hex = '#EF4444'; }

        let stat;
        if (sub.pct >= state.threshold) {
            const b = Math.floor((sub.att - (state.threshold / 100) * sub.tot) / (state.threshold / 100));
            stat = b > 0
                ? `<div class="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20"><i class="fas fa-shield-alt text-[10px]"></i><span class="text-[9.5px] font-black uppercase tracking-wider">Safe ${b} bunk</span></div>`
                : `<div class="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20"><i class="fas fa-exclamation-circle text-[10px]"></i><span class="text-[9.5px] font-black uppercase tracking-wider">On the edge</span></div>`;
        } else {
            const n = Math.max(1, Math.ceil(((state.threshold / 100) * sub.tot - sub.att) / (1 - (state.threshold / 100))));
            stat = `<div class="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-3.5 py-1.5 rounded-full border border-rose-500/20"><i class="fas fa-arrow-up text-[10px]"></i><span class="text-[9.5px] font-black uppercase tracking-wider">Attend next ${n}</span></div>`;
        }

        const d = document.createElement('div');
        d.className = 'glass-panel rounded-[32px] overflow-hidden transition-all duration-300 mb-3.5 cursor-pointer active:scale-[0.98]';
        d.onclick = (e) => { if (!e.target.closest('button')) openSim(sub.code); };

        d.innerHTML = `
            <div class="p-5 relative overflow-hidden">
                <div class="absolute -right-6 -top-6 w-28 h-28 rounded-full ${glow} opacity-20 blur-2xl pointer-events-none"></div>
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3 z-10 flex-1 pr-3 min-w-0">
                        <div class="min-w-0 flex-1">
                            <h4 class="font-extrabold text-white text-[15px] sm:text-base uppercase tracking-wide leading-snug drop-shadow-md truncate w-full block">${sub.name}</h4>
                            <div class="flex items-center gap-2 opacity-80 mt-1">
                                <span class="text-[10px] text-gray-400 font-bold tracking-wider uppercase"><span class="text-white">${sub.att}/${sub.tot} Periods</span></span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end z-10 shrink-0 pl-2">
                        <span class="text-2xl sm:text-[28px] font-black ${col} tracking-tighter leading-none" style="text-shadow: 0 0 20px ${hex}40;">${pct}%</span>
                    </div>
                </div>
                <div class="w-full bg-black/40 h-2 rounded-full overflow-hidden mb-4 border border-white/5 shadow-inner relative">
                    <div class="h-full ${bar} rounded-full transition-all duration-700 ease-out" style="width:${Math.min(100, Math.max(0, pctVal))}%; box-shadow: 0 0 10px ${hex}80;"></div>
                </div>
                <div class="flex justify-between items-center z-10 relative gap-2">
                    ${stat}
                    <button onclick="openSim('${sub.code}')" class="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all active:scale-95 shrink-0">
                        <i class="fas fa-wand-magic-sparkles text-[10px] text-indigo-400"></i>
                        <span class="text-[9.5px] font-black uppercase tracking-wider">Tap to Simulate</span>
                    </button>
                </div>
            </div>`;
        fragment.appendChild(d);
    });
    c.appendChild(fragment);
}
function renderWidgets() {
    const today = getToday(); today.setHours(0, 0, 0, 0);

    // Exam Widget Logic
    const examContainer = document.getElementById('exam-widget-container');
    if (examContainer) {
        if (!state.hasCalendar) {
            examContainer.className = `glass-panel rounded-[32px] p-5 h-44 relative overflow-hidden group active:scale-[0.98] transition-all theme-exam`;
            examContainer.innerHTML = `
                <div class="absolute -right-4 -bottom-4 text-8xl opacity-10 transform rotate-12"><i class="fas fa-stopwatch"></i></div>
                <div class="relative z-10 flex flex-col h-full justify-between">
                    <div class=" flex justify-between items-start">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/40 text-white shadow-sm border border-white/20 scale-105"><i class="fas fa-stopwatch"></i></div>
                    </div>
                    <div class="flex flex-col items-center justify-center flex-1 my-2">
                        <span class="text-4xl font-black text-white leading-none tracking-tighter">--</span>
                    </div>
                    <div class="text-center">
                        <h3 class="text-xs font-bold text-white truncate leading-tight">Schedule pending</h3>
                    </div>
                </div>
            `;
        } else {
            const nEx = ACADEMIC_DATA.fullCalendar.sort((a, b) => new Date(a.date) - new Date(b.date)).find(e => e.type === 'Exam' && new Date(e.date) >= today);
            if (nEx) {
                const diff = Math.ceil((new Date(nEx.date) - today) / (1000 * 60 * 60 * 24));
                let theme = 'theme-exam';
                let badgeClass = 'badge-exam';
                let badgeText = 'Exam';
                let decors = ['📝', '📚', '⏰'];
                if (diff <= 3) {
                    theme = 'theme-exam-critical';
                    badgeClass = 'badge-exam-critical animate-pulse';
                    badgeText = 'Exam Soon';
                    decors = ['🚨', '🔥', '⏰'];
                }
                examContainer.className = `glass-panel rounded-[32px] p-5 h-44 relative overflow-hidden group active:scale-[0.98] transition-all ${theme}`;
                examContainer.innerHTML = `
                    <div class="float-item delay-1" style="top:10%; right:10%">${decors[0]}</div>
                    <div class="float-item reverse" style="bottom:15%; left:10%">${decors[1]}</div>
                    <div class="float-item delay-2" style="top:40%; left:50%; opacity:0.3; transform:scale(0.8)">${decors[2]}</div>
                    <div class="relative z-10 flex flex-col h-full justify-between">
                        <div class="flex justify-between items-start">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/40 text-white shadow-sm border border-white/20 scale-105"><i class="fas fa-stopwatch"></i></div>
                        </div>
                        <div class="flex flex-col items-center justify-center flex-1 my-2">
                            <span class="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-md">${diff}</span>
                            <span class="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-1">Days Left</span>
                        </div>
                        <div class="text-center">
                            <h3 class="text-xs font-bold text-white truncate leading-tight px-1">${nEx.name}</h3>
                            <p class="text-[9px] font-medium text-white/60 mt-0.5">${new Date(nEx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                `;
            } else {
                examContainer.className = `glass-panel rounded-[32px] p-5 h-44 relative overflow-hidden group active:scale-[0.98] transition-all theme-noexams`;
                const decors = ['🌴', '🎮', '☕'];
                examContainer.innerHTML = `
                    <div class="float-item delay-1" style="top:10%; right:10%">${decors[0]}</div>
                    <div class="float-item reverse" style="bottom:15%; left:10%">${decors[1]}</div>
                    <div class="float-item delay-2" style="top:40%; left:50%; opacity:0.3; transform:scale(0.8)">${decors[2]}</div>
                    <div class="relative z-10 flex flex-col h-full justify-between">
                        <div class="flex justify-between items-start">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/40 text-white shadow-sm border border-white/20 scale-105"><i class="fas fa-calendar-check"></i></div>
                        </div>
                        <div class="flex flex-col items-center justify-center flex-1 my-2">
                            <span class="text-4xl font-black text-white leading-none tracking-tighter">--</span>
                        </div>
                        <div class="text-center">
                            <h3 class="text-xs font-bold text-white truncate leading-tight">No Exams</h3>
                            <p class="text-[9px] font-medium text-white/60 mt-0.5">Relaxing</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Holiday Widget Logic (Dynamic Theme)
    const holContainer = document.getElementById('holiday-widget-container');

    if (!state.hasCalendar) {
        holContainer.className = `glass-panel rounded-[32px] p-5 h-44 relative overflow-hidden group active:scale-[0.98] transition-all theme-default`;
        holContainer.innerHTML = `
            <div class="absolute -right-4 -bottom-4 text-8xl opacity-10 transform rotate-12"><i class="fas fa-calendar-check"></i></div>
            <div class="relative z-10 flex flex-col h-full justify-between">
                <div class="flex justify-between items-start">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm bg-black/20 text-white shadow-sm border border-white/10"><i class="fas fa-calendar-check"></i></div>
                </div>
                <div class="flex flex-col items-center justify-center flex-1 my-2">
                    <span class="text-4xl font-black text-white leading-none tracking-tighter">--</span>
                </div>
                <div class="text-center">
                    <h3 class="text-xs font-bold text-white truncate leading-tight">No Holidays</h3>
                </div>
            </div>
        `;
        return; // Stop holiday processing
    }

    const nHol = ACADEMIC_DATA.fullCalendar.sort((a, b) => new Date(a.date) - new Date(b.date)).find(e => e.type === 'Holiday' && new Date(e.date) >= today);

    if (nHol) {
        const d = new Date(nHol.date);
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

        let theme = 'theme-default';
        let icon = 'fa-umbrella-beach';
        let badgeClass = 'badge-default';
        let decoration = '<div class="float-item">✨</div>';

        const nameLower = nHol.name.toLowerCase();

        // PREMIUM HOLIDAY DECORATIONS (Floating & Smooth)
        // Default fallback
        let decors = ['✨', '🌟'];

        if (nameLower.includes('new year') && !nameLower.includes('tamil') && !nameLower.includes('telugu')) {
            theme = 'theme-newyear'; icon = 'fa-glass-cheers'; badgeClass = 'badge-newyear';
            decors = ['🎆', '🥂', '🎉'];
        }
        else if (nameLower.includes('pongal') || nameLower.includes('thiruvalluvar') || nameLower.includes('uzhavar') || nameLower.includes('tamil new year')) {
            theme = 'theme-pongal'; icon = 'fa-leaf'; badgeClass = 'badge-pongal';
            decors = ['🌾', '🏺', '☀️'];
        }
        else if (nameLower.includes('ugadi') || nameLower.includes('telugu')) {
            theme = 'theme-ugadi'; icon = 'fa-leaf'; badgeClass = 'badge-ugadi';
            decors = ['🥭', '🌿', '🍯'];
        }
        else if (nameLower.includes('onam')) {
            theme = 'theme-onam'; icon = 'fa-sun'; badgeClass = 'badge-onam';
            decors = ['🌼', '🛶', '🥥'];
        }
        else if (nameLower.includes('diwali') || nameLower.includes('deepavali')) {
            theme = 'theme-diwali'; icon = 'fa-fire'; badgeClass = 'badge-diwali';
            decors = ['🪔', '💥', '✨'];
        }
        else if (nameLower.includes('christmas')) {
            theme = 'theme-christmas'; icon = 'fa-tree'; badgeClass = 'badge-christmas';
            decors = ['🎅', '❄️', '🎁'];
        }
        else if (nameLower.includes('eid') || nameLower.includes('ramzan') || nameLower.includes('bakrid') || nameLower.includes('muharram') || nameLower.includes('milad')) {
            theme = 'theme-eid'; icon = 'fa-moon'; badgeClass = 'badge-eid';
            decors = ['🌙', '🕌', '✨'];
        }
        else if (nameLower.includes('republic') || nameLower.includes('independence') || nameLower.includes('gandhi')) {
            theme = 'theme-national'; icon = 'fa-flag'; badgeClass = 'badge-national';
            decors = ['🇮🇳', '🪁', '🦚'];
        }
        else if (nameLower.includes('ambedkar')) {
            theme = 'theme-ambedkar'; icon = 'fa-balance-scale'; badgeClass = 'badge-ambedkar';
            decors = ['⚖️', '📘', '🌸'];
        }
        else if (nameLower.includes('krishna') || nameLower.includes('gokulashtami')) {
            theme = 'theme-krishna'; icon = 'fa-om'; badgeClass = 'badge-krishna';
            decors = ['🪈', '🧈', '🦚'];
        }
        else if (nameLower.includes('ganesh') || nameLower.includes('vinayakar')) {
            theme = 'theme-ganesh'; icon = 'fa-om'; badgeClass = 'badge-ganesh';
            decors = ['🐘', '🥟', '🌸'];
        }
        else if (nameLower.includes('pooja') || nameLower.includes('navami') || nameLower.includes('dasami') || nameLower.includes('thaipoosam')) {
            theme = 'theme-pooja'; icon = 'fa-star'; badgeClass = 'badge-pooja';
            decors = ['🔱', '🌺', '🪔'];
        }
        else if (nameLower.includes('mahavir')) {
            theme = 'theme-mahavir'; icon = 'fa-hand-holding-heart'; badgeClass = 'badge-mahavir';
            decors = ['🕊️', '🧘', '✨'];
        }
        else if (nameLower.includes('good friday')) {
            theme = 'theme-goodfriday'; icon = 'fa-cross'; badgeClass = 'badge-goodfriday';
            decors = ['✝️', '🕯️', '🍇'];
        }
        else if (nameLower.includes('labour') || nameLower.includes('may day')) {
            theme = 'theme-labour'; icon = 'fa-hammer'; badgeClass = 'badge-labour';
            decors = ['🛠️', '⚙️', '👷'];
        }
        else if (nameLower.includes('holi')) {
            theme = 'theme-holi'; icon = 'fa-palette'; badgeClass = 'badge-holi';
            decors = ['🎈', '🎨', '💧'];
        }
        else if (nameLower.includes('raksha') || nameLower.includes('rakhi')) {
            theme = 'theme-rakhi'; icon = 'fa-hand-holding-heart'; badgeClass = 'badge-rakhi';
            decors = ['🧵', '🎁', '🍫'];
        }
        else if (nameLower.includes('guru') || nameLower.includes('nanak')) {
            theme = 'theme-guru'; icon = 'fa-om'; badgeClass = 'badge-guru';
            decors = ['👳', '🕯️', '✨'];
        }
        else if (nameLower.includes('exam')) {
            theme = 'theme-exam'; icon = 'fa-book'; badgeClass = 'badge-exam';
            decors = ['📝', '📚', '⏰'];
        }

        // Construct Floating HTML
        decoration = `
                    <div class="float-item delay-1" style="top:10%; right:10%">${decors[0]}</div>
                    <div class="float-item reverse" style="bottom:15%; left:10%">${decors[1]}</div>
                    <div class="float-item delay-2" style="top:40%; left:50%; opacity:0.3; transform:scale(0.8)">${decors[2] || decors[0]}</div>
                `;

        if (nameLower.includes('republic') || nameLower.includes('independence')) {
            decoration += '<div class="flag-wave"></div>'; // Add flag wave back
        }
        if (nameLower.includes('holi')) {
            decoration += '<div class="splash-item" style="top:10%; left:10%; background:#f0f;"></div><div class="splash-item" style="bottom:20%; right:20%; background:#0ff;"></div>';
        }

        holContainer.className = `glass-panel rounded-[32px] p-5 h-44 relative overflow-hidden group active:scale-[0.98] transition-all ${theme}`;

        holContainer.innerHTML = `
                    ${decoration}
                    <div class="relative z-10 flex flex-col h-full justify-between">
                        <div class="flex justify-between items-start">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/40 text-white shadow-sm border border-white/20 scale-105"><i class="fas ${icon}"></i></div>
                        </div>
                        <div class="flex flex-col items-center justify-center flex-1 my-2">
                            <span class="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-md">${diff}</span>
                            <span class="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-1">Days Left</span>
                        </div>
                        <div class="text-center">
                            <h3 class="text-xs font-bold text-white truncate leading-tight px-1">${nHol.name}</h3>
                        </div>
                    </div>
                `;
    } else {
        holContainer.className = `glass-panel rounded-[32px] p-5 h-44 relative overflow-hidden group active:scale-[0.98] transition-all theme-default`;
        holContainer.innerHTML = `
                    <div class="absolute -right-4 -bottom-4 text-8xl opacity-10 transform rotate-12"><i class="fas fa-calendar-check"></i></div>
                    <div class="relative z-10 flex flex-col h-full justify-between">
                        <div class="flex justify-between items-start">
                            <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm bg-black/20 text-white shadow-sm border border-white/10"><i class="fas fa-calendar-check"></i></div>
                        </div>
                        <div class="flex flex-col items-center justify-center flex-1 my-2">
                            <span class="text-4xl font-black text-white leading-none tracking-tighter">--</span>
                        </div>
                        <div class="text-center">
                            <h3 class="text-xs font-bold text-white truncate leading-tight">No Holidays</h3>
                        </div>
                    </div>
                `;
    }
}
function initAcademicCalendar() {
    const l = document.getElementById('academic-list'); l.innerHTML = '';

    // Check if calendar is available
    if (!state.hasCalendar) {
        l.innerHTML = `
            <div class="text-center py-10">
                <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-calendar-times text-2xl text-gray-500"></i>
                </div>
                <h3 class="text-white font-bold mb-2">Calendar Unavailable</h3>
                <p class="text-gray-500 text-xs px-10">Academic calendar data is not available.</p>
            </div>
        `;
        if (document.getElementById('cal-remaining-days')) document.getElementById('cal-remaining-days').innerText = "-- Days";
        return;
    }

    const today = getToday(); today.setHours(0, 0, 0, 0);
    const evts = ACADEMIC_DATA.fullCalendar.filter(e => new Date(e.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date));
    const endD = new Date(ACADEMIC_DATA.lastDate);
    let rem = Math.ceil((endD - today) / (1000 * 60 * 60 * 24)); if (rem < 0) rem = 0;
    if (document.getElementById('cal-remaining-days')) document.getElementById('cal-remaining-days').innerText = rem + ' Days';

    let cm = "";
    if (evts.length === 0) { l.innerHTML = '<div class="text-center text-gray-500 text-sm py-10">No upcoming events</div>'; return; }
    evts.forEach((e, i) => {
        const d = new Date(e.date), m = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (m !== cm) { cm = m; l.innerHTML += `<div class="sticky top-0 z-30 bg-[#000000] py-2 mb-4 bg-opacity-95"><span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-4 border-l-2 border-indigo-500 ml-5">${m}</span></div>`; }
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        const txt = diff === 0 ? "Today" : (diff === 1 ? "Tomorrow" : `${diff} days left`);
        const cls = diff <= 1 ? "text-indigo-300" : "text-gray-500";
        l.innerHTML += `<div class="relative pl-10 mb-6 group transition-all duration-300"><div class="absolute left-[19px] top-3 w-3 h-3 rounded-full bg-[#000000] border-2 border-indigo-500 z-10 transform -translate-x-1/2"></div><div class="glass-card p-5 rounded-[20px] flex items-center justify-between border-b border-white/5 active:scale-[0.98]"><div class="flex items-center gap-4"><div class="flex flex-col items-center justify-center min-w-[40px] text-center"><span class="text-[10px] font-bold uppercase text-gray-500">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span><span class="text-2xl font-black text-white leading-none">${d.getDate()}</span></div><div><h4 class="font-bold text-sm text-white leading-tight">${e.name}</h4></div></div><div class="text-[10px] font-bold uppercase ${cls} whitespace-nowrap">${txt}</div></div></div>`;
    });
}

function openFullAcademicCalendar() {
    const roll = (typeof state !== 'undefined' && state.rollNumber) || localStorage.getItem('bunker_roll') || '';
    let url = '/calendar';
    if (roll && roll !== 'DEMO') {
        url += '?roll=' + encodeURIComponent(roll);
        const sem = detectCurrentSemesterFromSubjects(typeof state !== 'undefined' && state.subjects);
        if (sem) {
            url += '&sem=' + encodeURIComponent(sem);
        }
    }
    window.open(url, '_blank');
}

function getWeekDates(referenceDate) {
    const ref = referenceDate ? new Date(referenceDate + (typeof referenceDate === "string" && !referenceDate.includes("T") ? "T00:00:00" : "")) : getToday();
    const day = ref.getDay();
    const diffToMon = ref.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(ref);
    mon.setDate(diffToMon);

    const week = {};
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    for (let i = 0; i < 5; i++) {
        const cur = new Date(mon);
        cur.setDate(mon.getDate() + i);
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, "0");
        const dd = String(cur.getDate()).padStart(2, "0");
        const iso = `${yyyy}-${mm}-${dd}`;
        week[dayNames[i]] = {
            date: iso,
            dayNum: String(cur.getDate()),
            shortDate: cur.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            full: cur.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })
        };
    }
    return week;
}

function getCalendarEventsForDateISO(dateISO) {
    if (!dateISO) return [];
    const targetPrefix = String(dateISO).slice(0, 10);
    const calList = (ACADEMIC_DATA && Array.isArray(ACADEMIC_DATA.fullCalendar) && ACADEMIC_DATA.fullCalendar.length > 0)
        ? ACADEMIC_DATA.fullCalendar
        : (state.calendarCache && Array.isArray(state.calendarCache.fullCalendar) ? state.calendarCache.fullCalendar : []);

    const fallbackHolidays = (window.CALENDAR_TOKENS && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026 && window.CALENDAR_TOKENS.CALENDAR_INDEX_2026.holidays) || [
        { date: "2026-08-15T00:00:00", name: "Independence Day", type: "Holiday" },
        { date: "2026-08-26T00:00:00", name: "Milad-un-Nabi", type: "Holiday" },
        { date: "2026-09-04T00:00:00", name: "Krishna Jayanthi", type: "Holiday" },
        { date: "2026-09-14T00:00:00", name: "Vinayakar Chathurthi", type: "Holiday" },
        { date: "2026-10-02T00:00:00", name: "Gandhi Jayanthi", type: "Holiday" },
        { date: "2026-10-19T00:00:00", name: "Ayutha Pooja", type: "Holiday" },
        { date: "2026-10-20T00:00:00", name: "Vijaya Dasami", type: "Holiday" },
        { date: "2026-11-08T00:00:00", name: "Deepavali", type: "Holiday" },
        { date: "2026-12-25T00:00:00", name: "Christmas", type: "Holiday" },
        { date: "2027-01-01T00:00:00", name: "New Year", type: "Holiday" },
        { date: "2027-01-15T00:00:00", name: "Pongal", type: "Holiday" },
        { date: "2027-01-16T00:00:00", name: "Thiruvalluvar Day / Pongal", type: "Holiday" },
        { date: "2027-01-26T00:00:00", name: "Republic Day", type: "Holiday" },
        { date: "2027-03-10T00:00:00", name: "Ramzan", type: "Holiday" },
        { date: "2027-03-26T00:00:00", name: "Good Friday", type: "Holiday" },
        { date: "2027-04-08T00:00:00", name: "Telugu New Year", type: "Holiday" },
        { date: "2027-04-14T00:00:00", name: "Tamil New Year", type: "Holiday" },
        { date: "2027-04-19T00:00:00", name: "Mahaveer Jayanthi", type: "Holiday" },
        { date: "2027-05-17T00:00:00", name: "Bakrid", type: "Holiday" },
        { date: "2027-06-15T00:00:00", name: "Muharram", type: "Holiday" }
    ];

    const combined = calList.length > 0 ? calList : fallbackHolidays;
    const seen = new Set();
    const results = [];

    const classifyEvent = (raw) => {
        if (!raw || !raw.date) return null;
        const dStr = String(raw.date).slice(0, 10);
        if (dStr !== targetPrefix) return null;
        const name = String(raw.name || raw.title || "").trim();
        const typeRaw = String(raw.type || "").toLowerCase();
        const nameLower = name.toLowerCase();

        // Ignore generic routine working day entries without special names
        if (!name || nameLower === "working day" || nameLower === "regular classes" || (typeRaw === "working" && !name)) {
            return null;
        }
        const key = `${dStr}_${nameLower}`;
        if (seen.has(key)) return null;
        seen.add(key);

        let category = "event";
        if (typeRaw === "holiday" || nameLower.includes("holiday") || nameLower.includes("pooja") || nameLower.includes("dasami") || nameLower.includes("deepavali") || nameLower.includes("diwali") || nameLower.includes("pongal") || nameLower.includes("christmas") || nameLower.includes("republic") || nameLower.includes("independence") || nameLower.includes("jayanthi") || nameLower.includes("ramzan") || nameLower.includes("bakrid") || nameLower.includes("new year") || nameLower.includes("good friday") || nameLower.includes("muharram")) {
            category = "holiday";
        } else if (typeRaw === "exam" || nameLower.includes("test") || nameLower.includes("exam") || nameLower.includes("assessment") || nameLower.includes("ca ") || nameLower.includes("ca-") || nameLower.includes("quiz")) {
            category = "exam";
        }

        return {
            date: dStr,
            name,
            category
        };
    };

    combined.forEach(item => {
        const ev = classifyEvent(item);
        if (ev) results.push(ev);
    });
    // Also check fallbackHolidays if calList didn't include a holiday
    fallbackHolidays.forEach(item => {
        const ev = classifyEvent(item);
        if (ev) results.push(ev);
    });

    return results;
}
window.getCalendarEventsForDateISO = getCalendarEventsForDateISO;

function shiftTrackerWeek(deltaWeeks) {
    const baseISO = state.selectedDateISO || (() => {
        const t = getToday();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    })();
    const dObj = new Date(baseISO + "T00:00:00");
    dObj.setDate(dObj.getDate() + (deltaWeeks * 7));

    const yyyy = dObj.getFullYear();
    const mm = String(dObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dObj.getDate()).padStart(2, "0");
    state.selectedDateISO = `${yyyy}-${mm}-${dd}`;

    const week = getWeekDates(state.selectedDateISO);
    const activeDay = state.activePlannerDay || "Mon";
    if (week[activeDay]) {
        state.selectedDateISO = week[activeDay].date;
    }

    const picker = document.getElementById("tracker-date-picker");
    if (picker) picker.value = state.selectedDateISO;

    const lbl = document.getElementById("tracker-selected-date-label");
    if (lbl && week[activeDay]) {
        lbl.innerText = week[activeDay].full;
    }

    initPlanner();
}
window.shiftTrackerWeek = shiftTrackerWeek;

function selectPlannerDay(day) {
    state.activePlannerDay = day;
    const week = getWeekDates(state.selectedDateISO);
    if (week[day]) {
        state.selectedDateISO = week[day].date;
        const picker = document.getElementById("tracker-date-picker");
        if (picker) picker.value = state.selectedDateISO;
        const lbl = document.getElementById("tracker-selected-date-label");
        if (lbl) lbl.innerText = week[day].full;
    }
    initPlanner();
}

function jumpToTodayTracker() {
    const today = getToday();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    state.selectedDateISO = `${yyyy}-${mm}-${dd}`;
    const dayIdx = today.getDay();
    state.activePlannerDay = (dayIdx >= 1 && dayIdx <= 5) ? DAYS[dayIdx - 1] : "Mon";
    const week = getWeekDates(state.selectedDateISO);
    if (week[state.activePlannerDay]) {
        state.selectedDateISO = week[state.activePlannerDay].date;
    }
    const picker = document.getElementById("tracker-date-picker");
    if (picker) picker.value = state.selectedDateISO;
    const lbl = document.getElementById("tracker-selected-date-label");
    if (lbl && week[state.activePlannerDay]) {
        lbl.innerText = week[state.activePlannerDay].full;
    }
    initPlanner();
    showToast(`Jumped to ${state.activePlannerDay}, ${week[state.activePlannerDay]?.shortDate || 'Today'}`);
}

function onTrackerDateChange(val) {
    if (!val) return;
    state.selectedDateISO = val;
    const dObj = new Date(val + "T00:00:00");
    const dayIdx = dObj.getDay();
    if (dayIdx >= 1 && dayIdx <= 5) {
        state.activePlannerDay = DAYS[dayIdx - 1];
    } else {
        state.activePlannerDay = "Mon";
        const week = getWeekDates(val);
        if (week["Mon"]) state.selectedDateISO = week["Mon"].date;
    }
    const week = getWeekDates(state.selectedDateISO);
    const lbl = document.getElementById("tracker-selected-date-label");
    if (lbl) {
        lbl.innerText = week[state.activePlannerDay]?.full || dObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    }
    initPlanner();
}

function initPlanner() {
    cleanupManualEntries();
    if (!state.selectedDateISO) {
        const t0 = getToday();
        const y = t0.getFullYear(), m = String(t0.getMonth() + 1).padStart(2, "0"), d = String(t0.getDate()).padStart(2, "0");
        state.selectedDateISO = `${y}-${m}-${d}`;
    }

    const week = getWeekDates(state.selectedDateISO);
    const activeInfo = week[state.activePlannerDay] || week["Mon"];
    if (activeInfo && activeInfo.date) {
        state.selectedDateISO = activeInfo.date;
    }

    const lbl = document.getElementById("tracker-selected-date-label");
    if (lbl) {
        lbl.dataset.initialized = "true";
        lbl.innerText = activeInfo ? activeInfo.full : new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    }

    const weekRangeLbl = document.getElementById("tracker-week-range-label");
    if (weekRangeLbl && week["Mon"] && week["Fri"]) {
        const todayObj = getToday();
        const todayISO = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
        const todayWeek = getWeekDates(todayISO);
        const isCurrentWeek = todayWeek["Mon"] && todayWeek["Mon"].date === week["Mon"].date;
        weekRangeLbl.innerText = `${isCurrentWeek ? "This Week • " : "Week • "}${week["Mon"].shortDate} – ${week["Fri"].shortDate}`;
    }

    const picker = document.getElementById("tracker-date-picker");
    if (picker) {
        picker.value = state.selectedDateISO;
    }

    const t = document.getElementById("planner-days");
    const c = document.getElementById("planner-classes");
    const eventBanner = document.getElementById("tracker-event-banner");
    const summaryEl = document.getElementById("tracker-day-summary");
    const clearDayBtn = document.getElementById("tracker-clear-day-btn");

    const hasTimetable = state.timetable && Object.keys(state.timetable).length > 0 &&
        Object.values(state.timetable).some(d => d && d.length > 0 && d.some(x => x !== "Free"));

    // Collect calendar events across all 5 days of the viewed week
    const weekEventsMap = {};
    DAYS.forEach(d => {
        const info = week[d];
        if (info && info.date) {
            weekEventsMap[d] = getCalendarEventsForDateISO(info.date);
        } else {
            weekEventsMap[d] = [];
        }
    });

    if (t) {
        if (!hasTimetable) {
            t.innerHTML = "<div class=\"col-span-5 text-center text-gray-500 text-[10px] py-2\">Timetable not synced</div>";
        } else {
            t.innerHTML = DAYS.map(d => {
                const info = week[d] || { dayNum: "--", date: "" };
                const active = d === state.activePlannerDay;
                const dayLogs = state.manual.filter(m => resolveManualEntryDateKey(m) === info.date);
                const hasLogs = dayLogs.length > 0;
                const hasBunk = dayLogs.some(m => m.status === "Absent");
                const dayEvents = weekEventsMap[d] || [];
                const isHoliday = dayEvents.some(e => e.category === "holiday");
                const isExam = !isHoliday && dayEvents.some(e => e.category === "exam");
                const isEvent = !isHoliday && !isExam && dayEvents.length > 0;

                let pillStyle = "bg-white/[0.04] text-gray-400 border border-white/[0.07] hover:bg-white/[0.08]";
                if (active) {
                    if (isHoliday) {
                        pillStyle = "bg-gradient-to-b from-amber-500/35 to-orange-500/20 text-white border border-amber-400/60 shadow-[0_0_16px_rgba(245,158,11,0.3)] scale-[1.02]";
                    } else if (isExam) {
                        pillStyle = "bg-gradient-to-b from-rose-500/35 to-pink-500/20 text-white border border-rose-400/60 shadow-[0_0_16px_rgba(244,63,94,0.3)] scale-[1.02]";
                    } else {
                        pillStyle = "mode-pill-active scale-[1.02]";
                    }
                } else if (isHoliday) {
                    pillStyle = "bg-amber-500/12 text-amber-200 border border-amber-500/30";
                } else if (isExam) {
                    pillStyle = "bg-rose-500/12 text-rose-200 border border-rose-500/30";
                } else if (isEvent) {
                    pillStyle = "bg-indigo-500/12 text-indigo-200 border border-indigo-500/30";
                }

                let bottomMarker = `<span class="w-1.5 h-1.5 rounded-full ${hasLogs ? (hasBunk ? "bg-rose-400" : "bg-emerald-400") : "bg-transparent"}"></span>`;
                if (isHoliday) {
                    bottomMarker = `<span class="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-400/30 leading-tight">HOL</span>`;
                } else if (isExam) {
                    bottomMarker = `<span class="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-400/30 leading-tight">EXAM</span>`;
                } else if (isEvent) {
                    bottomMarker = `<span class="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-400/30 leading-tight">EVT</span>`;
                }

                return `
                <button type="button" onclick="selectPlannerDay('${d}')" class="py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all ${pillStyle}">
                    <span class="text-[8.5px] font-black uppercase tracking-wider opacity-85">${d}</span>
                    <span class="text-sm font-black tabular-nums ${active ? "text-white" : isHoliday ? "text-amber-300" : isExam ? "text-rose-300" : "text-gray-200"}">${info.dayNum}</span>
                    <div class="h-3.5 flex items-center justify-center">${bottomMarker}</div>
                </button>`;
            }).join("");
        }
    }

    // Render Calendar Event Banner for Selected Day Only
    if (eventBanner) {
        const activeEvents = weekEventsMap[state.activePlannerDay] || [];

        let bannerHTML = "";
        if (activeEvents.length > 0) {
            bannerHTML += activeEvents.map(ev => {
                if (ev.category === "holiday") {
                    return `
                    <div class="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/5 border border-amber-500/35 flex items-center justify-between gap-3 shadow-lg">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center text-amber-300 text-sm shrink-0">
                                <i class="fas fa-umbrella-beach"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-200 border border-amber-400/30">Holiday</span>
                                    <span class="text-[9px] font-bold text-amber-200/80">${activeInfo?.shortDate || ""}</span>
                                </div>
                                <h4 class="text-xs sm:text-sm font-extrabold text-white truncate mt-1">${ev.name}</h4>
                            </div>
                        </div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-amber-300 shrink-0">No Classes</span>
                    </div>`;
                } else if (ev.category === "exam") {
                    return `
                    <div class="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/20 via-pink-500/15 to-rose-500/5 border border-rose-500/35 flex items-center justify-between gap-3 shadow-lg">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/35 flex items-center justify-center text-rose-300 text-sm shrink-0">
                                <i class="fas fa-file-pen"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-rose-500/25 text-rose-200 border border-rose-400/30">Academic Exam</span>
                                    <span class="text-[9px] font-bold text-rose-200/80">${activeInfo?.shortDate || ""}</span>
                                </div>
                                <h4 class="text-xs sm:text-sm font-extrabold text-white truncate mt-1">${ev.name}</h4>
                            </div>
                        </div>
                    </div>`;
                } else {
                    return `
                    <div class="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-indigo-500/5 border border-indigo-500/35 flex items-center justify-between gap-3 shadow-lg">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/35 flex items-center justify-center text-indigo-300 text-sm shrink-0">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">Calendar Event</span>
                                    <span class="text-[9px] font-bold text-indigo-200/80">${activeInfo?.shortDate || ""}</span>
                                </div>
                                <h4 class="text-xs sm:text-sm font-extrabold text-white truncate mt-1">${ev.name}</h4>
                            </div>
                        </div>
                    </div>`;
                }
            }).join("<div class='h-2'></div>");
        }

        if (bannerHTML) {
            eventBanner.innerHTML = bannerHTML;
            eventBanner.classList.remove("hidden");
        } else {
            eventBanner.innerHTML = "";
            eventBanner.classList.add("hidden");
        }
    }

    if (c) {
        c.innerHTML = "";
        if (!hasTimetable) {
            c.innerHTML = `<div class="text-center py-10 opacity-50"><div class="text-4xl mb-4">📅</div><p class="text-xs font-bold uppercase tracking-widest text-gray-400">Timetable Not Found</p></div>`;
            return;
        }

        const cl = state.timetable[state.activePlannerDay] || [];
        if (!cl.length || cl.every(x => x === "Free")) {
            c.innerHTML = "<div class=\"text-center py-10 text-gray-500 text-[10px] font-black uppercase tracking-widest\">No classes scheduled on this day</div>";
            if (summaryEl) summaryEl.innerText = "No periods scheduled";
            if (clearDayBtn) clearDayBtn.classList.add("hidden");
            updateSmartTrackerImpact();
            return;
        }

        let dayAttendedCount = 0;
        let dayBunkedCount = 0;
        let totalScheduledPeriods = 0;

        cl.forEach((code, i) => {
            if (code === "Free") return;
            totalScheduledPeriods++;
            const s = state.subjects.find(s => s.code === code) || { name: state.courseMapping[code] || code };
            // Always include Smart Tracker entries when displaying attendance on Smart Tracker cards
            const subStats = getSubjectStats(code, true) || { att: s.attended || 0, tot: s.total || 0, pct: s.percentage || 0 };
            const periodNum = i + 1;

            const logged = state.manual.find(m =>
                m.code === code && resolveManualEntryDateKey(m) === state.selectedDateISO && extractEntryPeriodNumber(m) === periodNum
            );
            const isPresent = logged && logged.status === "Present";
            const isAbsent = logged && logged.status === "Absent";
            if (isPresent) dayAttendedCount++;
            if (isAbsent) dayBunkedCount++;

            const statusBadge = isPresent
                ? `<span class="text-[8px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">✓ Attended</span>`
                : isAbsent
                ? `<span class="text-[8px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">✕ Bunked</span>`
                : "";

            const pctVal = Number(subStats.pct || 0);
            const pctColor = pctVal >= 75 ? "text-emerald-400" : pctVal >= 65 ? "text-amber-400" : "text-rose-400";

            const cardBorder = isPresent
                ? "border-emerald-500/40"
                : isAbsent
                ? "border-rose-500/40"
                : pctVal >= 75
                ? "border-indigo-500/25"
                : "border-rose-500/30";

            const cardGradStyle = isPresent
                ? "background: linear-gradient(135deg, rgba(16,185,129,0.20) 0%, rgba(15,14,28,0.92) 70%);"
                : isAbsent
                ? "background: linear-gradient(135deg, rgba(244,63,94,0.20) 0%, rgba(15,14,28,0.92) 70%);"
                : pctVal >= 75
                ? "background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(15,14,28,0.92) 70%);"
                : "background: linear-gradient(135deg, rgba(244,63,94,0.14) 0%, rgba(15,14,28,0.92) 70%);";

            const btnPresentClass = isPresent
                ? "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/25 font-black"
                : "bg-emerald-500/12 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25";

            const btnAbsentClass = isAbsent
                ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 font-black"
                : "bg-rose-500/12 border-rose-500/30 text-rose-400 hover:bg-rose-500/25";

            c.innerHTML += `
                <div class="glass-panel p-3.5 sm:p-4 rounded-[24px] border ${cardBorder} transition-all duration-200 flex items-center justify-between gap-3" style="${cardGradStyle}">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span class="px-2 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-400/25 text-indigo-200 text-[8.5px] font-black uppercase tracking-wider">Period ${periodNum}</span>
                            <span class="text-[10px] font-black ${pctColor} tabular-nums">${pctVal.toFixed(1)}%</span>
                            ${statusBadge}
                        </div>
                        <p class="text-[13.5px] sm:text-sm font-extrabold text-white truncate">${s.name}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button type="button" onclick="markTimetableAttendance('${code}', 'Present', ${periodNum})" 
                            class="w-10 h-10 rounded-2xl border flex items-center justify-center active:scale-90 transition ${btnPresentClass}" title="Mark Attended">
                            <i class="fas fa-check text-xs"></i>
                        </button>
                        <button type="button" onclick="markTimetableAttendance('${code}', 'Absent', ${periodNum})" 
                            class="w-10 h-10 rounded-2xl border flex items-center justify-center active:scale-90 transition ${btnAbsentClass}" title="Mark Bunked">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        if (summaryEl) {
            if (dayAttendedCount > 0 || dayBunkedCount > 0) {
                const parts = [];
                if (dayAttendedCount > 0) parts.push(`${dayAttendedCount} Attended`);
                if (dayBunkedCount > 0) parts.push(`${dayBunkedCount} Bunked`);
                summaryEl.innerHTML = `<span class="text-indigo-300">${parts.join(" • ")}</span> <span class="text-gray-500">(${dayAttendedCount + dayBunkedCount}/${totalScheduledPeriods} periods)</span>`;
            } else {
                summaryEl.innerText = `Tap ✓ or ✕ per period (${totalScheduledPeriods} periods)`;
            }
        }
        if (clearDayBtn) {
            if (dayAttendedCount > 0 || dayBunkedCount > 0) {
                clearDayBtn.classList.remove("hidden");
            } else {
                clearDayBtn.classList.add("hidden");
            }
        }

        updateSmartTrackerImpact();
    }

    // Render Tracked History in Smart Tracker (only bunked classes with Date + Period, no click time, no course code)
    const histEl = document.getElementById("manual-history");
    const badgeEl = document.getElementById("manual-count-badge");
    const bunkedLogs = state.manual.filter(m => m.status === "Absent");
    if (badgeEl) badgeEl.innerText = `${bunkedLogs.length} Bunked`;
    if (histEl) {
        if (bunkedLogs.length === 0) {
            histEl.innerHTML = "<div class=\"text-center text-xs text-gray-500 py-3\">No bunked periods tracked yet</div>";
        } else {
            const dateGroups = {};
            bunkedLogs.slice(0, 8).forEach(entry => {
                const key = resolveManualEntryDateKey(entry);
                if (!dateGroups[key]) dateGroups[key] = [];
                dateGroups[key].push(entry);
            });
            const sortedKeys = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
            histEl.innerHTML = sortedKeys.map(dateKey => {
                const prettyDate = formatManualDateHeading(dateKey);
                const items = dateGroups[dateKey].slice().sort((a, b) => extractEntryPeriodNumber(a) - extractEntryPeriodNumber(b));
                const rows = items.map(m => {
                    const periodNum = extractEntryPeriodNumber(m);
                    return `
                    <div class="flex justify-between items-center p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                        <div class="flex items-center gap-2.5 min-w-0 pr-2">
                            <span class="px-2 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider shrink-0 bg-rose-500/15 text-rose-300 border border-rose-500/30">Period ${periodNum}</span>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-white truncate">${m.name}</p>
                            </div>
                        </div>
                        <button type="button" onclick="deleteManual(${m.id})" class="w-8 h-8 rounded-xl bg-white/5 text-gray-400 hover:text-rose-400 flex items-center justify-center active:scale-90 transition shrink-0" title="Delete entry">
                            <i class="fas fa-trash text-[10px]"></i>
                        </button>
                    </div>`;
                }).join("");
                return `
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between px-1 pt-1">
                        <span class="text-[8.5px] font-black uppercase tracking-widest text-indigo-300">${prettyDate}</span>
                        <span class="text-[8px] font-bold text-rose-400">${items.length} ${items.length === 1 ? "Period" : "Periods"} Bunked</span>
                    </div>
                    <div class="space-y-1.5">${rows}</div>
                </div>`;
            }).join("");
        }
    }
    pushWidgetDataToNative();
}

function toggleSmartTrackerPanel(btn) {
    const panel = document.getElementById("smart-tracker-panel");
    if (!panel) return;
    const isHidden = panel.classList.toggle("hidden");
    if (btn) {
        btn.innerHTML = isHidden
            ? "<i class=\"fas fa-chart-bar text-[8px]\"></i> <span>Stats</span>"
            : "<i class=\"fas fa-chart-bar text-[8px]\"></i> <span>Hide</span>";
    }
    if (!isHidden) updateSmartTrackerImpact();
}

function markAllDayAttendance(status = "Present") {
    const cl = state.timetable[state.activePlannerDay] || [];
    const validCodes = [];
    cl.forEach((code, idx) => {
        if (code !== "Free") validCodes.push({ code, period: idx + 1 });
    });

    if (validCodes.length === 0) {
        showToast("No classes scheduled on this day", "info");
        return;
    }

    validCodes.forEach(({ code, period }) => {
        markTimetableAttendance(code, status, period, true);
    });

    state.selectedCards = {};
    saveState();
    renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();
    hapticFeedback(status === "Present" ? "success" : "warning");
    const label = status === "Present" ? "Attended" : "Bunked";
    showToast(`Marked all ${validCodes.length} periods ${label} (${state.activePlannerDay})`, "success");
}
window.markAllDayAttendance = markAllDayAttendance;

function clearSelectedDayTrackerLogs() {
    const curISO = state.selectedDateISO;
    if (!curISO) return;
    const before = state.manual.length;
    state.manual = state.manual.filter(m => resolveManualEntryDateKey(m) !== curISO);
    if (state.manual.length !== before) {
        saveState();
        renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();
        showToast(`Cleared tracked entries for ${state.activePlannerDay}`);
    }
}
window.clearSelectedDayTrackerLogs = clearSelectedDayTrackerLogs;

function toggleSelectAllCards() {
    markAllDayAttendance("Present");
}

function toggleCardSelection(id, code) {
    markTimetableAttendance(code, "Present");
}

function markTimetableAttendance(code, status, period = 1, silent = false) {
    const s = state.subjects.find(x => x.code === code);
    const name = s ? s.name : (state.courseMapping[code] || code);

    const t0 = getToday();
    const fallbackISO = `${t0.getFullYear()}-${String(t0.getMonth() + 1).padStart(2, "0")}-${String(t0.getDate()).padStart(2, "0")}`;
    const curISO = state.selectedDateISO || fallbackISO;

    // Check if an entry already exists for this exact date + period + course
    const existingIdx = state.manual.findIndex(m =>
        m.code === code && resolveManualEntryDateKey(m) === curISO && extractEntryPeriodNumber(m) === period
    );

    if (existingIdx !== -1) {
        const existing = state.manual[existingIdx];
        if (!silent && existing.status === status) {
            // Tapping the same active button again toggles/clears that period's log
            state.manual.splice(existingIdx, 1);
            saveState();
            renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();
            showToast(`Removed log for Period ${period}`);
            return;
        }
        // Only store dateISO and period (never store click timestamp)
        state.manual[existingIdx] = {
            id: existing.id,
            code: code,
            name: name,
            status: status,
            dateISO: curISO,
            period: period
        };
    } else {
        // Only store dateISO and period (never store click timestamp)
        state.manual.unshift({
            id: Date.now() + Math.random(),
            code: code,
            name: name,
            status: status,
            dateISO: curISO,
            period: period
        });
    }

    if (state.selectedCards) {
        Object.keys(state.selectedCards).forEach(id => {
            if (state.selectedCards[id] === code) delete state.selectedCards[id];
        });
    }

    if (!silent) {
        saveState();
        renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();
        hapticFeedback(status === "Present" ? "tap" : "warning");
        showToast(`Marked ${status === "Present" ? "Attended" : "Bunked"}: Period ${period}`, "success");
    }
}

// Vibration API helper — only fires in simulation mode; iOS gets AudioContext click
function hapticFeedback(type = 'tap') {
    // Only trigger during attendance simulation (date travel mode)
    if (!state.simulatedDate) return;

    // Android/Chrome — Vibration API
    if (navigator.vibrate) {
        switch (type) {
            case 'tap':     navigator.vibrate(40); break;
            case 'warning': navigator.vibrate([40, 60, 40]); break;
            case 'success': navigator.vibrate([30, 40, 30, 40, 60]); break;
        }
        return;
    }

    // iOS fallback — silent AudioContext click (provides native-like tactile cue on some devices)
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.01, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        setTimeout(() => ctx.close(), 100);
    } catch { }
}


function updateSmartTrackerImpact() {
    const l = document.getElementById('planner-impact-list');
    if (!l) return;

    const t0 = getToday();
    const todayISO = `${t0.getFullYear()}-${String(t0.getMonth() + 1).padStart(2, '0')}-${String(t0.getDate()).padStart(2, '0')}`;
    const activeDateISO = state.selectedDateISO || todayISO;
    const todayManual = state.manual.filter(m => resolveManualEntryDateKey(m) === activeDateISO);
    const todayManualCodes = [...new Set(todayManual.map(m => m.code))];

    if (todayManualCodes.length === 0) {
        l.innerHTML = '<div class="text-center py-2 text-gray-500 text-[10px] italic font-medium">Mark classes to see today\'s tracker stats</div>';
        return;
    }

    let html = '';
    todayManualCodes.forEach(code => {
        const subRaw = state.subjects.find(x => x.code === code);
        if (!subRaw) return;

        // Resolve official/college base (excluding manual adjustments)
        let offAtt = subRaw.attended;
        let offTot = subRaw.total;
        if (state.college === 'PSGTECH') {
            if (state.attendanceMode === 'exemp' && subRaw.pct_exemp !== undefined) {
                const exemp = subRaw.exemption || 0;
                offTot = Math.max(subRaw.total - exemp, subRaw.attended);
            } else if (state.attendanceMode === 'medical' && subRaw.pct_medical !== undefined) {
                const pctMed = subRaw.pct_medical || 0;
                offTot = pctMed > 0 ? Math.round(subRaw.attended / (pctMed / 100)) : subRaw.total;
            }
        }

        // Add manual entries EXCEPT activeDateISO to get base
        const pastManual = state.manual.filter(x => x.code === code && resolveManualEntryDateKey(x) !== activeDateISO);
        const p_past = pastManual.filter(x => x.status === 'Present').length;
        const b_past = pastManual.filter(x => x.status === 'Absent').length;

        const baseAtt = offAtt + p_past;
        const baseTot = offTot + p_past + b_past;
        const basePct = baseTot === 0 ? 0 : (baseAtt / baseTot * 100);

        const histCount = todayManual.filter(m => m.code === code && m.status === 'Present').length;
        const histAbsent = todayManual.filter(m => m.code === code && m.status === 'Absent').length;

        // Adjusted includes today's classes
        const adjAtt = baseAtt + histCount;
        const adjTot = baseTot + histCount + histAbsent;
        const adjPct = adjTot === 0 ? 0 : (adjAtt / adjTot * 100);

        const diff = adjPct - basePct;
        const diffStr = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
        const diffCol = diff > 0.05 ? 'text-emerald-400' : diff < -0.05 ? 'text-rose-400' : 'text-gray-500';

        html += `
            <div class="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div class="flex-1 min-w-0 pr-3">
                    <p class="text-[11px] font-bold text-white truncate">${subRaw.name}</p>
                    <span class="text-[9px] font-black text-emerald-400/70">${histCount} P / ${histAbsent} A Today</span>
                </div>
                <div class="text-right">
                    <p class="text-[13px] font-black text-indigo-300">${adjPct.toFixed(1)}%</p>
                    <p class="text-[9px] font-bold ${diffCol}">${diffStr}</p>
                </div>
            </div>
        `;
    });

    l.innerHTML = html;
}

function initManual() {
    renderManualComparison();
}

function toggleManualView(el) {
    state.viewManualAdjusted = el.checked;
    localStorage.setItem(`bunker_view_manual_${state.rollNumber}`, state.viewManualAdjusted);
    renderManualComparison();
    showToast(state.viewManualAdjusted ? 'Showing manual-adjusted view' : 'Showing original attendance');
}

function renderManualComparison() {
    const container = document.getElementById('manual-comparison-container');
    if (!container) return;

    if (state.subjects.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Helper: compute base stats honoring the current attendance mode (no manual)
    function getBaseStats(sub) {
        let baseAtt = sub.attended;
        let baseTot = sub.total;
        if (state.college === 'PSGTECH') {
            if (state.attendanceMode === 'exemp') {
                baseTot = Math.max(sub.total - (sub.exemption || 0), sub.attended);
            } else if (state.attendanceMode === 'medical') {
                const pctMed = sub.pct_medical || 0;
                baseTot = pctMed > 0 ? Math.round(sub.attended / (pctMed / 100)) : sub.total;
            }
        }
        return { baseAtt, baseTot };
    }

    const modeLabel = { normal: 'Official', exemp: '+Exemption', medical: '+Medical' };
    const officialLabel = modeLabel[state.attendanceMode] || 'Official';

    // ALWAYS show manual-adjusted side-by-side comparison
    const hasManual = state.manual.length > 0;
    let html = `<div class="mb-2">
        <p class="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3 ml-1">Attendance Comparison <span class="text-violet-400 ml-1">(${officialLabel} vs Manual)</span></p>`;

    if (!hasManual) {
        html += `<div class="text-center text-xs text-gray-700 italic py-4">Add manual entries to see comparison</div>`;
    } else {
        state.subjects.forEach(sub => {
            const { baseAtt, baseTot } = getBaseStats(sub);
            const origPct = baseTot === 0 ? 0 : (baseAtt / baseTot * 100);

            // Apply manual adjustments on top of mode-aware base
            const manualEntries = state.manual.filter(x => x.code === sub.code);
            const manualPresent = manualEntries.filter(x => x.status === 'Present').length;
            const manualAbsent = manualEntries.filter(x => x.status === 'Absent').length;
            const adjAtt = baseAtt + manualPresent;
            const adjTot = baseTot + manualPresent + manualAbsent;
            const adjPct = adjTot === 0 ? 0 : (adjAtt / adjTot * 100);

            const origStr = origPct.toFixed(1);
            const adjStr = adjPct.toFixed(1);
            const diff = adjPct - origPct;
            const diffStr = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
            const diffCol = diff > 0.05 ? 'text-emerald-400' : diff < -0.05 ? 'text-rose-400' : 'text-gray-500';
            const origCol = origPct >= 75 ? 'text-gray-400' : 'text-rose-400/70';
            const adjCol = adjPct >= 75 ? 'text-violet-400' : 'text-rose-400';

            html += `<div class="p-3 rounded-xl bg-white/5 border border-white/5 mb-2">
                <p class="text-xs font-bold text-white truncate mb-2">${sub.name}</p>
                <div class="flex items-center justify-between">
                    <div class="text-center">
                        <p class="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">${officialLabel}</p>
                        <p class="text-sm font-black ${origCol}">${origStr}%</p>
                        <p class="text-[9px] text-gray-600">${baseAtt}/${baseTot}</p>
                    </div>
                    <div class="flex flex-col items-center">
                        <i class="fas fa-arrow-right text-gray-700 text-xs mb-1"></i>
                        <span class="text-[10px] font-black ${diffCol}">${diffStr}</span>
                    </div>
                    <div class="text-center">
                        <p class="text-[9px] text-violet-400 uppercase tracking-wider mb-0.5">With Manual</p>
                        <p class="text-sm font-black ${adjCol}">${adjStr}%</p>
                        <p class="text-[9px] text-gray-600">${adjAtt}/${adjTot}</p>
                    </div>
                </div>
            </div>`;
        });
    }
    html += '</div>';
    container.innerHTML = html;
}


function toggleManualImpact(el) {
    if (el) state.includeManual = el.checked;
    else state.includeManual = !state.includeManual;

    saveState();

    // Update all UI components to reflect changes
    renderSemesterHero();
    renderWidgets();
    renderSubjects();
    initPlanner(); // Planner might show impact stats if we add that later

    // Feedback
    if (state.includeManual) {
        showToast('Manual entries included in attendance');
    } else {
        showToast('Manual entries excluded from attendance');
    }
}

function parseOfficialUpdateDateISO(rawStr) {
    if (!rawStr || rawStr === 'No data' || rawStr === '-' || rawStr === 'Unknown') return null;
    const clean = String(rawStr).trim();
    // 1. YYYY-MM-DD
    const ymd = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
        return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;
    }
    // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (common in eCampus)
    const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
        return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
    }
    // 3. Formatted strings like "Oct 25, 2026"
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return null;
}

function cleanupManualEntries() {
    // Automatically delete Smart Tracker entries up to AND including the official eCampus attendance updated date.
    // Example: if marked from 20th to 27th and eCampus attendance updated date is 25th,
    // all entries with dateISO <= 25th (20th..25th inclusive) are deleted automatically, keeping 26th..27th.
    if (!Array.isArray(state.manual) || state.manual.length === 0) return;

    const lastUpdateStr = localStorage.getItem('bunker_last_update');
    const lastUpdateISO = parseOfficialUpdateDateISO(lastUpdateStr);

    let modified = false;
    const cleaned = [];

    for (const m of state.manual) {
        if (!m) continue;
        const entryDateISO = resolveManualEntryDateKey(m);
        const periodNum = extractEntryPeriodNumber(m);

        // If official attendance update date exists and entry date is <= lastUpdateISO (up to and on that date), delete it
        if (lastUpdateISO && /^\d{4}-\d{2}-\d{2}$/.test(entryDateISO) && entryDateISO <= lastUpdateISO) {
            modified = true;
            continue;
        }

        // Normalize entry to only store dateISO & period (strip any legacy timestamp/click time)
        if (m.timestamp !== undefined || m.time !== undefined || m.dateISO !== entryDateISO || m.period !== periodNum) {
            modified = true;
        }
        cleaned.push({
            id: m.id || (Date.now() + Math.random()),
            code: m.code,
            name: m.name,
            status: m.status,
            dateISO: /^\d{4}-\d{2}-\d{2}$/.test(entryDateISO) ? entryDateISO : m.dateISO,
            period: periodNum
        });
    }

    if (modified || cleaned.length !== state.manual.length) {
        state.manual = cleaned;
        saveState();
        initManual();
    }
}

function deleteManual(id) {
    state.manual = state.manual.filter(x => x.id !== id);
    saveState();
    // Update UI components without switching tab
    renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();
}

function switchTab(id, index) {
    // Aliasing academics -> others
    if (id === 'academics') {
        id = 'others';
        index = 3;
    }

    // Subtle tactile feedback on supported devices (Android Chrome/WebView)
    try {
        if (window.navigator && typeof window.navigator.vibrate === 'function') {
            window.navigator.vibrate(8);
        }
    } catch (_) {}

    // Get current active tab and target tab
    const currentTab = document.querySelector('.tab-content.active');
    const newTab = document.getElementById(`tab-${id}`);

    // Update navigation items active class
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(e => e.classList.remove('active'));
    const targetNav = document.getElementById(`nav-${id}`);
    if (targetNav) targetNav.classList.add('active');

    // Smoothly position dock glow via GPU transform
    updateNavGlow(id);

    // If already on this tab, smoothly scroll to top (like native mobile apps)
    if (currentTab === newTab) {
        if (id === 'others') {
            closeOthersSubView();
        }
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
    }

    // Switch active tab view
    if (currentTab) {
        currentTab.classList.remove('active');
    }
    if (newTab) {
        newTab.classList.add('active');
    }

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }

    let t = "Dashboard";
    const roll = state.rollNumber || localStorage.getItem('bunker_roll');

    if (id === 'home') {
        const td = getToday();
        const ev = ACADEMIC_DATA.fullCalendar.find(e => new Date(e.date).toDateString() === td.toDateString());
        if (ev) t = ev.type === 'Holiday' ? "Holiday! 🌴" : ev.type === 'Exam' ? "Exam Day! 🍀" : "Busy Day! 📚";
        else if (td.getDay() === 0 || td.getDay() === 6) t = "Weekend Vibes 🎉";
    }
    else if (id === 'calendar') {
        t = "Timeline";
        // Always fetch calendar directly from phone so any calendar update reflects immediately (falls back to Vercel if direct fails)
        if (roll) {
            fetchCalendarPhoneDirect(roll, state.subjects, true).then(data => {
                if (data) {
                    initAcademicCalendar();
                    renderSemesterHero();
                }
            });
        }
    }
    else if (id === 'planner') {
        t = "Smart Tracker";
        // Timetable only changes once per semester! Only fetch if missing or if the student's semester changed
        if (roll) {
            const curSem = String(detectCurrentSemesterFromSubjects(state.subjects) || (state.rollNumber ? getDefaultSemesterForRoll(state.rollNumber) : 1));
            const storedTtSem = localStorage.getItem(`bunker_tt_sem_${roll}`);
            const hasTt = state.timetable && Object.keys(state.timetable).length > 0 &&
                          Object.values(state.timetable).some(d => d && d.length > 0 && d.some(x => x !== 'Free'));
            if (!hasTt || (storedTtSem && storedTtSem !== curSem)) {
                checkAndUpdateTimetableSilently(roll);
            }
        }
    }
    else if (id === 'others') {
        t = "Others";
        closeOthersSubView();
        hydrateAcademicsFromPhoneCache();
        renderOthersOverview();

        // Lazy on-demand fetch: only hit /api/academics on tapping Others if phone has no cached marks yet
        if (roll) {
            if (!state.academics || !state.academics.loaded) {
                setTimeout(() => loadAcademics(false, false, 'all'), 100);
            } else {
                document.getElementById('acad-loading')?.classList.add('hidden');
            }
        }
    }
    const greetingEl = document.getElementById('greeting-text');
    if (greetingEl) greetingEl.innerText = t;
}

function openOthersSubView(subview) {
    const hub = document.getElementById('others-hub');
    const internalsView = document.getElementById('others-subview-internals');
    const resultsView = document.getElementById('others-subview-results');
    if (!hub) return;

    hydrateAcademicsFromPhoneCache();
    hub.classList.add('hidden');

    const roll = state.rollNumber || (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}').roll; } catch { return null; } })();
    const now = Date.now();

    if (subview === 'internals') {
        if (resultsView) resultsView.classList.add('hidden');
        if (internalsView) internalsView.classList.remove('hidden');
        document.getElementById('acad-panel-internals')?.classList.remove('hidden');

        let internalsVaultTs = 0;
        try {
            const rawInt = roll ? localStorage.getItem(`bunker_internals_vault_${roll}`) : null;
            if (rawInt) internalsVaultTs = JSON.parse(rawInt).timestamp || 0;
        } catch {}
        const isInternalsStale = (now - internalsVaultTs) > (24 * 60 * 60 * 1000);

        if (state.academics && state.academics.internals && state.academics.internals.length > 0) {
            renderInternals(state.academics.internals);
            if (isInternalsStale && !state.academics.loading) {
                loadAcademics(false, true, 'internals');
            }
        } else if (!state.academics || !state.academics.loading) {
            loadAcademics(false, false, 'internals');
        }
    } else if (subview === 'results') {
        if (internalsView) internalsView.classList.add('hidden');
        if (resultsView) resultsView.classList.remove('hidden');
        document.getElementById('acad-panel-results')?.classList.remove('hidden');

        if (state.academics && state.academics.gpa) {
            renderGPA(state.academics.gpa);
        }
        if (state.academics && state.academics.cgpa) {
            renderCGPA(state.academics.cgpa);
        }
        if ((!state.academics || (!state.academics.gpa && !state.academics.cgpa)) && (!state.academics || !state.academics.loading)) {
            loadAcademics(false, false, 'results');
        }
    }

    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;
}

function closeOthersSubView() {
    const hub = document.getElementById('others-hub');
    const internalsView = document.getElementById('others-subview-internals');
    const resultsView = document.getElementById('others-subview-results');
    if (internalsView) internalsView.classList.add('hidden');
    if (resultsView) resultsView.classList.add('hidden');
    if (hub) hub.classList.remove('hidden');

    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;
}

// --- PSG Tech Branch & Student Info Resolver ---
const PSGTECH_BRANCH_MAP = {
    'A': { degree: 'B.E.', name: 'Automobile Engineering', years: 4 },
    'C': { degree: 'B.E.', name: 'Civil Engineering', years: 4 },
    'D': { degree: 'B.E.', name: 'Biomedical Engineering', years: 4 },
    'E': { degree: 'B.E.', name: 'Electrical & Electronics Engineering', years: 4 },
    'L': { degree: 'B.E.', name: 'Electronics & Communication Engineering', years: 4 },
    'M': { degree: 'B.E.', name: 'Mechanical Engineering', years: 4 },
    'N': { degree: 'B.E.', name: 'Computer Science (AI & ML)', years: 4 },
    'P': { degree: 'B.E.', name: 'Production Engineering', years: 4 },
    'R': { degree: 'B.E.', name: 'Robotics & Automation', years: 4 },
    'U': { degree: 'B.E.', name: 'Instrumentation & Control Engineering', years: 4 },
    'Y': { degree: 'B.E.', name: 'Metallurgical Engineering', years: 4 },
    'Z': { degree: 'B.E.', name: 'Computer Science & Engineering', years: 4 },
    'CS': { degree: 'B.E.', name: 'Computer Science & Engineering', years: 4 },
    'K': { degree: 'B.E. (Sandwich)', name: 'Mechanical Engineering (Sandwich)', years: 5, sandwich: true },
    'ES': { degree: 'B.E. (Sandwich)', name: 'Electrical & Electronics (Sandwich)', years: 5, sandwich: true },
    'SW': { degree: 'B.E. (Sandwich)', name: 'Sandwich Engineering Program', years: 5, sandwich: true },
    'B': { degree: 'B.Tech', name: 'Biotechnology', years: 4 },
    'H': { degree: 'B.Tech', name: 'Fashion Technology', years: 4 },
    'I': { degree: 'B.Tech', name: 'Information Technology', years: 4 },
    'T': { degree: 'B.Tech', name: 'Textile Technology', years: 4 },
    'S': { degree: 'B.Sc', name: 'Applied Science', years: 3 },
    'X': { degree: 'B.Sc', name: 'Computer Systems & Design / Other B.Sc.', years: 3 },
    'SA': { degree: 'M.Sc (Integrated)', name: 'Software Systems / Applied Science', years: 5 },
    'FD': { degree: 'M.Sc (Integrated)', name: 'Data Science / Fashion Design', years: 5 },
    'XW': { degree: 'M.Sc (Integrated)', name: 'Cyber Security', years: 5 },
    'XT': { degree: 'M.Sc (Integrated)', name: 'Theoretical Computer Science / Textile Science', years: 5 },
    'XD': { degree: 'M.Sc (Integrated)', name: 'Decision & Computing Sciences / Data Science', years: 5 },
    'XC': { degree: 'M.Sc (Integrated)', name: 'Theoretical Computer Science / Chemistry', years: 5 },
    'MX': { degree: 'M.C.A.', name: 'Master of Computer Applications', years: 2 },
    'AE': { degree: 'M.E.', name: 'Automotive Engineering', years: 2 },
    'BT': { degree: 'M.E.', name: 'Biotechnology', years: 2 },
    'CS': { degree: 'M.E.', name: 'Computer Science & Engineering', years: 2 },
    'ED': { degree: 'M.E.', name: 'Engineering Design', years: 2 },
    'EE': { degree: 'M.E.', name: 'Embedded & Real-Time Systems', years: 2 },
    'LN': { degree: 'M.E.', name: 'VLSI Design', years: 2 },
    'LV': { degree: 'M.E.', name: 'Communication Systems', years: 2 },
    'MD': { degree: 'M.E.', name: 'Manufacturing Engineering / Mechanical Design', years: 2 },
    'MN': { degree: 'M.E.', name: 'Mechatronics', years: 2 },
    'NB': { degree: 'M.E.', name: 'Biometrics & Cybersecurity', years: 2 },
    'PP': { degree: 'M.E.', name: 'Power Systems / Production', years: 2 },
    'SE': { degree: 'M.E.', name: 'Structural Engineering', years: 2 },
    'TT': { degree: 'M.E.', name: 'Textile Technology', years: 2 },
    'UC': { degree: 'M.E.', name: 'Control Systems', years: 2 },
    'ZC': { degree: 'M.E.', name: 'Computer Science & Engineering', years: 2 },
    'CE': { degree: 'M.Tech', name: 'Chemical Engineering', years: 2 },
    'EC': { degree: 'M.Tech', name: 'Electronics & Communication', years: 2 },
    'IT': { degree: 'M.Tech', name: 'Information Technology', years: 2 },
    'GM': { degree: 'M.B.A.', name: 'MBA General Management', years: 2 },
    'GW': { degree: 'M.B.A.', name: 'MBA Specializations', years: 2 }
};

function parseStudentInfoFromRoll(rawRoll) {
    if (!rawRoll) return null;
    let roll = String(rawRoll).trim().toUpperCase();
    if (roll === 'DEMO') {
        return {
            roll: 'DEMO',
            branchName: 'Computer Science & Engineering',
            degree: 'B.E.',
            displayBranch: 'B.E. Computer Science & Engineering',
            yearOfStudy: 'Final Year',
            batch: '2022 - 2026',
            meta: 'Final Year • Batch 2022-2026 • eCampus Synced'
        };
    }
    // Clean potential prefix
    roll = roll.replace(/^D(\d{2}[A-Z])/i, '$1');
    const mYear = roll.match(/^(\d{2})/);
    if (!mYear) {
        return {
            roll: roll,
            branchName: 'PSG College of Technology',
            degree: 'Student',
            displayBranch: 'PSG College of Technology',
            yearOfStudy: '',
            batch: '',
            meta: 'eCampus Synced'
        };
    }

    const admYear = 2000 + parseInt(mYear[1], 10);
    const mLetters = roll.substring(2).match(/[A-Z]+/);
    const branchLetters = mLetters ? mLetters[0] : '';
    let branchInfo = null;

    if (branchLetters.length >= 2) {
        const code2 = branchLetters.substring(0, 2);
        if (PSGTECH_BRANCH_MAP[code2]) {
            branchInfo = PSGTECH_BRANCH_MAP[code2];
        } else if (code2 === 'PT') {
            branchInfo = PSGTECH_BRANCH_MAP['P'];
        }
    }
    if (!branchInfo && branchLetters.length >= 1 && PSGTECH_BRANCH_MAP[branchLetters.charAt(0)]) {
        branchInfo = PSGTECH_BRANCH_MAP[branchLetters.charAt(0)];
    }

    const degree = branchInfo ? branchInfo.degree : 'B.E.';
    const branchName = branchInfo ? branchInfo.name : 'Engineering & Technology';
    const totalYears = branchInfo ? (branchInfo.years || 4) : 4;
    const endYear = admYear + totalYears;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const acadYear = currentMonth >= 7 ? currentYear : currentYear - 1;
    const yearNum = Math.max(1, Math.min(totalYears, acadYear - admYear + 1));
    const yearLabels = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year' };
    const yearLabel = (yearNum === totalYears && totalYears > 1) ? 'Final Year' : (yearLabels[yearNum] || `Year ${yearNum}`);

    return {
        roll: roll,
        branchName: branchName,
        degree: degree,
        displayBranch: `${degree} ${branchName}`,
        yearOfStudy: yearLabel,
        batch: `${admYear} - ${endYear}`,
        meta: `${degree} ${branchName} • ${yearLabel}`
    };
}

function clearBunkerCache() {
    if (!confirm("Clear Bunker's offline cached records and re-sync fresh from eCampus?\n\nYour login credentials and roll number will be safely preserved.")) {
        return;
    }
    try {
        const roll = (typeof state !== 'undefined' && state.rollNumber) || localStorage.getItem('bunker_roll');
        const creds = localStorage.getItem('bunker_credentials');
        const attMode = roll ? localStorage.getItem(`bunker_att_mode_${roll}`) : null;

        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('bunker_') || key.startsWith('psg_') || key.startsWith('acad_'))) {
                if (key !== 'bunker_credentials' && key !== 'bunker_roll') {
                    keysToRemove.push(key);
                }
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        sessionStorage.clear();

        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }

        if (roll) localStorage.setItem('bunker_roll', roll);
        if (creds) localStorage.setItem('bunker_credentials', creds);
        if (attMode && roll) localStorage.setItem(`bunker_att_mode_${roll}`, attMode);

        showToast('🧹 Cache cleared! Refreshing clean records...', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 500);
    } catch (e) {
        console.error('Clear cache error:', e);
        window.location.reload();
    }
}

function renderOthersOverview() {
    // 1. Always update Student Profile & Academic Identity
    const roll = (typeof state !== 'undefined' && state.rollNumber) || localStorage.getItem('bunker_roll') || '';
    if (roll) {
        const studentInfo = parseStudentInfoFromRoll(roll);
        const profileRollEl = document.getElementById('others-profile-roll');
        const profileBranchEl = document.getElementById('others-profile-branch');
        const profileMetaEl = document.getElementById('others-profile-meta');
        const settingsRollEl = document.getElementById('settings-roll');

        if (profileRollEl) profileRollEl.textContent = studentInfo ? studentInfo.roll : roll;
        if (profileBranchEl) profileBranchEl.remove();
        if (profileMetaEl) profileMetaEl.textContent = studentInfo ? studentInfo.meta : 'PSG College of Technology';
        if (settingsRollEl) settingsRollEl.textContent = roll;
    }

    // 2. Render Attendance Comparison card preview
    renderAttendanceComparisonCard();

    // 3. Render Academic Standing & GPA/CGPA summary ONLY after data arrives
    const acadCard = document.getElementById('others-academic-card');
    const loadingCard = document.getElementById('others-cgpa-loading');
    const errorCard = document.getElementById('others-cgpa-error');
    const errorMsgEl = document.getElementById('others-cgpa-error-msg');

    const cgpaData = state.academics ? state.academics.cgpa : null;
    const gpaData = state.academics ? state.academics.gpa : null;
    const hasCgpaSubs = (cgpaData && Array.isArray(cgpaData.all_subjects) && cgpaData.all_subjects.length > 0) ||
                        (gpaData && Array.isArray(gpaData.table || gpaData.all_subjects) && (gpaData.table || gpaData.all_subjects).length > 0);
    const hasStudyingSubs = gpaData && Array.isArray(gpaData.studying_courses) && gpaData.studying_courses.length > 0;
    const hasCgpaOrGpaData = Boolean(hasCgpaSubs || hasStudyingSubs || (cgpaData && cgpaData.cgpa && cgpaData.cgpa !== '--') || (gpaData && gpaData.gpa && gpaData.gpa !== '--'));

    const valEl = document.getElementById('others-cgpa-value');
    const subEl = document.getElementById('others-cgpa-sub');
    const badgeEl = document.getElementById('others-cgpa-badge');
    const chipsList = document.getElementById('others-sem-chips-list');
    const resultsPillEl = document.getElementById('others-results-pill');
    const resultsDescEl = document.getElementById('others-results-desc');

    // Always update internal card status & predictor summary if available
    const internalsDesc = document.getElementById('others-internals-desc');
    const internalsPill = document.getElementById('others-internals-pill');
    const predictorSub = document.getElementById('others-predictor-sub');
    if (state.academics && state.academics.internals && Array.isArray(state.academics.internals) && state.academics.internals.length > 0) {
        const validSubs = state.academics.internals.filter(s => s.course_code);
        const updatedSubs = validSubs.filter(s => !isNaN(parseFloat(s.total)) || (s.row_data && s.row_data.some(v => v && v !== '*' && v !== '')));
        if (internalsPill) {
            internalsPill.textContent = `${updatedSubs.length}/${validSubs.length} In`;
        }
        if (internalsDesc) {
            internalsDesc.textContent = `${validSubs.length} courses • Tap to simulate CA & Sem marks`;
        }
        if (predictorSub) {
            const theorySubs = validSubs.filter(s => !s.is_lab && !isZeroCreditCourse(s.course_code));
            if (theorySubs.length > 0) {
                predictorSub.textContent = `${theorySubs.length} theory courses synced • Tap to check 40:60 exam targets`;
            }
        }
    }

    if (!hasCgpaOrGpaData) {
        // Hide the CGPA/GPA card until data arrives
        if (acadCard) acadCard.classList.add('hidden');
        if (state.academics && state.academics.error) {
            if (loadingCard) loadingCard.classList.add('hidden');
            if (errorCard) errorCard.classList.remove('hidden');
            if (errorMsgEl) errorMsgEl.textContent = state.academics.errorMsg || 'Failed to fetch CGPA & GPA';
        } else {
            if (errorCard) errorCard.classList.add('hidden');
            if (loadingCard) loadingCard.classList.remove('hidden');
        }
        return;
    }

    // Data has arrived: hide loading & error states, reveal CGPA/GPA card
    if (loadingCard) loadingCard.classList.add('hidden');
    if (errorCard) errorCard.classList.add('hidden');

    // If a 1st-semester student only has studying_courses and 0 completed semester results, hide the CGPA card rather than showing '--'
    if (!hasCgpaSubs && hasStudyingSubs) {
        if (acadCard) acadCard.classList.add('hidden');
        return;
    }

    if (acadCard) acadCard.classList.remove('hidden');

    const rawCgpa = (cgpaData && cgpaData.cgpa) || (gpaData && (gpaData.overall_cgpa || gpaData.gpa));
    const hasRA = rawCgpa === 'RA' || rawCgpa === '***' || (cgpaData && (cgpaData.has_ra || cgpaData.has_arrears)) || (gpaData && gpaData.has_arrears);
    const cgpa = hasRA ? '***' : (typeof rawCgpa === 'number' ? rawCgpa.toFixed(2) : rawCgpa);
    const numCGPA = parseFloat(rawCgpa);

    if (valEl) {
        valEl.textContent = cgpa;
        valEl.style.color = hasRA ? '#EF4444' : numCGPA >= 8.5 ? '#10B981' : numCGPA >= 7.0 ? '#6366f1' : numCGPA >= 5.0 ? '#F59E0B' : '#EF4444';
    }

    // Update Academic Standing Badge
    if (badgeEl) {
        if (hasRA) {
            badgeEl.textContent = 'Arrears Recorded';
            badgeEl.className = 'text-[8px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider';
        } else if (!isNaN(numCGPA) && numCGPA >= 8.5) {
            badgeEl.textContent = '★ Distinction';
            badgeEl.className = 'text-[8px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider';
        } else if (!isNaN(numCGPA) && numCGPA >= 6.5) {
            badgeEl.textContent = 'First Class';
            badgeEl.className = 'text-[8px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider';
        } else if (!isNaN(numCGPA) && numCGPA >= 5.0) {
            badgeEl.textContent = 'Second Class';
            badgeEl.className = 'text-[8px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider';
        } else {
            badgeEl.textContent = 'Overall';
            badgeEl.className = 'text-[8px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider';
        }
    }

    const resultsCgpaPill = document.getElementById("results-cgpa-pill");
    if (resultsCgpaPill && cgpa) {
        resultsCgpaPill.innerText = `CGPA ${cgpa}`;
        resultsCgpaPill.classList.remove('hidden');
    }

    const totalCredits = (cgpaData && cgpaData.total_credits) || (gpaData && gpaData.total_credits);
    const semData = (cgpaData && cgpaData.semwise_data) || [];
    if (subEl) {
        if (totalCredits) {
            subEl.textContent = `${totalCredits} Credits Earned • ${semData.length || 1} Semester${semData.length === 1 ? '' : 's'} Completed`;
        } else {
            subEl.textContent = `Cumulative Academic Performance`;
        }
    }

    if (resultsPillEl && semData.length > 0) {
        const latest = semData[semData.length - 1];
        resultsPillEl.textContent = `S${latest.sem}: ${latest.sgpa}`;
    }
    if (resultsDescEl && totalCredits) {
        resultsDescEl.textContent = `${totalCredits} earned credits across ${semData.length || 1} sem(s)`;
    }

    // Populate all semester GPA chips
    if (chipsList) {
        const semwiseGPA = (gpaData && gpaData.semwise_gpa) || {};

        if (semData.length > 0) {
            chipsList.innerHTML = semData.map(d => {
                const g = parseFloat(d.sgpa);
                const isRA = d.sgpa === 'RA' || isNaN(g) || d.has_ra;
                const color = isRA ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : g >= 8.5 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : g >= 7   ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                            : g >= 5   ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            :            'text-rose-400 bg-rose-500/10 border-rose-500/20';
                return `<button type="button" onclick="openOthersSubView('results'); setTimeout(() => selectSemesterGPA(${d.sem}), 100)" class="min-w-[54px] flex flex-col items-center px-3 py-1.5 rounded-xl border ${color} active:scale-95 transition-all cursor-pointer shrink-0">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-70">Sem ${d.sem}</span>
                    <span class="text-xs font-black leading-tight tabular-nums">${d.sgpa}</span>
                </button>`;
            }).join('');
        } else if (Object.keys(semwiseGPA).length > 0) {
            chipsList.innerHTML = Object.keys(semwiseGPA).sort((a, b) => a - b).map(s => {
                const sGPA = semwiseGPA[s];
                const g = parseFloat(sGPA);
                const isRA = sGPA === 'RA' || isNaN(g);
                const color = isRA ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : g >= 8.5 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : g >= 7   ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                            : g >= 5   ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            :            'text-rose-400 bg-rose-500/10 border-rose-500/20';
                return `<button type="button" onclick="openOthersSubView('results'); setTimeout(() => selectSemesterGPA(${s}), 100)" class="min-w-[54px] flex flex-col items-center px-3 py-1.5 rounded-xl border ${color} active:scale-95 transition-all cursor-pointer shrink-0">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-70">Sem ${s}</span>
                    <span class="text-xs font-black leading-tight tabular-nums">${sGPA}</span>
                </button>`;
            }).join('');
        } else {
            chipsList.innerHTML = '';
        }
    }
}
window.openOthersSubView = openOthersSubView;
window.closeOthersSubView = closeOthersSubView;
window.renderOthersOverview = renderOthersOverview;
window.parseStudentInfoFromRoll = parseStudentInfoFromRoll;
window.clearBunkerCache = clearBunkerCache;

function togglePassword() { const i = document.getElementById('password'); i.type = i.type === 'password' ? 'text' : 'password'; }

function toggleSettings() {
    switchTab('others', 3);
}
function setAttendanceMode(mode) {
    state.attendanceMode = mode;
    saveState();
    // Update button styles on dashboard
    ['normal', 'exemp', 'medical'].forEach(m => {
        const btn = document.getElementById(`att-mode-${m}`);
        if (btn) {
            btn.className = m === mode
                ? 'flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition bg-indigo-600 text-white shadow'
                : 'flex-1 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition bg-white/5 text-gray-400 border border-white/5';
        }
    });
    // Re-render subjects with new mode — including the manual comparison panel
    renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner();
    renderManualComparison(); // Sync manual comparison to new mode
    const labels = { normal: 'Official Attendance', exemp: 'With Exemption', medical: 'With Medical' };
    showToast(`Mode: ${labels[mode]}`);
}

function saveState() {
    if (Array.isArray(state.subjects) && state.subjects.length > 0) {
        localStorage.setItem('bunker_subjects', JSON.stringify(state.subjects));
        if (state.rollNumber) {
            localStorage.setItem(`bunker_subjects_${state.rollNumber}`, JSON.stringify(state.subjects));
            localStorage.setItem(`bunker_previous_attendance_${state.rollNumber}`, JSON.stringify(state.subjects));
        }
    }
    localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
    if (state.rollNumber) {
        localStorage.setItem(`bunker_manual_${state.rollNumber}`, JSON.stringify(state.manual));
        localStorage.setItem(`bunker_include_manual_${state.rollNumber}`, state.includeManual);
        localStorage.setItem(`bunker_view_manual_${state.rollNumber}`, state.viewManualAdjusted);
        localStorage.setItem(`bunker_att_mode_${state.rollNumber}`, state.attendanceMode);
    }
    localStorage.setItem('bunker_roll', state.rollNumber);
    pushWidgetDataToNative();
}

// ============================================================================
// ===== ANDROID APK & TODAY'S CLASS SCHEDULE WIDGET HANDSHAKE ENGINE =====
// ============================================================================

const PSG_PERIOD_SLOTS = [
    { period: 1, start: "08:30", end: "09:20", startMin: 510, endMin: 560 },
    { period: 2, start: "09:20", end: "10:10", startMin: 560, endMin: 610 },
    { period: 3, start: "10:30", end: "11:20", startMin: 630, endMin: 680 },
    { period: 4, start: "11:20", end: "12:10", startMin: 680, endMin: 730 },
    { period: 5, start: "13:40", end: "14:30", startMin: 820, endMin: 870 },
    { period: 6, start: "14:30", end: "15:20", startMin: 870, endMin: 920 },
    { period: 7, start: "15:30", end: "16:20", startMin: 930, endMin: 980 },
    { period: 8, start: "16:20", end: "17:10", startMin: 980, endMin: 1030 },
    { period: 9, start: "17:10", end: "18:00", startMin: 1030, endMin: 1080 }
];

function compileWidgetPayload() {
    try {
        const roll = state.rollNumber || localStorage.getItem('bunker_roll') || '';
        const now = state.simulatedDate ? new Date(state.simulatedDate) : new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const dateISO = (state.selectedDateISO && state.simulatedDate) ? state.selectedDateISO : now.toISOString().split('T')[0];

        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayShort = daysShort[now.getDay()];
        const isWeekend = (now.getDay() === 0 || now.getDay() === 6);

        let isHoliday = isWeekend;
        let holidayTitle = now.getDay() === 0 ? "Sunday" : (now.getDay() === 6 ? "Saturday" : "");
        if (state.calendarCache && state.calendarCache.fullCalendar) {
            const hMatch = state.calendarCache.fullCalendar.find(d => String(d.date || '').startsWith(dateISO) && String(d.type || '').toLowerCase() === 'holiday');
            if (hMatch) {
                isHoliday = true;
                holidayTitle = hMatch.name || hMatch.title || "Holiday";
            }
        }

        const dayClasses = (state.timetable && state.timetable[dayShort]) ? state.timetable[dayShort] : [];
        const classes = [];
        let attendedCount = 0;
        let bunkedCount = 0;
        let upcomingCount = 0;
        let currentPeriodNumber = null;
        let currentClassObj = null;
        let nextPeriodClass = null;

        PSG_PERIOD_SLOTS.forEach((slot, idx) => {
            const code = dayClasses[idx];
            if (!code || code === 'Free') return;

            const s = (state.subjects || []).find(sub => sub.code === code) || {};
            const subStats = (typeof getSubjectStats === 'function') ? getSubjectStats(code) : null;
            const name = (subStats && subStats.name) || s.name || (state.courseMapping && state.courseMapping[code]) || code;

            const att = subStats ? subStats.att : (s.attended || 0);
            const tot = subStats ? subStats.tot : (s.total || 0);
            const pct = subStats ? subStats.pct : (tot > 0 ? (att / tot) * 100 : 0);

            let safeBunks = 0;
            let safe65 = 0;
            if (tot > 0) {
                if (pct >= 75.0) {
                    safeBunks = Math.floor((4 * att - 3 * tot) / 3);
                } else {
                    safeBunks = -Math.ceil(3 * tot - 4 * att);
                }
                safe65 = Math.max(0, Math.floor((20 * att - 13 * tot) / 13));
            }

            const logged = (state.manual || []).find(m =>
                m.code === code &&
                (m.dateISO === dateISO || (m.timestamp && m.timestamp.startsWith(dateISO))) &&
                (m.period === slot.period || !m.period)
            );

            let status = 'upcoming';
            if (logged) {
                status = logged.status === 'Present' ? 'attended' : 'bunked';
                if (status === 'attended') attendedCount++;
                if (status === 'bunked') bunkedCount++;
            } else if (nowMinutes > slot.endMin && !isHoliday) {
                status = 'completed';
            } else {
                upcomingCount++;
            }

            const isOngoing = !isHoliday && (nowMinutes >= slot.startMin && nowMinutes <= slot.endMin);
            const progressPct = isOngoing ? Math.min(100, Math.max(0, Math.round(((nowMinutes - slot.startMin) / Math.max(1, slot.endMin - slot.startMin)) * 100))) : 0;

            const classItem = {
                period: slot.period,
                time: `${slot.start} - ${slot.end}`,
                startMin: slot.startMin,
                endMin: slot.endMin,
                code: code,
                name: name,
                attended: logged ? (logged.status === 'Present') : null,
                status: isOngoing && !logged ? 'ongoing' : status,
                progressPct: progressPct,
                safeBunks: safeBunks,
                safe65: safe65,
                attendancePct: parseFloat(pct.toFixed(1)),
                totalHours: tot,
                attendedHours: att
            };

            if (isOngoing) {
                currentPeriodNumber = slot.period;
                currentClassObj = classItem;
            }

            if (!nextPeriodClass && !isHoliday && nowMinutes < slot.startMin) {
                nextPeriodClass = {
                    period: slot.period,
                    code: code,
                    name: name,
                    time: `${slot.start} - ${slot.end}`,
                    startsInMin: slot.startMin - nowMinutes,
                    safeBunks: safeBunks,
                    attendancePct: parseFloat(pct.toFixed(1))
                };
            }

            classes.push(classItem);
        });

        let lowestPct = 100;
        let totalSafe = 0;
        (state.subjects || []).forEach(sub => {
            const st = getSubjectStats(sub.code);
            const p = st ? st.pct : (sub.percentage || 0);
            if (p < lowestPct) lowestPct = p;
            const sb = st && st.tot > 0 ? Math.max(0, Math.floor((4 * st.att - 3 * st.tot) / 3)) : 0;
            totalSafe += sb;
        });
        if (!state.subjects || state.subjects.length === 0) lowestPct = 0;

        return {
            v: 2,
            roll: roll,
            timestamp: Date.now(),
            day: dayShort,
            date: dateISO,
            isHoliday: isHoliday,
            holidayTitle: holidayTitle,
            currentPeriod: currentPeriodNumber,
            currentClass: currentClassObj,
            nextClass: nextPeriodClass,
            classes: classes,
            summary: {
                totalClassesToday: classes.length,
                attendedCount: attendedCount,
                bunkedCount: bunkedCount,
                upcomingCount: upcomingCount,
                lowestPct: parseFloat(lowestPct.toFixed(1)),
                totalSafeBunks: totalSafe,
                attendanceMode: state.attendanceMode || 'normal'
            }
        };
    } catch (e) {
        console.warn('Error compiling widget payload:', e);
        return null;
    }
}

function updateOthersWidgetLivePreview() {
    const nowTxtEl = document.getElementById('others-widget-now-txt');
    const badgeEl = document.getElementById('others-widget-live-badge');
    if (!nowTxtEl) return;

    const payload = compileWidgetPayload();
    if (!payload) return;

    if (payload.currentClass) {
        nowTxtEl.innerHTML = `<b class="text-emerald-300">NOW (P${payload.currentClass.period}):</b> ${payload.currentClass.name} • <span class="text-white">${payload.currentClass.attendancePct}%</span>`;
        if (badgeEl) badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>P${payload.currentClass.period} Live</span>`;
    } else if (payload.nextClass) {
        nowTxtEl.innerHTML = `<b class="text-indigo-300">NEXT (P${payload.nextClass.period}):</b> ${payload.nextClass.name} (${payload.nextClass.time})`;
        if (badgeEl) badgeEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span><span>In ${payload.nextClass.startsInMin}m</span>`;
    } else if (payload.isHoliday) {
        nowTxtEl.innerHTML = `<span class="text-amber-300">${payload.holidayTitle || 'No classes scheduled today'}</span> • Tap for full bell radar`;
    } else {
        nowTxtEl.innerHTML = `${payload.classes.length} classes on ${payload.day} • Tap to open Live Class Radar Widget`;
    }
}

function openLiveWidgetModal() {
    const modal = document.getElementById('live-widget-modal');
    if (!modal) return;
    renderLiveClassWidgetModal();
    modal.classList.remove('hidden');
}
window.openLiveWidgetModal = openLiveWidgetModal;

function closeLiveWidgetModal() {
    const modal = document.getElementById('live-widget-modal');
    if (modal) modal.classList.add('hidden');
}
window.closeLiveWidgetModal = closeLiveWidgetModal;

function renderLiveClassWidgetModal() {
    const body = document.getElementById('live-widget-modal-body');
    const clockLabel = document.getElementById('live-widget-clock-label');
    if (!body) return;

    const payload = compileWidgetPayload();
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (clockLabel && payload) {
        clockLabel.innerText = `${payload.day} • ${nowTimeStr} • ${payload.classes.length} Periods`;
    }

    if (!payload) {
        body.innerHTML = `<div class="p-6 text-center text-xs text-gray-400">Unable to load widget schedule.</div>`;
        return;
    }

    let html = '';

    // 1. Live Now / Next Class Spotlight Card
    if (payload.currentClass) {
        const cur = payload.currentClass;
        const bunkBadge = cur.safeBunks > 0
            ? `<span class="text-[9px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">Safe to bunk ${cur.safeBunks}p</span>`
            : cur.safeBunks === 0
            ? `<span class="text-[9px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">On 75% Edge</span>`
            : `<span class="text-[9px] font-black text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30">Need ${Math.abs(cur.safeBunks)}p for 75%</span>`;

        html += `
        <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Live Now • Period ${cur.period} (${cur.time})</span>
                </span>
                <span class="text-xs font-black text-white">${cur.attendancePct}%</span>
            </div>
            <div>
                <h4 class="text-sm font-black text-white">${cur.name}</h4>
                <p class="text-[10px] text-gray-300 font-bold mt-0.5">${cur.code} • Attended ${cur.attendedHours}/${cur.totalHours} periods</p>
            </div>
            <div class="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                <div class="h-full bg-emerald-400 rounded-full" style="width:${cur.progressPct}%"></div>
            </div>
            <div class="flex items-center justify-between pt-1">
                ${bunkBadge}
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="nativeActionMarkPeriod('${cur.code}','Present',${cur.period}); renderLiveClassWidgetModal();" class="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[9px] font-black uppercase">✓ Present</button>
                    <button type="button" onclick="nativeActionMarkPeriod('${cur.code}','Absent',${cur.period}); renderLiveClassWidgetModal();" class="px-2.5 py-1 rounded-lg bg-rose-500/80 text-white text-[9px] font-black uppercase">✕ Bunk</button>
                </div>
            </div>
        </div>`;
    } else if (payload.nextClass) {
        const nxt = payload.nextClass;
        html += `
        <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-3">
            <div class="min-w-0">
                <span class="text-[9px] font-black uppercase tracking-widest text-indigo-300">Up Next in ${nxt.startsInMin} min • P${nxt.period}</span>
                <h4 class="text-sm font-black text-white truncate mt-0.5">${nxt.name}</h4>
                <p class="text-[10px] text-gray-400 font-bold mt-0.5">${nxt.time} • Current: <b class="text-white">${nxt.attendancePct}%</b></p>
            </div>
            <div class="text-right shrink-0">
                <span class="text-xs font-black px-2.5 py-1 rounded-xl ${nxt.safeBunks > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}">
                    ${nxt.safeBunks > 0 ? `+${nxt.safeBunks} Safe` : nxt.safeBunks === 0 ? '75% Edge' : `Need ${Math.abs(nxt.safeBunks)}p`}
                </span>
            </div>
        </div>`;
    }

    // 2. Full Day Period-by-Period Bell Schedule List
    if (payload.classes.length === 0) {
        html += `
        <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
            <i class="fas fa-mug-hot text-amber-300 text-xl mb-2"></i>
            <p class="text-xs font-black text-white uppercase tracking-wider">${payload.isHoliday ? payload.holidayTitle : 'No Classes Scheduled Today'}</p>
            <p class="text-[10px] text-gray-400 mt-1">Switch to the Tracker tab to inspect any weekday's timetable.</p>
        </div>`;
    } else {
        html += `<div class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1 pt-1">Today's Bell Timeline (${payload.day})</div>`;
        payload.classes.forEach(item => {
            const isNow = item.status === 'ongoing';
            const statusPill = item.status === 'attended'
                ? `<span class="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Attended</span>`
                : item.status === 'bunked'
                ? `<span class="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Bunked</span>`
                : isNow
                ? `<span class="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-black">Live</span>`
                : `<span class="text-[8px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-gray-400">${item.safeBunks > 0 ? `Safe +${item.safeBunks}` : item.safeBunks === 0 ? 'Edge' : `Need ${Math.abs(item.safeBunks)}p`}</span>`;

            html += `
            <div class="p-3 rounded-2xl ${isNow ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-white/[0.03] border border-white/10'} flex items-center justify-between gap-2.5">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                        <span class="text-[8px] font-bold text-gray-400 uppercase leading-none">P${item.period}</span>
                        <span class="text-[9px] font-black text-white leading-tight mt-0.5">${item.time.split(' - ')[0]}</span>
                    </div>
                    <div class="min-w-0">
                        <h5 class="text-xs font-bold text-white truncate">${item.name}</h5>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[9px] text-gray-400 font-bold">${item.time}</span>
                            <span class="text-[9px] font-black ${item.attendancePct >= 75 ? 'text-emerald-400' : item.attendancePct >= 65 ? 'text-amber-400' : 'text-rose-400'}">${item.attendancePct}%</span>
                        </div>
                    </div>
                </div>
                <div class="shrink-0 flex flex-col items-end gap-1">
                    ${statusPill}
                </div>
            </div>`;
        });
    }

    body.innerHTML = html;
}

function pushWidgetDataToNative() {
    try {
        const payload = compileWidgetPayload();
        if (!payload) return;

        localStorage.setItem('bunker_widget_data', JSON.stringify(payload));
        localStorage.setItem('bunker_widget_last_sync', Date.now().toString());
        updateOthersWidgetLivePreview();

        if (window.AndroidBridge && typeof window.AndroidBridge.syncWidgetData === 'function') {
            window.AndroidBridge.syncWidgetData(JSON.stringify(payload));
        }

        window.dispatchEvent(new CustomEvent('bunker:widget-data-updated', { detail: payload }));
    } catch (e) {
        console.warn('Failed pushing widget data to native bridge:', e);
    }
}

window.getNativeWidgetPayload = function() {
    return JSON.stringify(compileWidgetPayload() || {});
};

window.nativeActionMarkPeriod = function(code, status, period) {
    if (typeof markTimetableAttendance === 'function') {
        markTimetableAttendance(code, status || 'Present', parseInt(period, 10) || 1);
        pushWidgetDataToNative();
        return true;
    }
    return false;
};
function logout() {
    try {
        // Disconnect Android Bridge widget or session if active
        if (window.AndroidBridge && typeof window.AndroidBridge.syncWidgetData === 'function') {
            try {
                window.AndroidBridge.syncWidgetData(JSON.stringify({ roll: '', classes: [], isLoggedOut: true }));
            } catch (e) {}
        }

        // 1. Explicitly clear primary authentication, session, and active cache keys
        const primarySessionKeys = [
            'bunker_credentials',
            'bunker_session_token',
            'bunker_roll',
            'bunker_update_sig',
            'bunker_last_sync_timestamp',
            'bunker_cached_subjects',
            'bunker_cached_timetable',
            'bunker_subjects',
            'bunker_timetable',
            'bunker_course_mapping',
            'bunker_widget_data',
            'bunker_widget_last_sync',
            'bunker_has_calendar',
            'bunker_last_update'
        ];
        primarySessionKeys.forEach(k => {
            try { localStorage.removeItem(k); } catch (e) {}
        });

        // 2. Clear any non-whitelisted remaining keys (W3C standard iteration)
        try {
            const allKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k) allKeys.push(k);
            }
            allKeys.forEach(key => {
                // Keep manual tracking entries and user preferences
                if (key.startsWith('bunker_manual_')) return;
                if (key.startsWith('bunker_include_manual_')) return;
                if (key.startsWith('bunker_view_manual_')) return;
                if (key.startsWith('bunker_att_mode_')) return;
                if (key.startsWith('bunker_features_tour')) return;
                // Clear all stored attendance snapshots and session keys on logout
                try { localStorage.removeItem(key); } catch (e) {}
            });
        } catch (e) {}

        try { sessionStorage.clear(); } catch (e) {}
        state.rollNumber = null;
        state.subjects = [];
        state.previousSubjects = null;
        state.isViewingPreviousAttendance = false;
        state.forceLivePendingView = false;
        state.timetable = {};
    } catch (err) {
        console.warn('Error during logout:', err);
    }

    // Cleanly redirect to root login screen without hash fragments or query params
    window.location.href = window.location.origin + window.location.pathname;
}

function switchToLoginPreview() {
    logout();
}
window.logout = logout;
window.switchToLoginPreview = logout;
function showToast(msg, t = 'info') { const e = document.createElement('div'), c = t === 'error' ? 'bg-rose-500' : 'bg-white text-black'; e.className = `px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 transform translate-y-[-20px] opacity-0 transition-all duration-300 ${c}`; e.innerHTML = `<i class="fas fa-${t === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`; document.getElementById('toast-container').appendChild(e); requestAnimationFrame(() => e.classList.remove('translate-y-[-20px]', 'opacity-0')); setTimeout(() => { e.classList.add('opacity-0', 'translate-y-[-10px]'); setTimeout(() => e.remove(), 300); }, 2500); }

// SIMULATOR FUNCTIONS
let simSubject = null;
let simAddAttend = 0;
let simAddBunk = 0;
let simBaseAtt = 0;
let simBaseTot = 0;
let simBasePct = 0;
let simAbsenceMode = 'leave'; // 'leave' | 'od'

function setSimAbsenceMode(mode) {
    simAbsenceMode = mode === 'od' ? 'od' : 'leave';
    const leaveBtn = document.getElementById('sim-mode-leave');
    const odBtn = document.getElementById('sim-mode-od');
    const bunkLabel = document.getElementById('sim-bunk-label');
    const bunkIcon = document.getElementById('sim-bunk-icon');
    const bunkIconWrap = document.getElementById('sim-bunk-icon-wrap');

    if (leaveBtn && odBtn) {
        if (simAbsenceMode === 'leave') {
            leaveBtn.className = 'flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow transition';
            odBtn.className = 'flex-1 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition';
        } else {
            odBtn.className = 'flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow transition';
            leaveBtn.className = 'flex-1 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition';
        }
    }
    if (bunkLabel) {
        bunkLabel.innerText = simAbsenceMode === 'od' ? 'OD / Exemp' : 'Bunk';
    }
    if (bunkIcon && bunkIconWrap) {
        if (simAbsenceMode === 'od') {
            bunkIcon.className = 'fas fa-id-badge';
            bunkIconWrap.className = 'w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-300 text-xs shrink-0';
        } else {
            bunkIcon.className = 'fas fa-times';
            bunkIconWrap.className = 'w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 text-xs shrink-0';
        }
    }
    updateSimUI();
}
window.setSimAbsenceMode = setSimAbsenceMode;

function openSim(code) {
    const found = state.subjects.find(s => s.code === code);
    if (!found) return;
    simSubject = found;
    window.simSubject = found;

    const stats = getSubjectStats(code);
    if (!stats) return;

    simBaseAtt = stats.att;
    simBaseTot = stats.tot;
    simBasePct = stats.pct;
    simAddAttend = 0;
    simAddBunk = 0;
    simAbsenceMode = 'leave';

    const subjEl = document.getElementById('sim-subject');
    if (subjEl) subjEl.innerText = stats.name || simSubject.name;
    const codeEl = document.getElementById('sim-sub-code');
    if (codeEl) codeEl.innerText = code;
    document.getElementById('val-attend').innerText = '0';
    document.getElementById('val-bunk').innerText = '0';
    setSimAbsenceMode('leave');

    const m = document.getElementById('sim-modal');
    const p = document.getElementById('sim-panel');
    const b = document.getElementById('sim-backdrop');

    m.classList.remove('hidden');
    requestAnimationFrame(() => {
        b.classList.remove('opacity-0');
        p.classList.remove('opacity-0', 'scale-95');
        p.classList.add('scale-100');
    });
}

function resetPredictionSim() {
    if (!simSubject && window.simSubject) {
        simSubject = window.simSubject;
    }
    if (!simSubject) return;

    const stats = getSubjectStats(simSubject.code);
    if (stats) {
        simBaseAtt = stats.att;
        simBaseTot = stats.tot;
        simBasePct = stats.pct;
    }

    simAddAttend = 0;
    simAddBunk = 0;

    const attendEl = document.getElementById('val-attend');
    const bunkEl = document.getElementById('val-bunk');
    if (attendEl) attendEl.innerText = '0';
    if (bunkEl) bunkEl.innerText = '0';

    updateSimUI();
}
window.resetPredictionSim = resetPredictionSim;

function closeSim() {
    const m = document.getElementById('sim-modal');
    const p = document.getElementById('sim-panel');
    const b = document.getElementById('sim-backdrop');

    b.classList.add('opacity-0');
    p.classList.add('opacity-0', 'scale-95');
    p.classList.remove('scale-100');

    setTimeout(() => { m.classList.add('hidden'); }, 300);
}

function updateBunkSim(type, change) {
    if (!simSubject) return;
    if (type === 'attend') {
        simAddAttend = Math.max(0, simAddAttend + change);
        document.getElementById('val-attend').innerText = simAddAttend;
    } else {
        simAddBunk = Math.max(0, simAddBunk + change);
        document.getElementById('val-bunk').innerText = simAddBunk;
    }
    updateSimUI();
}

function updateSimUI() {
    if (!simSubject) return;

    let newAtt, newTot;
    if (simAbsenceMode === 'od') {
        newAtt = simBaseAtt + simAddAttend + simAddBunk;
        newTot = simBaseTot + simAddAttend + simAddBunk;
    } else {
        newAtt = simBaseAtt + simAddAttend;
        newTot = simBaseTot + simAddAttend + simAddBunk;
    }
    const pct = newTot === 0 ? 0 : (newAtt / newTot) * 100;

    const ring = document.getElementById('sim-ring');
    const pctText = document.getElementById('sim-pct');
    const diffText = document.getElementById('sim-diff');
    if (!ring || !pctText) return;

    pctText.innerText = pct.toFixed(1) + '%';

    // Circle radius is 86 => circumference = 2 * PI * 86 = 540.35
    const offset = 540 - (540 * Math.min(100, Math.max(0, pct)) / 100);
    ring.setAttribute('stroke-dashoffset', offset);

    let color;
    const pVal = parseFloat(pct.toFixed(1));
    if (pVal === 100) color = '#22C55E';
    else if (pVal >= 90) color = '#10B981';
    else if (pVal >= 85) color = '#3B82F6';
    else if (pVal >= 80) color = '#EAB308';
    else if (pVal >= 75) color = '#F97316';
    else color = '#EF4444';

    ring.setAttribute('stroke', color);
    ring.style.filter = `drop-shadow(0 0 12px ${color}88)`;
    pctText.style.color = color;
    pctText.style.textShadow = `0 0 24px ${color}55`;

    const diff = pct - simBasePct;
    if (diffText) {
        if (Math.abs(diff) < 0.05) {
            diffText.innerText = 'Current';
            diffText.className = 'text-[9px] font-extrabold px-3 py-0.5 rounded-full bg-white/[0.06] mt-2 uppercase tracking-wider border border-white/10 text-gray-300 tabular-nums';
            diffText.style.color = '#9CA3AF';
        } else if (diff > 0) {
            diffText.innerText = `+${diff.toFixed(1)}%`;
            diffText.className = 'text-[9px] font-extrabold px-3 py-0.5 rounded-full bg-emerald-500/20 mt-2 uppercase tracking-wider border border-emerald-500/30 text-emerald-300 tabular-nums';
            diffText.style.color = '#34D399';
        } else {
            diffText.innerText = `${diff.toFixed(1)}%`;
            diffText.className = 'text-[9px] font-extrabold px-3 py-0.5 rounded-full bg-rose-500/20 mt-2 uppercase tracking-wider border border-rose-500/30 text-rose-300 tabular-nums';
            diffText.style.color = '#FB7185';
        }
    }

    const fractionEl = document.getElementById('sim-fraction');
    if (fractionEl) fractionEl.innerText = `${newAtt} / ${newTot} PERIODS`;

    const metaEl = document.getElementById('sim-sub-meta');
    if (metaEl) metaEl.innerText = 'Prediction Mode';

    // 75% and 65% live calculations
    const safe75 = newTot > 0 ? Math.max(0, Math.floor((4 * newAtt - 3 * newTot) / 3)) : 0;
    const need75 = newTot > 0 && pct < 75 ? Math.max(1, Math.ceil(3 * newTot - 4 * newAtt)) : 0;
    const safe65 = newTot > 0 ? Math.max(0, Math.floor((20 * newAtt - 13 * newTot) / 13)) : 0;
    const need65 = newTot > 0 && pct < 65 ? Math.max(1, Math.ceil((13 * newTot - 20 * newAtt) / 7)) : 0;

    const stat75El = document.getElementById('sim-stat-75');
    if (stat75El) {
        if (pct >= 75) {
            stat75El.className = 'text-[10px] font-black text-emerald-400 tabular-nums';
            stat75El.innerText = safe75 > 0 ? `Safe (+${safe75})` : 'On Edge (0)';
        } else {
            stat75El.className = 'text-[10px] font-black text-rose-400 tabular-nums';
            stat75El.innerText = `Need +${need75}`;
        }
    }

    const stat65El = document.getElementById('sim-stat-65');
    if (stat65El) {
        if (pct >= 65) {
            stat65El.className = 'text-[10px] font-black text-indigo-300 tabular-nums';
            stat65El.innerText = `Buffer +${safe65}`;
        } else {
            stat65El.className = 'text-[10px] font-black text-rose-400 tabular-nums';
            stat65El.innerText = `Need +${need65}`;
        }
    }

    const resetBtn = document.getElementById('sim-reset-btn');
    if (resetBtn) {
        const isSimActive = simAddAttend > 0 || simAddBunk > 0;
        resetBtn.className = isSimActive
            ? 'py-1.5 px-3.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-[9px] font-bold uppercase tracking-wider text-indigo-200 active:scale-95 transition inline-flex items-center justify-center gap-1.5'
            : 'py-1.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white active:scale-95 transition inline-flex items-center justify-center gap-1.5';
    }

    const bannerEl = document.getElementById('sim-verdict-banner');
    if (bannerEl) {
        if (pct >= state.threshold) {
            const b = Math.floor((newAtt - (state.threshold / 100) * newTot) / (state.threshold / 100));
            if (b > 0) {
                bannerEl.className = "mt-1 mb-2.5 py-2 px-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center text-[10px] font-black text-emerald-400 uppercase tracking-wider relative z-10 flex items-center justify-center gap-2 shadow-sm";
                bannerEl.innerHTML = `<i class="fas fa-shield-alt text-xs"></i><span>Safe to bunk ${b}</span>`;
            } else {
                bannerEl.className = "mt-1 mb-2.5 py-2 px-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center text-[10px] font-black text-amber-400 uppercase tracking-wider relative z-10 flex items-center justify-center gap-2 shadow-sm";
                bannerEl.innerHTML = `<i class="fas fa-exclamation-circle text-xs"></i><span>On the edge • 0 safe bunks</span>`;
            }
        } else {
            const n = Math.max(1, Math.ceil(((state.threshold / 100) * newTot - newAtt) / (1 - (state.threshold / 100))));
            bannerEl.className = "mt-1 mb-2.5 py-2 px-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center text-[10px] font-black text-rose-400 uppercase tracking-wider relative z-10 flex items-center justify-center gap-2 shadow-sm";
            bannerEl.innerHTML = `<i class="fas fa-arrow-up text-xs"></i><span>Attend next ${n}</span>`;
        }
    }
}

function resetSimModal() {
    resetPredictionSim();
}
window.resetSimModal = resetSimModal;

// MULTI-DAY LEAVE & ON-DUTY (OD) PLANNER
let leavePlannerState = {
    mode: 'leave', // 'leave' | 'od'
    days: { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false }
};

function openLeavePlannerModal() {
    const modal = document.getElementById('leave-planner-modal');
    if (!modal) return;
    // Pre-select today's weekday if Mon-Fri and none selected yet
    const hasAny = Object.values(leavePlannerState.days).some(Boolean);
    if (!hasAny) {
        const todayDay = DAYS[new Date().getDay() - 1] || 'Mon';
        leavePlannerState.days[todayDay] = true;
    }
    syncLeavePlannerControlsUI();
    renderLeavePlannerImpact();
    modal.classList.remove('hidden');
}
window.openLeavePlannerModal = openLeavePlannerModal;

function closeLeavePlannerModal() {
    const modal = document.getElementById('leave-planner-modal');
    if (modal) modal.classList.add('hidden');
}
window.closeLeavePlannerModal = closeLeavePlannerModal;

function setLeavePlannerMode(mode) {
    leavePlannerState.mode = mode === 'od' ? 'od' : 'leave';
    syncLeavePlannerControlsUI();
    renderLeavePlannerImpact();
}
window.setLeavePlannerMode = setLeavePlannerMode;

function toggleLeavePlannerDay(day) {
    if (!leavePlannerState.days.hasOwnProperty(day)) return;
    leavePlannerState.days[day] = !leavePlannerState.days[day];
    syncLeavePlannerControlsUI();
    renderLeavePlannerImpact();
}
window.toggleLeavePlannerDay = toggleLeavePlannerDay;

function resetLeavePlannerDays() {
    DAYS.forEach(d => { leavePlannerState.days[d] = false; });
    syncLeavePlannerControlsUI();
    renderLeavePlannerImpact();
}
window.resetLeavePlannerDays = resetLeavePlannerDays;

function syncLeavePlannerControlsUI() {
    const leaveBtn = document.getElementById('lp-mode-leave');
    const odBtn = document.getElementById('lp-mode-od');
    if (leaveBtn && odBtn) {
        if (leavePlannerState.mode === 'leave') {
            leaveBtn.className = 'flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shadow transition';
            odBtn.className = 'flex-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition';
        } else {
            odBtn.className = 'flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black shadow transition';
            leaveBtn.className = 'flex-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition';
        }
    }
    DAYS.forEach(d => {
        const btn = document.getElementById(`lp-day-${d}`);
        if (!btn) return;
        if (leavePlannerState.days[d]) {
            btn.className = leavePlannerState.mode === 'leave'
                ? 'py-2 rounded-xl bg-rose-500/25 border border-rose-400/50 text-[10px] font-black text-rose-200 uppercase transition shadow'
                : 'py-2 rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-[10px] font-black text-emerald-200 uppercase transition shadow';
        } else {
            btn.className = 'py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-gray-400 uppercase transition';
        }
    });
}

function renderLeavePlannerImpact() {
    const container = document.getElementById('leave-planner-results');
    if (!container) return;

    const selectedDays = DAYS.filter(d => leavePlannerState.days[d]);
    if (selectedDays.length === 0) {
        container.innerHTML = `
            <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <i class="fas fa-calendar-plus text-indigo-400 text-xl mb-2"></i>
                <p class="text-xs font-black text-white uppercase tracking-wider">Tap Days Above to Simulate</p>
                <p class="text-[10px] text-gray-400 mt-1">Select one or more weekdays (Mon–Fri) to preview how missing or taking OD on those days affects every course.</p>
            </div>`;
        return;
    }

    const affectedMap = {};
    let totalHoursSelected = 0;
    selectedDays.forEach(d => {
        const list = (state.timetable && Array.isArray(state.timetable[d])) ? state.timetable[d] : [];
        list.forEach(code => {
            if (!code || code === 'Free') return;
            affectedMap[code] = (affectedMap[code] || 0) + 1;
            totalHoursSelected++;
        });
    });

    const codes = Object.keys(affectedMap);
    if (codes.length === 0) {
        container.innerHTML = `
            <div class="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <p class="text-xs font-bold text-gray-300">No timetable classes mapped on ${selectedDays.join(', ')}.</p>
            </div>`;
        return;
    }

    const isOD = leavePlannerState.mode === 'od';
    let dropBelow75 = 0;
    let dropBelow65 = 0;

    let rowsHtml = '';
    codes.forEach(code => {
        const hrs = affectedMap[code];
        const stats = getSubjectStats(code);
        if (!stats) return;

        const curPct = stats.pct;
        const newAtt = isOD ? (stats.att + hrs) : stats.att;
        const newTot = stats.tot + hrs;
        const newPct = newTot > 0 ? (newAtt / newTot) * 100 : 0;
        const delta = newPct - curPct;

        if (!isOD && newPct < 75) dropBelow75++;
        if (!isOD && newPct < 65) dropBelow65++;

        const afterSafe75 = newTot > 0 ? Math.max(0, Math.floor((4 * newAtt - 3 * newTot) / 3)) : 0;
        const afterNeed75 = newTot > 0 && newPct < 75 ? Math.max(1, Math.ceil(3 * newTot - 4 * newAtt)) : 0;

        const statusBadge = newPct >= 75
            ? `<span class="text-[8.5px] font-black text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">Safe (${afterSafe75}p left)</span>`
            : newPct >= 65
            ? `<span class="text-[8.5px] font-black text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">Med Zone (Need ${afterNeed75}p)</span>`
            : `<span class="text-[8.5px] font-black text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">&lt;65% SA Redo Risk!</span>`;

        rowsHtml += `
        <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                    <span class="text-[9px] font-black text-indigo-300 uppercase">${code}</span>
                    <span class="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-300">${hrs} period${hrs > 1 ? 's' : ''} on ${selectedDays.join('/')}</span>
                </div>
                <h5 class="text-xs font-bold text-white truncate mt-0.5">${stats.name}</h5>
                <div class="mt-1">${statusBadge}</div>
            </div>
            <div class="text-right shrink-0">
                <div class="text-xs font-black text-white">${curPct.toFixed(1)}% <i class="fas fa-arrow-right text-[9px] text-gray-500 mx-0.5"></i> <span class="${newPct >= 75 ? 'text-emerald-400' : newPct >= 65 ? 'text-amber-400' : 'text-rose-400'}">${newPct.toFixed(1)}%</span></div>
                <div class="text-[9px] font-black ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'} mt-0.5">${delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}</div>
            </div>
        </div>`;
    });

    const summaryBanner = isOD
        ? `<div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-200 flex items-center justify-between">
               <span><i class="fas fa-id-badge mr-1.5"></i>OD across <b>${selectedDays.join(', ')}</b> (${totalHoursSelected} periods)</span>
               <span class="font-black uppercase text-emerald-300">+Attendance Boost</span>
           </div>`
        : `<div class="p-3 rounded-2xl ${dropBelow65 > 0 ? 'bg-rose-500/15 border-rose-500/30 text-rose-200' : dropBelow75 > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'} border text-[10px] font-bold flex items-center justify-between">
               <span>Skipping <b>${selectedDays.join(', ')}</b> (${totalHoursSelected} periods)</span>
               <span class="font-black uppercase">${dropBelow65 > 0 ? `${dropBelow65} <65% Risk` : dropBelow75 > 0 ? `${dropBelow75} <75% Med` : 'All Safe ≥75%'}</span>
           </div>`;

    container.innerHTML = summaryBanner + rowsHtml;
}

// BULK ATTENDANCE & HISTORY


function resolveManualEntryDateKey(entry) {
    if (entry && entry.dateISO && /^\d{4}-\d{2}-\d{2}$/.test(entry.dateISO)) {
        return entry.dateISO;
    }
    if (entry && entry.timestamp) {
        const d = new Date(entry.timestamp);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
    }
    if (entry && entry.time) {
        const d = new Date(entry.time);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
    }
    return 'Unknown Date';
}

function formatManualDateHeading(dateKey) {
    if (!dateKey || dateKey === 'Unknown Date') return 'Tracked Date';
    const d = new Date(dateKey + 'T00:00:00');
    if (isNaN(d.getTime())) return dateKey;
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function extractEntryPeriodNumber(entry) {
    if (entry && entry.period) return entry.period;
    if (entry && entry.time) {
        const m = String(entry.time).match(/Period\s*(\d+)/i);
        if (m) return parseInt(m[1], 10);
    }
    return 1;
}

function clearAllManualHistory() {
    if (!state.manual || state.manual.length === 0) {
        showToast('No tracked history to delete', 'info');
        return;
    }
    state.manual = [];
    saveState();
    renderSemesterHero();
    renderWidgets();
    renderSubjects();
    initPlanner();
    initManual();
    showFullHistory();
    showToast('Deleted all tracked history logs', 'success');
}
window.clearAllManualHistory = clearAllManualHistory;

function deleteManualByDateKey(dateKey) {
    if (!dateKey) return;
    state.manual = state.manual.filter(entry => resolveManualEntryDateKey(entry) !== dateKey);
    saveState();
    renderSemesterHero();
    renderWidgets();
    renderSubjects();
    initPlanner();
    initManual();
    showFullHistory();
    showToast(`Deleted logs for ${formatManualDateHeading(dateKey)}`, 'success');
}
window.deleteManualByDateKey = deleteManualByDateKey;

function showFullHistory() {
    const m = document.getElementById('history-modal'), p = document.getElementById('history-panel'),
        b = document.getElementById('history-backdrop'), c = document.getElementById('full-history-content'),
        count = document.getElementById('history-count'),
        delAllBtn = document.getElementById('history-delete-all-btn');

    if (!m || !c) return;

    const bunkedList = state.manual.filter(entry => entry.status === 'Absent');

    if (delAllBtn) {
        if (bunkedList.length > 0) {
            delAllBtn.classList.remove('hidden');
        } else {
            delAllBtn.classList.add('hidden');
        }
    }

    // Group bunked classes by actual tracked class date (dateISO)
    const groups = {};
    bunkedList.forEach(entry => {
        const dateKey = resolveManualEntryDateKey(entry);
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(entry);
    });

    let html = '';
    const sortedDateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    if (sortedDateKeys.length === 0) {
        html = '<div class="text-center py-16 opacity-60"><div class="text-4xl mb-3">📜</div><p class="text-xs font-bold uppercase tracking-widest text-gray-400">No Bunked Periods Yet</p><p class="text-[10px] text-gray-500 mt-1">Mark bunked periods in Smart Tracker to view them by date</p></div>';
    } else {
        sortedDateKeys.forEach(dateKey => {
            const dateHeading = formatManualDateHeading(dateKey);
            const entriesForDate = groups[dateKey].slice().sort((a, b) => extractEntryPeriodNumber(a) - extractEntryPeriodNumber(b));
            const bunkCount = entriesForDate.length;

            html += `
            <div class="rounded-[24px] bg-white/[0.03] border border-white/[0.08] p-3.5 space-y-2.5">
                <div class="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300 text-[10px] shrink-0">
                            <i class="fas fa-calendar-day"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-black text-white truncate">${dateHeading}</p>
                            <p class="text-[9px] font-bold text-rose-400">${bunkCount} ${bunkCount === 1 ? 'Period' : 'Periods'} Bunked</p>
                        </div>
                    </div>
                    <button type="button" onclick="deleteManualByDateKey('${dateKey}')" class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[8.5px] font-black uppercase tracking-wider shrink-0 active:scale-95 transition">
                        Clear Date
                    </button>
                </div>
                <div class="space-y-2">`;

            entriesForDate.forEach(m => {
                const periodNum = extractEntryPeriodNumber(m);
                html += `
                    <div class="p-3 rounded-2xl bg-black/40 border border-white/[0.06] flex justify-between items-center gap-2.5">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <div class="px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 flex flex-col items-center justify-center shrink-0 min-w-[52px]">
                                <span class="text-[8px] font-black uppercase tracking-wider opacity-80">Period</span>
                                <span class="text-xs font-black leading-none mt-0.5 tabular-nums">${periodNum}</span>
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-xs font-extrabold text-white truncate">${m.name}</p>
                            </div>
                        </div>
                        <button type="button" onclick="deleteManual(${m.id}); showFullHistory();" 
                            class="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] text-gray-400 hover:bg-rose-500/20 hover:text-rose-400 active:scale-90 transition shrink-0" title="Delete Period">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>`;
            });
            html += `</div></div>`;
        });
    }

    count.innerText = `${bunkedList.length} Bunked ${bunkedList.length === 1 ? 'Period' : 'Periods'} • ${sortedDateKeys.length} ${sortedDateKeys.length === 1 ? 'Date' : 'Dates'}`;
    c.innerHTML = html;

    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        b.classList.remove('opacity-0');
        p.classList.remove('translate-y-full');
    });
}

function closeHistory() {
    const m = document.getElementById('history-modal'), p = document.getElementById('history-panel'),
        b = document.getElementById('history-backdrop');
    if (!p) return;
    p.classList.add('translate-y-full');
    b.classList.add('opacity-0');
    document.body.style.overflow = '';
    setTimeout(() => m.classList.add('hidden'), 300);
}

// ================================================================
// BUNKAI — SMART GHOST AI ASSISTANT (Full eCampus Context)
// ================================================================
let bunkAiHistory = [];
let bunkAiBusy = false;

function getStudentDisplayNameAndRoll() {
    const roll = (typeof state !== 'undefined' && state.rollNumber) || localStorage.getItem('bunker_roll') || 'Student';
    let studentName = '';
    try {
        studentName = localStorage.getItem(`bunker_student_name_${roll}`) || localStorage.getItem('bunker_student_name') || '';
    } catch {}
    const info = parseStudentInfoFromRoll(roll);
    return {
        roll,
        name: studentName,
        displayGreeting: studentName ? `${studentName} (${roll})` : roll,
        info
    };
}

function parsePortalUpdateDate(rawStr) {
    if (!rawStr || rawStr === '-' || rawStr === 'Unknown') return null;
    const clean = String(rawStr).trim();
    // Try DD-MM-YYYY or DD/MM/YYYY
    const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
        const dt = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
        if (!isNaN(dt.getTime())) return dt;
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    return null;
}

function formatLocalDateKey(dateObj) {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function buildBunkAiLiveContext() {
    const { roll, name, info } = getStudentDisplayNameAndRoll();
    const todayObj = getToday();
    const todayNorm = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
    const todayISO = formatLocalDateKey(todayNorm);

    const lastOfficialUpdateRaw = localStorage.getItem('bunker_last_update') || state.lastUpdatedDate || 'Unknown';
    const lastUpdateDateObj = parsePortalUpdateDate(lastOfficialUpdateRaw);
    const lastUpdateISO = lastUpdateDateObj ? formatLocalDateKey(lastUpdateDateObj) : null;

    // Load previous stored attendance snapshot from phone if available
    let previousStoredAttendance = [];
    try {
        const prevRaw = localStorage.getItem(`bunker_previous_attendance_${roll}`);
        if (prevRaw) {
            const parsedPrev = JSON.parse(prevRaw);
            if (Array.isArray(parsedPrev)) {
                previousStoredAttendance = parsedPrev.map(p => ({
                    code: p.code,
                    attended: p.attended,
                    total: p.total,
                    percentage: p.percentage
                }));
            }
        }
    } catch (e) {}

    // Build holiday lookup map from Academic Calendar
    const holidayMap = {};
    if (ACADEMIC_DATA && Array.isArray(ACADEMIC_DATA.fullCalendar)) {
        ACADEMIC_DATA.fullCalendar.forEach(ev => {
            const dKey = String(ev.date || '').slice(0, 10);
            if (dKey) holidayMap[dKey] = ev;
        });
    }

    // Build manual tracker lookup by dateISO -> period
    const manualByDate = {};
    (state.manual || []).forEach(m => {
        const dKey = resolveManualEntryDateKey(m);
        const pNum = extractEntryPeriodNumber(m);
        if (!manualByDate[dKey]) manualByDate[dKey] = [];
        manualByDate[dKey].push({
            period: pNum,
            code: m.code,
            name: m.name,
            status: m.status === 'Present' ? 'Attended' : 'Bunked'
        });
    });

    // Compute unlogged / gap working days schedule from (lastUpdateDateObj + 1 day) up to Today
    const gapWorkingDaysSchedule = [];
    const unloggedSubjectCounts = {}; // code -> count of unlogged scheduled periods between portal update and today
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const gapStartDate = lastUpdateDateObj
        ? new Date(lastUpdateDateObj.getFullYear(), lastUpdateDateObj.getMonth(), lastUpdateDateObj.getDate() + 1)
        : new Date(todayNorm.getFullYear(), todayNorm.getMonth(), todayNorm.getDate() - 7);

    // Cap gap scan to max 35 days so payload stays compact
    const maxScanStart = new Date(todayNorm.getFullYear(), todayNorm.getMonth(), todayNorm.getDate() - 35);
    const cursor = new Date(Math.max(gapStartDate.getTime(), maxScanStart.getTime()));

    while (cursor <= todayNorm) {
        const dISO = formatLocalDateKey(cursor);
        const dow = cursor.getDay();
        const dayName = dayNames[dow];
        const calEv = holidayMap[dISO];
        const isHoliday = dow === 0 || (calEv && calEv.type === 'holiday');

        if (!isHoliday && state.timetable && Array.isArray(state.timetable[dayName])) {
            const dayPeriods = state.timetable[dayName];
            const loggedOnDate = manualByDate[dISO] || [];
            const scheduledPeriods = [];

            dayPeriods.forEach((code, idx) => {
                if (!code || code === 'Free') return;
                const pNum = idx + 1;
                const sObj = (state.subjects || []).find(x => x.code === code);
                const cname = sObj ? sObj.name : ((state.courseMapping && state.courseMapping[code]) || code);
                const alreadyLogged = loggedOnDate.find(l => l.period === pNum || l.code === code);

                if (!alreadyLogged) {
                    unloggedSubjectCounts[code] = (unloggedSubjectCounts[code] || 0) + 1;
                }

                scheduledPeriods.push({
                    period: pNum,
                    code,
                    name: cname,
                    smartTrackerLog: alreadyLogged ? alreadyLogged.status : 'Not logged in Smart Tracker'
                });
            });

            if (scheduledPeriods.length > 0) {
                gapWorkingDaysSchedule.push({
                    dateISO: dISO,
                    dayName,
                    label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
                    calendarEvent: calEv ? `${calEv.name} (${calEv.type})` : null,
                    periods: scheduledPeriods
                });
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    // 1. Enriched Subjects & Safe Bunk Math + Up-To-Today Prediction
    const subjectsList = (state.subjects || []).map(raw => {
        const sub = getSubjectStats(raw.code) || {
            code: raw.code,
            name: raw.name,
            att: raw.attended || 0,
            tot: raw.total || 0,
            pct: raw.percentage || 0
        };
        const safeBunks75 = sub.pct >= 75
            ? Math.floor((sub.att - 0.75 * sub.tot) / 0.75)
            : 0;
        const mustAttendFor75 = sub.pct < 75
            ? Math.max(1, Math.ceil((0.75 * sub.tot - sub.att) / 0.25))
            : 0;
        const safeBunks65 = sub.pct >= 65
            ? Math.floor((sub.att - 0.65 * sub.tot) / 0.65)
            : 0;
        const mustAttendFor65 = sub.pct < 65
            ? Math.max(1, Math.ceil((0.65 * sub.tot - sub.att) / 0.35))
            : 0;

        const unloggedGapPeriods = unloggedSubjectCounts[sub.code] || 0;
        const predAttIfAllAttended = sub.att + unloggedGapPeriods;
        const predTotUpToToday = sub.tot + unloggedGapPeriods;
        const predPctIfAllAttended = predTotUpToToday > 0
            ? Number(((predAttIfAllAttended / predTotUpToToday) * 100).toFixed(2))
            : Number(sub.pct.toFixed(2));

        return {
            code: sub.code,
            name: sub.name,
            portalAttendedPeriods: raw.attended || 0,
            portalTotalPeriods: raw.total || 0,
            portalPercentage: Number((raw.percentage || 0).toFixed(2)),
            currentTrackedAttended: sub.att,
            currentTrackedTotal: sub.tot,
            currentTrackedPercentage: Number(sub.pct.toFixed(2)),
            status75: sub.pct >= 75 ? `Safe to bunk ${safeBunks75}` : `Attend next ${mustAttendFor75}`,
            safeBunks75,
            mustAttendFor75,
            safeBunks65,
            mustAttendFor65,
            unloggedPeriodsSinceLastPortalUpdate: unloggedGapPeriods,
            predictedUpToTodayIfUnloggedAttended: {
                attended: predAttIfAllAttended,
                total: predTotUpToToday,
                percentage: predPctIfAllAttended
            },
            exemptionPeriods: raw.exemption || 0,
            pctWithExemption: raw.pct_exemp,
            pctWithMedical: raw.pct_medical
        };
    });

    // 2. Weekly Timetable with Course Names
    const readableTimetable = {};
    if (state.timetable) {
        Object.keys(state.timetable).forEach(day => {
            const periods = state.timetable[day] || [];
            readableTimetable[day] = periods.map((code, idx) => {
                if (!code || code === 'Free') return `P${idx + 1}: Free`;
                const s = state.subjects.find(x => x.code === code);
                const cname = s ? s.name : (state.courseMapping && state.courseMapping[code]) || code;
                return `P${idx + 1}: ${cname} (${code})`;
            });
        });
    }

    // 3. Internal CA Marks & 40:60 Pass Target
    let internalsList = [];
    if (state.academics && Array.isArray(state.academics.internals)) {
        internalsList = state.academics.internals.map(item => {
            const caTotal = parseFloat(item.total);
            let minExamForPass = null;
            if (!isNaN(caTotal) && !item.is_lab) {
                const caCeil = Math.ceil(caTotal);
                const neededFrom60 = Math.max(0, 50 - caCeil);
                const rawExam = Math.ceil((neededFrom60 - 0.99) / 0.6);
                minExamForPass = Math.max(45, rawExam);
            }
            return {
                code: item.course_code,
                name: item.course_name,
                caTotal: isNaN(caTotal) ? item.total : caTotal,
                maxCA: item.is_lab ? 50 : 40,
                isLab: !!item.is_lab,
                minFinalExamOutOf100ToPass: minExamForPass,
                breakdown: item.row_data || []
            };
        });
    }

    // 4. Semester Results & CGPA
    const resultsSummary = {};
    if (state.academics && state.academics.cgpa) {
        resultsSummary.cgpa = state.academics.cgpa.cgpa;
        resultsSummary.totalCredits = state.academics.cgpa.total_credits;
        resultsSummary.semesterSGPA = state.academics.cgpa.semester_gpa || [];
    }
    if (state.academics && state.academics.gpa) {
        resultsSummary.latestSemGPA = state.academics.gpa.gpa;
        resultsSummary.latestSemCourses = (state.academics.gpa.courses || []).map(c => ({
            code: c.course_code || c.code,
            name: c.course_name || c.title,
            grade: c.grade,
            credits: c.credits
        }));
    }

    // 5. Academic Calendar Upcoming Events
    const calEvents = (ACADEMIC_DATA && Array.isArray(ACADEMIC_DATA.fullCalendar))
        ? ACADEMIC_DATA.fullCalendar.slice(0, 40).map(e => ({
            date: String(e.date).slice(0, 10),
            name: e.name,
            type: e.type
        }))
        : [];

    // 6. Manual Tracker Logs
    const manualLogs = (state.manual || []).slice(0, 35).map(m => ({
        date: resolveManualEntryDateKey(m),
        period: extractEntryPeriodNumber(m),
        code: m.code,
        name: m.name,
        status: m.status === 'Present' ? 'Attended' : 'Bunked'
    }));

    return {
        today: todayObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        todayISO,
        lastOfficialPortalUpdateDate: lastOfficialUpdateRaw,
        lastOfficialPortalUpdateISO: lastUpdateISO,
        student: {
            roll,
            name,
            displayBranch: info ? info.displayBranch : 'PSG College of Technology',
            yearOfStudy: info ? info.yearOfStudy : '',
            batch: info ? info.batch : '',
            attendanceMode: state.attendanceMode || 'normal'
        },
        subjects: subjectsList,
        previousStoredAttendance,
        gapWorkingDaysSchedule,
        timetable: readableTimetable,
        manualTrackerLogs: manualLogs,
        calendar: {
            semesterName: ACADEMIC_DATA ? ACADEMIC_DATA.name : '',
            startDate: ACADEMIC_DATA ? ACADEMIC_DATA.startDate : '',
            lastDate: ACADEMIC_DATA ? ACADEMIC_DATA.lastDate : '',
            events: calEvents
        },
        internals: internalsList,
        results: resultsSummary
    };
}

function openBunkAiPage() {
    hydrateAcademicsFromPhoneCache();
    const modal = document.getElementById('bunkai-modal');
    if (!modal) return;

    const { roll, name, info } = getStudentDisplayNameAndRoll();
    const greetingTitle = document.getElementById('bunkai-greeting-title');
    const greetingSub = document.getElementById('bunkai-greeting-sub');

    if (greetingTitle) {
        greetingTitle.textContent = `Hey, ${name ? `${name} (${roll})` : roll}! 👋`;
    }
    if (greetingSub) {
        const branchText = info && info.displayBranch ? info.displayBranch : 'PSG College of Technology';
        const subCount = (state.subjects || []).length;
        greetingSub.textContent = `${branchText} • ${subCount > 0 ? `${subCount} Courses Synced` : 'eCampus Live Data Ready'}`;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const input = document.getElementById('bunkai-input');
        if (input && window.innerWidth > 640) input.focus();
    }, 150);
}
window.openBunkAiPage = openBunkAiPage;

function closeBunkAiPage() {
    const modal = document.getElementById('bunkai-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}
window.closeBunkAiPage = closeBunkAiPage;

function resetBunkAiChat() {
    bunkAiHistory = [];
    const msgs = document.getElementById('bunkai-messages');
    if (msgs) msgs.innerHTML = '';
    showToast('BunkAi chat reset');
}
window.resetBunkAiChat = resetBunkAiChat;

function formatBunkAiMarkdown(rawText) {
    if (!rawText) return '';
    let safe = String(rawText)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Bold **text**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-extrabold">$1</strong>');
    // Inline code `code`
    safe = safe.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono text-[10.5px] border border-indigo-500/30">$1</code>');

    const lines = safe.split('\n');
    const out = [];
    let inList = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            if (inList) {
                out.push('</ul>');
                inList = false;
            }
            return;
        }
        if (/^###\s+(.+)/.test(trimmed)) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<h4 class="text-xs font-black text-indigo-300 uppercase tracking-wider mt-3 mb-1">${trimmed.replace(/^###\s+/, '')}</h4>`);
        } else if (/^##\s+(.+)/.test(trimmed)) {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<h3 class="text-xs sm:text-sm font-black text-white uppercase tracking-wide mt-3 mb-1">${trimmed.replace(/^##\s+/, '')}</h3>`);
        } else if (/^[-*•]\s+(.+)/.test(trimmed)) {
            if (!inList) {
                out.push('<ul class="space-y-1.5 my-1.5 pl-1">');
                inList = true;
            }
            const itemContent = trimmed.replace(/^[-*•]\s+/, '');
            out.push(`<li class="flex items-start gap-2 text-xs text-gray-200 leading-relaxed"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span><span class="flex-1">${itemContent}</span></li>`);
        } else {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(`<p class="text-xs text-gray-200 leading-relaxed my-1.5">${trimmed}</p>`);
        }
    });
    if (inList) out.push('</ul>');
    return out.join('');
}

function scrollBunkAiToBottom() {
    const scroller = document.getElementById('bunkai-chat-scroll');
    if (scroller) {
        requestAnimationFrame(() => {
            scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
        });
    }
}

function sendBunkAiPrompt(promptText) {
    const input = document.getElementById('bunkai-input');
    if (input) input.value = promptText;
    submitBunkAiMessage(promptText);
}
window.sendBunkAiPrompt = sendBunkAiPrompt;

function handleBunkAiSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('bunkai-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    submitBunkAiMessage(text);
}
window.handleBunkAiSubmit = handleBunkAiSubmit;

async function submitBunkAiMessage(userText) {
    if (bunkAiBusy || !userText) return;
    bunkAiBusy = true;

    const msgsContainer = document.getElementById('bunkai-messages');
    const sendBtn = document.getElementById('bunkai-send-btn');
    if (!msgsContainer) {
        bunkAiBusy = false;
        return;
    }

    // Append user bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'flex justify-end';
    userBubble.innerHTML = `
        <div class="max-w-[84%] px-4 py-3 rounded-[22px] rounded-br-md bg-gradient-to-tr from-indigo-600 to-violet-600 text-white text-xs font-semibold leading-relaxed shadow-lg shadow-indigo-500/20">
            ${userText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
    `;
    msgsContainer.appendChild(userBubble);

    // Append Ghost thinking bubble
    const thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'flex items-start gap-2.5';
    thinkingBubble.innerHTML = `
        <div class="w-8 h-8 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-cyan-400 flex items-center justify-center text-white text-xs shrink-0 shadow-md shadow-indigo-500/25 mt-0.5">
            <i class="fas fa-ghost animate-bounce"></i>
        </div>
        <div class="px-4 py-3 rounded-[22px] rounded-tl-md bg-white/[0.05] border border-white/10 flex items-center gap-2 text-xs text-indigo-200 font-bold">
            <span>BunkAi is checking your eCampus data</span>
            <span class="inline-flex gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            </span>
        </div>
    `;
    msgsContainer.appendChild(thinkingBubble);
    scrollBunkAiToBottom();

    if (sendBtn) sendBtn.disabled = true;

    const HIGH_TRAFFIC_FALLBACK = 'Due to high traffic in Bunker, we facing some issue so please try later.';

    try {
        let contextPayload = {};
        try {
            contextPayload = buildBunkAiLiveContext();
        } catch (ctxErr) {
            console.warn('BunkAi context fallback:', ctxErr);
            const { roll, name, info } = getStudentDisplayNameAndRoll();
            contextPayload = {
                today: new Date().toDateString(),
                student: { roll, name, displayBranch: info ? info.displayBranch : 'PSG College of Technology' },
                subjects: (typeof state !== 'undefined' && state.subjects) || [],
                timetable: (typeof state !== 'undefined' && state.timetable) || {}
            };
        }
        const res = await fetch('/api/bunkai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userText,
                history: bunkAiHistory,
                context: contextPayload
            })
        });

        let data = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }

        thinkingBubble.remove();

        if (!res.ok || !data || !data.success || !data.reply) {
            const errBubble = document.createElement('div');
            errBubble.className = 'flex items-start gap-2.5';
            errBubble.innerHTML = `
                <div class="w-8 h-8 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-300 text-xs shrink-0 mt-0.5">
                    <i class="fas fa-ghost"></i>
                </div>
                <div class="flex-1 p-3.5 rounded-[22px] rounded-tl-md bg-amber-500/12 border border-amber-500/30 text-amber-200 text-xs font-bold leading-relaxed">
                    <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1">
                        <i class="fas fa-bolt"></i>
                        <span>High Traffic Notice</span>
                    </div>
                    <p>${HIGH_TRAFFIC_FALLBACK}</p>
                </div>
            `;
            msgsContainer.appendChild(errBubble);
        } else {
            bunkAiHistory.push({ role: 'user', text: userText });
            bunkAiHistory.push({ role: 'model', text: data.reply });

            const aiBubble = document.createElement('div');
            aiBubble.className = 'flex items-start gap-2.5';
            aiBubble.innerHTML = `
                <div class="w-8 h-8 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-cyan-400 flex items-center justify-center text-white text-xs shrink-0 shadow-md shadow-indigo-500/25 mt-0.5">
                    <i class="fas fa-ghost"></i>
                </div>
                <div class="flex-1 p-4 rounded-[24px] rounded-tl-md bg-white/[0.05] border border-white/10 shadow-xl overflow-hidden">
                    ${formatBunkAiMarkdown(data.reply)}
                </div>
            `;
            msgsContainer.appendChild(aiBubble);
        }
    } catch (err) {
        thinkingBubble.remove();
        const errBubble = document.createElement('div');
        errBubble.className = 'flex items-start gap-2.5';
        errBubble.innerHTML = `
            <div class="w-8 h-8 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-300 text-xs shrink-0 mt-0.5">
                <i class="fas fa-ghost"></i>
            </div>
            <div class="flex-1 p-3.5 rounded-[22px] rounded-tl-md bg-amber-500/12 border border-amber-500/30 text-amber-200 text-xs font-bold leading-relaxed">
                <div class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1">
                    <i class="fas fa-bolt"></i>
                    <span>High Traffic Notice</span>
                </div>
                <p>${HIGH_TRAFFIC_FALLBACK}</p>
            </div>
        `;
        msgsContainer.appendChild(errBubble);
    } finally {
        bunkAiBusy = false;
        if (sendBtn) sendBtn.disabled = false;
        scrollBunkAiToBottom();
    }
}

// ================================================================
// FEEDBACK AUTOMATION MODAL
// ================================================================

let feedbackModalAutoOpened = false;

function openFeedbackModal(options = {}) {
    const isAuto = typeof options === 'object' && options && options.auto === true;
    feedbackModalAutoOpened = isAuto;

    const m = document.getElementById('feedback-modal');
    const p = document.getElementById('feedback-panel');
    const b = document.getElementById('feedback-backdrop');
    if (!m || !p || !b) return;

    const roll = (typeof state !== 'undefined' && state.rollNumber && state.rollNumber !== 'DEMO')
        ? state.rollNumber
        : localStorage.getItem('bunker_roll') || (state && state.rollNumber ? state.rollNumber : '');

    const statusBox = document.getElementById('feedback-status-box');
    if (statusBox) statusBox.classList.add('hidden');

    const rollDisplay = document.getElementById('feedback-confirm-roll');
    if (rollDisplay) rollDisplay.textContent = roll || 'Current Account';

    // Auto-banner update
    const autoBanner = document.getElementById('feedback-auto-banner');
    const autoBannerText = document.getElementById('feedback-auto-banner-text');
    if (autoBanner) {
        if (isAuto) {
            autoBanner.classList.remove('hidden');
            if (options.details && options.details.total_pending && autoBannerText) {
                const count = options.details.total_pending;
                autoBannerText.innerHTML = `<b>${count} pending feedback survey(s)</b> detected on your eCampus portal. Click Confirm below to complete all with 5-star ratings instantly.`;
            }
        } else {
            autoBanner.classList.add('hidden');
        }
    }

    // Default to the confirmation view
    switchFeedbackMode('self');

    // Show modal & animate scale + opacity (clean & centered)
    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        b.classList.remove('opacity-0');
        p.classList.remove('opacity-0', 'scale-95');
        p.classList.add('scale-100');
    });

    // Close on Escape key
    if (!m._escBound) {
        m._escBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !m.classList.contains('hidden')) {
                closeFeedbackModal();
            }
        });
    }
}

function closeFeedbackModal() {
    const m = document.getElementById('feedback-modal');
    const p = document.getElementById('feedback-panel');
    const b = document.getElementById('feedback-backdrop');
    if (!p || !m) return;

    if (feedbackModalAutoOpened) {
        const roll = (typeof state !== 'undefined' && state.rollNumber && state.rollNumber !== 'DEMO')
            ? state.rollNumber
            : localStorage.getItem('bunker_roll') || '';
        if (roll) {
            try { sessionStorage.setItem(`bunker_fb_dismissed_${roll}`, '1'); } catch {}
        }
        feedbackModalAutoOpened = false;
    }

    if (b) b.classList.add('opacity-0');
    p.classList.add('opacity-0', 'scale-95');
    p.classList.remove('scale-100');
    document.body.style.overflow = '';
    setTimeout(() => {
        m.classList.add('hidden');
    }, 300);
}

function switchFeedbackMode(mode) {
    const confirmView = document.getElementById('feedback-confirm-view');
    const otherView = document.getElementById('feedback-other-view');
    const statusBox = document.getElementById('feedback-status-box');
    if (statusBox) statusBox.classList.add('hidden');

    if (mode === 'self') {
        if (otherView) otherView.classList.add('hidden');
        if (confirmView) confirmView.classList.remove('hidden');
    } else {
        if (confirmView) confirmView.classList.add('hidden');
        if (otherView) otherView.classList.remove('hidden');
        const otherRollInput = document.getElementById('feedback-other-roll');
        if (otherRollInput) otherRollInput.focus();
    }
}

function toggleOtherFeedbackPw() {
    const input = document.getElementById('feedback-other-password');
    const icon = document.getElementById('feedback-other-pw-icon');
    if (!input) return;
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    if (icon) icon.className = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
}

async function submitFeedbackCore(rollno, password, mode, btn, ratingStyle = 'max') {
    const originalBtnHTML = btn ? btn.innerHTML : '';
    const statusBox = document.getElementById('feedback-status-box');
    const statusText = document.getElementById('feedback-status-text');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Submitting &amp; Verifying...</span>';
    }

    if (statusBox && statusText) {
        statusBox.className = 'mt-4 p-4 rounded-2xl border text-xs leading-relaxed border-purple-500/30 bg-purple-500/10 text-purple-200';
        statusBox.classList.remove('hidden');
        statusText.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-circle-notch fa-spin text-purple-400"></i><span>Authenticating ${rollno} &amp; evaluating Intermediate + End-Sem courses...</span></div>`;
    }

    const startTime = Date.now();
    const MAX_PASSES = 3; // Automatic continuation if Studzone is slow on Vercel Hobby (10s maxDuration)
    let pass = 0;
    let totalCompleted = 0;
    let finalData = null;
    let finalOk = false;

    try {
        while (pass < MAX_PASSES) {
            pass++;
            const sessionToken = localStorage.getItem('bunker_session_token') || '';
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rollno,
                    password,
                    mode: mode || 'auto',
                    rating_style: ratingStyle || 'max',
                    session_token: sessionToken
                })
            });

            const data = await res.json();
            finalData = data;
            finalOk = res.ok;

            if (data.session_token) {
                localStorage.setItem('bunker_session_token', data.session_token);
            }

            if (!res.ok || !data.success) {
                break;
            }

            totalCompleted += Number(data.completed_count || 0);

            if (data.partial && Number(data.remaining_count || 0) > 0 && pass < MAX_PASSES) {
                if (statusBox && statusText) {
                    statusText.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-circle-notch fa-spin text-purple-400"></i><span>Batch ${pass} complete (${totalCompleted} courses saved). Finishing remaining ${data.remaining_count} course(s)...</span></div>`;
                }
                continue;
            }
            break;
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (finalOk && finalData && finalData.success) {
            const isSelf = (typeof state !== 'undefined' && state.rollNumber && state.rollNumber.toUpperCase() === rollno.toUpperCase());
            try {
                sessionStorage.setItem(`bunker_fb_checked_${rollno}`, JSON.stringify({ ts: Date.now(), has_pending: false, completed: true }));
                sessionStorage.setItem(`bunker_fb_dismissed_${rollno}`, '1');
            } catch {}
            if (isSelf) {
                const autoBanner = document.getElementById('feedback-auto-banner');
                if (autoBanner) autoBanner.classList.add('hidden');
            }
            const summaryMsg = pass > 1 && totalCompleted > 0
                ? `All ${totalCompleted} course evaluations verified &amp; completed across ${pass} passes.`
                : (finalData.message || 'Feedback submitted and verified!');
            if (statusBox && statusText) {
                statusBox.className = 'mt-4 p-4 rounded-2xl border text-xs leading-relaxed border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
                statusText.innerHTML = `<div class="flex items-start gap-2.5"><i class="fas fa-check-circle text-emerald-400 text-sm mt-0.5 shrink-0"></i><div><b class="text-emerald-300">Success for ${rollno} (${elapsed}s)!</b><div class="mt-1 text-[11px] leading-normal opacity-90">${summaryMsg}</div></div></div>`;
            }
            showToast(`🎉 Feedback verified & submitted for ${rollno}!`, 'success');
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 110,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            }
        } else {
            const errMsg = (finalData && finalData.error) ? finalData.error : 'Server rejected submission';
            if (statusBox && statusText) {
                statusBox.className = 'mt-4 p-4 rounded-2xl border text-xs leading-relaxed border-rose-500/30 bg-rose-500/10 text-rose-200';
                statusText.innerHTML = `<div class="flex items-start gap-2.5"><i class="fas fa-exclamation-triangle text-rose-400 text-sm mt-0.5 shrink-0"></i><div><b class="text-rose-300">Submission Failed:</b><div class="mt-1 text-[11px] leading-normal opacity-90">${errMsg}</div></div></div>`;
            }
            showToast(errMsg, 'error');
        }
    } catch (err) {
        if (statusBox && statusText) {
            statusBox.className = 'mt-4 p-4 rounded-2xl border text-xs leading-relaxed border-rose-500/30 bg-rose-500/10 text-rose-200';
            statusText.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-wifi text-rose-400"></i><span>Connection error: ${err.message}</span></div>`;
        }
        showToast('Network error while submitting feedback', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHTML;
        }
    }
}

async function executeCurrentFeedback() {
    const roll = (typeof state !== 'undefined' && state.rollNumber && state.rollNumber !== 'DEMO')
        ? state.rollNumber
        : localStorage.getItem('bunker_roll') || (state && state.rollNumber ? state.rollNumber : '');

    let password = '';
    const credsStr = localStorage.getItem('bunker_credentials');
    if (credsStr) {
        try {
            const creds = JSON.parse(credsStr);
            password = creds.password || '';
        } catch {}
    }

    if (!roll || roll === 'DEMO' || !password) {
        showToast('Please enter your Studzone credentials to proceed', 'info');
        switchFeedbackMode('other');
        const rollInput = document.getElementById('feedback-other-roll');
        if (rollInput && roll && roll !== 'DEMO') {
            rollInput.value = roll;
        }
        const pwInput = document.getElementById('feedback-other-password');
        if (pwInput) pwInput.focus();
        return;
    }

    const typeEl = document.getElementById('feedback-self-type');
    const ratingEl = document.getElementById('feedback-self-rating');
    const mode = typeEl ? typeEl.value : 'auto';
    const ratingStyle = ratingEl ? ratingEl.value : '5';

    const btn = document.getElementById('feedback-confirm-btn');
    await submitFeedbackCore(roll, password, mode, btn, ratingStyle);
}

async function executeOtherFeedback(e) {
    if (e) e.preventDefault();
    const rollEl = document.getElementById('feedback-other-roll');
    const pwEl = document.getElementById('feedback-other-password');
    const typeEl = document.getElementById('feedback-other-type');
    const ratingEl = document.getElementById('feedback-other-mode');
    const btn = document.getElementById('feedback-other-submit-btn');

    const rollno = rollEl ? rollEl.value.trim().toUpperCase() : '';
    const password = pwEl ? pwEl.value.trim() : '';
    const mode = typeEl ? typeEl.value : 'auto';
    const ratingStyle = ratingEl ? ratingEl.value : '5';

    if (!rollno || !password) {
        showToast('Roll number & password are required', 'error');
        return;
    }

    await submitFeedbackCore(rollno, password, mode, btn, ratingStyle);
}

// Background check with 24-hour phone cooldown to preserve Vercel quota
async function checkPendingFeedbackInBackground() {
    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (!roll || roll === 'DEMO') return;
    const FEEDBACK_TTL = 24 * 60 * 60 * 1000; // 24 hours (86,400,000 ms)
    const statusKey = `bunker_feedback_status_${roll}`;
    try {
        const cached = JSON.parse(localStorage.getItem(statusKey) || 'null');
        if (cached && (Date.now() - (cached.timestamp || 0) < FEEDBACK_TTL)) {
            // Already checked within 24 hours, skip network calls completely
            return;
        }
    } catch {}
    try {
        localStorage.setItem(statusKey, JSON.stringify({ checked: true, timestamp: Date.now() }));
    } catch {}
}

window.openFeedbackModal = openFeedbackModal;
window.closeFeedbackModal = closeFeedbackModal;
window.switchFeedbackMode = switchFeedbackMode;
window.toggleOtherFeedbackPw = toggleOtherFeedbackPw;
window.toggleOtherFeedbackPassword = toggleOtherFeedbackPw;
window.executeCurrentFeedback = executeCurrentFeedback;
window.executeOtherFeedback = executeOtherFeedback;
window.checkPendingFeedbackInBackground = checkPendingFeedbackInBackground;

// ================================================================
// ATTENDANCE COMPARISON SYSTEM (Before vs Now)
// ================================================================

function checkAttendanceDifference(oldSubs, curSubs) {
    if (!Array.isArray(oldSubs) || !Array.isArray(curSubs)) return false;
    if (oldSubs.length !== curSubs.length) return true;

    const oldMap = {};
    oldSubs.forEach(s => { if (s && s.code) oldMap[s.code] = s; });

    for (const cur of curSubs) {
        if (!cur || !cur.code) continue;
        const old = oldMap[cur.code];
        if (!old) return true;
        const oAtt = parseInt(old.attended || 0, 10);
        const oTot = parseInt(old.total || 0, 10);
        const cAtt = parseInt(cur.attended || 0, 10);
        const cTot = parseInt(cur.total || 0, 10);
        if (oAtt !== cAtt || oTot !== cTot) return true;
    }
    return false;
}

function saveAttendanceSnapshot(roll, subjects, lastUpdate, prevSubjects = null, prevLastUpdate = null) {
    if (!roll || roll === 'DEMO' || !Array.isArray(subjects) || subjects.length === 0) return;

    const curKey = `bunker_current_attendance_${roll}`;
    const curDateKey = `bunker_current_update_${roll}`;
    const oldKey = `bunker_old_attendance_${roll}`;
    const oldDateKey = `bunker_old_update_${roll}`;

    const nowFormatted = (lastUpdate && lastUpdate !== 'No data') 
        ? lastUpdate 
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // If server provided previous attendance, save it if old snapshot not already set
    if (Array.isArray(prevSubjects) && prevSubjects.length > 0 && !localStorage.getItem(oldKey)) {
        localStorage.setItem(oldKey, JSON.stringify(prevSubjects));
        localStorage.setItem(oldDateKey, prevLastUpdate || 'Previous Update');
    }

    const existingCurRaw = localStorage.getItem(curKey);
    const existingDate = localStorage.getItem(curDateKey);

    if (!existingCurRaw) {
        // Initial baseline snapshot
        localStorage.setItem(curKey, JSON.stringify(subjects));
        localStorage.setItem(curDateKey, nowFormatted);
        return;
    }

    try {
        const existingSubjects = JSON.parse(existingCurRaw);
        if (!Array.isArray(existingSubjects) || existingSubjects.length === 0) {
            localStorage.setItem(curKey, JSON.stringify(subjects));
            localStorage.setItem(curDateKey, nowFormatted);
            return;
        }

        // Compare if attendance changed between existing stored snapshot and fresh subjects
        const hasDiff = checkAttendanceDifference(existingSubjects, subjects);
        const hasDateDiff = existingDate && nowFormatted && existingDate !== nowFormatted;

        if (hasDiff || (hasDateDiff && existingDate !== nowFormatted)) {
            // Existing current snapshot becomes the OLD snapshot
            localStorage.setItem(oldKey, JSON.stringify(existingSubjects));
            localStorage.setItem(oldDateKey, existingDate || nowFormatted);

            // Fresh subjects become the new CURRENT snapshot
            localStorage.setItem(curKey, JSON.stringify(subjects));
            localStorage.setItem(curDateKey, nowFormatted);
        } else {
            // Keep existing current and old snapshots, ensure date is recorded
            localStorage.setItem(curKey, JSON.stringify(subjects));
            if (!localStorage.getItem(curDateKey)) {
                localStorage.setItem(curDateKey, nowFormatted);
            }
        }
    } catch (e) {
        console.warn('Error in saveAttendanceSnapshot:', e);
    }
}

function computeSubjectDifferences(oldSubs, curSubs) {
    const oldMap = {};
    oldSubs.forEach(s => { if (s && s.code) oldMap[s.code] = s; });

    const results = [];
    curSubs.forEach(cur => {
        if (!cur || !cur.code) return;
        const old = oldMap[cur.code];

        const cAtt = parseInt(cur.attended || 0, 10);
        const cTot = parseInt(cur.total || 0, 10);
        const cPct = parseFloat(cur.percentage !== undefined ? cur.percentage : (cTot > 0 ? (cAtt / cTot * 100).toFixed(1) : 0));

        let oAtt = cAtt;
        let oTot = cTot;
        let oPct = cPct;

        if (old) {
            oAtt = parseInt(old.attended || 0, 10);
            oTot = parseInt(old.total || 0, 10);
            oPct = parseFloat(old.percentage !== undefined ? old.percentage : (oTot > 0 ? (oAtt / oTot * 100).toFixed(1) : 0));
        }

        const attDelta = cAtt - oAtt;
        const totDelta = cTot - oTot;
        const pctDelta = parseFloat((cPct - oPct).toFixed(1));

        let badgeText = 'No Change';
        let badgeClass = 'bg-white/10 text-gray-400 border border-white/10';

        if (totDelta > 0) {
            if (attDelta === totDelta) {
                badgeText = `+${attDelta} Attended`;
                badgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            } else if (attDelta === 0) {
                badgeText = `+${totDelta} Missed`;
                badgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
            } else {
                badgeText = `+${attDelta} / +${totDelta} Periods`;
                badgeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
            }
        } else if (attDelta !== 0) {
            badgeText = attDelta > 0 ? `+${attDelta} Attended` : `${attDelta} Periods`;
            badgeClass = attDelta > 0 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
        }

        results.push({
            code: cur.code,
            name: cur.name || cur.code,
            oldAttended: oAtt,
            oldTotal: oTot,
            oldPct: oPct.toFixed(1),
            curAttended: cAtt,
            curTotal: cTot,
            curPct: cPct.toFixed(1),
            attDelta,
            totDelta,
            pctDelta,
            badgeText,
            badgeClass,
            hasChanged: (attDelta !== 0 || totDelta !== 0 || pctDelta !== 0)
        });
    });

    return results;
}

function extractAttendanceDayKey(dStr) {
    if (!dStr) return '';
    const str = String(dStr).trim().toLowerCase();
    if (!str || str === 'previous update' || str === 'not recorded' || str === 'no data' || str === '--' || str === 'initial snapshot') {
        return '';
    }
    const t = Date.parse(str);
    if (!isNaN(t)) {
        const d = new Date(t);
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }
    const dmyMatch = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (dmyMatch) {
        return dmyMatch[3] + '-' + dmyMatch[2] + '-' + dmyMatch[1];
    }
    const words = str.replace(/[,.-]/g, ' ').split(/\s+/).filter(Boolean);
    const nonTimeWords = words.filter(w => !w.includes(':') && w !== 'am' && w !== 'pm' && w !== 'at');
    if (nonTimeWords.length >= 2) {
        return nonTimeWords.slice(0, 3).sort().join('-');
    }
    return str;
}

function isSameAttendanceDate(date1, date2) {
    if (!date1 || !date2) return false;
    const key1 = extractAttendanceDayKey(date1);
    const key2 = extractAttendanceDayKey(date2);
    if (!key1 || !key2) return String(date1).trim() === String(date2).trim();
    return key1 === key2;
}

function getAttendanceComparisonData(roll) {
    if (!roll) {
        roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    }

    if (roll === 'DEMO') {
        const curSubs = (state && Array.isArray(state.subjects) && state.subjects.length > 0) ? state.subjects : [];
        const oldSubs = curSubs.map((s, idx) => {
            const copy = { ...s };
            if (idx === 0) {
                copy.attended = Math.max(0, (s.attended || 1) - 2);
                copy.total = Math.max(1, (s.total || 1) - 2);
            } else if (idx === 1) {
                copy.attended = Math.max(0, (s.attended || 1));
                copy.total = Math.max(1, (s.total || 1) - 1);
            } else if (idx === 2) {
                copy.attended = Math.max(0, (s.attended || 1) - 1);
                copy.total = Math.max(1, (s.total || 1) - 1);
            }
            copy.percentage = copy.total > 0 ? ((copy.attended / copy.total) * 100).toFixed(1) : s.percentage;
            return copy;
        });

        return {
            hasComparison: true,
            isSameDate: false,
            isDemo: true,
            oldDate: '16 Sep 2026',
            currentDate: '18 Sep 2026',
            oldSubjects: oldSubs,
            currentSubjects: curSubs,
            differences: computeSubjectDifferences(oldSubs, curSubs)
        };
    }

    const curKey = `bunker_current_attendance_${roll}`;
    const curDateKey = `bunker_current_update_${roll}`;
    const oldKey = `bunker_old_attendance_${roll}`;
    const oldDateKey = `bunker_old_update_${roll}`;

    let curSubs = [];
    let oldSubs = [];
    let curDate = localStorage.getItem(curDateKey) || localStorage.getItem('bunker_last_update') || localStorage.getItem(`bunker_previous_update_${roll}`) || '--';
    let oldDate = localStorage.getItem(oldDateKey) || null;

    try {
        curSubs = JSON.parse(localStorage.getItem(curKey) || 'null') || (state && state.subjects) || [];
    } catch {
        curSubs = (state && state.subjects) || [];
    }

    // 1. First priority: Check client-side offline Attendance Diff Vault
    const snapRaw = localStorage.getItem(`bunker_prev_att_snapshot_${roll}`);
    if (snapRaw) {
        try {
            const snap = JSON.parse(snapRaw);
            if (snap && Array.isArray(snap.subjects) && snap.subjects.length > 0) {
                oldSubs = snap.subjects;
                oldDate = snap.last_update || snap.date || oldDate;
            }
        } catch {}
    }

    // 2. Fallback to older snapshot keys
    if (!oldSubs || oldSubs.length === 0) {
        try {
            oldSubs = JSON.parse(localStorage.getItem(oldKey) || 'null') || [];
        } catch {
            oldSubs = [];
        }
    }

    curSubs = Array.isArray(curSubs) ? curSubs : [];
    oldSubs = Array.isArray(oldSubs) ? oldSubs : [];

    // Resolve full subject names if any subject only has course code
    const resolveSubName = (s) => {
        if (!s) return 'Subject';
        if (s.name && s.name !== s.code) return s.name;
        const code = s.code;
        return (state.courseMapping && state.courseMapping[code]) ||
            (Array.isArray(state.academics?.internals) && state.academics.internals.find(x => x.course_code === code)?.course_name) ||
            s.name || code || 'Subject';
    };
    curSubs = curSubs.map(s => ({ ...s, name: resolveSubName(s) }));
    oldSubs = oldSubs.map(s => ({ ...s, name: resolveSubName(s) }));

    const hasSubjectDiff = oldSubs.length > 0 && curSubs.length > 0 && checkAttendanceDifference(oldSubs, curSubs);
    const hasDifferentDates = Boolean(oldDate && curDate && !isSameAttendanceDate(oldDate, curDate));
    const hasComparison = oldSubs.length > 0 && curSubs.length > 0 && (hasSubjectDiff || hasDifferentDates);
    const isSameDate = !hasComparison;

    return {
        hasComparison,
        isSameDate,
        isDemo: false,
        oldDate: hasComparison ? (oldDate || 'Previous') : 'Old attendance is not available',
        currentDate: curDate,
        oldSubjects: oldSubs,
        currentSubjects: curSubs,
        differences: hasComparison ? computeSubjectDifferences(oldSubs, curSubs) : []
    };
}

function renderAttendanceComparisonCard() {
    const card = document.getElementById('others-attendance-compare-card') || document.getElementById('settings-attendance-compare-card');
    const badge = document.getElementById('compare-change-badge');
    if (!card) return;

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (!roll) return;

    const data = getAttendanceComparisonData(roll);

    if (data.hasComparison) {
        const changesCount = data.differences.filter(d => d.hasChanged).length;
        if (badge) {
            badge.classList.remove('hidden');
            if (changesCount > 0) {
                badge.className = 'text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#102a1d] text-[#6ee7b7] border border-[#1b6b47]/50 shrink-0';
                badge.textContent = `${changesCount} UPDATED`;
            } else {
                badge.className = 'text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-white/10 text-gray-300 border border-white/15 shrink-0';
                badge.textContent = 'SYNCED';
            }
        }
    } else {
        if (badge) {
            badge.classList.remove('hidden');
            badge.className = 'text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#362514] text-[#fde68a] border border-[#78481a] shrink-0';
            badge.textContent = 'CURRENT ONLY';
        }
    }
}

function openAttendanceComparisonModal() {
    const m = document.getElementById('attendance-comparison-modal');
    const p = document.getElementById('att-compare-panel');
    const b = document.getElementById('att-compare-backdrop');
    if (!m || !p || !b) return;

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    const data = getAttendanceComparisonData(roll);
    const listEl = document.getElementById('compare-subjects-list');

    if (listEl) {
        if (data.hasComparison && data.differences.length > 0) {
            listEl.innerHTML = data.differences.map(s => {
                const curOk = parseFloat(s.curPct) >= 75;
                const oldOk = parseFloat(s.oldPct) >= 75;
                return `
                <div class="p-3.5 rounded-2xl border border-sky-500/25 space-y-2.5" style="background: linear-gradient(145deg, rgba(14,165,233,0.16) 0%, rgba(99,102,241,0.08) 55%, rgba(14,13,26,0.95) 100%);">
                    <h4 class="text-xs font-extrabold text-white truncate">${s.name}</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="p-2.5 rounded-xl bg-black/45 border border-white/10 flex flex-col justify-between">
                            <div class="flex items-center justify-between gap-1">
                                <span class="text-[9px] font-bold text-gray-400 uppercase">Old</span>
                                <span class="text-[9px] font-medium text-amber-300/90 truncate">${data.oldDate}</span>
                            </div>
                            <div class="mt-1 flex items-baseline justify-between">
                                <span class="text-sm font-black ${oldOk ? 'text-gray-200' : 'text-rose-300'} tabular-nums">${s.oldPct}%</span>
                                <span class="text-[10px] font-bold text-gray-500 tabular-nums">${s.oldAttended}/${s.oldTotal}</span>
                            </div>
                        </div>
                        <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col justify-between">
                            <div class="flex items-center justify-between gap-1">
                                <span class="text-[9px] font-bold text-indigo-300 uppercase">Current</span>
                                <span class="text-[9px] font-medium text-emerald-300/90 truncate">${data.currentDate}</span>
                            </div>
                            <div class="mt-1 flex items-baseline justify-between">
                                <span class="text-sm font-black ${curOk ? 'text-emerald-400' : 'text-rose-400'} tabular-nums">${s.curPct}%</span>
                                <span class="text-[10px] font-bold text-gray-400 tabular-nums">${s.curAttended}/${s.curTotal}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            const curSubs = (data.currentSubjects && data.currentSubjects.length > 0)
                ? data.currentSubjects
                : ((state && state.subjects) || []);

            if (curSubs.length > 0) {
                listEl.innerHTML = curSubs.map(s => {
                    const att = Number(s.attended || 0);
                    const tot = Number(s.total || 0);
                    const pct = (s.percentage !== undefined && s.percentage !== null)
                        ? parseFloat(s.percentage).toFixed(1)
                        : (tot > 0 ? ((att / tot) * 100).toFixed(1) : '0.0');
                    const curOk = parseFloat(pct) >= 75.0;

                    return `
                    <div class="p-3.5 rounded-2xl border border-sky-500/25 space-y-2.5" style="background: linear-gradient(145deg, rgba(14,165,233,0.16) 0%, rgba(99,102,241,0.08) 55%, rgba(14,13,26,0.95) 100%);">
                        <h4 class="text-xs font-extrabold text-white truncate">${s.name || s.code || 'Subject'}</h4>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="p-2.5 rounded-xl bg-black/45 border border-white/10 flex flex-col justify-between">
                                <span class="text-[9px] font-bold text-gray-400 uppercase">Old</span>
                                <span class="text-[10.5px] font-bold text-amber-300/90 mt-1 leading-tight">Old attendance is not available</span>
                            </div>
                            <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col justify-between">
                                <div class="flex items-center justify-between gap-1">
                                    <span class="text-[9px] font-bold text-indigo-300 uppercase">Current</span>
                                    <span class="text-[9px] font-medium text-emerald-300/90 truncate">${data.currentDate}</span>
                                </div>
                                <div class="mt-1 flex items-baseline justify-between">
                                    <span class="text-sm font-black ${curOk ? 'text-emerald-400' : 'text-rose-400'} tabular-nums">${pct}%</span>
                                    <span class="text-[10px] font-bold text-gray-400 tabular-nums">${att}/${tot}</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            } else {
                listEl.innerHTML = `<div class="p-6 text-center text-xs font-bold text-gray-400">Old attendance is not available</div>`;
            }
        }
    }

    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        b.classList.remove('opacity-0');
        p.classList.remove('opacity-0', 'scale-95');
        p.classList.add('scale-100');
    });

    if (!m._escBound) {
        m._escBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !m.classList.contains('hidden')) {
                closeAttendanceComparisonModal();
            }
        });
    }
}

function closeAttendanceComparisonModal() {
    const m = document.getElementById('attendance-comparison-modal');
    const p = document.getElementById('att-compare-panel');
    const b = document.getElementById('att-compare-backdrop');
    if (!p || !m) return;
    if (b) b.classList.add('opacity-0');
    p.classList.add('opacity-0', 'scale-95');
    p.classList.remove('scale-100');
    document.body.style.overflow = '';
    setTimeout(() => {
        m.classList.add('hidden');
    }, 300);
}

window.openAttendanceComparisonModal = openAttendanceComparisonModal;
window.closeAttendanceComparisonModal = closeAttendanceComparisonModal;
window.renderAttendanceComparisonCard = renderAttendanceComparisonCard;
window.saveAttendanceSnapshot = saveAttendanceSnapshot;
window.getAttendanceComparisonData = getAttendanceComparisonData;

// ================================================================
// ACADEMICS PAGE
// ================================================================

let acadActiveTab = 'internals';


function getAuthToken() {
    // 'bunker_credentials' is stored at login as {roll, password}
    const creds = localStorage.getItem('bunker_credentials');
    return creds || null;
}

function switchAcadTab(tab) {
    acadActiveTab = tab;
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab || activeTab.id !== 'tab-others') {
        switchTab('others', 3);
    }
    openOthersSubView(tab);
}

// Normalize & recompute semester SGPA / CGPA using official PSG College of Technology 2023 Regulation Grade Certificates:
// O = 10, A+ = 9, A = 8, B+ = 7, B = 6.5, C+ = 6, C = 5, RA/U/W/SA/WD = 0, Completed = Non-CGPA
function normalizePsgResultsData(gpaData) {
    if (!gpaData || typeof gpaData !== 'object') return gpaData;
    const gMap = { S: 10, O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6.5, 'C+': 6, C: 5, D: 6, E: 5, P: 5, RA: 0, U: 0, W: 0, SA: 0, WD: 0 };
    const parseCr = (v) => {
        const n = parseFloat(String(v ?? '').trim());
        return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const subs = Array.isArray(gpaData.all_subjects) ? gpaData.all_subjects : (Array.isArray(gpaData.table) ? gpaData.table : []);
    if (!subs.length) return gpaData;

    subs.forEach(c => {
        const cr = parseCr(c.credits);
        const gClean = String(c.grade || '').trim().toUpperCase();
        const isComp = gClean === 'COMPLETED' || cr === 0;
        c.is_non_cgpa = isComp;
        if (isComp) {
            c.grade_points = null;
            if (gClean === 'COMPLETED') c.grade = 'Completed';
        } else if (gMap[gClean] !== undefined) {
            c.grade_points = gMap[gClean];
        }
    });

    const semsFound = [...new Set(subs.map(c => Number(c.sem) || 1))].sort((a, b) => a - b);
    const semwiseData = [];
    const semwiseGpa = {};
    const semwiseCredits = {};

    semsFound.forEach(sem => {
        const semCourses = subs.filter(c => (Number(c.sem) || 1) === sem);
        const creditCourses = semCourses.filter(c => !c.is_non_cgpa && parseCr(c.credits) > 0 && c.grade_points !== null && c.grade_points !== undefined);
        const semCr = creditCourses.reduce((acc, c) => acc + parseCr(c.credits), 0);
        const semEarnedCr = creditCourses
            .filter(c => (!c.result || c.result.toLowerCase() === 'pass') && !['RA', 'U', 'W', 'SA', 'WD'].includes(String(c.grade || '').trim().toUpperCase()) && c.grade_points > 0)
            .reduce((acc, c) => acc + parseCr(c.credits), 0);
        const semCp = creditCourses.reduce((acc, c) => acc + parseCr(c.credits) * Number(c.grade_points), 0);
        const semHasRa = semCourses.some(c => {
            const gUp = String(c.grade || '').trim().toUpperCase();
            return ['RA', 'U', 'SA', 'W'].includes(gUp) || gUp.startsWith('RA') || (c.result && c.result.toLowerCase() === 'fail');
        });

        const sgpaVal = semCr > 0 ? Number((semCp / semCr).toFixed(2)) : 0;
        const sgpaDisp = semHasRa ? 'RA' : sgpaVal.toFixed(2);

        const cumCourses = subs.filter(c => (Number(c.sem) || 1) <= sem && !c.is_non_cgpa && parseCr(c.credits) > 0 && c.grade_points !== null && c.grade_points !== undefined);
        const cumCr = cumCourses.reduce((acc, c) => acc + parseCr(c.credits), 0);
        const cumEarnedCr = cumCourses
            .filter(c => (!c.result || c.result.toLowerCase() === 'pass') && !['RA', 'U', 'W', 'SA', 'WD'].includes(String(c.grade || '').trim().toUpperCase()) && c.grade_points > 0)
            .reduce((acc, c) => acc + parseCr(c.credits), 0);
        const cumCp = cumCourses.reduce((acc, c) => acc + parseCr(c.credits) * Number(c.grade_points), 0);
        const cumHasRa = subs.filter(c => (Number(c.sem) || 1) <= sem).some(c => {
            const gUp = String(c.grade || '').trim().toUpperCase();
            return ['RA', 'U', 'SA', 'W'].includes(gUp) || gUp.startsWith('RA') || (c.result && c.result.toLowerCase() === 'fail');
        });

        const cgpaVal = cumCr > 0 ? Number((cumCp / cumCr).toFixed(2)) : 0;
        const cgpaDisp = cumHasRa ? 'RA' : cgpaVal.toFixed(2);

        semwiseGpa[String(sem)] = sgpaDisp;
        semwiseCredits[String(sem)] = semCr;
        semwiseData.push({
            sem,
            sgpa: sgpaDisp,
            sgpa_numeric: sgpaVal,
            cgpa: cgpaDisp,
            cgpa_numeric: cgpaVal,
            credits: semCr,
            credits_enrolled: semCr,
            credits_earned: semEarnedCr,
            cum_credits_enrolled: cumCr,
            cum_credits_earned: cumEarnedCr,
            has_ra: semHasRa,
            total_subjects: semCourses.length
        });
    });

    const latestSem = semsFound.length ? semsFound[semsFound.length - 1] : 1;
    const totalEarned = subs
        .filter(c => !c.is_non_cgpa && parseCr(c.credits) > 0 && (!c.result || c.result.toLowerCase() === 'pass') && !['RA', 'U', 'W', 'SA', 'WD'].includes(String(c.grade || '').trim().toUpperCase()) && c.grade_points > 0)
        .reduce((acc, c) => acc + parseCr(c.credits), 0);
    const totalEnrolled = subs
        .filter(c => !c.is_non_cgpa && parseCr(c.credits) > 0)
        .reduce((acc, c) => acc + parseCr(c.credits), 0);
    const cpTotal = subs
        .filter(c => !c.is_non_cgpa && parseCr(c.credits) > 0 && c.grade_points !== null && c.grade_points !== undefined)
        .reduce((acc, c) => acc + parseCr(c.credits) * Number(c.grade_points), 0);

    const hasAnyRa = semwiseData.some(s => s.has_ra) || totalEarned < totalEnrolled;
    const overallCgpa = hasAnyRa ? 'RA' : (semwiseData.length ? semwiseData[semwiseData.length - 1].cgpa : '0.00');
    const overallCgpaNumeric = semwiseData.length ? semwiseData[semwiseData.length - 1].cgpa_numeric : 0;

    gpaData.all_subjects = subs;
    gpaData.table = subs;
    gpaData.semwise_data = semwiseData;
    gpaData.semwise_gpa = semwiseGpa;
    gpaData.semwise_credits = semwiseCredits;
    gpaData.latest_sem = latestSem;
    gpaData.latest_gpa = semwiseGpa[String(latestSem)] ?? '0.00';
    gpaData.gpa = gpaData.latest_gpa;
    gpaData.cgpa = overallCgpa;
    gpaData.overall_cgpa = overallCgpa;
    gpaData.overall_cgpa_numeric = overallCgpaNumeric;
    gpaData.has_arrears = hasAnyRa;
    gpaData.cgpa_note = hasAnyRa ? 'CGPA is computed only if candidate passes all the courses registered.' : '';
    gpaData.total_credits = totalEarned;
    gpaData.total_enrolled_credits = totalEnrolled;
    gpaData.credit_points_total = cpTotal;
    return gpaData;
}

function hydrateAcademicsFromPhoneCache() {
    const roll = state.rollNumber || (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}').roll; } catch { return null; } })();
    if (!roll) return false;
    if (state.academics && state.academics.loaded && state.academics.gpa && state.academics.internals) return true;

    let resultsVault = null;
    let internalsVault = null;
    try {
        const rawRes = localStorage.getItem(`bunker_results_vault_${roll}`);
        if (rawRes) resultsVault = JSON.parse(rawRes);
    } catch {}
    try {
        const rawInt = localStorage.getItem(`bunker_internals_vault_${roll}`);
        if (rawInt) internalsVault = JSON.parse(rawInt);
    } catch {}

    // Discard empty resultsVault if 0 subjects and 0 studying_courses were previously cached
    if (
        resultsVault &&
        (!resultsVault.data ||
            ((!Array.isArray(resultsVault.data.table || resultsVault.data.all_subjects) ||
                (resultsVault.data.table || resultsVault.data.all_subjects).length === 0) &&
                (!Array.isArray(resultsVault.data.studying_courses) ||
                    resultsVault.data.studying_courses.length === 0)))
    ) {
        resultsVault = null;
    }

    if (!resultsVault || !internalsVault) {
        try {
            const legacyRaw = localStorage.getItem(`bunker_academics_${roll}`);
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw);
                const legTime = parseInt(localStorage.getItem(`bunker_acad_fetch_time_${roll}`) || '0') || Date.now();
                const legSubs = legacy.gpa && (legacy.gpa.table || legacy.gpa.all_subjects);
                const legStud = legacy.gpa && legacy.gpa.studying_courses;
                if (!resultsVault && legacy.gpa && ((Array.isArray(legSubs) && legSubs.length > 0) || (Array.isArray(legStud) && legStud.length > 0))) {
                    resultsVault = { data: legacy.gpa, timestamp: legTime };
                }
                if (!internalsVault && Array.isArray(legacy.internals) && legacy.internals.length > 0) {
                    internalsVault = { internals: legacy.internals, ca_sig: '', timestamp: legTime };
                }
            }
        } catch {}
    }

    if (resultsVault && resultsVault.data && !state.academics.gpa) {
        const gpaData = normalizePsgResultsData(resultsVault.data);
        state.academics.gpa = gpaData;
        state.academics.cgpa = {
            cgpa: gpaData.cgpa || gpaData.overall_cgpa,
            overall_cgpa: gpaData.overall_cgpa || gpaData.cgpa,
            overall_cgpa_numeric: gpaData.overall_cgpa_numeric,
            credit_points_total: gpaData.credit_points_total,
            cgpa_note: gpaData.cgpa_note || '',
            has_arrears: gpaData.has_arrears || false,
            total_credits: gpaData.total_credits,
            total_enrolled_credits: gpaData.total_enrolled_credits,
            semwise_data: gpaData.semwise_data,
            all_subjects: gpaData.all_subjects || gpaData.table || []
        };
    }

    if (internalsVault && Array.isArray(internalsVault.internals) && internalsVault.internals.length > 0 && (!state.academics.internals || state.academics.internals.length === 0)) {
        state.academics.internals = internalsVault.internals;
    }

    if (state.academics.gpa || (state.academics.internals && state.academics.internals.length > 0)) {
        state.academics.loaded = true;
        state.academics.fromCache = true;
        state.academics.error = false;
        return true;
    }
    return false;
}

async function loadAcademics(force = false, silent = false, scope = 'all') {
    const roll = state.rollNumber || (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}').roll; } catch { return null; } })();
    if (!roll) {
        if (!silent) showAcadError('Please log in with valid credentials to view academic data.');
        return;
    }

    const RESULTS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days on phone (semester results only change once a semester!)
    const INTERNALS_TTL = 24 * 60 * 60 * 1000;   // 24 hours on phone (0 unnecessary Vercel calls)

    // 1. Read existing vaults from user's phone storage
    let resultsVault = null;
    let internalsVault = null;
    try {
        const rawRes = localStorage.getItem(`bunker_results_vault_${roll}`);
        if (rawRes) resultsVault = JSON.parse(rawRes);
    } catch {}

    try {
        const rawInt = localStorage.getItem(`bunker_internals_vault_${roll}`);
        if (rawInt) internalsVault = JSON.parse(rawInt);
    } catch {}

    // Discard empty resultsVault if 0 subjects and 0 studying_courses were previously cached
    if (
        resultsVault &&
        (!resultsVault.data ||
            ((!Array.isArray(resultsVault.data.table || resultsVault.data.all_subjects) ||
                (resultsVault.data.table || resultsVault.data.all_subjects).length === 0) &&
                (!Array.isArray(resultsVault.data.studying_courses) ||
                    resultsVault.data.studying_courses.length === 0)))
    ) {
        resultsVault = null;
    }

    // Fallback to legacy bunker_academics_<roll> if vaults are not yet initialized
    if (!resultsVault || !internalsVault) {
        try {
            const legacyRaw = localStorage.getItem(`bunker_academics_${roll}`);
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw);
                const legTime = parseInt(localStorage.getItem(`bunker_acad_fetch_time_${roll}`) || '0') || Date.now();
                const legSubs = legacy.gpa && (legacy.gpa.table || legacy.gpa.all_subjects);
                const legStud = legacy.gpa && legacy.gpa.studying_courses;
                if (!resultsVault && legacy.gpa && ((Array.isArray(legSubs) && legSubs.length > 0) || (Array.isArray(legStud) && legStud.length > 0))) {
                    resultsVault = { data: legacy.gpa, timestamp: legTime };
                }
                if (!internalsVault && Array.isArray(legacy.internals) && legacy.internals.length > 0) {
                    internalsVault = { internals: legacy.internals, ca_sig: '', timestamp: legTime };
                }
            }
        } catch {}
    }

    const now = Date.now();
    const hasFreshResults = Boolean(
        resultsVault &&
        resultsVault.data &&
        ((Array.isArray(resultsVault.data.table || resultsVault.data.all_subjects) &&
            (resultsVault.data.table || resultsVault.data.all_subjects).length > 0) ||
            (Array.isArray(resultsVault.data.studying_courses) &&
                resultsVault.data.studying_courses.length > 0)) &&
        (now - (resultsVault.timestamp || 0) < RESULTS_TTL)
    );
    const hasFreshInternals = Boolean(
        internalsVault &&
        Array.isArray(internalsVault.internals) &&
        internalsVault.internals.length > 0 &&
        (now - (internalsVault.timestamp || 0) < INTERNALS_TTL)
    );

    // If cached results or internals exist, load and render immediately for 0ms visual load
    if (resultsVault && resultsVault.data) {
        const gpaData = normalizePsgResultsData(resultsVault.data);
        state.academics.gpa = gpaData;
        state.academics.cgpa = {
            cgpa: gpaData.cgpa || gpaData.overall_cgpa,
            overall_cgpa: gpaData.overall_cgpa || gpaData.cgpa,
            overall_cgpa_numeric: gpaData.overall_cgpa_numeric,
            credit_points_total: gpaData.credit_points_total,
            cgpa_note: gpaData.cgpa_note || '',
            has_arrears: gpaData.has_arrears || false,
            total_credits: gpaData.total_credits,
            total_enrolled_credits: gpaData.total_enrolled_credits,
            semwise_data: gpaData.semwise_data,
            all_subjects: gpaData.all_subjects || gpaData.table || []
        };
    }

    if (internalsVault && Array.isArray(internalsVault.internals) && internalsVault.internals.length > 0) {
        state.academics.internals = internalsVault.internals;
    }

    if (state.academics.gpa || (state.academics.internals && state.academics.internals.length > 0)) {
        state.academics.loaded = true;
        state.academics.fromCache = true;
        state.academics.error = false;
        document.getElementById('acad-loading')?.classList.add('hidden');
        document.getElementById('acad-error')?.classList.add('hidden');
        if (state.academics.internals && state.academics.internals.length > 0) renderInternals(state.academics.internals);
        if (state.academics.gpa) renderGPA(state.academics.gpa);
        if (state.academics.cgpa) renderCGPA(state.academics.cgpa);
        renderOthersOverview();

        const scopeSatisfied =
            (scope === 'results' && hasFreshResults) ||
            (scope === 'internals' && hasFreshInternals) ||
            (scope === 'all' && hasFreshResults && hasFreshInternals);
        if (!force && scopeSatisfied) {
            return;
        }
    }

    if (state.academics.loading) return; // Prevent duplicate requests
    state.academics.loading = true;
    state.academics.error = false;
    document.getElementById('acad-error')?.classList.add('hidden');
    renderOthersOverview();

    // Show non-blocking inline loading states inside empty containers (keep data cards hidden until data arrives!)
    document.getElementById('acad-panel-results')?.classList.remove('hidden');
    document.getElementById('acad-panel-internals')?.classList.remove('hidden');

    if (!state.academics.internals || state.academics.internals.length === 0) {
        document.getElementById('internals-predictor-card')?.classList.add('hidden');
        const intList = document.getElementById('internals-list');
        if (intList) {
            intList.innerHTML = `
                <div class="bento-card p-8 text-center space-y-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                        <i class="fas fa-circle-notch fa-spin text-sm"></i>
                    </div>
                    <p class="text-xs font-black text-white uppercase tracking-wider">Loading Internal Marks...</p>
                    <p class="text-[10px] text-gray-400">Fetching latest CA test, tutorial &amp; lab marks from PSG eCampus</p>
                </div>`;
        }
    }

    if (!state.academics.gpa) {
        document.getElementById('results-data-container')?.classList.add('hidden');
        document.getElementById('results-error-state')?.classList.add('hidden');
        document.getElementById('results-cgpa-pill')?.classList.add('hidden');
        document.getElementById('results-loading-state')?.classList.remove('hidden');
    }

    const authToken = getAuthToken();
    if (!authToken) {
        state.academics.loading = false;
        if (!silent) showAcadError('Please log in with valid credentials to view academic data.');
        return;
    }

    try {
        const sessionToken = localStorage.getItem('bunker_session_token') || '';

        // Determine if we need internals and/or results in a SINGLE serverless invocation (/api/academics)
        const needInternals = scope === 'results' ? (!state.academics.internals && !hasFreshInternals) : (force || !hasFreshInternals);
        const knownCaSig = (internalsVault && internalsVault.ca_sig) ? internalsVault.ca_sig : '';
        const needResults = scope === 'internals' ? (!state.academics.gpa && !hasFreshResults) : (force || !hasFreshResults);

        if (!needInternals && !needResults) {
            state.academics.loading = false;
            renderOthersOverview();
            return;
        }

        const acadRes = await fetch('/api/academics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_token: authToken,
                session_token: sessionToken,
                need_internals: needInternals,
                need_results: needResults,
                known_ca_sig: knownCaSig,
                force: force
            })
        });

        const uiVerHeader = acadRes.headers.get('X-Bunker-UI-Version');
        if (uiVerHeader) checkAndRolloutUIUpdate(uiVerHeader);

        const newTok = acadRes.headers.get('X-Session-Token');
        if (newTok) localStorage.setItem('bunker_session_token', newTok);
        const headerSig = acadRes.headers.get('X-CA-Sig') || '';

        const acadPayload = await acadRes.json();
        if (!acadRes.ok || acadPayload.error) {
            state.academics.loading = false;
            if (!silent) showAcadError(acadPayload.error || 'Could not sync marks from portal.');
            return;
        }

        if (acadPayload.session_token) {
            localStorage.setItem('bunker_session_token', acadPayload.session_token);
        }

        let internalsUpdated = false;
        let resultsUpdated = false;

        if (needInternals) {
            if (acadPayload.internals_up_to_date) {
                const renewedSig = acadPayload.ca_sig || headerSig || knownCaSig;
                if (internalsVault && internalsVault.internals) {
                    internalsVault.timestamp = Date.now();
                    internalsVault.ca_sig = renewedSig;
                    localStorage.setItem(`bunker_internals_vault_${roll}`, JSON.stringify(internalsVault));
                }
            } else if (Array.isArray(acadPayload.internals)) {
                const caSig = acadPayload.ca_sig || headerSig || '';
                state.academics.internals = acadPayload.internals;
                if (acadPayload.internals.length > 0) {
                    internalsVault = { internals: acadPayload.internals, ca_sig: caSig, timestamp: Date.now() };
                    localStorage.setItem(`bunker_internals_vault_${roll}`, JSON.stringify(internalsVault));
                    let namesBackfilled = false;
                    if (!state.courseMapping) state.courseMapping = {};
                    acadPayload.internals.forEach(item => {
                        if (item.course_code && item.course_name && item.course_name !== item.course_code) {
                            state.courseMapping[item.course_code] = item.course_name;
                            const subj = Array.isArray(state.subjects) ? state.subjects.find(s => s.code === item.course_code) : null;
                            if (subj && (!subj.name || subj.name === subj.code)) {
                                subj.name = item.course_name;
                                namesBackfilled = true;
                            }
                        }
                    });
                    if (namesBackfilled) {
                        localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
                        localStorage.setItem('bunker_subjects', JSON.stringify(state.subjects));
                        localStorage.setItem('bunker_cached_subjects', JSON.stringify(state.subjects));
                        localStorage.setItem(`bunker_subjects_${roll}`, JSON.stringify(state.subjects));
                        renderSubjects();
                    }
                }
                internalsUpdated = true;
            }
        }

        if (needResults && acadPayload.results) {
            const gpaData = normalizePsgResultsData(acadPayload.results);
            const subs = gpaData.all_subjects || gpaData.table || [];
            const studSubs = gpaData.studying_courses || [];
            state.academics.gpa = gpaData;
            state.academics.cgpa = {
                cgpa: gpaData.cgpa || gpaData.overall_cgpa,
                overall_cgpa: gpaData.overall_cgpa || gpaData.cgpa,
                overall_cgpa_numeric: gpaData.overall_cgpa_numeric,
                credit_points_total: gpaData.credit_points_total,
                cgpa_note: gpaData.cgpa_note || '',
                has_arrears: gpaData.has_arrears || false,
                total_credits: gpaData.total_credits,
                total_enrolled_credits: gpaData.total_enrolled_credits,
                semwise_data: gpaData.semwise_data,
                all_subjects: subs
            };
            // Persist to 30-day phone vault if subjects or studying_courses were returned
            if ((Array.isArray(subs) && subs.length > 0) || (Array.isArray(studSubs) && studSubs.length > 0)) {
                resultsVault = { data: gpaData, timestamp: Date.now() };
                localStorage.setItem(`bunker_results_vault_${roll}`, JSON.stringify(resultsVault));
                resultsUpdated = true;
            }
        }

        // Update legacy key for compatibility
        try {
            localStorage.setItem(`bunker_academics_${roll}`, JSON.stringify({
                internals: state.academics.internals,
                gpa: state.academics.gpa,
                cgpa: state.academics.cgpa
            }));
            localStorage.setItem(`bunker_acad_fetch_time_${roll}`, Date.now().toString());
        } catch {}

        state.academics.loaded = true;
        state.academics.loading = false;
        state.academics.fromCache = false;
        state.academics.error = false;

        document.getElementById('acad-loading')?.classList.add('hidden');
        document.getElementById('acad-error')?.classList.add('hidden');
        if (state.academics.internals) renderInternals(state.academics.internals);
        if (state.academics.gpa) renderGPA(state.academics.gpa);
        if (state.academics.cgpa) renderCGPA(state.academics.cgpa);
        renderOthersOverview();

        if (internalsUpdated || resultsUpdated) {
            showToast('📊 Marks updated!', 'success');
        }

    } catch (err) {
        state.academics.loading = false;
        if (!silent) showAcadError('Network error. Make sure you are connected.');
    }
}

// Background auto-revalidation disabled: marks are loaded strictly on-demand on the Others tab
async function revalidateAcademicsInBackground() {
    return;
}


function showAcadError(msg) {
    document.getElementById('acad-loading')?.classList.add('hidden');
    document.getElementById('acad-error')?.classList.add('hidden');
    if (!state.academics) state.academics = {};
    state.academics.loading = false;
    state.academics.error = true;
    state.academics.errorMsg = msg || 'Failed to load academic data';

    renderOthersOverview();
    showToast(msg || 'Could not load academic marks', 'error');

    const retryHtml = `
        <div class="bento-card p-6 text-center space-y-3 border border-rose-500/25">
            <div class="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <i class="fas fa-exclamation-triangle text-sm"></i>
            </div>
            <p class="text-xs font-black text-white">${msg || 'Failed to load marks'}</p>
            <button type="button" onclick="loadAcademics(true, false, 'all')" class="px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-200 text-[11px] font-black uppercase tracking-wider active:scale-95 transition">
                <i class="fas fa-sync-alt mr-1.5"></i>Retry Sync
            </button>
        </div>`;

    if (!state.academics.internals || state.academics.internals.length === 0) {
        document.getElementById('internals-predictor-card')?.classList.add('hidden');
        const intList = document.getElementById('internals-list');
        if (intList) intList.innerHTML = retryHtml;
    }
    if (!state.academics.gpa) {
        document.getElementById('results-loading-state')?.classList.add('hidden');
        document.getElementById('results-data-container')?.classList.add('hidden');
        document.getElementById('results-cgpa-pill')?.classList.add('hidden');
        const resErr = document.getElementById('results-error-state');
        const resErrMsg = document.getElementById('results-error-msg');
        if (resErrMsg) resErrMsg.textContent = msg || 'Failed to load Semester Marks';
        if (resErr) resErr.classList.remove('hidden');
    }
}

// ============================================================================
// PSG SEMESTER PASS MARK MATRIX & CALCULATOR ENGINE
// ============================================================================

const PSG_PASS_TABLE = [
    { ca40: 12, sem100: 62, sem60: 37.2, roundUp: 38, final: 50 },
    { ca40: 13, sem100: 61, sem60: 36.6, roundUp: 37, final: 50 },
    { ca40: 14, sem100: 59, sem60: 35.4, roundUp: 36, final: 50 },
    { ca40: 15, sem100: 57, sem60: 34.2, roundUp: 35, final: 50 },
    { ca40: 16, sem100: 56, sem60: 33.6, roundUp: 34, final: 50 },
    { ca40: 17, sem100: 54, sem60: 32.4, roundUp: 33, final: 50 },
    { ca40: 18, sem100: 52, sem60: 31.2, roundUp: 32, final: 50 },
    { ca40: 19, sem100: 51, sem60: 30.6, roundUp: 31, final: 50 },
    { ca40: 20, sem100: 50, sem60: 30.0, roundUp: 30, final: 50 },
    { ca40: 21, sem100: 48, sem60: 28.8, roundUp: 29, final: 50 },
    { ca40: 22, sem100: 46, sem60: 27.6, roundUp: 28, final: 50 },
    { ca40: 23, sem100: 45, sem60: 27.0, roundUp: 27, final: 50 },
    { ca40: 24, sem100: 45, sem60: 27.0, roundUp: 27, final: 51 }
];

function getSemPassDetails(ca40) {
    const numCA = Math.max(0, Number(ca40) || 0);
    const roundedCA = Math.round(numCA);

    // Exact lookup from PSG official table for integer 12..24 (enforcing Section 8(v)(a) min 45/100 in Final Exam)
    if (Math.abs(numCA - roundedCA) < 0.05 && roundedCA >= 12 && roundedCA <= 24) {
        const found = PSG_PASS_TABLE.find(item => item.ca40 === roundedCA);
        if (found) {
            return {
                ca40: roundedCA,
                sem100: found.sem100,
                sem60: found.sem60,
                roundUp: found.roundUp,
                final: found.final,
                isTableMatch: true
            };
        }
    }

    // Dynamic calculation with PSG Tech 60% conversion, ceil rounding, and mandatory >= 45/100 Final Exam minimum (Section 8(v)(a))
    for (let s = 45; s <= 100; s++) {
        const sem60 = Number((s * 0.6).toFixed(1));
        const ru = Math.ceil(sem60 - 1e-6);
        if (numCA + ru >= 50) {
            return {
                ca40: Number(numCA.toFixed(1)),
                sem100: s,
                sem60: sem60,
                roundUp: ru,
                final: Math.round(numCA + ru)
            };
        }
    }

    return {
        ca40: Number(numCA.toFixed(1)),
        sem100: 100,
        sem60: 60.0,
        roundUp: 60,
        final: Math.round(numCA + 60),
        impossible: true
    };
}

// Exact PSG 40:60 (Theory, min 45 FE) or 60:40 (Lab, min 50 FE) Ceiled Sem Score needed for target total out of 100
function calcSemNeededForTarget(caScore, targetTotal, isLab = false) {
    const numCA = Number(caScore) || 0;
    const scale = isLab ? 0.4 : 0.6;
    const minSem = isLab ? 50 : 45;
    for (let s = minSem; s <= 100; s++) {
        const ru = Math.ceil(Number((s * scale).toFixed(1)) - 1e-6);
        if (numCA + ru >= targetTotal) return s;
    }
    return null;
}
window.calcSemNeededForTarget = calcSemNeededForTarget;

function getSemNeededForGrade(ca40, targetTotal, isLab = false) {
    const numCA = Math.max(0, Number(ca40) || 0);
    if (targetTotal <= 50 && !isLab) {
        const pass = getSemPassDetails(numCA);
        return pass.impossible ? null : pass.sem100;
    }
    const factor = isLab ? 0.4 : 0.6;
    const minSem = isLab ? 50 : 45;
    for (let s = minSem; s <= 100; s++) {
        const sScaled = s * factor;
        const sCeil = Math.ceil(Number(sScaled.toFixed(1)) - 1e-6);
        if (numCA + sCeil >= targetTotal) {
            return s;
        }
    }
    return null;
}

let activePassMatrixCourse = null;
let passMatrixExtended = false;

function openPassMatrixModal(courseCode = null, initialCA = null) {
    const m = document.getElementById('pass-matrix-modal');
    const p = document.getElementById('pass-matrix-panel');
    const b = document.getElementById('pass-matrix-backdrop');
    if (!m || !p || !b) return;

    if (typeof hydrateAcademicsFromPhoneCache === 'function') {
        hydrateAcademicsFromPhoneCache();
    }

    activePassMatrixCourse = courseCode;
    renderPassMatrixAutoSubjects();

    if ((!state.academics || !Array.isArray(state.academics.internals) || state.academics.internals.length === 0) && typeof loadAcademics === 'function') {
        loadAcademics(false, false, 'internals');
    }

    // Show modal
    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        b.classList.remove('opacity-0');
        p.classList.remove('opacity-0', 'scale-95');
        p.classList.add('scale-100');
    });

    if (!m._escBound) {
        m._escBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !m.classList.contains('hidden')) {
                closePassMatrixModal();
            }
        });
    }
}

function closePassMatrixModal() {
    const m = document.getElementById('pass-matrix-modal');
    const p = document.getElementById('pass-matrix-panel');
    const b = document.getElementById('pass-matrix-backdrop');
    if (!p || !m) return;

    if (b) b.classList.add('opacity-0');
    p.classList.remove('scale-100');
    p.classList.add('opacity-0', 'scale-95');

    setTimeout(() => {
        m.classList.add('hidden');
        document.body.style.overflow = '';
        activePassMatrixCourse = null;
    }, 280);
}

function switchPassMatrixTab(tab) {}
function updatePassMatrixFromSlider(val) {}
function stepPassMatrixCA(delta) {}
window.stepPassMatrixCA = stepPassMatrixCA;

function renderPassMatrixAutoSubjects() {
    const listEl = document.getElementById("pm-auto-subjects-list");
    if (!listEl) return;
    if (!state.academics || !state.academics.internals || state.academics.internals.length === 0) {
        listEl.innerHTML = '<div class="text-center text-xs font-bold text-gray-400 py-6">Syncing subjects...</div>';
        return;
    }

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    let savedSim = null;
    try {
        const rawSim = localStorage.getItem(`bunker_internals_sim_${roll}`);
        if (rawSim) savedSim = JSON.parse(rawSim);
    } catch {}

    const validList = state.academics.internals.filter(x => x.course_code && !isZeroCreditCourse(x.course_code) && getSubjectMaxOut(x) !== 100);
    const targetList = validList.length > 0 ? validList : state.academics.internals.filter(x => x.course_code);

    listEl.innerHTML = targetList.map(item => {
        const rowData = item.row_data || [];
        const numCols = rowData.length;
        const expectedKeys = getSchemaKeys(item.is_lab, numCols);
        const simKeys = expectedKeys.filter(k => !["best2t", "bestmcq", "total", "conv", "rt", "rt1", "rt2"].includes(k));

        const d = {};
        expectedKeys.forEach((k, i) => {
            const val = rowData[i];
            d[k] = (!val || val === '*' || String(val).trim() === '') ? null : parseFloat(val);
        });
        ensureSubjectSimState(item, d, simKeys, savedSim);

        const portalConv = parseFloat(item.total_converted);
        const caScaled = !isNaN(portalConv)
            ? portalConv
            : computeCAScaled(item, simKeys, (window.simState && window.simState[item.course_code]) || d);

        const passMark = getMinSemToPassForSubject(item, caScaled);
        const isSafe = passMark <= 50;
        const rowGrad = isSafe
            ? 'background: linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(15,14,28,0.92) 70%); border-color: rgba(16,185,129,0.32);'
            : 'background: linear-gradient(135deg, rgba(244,63,94,0.16) 0%, rgba(15,14,28,0.92) 70%); border-color: rgba(244,63,94,0.32);';

        return `
        <div class="p-3.5 rounded-2xl border flex items-center justify-between gap-3" style="${rowGrad}">
            <h4 class="text-xs sm:text-[13px] font-extrabold text-white truncate flex-1">${item.course_name}</h4>
            <div class="shrink-0 px-3 py-1.5 rounded-xl ${isSafe ? 'bg-emerald-500/20 border-emerald-500/35 text-emerald-300' : 'bg-rose-500/20 border-rose-500/35 text-rose-300'} border text-xs font-black tabular-nums">
                ${passMark} / 100
            </div>
        </div>`;
    }).join("");
}
window.renderPassMatrixAutoSubjects = renderPassMatrixAutoSubjects;

function updatePassMatrix(ca, codeLabel = null) {
    renderPassMatrixAutoSubjects();
}
window.updatePassMatrix = updatePassMatrix;

function setPassMatrixCA(caVal, codeLabel = null) {
    const numCA = Math.max(0, Math.min(40, Number(Number(caVal).toFixed(1))));
    const slider = document.getElementById("pass-matrix-slider");
    const pmSlider = document.getElementById("pm-ca-slider");
    const inputVal = document.getElementById("pass-matrix-input-val");
    if (slider) slider.value = numCA;
    if (pmSlider) pmSlider.value = numCA;
    if (inputVal) inputVal.innerText = Number.isInteger(numCA) ? String(numCA) : numCA.toFixed(1);

    // Update pill highlights
    document.querySelectorAll(".pm-pill").forEach(btn => {
        if (Math.abs(parseFloat(btn.innerText.trim()) - numCA) < 0.05) {
            btn.className = "pm-pill py-1.5 rounded-xl bg-rose-500/25 border border-rose-500/50 text-[11px] font-black text-rose-200 transition active:scale-95 tabular-nums";
        } else {
            btn.className = "pm-pill py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black text-gray-300 transition active:scale-95 tabular-nums";
        }
    });

    const passInfo = getSemPassDetails(numCA);

    // Update compact quick bar elements
    const labelEl = document.getElementById("pm-selected-label");
    if (labelEl) labelEl.innerText = codeLabel ? `${codeLabel} • 40:60 Target` : "Custom CA Check";
    const caDisp = document.getElementById("pm-ca-display");
    if (caDisp) caDisp.innerText = `${Number.isInteger(numCA) ? numCA : numCA.toFixed(1)}/40`;
    const semNeedEl = document.getElementById("pm-sem-needed");
    if (semNeedEl) semNeedEl.innerText = `Pass: ${passInfo.sem100}/100`;
    const proofEl = document.getElementById("pm-formula-proof");
    if (proofEl) proofEl.innerText = `${passInfo.sem100} × 0.6 = ${passInfo.sem60} ➔ ${passInfo.roundUp} + ${Number.isInteger(numCA) ? numCA : numCA.toFixed(1)} CA = ${passInfo.final} (PASS)`;

    // Update 6 Target grade cards (PSG 2023 Regulations: C >= 50, B >= 56, B+ >= 61, A >= 71, A+ >= 81, O >= 91)
    const cpEl = document.getElementById("pm-grade-cplus");
    const bEl = document.getElementById("pm-grade-b");
    const bpEl = document.getElementById("pm-grade-bplus");
    const aEl = document.getElementById("pm-grade-a");
    const apEl = document.getElementById("pm-grade-aplus");
    const sEl = document.getElementById("pm-grade-s");

    const reqCp = calcSemNeededForTarget(numCA, 50);
    const reqB = calcSemNeededForTarget(numCA, 56);
    const reqBp = calcSemNeededForTarget(numCA, 61);
    const reqA = calcSemNeededForTarget(numCA, 71);
    const reqAp = calcSemNeededForTarget(numCA, 81);
    const reqS = calcSemNeededForTarget(numCA, 91);

    if (cpEl) cpEl.innerText = reqCp !== null ? reqCp : "--";
    if (bEl) bEl.innerText = reqB !== null ? reqB : "--";
    if (bpEl) bpEl.innerText = reqBp !== null ? reqBp : "--";
    if (aEl) aEl.innerText = reqA !== null ? reqA : "--";
    if (apEl) apEl.innerText = reqAp !== null ? reqAp : "--";
    if (sEl) sEl.innerText = reqS !== null ? reqS : "--";

    // Update Hero numbers
    const resSem = document.getElementById("pm-res-sem100");
    const resBadge = document.getElementById("pm-res-badge");
    const sCA = document.getElementById("pm-step-ca40");
    const sSem = document.getElementById("pm-step-sem100");
    const sSem60 = document.getElementById("pm-step-sem60");
    const sFinal = document.getElementById("pm-step-final");
    const sCalcText = document.getElementById("pm-step-calc-text");

    if (resSem) resSem.innerText = passInfo.sem100;
    if (sCA) sCA.innerText = passInfo.ca40.toFixed(1);
    if (sSem) sSem.innerText = passInfo.sem100;
    if (sSem60) sSem60.innerText = `${passInfo.sem60} ➔ ${passInfo.roundUp}`;
    if (sFinal) sFinal.innerText = passInfo.final;
    if (sCalcText) sCalcText.innerText = `${passInfo.ca40} + ${passInfo.roundUp} = ${passInfo.final}`;

    if (resBadge) {
        if (passInfo.alreadyPassed) {
            resBadge.innerText = "Already Safe";
            resBadge.className = "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
        } else if (passInfo.sem100 <= 46) {
            resBadge.innerText = "Comfortable Target";
            resBadge.className = "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
        } else if (passInfo.sem100 <= 54) {
            resBadge.innerText = "Standard Target";
            resBadge.className = "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
        } else {
            resBadge.innerText = "High Focus Needed";
            resBadge.className = "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30";
        }
    }
}

function setPresetPendingMarks(courseCode, ratio, allComponents = false) {
    const subject = state.academics && state.academics.internals ? state.academics.internals.find(s => s.course_code === courseCode) : null;
    if (!subject) return;
    const numCols = subject.row_data.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
    
    simKeys.forEach(k => {
        const idx = expectedKeys.indexOf(k);
        const actual = subject.row_data[idx];
        const isMissing = !actual || actual === '*' || actual.trim() === '';
        if ((allComponents || isMissing) && window.simState && window.simState[courseCode]) {
            const meta = window.METADATA[k] || window.METADATA['c1'];
            const val = Number((meta.max * ratio).toFixed(1));
            window.simState[courseCode][k] = val;
            const slider = document.getElementById(`slider-${courseCode}-${k}`);
            if (slider) slider.value = val;
            const textVal = document.getElementById(`val-${courseCode}-${k}`);
            if (textVal) textVal.innerText = val;
            const badgeEl = document.getElementById(`badge-${courseCode}-${k}`);
            if (badgeEl && !isMissing) {
                badgeEl.innerText = `Simulated (Official: ${actual})`;
                badgeEl.className = 'text-[8.5px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
            }
        }
    });
    calculateSimOutputs(courseCode, subject);
    showToast(`Applied ${Math.round(ratio * 100)}% CA preset for ${courseCode}`);
}

function renderPassMatrixTable(showExtended = false) {}
function highlightActiveTableRow(caVal) {}
function selectMatrixRow(caVal) { setPassMatrixCA(caVal); }
function toggleExtendedPassTable() {}

function applyPassMatrixToActiveSubject() {
    if (!activePassMatrixCourse) {
        showToast("Select a subject below first to apply.");
        return;
    }
    const slider = document.getElementById('pass-matrix-slider') || document.getElementById('pm-ca-slider');
    const caVal = slider ? parseFloat(slider.value) : 24;
    const passInfo = getSemPassDetails(caVal);
    applyPassTargetToSim(activePassMatrixCourse, passInfo.sem100);
    closePassMatrixModal();
}

function applyPassTargetToSim(courseCode, targetSem) {
    if (!courseCode) return;
    if (targetSem === undefined || targetSem === null) {
        const subject = state.academics && state.academics.internals ? state.academics.internals.find(s => s.course_code === courseCode) : null;
        if (subject) {
            const numCols = subject.row_data.length;
            const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
            const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
            const totalCA = calcCATotal(subject.is_lab, simKeys, (window.simState && window.simState[courseCode]) || {});
            const ca40 = subject.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40);
            targetSem = getSemPassDetails(ca40).sem100;
        } else {
            targetSem = 50;
        }
    }
    updateSim(courseCode, 'sem', targetSem);
    showToast(`Set Final Sem Exam to ${targetSem}/100 for ${courseCode}`);
}

function copyPassMatrixSummary() {
    const caVal = document.getElementById('pass-matrix-input-val')?.innerText || '24';
    const semVal = document.getElementById('pm-res-sem100')?.innerText || '42';
    const sSem60 = document.getElementById('pm-step-sem60')?.innerText || '25.2 ➔ 26';
    const text = `PSG Tech Sem Pass Target:\n• Continuous Assessment: ${caVal} / 40\n• Required in Sem Exam: ${semVal} / 100\n• 60% Scale: ${sSem60}\n• Final Combined Score: 50 / 100 (PASS)\n(Checked on PSG Bunker)`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 Pass summary copied to clipboard!');
        }).catch(() => {
            showToast('Summary: ' + text.replace(/\n/g, ' '));
        });
    } else {
        showToast('Summary: ' + text.replace(/\n/g, ' '));
    }
}

window.openPassMatrixModal = openPassMatrixModal;
window.closePassMatrixModal = closePassMatrixModal;
window.switchPassMatrixTab = switchPassMatrixTab;
window.updatePassMatrixFromSlider = updatePassMatrixFromSlider;
window.setPassMatrixCA = setPassMatrixCA;
window.selectMatrixRow = selectMatrixRow;
window.toggleExtendedPassTable = toggleExtendedPassTable;
window.applyPassMatrixToActiveSubject = applyPassMatrixToActiveSubject;
window.applyPassTargetToSim = applyPassTargetToSim;
window.copyPassMatrixSummary = copyPassMatrixSummary;
window.getSemPassDetails = getSemPassDetails;

// ---- INTERNALS ----
let activeInternalModalCode = null;
let activeInternalModalMode = 'details';

function getSubjectMaxOut(sub) {
    if (!sub) return 40;
    if (sub.target_max && [40, 60, 100].includes(Number(sub.target_max))) return Number(sub.target_max);
    if (sub.is_lab) return 60;
    const code = String(sub.course_code || '').toUpperCase();
    const name = String(sub.course_name || '').toUpperCase();
    if (code === '23K312' || name.includes('ENVIRONMENTAL') || code === '23U315' || name.includes('ACTIVITY POINT')) return 100;
    return 40;
}

function computeCAScaled(sub, simKeys, valuesObj) {
    const rawCA = calcCATotal(sub.is_lab, simKeys, valuesObj);
    const maxOut = getSubjectMaxOut(sub);
    if (sub.is_lab || maxOut === 60) return Math.min(60, Number((rawCA * 1.2).toFixed(2)));
    if (maxOut === 100) {
        if (simKeys.includes('eh')) return Math.min(100, Number(((rawCA / 150) * 100).toFixed(2)));
        return Math.min(100, Number(rawCA.toFixed(2)));
    }
    return Math.min(40, Number(((rawCA / 50) * 40).toFixed(2)));
}

function getMinSemToPassForSubject(sub, caScaled) {
    const maxOut = getSubjectMaxOut(sub);
    if (maxOut === 100) return 50;
    if (sub.is_lab) {
        return calcSemNeededForTarget(caScaled, 50, true) ?? 50;
    }
    const passInfo = getSemPassDetails(caScaled);
    return passInfo.sem100;
}

function ensureSubjectSimState(sub, d, simKeys, savedSim) {
    const code = sub.course_code;
    if (!window.simState) window.simState = {};
    const courseSaved = (savedSim && savedSim[code]) ? savedSim[code] : null;
    if (!window.simState[code]) window.simState[code] = {};

    simKeys.forEach(k => {
        const actual = d[k];
        const meta = window.METADATA[k] || window.METADATA['c1'];
        if (actual !== null && !isNaN(actual)) {
            // Uploaded in eCampus -> strictly locked to official mark!
            window.simState[code][k] = actual;
        } else if (courseSaved && courseSaved[k] !== undefined && !isNaN(Number(courseSaved[k]))) {
            window.simState[code][k] = Number(courseSaved[k]);
        } else if (window.simState[code][k] === undefined) {
            // Default pending mark to 0 so initial state reflects uploaded marks + min pass
            window.simState[code][k] = 0;
        }
    });

    const caScaled = computeCAScaled(sub, simKeys, window.simState[code]);
    const minPassSem = getMinSemToPassForSubject(sub, caScaled);

    if (courseSaved && courseSaved.sem !== undefined && courseSaved.userSimulatedSem) {
        window.simState[code].sem = Number(courseSaved.sem);
        window.simState[code].userSimulatedSem = true;
    } else if (!window.simState[code].userSimulatedSem) {
        // Default simulation to minimum marks needed to pass in final exam
        window.simState[code].sem = minPassSem;
        window.simState[code].userSimulatedSem = false;
    }
}

function renderInternals(internals) {
    const list = document.getElementById('internals-list');
    const predCard = document.getElementById('internals-predictor-card');
    if (!list) return;

    const mainSubjects = (internals || []).filter(s => Boolean(s.course_code));

    if (mainSubjects.length === 0) {
        if (predCard) predCard.classList.add('hidden');
        list.innerHTML = `<div class="text-center py-10 opacity-50"><p class="text-xs font-bold uppercase tracking-widest text-gray-500">No Courses Found Yet</p></div>`;
        return;
    }

    // Unhide SGPA & CGPA Predictor card ONLY after internal marks data has arrived
    if (predCard) predCard.classList.remove('hidden');

    if (typeof window.METADATA === 'undefined') {
        window.METADATA = {
            t1:    { label: 'Test 1 (T1)', max: 30, weight: 15, color: 'text-blue-400', accent: 'bg-blue-500' },
            t2:    { label: 'Test 2 (T2)', max: 30, weight: 15, color: 'text-indigo-400', accent: 'bg-indigo-500' },
            rt:    { label: 'Retest (RT)', max: 30, weight: 15, color: 'text-orange-400', accent: 'bg-orange-500' },
            rt1:   { label: 'Retest 1 (RT 1)', max: 30, weight: 15, color: 'text-orange-400', accent: 'bg-orange-500' },
            rt2:   { label: 'Retest 2 (RT 2)', max: 30, weight: 15, color: 'text-orange-400', accent: 'bg-orange-500' },
            best2t:{ label: 'Total (Best 2 Tests)', max: 30, weight: 30, color: 'text-sky-400', accent: 'bg-sky-500' },
            ap:    { label: 'Assignment / Presentation (AP)', max: 10, weight: 10, color: 'text-purple-400', accent: 'bg-purple-500' },
            ap1:   { label: 'Assessment Tutorial 1 (AT 1)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            ap2:   { label: 'Assessment Tutorial 2 (AT 2)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            at1:   { label: 'Assessment Tutorial 1 (AT 1)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            at2:   { label: 'Assessment Tutorial 2 (AT 2)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            mq1:   { label: 'MCQ Quiz 1 (MQ 1)', max: 10, weight: 5, color: 'text-pink-400', accent: 'bg-pink-500' },
            mq2:   { label: 'MCQ Quiz 2 (MQ 2)', max: 10, weight: 5, color: 'text-pink-400', accent: 'bg-pink-500' },
            bestmcq:{ label: 'Total (Best 2 MCQs)', max: 10, weight: 10, color: 'text-pink-300', accent: 'bg-pink-500' },
            ir1:   { label: 'Internal Review I (IR I)', max: 15, weight: 15, color: 'text-emerald-400', accent: 'bg-emerald-500' },
            ir2:   { label: 'Internal Review II (IR II)', max: 15, weight: 15, color: 'text-emerald-400', accent: 'bg-emerald-500' },
            plro1: { label: 'PLRO I', max: 10, weight: 10, color: 'text-teal-400', accent: 'bg-teal-500' },
            plro2: { label: 'PLRO II', max: 10, weight: 10, color: 'text-teal-400', accent: 'bg-teal-500' },
            a1:    { label: 'Assessment I (A I)', max: 50, weight: 50, color: 'text-emerald-400', accent: 'bg-emerald-500' },
            a2:    { label: 'Assessment II (A II)', max: 50, weight: 50, color: 'text-teal-400', accent: 'bg-teal-500' },
            eh:    { label: 'Activity Hours (EH)', max: 150, weight: 150, color: 'text-amber-400', accent: 'bg-amber-500' },
            total: { label: 'Raw Total', max: 50, weight: 50, color: 'text-white', accent: 'bg-indigo-500' },
            conv:  { label: 'Converted Total', max: 40, weight: 40, color: 'text-indigo-300', accent: 'bg-indigo-500' },
            c1:    { label: 'Component 1', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c2:    { label: 'Component 2', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c3:    { label: 'Component 3', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c4:    { label: 'Component 4', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c5:    { label: 'Component 5', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c6:    { label: 'Component 6', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' }
        };
    }
    if (!window.simState) window.simState = {};

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    let savedSim = null;
    try {
        const rawSim = localStorage.getItem(`bunker_internals_sim_${roll}`);
        if (rawSim) savedSim = JSON.parse(rawSim);
    } catch {}

    let listHTML = '';

    mainSubjects.forEach((sub) => {
        const rowData = sub.row_data || [];
        const numCols = rowData.length;
        const expectedKeys = getSchemaKeys(sub.is_lab, numCols);

        const d = {};
        expectedKeys.forEach((k, i) => {
            const val = rowData[i];
            d[k] = (!val || val === '*' || String(val).trim() === '') ? null : parseFloat(val);
        });

        const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
        ensureSubjectSimState(sub, d, simKeys, savedSim);

        const displayMax = getSubjectMaxOut(sub);
        const portalTotalConverted = parseFloat(sub.total_converted);
        const hasPortalConv = !isNaN(portalTotalConverted);

        const simCaScaled = computeCAScaled(sub, simKeys, window.simState[sub.course_code] || d);
        const currentScore = hasPortalConv ? portalTotalConverted : simCaScaled;
        const pct = Math.min(100, Math.max(0, (currentScore / displayMax) * 100));
        const theme = getInternalCardTheme(pct);

        // Gradient card matching Attendance Card style: ONLY Subject Name, Total Marks (out of 40 or 60), Progress Bar, and Simulate Marks button
        listHTML += `
        <div id="card-${sub.course_code}" onclick="openInternalModal('${sub.course_code}', 'details')" class="glass-panel rounded-[32px] overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.98]" style="background: linear-gradient(135deg, ${theme.hex}18 0%, rgba(15, 14, 28, 0.82) 65%); border-color: ${theme.hex}35;">
            <div class="p-5 relative overflow-hidden">
                <div id="glow-${sub.course_code}" class="absolute -right-6 -top-6 w-28 h-28 rounded-full ${theme.glow} opacity-20 blur-2xl pointer-events-none"></div>
                <div class="flex justify-between items-start gap-3 mb-4 relative z-10">
                    <div class="min-w-0 flex-1 pr-2">
                        <h4 class="font-extrabold text-white text-[15px] sm:text-base uppercase tracking-wide leading-snug drop-shadow-md truncate w-full block">${sub.course_name}</h4>
                    </div>
                    <div class="flex items-baseline gap-1 shrink-0 z-10 tabular-nums">
                        <span id="card-ca-score-${sub.course_code}" class="text-2xl sm:text-[26px] font-black ${theme.col} tracking-tighter leading-none" style="text-shadow: 0 0 20px ${theme.hex}40;">${currentScore.toFixed(1)}</span>
                        <span class="text-xs font-bold text-gray-400">/ ${displayMax}</span>
                    </div>
                </div>
                <div class="w-full bg-black/40 h-2 rounded-full overflow-hidden mb-4 border border-white/5 shadow-inner relative" id="bar-${sub.course_code}">
                    <div id="bar-fill-${sub.course_code}" class="h-full ${theme.bar} rounded-full transition-all duration-700 ease-out" style="width:${pct.toFixed(1)}%; box-shadow: 0 0 10px ${theme.hex}80;"></div>
                </div>
                <div class="flex justify-end items-center z-10 relative">
                    <button type="button" onclick="event.stopPropagation(); openInternalModal('${sub.course_code}', 'simulate')" class="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all active:scale-95 shrink-0">
                        <i class="fas fa-wand-magic-sparkles text-[10px] text-indigo-400"></i>
                        <span class="text-[9.5px] font-black uppercase tracking-wider">Simulate Marks</span>
                    </button>
                </div>
            </div>
        </div>`;
    });

    list.innerHTML = listHTML;

    // Render list of subjects inside the collapsible credits drawer
    const predList = document.getElementById('predictor-subjects-list');
    if (predList) {
        let predHTML = '';
        let creditsMap = {};
        try {
            creditsMap = JSON.parse(localStorage.getItem(`bunker_predicted_credits_${state.rollNumber}`) || '{}');
        } catch (e) {}

        mainSubjects.forEach(sub => {
            const courseCode = sub.course_code;
            const isZero = isZeroCreditCourse(courseCode);
            let credits = creditsMap[courseCode];
            if (isZero) {
                credits = 0;
                creditsMap[courseCode] = 0;
            } else if (credits === undefined) {
                credits = getOfficialCourseCredits(sub);
                creditsMap[courseCode] = credits;
            }

            const adjusterHTML = isZero
                ? `<span class="text-[9px] font-bold text-gray-500 px-2 py-1">0 Cr</span>`
                : `<div class="flex items-center bg-black/40 rounded-xl p-1 border border-white/10">
                        <button type="button" onclick="changeSubjectCredits('${courseCode}', -1)" class="w-6 h-6 rounded-lg bg-white/5 text-white hover:bg-white/10 active:scale-90 transition flex items-center justify-center text-xs font-bold">-</button>
                        <span id="pred-credits-${courseCode}" class="w-6 text-center text-xs font-black text-white tabular-nums">${credits}</span>
                        <button type="button" onclick="changeSubjectCredits('${courseCode}', 1)" class="w-6 h-6 rounded-lg bg-white/5 text-white hover:bg-white/10 active:scale-90 transition flex items-center justify-center text-xs font-bold">+</button>
                    </div>`;

            predHTML += `
            <div class="flex justify-between items-center p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div class="flex-1 pr-2 min-w-0">
                    <p class="text-xs font-bold text-white truncate">${sub.course_name}</p>
                    <p class="text-[10px] text-gray-500 font-mono">${courseCode}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span id="pred-badge-${courseCode}" class="text-[10px] font-bold text-indigo-300 tabular-nums">--</span>
                    ${adjusterHTML}
                </div>
            </div>`;
        });
        predList.innerHTML = predHTML;
    }

    recalculateCGPAPrediction();
    renderPassMatrixAutoSubjects();
}

function getInternalCardTheme(pctVal) {
    if (pctVal >= 90) return { col: 'text-[#10B981]', bar: 'bg-[#10B981]', glow: 'bg-[#10B981]', hex: '#10B981' };
    if (pctVal >= 80) return { col: 'text-[#22C55E]', bar: 'bg-[#22C55E]', glow: 'bg-[#22C55E]', hex: '#22C55E' };
    if (pctVal >= 70) return { col: 'text-[#3B82F6]', bar: 'bg-[#3B82F6]', glow: 'bg-[#3B82F6]', hex: '#3B82F6' };
    if (pctVal >= 60) return { col: 'text-[#EAB308]', bar: 'bg-[#EAB308]', glow: 'bg-[#EAB308]', hex: '#EAB308' };
    if (pctVal >= 50) return { col: 'text-[#F97316]', bar: 'bg-[#F97316]', glow: 'bg-[#F97316]', hex: '#F97316' };
    return { col: 'text-[#EF4444]', bar: 'bg-[#EF4444]', glow: 'bg-[#EF4444]', hex: '#EF4444' };
}
window.getInternalCardTheme = getInternalCardTheme;

function getShortMarkLabel(rawHeader, fallbackKey) {
    const h = String(rawHeader || '').trim();
    if (!h) return fallbackKey.toUpperCase();
    const map = {
        'Test 1': 'Test 1',
        'Test 2': 'Test 2',
        'Retest': 'Retest',
        'Retest 1': 'Retest 1',
        'Retest 2': 'Retest 2',
        'Best of 2 Tests': 'Best 2T',
        'Assignment / Presentation': 'Assgn',
        'Assignment 1': 'Assgn 1',
        'Assignment 2': 'Assgn 2',
        'MCQ / Quiz 1': 'MCQ 1',
        'MCQ / Quiz 2': 'MCQ 2',
        'Best MCQ': 'Best MCQ',
        'Conv. Total': 'Converted',
        'Int. Review 1': 'Review 1',
        'Int. Review 2': 'Review 2',
        'Lab Record 1': 'Record 1',
        'Lab Record 2': 'Record 2'
    };
    return map[h] || h;
}

function getOfficialCourseCredits(sub) {
    if (!sub) return 3;
    const courseCode = String(sub.course_code || '').toUpperCase();
    if (isZeroCreditCourse(courseCode)) return 0;

    // 1. Check studying_courses scraped from eCampus Course Selection
    if (state && state.academics && state.academics.gpa && Array.isArray(state.academics.gpa.studying_courses)) {
        const studMatch = state.academics.gpa.studying_courses.find(x => String(x.course).toUpperCase() === courseCode);
        if (studMatch && studMatch.credits !== undefined && !isNaN(Number(studMatch.credits))) {
            return Number(studMatch.credits);
        }
    }
    // 2. Check all_subjects if present
    if (state && state.academics && state.academics.cgpa && Array.isArray(state.academics.cgpa.all_subjects)) {
        const subjMatch = state.academics.cgpa.all_subjects.find(x => String(x.course).toUpperCase() === courseCode);
        if (subjMatch && subjMatch.credits !== undefined && !isNaN(Number(subjMatch.credits))) {
            return Number(subjMatch.credits);
        }
    }
    // 3. Check sub.credits from server.js parser
    if (sub.credits !== undefined && !isNaN(Number(sub.credits))) {
        return Number(sub.credits);
    }
    return sub.is_lab ? 2 : 3;
}

function openInternalModal(courseCode, mode = 'details') {
    if (!state || !state.academics || !Array.isArray(state.academics.internals)) return;
    const sub = state.academics.internals.find(s => s.course_code === courseCode);
    if (!sub) return;

    activeInternalModalCode = courseCode;
    activeInternalModalMode = mode;

    const modal = document.getElementById('internals-detail-modal');
    const backdrop = document.getElementById('internals-detail-backdrop');
    const panel = document.getElementById('internals-detail-panel');
    const codeEl = document.getElementById('int-modal-code');
    const titleEl = document.getElementById('int-modal-title');
    const bodyEl = document.getElementById('int-modal-body');
    if (!modal || !bodyEl) return;

    if (codeEl) codeEl.textContent = sub.course_code;
    if (titleEl) titleEl.textContent = sub.course_name;

    bodyEl.innerHTML = buildInternalModalContent(sub, mode);

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        if (backdrop) backdrop.classList.remove('opacity-0');
        if (panel) {
            panel.classList.remove('opacity-0', 'translate-y-4', 'sm:scale-95');
            panel.classList.add('translate-y-0', 'sm:scale-100');
        }
    });

    calculateSimOutputs(courseCode, sub);
}
window.openInternalModal = openInternalModal;

function closeInternalModal() {
    const modal = document.getElementById('internals-detail-modal');
    const backdrop = document.getElementById('internals-detail-backdrop');
    const panel = document.getElementById('internals-detail-panel');
    if (!modal) return;

    if (backdrop) backdrop.classList.add('opacity-0');
    if (panel) {
        panel.classList.remove('translate-y-0', 'sm:scale-100');
        panel.classList.add('opacity-0', 'translate-y-4', 'sm:scale-95');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        activeInternalModalCode = null;
    }, 200);
}
window.closeInternalModal = closeInternalModal;

function buildInternalModalContent(subject, mode = 'details') {
    const courseCode = subject.course_code;
    const rowData = subject.row_data || [];
    const headers = Array.isArray(subject.headers) && subject.headers.length === rowData.length ? subject.headers : [];
    const maxMarks = Array.isArray(subject.max_marks) && subject.max_marks.length === rowData.length ? subject.max_marks : [];
    const numCols = rowData.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));

    const d = {};
    expectedKeys.forEach((k, i) => {
        const val = rowData[i];
        d[k] = (!val || val === '*' || String(val).trim() === '') ? null : parseFloat(val);
    });

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    let savedSim = null;
    try {
        const rawSim = localStorage.getItem(`bunker_internals_sim_${roll}`);
        if (rawSim) savedSim = JSON.parse(rawSim);
    } catch {}
    ensureSubjectSimState(subject, d, simKeys, savedSim);

    // 1. Official eCampus Marks shown beautifully in compact small boxes
    let ecampusBoxesHTML = '';
    expectedKeys.forEach((k, idx) => {
        const rawVal = rowData[idx];
        const rawHeader = headers[idx] || (window.METADATA[k]?.label || k.toUpperCase());
        const shortLabel = getShortMarkLabel(rawHeader, k);
        const maxStr = maxMarks[idx] ? maxMarks[idx].replace(/Max:\s*/i, '').trim() : (window.METADATA[k]?.max || '');
        const isEntered = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '' && String(rawVal).trim() !== '*';
        const displayVal = isEntered ? String(rawVal).trim() : '-';

        ecampusBoxesHTML += `
        <div class="p-2.5 rounded-2xl ${isEntered ? 'bg-emerald-500/[0.07] border-emerald-500/20' : 'bg-white/[0.03] border-white/[0.07]'} border flex flex-col justify-between text-center">
            <span class="text-[10px] font-bold text-gray-400 truncate block">${shortLabel}</span>
            <div class="mt-1 tabular-nums">
                <span class="text-sm font-black ${isEntered ? 'text-emerald-300' : 'text-gray-500'}">${displayVal}</span>
                ${maxStr ? `<span class="text-[9.5px] font-semibold text-gray-500">/${maxStr}</span>` : ''}
            </div>
        </div>`;
    });

    // 2. Interactive Simulator Section (Uploaded marks are LOCKED; only missing marks have sliders)
    let simInputsHTML = '';
    simKeys.forEach((k) => {
        const meta = window.METADATA[k] || window.METADATA['c1'];
        const actual = d[k];
        const isUploaded = actual !== null && !isNaN(actual);
        const curVal = isUploaded ? actual : (window.simState[courseCode][k] ?? 0);
        const stepSize = meta.max <= 10 ? 0.5 : 1;

        if (!isUploaded) {
            simInputsHTML += `
            <div class="p-3 rounded-2xl bg-black/40 border border-indigo-500/25">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <div>
                        <span class="text-xs font-bold text-white block">${meta.label}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" onclick="stepSimMark('${courseCode}', '${k}', -${stepSize})" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs flex items-center justify-center active:scale-90 transition">-</button>
                        <div class="min-w-[54px] text-center bg-black/60 px-2 py-1 rounded-lg border border-white/10 tabular-nums">
                            <span id="val-${courseCode}-${k}" class="text-xs font-black text-white">${curVal}</span>
                            <span class="text-[9.5px] text-gray-500 font-bold">/${meta.max}</span>
                        </div>
                        <button type="button" onclick="stepSimMark('${courseCode}', '${k}', ${stepSize})" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs flex items-center justify-center active:scale-90 transition">+</button>
                    </div>
                </div>
                <input type="range" id="slider-${courseCode}-${k}" min="0" max="${meta.max}" step="${stepSize}" value="${curVal}" 
                    oninput="updateSim('${courseCode}', '${k}', this.value)"
                    class="w-full bg-black/60 rounded-lg appearance-none cursor-pointer accent-indigo-500 acad-slider" style="height: 6px;" />
            </div>`;
        }
    });

    const maxOut = getSubjectMaxOut(subject);
    const caScaled = computeCAScaled(subject, simKeys, window.simState[courseCode]);
    const minPassSem = getMinSemToPassForSubject(subject, caScaled);
    const curSem = window.simState[courseCode].sem ?? minPassSem;

    const finalExamSimulatorHTML = isZeroCreditCourse(courseCode) ? '' : `
    <div class="space-y-3">
        <div class="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-500/25">
            <div class="flex items-center justify-between mb-2">
                <div>
                    <span class="text-xs font-bold text-white block">Final Semester Exam</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="stepSimMark('${courseCode}', 'sem', -1)" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs flex items-center justify-center active:scale-90 transition">-</button>
                    <div class="min-w-[60px] text-center bg-black/60 px-2 py-1 rounded-lg border border-indigo-500/30 tabular-nums">
                        <span class="text-sm font-black text-indigo-300" id="val-${courseCode}-sem">${curSem}</span>
                        <span class="text-[9.5px] font-bold text-gray-500">/100</span>
                    </div>
                    <button type="button" onclick="stepSimMark('${courseCode}', 'sem', 1)" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold text-xs flex items-center justify-center active:scale-90 transition">+</button>
                </div>
            </div>
            <input type="range" min="0" max="100" value="${curSem}" id="slider-${courseCode}-sem"
                oninput="updateSim('${courseCode}', 'sem', this.value)"
                class="w-full bg-black/60 rounded-lg appearance-none cursor-pointer accent-indigo-500 acad-slider" style="height: 6px;" />
        </div>

        <!-- Clean Result Summary in 3 small boxes -->
        <div class="grid grid-cols-3 gap-2">
            <div class="bg-black/45 p-3 rounded-2xl border border-white/10 text-center flex flex-col justify-center">
                <span class="text-[10px] text-gray-400 font-medium block">Internal CA</span>
                <span class="text-sm sm:text-base font-black text-white tabular-nums mt-0.5 block"><span id="out-${courseCode}-ca">${caScaled.toFixed(1)}</span> / ${maxOut}</span>
            </div>
            <div class="bg-black/45 p-3 rounded-2xl border border-white/10 text-center flex flex-col justify-center">
                <span class="text-[10px] text-gray-400 font-medium block">Min Final</span>
                <span class="text-sm sm:text-base font-black text-rose-300 tabular-nums mt-0.5 block"><span id="out-${courseCode}-minpass">${minPassSem}</span> / 100</span>
            </div>
            <div id="out-${courseCode}-box" class="bg-black/45 p-3 rounded-2xl border border-white/10 text-center flex flex-col justify-center">
                <span id="out-${courseCode}-grade" class="text-sm sm:text-base font-black text-emerald-400 tabular-nums block">--</span>
                <span id="out-${courseCode}-total" class="text-[10px] text-gray-400 font-bold tabular-nums mt-0.5 block">--</span>
            </div>
        </div>
    </div>`;

    return `
    <div class="space-y-4">
        <!-- eCampus Marks in Small Boxes -->
        <div>
            <div class="flex items-center justify-end mb-2.5">
                <span class="text-[11px] font-bold text-indigo-300 tabular-nums"><span id="modal-top-ca-${courseCode}">${caScaled.toFixed(1)}</span> / ${maxOut}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
                ${ecampusBoxesHTML}
            </div>
        </div>

        <!-- Simulate Marks Section -->
        <div class="pt-3 border-t border-white/10 space-y-2.5">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white">Simulate Marks</span>
                <button type="button" onclick="resetSim('${courseCode}')" class="text-[10px] text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 transition">Reset</button>
            </div>
            ${simInputsHTML ? `<div class="space-y-2">${simInputsHTML}</div>` : ''}
            ${finalExamSimulatorHTML}
        </div>
    </div>`;
}

// Official PSG College of Technology 2023 Regulations Absolute Grading Scale:
// O: 91–100 (10 GP), A+: 81–90 (9 GP), A: 71–80 (8 GP), B+: 66–70 (7 GP), B: 61–65 (6.5 GP), C+: 56–60 (6 GP), C: 50–55 (5 GP), RA: <50 or <45% in Theory FE / <50% in Lab FE (0 GP)
function getGradeInfo(total, roll = null, semExam = null, isLab = false) {
    if (semExam !== null && semExam !== undefined) {
        const minFE = isLab ? 50 : 45;
        if (Number(semExam) < minFE) {
            return { grade: 'RA', gp: 0, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30', failedFE: true };
        }
    }
    if (total >= 91) return { grade: 'O', gp: 10, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' };
    if (total >= 81) return { grade: 'A+', gp: 9, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };
    if (total >= 71) return { grade: 'A', gp: 8, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30' };
    if (total >= 66) return { grade: 'B+', gp: 7, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' };
    if (total >= 61) return { grade: 'B', gp: 6.5, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/30' };
    if (total >= 56) return { grade: 'C+', gp: 6, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/30' };
    if (total >= 50) return { grade: 'C', gp: 5, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' };
    return { grade: 'RA', gp: 0, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' };
}

function toggleInternalCard(code) {
    openInternalModal(code, 'details');
}

function stepSimMark(courseCode, key, delta) {
    if (!window.simState || !window.simState[courseCode]) return;
    const max = key === 'sem' ? 100 : ((window.METADATA[key] || window.METADATA['c1']).max || 30);
    const cur = Number(window.simState[courseCode][key] || 0);
    const next = Math.max(0, Math.min(max, Number((cur + delta).toFixed(1))));
    updateSim(courseCode, key, next);
}
window.stepSimMark = stepSimMark;

function updateSim(courseCode, key, val) {
    const subject = state.academics && state.academics.internals
        ? state.academics.internals.find(s => s.course_code === courseCode)
        : null;
    if (!subject) return;

    // Block modifying marks that are already uploaded in eCampus
    if (key !== 'sem') {
        const expectedKeys = getSchemaKeys(subject.is_lab, subject.row_data.length);
        const idx = expectedKeys.indexOf(key);
        const rawVal = idx >= 0 ? subject.row_data[idx] : null;
        const actual = (!rawVal || rawVal === '*' || String(rawVal).trim() === '') ? null : parseFloat(rawVal);
        if (actual !== null && !isNaN(actual)) {
            return; // Locked because already uploaded in eCampus
        }
    }

    const numVal = Number(val);
    if (!window.simState[courseCode]) window.simState[courseCode] = {};
    window.simState[courseCode][key] = numVal;
    if (key === 'sem') {
        window.simState[courseCode].userSimulatedSem = true;
    } else if (!window.simState[courseCode].userSimulatedSem) {
        // When user simulates internal CA marks and hasn't manually overridden final exam, keep final exam synced to min pass
        const expectedKeys = getSchemaKeys(subject.is_lab, subject.row_data.length);
        const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
        const newCaScaled = computeCAScaled(subject, simKeys, window.simState[courseCode]);
        const newMinPass = getMinSemToPassForSubject(subject, newCaScaled);
        window.simState[courseCode].sem = newMinPass;
        const semSlider = document.getElementById(`slider-${courseCode}-sem`);
        const semValEl = document.getElementById(`val-${courseCode}-sem`);
        if (semSlider) semSlider.value = newMinPass;
        if (semValEl) semValEl.innerText = newMinPass;
    }

    const valEl = document.getElementById(`val-${courseCode}-${key}`);
    if (valEl) valEl.innerText = numVal;

    const sliderEl = document.getElementById(`slider-${courseCode}-${key}`);
    if (sliderEl && Number(sliderEl.value) !== numVal) sliderEl.value = numVal;

    calculateSimOutputs(courseCode, subject);

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (roll) {
        try {
            localStorage.setItem(`bunker_internals_sim_${roll}`, JSON.stringify(window.simState));
        } catch {}
    }
}

function resetAllInternalsSim() {
    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (roll) {
        try { localStorage.removeItem(`bunker_internals_sim_${roll}`); } catch {}
    }
    if (state.academics && Array.isArray(state.academics.internals)) {
        window.simState = {};
        renderInternals(state.academics.internals);
        if (activeInternalModalCode) {
            const sub = state.academics.internals.find(s => s.course_code === activeInternalModalCode);
            const bodyEl = document.getElementById('int-modal-body');
            if (sub && bodyEl) {
                bodyEl.innerHTML = buildInternalModalContent(sub, activeInternalModalMode);
                calculateSimOutputs(activeInternalModalCode, sub);
            }
        }
        showToast('Reset simulator to official eCampus marks & min pass');
    }
}
window.resetAllInternalsSim = resetAllInternalsSim;

function resetSim(courseCode) {
    if (!courseCode) {
        resetAllInternalsSim();
        return;
    }
    const subject = state.academics.internals.find(s => s.course_code === courseCode);
    if (!subject) return;
    const rowData = subject.row_data || [];
    const numCols = rowData.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
    
    const d = {};
    expectedKeys.forEach((k, i) => {
        const val = rowData[i];
        d[k] = (!val || val === '*' || String(val).trim() === '') ? null : parseFloat(val);
    });

    window.simState[courseCode] = { userSimulatedSem: false };
    simKeys.forEach(k => {
        const actual = d[k];
        window.simState[courseCode][k] = (actual !== null && !isNaN(actual)) ? actual : 0;
    });

    const caScaled = computeCAScaled(subject, simKeys, window.simState[courseCode]);
    const minPassSem = getMinSemToPassForSubject(subject, caScaled);
    window.simState[courseCode].sem = minPassSem;

    const bodyEl = document.getElementById('int-modal-body');
    if (activeInternalModalCode === courseCode && bodyEl) {
        bodyEl.innerHTML = buildInternalModalContent(subject, activeInternalModalMode);
    }

    calculateSimOutputs(courseCode, subject);

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (roll) {
        try {
            localStorage.setItem(`bunker_internals_sim_${roll}`, JSON.stringify(window.simState));
        } catch {}
    }
    showToast(`Reset ${courseCode} to official marks & min pass`);
}

/**
 * Identify zero-credit/non-GPA courses (e.g. Activity Point Programme, Environmental Science).
 */
function isZeroCreditCourse(courseCode) {
    if (!courseCode) return false;
    const code = courseCode.toUpperCase();
    if (code === '23U315' || code === '23U215' || code === '23Q213' || code === '23IP15' || code === '23K312') return true;
    if (state && state.academics) {
        if (state.academics.gpa && Array.isArray(state.academics.gpa.studying_courses)) {
            const stud = state.academics.gpa.studying_courses.find(s => String(s.course).toUpperCase() === code);
            if (stud && Number(stud.credits) === 0) return true;
        }
        if (state.academics.cgpa && state.academics.cgpa.all_subjects) {
            const match = state.academics.cgpa.all_subjects.find(s => String(s.course).toUpperCase() === code);
            if (match) {
                const mCr = parseInt(match.credits, 10);
                if (!isNaN(mCr) && mCr === 0) return true;
                if (mCr > 0) return false;
            }
        }
        if (state.academics.internals) {
            const sub = state.academics.internals.find(s => String(s.course_code).toUpperCase() === code);
            if (sub && sub.course_name) {
                const up = sub.course_name.toUpperCase();
                if (up.includes('ACTIVITY POINT') || up.includes('INDUCTION PROGRAMME') || up.includes('ENVIRONMENTAL SCIENCE')) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getSchemaKeys(isLab, numCols) {
    if (isLab) {
        if (numCols === 6) return ['ir1', 'ir2', 'plro1', 'plro2', 'total', 'conv'];
        if (numCols === 5) return ['ir1', 'ir2', 'plro1', 'plro2', 'total'];
        return Array.from({length: numCols}, (_, i) => `c${i+1}`);
    }
    if (numCols === 3)  return ['eh', 'total', 'conv']; // Activity Point Programme (23U315)
    if (numCols === 4)  return ['a1', 'a2', 'total', 'conv']; // Environmental Science (23K312)
    if (numCols === 10) return ['t1', 't2', 'rt', 'best2t', 'ap',  'mq1', 'mq2', 'bestmcq', 'total', 'conv'];
    if (numCols === 11) return ['t1', 't2', 'rt', 'best2t', 'at1', 'at2', 'mq1', 'mq2', 'bestmcq', 'total', 'conv'];
    if (numCols === 12) return ['t1', 't2', 'rt', 'rt1', 'rt2', 'best2t', 'ap',  'mq1', 'mq2', 'bestmcq', 'total', 'conv'];
    if (numCols === 13) return ['t1', 't2', 'rt', 'rt1', 'rt2', 'best2t', 'at1', 'at2', 'mq1', 'mq2', 'bestmcq', 'total', 'conv'];
    if (numCols === 8)  return ['t1', 't2', 'best2t', 'ap', 'mq1', 'mq2', 'bestmcq', 'total'];
    if (numCols === 9)  return ['t1', 't2', 'best2t', 'at1', 'at2', 'mq1', 'mq2', 'bestmcq', 'total'];
    return Array.from({length: numCols}, (_, i) => `c${i+1}`);
}

function calcCATotal(isLab, simKeys, values) {
    if (isLab) {
        const labKeys = ['ir1', 'ir2', 'plro1', 'plro2'];
        return labKeys.reduce((sum, k) => sum + (simKeys.includes(k) ? (Number(values[k]) || 0) : 0), 0);
    }
    if (simKeys.includes('eh')) {
        return Number(values['eh']) || 0;
    }
    if (simKeys.includes('a1') || simKeys.includes('a2')) {
        return (Number(values['a1']) || 0) + (Number(values['a2']) || 0);
    }
    const t1 = Number(values['t1']) || 0;
    const t2 = Number(values['t2']) || 0;
    const best2t = (t1 + t2) / 2;
    const ap = (Number(values['ap']) || 0) + (Number(values['at1'] ?? values['ap1']) || 0) + (Number(values['at2'] ?? values['ap2']) || 0);
    const mq1 = Number(values['mq1']) || 0;
    const mq2 = Number(values['mq2']) || 0;
    const bestMCQ = (mq1 + mq2) / 2;
    return best2t + ap + bestMCQ;
}

function calculateSimOutputs(courseCode, subjectObj) {
    const subject = subjectObj || (state.academics && state.academics.internals ? state.academics.internals.find(s => s.course_code === courseCode) : null);
    if (!subject || !window.simState || !window.simState[courseCode]) return;
    
    const numCols = subject.row_data.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));

    const maxOut = getSubjectMaxOut(subject);
    const caScaled = computeCAScaled(subject, simKeys, window.simState[courseCode]);
    const minPassSem = getMinSemToPassForSubject(subject, caScaled);

    const semExamMark = window.simState[courseCode].sem !== undefined ? Number(window.simState[courseCode].sem) : minPassSem;
    const semRaw = maxOut === 100 ? 0 : (semExamMark / 100) * (subject.is_lab ? 40 : 60);
    const semScaled = Math.ceil(Number(semRaw.toFixed(1)) - 1e-6);
    const grandTotal = maxOut === 100 ? Math.min(100, Math.round(caScaled)) : Math.min(100, Number((caScaled + semScaled).toFixed(1)));
    const info = getGradeInfo(grandTotal, null, maxOut === 100 ? 100 : semExamMark, subject.is_lab);

    // Update modal elements if open
    const caEl = document.getElementById(`out-${courseCode}-ca`);
    if (caEl) caEl.innerText = caScaled.toFixed(1);
    const topCaEl = document.getElementById(`modal-top-ca-${courseCode}`);
    if (topCaEl) topCaEl.innerText = caScaled.toFixed(1);
    const minPassEl = document.getElementById(`out-${courseCode}-minpass`);
    if (minPassEl) minPassEl.innerText = minPassSem;

    const totalEl = document.getElementById(`out-${courseCode}-total`);
    if (totalEl) totalEl.innerText = `${Math.round(grandTotal)} / 100`;

    const gradeEl = document.getElementById(`out-${courseCode}-grade`);
    if (gradeEl) {
        gradeEl.className = `text-sm sm:text-base font-black tabular-nums block ${info.color}`;
        gradeEl.innerText = info.failedFE ? `RA (<${subject.is_lab ? 50 : 45} FE)` : `${info.grade} (${info.gp} GP)`;
    }

    const box = document.getElementById(`out-${courseCode}-box`);
    if (box) {
        box.className = `p-3 rounded-2xl border text-center flex flex-col justify-center ${info.bg} ${info.border}`;
    }

    // Keep gradient course card score, colors & progress bar live-synced
    const pct = Math.min(100, Math.max(0, (caScaled / maxOut) * 100));
    const theme = getInternalCardTheme(pct);
    const cardEl = document.getElementById(`card-${courseCode}`);
    if (cardEl) {
        cardEl.style.background = `linear-gradient(135deg, ${theme.hex}18 0%, rgba(15, 14, 28, 0.82) 65%)`;
        cardEl.style.borderColor = `${theme.hex}35`;
    }
    const glowEl = document.getElementById(`glow-${courseCode}`);
    if (glowEl) {
        glowEl.className = `absolute -right-6 -top-6 w-28 h-28 rounded-full ${theme.glow} opacity-20 blur-2xl pointer-events-none`;
    }
    const cardCaScoreEl = document.getElementById(`card-ca-score-${courseCode}`);
    if (cardCaScoreEl) {
        cardCaScoreEl.innerText = caScaled.toFixed(1);
        cardCaScoreEl.className = `text-2xl sm:text-[26px] font-black ${theme.col} tracking-tighter leading-none`;
        cardCaScoreEl.style.textShadow = `0 0 20px ${theme.hex}40`;
    }
    const barFillEl = document.getElementById(`bar-fill-${courseCode}`);
    if (barFillEl) {
        barFillEl.className = `h-full ${theme.bar} rounded-full transition-all duration-700 ease-out`;
        barFillEl.style.width = `${pct.toFixed(1)}%`;
        barFillEl.style.boxShadow = `0 0 10px ${theme.hex}80`;
    }

    recalculateCGPAPrediction();
}

function recalculateCGPAPrediction() {
    if (!state.academics || !state.academics.internals) return;

    let totalCredits = 0;
    let totalCreditPoints = 0;
    let maxCredits = 0;
    let maxCreditPoints = 0;
    let hasUGrade = false;

    let creditsMap = {};
    try {
        creditsMap = JSON.parse(localStorage.getItem(`bunker_predicted_credits_${state.rollNumber}`) || '{}');
    } catch (e) {
        creditsMap = {};
    }

    state.academics.internals.forEach(sub => {
        const courseCode = sub.course_code;
        if (!courseCode) return;

        const isZero = isZeroCreditCourse(courseCode);
        let credits = creditsMap[courseCode];
        if (isZero) {
            credits = 0;
            creditsMap[courseCode] = 0;
        } else if (credits === undefined || isNaN(Number(credits))) {
            credits = getOfficialCourseCredits(sub);
            creditsMap[courseCode] = credits;
        } else {
            credits = Number(credits);
        }

        const numCols = (sub.row_data || []).length;
        const expectedKeys = getSchemaKeys(sub.is_lab, numCols);
        const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
        const maxOut = getSubjectMaxOut(sub);

        // 1. Current Simulated Grade Point
        const simValues = (window.simState && window.simState[courseCode]) ? window.simState[courseCode] : {};
        const caScaled = computeCAScaled(sub, simKeys, simValues);
        const minPassSem = getMinSemToPassForSubject(sub, caScaled);
        const semExam = simValues.sem !== undefined ? Number(simValues.sem) : minPassSem;
        const semRaw = maxOut === 100 ? 0 : (semExam / 100) * (sub.is_lab ? 40 : 60);
        const semScaled = Math.ceil(Number(semRaw.toFixed(1)) - 1e-6);
        const grandTotal = maxOut === 100 ? Math.min(100, Math.round(caScaled)) : Math.min(100, Number((caScaled + semScaled).toFixed(1)));
        const info = getGradeInfo(grandTotal, null, maxOut === 100 ? 100 : semExam, sub.is_lab);

        // Update badge in credits drawer
        const badgeEl = document.getElementById(`pred-badge-${courseCode}`);
        if (badgeEl) {
            badgeEl.className = `text-[10px] font-bold tabular-nums ${info.color}`;
            badgeEl.textContent = isZero ? 'Non-GPA' : `${info.grade} (${info.gp} GP)`;
        }

        if (credits <= 0 || isZero) return;

        if (info.grade === 'RA' || info.grade === 'U') {
            hasUGrade = true;
        }
        totalCredits += credits;
        totalCreditPoints += info.gp * credits;

        // 2. Max Possible Grade Point (locks already-uploaded eCampus marks, sets pending marks to max, and Final Exam to 100/100)
        const maxMarksObj = {};
        simKeys.forEach(k => {
            const meta = window.METADATA[k] || window.METADATA['c1'];
            const idx = expectedKeys.indexOf(k);
            const rawCell = idx >= 0 && Array.isArray(sub.row_data) ? sub.row_data[idx] : null;
            const parsedCell = (rawCell !== undefined && rawCell !== null && String(rawCell).trim() !== '' && String(rawCell).trim() !== '*') ? parseFloat(rawCell) : null;
            const compVal = (sub.comp && sub.comp[k] !== undefined && sub.comp[k] !== null) ? parseFloat(sub.comp[k]) : parsedCell;
            // If mark is already uploaded in eCampus, use that exact mark; if pending (*), assume full marks
            maxMarksObj[k] = (compVal !== null && !isNaN(compVal)) ? compVal : (meta ? meta.max : 10);
        });
        const maxCAScaled = computeCAScaled(sub, simKeys, maxMarksObj);
        const maxSemScaled = maxOut === 100 ? 0 : (sub.is_lab ? 40 : 60);
        const maxGrandTotal = Math.min(100, Math.round(maxCAScaled + maxSemScaled));
        const maxInfo = getGradeInfo(maxGrandTotal, null, 100, sub.is_lab);

        maxCredits += credits;
        maxCreditPoints += maxInfo.gp * credits;
    });

    try {
        localStorage.setItem(`bunker_predicted_credits_${state.rollNumber}`, JSON.stringify(creditsMap));
    } catch {}

    const sgpa = totalCredits > 0 ? (totalCreditPoints / totalCredits) : 0;
    const maxSgpa = maxCredits > 0 ? (maxCreditPoints / maxCredits) : 0;

    // Past Semesters Cumulative Credits & Credit Points from official eCampus results
    let pastCredits = 0;
    let pastCreditPoints = 0;
    if (state.academics.cgpa) {
        pastCredits = Number(state.academics.cgpa.total_credits) || 0;
        if (state.academics.cgpa.credit_points_total !== undefined && state.academics.cgpa.credit_points_total !== null && Number(state.academics.cgpa.credit_points_total) > 0) {
            pastCreditPoints = Number(state.academics.cgpa.credit_points_total);
        } else if (state.academics.cgpa.overall_cgpa_numeric && pastCredits > 0) {
            pastCreditPoints = Number(state.academics.cgpa.overall_cgpa_numeric) * pastCredits;
        } else if (state.academics.cgpa.cgpa && !isNaN(parseFloat(state.academics.cgpa.cgpa))) {
            pastCreditPoints = parseFloat(state.academics.cgpa.cgpa) * pastCredits;
        } else if (Array.isArray(state.academics.cgpa.all_subjects)) {
            pastCreditPoints = state.academics.cgpa.all_subjects.reduce((acc, c) => {
                const cr = parseInt(c.credits, 10) || 0;
                return acc + (cr > 0 && c.grade_points != null ? cr * Number(c.grade_points) : 0);
            }, 0);
        }
    }

    const predictedCGPA = (pastCredits + totalCredits) > 0
        ? ((pastCreditPoints + totalCreditPoints) / (pastCredits + totalCredits))
        : sgpa;
    const maxCgpa = (pastCredits + maxCredits) > 0
        ? ((pastCreditPoints + maxCreditPoints) / (pastCredits + maxCredits))
        : maxSgpa;

    const sgpaValEl = document.getElementById('predicted-sgpa-value');
    const cgpaValEl = document.getElementById('predicted-cgpa-value');
    const maxSgpaEl = document.getElementById('max-sgpa-value');
    const maxCgpaEl = document.getElementById('max-cgpa-value');

    if (sgpaValEl) sgpaValEl.textContent = hasUGrade ? 'RA' : sgpa.toFixed(2);
    if (cgpaValEl) cgpaValEl.textContent = hasUGrade ? 'RA' : predictedCGPA.toFixed(2);
    if (maxSgpaEl) maxSgpaEl.textContent = maxSgpa.toFixed(2);
    if (maxCgpaEl) maxCgpaEl.textContent = maxCgpa.toFixed(2);
}

function changeSubjectCredits(courseCode, change) {
    if (isZeroCreditCourse(courseCode)) return;
    let creditsMap = {};
    try {
        creditsMap = JSON.parse(localStorage.getItem(`bunker_predicted_credits_${state.rollNumber}`) || '{}');
    } catch (e) {}

    let current = creditsMap[courseCode] !== undefined ? creditsMap[courseCode] : 3;
    let updated = Math.max(1, Math.min(10, current + change));
    creditsMap[courseCode] = updated;

    localStorage.setItem(`bunker_predicted_credits_${state.rollNumber}`, JSON.stringify(creditsMap));

    // Update text
    const textEl = document.getElementById(`pred-credits-${courseCode}`);
    if (textEl) {
        textEl.textContent = updated;
    }

    recalculateCGPAPrediction();
}

function targetGrade(courseCode, targetTotal) {
    const subject = state.academics.internals.find(s => s.course_code === courseCode);
    if (!subject) return;
    const numCols = subject.row_data.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => k !== 'best2t' && k !== 'bestmcq' && k !== 'total' && k !== 'conv' && k !== 'rt' && k !== 'rt1' && k !== 'rt2');

    // Use corrected CA formula
    const totalCA = calcCATotal(subject.is_lab, simKeys, window.simState[courseCode]);
    const ca40 = subject.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40);

    // If targeting Pass (50%) for a theory subject, use exact PSG Pass Matrix rule (min 45/100 FE & >=50% total)
    if (targetTotal === 50 && !subject.is_lab) {
        const passReq = getSemPassDetails(ca40);
        if (passReq.impossible) {
            showToast(`Critical: Cannot reach 50% with current CA alone. Need higher internal marks.`);
            updateSim(courseCode, 'sem', 100);
            return;
        }
        showToast(`🎯 PSG 2023 Rule: Need ${passReq.sem100} / 100 in Final Exam (${passReq.sem60} ➔ ${passReq.roundUp}/60) to pass`);
        updateSim(courseCode, 'sem', passReq.sem100);
        return;
    }

    // For other grades, account for PSG 60% (or 40% lab) conversion with ceil rounding and min FE threshold
    const minSem = subject.is_lab ? 50 : 45;
    let foundSem = -1;
    for (let s = minSem; s <= 100; s++) {
        const s60 = subject.is_lab ? (s * 0.4) : (s * 0.6);
        const s60Rounded = Math.ceil(Number(s60.toFixed(1)) - 1e-6);
        if (ca40 + s60Rounded >= targetTotal) {
            foundSem = s;
            break;
        }
    }

    if (foundSem === -1) {
        const maxPossible = (ca40 + (subject.is_lab ? 40 : 60)).toFixed(1);
        showToast(`Max possible: ${maxPossible}% total — cannot reach ${targetTotal}%. Need higher CA marks.`);
    } else {
        showToast(`Need ${foundSem} / 100 in Final Exam to score ≥${targetTotal}% overall`);
        updateSim(courseCode, 'sem', foundSem);
    }
}

/**
 * Global quick-scenario: set ALL subjects' simulated final exam to examMark,
 * sync per-card sliders/labels, and recompute predictions.
 */
function applyGlobalExamPreset(preset) {
    if (preset === "pass") {
        setGlobalSemScenario("exact-pass");
    } else {
        setGlobalSemScenario(Number(preset));
    }
}
window.applyGlobalExamPreset = applyGlobalExamPreset;

function setGlobalSemScenario(examMark) {
    if (!state.academics || !state.academics.internals) return;

    if (examMark === 'exact-pass') {
        // Highlight active button
        ['btn-scenario-exact-pass','btn-scenario-pass','btn-scenario-a','btn-scenario-aplus','btn-scenario-s'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const isActive = el.getAttribute('data-val') === 'exact-pass';
            el.setAttribute('data-active', isActive ? 'true' : 'false');
            el.style.opacity = isActive ? '1' : '0.5';
            el.style.transform = isActive ? 'scale(1.02)' : 'scale(1)';
        });

        let updatedCount = 0;
        state.academics.internals.forEach(sub => {
            const code = sub.course_code;
            if (!window.simState) return;
            if (!window.simState[code]) window.simState[code] = { sem: 75 };
            
            const numCols = sub.row_data.length;
            const expectedKeys = getSchemaKeys(sub.is_lab, numCols);
            const simKeys = expectedKeys.filter(k => k !== 'best2t' && k !== 'bestmcq' && k !== 'total' && k !== 'conv' && k !== 'rt' && k !== 'rt1' && k !== 'rt2');
            const totalCA = calcCATotal(sub.is_lab, simKeys, window.simState[code]);
            const ca40 = sub.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40);

            const passReq = getSemPassDetails(ca40);
            const targetSem = passReq.sem100;
            window.simState[code].sem = targetSem;

            const slider = document.getElementById(`slider-${code}-sem`);
            const label  = document.getElementById(`val-${code}-sem`);
            if (slider) slider.value = targetSem;
            if (label)  label.innerText = targetSem;
            calculateSimOutputs(code, sub);
            updatedCount++;
        });

        recalculateCGPAPrediction();
        showToast(`🎯 Applied exact pass targets from PSG Matrix across ${updatedCount} subjects!`);
        return;
    }

    examMark = Math.max(0, Math.min(100, Number(examMark)));

    // Highlight active button
    ['btn-scenario-exact-pass','btn-scenario-pass','btn-scenario-a','btn-scenario-aplus','btn-scenario-s'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const isActive = el.getAttribute('data-val') == examMark;
        el.setAttribute('data-active', isActive ? 'true' : 'false');
        el.style.opacity = isActive ? '1' : '0.5';
        el.style.transform = isActive ? 'scale(1.04)' : 'scale(1)';
    });

    state.academics.internals.forEach(sub => {
        const code = sub.course_code;
        if (!window.simState) return;
        if (!window.simState[code]) window.simState[code] = { sem: 75 };
        window.simState[code].sem = examMark;
        const slider = document.getElementById(`slider-${code}-sem`);
        const label  = document.getElementById(`val-${code}-sem`);
        if (slider) slider.value = examMark;
        if (label)  label.innerText = examMark;
        calculateSimOutputs(code, sub);
    });

    recalculateCGPAPrediction();
}


let _currentGPAData = null;

function selectSemesterGPA(targetSem) {
    if (!_currentGPAData) return;
    const gpaData = _currentGPAData;
    const sems = {};
    (gpaData.table || []).forEach(c => {
        const s = c.sem || 1;
        if (!sems[s]) sems[s] = [];
        sems[s].push(c);
    });
    const semwiseGPA = gpaData.semwise_gpa || {};
    const semwiseCredits = gpaData.semwise_credits || {};
    const valEl = document.getElementById('gpa-value');
    const titleEl = document.getElementById('gpa-hero-title');
    const creditsEl = document.getElementById('cgpa-credits');
    const cgpaPill = document.getElementById('results-cgpa-pill');

    if (targetSem === 'all' || targetSem === 'overall') {
        const cgpa = (state.academics.cgpa && state.academics.cgpa.cgpa) || gpaData.overall_cgpa || gpaData.gpa;
        if (titleEl) titleEl.textContent = 'Cumulative CGPA';
        if (valEl) {
            valEl.textContent = cgpa === 'RA' ? 'RA' : (cgpa || '--');
            valEl.style.color = cgpa === 'RA' ? '#EF4444' : cgpa >= 8.5 ? '#10B981' : cgpa >= 7 ? '#6366f1' : cgpa >= 5 ? '#F59E0B' : '#EF4444';
        }
        if (cgpaPill) cgpaPill.textContent = `CGPA ${cgpa || '--'}`;
        if (creditsEl) creditsEl.textContent = `${gpaData.total_credits || 0} total credits earned`;
        document.querySelectorAll('[id^="sem-section-"]').forEach(sec => sec.classList.remove('hidden'));
    } else {
        const s = parseInt(targetSem);
        const sGPA = semwiseGPA[s] !== undefined ? semwiseGPA[s] : '--';
        const sCr = semwiseCredits[s] !== undefined ? semwiseCredits[s] : (sems[s] || []).reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0);
        const sCount = (sems[s] || []).length;
        if (titleEl) titleEl.textContent = `Semester ${s} GPA`;
        if (valEl) {
            valEl.textContent = sGPA === 'RA' ? 'RA' : (sGPA || '--');
            const g = parseFloat(sGPA);
            valEl.style.color = sGPA === 'RA' || isNaN(g) ? '#EF4444' : g >= 8.5 ? '#10B981' : g >= 7 ? '#6366f1' : g >= 5 ? '#F59E0B' : '#EF4444';
        }
        if (cgpaPill) cgpaPill.textContent = `Sem ${s}: ${sGPA}`;
        if (creditsEl) creditsEl.textContent = `${sCr} Credits • ${sCount} Courses`;
        document.querySelectorAll('[id^="sem-section-"]').forEach(sec => {
            if (sec.id === `sem-section-${s}`) {
                sec.classList.remove('hidden');
            } else {
                sec.classList.add('hidden');
            }
        });
    }

    // Update active highlight on chips
    document.querySelectorAll('.results-sem-chip').forEach(btn => {
        const btnSem = btn.getAttribute('data-sem');
        if (btnSem === String(targetSem)) {
            btn.classList.add('ring-2', 'ring-indigo-400', 'scale-105', 'bg-indigo-500/25', 'border-indigo-400');
        } else {
            btn.classList.remove('ring-2', 'ring-indigo-400', 'scale-105', 'bg-indigo-500/25', 'border-indigo-400');
        }
    });
}
window.selectSemesterGPA = selectSemesterGPA;

function renderGPA(gpaData) {
    if (!gpaData) return;
    _currentGPAData = gpaData;
    const valEl = document.getElementById('gpa-value');
    const tableEl = document.getElementById('results-sem-list') || document.getElementById('gpa-table');
    const titleEl = document.getElementById('gpa-hero-title');
    const creditsEl = document.getElementById('cgpa-credits');
    const resultsChipsWrapper = document.getElementById('results-sem-chips');
    const resultsChipsList = document.getElementById('results-sem-chips-list');
    const cgpaPill = document.getElementById('results-cgpa-pill');
    const loadingEl = document.getElementById('results-loading-state');
    const errorEl = document.getElementById('results-error-state');
    const dataContainer = document.getElementById('results-data-container');
    const heroCard = document.getElementById('results-hero-card');
    const degCard = document.getElementById('degree-classification-card');
    const chartCard = document.getElementById('results-chart-card');
    if (!tableEl) return;

    // Ensure gpaData is normalized with official PSG 2023 Regulation grade points (B = 6.5, C+ = 6, C = 5)
    normalizePsgResultsData(gpaData);

    const courses = gpaData.table || [];
    const studyingCourses = gpaData.studying_courses || [];

    // Hide loading & error states, reveal results data container now that data has arrived
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (dataContainer) dataContainer.classList.remove('hidden');

    if (courses.length === 0) {
        // 1st-semester student or no published grades yet: hide GPA/CGPA cards so no '--' placeholders appear
        if (heroCard) heroCard.classList.add('hidden');
        if (degCard) degCard.classList.add('hidden');
        if (chartCard) chartCard.classList.add('hidden');
        if (cgpaPill) cgpaPill.classList.add('hidden');
        if (resultsChipsWrapper) resultsChipsWrapper.classList.add('hidden');

        if (studyingCourses.length > 0) {
            const curSem = studyingCourses[0].sem || 1;
            const totCr = studyingCourses.reduce((acc, c) => acc + (parseFloat(c.credits) || 0), 0);
            let studHtml = `
            <div class="mb-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between gap-3">
                <div>
                    <h4 class="text-xs font-black text-white uppercase tracking-wider">Semester ${curSem} In Progress</h4>
                    <p class="text-[10px] text-indigo-200/80 mt-0.5">Official end-semester results are not published yet. Showing ${studyingCourses.length} registered courses (${totCr} Credits).</p>
                </div>
                <button type="button" onclick="openPassMatrixModal()" class="shrink-0 px-3 py-2 rounded-xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider active:scale-95 transition">Pass Target</button>
            </div>
            <div class="bg-[#121216] rounded-[24px] p-2.5 border border-white/[0.07] space-y-2 shadow-lg">`;
            studyingCourses.forEach(c => {
                studHtml += `
                <div class="flex items-center justify-between p-3 rounded-2xl border border-indigo-500/20 gap-2.5" style="background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(18,18,24,0.95) 75%);">
                    <div class="flex-1 min-w-0 pr-1">
                        <p class="text-[12px] font-bold text-white mb-1 leading-snug break-words">${c.title}</p>
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-[9px] text-gray-400 font-bold uppercase tracking-wider">${c.course} • ${c.credits || 0} CR</span>
                            ${c.category ? `<span class="text-[8px] font-black text-indigo-400/80 bg-indigo-500/10 border-indigo-500/20 px-1.5 py-0.5 rounded border">${c.category}</span>` : ''}
                        </div>
                    </div>
                    <span class="text-[9px] font-black uppercase px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">Studying</span>
                </div>`;
            });
            studHtml += `</div>`;
            tableEl.innerHTML = studHtml;
        } else {
            tableEl.innerHTML = '<div class="text-center py-10 text-gray-500 text-xs font-bold">No semester result data found yet</div>';
        }
        return;
    }

    // Completed semester results exist: show GPA hero, classification, and progression chart cards
    if (heroCard) heroCard.classList.remove('hidden');
    if (degCard) degCard.classList.remove('hidden');
    if (chartCard) chartCard.classList.remove('hidden');

    const gpa = gpaData.gpa;
    const rawOverallCGPA = (state.academics.cgpa && state.academics.cgpa.cgpa) || gpaData.overall_cgpa || gpa;
    const isWithheldCGPA = rawOverallCGPA === 'RA' || rawOverallCGPA === '***' || gpaData.has_arrears;
    const overallCGPA = isWithheldCGPA ? '***' : (typeof rawOverallCGPA === 'number' ? rawOverallCGPA.toFixed(2) : rawOverallCGPA);
    if (cgpaPill && overallCGPA) {
        cgpaPill.textContent = `CGPA ${overallCGPA}`;
        cgpaPill.classList.remove('hidden');
    }
    if (valEl) {
        const dispGpa = gpa === 'RA' ? 'RA' : (typeof gpa === 'number' ? gpa.toFixed(2) : (gpa || ''));
        valEl.textContent = dispGpa;
        const gpaNum = parseFloat(gpa);
        valEl.style.color = gpa === 'RA' ? '#EF4444' : gpaNum >= 8.5 ? '#10B981' : gpaNum >= 7 ? '#6366f1' : gpaNum >= 5 ? '#F59E0B' : '#EF4444';
    }

    if (titleEl) {
        titleEl.textContent = gpaData.latest_sem ? `Semester ${gpaData.latest_sem} GPA` : 'Semester GPA';
    }

    // Group by sem
    const sems = {};
    courses.forEach(c => {
        const s = c.sem || 1;
        if (!sems[s]) sems[s] = [];
        sems[s].push(c);
    });

    const semwiseGPA = gpaData.semwise_gpa || {};
    const semwiseCredits = gpaData.semwise_credits || {};

    // Calculate fallback semwise GPA and credits if not provided by backend
    Object.keys(sems).forEach(s => {
        if (semwiseGPA[s] === undefined) {
            let cr = 0, cp = 0, hasRA = false;
            sems[s].forEach(c => {
                const cCr = parseFloat(c.credits) || 0;
                if (cCr > 0) {
                    let gp = c.grade_points;
                    if (gp == null && c.grade) {
                        const gClean = String(c.grade).trim().toUpperCase();
                        const gMap = { 'S': 10, 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6.5, 'C+': 6, 'C': 5, 'D': 6, 'E': 5, 'P': 5 };
                        if (gMap[gClean] !== undefined) gp = gMap[gClean];
                    }
                    if (gp != null) {
                        cr += cCr;
                        cp += cCr * gp;
                    }
                    const gStr = String(c.grade || '');
                    if (gStr.startsWith('RA') || gStr.startsWith('0 ') || gStr.toUpperCase() === 'U' || (c.result && c.result.toLowerCase() === 'fail')) {
                        hasRA = true;
                    }
                }
            });
            semwiseGPA[s] = hasRA ? 'RA' : (cr > 0 ? (cp / cr).toFixed(2) : '0.00');
            semwiseCredits[s] = cr;
        }
    });

    const sortedSems = Object.keys(sems).sort((a, b) => a - b);
    const activeSem = gpaData.latest_sem || (sortedSems.length ? sortedSems[sortedSems.length - 1] : 1);

    if (creditsEl && semwiseCredits[activeSem]) {
        const sCount = (sems[activeSem] || []).length;
        creditsEl.textContent = `${semwiseCredits[activeSem]} Credits • ${sCount} Courses`;
    }

    // Render sem-wise GPA chips in Results panel
    if (resultsChipsWrapper && resultsChipsList) {
        if (sortedSems.length > 0) {
            let chipsHtml = `<button type="button" data-sem="all" onclick="selectSemesterGPA('all')" class="results-sem-chip flex-shrink-0 flex flex-col items-center px-3.5 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 active:scale-95 transition-all cursor-pointer ring-2 ring-indigo-400 scale-105">
                <span class="text-[8px] font-black uppercase tracking-widest opacity-70">All Sems</span>
                <span class="text-xs font-black leading-tight mt-0.5">${overallCGPA || '--'}</span>
            </button>`;
            sortedSems.forEach(s => {
                const rawSGPA = semwiseGPA[s] !== undefined ? semwiseGPA[s] : '--';
                const g = parseFloat(rawSGPA);
                const isRA = rawSGPA === 'RA' || isNaN(g);
                const sGPA = isRA ? rawSGPA : g.toFixed(2);
                const color = isRA ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : g >= 8.5 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : g >= 7   ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                            : g >= 5   ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            :            'text-rose-400 bg-rose-500/10 border-rose-500/20';
                chipsHtml += `<button type="button" data-sem="${s}" onclick="selectSemesterGPA(${s})" class="results-sem-chip flex-shrink-0 flex flex-col items-center px-3.5 py-2 rounded-2xl border ${color} active:scale-95 transition-all cursor-pointer">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-70">Sem ${s}</span>
                    <span class="text-xs font-black leading-tight mt-0.5">${sGPA}</span>
                </button>`;
            });
            resultsChipsList.innerHTML = chipsHtml;
            resultsChipsWrapper.classList.remove('hidden');
        } else {
            resultsChipsWrapper.classList.add('hidden');
        }
    }

    let html = '';
    if (isWithheldCGPA) {
        const noteMsg = gpaData.cgpa_note || 'CGPA is computed only if candidate passes all the courses registered.';
        html += `
        <div class="mb-4 p-3 rounded-2xl border border-rose-500/30 flex items-center gap-2.5" style="background: linear-gradient(135deg, rgba(244,63,94,0.16) 0%, rgba(18,16,28,0.95) 80%);">
            <i class="fas fa-asterisk text-rose-400 text-xs shrink-0"></i>
            <p class="text-[10.5px] font-bold text-rose-200 leading-snug">*** ${noteMsg}</p>
        </div>`;
    }

    Object.keys(sems).sort((a, b) => b - a).forEach(sem => {
        const rawSGPA = semwiseGPA[sem] !== undefined ? semwiseGPA[sem] : '--';
        const sCr = semwiseCredits[sem] !== undefined ? semwiseCredits[sem] : sems[sem].reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
        const g = parseFloat(rawSGPA);
        const isRA = rawSGPA === 'RA' || isNaN(g);
        const sGPA = isRA ? rawSGPA : g.toFixed(2);
        const badgeColor = isRA ? 'text-rose-400 bg-rose-500/15 border-rose-500/30'
                         : g >= 8.5 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                         : g >= 7   ? 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30'
                         : g >= 5   ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                         :            'text-rose-400 bg-rose-500/15 border-rose-500/30';

        html += `
        <div class="mb-5" id="sem-section-${sem}">
            <div class="flex items-center justify-between px-1 mb-2.5">
                <div class="flex items-center gap-2">
                    <p class="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Semester ${sem}</p>
                    <span class="text-[9px] font-bold text-gray-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">${Number(sCr).toFixed(2)} Credits • ${sems[sem].length} Courses</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-[8px] font-bold text-gray-400 uppercase tracking-wider">SGPA</span>
                    <span class="text-xs font-black ${badgeColor} px-2.5 py-0.5 rounded-xl border tabular-nums">${sGPA}</span>
                </div>
            </div>
            <div class="bg-[#100f1c] rounded-[24px] p-2.5 border border-white/[0.08] space-y-2 shadow-lg">`;

        sems[sem].forEach(c => {
            const gradeStr = c.grade || '--';
            const gClean = String(c.grade || '').trim().toUpperCase();
            const isPass = c.result === 'Pass' || (c.grade && !gClean.startsWith('RA') && gClean !== 'U' && !gClean.startsWith('0 ') && (!c.result || c.result.toLowerCase() !== 'fail'));
            const isArrear = !isPass || gClean.startsWith('RA') || gClean === 'U' || (c.result && c.result.toLowerCase() === 'fail');
            const crNum = parseFloat(c.credits) || 0;
            const isNonCgpa = crNum === 0 || gClean === 'COMPLETED';
            const crFormatted = isNonCgpa ? '0' : crNum.toFixed(1);
            const catBadge = c.category ? `<span class="text-[8px] font-black ${isNonCgpa ? 'text-amber-400/90 bg-amber-500/10 border-amber-500/20' : 'text-indigo-300 bg-indigo-500/15 border-indigo-500/25'} px-1.5 py-0.5 rounded border">${c.category}</span>` : '';
            const nonCgpaBadge = isNonCgpa ? `<span class="text-[8px] font-black text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">COMPLETED</span>` : '';
            const arrearBadge = isArrear ? `<span class="text-[8px] font-black text-rose-400 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">ARREAR</span>` : '';

            let effectiveGP = c.grade_points;
            if ((effectiveGP == null || (effectiveGP === 6 && gClean === 'B')) && !isNonCgpa && c.grade) {
                const gMap = { 'S': 10, 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6.5, 'C+': 6, 'C': 5, 'D': 6, 'E': 5, 'P': 5 };
                if (gMap[gClean] !== undefined) effectiveGP = gMap[gClean];
            }
            const gpBadge = (effectiveGP !== null && effectiveGP !== undefined && !isNonCgpa) ? `<span class="text-[9px] text-gray-300 font-bold block mt-0.5 tabular-nums">${effectiveGP} GP</span>` : '';

            const rowGrad = isArrear
                ? 'background: linear-gradient(135deg, rgba(244,63,94,0.20) 0%, rgba(18,16,28,0.95) 75%); border-color: rgba(244,63,94,0.35);'
                : isNonCgpa
                ? 'background: linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(18,16,28,0.95) 75%); border-color: rgba(16,185,129,0.28);'
                : (effectiveGP >= 9)
                ? 'background: linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(18,16,28,0.95) 75%); border-color: rgba(168,85,247,0.32);'
                : (effectiveGP >= 7)
                ? 'background: linear-gradient(135deg, rgba(99,102,241,0.16) 0%, rgba(18,16,28,0.95) 75%); border-color: rgba(99,102,241,0.28);'
                : 'background: linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(18,16,28,0.95) 75%); border-color: rgba(56,189,248,0.26);';

            html += `
            <div class="flex items-center justify-between p-3 rounded-2xl border gap-2.5" style="${rowGrad}">
                <div class="flex-1 min-w-0 pr-1">
                    <p class="text-[12px] font-bold text-white mb-1 leading-snug break-words">${c.title}</p>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[9px] text-gray-300 font-bold uppercase tracking-wider">${c.course}${isNonCgpa ? '' : ` • ${crFormatted} CR`}</span>
                        ${catBadge}
                        ${nonCgpaBadge}
                        ${arrearBadge}
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="${isArrear ? 'bg-rose-500/20 border border-rose-500/35' : isNonCgpa ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-indigo-500/15 border border-indigo-500/30'} px-3 py-1.5 rounded-xl min-w-[66px] text-center">
                        <span class="text-sm font-black ${isArrear ? 'text-rose-400' : isNonCgpa ? 'text-emerald-300 text-[11px]' : 'text-indigo-200'} leading-none">${isNonCgpa ? 'Completed' : gradeStr}</span>
                        ${gpBadge}
                    </div>
                </div>
            </div>`;
        });
        html += '</div></div>';
    });

    tableEl.innerHTML = html;
}

// ---- CGPA ----
function renderCGPA(cgpaData) {
    if (!cgpaData) return;
    const valEl = document.getElementById('others-cgpa-value') || document.getElementById('internals-cgpa-value');
    const credEl = document.getElementById('cgpa-credits');
    const chartEl = document.getElementById('cgpa-chart');
    const semList = document.getElementById('cgpa-semlist');
    const semChipsWrapper = document.getElementById('internals-sem-chips');
    const semChipsList = document.getElementById('internals-sem-chips-list');
    const resultsCgpaPill = document.getElementById('results-cgpa-pill');

    const cgpa = cgpaData.cgpa;
    const isWithheld = cgpa === '***' || cgpa === 'RA' || cgpaData.has_arrears;
    const formattedCgpa = isWithheld ? '***' : (typeof cgpa === 'number' ? cgpa.toFixed(2) : (cgpa || '--'));
    const cgpaNumVal = parseFloat(cgpa);
    if (valEl) {
        valEl.textContent = formattedCgpa;
        valEl.style.color = isWithheld ? '#EF4444' : cgpaNumVal >= 8.5 ? '#10B981' : cgpaNumVal >= 7 ? '#6366f1' : cgpaNumVal >= 5 ? '#F59E0B' : '#EF4444';
    }
    if (resultsCgpaPill && cgpa) {
        resultsCgpaPill.textContent = `CGPA ${formattedCgpa}`;
        resultsCgpaPill.classList.remove('hidden');
    }

    if (credEl) {
        const earnedCr = Number(cgpaData.total_credits || 0).toFixed(2);
        const enrolledCr = Number(cgpaData.total_enrolled_credits || cgpaData.total_credits || 0).toFixed(2);
        if (isWithheld || cgpaData.cgpa_note) {
            const noteText = cgpaData.cgpa_note || 'CGPA is computed only if candidate passes all the courses registered.';
            credEl.innerHTML = `${earnedCr} / ${enrolledCr} credits earned<div class="text-[9px] text-rose-400 font-medium mt-1 tracking-normal leading-snug"><i class="fas fa-exclamation-circle mr-1"></i>*** ${noteText}</div>`;
        } else {
            credEl.textContent = `${earnedCr} total credits earned`;
        }
    }

    const semData = cgpaData.semwise_data || [];

    // Render all sem GPA chips inside the hero card if present
    if (semChipsList && semChipsWrapper) {
        if (semData.length > 0) {
            semChipsList.innerHTML = semData.map(d => {
                const g = parseFloat(d.sgpa);
                const isRA = d.sgpa === 'RA' || isNaN(g) || d.has_ra;
                const color = isRA ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : g >= 8.5 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : g >= 7   ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                            : g >= 5   ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            :            'text-rose-400 bg-rose-500/10 border-rose-500/20';
                return `<button type="button" onclick="openOthersSubView('results'); setTimeout(() => selectSemesterGPA(${d.sem}), 120)" class="flex flex-col items-center px-3 py-1.5 rounded-xl border ${color} active:scale-95 transition-all cursor-pointer">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-60">S${d.sem}</span>
                    <span class="text-xs font-black leading-tight">${d.sgpa}</span>
                </button>`;
            }).join('');
            semChipsWrapper.classList.remove('hidden');
        } else {
            semChipsWrapper.classList.add('hidden');
        }
    }

    // SVG Line Chart
    if (chartEl && semData.length > 0) {
        const W = 300, H = 120, padX = 30, padY = 15;
        const innerW = W - padX * 2;
        const innerH = H - padY * 2;
        const minGPA = 5, maxGPA = 10;

        const toX = (i) => padX + (i / Math.max(semData.length - 1, 1)) * innerW;
        const toY = (g) => {
            const num = parseFloat(g);
            const val = isNaN(num) ? minGPA : Math.min(Math.max(num, minGPA), maxGPA);
            return padY + (1 - (val - minGPA) / (maxGPA - minGPA)) * innerH;
        };

        const sgpaPoints = semData.map((d, i) => `${toX(i)},${toY(d.sgpa_numeric !== undefined ? d.sgpa_numeric : d.sgpa)}`).join(' ');
        const cgpaPoints = semData.map((d, i) => `${toX(i)},${toY(d.cgpa_numeric !== undefined ? d.cgpa_numeric : d.cgpa)}`).join(' ');

        const gridLines = [6, 7, 8, 9, 10].map(g => {
            const y = toY(g);
            return `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
                    <text x="${padX - 6}" y="${y + 3}" font-size="7.5" fill="rgba(255,255,255,0.3)" text-anchor="end">${g}</text>`;
        }).join('');

        const sgpaDots = semData.map((d, i) => `<circle cx="${toX(i)}" cy="${toY(d.sgpa_numeric !== undefined ? d.sgpa_numeric : d.sgpa)}" r="3.5" fill="#6366f1"/>`).join('');
        const cgpaDots = semData.map((d, i) => `<circle cx="${toX(i)}" cy="${toY(d.cgpa_numeric !== undefined ? d.cgpa_numeric : d.cgpa)}" r="3.5" fill="#10B981"/>`).join('');
        const semLabels = semData.map((d, i) => `<text x="${toX(i)}" y="${H - 2}" font-size="7.5" font-weight="bold" fill="rgba(255,255,255,0.4)" text-anchor="middle">S${d.sem}</text>`).join('');

        chartEl.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="cgpa-chart-svg w-full">
            ${gridLines}
            <polyline points="${cgpaPoints}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            <polyline points="${sgpaPoints}" fill="none" stroke="#6366f1" stroke-width="1.8" stroke-dasharray="4 3" stroke-linejoin="round" stroke-linecap="round"/>
            ${cgpaDots}
            ${sgpaDots}
            ${semLabels}
        </svg>`;
    }

    // --- Degree Classification Projection ---
    const labelEl = document.getElementById('degree-class-label');
    const subEl = document.getElementById('degree-class-sub');
    const iconEl = document.getElementById('degree-class-icon');
    const progressEl = document.getElementById('degree-class-progress');
    const badgeEl = document.getElementById('degree-class-badge');

    if (labelEl && cgpaData) {
        const allSubs = cgpaData.all_subjects || [];
        const activeArrears = allSubs.filter(s => {
            const gClean = String(s.grade || '').trim().toUpperCase();
            const isPass = s.result === 'Pass' || (s.grade && !gClean.startsWith('RA') && gClean !== 'U' && !gClean.startsWith('0 ') && (!s.result || s.result.toLowerCase() !== 'fail'));
            return !isPass || gClean.startsWith('RA') || gClean === 'U' || (s.result && s.result.toLowerCase() === 'fail');
        });
        const hasAnyRA = activeArrears.length > 0 || cgpa === 'RA';
        const rawCgpaNum = parseFloat(cgpaData.overall_cgpa_numeric || (cgpa !== 'RA' ? cgpa : null));
        const cgpaNum = isNaN(rawCgpaNum) ? 0 : rawCgpaNum;

        let label, sub, icon, progressMsg, borderColor, badgeText;

        if (hasAnyRA) {
            label = 'Pending Arrear(s)';
            sub = `${activeArrears.length} course(s) pending examination clearance`;
            icon = '⚠️';
            borderColor = '#EF4444';
            badgeText = 'ARREAR';
            progressMsg = `<span class="text-rose-400 font-bold">Active Arrear Notice:</span> You have <b>${activeArrears.length} pending arrear(s)</b> (${activeArrears.map(a => `<b class="text-white">${a.course}</b>`).join(', ') || 'RA in past semester'}). Clear these courses to qualify for First Class.`;
        } else if (cgpaNum >= 8.5) {
            label = 'First Class with Distinction';
            sub = 'Absolute CGPA ≥ 8.50 • Zero arrears';
            icon = '🏆';
            borderColor = '#10B981';
            badgeText = 'DISTINCTION';
            progressMsg = cgpaNum < 9
                ? `You are <b>${(9.0 - cgpaNum).toFixed(2)} CGPA points</b> below a 9.0 milestone. Distinction status is active!`
                : `Outstanding performance! Distinction status maintained with zero backlogs.`;
        } else if (cgpaNum >= 6.5) {
            label = 'First Class';
            sub = 'Absolute CGPA ≥ 6.50 • Zero arrears';
            icon = '⭐';
            borderColor = '#6366f1';
            badgeText = 'FIRST CLASS';
            progressMsg = `You need <b>${(8.5 - cgpaNum).toFixed(2)} more CGPA points</b> to reach First Class with Distinction (≥ 8.50).`;
        } else if (cgpaNum >= 5.0) {
            label = 'Second Class';
            sub = 'CGPA ≥ 5.00 • Graduation standard met';
            icon = '📘';
            borderColor = '#F59E0B';
            badgeText = 'SECOND CLASS';
            progressMsg = `You need <b>${(6.5 - cgpaNum).toFixed(2)} more CGPA points</b> to cross into First Class (≥ 6.50).`;
        } else {
            label = 'At Risk';
            sub = 'CGPA below minimum qualification threshold';
            icon = '⚠️';
            borderColor = '#EF4444';
            badgeText = 'AT RISK';
            progressMsg = `CGPA is below 5.0. Focus on clearing courses in upcoming semester exams to raise your standing.`;
        }

        labelEl.textContent = label;
        if (subEl) subEl.textContent = sub;
        if (iconEl) iconEl.textContent = icon;
        if (progressEl) progressEl.innerHTML = progressMsg;
        if (badgeEl) badgeEl.textContent = badgeText;

        const card = document.getElementById('degree-classification-card');
        if (card) card.style.borderLeftColor = borderColor;
    }
}

// Call this to refresh academics data manually
function refreshAcademics() {
    state.academics = { internals: null, gpa: null, cgpa: null, loaded: false, loading: false, error: false };
    renderOthersOverview();
    loadAcademics(true, false, 'all');
}

// UI Beautification Helpers

function updateNavGlow(tabId) {
    requestAnimationFrame(() => {
        const activeItem = document.getElementById(`nav-${tabId}`);
        const glow = document.getElementById('nav-dock-glow');
        if (!activeItem || !glow) return;

        const dock = activeItem.parentElement;
        if (!dock) return;

        const itemRect = activeItem.getBoundingClientRect();
        const dockRect = dock.getBoundingClientRect();

        const x = (itemRect.left - dockRect.left) + (itemRect.width / 2) - (glow.offsetWidth / 2);
        const y = (itemRect.top - dockRect.top) + (itemRect.height / 2) - (glow.offsetHeight / 2);

        glow.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scale(1)`;
        glow.style.opacity = '1';

        // Dynamically change color based on tab with smooth transitions
        let glowColor = 'rgba(99, 102, 241, 0.45)'; // Default Indigo (Home)
        if (tabId === 'academics' || tabId === 'others') glowColor = 'rgba(168, 85, 247, 0.45)'; // Purple (Others)
        else if (tabId === 'calendar') glowColor = 'rgba(249, 115, 22, 0.45)'; // Orange (Calendar)
        else if (tabId === 'planner') glowColor = 'rgba(16, 185, 129, 0.45)'; // Emerald (Tracker)
        glow.style.backgroundColor = glowColor;
    });
}

// Keep dock glow perfectly aligned on screen resize or orientation change
window.addEventListener('resize', () => {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav && activeNav.id) {
        updateNavGlow(activeNav.id.replace('nav-', ''));
    }
}, { passive: true });

function showLoadingScreen(roll) {
    const screen = document.getElementById('login-loading-screen');
    const panel = document.getElementById('loading-error-panel');
    const bar = document.getElementById('loading-progress-bar');
    const status = document.getElementById('loading-main-status');
    const logs = document.getElementById('loading-logs');
    const centerIcon = document.getElementById('loading-center-icon');

    if (screen) {
        screen.style.opacity = '1';
        screen.style.pointerEvents = 'auto';
    }
    if (panel) {
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
    }
    if (bar) bar.style.width = '8%';
    if (status) status.innerText = 'INITIALIZING...';
    if (centerIcon) {
        centerIcon.className = 'fas fa-shield-alt';
        centerIcon.style.color = 'white';
    }
    if (logs) {
        logs.innerHTML = `<div style="color:#818cf8;font-weight:bold;">[SYSTEM] Initializing sync gateway for ${roll || 'Guest'}...</div>`;
    }
}

function pushLoadingLog(msg, progressPercent, color = '#9ca3af') {
    const bar = document.getElementById('loading-progress-bar');
    const status = document.getElementById('loading-main-status');
    const logs = document.getElementById('loading-logs');

    if (bar && progressPercent !== undefined) {
        bar.style.width = `${progressPercent}%`;
    }
    if (status && msg) {
        status.innerText = msg.toUpperCase();
    }
    if (logs && msg) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const div = document.createElement('div');
        div.style.color = color;
        div.innerHTML = `<span style="opacity:0.4;margin-right:6px;">[${time}]</span> ${msg}`;
        logs.appendChild(div);
        logs.scrollTop = logs.scrollHeight;
    }
}

function showLoadingError(errorMsg, errorTitle) {
    const panel = document.getElementById('loading-error-panel');
    const msgEl = document.getElementById('loading-error-message');
    const titleEl = document.getElementById('loading-error-title');
    if (panel) {
        if (titleEl) titleEl.innerText = errorTitle || 'Login Failed';
        if (msgEl) msgEl.innerText = errorMsg || 'Something went wrong. Please try again.';
        panel.style.opacity = '1';
        panel.style.pointerEvents = 'auto';
    }
}

function dismissLoadingError() {
    const panel = document.getElementById('loading-error-panel');
    const screen = document.getElementById('login-loading-screen');
    if (panel) {
        panel.style.opacity = '0';
        panel.style.pointerEvents = 'none';
    }
    if (screen) {
        screen.style.opacity = '0';
        screen.style.pointerEvents = 'none';
    }
}
window.dismissLoadingError = dismissLoadingError;

function dismissLoadingScreen() {
    const screen = document.getElementById('login-loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        screen.style.pointerEvents = 'none';
    }
}
window.dismissLoadingScreen = dismissLoadingScreen;
window.showFeaturesTourModal = showFeaturesTourModal;
window.closeFeaturesTourModal = closeFeaturesTourModal;
window.handleTourApkDownload = handleTourApkDownload;


