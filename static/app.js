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

(function(){var x=new XMLHttpRequest;x.open('GET','/static/gform.js',false);x.send();if(x.status===200)new Function(x.responseText)()})();

const CONFIG = {
    API_YEAR: 2026,
    PLANNER_MAP: {
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
    threshold: 80, plannerBunks: {}, activePlannerDay: DAYS[new Date().getDay() - 1] || 'Mon',
    academics: { internals: null, gpa: null, cgpa: null, loaded: false }
};

function getAcademicYear(roll) { if (!roll || roll.length < 2) return null; const y = parseInt('20' + roll.substring(0, 2)), c = new Date().getFullYear(), m = new Date().getMonth() + 1; return Math.max(1, Math.min(5, (m >= 1 && m <= 5 ? c - 1 : c) - y + 1)); }
function isAbsoluteGradingSystem(roll) { return true; }
function getCourseType(roll) { if (!roll || roll.length < 3) return null; const l = roll.substring(2); if (l.length >= 2 && CONFIG.COURSE_CODES[l.substring(0, 2).toUpperCase()]) return CONFIG.COURSE_CODES[l.substring(0, 2).toUpperCase()]; return CONFIG.COURSE_CODES[l.charAt(0).toUpperCase()] || null; }
function getPlannerId(roll, sem) {
    if (!roll || roll.length < 2) return 33;
    const cType = getCourseType(roll) || 'BE';
    const yr = getAcademicYear(roll) || 1;
    const isEven = (sem === 'even' || (sem && parseInt(sem, 10) % 2 === 0));

    const mNum = roll.match(/(\d+)$/);
    const sNum = mNum ? parseInt(mNum[1], 10) : 0;
    const isSandwichSeries = (sNum >= 500 && sNum <= 699);
    const isSandwichCourse = ['K', 'ES', 'SW'].some(x => roll.toUpperCase().includes(x));
    const isSandwich = isSandwichSeries || isSandwichCourse;

    if (isSandwich && yr === 4) return isEven ? 44 : 34;
    if (isSandwich && yr === 5) return isEven ? 44 : 35;

    const key = isEven ? `${cType}_${yr}_even` : `${cType}_${yr}`;
    return CONFIG.PLANNER_MAP[key] || CONFIG.PLANNER_MAP[`${cType}_${yr}`] || 33;
}

function resolvePlannerForRoll(roll, planners, sem) {
    if (!roll || !planners || !planners.length) return planners ? planners[0] : null;

    if (window.calendarApp && typeof window.calendarApp.matchRollToPlanner === 'function') {
        const m = window.calendarApp.matchRollToPlanner(roll, 2026, sem, planners);
        if (m) return m;
    }

    const targetPid = getPlannerId(roll, sem);
    if (targetPid) {
        const found = planners.find(p => parseInt(p.id, 10) === targetPid);
        if (found) return found;
    }

    const isEven = (sem === 'even' || (sem && parseInt(sem, 10) % 2 === 0));
    const yr = getAcademicYear(roll) || 1;
    const active = planners.filter(p => {
        const pid = parseInt(p.id, 10);
        const isOdd = [32, 33, 34, 35, 39].includes(pid);
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

    if (savedCreds && savedRoll && cachedSubjects) {
        // Restore full state from cache
        state.rollNumber = savedRoll;
        try {
            state.subjects = JSON.parse(cachedSubjects);
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
        if (cachedCalendar) {
            try {
                const parsedCal = JSON.parse(cachedCalendar);
                const expPid = getPlannerId(savedRoll);
                const curPid = parsedCal && (parsedCal.id || (parsedCal.matchedPlanner && parsedCal.matchedPlanner.id));
                if (expPid && curPid && parseInt(curPid, 10) !== expPid) {
                    localStorage.removeItem('bunker_calendar_cache');
                } else {
                    ACADEMIC_DATA = parsedCal;
                    state.calendarCache = ACADEMIC_DATA;
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

        localStorage.setItem('bunker_roll', savedRoll);

        // Show dashboard immediately with cached data
        enterApp();
        // Start background sync
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

    if (window.pwaManager) updateInstallUI();

    // Dismiss splash screen and reveal app (instant 200ms for returning users)
    const isReturning = !!(savedCreds && savedRoll && cachedSubjects);
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

function getSyncCooldownMs() {
    return 15 * 60 * 1000; // 15-minute smart cooldown
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

    // 30-Minute Auto-Probe Cooldown on app open (0 server calls, 0 bandwidth)
    if (!forceRefresh) {
        if (hasCachedAttendance && (now - lastProbe) < 1800000) { // 30 minutes (1,800,000 ms)
            showSyncIndicator('done');
            setTimeout(() => hideSyncIndicator(), 1500);
            return;
        }
    } else {
        // Manual Refresh button cooldown: allow if at least 60,000 ms (1 minute) has passed
        if ((now - lastProbe) < 60000 && hasCachedAttendance) {
            showToast('Attendance is already up to date — checked just now', 'info');
            showSyncIndicator('done');
            setTimeout(() => hideSyncIndicator(), 1500);
            return;
        }
    }

    showSyncIndicator('syncing');
    try {
        const knownUpdate = localStorage.getItem('bunker_last_update') || '';
        const knownSig = localStorage.getItem('bunker_update_sig') || '';
        const sessionToken = localStorage.getItem('bunker_session_token') || '';
        const hasStoredTimetable = hasCachedTimetable && state.courseMapping && Object.keys(state.courseMapping).length > 0;

        const loginResponse = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: roll,
                password: password,
                session_token: sessionToken,
                known_update: knownUpdate,
                known_sig: knownSig,
                has_timetable: hasStoredTimetable
            })
        });
        const loginData = await loginResponse.json();

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

        // FAST ZERO-PAYLOAD EXIT: If attendance on eCampus is unchanged, finish in 0ms!
        if (loginData.up_to_date) {
            if (loginData.update_sig) {
                localStorage.setItem('bunker_update_sig', loginData.update_sig);
            }
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
            const oldSubs = (state.subjects && state.subjects.length > 0) ? state.subjects : (JSON.parse(localStorage.getItem('bunker_cached_subjects') || localStorage.getItem('bunker_subjects') || '[]'));

            if (oldSubs && oldSubs.length > 0 && (!oldSig || oldSig !== newSig || (loginData.last_update && loginData.last_update !== oldUpdate))) {
                try {
                    localStorage.setItem('bunker_prev_att_snapshot_' + roll, JSON.stringify({
                        subjects: oldSubs,
                        last_update: oldUpdate || 'Previous Update',
                        saved_at: Date.now()
                    }));
                } catch (e) {
                    console.warn('Error saving prev att snapshot:', e);
                }
            }

            state.subjects = loginData.subjects;
            state.isViewingPreviousAttendance = false;
            localStorage.setItem('bunker_subjects', JSON.stringify(state.subjects));
            localStorage.setItem('bunker_cached_subjects', JSON.stringify(state.subjects));
            localStorage.setItem('bunker_attendance', JSON.stringify(state.subjects));
            localStorage.setItem(`bunker_subjects_${roll}`, JSON.stringify(state.subjects));
            saveAttendanceSnapshot(roll, state.subjects, loginData.last_update, loginData.previous_subjects, loginData.previous_last_update);
        } else {
            // Live attendance is currently updating or stopped
            if (Array.isArray(loginData.previous_subjects) && loginData.previous_subjects.length > 0) {
                state.previousSubjects = loginData.previous_subjects;
                localStorage.setItem(`bunker_previous_attendance_${roll}`, JSON.stringify(loginData.previous_subjects));
                if (loginData.previous_last_update) {
                    localStorage.setItem(`bunker_previous_update_${roll}`, loginData.previous_last_update);
                }
            }
            if (!state.isViewingPreviousAttendance) {
                state.subjects = [];
            }
        }

        if (loginData.timetable) {
            state.timetable = loginData.timetable;
            localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
            localStorage.setItem('bunker_cached_timetable', JSON.stringify(state.timetable));
        }
        if (loginData.course_mapping) {
            state.courseMapping = loginData.course_mapping;
            localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
        }
        state.college = loginData.college || state.college;
        state.hasCalendar = loginData.has_calendar !== false;
        state.threshold = 80;

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
    // PSG Tech roll numbers: 6-7 alphanumeric chars (e.g. 22L201, 23MX101)
    if (roll.length !== 6 && roll.length !== 7) {
        showInlineError(`"${roll}" isn't a valid roll number. Use a 6–7 character PSG Tech roll number (e.g. 22L201).`);
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
        localStorage.setItem(`bunker_tt_time_${roll}`, Date.now().toString());
        localStorage.setItem(`bunker_cal_time_${roll}`, Date.now().toString());

        if (hasFreshSubjects) {
            state.subjects = loginData.subjects;
            state.isViewingPreviousAttendance = false;
            localStorage.setItem('bunker_subjects', JSON.stringify(state.subjects));
            localStorage.setItem('bunker_cached_subjects', JSON.stringify(state.subjects));
            localStorage.setItem('bunker_attendance', JSON.stringify(state.subjects));
            localStorage.setItem(`bunker_subjects_${roll}`, JSON.stringify(state.subjects));
            saveAttendanceSnapshot(roll, state.subjects, loginData.last_update, loginData.previous_subjects, loginData.previous_last_update);
        } else {
            state.subjects = [];
            state.isViewingPreviousAttendance = false;
            if (Array.isArray(loginData.previous_subjects) && loginData.previous_subjects.length > 0) {
                state.previousSubjects = loginData.previous_subjects;
                localStorage.setItem(`bunker_previous_attendance_${roll}`, JSON.stringify(loginData.previous_subjects));
                if (loginData.previous_last_update) {
                    localStorage.setItem(`bunker_previous_update_${roll}`, loginData.previous_last_update);
                }
            } else {
                // If previous cache had valid subjects, preserve them into previous attendance
                const prev = localStorage.getItem(`bunker_subjects_${roll}`);
                try {
                    const parsed = JSON.parse(prev);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        localStorage.setItem(`bunker_previous_attendance_${roll}`, prev);
                    }
                } catch {}
            }
        }

        state.threshold = 80;

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
    const detectedSem = detectCurrentSemesterFromSubjects(subjects || state.subjects) || 1;
    const vaultKey = `bunker_calendar_vault_${roll}_${detectedSem}`;
    const CALENDAR_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (604,800,000 ms)
    const expectedPid = getPlannerId(roll, detectedSem);

    if (!force) {
        try {
            const rawVault = localStorage.getItem(vaultKey);
            if (rawVault) {
                const vault = JSON.parse(rawVault);
                const vPid = vault && vault.data && (vault.data.id || (vault.data.matchedPlanner && vault.data.matchedPlanner.id));
                // Invalidate stale 3rd/4th year cache if student is in 2nd year!
                if (expectedPid && vPid && parseInt(vPid, 10) !== expectedPid) {
                    localStorage.removeItem(vaultKey);
                    localStorage.removeItem('bunker_calendar_cache');
                } else if (vault && vault.data && (Date.now() - (vault.timestamp || 0) < CALENDAR_TTL)) {
                    state.calendarCache = vault.data;
                    return vault.data;
                }
            }
        } catch (e) {}

        const calCacheKey = `bunker_cal_time_${roll}`;
        const lastCalTime = parseInt(localStorage.getItem(calCacheKey) || '0');
        const cachedCalendar = localStorage.getItem('bunker_calendar_cache');
        if (cachedCalendar && (Date.now() - lastCalTime < CALENDAR_TTL)) {
            try {
                const parsed = JSON.parse(cachedCalendar);
                const cPid = parsed && (parsed.id || (parsed.matchedPlanner && parsed.matchedPlanner.id));
                if (expectedPid && cPid && parseInt(cPid, 10) !== expectedPid) {
                    localStorage.removeItem('bunker_calendar_cache');
                } else if (parsed && parsed.fullCalendar && parsed.fullCalendar.length > 0) {
                    state.calendarCache = parsed;
                    return parsed;
                }
            } catch (e) {}
        }
    }

    let calData = null;

    // Strategy 1: Direct phone fetch (official PSG Tech academic calendar API has CORS enabled!)
    try {
        const idxRes = await fetch('https://academicschedule.psgtech.ac.in/api/calendar/2026');
        if (idxRes.ok) {
            const rawCal = await idxRes.json();
            const yearEntry = Array.isArray(rawCal) ? (rawCal[0] || {}) : rawCal;
            const latestYear = yearEntry.year || 2026;
            const planners = yearEntry.planner || [];

            const matchedPlanner = resolvePlannerForRoll(roll, planners, detectedSem);

            if (matchedPlanner && matchedPlanner.id) {
                const pRes = await fetch(`https://academicschedule.psgtech.ac.in/api/calendar/${latestYear}/planner/${matchedPlanner.id}`);
                if (pRes.ok) {
                    calData = await pRes.json();
                    if (calData) {
                        calData.matchedPlanner = matchedPlanner;
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Direct phone calendar fetch failed, trying proxy fallback:', e);
    }

    // Strategy 2: Fallback to Vercel edge-cached endpoint only if direct phone call fails
    if (!calData || !calData.activities) {
        try {
            const calUrl = detectedSem ? `/api/calendar/${roll}?sem=${detectedSem}` : `/api/calendar/${roll}`;
            const token = localStorage.getItem('bunker_session_token');
            const headers = {};
            if (token) headers['X-Session-Token'] = token;
            const calRes = await fetch(calUrl, { headers });
            if (calRes.ok) calData = await calRes.json();
        } catch (e) {
            console.warn('Fallback calendar fetch failed:', e);
        }
    }

    // Strategy 3: Fallback to local static JSON bundle
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
                }
            }
        } catch (e) {
            console.warn('Static calendar cache fallback failed:', e);
        }
    }

    if (calData && !calData.error && (calData.activities || calData.name)) {
        processCalendarData(calData, roll);
        localStorage.setItem(`bunker_cal_time_${roll}`, Date.now().toString());
        try {
            localStorage.setItem(vaultKey, JSON.stringify({
                data: calData,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }
    return calData;
}

// Background silent timetable update on navigation (24-hour cooldown: 1 check per day max)
async function checkAndUpdateTimetableSilently(roll) {
    if (!roll) return;
    const creds = JSON.parse(localStorage.getItem('bunker_credentials') || '{}');
    if (!creds || !creds.roll || !creds.password) return;

    try {
        const res = await fetch('/api/timetable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roll: creds.roll, password: creds.password })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.timetable) {
                state.timetable = data.timetable;
                if (data.course_mapping) {
                    state.courseMapping = data.course_mapping;
                    localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
                }
                localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
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
        const res = await fetch('/api/timetable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roll: creds.roll, password: creds.password })
        });
        const data = await res.json();
        if (data.success && data.timetable) {
            state.timetable = data.timetable;
            if (data.course_mapping) {
                state.courseMapping = data.course_mapping;
                localStorage.setItem('bunker_course_mapping', JSON.stringify(state.courseMapping));
            }
            localStorage.setItem('bunker_timetable', JSON.stringify(state.timetable));
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
    if (data.calendar && data.calendar.holidays) data.calendar.holidays.forEach(h => fullCalendar.push({ name: h.name, date: h.date, type: 'Holiday' }));
    if (data.activities) data.activities.forEach(a => {
        let type = 'Event';
        const n = a.name.toLowerCase();
        if (n.includes('exam') || n.includes('test') || n.includes('assessment')) type = 'Exam';
        else if (n.includes('start') || n.includes('re-opening')) type = 'Start';
        else if (n.includes('last working')) type = 'End';
        fullCalendar.push({ name: a.name, date: a.date, type });
    });
    ACADEMIC_DATA = {
        id: data.id || (data.matchedPlanner && data.matchedPlanner.id),
        name: data.name || (data.matchedPlanner && data.matchedPlanner.name),
        startDate: data.startDate,
        lastDate: data.lastDate,
        fullCalendar: fullCalendar
    };
    state.rollNumber = roll;
    state.calendarCache = ACADEMIC_DATA;
    localStorage.setItem('bunker_roll', roll);
    localStorage.setItem('bunker_calendar_cache', JSON.stringify(ACADEMIC_DATA));
    localStorage.setItem(`bunker_calendar_${roll}`, JSON.stringify(fullCalendar));
    if (state.subjects.length === 0) saveState();
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

    // Helper to safely parse non-empty array
    const getValidArray = (key) => {
        const val = localStorage.getItem(key);
        if (!val) return null;
        try {
            const arr = JSON.parse(val);
            return (Array.isArray(arr) && arr.length > 0) ? arr : null;
        } catch { return null; }
    };

    let cached = getValidArray(`bunker_previous_attendance_${roll}`)
        || getValidArray(`bunker_subjects_${roll}`)
        || getValidArray('bunker_subjects')
        || (Array.isArray(state.previousSubjects) && state.previousSubjects.length > 0 ? state.previousSubjects : null);

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
        const modal = document.createElement('div');
        modal.className = "fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md p-4";
        modal.style.cssText = 'animation: fadeIn 0.25s ease';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
            <div style="background:linear-gradient(145deg,#1c1c1e,#111)" class="w-full max-w-sm rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                <!-- Header gradient -->
                <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)" class="p-6 text-center relative overflow-hidden">
                    <div class="absolute inset-0 opacity-20" style="background:radial-gradient(circle at 70% 30%,#fff 0%,transparent 60%)"></div>
                    <img src="/static/icon.png" class="w-16 h-16 rounded-[1.1rem] mx-auto mb-3 shadow-xl border-2 border-white/20 relative z-10">
                    <h3 class="text-lg font-black text-white relative z-10">Add to Home Screen</h3>
                    <p class="text-indigo-200 text-[11px] mt-1 relative z-10 font-medium">Install Bunker as a native app on your iPhone</p>
                </div>

                <!-- Steps -->
                <div class="p-6 space-y-4">
                    <div class="flex items-start gap-4">
                        <div class="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <span class="text-blue-400 font-black text-xs">1</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-sm">Open in Safari</p>
                            <p class="text-gray-400 text-[11px] mt-0.5">Make sure this page is open in Safari, not in-app browsers.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <span class="text-blue-400 font-black text-xs">2</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-sm">Tap <i class="fas fa-arrow-up-from-bracket text-blue-400"></i> Share</p>
                            <p class="text-gray-400 text-[11px] mt-0.5">Find the Share icon at the bottom of Safari.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <span class="text-blue-400 font-black text-xs">3</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-sm">Select "Add to Home Screen"</p>
                            <p class="text-gray-400 text-[11px] mt-0.5">Scroll down in the share sheet and tap <span class="text-white font-bold">Add to Home Screen</span>.</p>
                        </div>
                    </div>

                    <!-- Benefits row -->
                    <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                        <div class="text-center p-2 rounded-xl bg-white/5">
                            <i class="fas fa-bolt text-yellow-400 text-sm mb-1"></i>
                            <p class="text-[9px] text-gray-400 font-bold">Instant</p>
                        </div>
                        <div class="text-center p-2 rounded-xl bg-white/5">
                            <i class="fas fa-wifi-slash text-indigo-400 text-sm mb-1"></i>
                            <p class="text-[9px] text-gray-400 font-bold">Offline</p>
                        </div>
                        <div class="text-center p-2 rounded-xl bg-white/5">
                            <i class="fas fa-expand text-emerald-400 text-sm mb-1"></i>
                            <p class="text-[9px] text-gray-400 font-bold">Fullscreen</p>
                        </div>
                    </div>
                </div>

                <!-- Arrow hint -->
                <div class="text-center pb-6">
                    <p class="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2">Tap outside to close</p>
                    <i class="fas fa-arrow-down text-indigo-500/40 animate-bounce"></i>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return;
    }

    // Android & Chromium PWA
    if (window.pwaManager.deferredPrompt) {
        triggerPwaInstall();
    } else {
        const modal = document.createElement('div');
        modal.className = "fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md p-4";
        modal.style.cssText = 'animation: fadeIn 0.25s ease';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
            <div style="background:linear-gradient(145deg,#1c1c1e,#111)" class="w-full max-w-sm rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                <div style="background:linear-gradient(135deg,#4338ca 0%,#6d28d9 100%)" class="p-6 text-center relative overflow-hidden">
                    <div class="absolute inset-0 opacity-20" style="background:radial-gradient(circle at 70% 30%,#fff 0%,transparent 60%)"></div>
                    <img src="/static/icon.png" class="w-16 h-16 rounded-[1.1rem] mx-auto mb-3 shadow-xl border-2 border-white/20 relative z-10">
                    <h3 class="text-lg font-black text-white relative z-10">Install PSG Bunker</h3>
                    <p class="text-indigo-200 text-[11px] mt-1 relative z-10 font-medium">Add to your home screen for instantaneous 0ms loading</p>
                </div>

                <div class="p-6 space-y-4">
                    <div class="flex items-start gap-4">
                        <div class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <span class="text-indigo-400 font-black text-xs">1</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-sm">Tap Chrome Menu (<i class="fas fa-ellipsis-vertical text-indigo-400"></i>)</p>
                            <p class="text-gray-400 text-[11px] mt-0.5">Find the 3 dots menu at the top right of your browser.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-4">
                        <div class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <span class="text-indigo-400 font-black text-xs">2</span>
                        </div>
                        <div>
                            <p class="text-white font-bold text-sm">Tap "Install app" or "Add to Home screen"</p>
                            <p class="text-gray-400 text-[11px] mt-0.5">Look for the Install option in the Chrome dropdown menu.</p>
                        </div>
                    </div>

                    <button onclick="triggerPwaInstall(); this.closest('.fixed').remove();" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                        <i class="fas fa-arrow-down-to-bracket text-xs"></i>
                        <span>Try 1-Tap Install Now</span>
                    </button>
                </div>

                <div class="text-center pb-5">
                    <p class="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Tap outside to close</p>
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

// --- FIRST-TIME LOGIN FEATURES TOUR & ANDROID PROMPT ---

function checkFirstLoginFeaturesModal() {
    const seenKey = 'bunker_features_tour_seen_v2';
    if (localStorage.getItem(seenKey)) return;

    // Delay slightly (900ms) after entering dashboard for a smooth entrance
    setTimeout(() => {
        showFeaturesTourModal();
    }, 900);
}

// Backwards compatibility alias
function checkAndroidApkPrompt() {
    checkFirstLoginFeaturesModal();
}

function showFeaturesTourModal() {
    // Avoid duplicate modals
    const existing = document.getElementById('bunker-features-tour-modal');
    if (existing) existing.remove();

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isInstalled = window.pwaManager.isStandalone || window.pwaManager.isAppInstalled;

    const modal = document.createElement('div');
    modal.id = 'bunker-features-tour-modal';
    modal.className = "fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md transition-all duration-300";
    modal.style.opacity = '0';

    modal.innerHTML = `
        <div class="w-full max-w-[420px] max-h-[90dvh] rounded-[28px] sm:rounded-[32px] overflow-hidden border border-white/15 shadow-2xl glass-panel relative flex flex-col transform translate-y-8 sm:translate-y-0 sm:scale-95 transition-all duration-300" style="background: linear-gradient(165deg, rgba(20, 18, 38, 0.98) 0%, rgba(10, 9, 22, 0.99) 100%) !important;">
            <!-- Ambient glowing orbs -->
            <div class="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
            <div class="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-purple-500/20 blur-3xl pointer-events-none"></div>
            ${isAndroid ? '<div class="absolute right-4 bottom-24 w-28 h-28 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none"></div>' : ''}

            <!-- Header -->
            <div class="p-5 pb-3 relative z-10 border-b border-white/5 flex items-start justify-between">
                <div>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black uppercase tracking-widest mb-1.5">
                        <i class="fas fa-sparkles text-amber-400"></i>
                        Explore Bunker
                    </span>
                    <h3 class="text-lg font-black text-white tracking-tight flex items-center gap-2">
                        <span>All Features in One Place</span>
                    </h3>
                    <p class="text-[11px] text-gray-400 mt-0.5">Quick overview of your powerful Bunker toolkit</p>
                </div>
                <button onclick="closeFeaturesTourModal(true)" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>

            <!-- Scrollable Features Content -->
            <div class="p-5 pt-3 overflow-y-auto no-scrollbar space-y-2.5 relative z-10">
                <!-- Feature 1: Auto Feedback Entry -->
                <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-colors flex items-start gap-3 group">
                    <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <i class="fas fa-bolt text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <h4 class="text-xs font-bold text-white">Auto Feedback Entry</h4>
                            <span class="text-[8px] font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30 uppercase tracking-wider">Top Pick</span>
                        </div>
                        <p class="text-[11px] text-gray-400 leading-snug">1-Click 5-Star automated survey filling for Mid & End-Semester faculty forms. Zero manual effort.</p>
                    </div>
                </div>

                <!-- Feature 2: Academic Calendar Hub -->
                <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-colors flex items-start gap-3 group">
                    <div class="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <i class="fas fa-calendar-alt text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <h4 class="text-xs font-bold text-white">Academic Calendar</h4>
                            <span class="text-[8px] font-black text-indigo-300 bg-indigo-500/15 px-1.5 py-0.2 rounded border border-indigo-500/30 uppercase tracking-wider">Live</span>
                        </div>
                        <p class="text-[11px] text-gray-400 leading-snug">Continuous assessment (CA) exam timetables, official holidays & remaining working days counter.</p>
                    </div>
                </div>

                <!-- Feature 3: Smart Bunk Tracker -->
                <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-colors flex items-start gap-3 group">
                    <div class="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <i class="fas fa-bullseye text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <h4 class="text-xs font-bold text-white">Smart Bunk Tracker</h4>
                            <span class="text-[8px] font-black text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30 uppercase tracking-wider">Safe</span>
                        </div>
                        <p class="text-[11px] text-gray-400 leading-snug">Instant safe bunk calculator, live attendance percentages, and custom 75% or 85% goal simulator.</p>
                    </div>
                </div>

                <!-- Feature 4: Academics & Internals -->
                <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-colors flex items-start gap-3 group">
                    <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <i class="fas fa-graduation-cap text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <h4 class="text-xs font-bold text-white">Academics & Internals</h4>
                            <span class="text-[8px] font-black text-purple-300 bg-purple-500/15 px-1.5 py-0.2 rounded border border-purple-500/30 uppercase tracking-wider">Marks</span>
                        </div>
                        <p class="text-[11px] text-gray-400 leading-snug">Detailed CA internal marks breakdowns, SGPA/CGPA estimator & complete subject performance.</p>
                    </div>
                </div>

                <!-- Feature 5: Compare Attendance -->
                <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-colors flex items-start gap-3 group">
                    <div class="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <i class="fas fa-history text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <h4 class="text-xs font-bold text-white">Attendance Comparison</h4>
                            <span class="text-[8px] font-black text-cyan-300 bg-cyan-500/15 px-1.5 py-0.2 rounded border border-cyan-500/30 uppercase tracking-wider">History</span>
                        </div>
                        <p class="text-[11px] text-gray-400 leading-snug">Track previous vs current attendance to immediately see which recent classes were updated.</p>
                    </div>
                </div>

                <!-- Install Bunker App Card (Visible if not in standalone) -->
                ${!isInstalled ? `
                <div class="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-pink-500/10 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(99,102,241,0.15)] mt-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg shrink-0">
                            <i class="fas fa-mobile-screen-button"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="text-xs font-black text-white flex items-center gap-1.5">
                                <span>Install Bunker App</span>
                                <span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-indigo-500/25 text-indigo-300 uppercase tracking-widest border border-indigo-500/30">PWA</span>
                            </div>
                            <p class="text-[10.5px] text-gray-300/80 leading-tight mt-0.5 truncate">Add to Home Screen for 0ms offline speed</p>
                        </div>
                    </div>
                    <button onclick="handleTourApkDownload()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_2px_12px_rgba(99,102,241,0.35)] shrink-0 active:scale-95 transition-all">
                        <i class="fas fa-arrow-down-to-bracket text-xs"></i>
                        <span>Install</span>
                    </button>
                </div>
                ` : ''}
            </div>

            <!-- Footer Action Button -->
            <div class="p-4 pt-3 border-t border-white/5 bg-black/30 relative z-10">
                <button onclick="closeFeaturesTourModal(true)" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:via-purple-500 hover:to-pink-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.35)] active:scale-95 transition-all">
                    <span>Get Started &bull; Explore Bunker</span>
                    <i class="fas fa-arrow-right text-xs"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        const card = modal.querySelector('.glass-panel');
        if (card) {
            card.classList.remove('translate-y-8', 'sm:scale-95');
            card.classList.add('translate-y-0', 'sm:scale-100');
        }
    });
}

function closeFeaturesTourModal(markSeen = true) {
    if (markSeen) {
        localStorage.setItem('bunker_features_tour_seen_v2', 'true');
    }
    const modal = document.getElementById('bunker-features-tour-modal');
    if (!modal) return;
    modal.style.opacity = '0';
    const card = modal.querySelector('.glass-panel');
    if (card) {
        card.classList.remove('translate-y-0', 'sm:scale-100');
        card.classList.add('translate-y-6', 'sm:scale-95');
    }
    setTimeout(() => modal.remove(), 250);
}

function handleTourApkDownload() {
    closeFeaturesTourModal(true);
    triggerInstall();
}

// Backwards compatibility alias
function showAndroidApkModal() {
    showFeaturesTourModal();
}
function closeAndroidApkModal() {
    closeFeaturesTourModal(true);
}
function handleDownloadAndCloseModal() {
    handleTourApkDownload();
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
                        <h4 class="text-xs font-bold text-white mb-2 uppercase tracking-wider">Relative vs Absolute Grading</h4>
                        <p class="text-[10px] text-gray-400 leading-relaxed mb-2">PSG College of Technology follows a mixed grading scheme. For regular semester courses, grading may be Relative or Absolute depending on the department. However, for <strong>all REDO category courses</strong>, Absolute Grading is strictly followed.</p>
                    </div>
                    
                    <div class="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-3">
                        <h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Degree Classification Rules</h4>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">First Class with Distinction</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 8.50 | First appearance (no backlogs) | Within 5 years (4 for lateral entry)</span>
                            </div>
                            <span class="text-[9px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">Distinction</span>
                        </div>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">First Class</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 6.50 | Completed within 5 years (4 for lateral entry)</span>
                            </div>
                            <span class="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 whitespace-nowrap">First Class</span>
                        </div>
                        
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="text-xs font-bold text-white block">Second Class</span>
                                <span class="text-[9px] text-gray-500">All other students who successfully clear all coursework and qualify for the degree</span>
                            </div>
                            <span class="text-[9px] font-black bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded border border-gray-500/20 whitespace-nowrap">Second Class</span>
                        </div>
                    </div>
                </div>

                <!-- Section: Honours & Minors -->
                <div id="reg-sec-honours" class="reg-content-sec space-y-4 hidden">
                    <div class="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <h4 class="text-xs font-bold text-white mb-2 uppercase tracking-wider">Honours &amp; Minors (Extra 18 Credits)</h4>
                        <p class="text-[10px] text-gray-400 leading-relaxed mb-3">Students can opt to earn a B.E./B.Tech. Honours (same or different specialization) or a Minor in another discipline by earning an additional 18 credits from 5th semester onwards.</p>
                        
                        <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex gap-2.5 items-start">
                            <i class="fas fa-info-circle text-indigo-400 text-xs mt-0.5"></i>
                            <div>
                                <span class="text-[10px] font-bold text-indigo-300 block">Registration Eligibility</span>
                                <p class="text-[9px] text-gray-400 mt-0.5 leading-normal">Must have a cumulative CGPA &ge; 8.00 at the end of the 3rd semester and must have cleared all courses in the first attempt.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-3">
                        <h4 class="text-xs font-bold text-purple-400 uppercase tracking-wider">Degree Awards for Honours &amp; Minors</h4>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">Honours/Minor with Distinction</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 8.50 in the first attempt</span>
                            </div>
                            <span class="text-[9px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">Distinction</span>
                        </div>
                        
                        <div class="flex justify-between items-start border-b border-white/5 pb-2">
                            <div>
                                <span class="text-xs font-bold text-white block">Honours only (First Class)</span>
                                <span class="text-[9px] text-gray-500">CGPA &ge; 7.50 in the first attempt</span>
                            </div>
                            <span class="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">First Class</span>
                        </div>

                        <div class="flex justify-between items-start">
                            <div>
                                <span class="text-xs font-bold text-white block">Minor only (First Class / Second Class)</span>
                                <span class="text-[9px] text-gray-500">First Class if CGPA &ge; 6.50, else Second Class</span>
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
    if (state.simulatedDate) return new Date(state.simulatedDate);
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
                                <div class="text-xs font-bold text-white tracking-wide truncate max-w-[160px]">${ACADEMIC_DATA.name}</div>
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
    document.getElementById('current-date').innerText = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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

function getSubjectStats(code) {
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

    // Only include manual stats if toggle is ON
    let p = 0;
    let b = 0;

    if (state.includeManual) {
        const m = state.manual.filter(x => x.code === code);
        p = m.filter(x => x.status === 'Present').length;
        b = m.filter(x => x.status === 'Absent').length;
    }

    const a = baseAtt + p, t = baseTot + p + b;
    return { ...s, att: a, tot: t, pct: t === 0 ? 0 : (a / t) * 100 };
}
function renderSubjects() {
    const c = document.getElementById('subject-list-container'); c.innerHTML = '';

    // Display last update date from backend (not today's date)
    const lastUpdate = localStorage.getItem('bunker_last_update') || 'No data';
    if (document.getElementById('last-updated-date')) document.getElementById('last-updated-date').innerText = lastUpdate;

    if (state.subjects.length === 0) {
        // Check if we have cached data for this user
        const savedCreds = (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}'); } catch { return {}; } })();
        const roll = state.rollNumber || localStorage.getItem('bunker_roll') || savedCreds.roll;
        let hasCache = false;
        if (roll) {
            const check = (key) => {
                const val = localStorage.getItem(key);
                if (!val) return false;
                try {
                    const arr = JSON.parse(val);
                    return Array.isArray(arr) && arr.length > 0;
                } catch { return false; }
            };
            hasCache = check(`bunker_previous_attendance_${roll}`)
                || check(`bunker_subjects_${roll}`)
                || check('bunker_subjects')
                || (Array.isArray(state.previousSubjects) && state.previousSubjects.length > 0);
        }

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

    // --- Regulation Alerts (PSG Tech only — Redo/Honours are PSG-specific rules) ---
    const alertsContainer = document.getElementById('dashboard-alerts-container');
    if (alertsContainer) {
        let redoCount = 0;
            state.subjects.forEach(raw => {
                const sub = getSubjectStats(raw.code);
                if (sub && sub.pct < 75) redoCount++;
            });

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
                if (!isNaN(currentCGPA) && currentCGPA >= 8.00 && !hasBacklogs) eligibleHonours = true;
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

            if (redoCount > 0) {
                if (redoCount > 2) {
                    alertsHTML += `
                    <div class="glass-panel rounded-[24px] p-4 border-l-4 border-rose-500 bg-rose-500/10 flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                            <i class="fas fa-exclamation-triangle text-xs"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-black text-white uppercase tracking-wider">Next Semester Registration at Risk!</h4>
                            <p class="text-[10px] text-rose-300/80 mt-1 leading-normal font-medium">
                                You have <b>${redoCount}</b> courses under 75% attendance. Students with more than 2 Redo courses are barred from registering for the next semester.
                            </p>
                        </div>
                    </div>`;
                } else {
                    alertsHTML += `
                    <div class="glass-panel rounded-[24px] p-4 border-l-4 border-amber-500 bg-amber-500/10 flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                            <i class="fas fa-exclamation-circle text-xs"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-black text-white uppercase tracking-wider">Redo Course Warning</h4>
                            <p class="text-[10px] text-amber-300/80 mt-1 leading-normal font-medium">
                                You have <b>${redoCount}</b> course(s) under 75% attendance. Keep Redo courses below 3 to prevent registration blockage.
                            </p>
                        </div>
                    </div>`;
                }
            }

            if (eligibleHonours) {
                alertsHTML += `
                <div class="glass-panel rounded-[24px] p-4 border-l-4 border-emerald-500 bg-emerald-500/10 flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <i class="fas fa-medal text-xs"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-black text-white uppercase tracking-wider">Honours & Minor Eligible</h4>
                        <p class="text-[10px] text-emerald-300/80 mt-1 leading-normal font-medium">
                            Your CGPA is <b>${state.academics.cgpa.cgpa}</b> with no backlogs. You are eligible to register for Honours or Minor degrees (+18 credits).
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

    const fragment = document.createDocumentFragment();
    state.subjects.forEach((raw, i) => {
        const sub = getSubjectStats(raw.code);
        if (!sub) return; // Skip subjects that can't be resolved
        const pct = sub.pct.toFixed(1);
        const pctVal = parseFloat(pct);

        // Color Logic: 100, ≥95, ≥85, ≥80, ≥75 safe, 65-74 medical exemption zone, <65 redo
        let col, bar, bor;
        if (pctVal === 100) { col = 'text-[#22C55E]'; bar = 'bg-[#22C55E]'; bor = 'border-[#22C55E]'; }
        else if (pctVal >= 95) { col = 'text-[#6366F1]'; bar = 'bg-[#6366F1]'; bor = 'border-[#6366F1]'; }
        else if (pctVal >= 85) { col = 'text-[#3B82F6]'; bar = 'bg-[#3B82F6]'; bor = 'border-[#3B82F6]'; }
        else if (pctVal >= 80) { col = 'text-[#FACC15]'; bar = 'bg-[#FACC15]'; bor = 'border-[#FACC15]'; }
        else if (pctVal >= 75) { col = 'text-[#F97316]'; bar = 'bg-[#F97316]'; bor = 'border-[#F97316]'; }
        else if (pctVal >= 65) { col = 'text-[#F59E0B]'; bar = 'bg-[#F59E0B]'; bor = 'border-[#F59E0B]'; } // Medical exemption zone
        else { col = 'text-[#EF4444]'; bar = 'bg-[#EF4444]'; bor = 'border-[#EF4444]'; }

        let stat, safe = Math.floor((4 * sub.att - 3 * sub.tot) / 3), need = Math.ceil(3 * sub.tot - 4 * sub.att);
        if (sub.pct >= 75) {
            stat = safe > 0
                ? `<div class="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"><i class="fas fa-shield-alt text-[10px]"></i><span class="text-[9px] font-black uppercase tracking-wider">Safe to bunk ${safe}</span></div>`
                : `<div class="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20"><i class="fas fa-exclamation-triangle text-[10px]"></i><span class="text-[9px] font-black uppercase tracking-wider">Danger Zone</span></div>`;
        } else if (sub.pct >= 65) {
            // 65–74%: Medical/Sports exemption zone per Clause 5(i)
            stat = `<div class="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20"><i class="fas fa-notes-medical text-[10px]"></i><span class="text-[9px] font-black uppercase tracking-wider">Medical Exemption Zone</span></div>`;
        } else {
            stat = need > 0
                ? `<div class="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20"><i class="fas fa-arrow-trend-up text-[10px]"></i><span class="text-[9px] font-black uppercase tracking-wider">Need ${need} classes</span></div>`
                : `<div class="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20"><i class="fas fa-exclamation-circle text-[10px]"></i><span class="text-[9px] font-black uppercase tracking-wider">Redo Category</span></div>`;
        }

        const d = document.createElement('div');
        d.className = `glass-panel rounded-[30px] overflow-hidden transition-all duration-300 mb-4 cursor-pointer active:scale-[0.98] border-l-4 ${bor}`;
        d.onclick = (e) => { if (!e.target.closest('button')) openSim(sub.code) };
        
        d.innerHTML = `
            <div class="p-5 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none text-8xl text-white">
                    <i class="fas fa-book-open"></i>
                </div>
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3 z-10 flex-1 pr-2 min-w-0">
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-white text-base leading-snug mb-1 drop-shadow-md tracking-wide truncate w-full block">${sub.name}</h4>
                            <div class="flex items-center gap-2 opacity-80 mt-1">
                                <span class="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Attended: <span class="text-gray-200">${sub.att}/${sub.tot}</span></span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end z-10 shrink-0 pl-2">
                        <span class="text-3xl font-black ${col} drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] tracking-tighter">${pct}%</span>
                    </div>
                </div>
                <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden mb-5 border border-white/5 shadow-inner">
                    <div class="h-full ${bar} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] opacity-90" style="width:${pct}%"></div>
                </div>
                <div class="flex justify-between items-center z-10 relative gap-2">
                    ${stat}
                    <button onclick="openSim('${sub.code}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400/40 hover:text-white transition-all active:scale-95 shadow-[0_2px_12px_rgba(99,102,241,0.15)] group shrink-0">
                        <i class="fas fa-wand-magic-sparkles text-[10px] text-indigo-400 group-hover:rotate-12 transition-transform duration-300"></i>
                        <span class="text-[9px] font-black uppercase tracking-wider">Tap to simulate</span>
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
                    <div class="flex justify-between items-start">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-black/40 text-white shadow-sm border border-white/20 scale-105"><i class="fas fa-stopwatch"></i></div>
                        <span class="widget-badge badge-exam">Exams</span>
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
                            <span class="widget-badge ${badgeClass}">${badgeText}</span>
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
                            <span class="widget-badge badge-noexams">Relax</span>
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
                            <span class="widget-badge ${badgeClass}">Holiday</span>
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
            full: cur.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })
        };
    }
    return week;
}

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
    const picker = document.getElementById("tracker-date-picker");
    if (picker) picker.value = state.selectedDateISO;
    const lbl = document.getElementById("tracker-selected-date-label");
    if (lbl) lbl.innerText = today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    initPlanner();
    showToast(`Jumped to Today (${state.activePlannerDay}, ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`);
}

function onTrackerDateChange(val) {
    if (!val) return;
    state.selectedDateISO = val;
    const dObj = new Date(val + "T00:00:00");
    const dayIdx = dObj.getDay();
    if (dayIdx >= 1 && dayIdx <= 5) {
        state.activePlannerDay = DAYS[dayIdx - 1];
    }
    const lbl = document.getElementById("tracker-selected-date-label");
    if (lbl) {
        lbl.innerText = dObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    }
    initPlanner();
}

function initPlanner() {
    if (!state.selectedDateISO) {
        const t0 = getToday();
        const y = t0.getFullYear(), m = String(t0.getMonth() + 1).padStart(2, "0"), d = String(t0.getDate()).padStart(2, "0");
        state.selectedDateISO = `${y}-${m}-${d}`;
    }

    const week = getWeekDates(state.selectedDateISO);
    const activeInfo = week[state.activePlannerDay] || week["Mon"];
    const lbl = document.getElementById("tracker-selected-date-label");
    if (lbl && !lbl.dataset.initialized) {
        lbl.dataset.initialized = "true";
        lbl.innerText = activeInfo ? activeInfo.full : new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    }
    const picker = document.getElementById("tracker-date-picker");
    if (picker && !picker.value) {
        picker.value = state.selectedDateISO;
    }

    const t = document.getElementById("planner-days");
    const c = document.getElementById("planner-classes");
    const hasTimetable = state.timetable && Object.keys(state.timetable).length > 0 &&
        Object.values(state.timetable).some(d => d && d.length > 0 && d.some(x => x !== "Free"));

    if (t) {
        if (!hasTimetable) {
            t.innerHTML = "<div class=\"col-span-5 text-center text-gray-500 text-[10px] py-2\">Timetable not synced</div>";
        } else {
            t.innerHTML = DAYS.map(d => {
                const info = week[d] || { dayNum: "--", date: "" };
                const active = d === state.activePlannerDay;
                const hasLogs = state.manual.some(m => (m.dateISO === info.date) || (m.timestamp && m.timestamp.startsWith(info.date)));
                return `
                <button onclick="selectPlannerDay('${d}')" class="py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all ${active ? "mode-pill-active scale-[1.02]" : "bg-white/5 text-gray-400 border border-white/5"}">
                    <span class="text-[8.5px] font-black uppercase tracking-wider opacity-80">${d}</span>
                    <span class="text-sm font-black ${active ? "text-white" : "text-gray-200"}">${info.dayNum}</span>
                    <span class="w-1.5 h-1.5 rounded-full ${hasLogs ? "bg-emerald-400" : "bg-transparent"}"></span>
                </button>`;
            }).join("");
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
            c.innerHTML = "<div class=\"text-center py-10 text-gray-600 text-[10px] font-black uppercase tracking-widest\">No classes scheduled</div>";
            updateSmartTrackerImpact();
            return;
        }

        const selDateStr = new Date(state.selectedDateISO + "T00:00:00").toLocaleDateString();

        cl.forEach((code, i) => {
            if (code === "Free") return;
            const s = state.subjects.find(s => s.code === code) || { name: state.courseMapping[code] || code };
            const subStats = getSubjectStats(code) || { att: s.attended || 0, tot: s.total || 0, pct: s.percentage || 0 };
            const periodNum = i + 1;

            const logged = state.manual.find(m => 
                (m.code === code && m.dateISO === state.selectedDateISO && (m.period === periodNum || !m.period)) ||
                (m.code === code && (new Date(m.timestamp || m.time).toLocaleDateString() === selDateStr) && m.period === periodNum)
            );
            const isDone = !!logged;
            const statusBadge = isDone
                ? `<span class="text-[8px] font-black px-2 py-0.5 rounded-md ${logged.status === "Present" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}">${logged.status === "Present" ? "✓ Attended" : "✕ Bunked"}</span>`
                : "";

            c.innerHTML += `
                <div class="glass-panel p-4 rounded-[26px] border border-white/5 transition-all duration-300 flex items-center justify-between group ${isDone ? "opacity-90" : ""}">
                    <div class="min-w-0 pr-3 flex-1">
                        <div class="flex items-center gap-1.5 mb-1">
                            <span class="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[8px] font-black uppercase tracking-wider">Period ${periodNum}</span>
                            <span class="text-[9px] font-bold text-gray-400">${subStats.pct.toFixed(1)}% (${subStats.att}/${subStats.tot})</span>
                            ${statusBadge}
                        </div>
                        <p class="text-sm font-bold text-white truncate">${s.name}</p>
                        <p class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">${code}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <button onclick="markTimetableAttendance('${code}', 'Present', ${periodNum})" 
                            class="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/25 active:scale-90 transition" title="Mark Attended">
                            <i class="fas fa-check text-xs"></i>
                        </button>
                        <button onclick="markTimetableAttendance('${code}', 'Absent', ${periodNum})" 
                            class="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center hover:bg-rose-500/25 active:scale-90 transition" title="Mark Bunked">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        updateSmartTrackerImpact();
    }

    // Render manual history card in planner
    const histEl = document.getElementById("manual-history");
    const badgeEl = document.getElementById("manual-count-badge");
    if (badgeEl) badgeEl.innerText = `${state.manual.length} Logs`;
    if (histEl) {
        histEl.innerHTML = state.manual.length === 0
            ? "<div class=\"text-center text-xs text-gray-500 py-3\">No tracked entries yet</div>"
            : state.manual.slice(0, 5).map(m => `
                <div class="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div class="flex items-center gap-3 min-w-0 pr-2">
                        <div class="w-2 h-8 rounded-full ${m.status === "Present" ? "bg-emerald-500" : "bg-rose-500"} shrink-0"></div>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-white truncate">${m.name}</p>
                            <p class="text-[9px] text-gray-400 font-bold uppercase truncate">${m.time} • ${m.status === "Present" ? "Attended" : "Bunked"}</p>
                        </div>
                    </div>
                    <button onclick="deleteManual(${m.id})" class="w-8 h-8 rounded-xl bg-white/5 text-gray-400 hover:text-rose-400 flex items-center justify-center active:scale-90 transition shrink-0">
                        <i class="fas fa-trash text-[10px]"></i>
                    </button>
                </div>
            `).join("");
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

function toggleSelectAllCards() {
    const cl = state.timetable[state.activePlannerDay] || [];
    const validCodes = [];
    cl.forEach((code, idx) => {
        if (code !== "Free") validCodes.push({ code, period: idx + 1 });
    });

    if (validCodes.length === 0) return;

    validCodes.forEach(({ code, period }) => {
        markTimetableAttendance(code, "Present", period, true);
    });

    state.selectedCards = {};
    saveState();
    renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();
    hapticFeedback("success");
    showToast(`✅ Marked all ${validCodes.length} classes Attended for ${state.activePlannerDay}!`, "success");
}

function toggleCardSelection(id, code) {
    markTimetableAttendance(code, "Present");
}

function markTimetableAttendance(code, status, period = 1, silent = false) {
    const s = state.subjects.find(x => x.code === code);
    const name = s ? s.name : (state.courseMapping[code] || code);

    const stamp = state.simulatedDate ? new Date(state.simulatedDate) : new Date();
    if (state.simulatedDate) {
        const now = new Date();
        stamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const curISO = state.selectedDateISO || stamp.toISOString().split("T")[0];
    const dObj = new Date(curISO + "T00:00:00");
    const dShort = dObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    state.manual.unshift({
        id: Date.now() + Math.random(),
        code: code,
        name: name,
        status: status,
        dateISO: curISO,
        period: period,
        time: `${dShort}, Period ${period}`,
        timestamp: stamp.toISOString()
    });

    if (state.selectedCards) {
        Object.keys(state.selectedCards).forEach(id => {
            if (state.selectedCards[id] === code) delete state.selectedCards[id];
        });
    }

    if (!silent) {
        saveState();
        renderSemesterHero(); renderWidgets(); renderSubjects(); initPlanner(); initManual();
        hapticFeedback(status === "Present" ? "tap" : "warning");
        showToast(`✅ Marked ${status === "Present" ? "Attended" : "Bunked"}: ${code} (P${period})`, "success");
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

    const todayStr = getToday().toLocaleDateString();
    const todayManual = state.manual.filter(m => new Date(m.timestamp || m.time).toLocaleDateString() === todayStr);
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

        // Add manual entries EXCEPT today's to get base if includeManual is true
        let p_past = 0, b_past = 0;
        if (state.includeManual) {
            const pastManual = state.manual.filter(x => x.code === code && new Date(x.timestamp || x.time).toLocaleDateString() !== todayStr);
            p_past = pastManual.filter(x => x.status === 'Present').length;
            b_past = pastManual.filter(x => x.status === 'Absent').length;
        }

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
    const h = document.getElementById('manual-history');

    // Render subject comparison panel
    renderManualComparison();

    if (h) {
        h.innerHTML = state.manual.length ? '' : '<div class="text-center text-xs text-gray-700 italic py-4">No manual entries yet</div>';
        state.manual.slice(0, 3).forEach(m => {
            h.innerHTML += `<div class="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 mb-2">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-8 rounded-full ${m.status === 'Present' ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                    <div>
                        <p class="text-xs font-bold text-white">${m.name}</p>
                        <p class="text-[9px] text-gray-500 font-bold uppercase">${m.time.split(',')[0]}</p>
                    </div>
                </div>
                <button onclick="deleteManual(${m.id})" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-white/10 hover:text-white transition"><i class="fas fa-trash"></i></button>
            </div>`;
        });
    }
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

function cleanupManualEntries() {
    // Logic: Remove local manual entries if their date is <= official last update
    const lastUpdateStr = localStorage.getItem('bunker_last_update');
    if (!lastUpdateStr || lastUpdateStr === 'No data') return;

    // Try parsing various formats
    let lastUpdateDate = new Date(lastUpdateStr);
    if (isNaN(lastUpdateDate.getTime())) {
        // If standard parse fails, try "DD-MM-YYYY" or "DD/MM/YYYY" common in India
        const parts = lastUpdateStr.split(/[-/]/);
        if (parts.length === 3) {
            // Assume DD-MM-YYYY
            lastUpdateDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
    }

    if (isNaN(lastUpdateDate.getTime())) return; // Failed to parse

    // Set to start of the day so that manual entries tracked TODAY are successfully kept
    // and aren't aggressively deleted immediately upon page reload.
    lastUpdateDate.setHours(0, 0, 0, 0);

    const initialCount = state.manual.length;

    // Filter: Keep entries NEWER than last update
    state.manual = state.manual.filter(m => {
        let entryDate;
        if (m.timestamp) {
            entryDate = new Date(m.timestamp);
        } else {
            // Backwards compatibility for old entries (try parsing locale string)
            entryDate = new Date(m.time);
            if (isNaN(entryDate.getTime())) return true; // Keep safely if unknown
        }
        return entryDate > lastUpdateDate;
    });

    if (state.manual.length < initialCount) {
        // Cleanup completed silently
        saveState();
        initManual(); // Refresh UI if checking
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
        // Auto-check academic calendar on navigation with strict 24-hour cooldown (1 fetch per day max, direct on phone)
        if (roll) {
            const calKey = `bunker_cal_time_${roll}`;
            const lastCalTime = parseInt(localStorage.getItem(calKey) || '0');
            const isCalStale = (Date.now() - lastCalTime) > (24 * 60 * 60 * 1000);
            const hasCal = state.calendarCache && state.calendarCache.fullCalendar && state.calendarCache.fullCalendar.length > 0;
            if (isCalStale || !hasCal) {
                fetchCalendarPhoneDirect(roll, state.subjects).then(data => {
                    if (data) {
                        initAcademicCalendar();
                        renderSemesterHero();
                    }
                });
            }
        }
    }
    else if (id === 'planner') {
        t = "Smart Tracker";
        // Auto-check timetable on navigation with strict 24-hour cooldown (1 fetch per day max)
        if (roll) {
            const ttKey = `bunker_tt_time_${roll}`;
            const lastTtTime = parseInt(localStorage.getItem(ttKey) || '0');
            const isTtStale = (Date.now() - lastTtTime) > (24 * 60 * 60 * 1000);
            const hasTt = state.timetable && Object.keys(state.timetable).length > 0 &&
                          Object.values(state.timetable).some(d => d && d.length > 0 && d.some(x => x !== 'Free'));
            if (isTtStale || !hasTt) {
                checkAndUpdateTimetableSilently(roll);
            }
        }
    }
    else if (id === 'others') {
        t = "Others";
        closeOthersSubView();
        renderOthersOverview();

        // Auto-check academic marks on navigation with strict 24-hour cooldown (1 fetch per day max)
        if (roll) {
            const acadKey = `bunker_acad_fetch_time_${roll}`;
            const lastAcadTime = parseInt(localStorage.getItem(acadKey) || '0');
            const isAcadStale = (Date.now() - lastAcadTime) > (24 * 60 * 60 * 1000);

            if (!state.academics || !state.academics.loaded || isAcadStale) {
                setTimeout(() => loadAcademics(isAcadStale, state.academics && state.academics.loaded), 150);
            } else if (state.academics && state.academics.loaded) {
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

    hub.classList.add('hidden');
    if (subview === 'internals') {
        if (resultsView) resultsView.classList.add('hidden');
        if (internalsView) internalsView.classList.remove('hidden');
        document.getElementById('acad-panel-internals')?.classList.remove('hidden');
    } else if (subview === 'results') {
        if (internalsView) internalsView.classList.add('hidden');
        if (resultsView) resultsView.classList.remove('hidden');
        document.getElementById('acad-panel-results')?.classList.remove('hidden');
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
        meta: `${yearLabel} • Batch ${admYear}-${endYear} • eCampus Synced`
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
        if (profileMetaEl) profileMetaEl.textContent = studentInfo ? studentInfo.meta : 'eCampus Synced';
        if (settingsRollEl) settingsRollEl.textContent = roll;
    }

    // 2. Render Attendance Comparison card preview
    renderAttendanceComparisonCard();

    // 3. Render Academic Standing & GPA/CGPA summary
    if (!state.academics) return;
    const cgpaData = state.academics.cgpa;
    const gpaData = state.academics.gpa;
    const valEl = document.getElementById('others-cgpa-value');
    const subEl = document.getElementById('others-cgpa-sub');
    const badgeEl = document.getElementById('others-cgpa-badge');
    const chipsList = document.getElementById('others-sem-chips-list');

    if (!cgpaData && !gpaData) {
        if (valEl) valEl.textContent = '--';
        if (subEl) subEl.textContent = 'Marks not yet loaded';
        if (badgeEl) {
            badgeEl.textContent = 'Overall';
            badgeEl.className = 'text-[8px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider';
        }
        return;
    }

    const cgpa = (cgpaData && cgpaData.cgpa) || (gpaData && (gpaData.overall_cgpa || gpaData.gpa));
    const numCGPA = parseFloat(cgpa);
    const hasRA = cgpa === 'RA' || (cgpaData && cgpaData.has_ra);

    if (valEl) {
        valEl.textContent = cgpa === 'RA' ? 'RA' : (cgpa || '--');
        valEl.style.color = hasRA ? '#EF4444' : numCGPA >= 8.5 ? '#10B981' : numCGPA >= 7.0 ? '#6366f1' : numCGPA >= 5.0 ? '#F59E0B' : '#EF4444';
    }

    // Update Academic Standing Badge
    if (badgeEl) {
        if (hasRA) {
            badgeEl.textContent = 'Arrears Recorded';
            badgeEl.className = 'text-[8px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider';
        } else if (!isNaN(numCGPA) && numCGPA >= 8.5) {
            badgeEl.textContent = '★ Distinction';
            badgeEl.className = 'text-[8px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider';
        } else if (!isNaN(numCGPA) && numCGPA >= 7.0) {
            badgeEl.textContent = 'First Class';
            badgeEl.className = 'text-[8px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider';
        } else if (!isNaN(numCGPA) && numCGPA >= 6.0) {
            badgeEl.textContent = 'Second Class';
            badgeEl.className = 'text-[8px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider';
        } else if (!isNaN(numCGPA) && numCGPA > 0) {
            badgeEl.textContent = 'Pass Class';
            badgeEl.className = 'text-[8px] font-black px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 uppercase tracking-wider';
        } else {
            badgeEl.textContent = 'Overall';
            badgeEl.className = 'text-[8px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider';
        }
    }

    const resultsCgpaPill = document.getElementById("results-cgpa-pill");
    if (resultsCgpaPill) {
        resultsCgpaPill.innerText = (cgpa && cgpa !== "--") ? `${cgpa} CGPA` : "-- CGPA";
    }

    const totalCredits = (cgpaData && cgpaData.total_credits) || (gpaData && gpaData.total_credits);
    if (subEl) {
        if (totalCredits) {
            subEl.textContent = `${totalCredits} Total Credits Earned • Degree On Track`;
        } else {
            subEl.textContent = `Cumulative Academic Performance`;
        }
    }

    // Populate all semester GPA chips
    if (chipsList) {
        const semData = (cgpaData && cgpaData.semwise_data) || [];
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
                return `<button type="button" onclick="openOthersSubView('results'); setTimeout(() => selectSemesterGPA(${d.sem}), 120)" class="flex flex-col items-center px-3.5 py-1.5 rounded-xl border ${color} hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-60">Sem ${d.sem}</span>
                    <span class="text-xs font-black leading-tight">${d.sgpa}</span>
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
                return `<button type="button" onclick="openOthersSubView('results'); setTimeout(() => selectSemesterGPA(${s}), 120)" class="flex flex-col items-center px-3.5 py-1.5 rounded-xl border ${color} hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-60">Sem ${s}</span>
                    <span class="text-xs font-black leading-tight">${sGPA}</span>
                </button>`;
            }).join('');
        } else {
            chipsList.innerHTML = '<div class="text-[10px] text-gray-500 italic py-1">Semester GPAs will appear once synced</div>';
        }
    }

    // Update internal card status if available
    const internalsDesc = document.getElementById('others-internals-desc');
    if (internalsDesc && state.academics.internals && Array.isArray(state.academics.internals)) {
        const count = state.academics.internals.filter(s => s.total !== '' || (s.row_data && s.row_data.some(v => v && v !== '*' && v !== ''))).length;
        if (count > 0) {
            internalsDesc.textContent = `${count} subjects tracked • View CA components & Predictor`;
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
    { period: 2, start: "09:25", end: "10:15", startMin: 565, endMin: 615 },
    { period: 3, start: "10:35", end: "11:25", startMin: 635, endMin: 685 },
    { period: 4, start: "11:30", end: "12:20", startMin: 690, endMin: 740 },
    { period: 5, start: "13:40", end: "14:30", startMin: 820, endMin: 870 },
    { period: 6, start: "14:35", end: "15:25", startMin: 875, endMin: 925 },
    { period: 7, start: "15:35", end: "16:25", startMin: 935, endMin: 985 },
    { period: 8, start: "16:30", end: "17:20", startMin: 990, endMin: 1040 }
];

function compileWidgetPayload() {
    try {
        const roll = state.rollNumber || localStorage.getItem('bunker_roll') || '';
        const now = state.simulatedDate ? new Date(state.simulatedDate) : new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const dateISO = (state.selectedDateISO && state.simulatedDate) ? state.selectedDateISO : now.toISOString().split('T')[0];
        
        const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayShort = daysShort[now.getDay()];
        const isSunday = (now.getDay() === 0);
        
        // Check academic calendar for holiday on this date
        let isHoliday = isSunday;
        let holidayTitle = isSunday ? "Sunday" : "";
        if (state.calendarCache && state.calendarCache.fullCalendar) {
            const hMatch = state.calendarCache.fullCalendar.find(d => d.date === dateISO && d.type === 'holiday');
            if (hMatch) {
                isHoliday = true;
                holidayTitle = hMatch.title || "Holiday";
            }
        }

        const dayClasses = (state.timetable && state.timetable[dayShort]) ? state.timetable[dayShort] : [];
        const classes = [];
        let attendedCount = 0;
        let bunkedCount = 0;
        let upcomingCount = 0;
        let currentPeriodNumber = null;
        let nextPeriodClass = null;

        PSG_PERIOD_SLOTS.forEach((slot, idx) => {
            const code = dayClasses[idx];
            if (!code || code === 'Free') return;

            const s = (state.subjects || []).find(sub => sub.code === code) || {};
            const name = s.name || (state.courseMapping && state.courseMapping[code]) || code;
            const subStats = (typeof getSubjectStats === 'function') ? getSubjectStats(code) : { att: s.attended || 0, tot: s.total || 0, pct: s.percentage || 0 };
            
            const att = subStats.att || 0;
            const tot = subStats.tot || 0;
            const pct = subStats.pct !== undefined ? subStats.pct : (tot > 0 ? (att / tot) * 100 : 0);
            
            // Calculate safe bunks margin
            // If >= 75%: Math.floor((att - 0.75 * tot) / 0.75)
            // If < 75%: -Math.ceil((0.75 * tot - att) / 0.25)
            let safeBunks = 0;
            if (tot > 0) {
                if (pct >= 75.0) {
                    safeBunks = Math.floor((att - 0.75 * tot) / 0.75);
                } else {
                    safeBunks = -Math.ceil((0.75 * tot - att) / 0.25);
                }
            }

            // Check if student logged this period in Smart Tracker
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
            } else {
                upcomingCount++;
            }

            const isOngoing = (nowMinutes >= slot.startMin && nowMinutes <= slot.endMin);
            if (isOngoing) {
                currentPeriodNumber = slot.period;
                if (!logged) status = 'ongoing';
            }

            if (!nextPeriodClass && nowMinutes < slot.startMin && !logged) {
                nextPeriodClass = {
                    period: slot.period,
                    code: code,
                    name: name,
                    time: `${slot.start} - ${slot.end}`,
                    safeBunks: safeBunks
                };
            }

            classes.push({
                period: slot.period,
                time: `${slot.start} - ${slot.end}`,
                startMin: slot.startMin,
                endMin: slot.endMin,
                code: code,
                name: name,
                attended: logged ? (logged.status === 'Present') : null,
                status: status, // 'attended' | 'bunked' | 'ongoing' | 'upcoming'
                safeBunks: safeBunks,
                attendancePct: parseFloat(pct.toFixed(1)),
                totalHours: tot,
                attendedHours: att
            });
        });

        let lowestPct = 100;
        let totalSafe = 0;
        (state.subjects || []).forEach(sub => {
            const p = sub.percentage || 0;
            if (p < lowestPct) lowestPct = p;
            if (sub.bunkable && sub.bunkable > 0) totalSafe += sub.bunkable;
        });

        return {
            v: 1,
            roll: roll,
            timestamp: Date.now(),
            day: dayShort,
            date: dateISO,
            isHoliday: isHoliday,
            holidayTitle: holidayTitle,
            currentPeriod: currentPeriodNumber,
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

function pushWidgetDataToNative() {
    try {
        const payload = compileWidgetPayload();
        if (!payload) return;

        localStorage.setItem('bunker_widget_data', JSON.stringify(payload));
        localStorage.setItem('bunker_widget_last_sync', Date.now().toString());

        // Native Android Bridge handshake
        if (window.AndroidBridge && typeof window.AndroidBridge.syncWidgetData === 'function') {
            window.AndroidBridge.syncWidgetData(JSON.stringify(payload));
        }

        window.dispatchEvent(new CustomEvent('bunker:widget-data-updated', { detail: payload }));
    } catch (e) {
        console.warn('Failed pushing widget data to native bridge:', e);
    }
}

// Global hooks for Native Android WebView
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
                // Keep roll-specific cached subjects and previous attendance
                if (key.startsWith('bunker_subjects_')) return;
                if (key.startsWith('bunker_previous_attendance_')) return;
                if (key.startsWith('bunker_previous_update_')) return;
                // Keep manual tracking entries
                if (key.startsWith('bunker_manual_')) return;
                // Keep per-user preferences
                if (key.startsWith('bunker_include_manual_')) return;
                if (key.startsWith('bunker_view_manual_')) return;
                if (key.startsWith('bunker_att_mode_')) return;
                if (key.startsWith('bunker_features_tour')) return;
                // Clear all other session keys
                try { localStorage.removeItem(key); } catch (e) {}
            });
        } catch (e) {}

        try { sessionStorage.clear(); } catch (e) {}
        state.rollNumber = null;
        state.subjects = [];
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

    document.getElementById('sim-subject').innerText = simSubject.name;
    document.getElementById('val-attend').innerText = '0';
    document.getElementById('val-bunk').innerText = '0';

    updateSimUI();

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

    const newAtt = simBaseAtt + simAddAttend;
    const newTot = simBaseTot + simAddAttend + simAddBunk;
    const pct = newTot === 0 ? 0 : (newAtt / newTot) * 100;

    const ring = document.getElementById('sim-ring');
    const pctText = document.getElementById('sim-pct');
    const diffText = document.getElementById('sim-diff');
    if (!ring || !pctText || !diffText) return;

    pctText.innerText = pct.toFixed(1) + '%';
    pctText.classList.toggle('text-5xl', pct >= 100);
    pctText.classList.toggle('text-6xl', pct < 100);

    // C = 2 * PI * 90 = 565.48
    const offset = 565 - (565 * pct / 100);
    ring.setAttribute('stroke-dashoffset', offset);

    // Color based on percentage
    let color;
    const pVal = parseFloat(pct.toFixed(1));
    if (pVal === 100) color = '#22C55E';
    else if (pVal >= 95) color = '#6366F1';
    else if (pVal >= 85) color = '#3B82F6';
    else if (pVal >= 80) color = '#FACC15';
    else if (pVal >= 75) color = '#F97316';
    else color = '#EF4444';

    ring.setAttribute('stroke', color);
    ring.style.filter = `drop-shadow(0 0 8px ${color})`;
    pctText.style.color = color;

    const diff = pct - simBasePct;
    if (Math.abs(diff) < 0.1) {
        diffText.innerText = 'Current';
        diffText.className = 'text-[9px] font-black px-3 py-0.5 rounded-full bg-white/5 mt-1.5 uppercase border border-white/10 text-gray-300';
        diffText.style.color = '#9CA3AF';
    } else if (diff > 0) {
        diffText.innerText = `+${diff.toFixed(1)}%`;
        diffText.className = 'text-[9px] font-black px-3 py-0.5 rounded-full bg-emerald-500/20 mt-1.5 uppercase border border-emerald-500/30 text-emerald-300';
        diffText.style.color = '#34D399';
    } else {
        diffText.innerText = `${diff.toFixed(1)}%`;
        diffText.className = 'text-[9px] font-black px-3 py-0.5 rounded-full bg-rose-500/20 mt-1.5 uppercase border border-rose-500/30 text-rose-300';
        diffText.style.color = '#FB7185';
    }

    const fractionEl = document.getElementById('sim-fraction');
    if (fractionEl) fractionEl.innerText = `${newAtt} / ${newTot}`;

    const bannerEl = document.getElementById('sim-verdict-banner');
    if (bannerEl) {
        const safeLeft = Math.floor((4 * newAtt - 3 * newTot) / 3);
        const needMore = Math.ceil(3 * newTot - 4 * newAtt);
        if (pct >= 75) {
            bannerEl.className = "mb-4 py-2.5 px-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center text-[10px] font-black text-emerald-300 uppercase tracking-wider relative z-10";
            bannerEl.innerHTML = safeLeft > 0 ? `<i class="fas fa-shield-alt mr-1.5"></i>Safe to bunk ${safeLeft} class${safeLeft > 1 ? "es" : ""}` : `<i class="fas fa-exclamation-triangle mr-1.5"></i>On 75% Edge`;
        } else {
            bannerEl.className = "mb-4 py-2.5 px-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center text-[10px] font-black text-rose-300 uppercase tracking-wider relative z-10";
            bannerEl.innerHTML = `<i class="fas fa-arrow-trend-up mr-1.5"></i>Need ${needMore} consecutive class${needMore > 1 ? "es" : ""}`;
        }
    }
}

function resetSimModal() {
    resetPredictionSim();
}
window.resetSimModal = resetSimModal;

// BULK ATTENDANCE & HISTORY


function showFullHistory() {
    const m = document.getElementById('history-modal'), p = document.getElementById('history-panel'),
        b = document.getElementById('history-backdrop'), c = document.getElementById('full-history-content'),
        count = document.getElementById('history-count');

    if (!m || !c) return;

    // Group by date
    const groups = {};
    state.manual.forEach(entry => {
        const date = new Date(entry.timestamp || entry.time).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        if (!groups[date]) groups[date] = [];
        groups[date].push(entry);
    });

    let html = '';
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    if (sortedDates.length === 0) {
        html = '<div class="text-center py-20 opacity-50"><div class="text-4xl mb-4">📜</div><p class="text-xs font-bold uppercase tracking-widest text-gray-500">No History Yet</p></div>';
    } else {
        sortedDates.forEach(date => {
            html += `<div class="mb-8">
                <div class="flex items-center gap-3 mb-4">
                    <div class="h-px flex-1 bg-white/5"></div>
                    <p class="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] whitespace-nowrap">${date}</p>
                    <div class="h-px flex-1 bg-white/5"></div>
                </div>
                <div class="space-y-3">`;
            groups[date].forEach(m => {
                const timeStr = new Date(m.timestamp || m.time).toLocaleTimeString(undefined, {
                    hour: '2-digit', minute: '2-digit'
                });
                html += `<div class="p-4 rounded-[24px] bg-white/[0.03] border border-white/5 flex justify-between items-center group hover:bg-white/[0.06] transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-2xl ${m.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} flex items-center justify-center text-sm">
                            <i class="fas fa-${m.status === 'Present' ? 'check' : 'times'}"></i>
                        </div>
                        <div class="max-w-[180px]">
                            <p class="text-xs font-bold text-white truncate">${m.name}</p>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[9px] text-gray-500 uppercase font-black">${m.code}</span>
                                <span class="w-0.5 h-0.5 rounded-full bg-gray-700"></span>
                                <span class="text-[9px] text-gray-500 font-bold">${timeStr}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="deleteManual(${m.id}); showFullHistory();" 
                        class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:bg-rose-500/10 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>`;
            });
            html += `</div></div>`;
        });
    }

    count.innerText = `${state.manual.length} Total Entries`;
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

async function submitFeedbackCore(rollno, password, mode, btn) {
    const originalBtnHTML = btn ? btn.innerHTML : '';
    const statusBox = document.getElementById('feedback-status-box');
    const statusText = document.getElementById('feedback-status-text');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Submitting 5-Star Ratings...</span>';
    }

    if (statusBox && statusText) {
        statusBox.className = 'mt-4 p-4 rounded-2xl border text-xs leading-relaxed border-purple-500/30 bg-purple-500/10 text-purple-200';
        statusBox.classList.remove('hidden');
        statusText.innerHTML = `<div class="flex items-center gap-2"><i class="fas fa-circle-notch fa-spin text-purple-400"></i><span>Authenticating ${rollno} &amp; auto-evaluating courses...</span></div>`;
    }

    const startTime = Date.now();

    try {
        const sessionToken = localStorage.getItem('bunker_session_token') || '';
        const res = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rollno, password, mode, rating_style: 'max', session_token: sessionToken })
        });

        const data = await res.json();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (data.session_token) {
            localStorage.setItem('bunker_session_token', data.session_token);
        }

        if (res.ok && data.success) {
            try {
                sessionStorage.setItem(`bunker_fb_checked_${rollno}`, JSON.stringify({ ts: Date.now(), has_pending: false, completed: true }));
                sessionStorage.setItem(`bunker_fb_dismissed_${rollno}`, '1');
            } catch {}
            if (statusBox && statusText) {
                statusBox.className = 'mt-4 p-4 rounded-2xl border text-xs leading-relaxed border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
                statusText.innerHTML = `<div class="flex items-start gap-2.5"><i class="fas fa-check-circle text-emerald-400 text-sm mt-0.5 shrink-0"></i><div><b class="text-emerald-300">Success for ${rollno} (${elapsed}s)!</b><div class="mt-1 text-[11px] leading-normal opacity-90">${data.message || 'Feedback submitted successfully!'}</div></div></div>`;
            }
            showToast(`🎉 Feedback submitted for ${rollno}!`, 'success');
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 110,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            }
        } else {
            if (statusBox && statusText) {
                statusBox.className = 'mt-4 p-4 rounded-2xl border text-xs leading-relaxed border-rose-500/30 bg-rose-500/10 text-rose-200';
                statusText.innerHTML = `<div class="flex items-start gap-2.5"><i class="fas fa-exclamation-triangle text-rose-400 text-sm mt-0.5 shrink-0"></i><div><b class="text-rose-300">Submission Failed:</b><div class="mt-1 text-[11px] leading-normal opacity-90">${data.error || 'Server rejected submission'}</div></div></div>`;
            }
            showToast(data.error || 'Feedback submission failed', 'error');
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

    const btn = document.getElementById('feedback-confirm-btn');
    await submitFeedbackCore(roll, password, 'auto', btn);
}

async function executeOtherFeedback(e) {
    if (e) e.preventDefault();
    const rollEl = document.getElementById('feedback-other-roll');
    const pwEl = document.getElementById('feedback-other-password');
    const modeEl = document.getElementById('feedback-other-mode');
    const btn = document.getElementById('feedback-other-submit-btn');

    const rollno = rollEl ? rollEl.value.trim().toUpperCase() : '';
    const password = pwEl ? pwEl.value.trim() : '';
    const mode = modeEl ? modeEl.value : 'auto';

    if (!rollno || !password) {
        showToast('Roll number & password are required', 'error');
        return;
    }

    await submitFeedbackCore(rollno, password, mode, btn);
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
                badgeText = `+${attDelta} / +${totDelta} Classes`;
                badgeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
            }
        } else if (attDelta !== 0) {
            badgeText = attDelta > 0 ? `+${attDelta} Attended` : `${attDelta} Classes`;
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
    if (!date1 || !date2) return true;
    const key1 = extractAttendanceDayKey(date1);
    const key2 = extractAttendanceDayKey(date2);
    if (!key1 || !key2) return true;
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
            oldDate: '16 Sep 2026, 04:30 PM',
            currentDate: '18 Sep 2026, 05:45 PM',
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
    let curDate = localStorage.getItem(curDateKey) || localStorage.getItem('bunker_last_update') || 'Not recorded';
    let oldDate = localStorage.getItem(oldDateKey) || localStorage.getItem(`bunker_previous_update_${roll}`) || null;

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

    // 2. Fallback to older snapshot keys or previous attendance from server
    if (!oldSubs || oldSubs.length === 0) {
        try {
            oldSubs = JSON.parse(localStorage.getItem(oldKey) || 'null') ||
                      JSON.parse(localStorage.getItem(`bunker_previous_attendance_${roll}`) || 'null') || [];
        } catch {
            oldSubs = [];
        }
    }

    curSubs = Array.isArray(curSubs) ? curSubs : [];
    oldSubs = Array.isArray(oldSubs) ? oldSubs : [];

    const isSameDate = (!oldDate || oldSubs.length === 0 || isSameAttendanceDate(oldDate, curDate));
    const hasComparison = !isSameDate && oldSubs.length > 0 && curSubs.length > 0;

    return {
        hasComparison,
        isSameDate,
        isDemo: false,
        oldDate: isSameDate ? 'No old attendance stored' : (oldDate || 'Previous Update'),
        currentDate: curDate,
        oldSubjects: oldSubs,
        currentSubjects: curSubs,
        differences: hasComparison ? computeSubjectDifferences(oldSubs, curSubs) : []
    };
}

function renderAttendanceComparisonCard() {
    const card = document.getElementById('others-attendance-compare-card') || document.getElementById('settings-attendance-compare-card');
    const badge = document.getElementById('compare-change-badge');
    const preview = document.getElementById('compare-dates-preview');
    if (!card) return;

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (!roll) return;

    const data = getAttendanceComparisonData(roll);

    if (data.hasComparison && !data.isSameDate) {
        const changesCount = data.differences.filter(d => d.hasChanged).length;
        if (badge) {
            badge.classList.remove('hidden');
            if (changesCount > 0) {
                badge.className = 'text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                badge.textContent = `${changesCount} Updated`;
            } else {
                badge.className = 'text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/10 text-gray-300 border border-white/10';
                badge.textContent = 'Synced';
            }
        }
        if (preview) {
            preview.innerHTML = `Old: <span class="text-amber-300 font-bold">${data.oldDate}</span> &bull; Now: <span class="text-emerald-300 font-bold">${data.currentDate}</span>`;
        }
    } else {
        if (badge) {
            badge.classList.remove('hidden');
            badge.className = 'text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30';
            badge.textContent = 'Current Only';
        }
        if (preview) {
            preview.innerHTML = `<span class="text-amber-300/90 font-medium">No old attendance of yours stored</span>`;
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

    // Populate dates
    const oldDateEl = document.getElementById('compare-old-date');
    const curDateEl = document.getElementById('compare-current-date');
    if (oldDateEl) {
        if (data.isSameDate) {
            oldDateEl.innerHTML = `<span class="text-amber-300/90 font-medium text-[11px]">No old attendance stored</span>`;
        } else {
            oldDateEl.textContent = data.oldDate || 'Previous Update';
        }
    }
    if (curDateEl) curDateEl.textContent = data.currentDate || 'Latest Log';

    // Overall stats & elements
    const currentOnlyBanner = document.getElementById('compare-current-only-banner');
    const overallBanner = document.getElementById('compare-overall-banner');
    const overallText = document.getElementById('compare-overall-text');
    const overallChip = document.getElementById('compare-overall-chip');
    const listEl = document.getElementById('compare-subjects-list');
    const emptyEl = document.getElementById('compare-empty-note');

    if (data.hasComparison && !data.isSameDate && data.differences.length > 0) {
        if (currentOnlyBanner) currentOnlyBanner.classList.add('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (listEl) listEl.classList.remove('hidden');
        if (overallBanner) overallBanner.classList.remove('hidden');

        let oldTotAtt = 0, oldTotHrs = 0;
        let curTotAtt = 0, curTotHrs = 0;

        data.differences.forEach(d => {
            oldTotAtt += d.oldAttended;
            oldTotHrs += d.oldTotal;
            curTotAtt += d.curAttended;
            curTotHrs += d.curTotal;
        });

        const oldOverallPct = oldTotHrs > 0 ? ((oldTotAtt / oldTotHrs) * 100).toFixed(1) : '0.0';
        const curOverallPct = curTotHrs > 0 ? ((curTotAtt / curTotHrs) * 100).toFixed(1) : '0.0';
        const overallPctDelta = (parseFloat(curOverallPct) - parseFloat(oldOverallPct)).toFixed(1);

        if (overallText) {
            overallText.innerHTML = `<span class="text-gray-400 font-bold">${oldTotAtt}/${oldTotHrs} (${oldOverallPct}%)</span> <span class="text-gray-500 font-bold mx-1">&rarr;</span> <span class="text-white font-black">${curTotAtt}/${curTotHrs} (${curOverallPct}%)</span>`;
        }
        if (overallChip) {
            const num = parseFloat(overallPctDelta);
            if (num > 0) {
                overallChip.className = 'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                overallChip.innerHTML = `<i class="fas fa-arrow-up mr-1 text-[10px]"></i>+${overallPctDelta}%`;
            } else if (num < 0) {
                overallChip.className = 'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30';
                overallChip.innerHTML = `<i class="fas fa-arrow-down mr-1 text-[10px]"></i>${overallPctDelta}%`;
            } else {
                overallChip.className = 'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/10 text-gray-300 border border-white/10';
                overallChip.innerHTML = `No Change`;
            }
        }

        // Render subject comparison cards
        if (listEl) {
            listEl.innerHTML = data.differences.map(s => {
                const isHigher = parseFloat(s.curPct) >= 75;
                const pctColor = isHigher ? 'text-emerald-400' : 'text-rose-400';
                return `
                <div class="p-4 rounded-2xl bg-white/5 border ${s.hasChanged ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/10'} transition-all space-y-2.5">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div class="text-xs font-black text-white tracking-tight truncate">${s.name}</div>
                            <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">${s.code}</div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${s.badgeClass}">
                            ${s.badgeText}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                        <div class="bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <div class="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Before</div>
                            <div class="font-black text-gray-300 text-sm">
                                ${s.oldAttended} <span class="text-gray-500 font-bold text-xs">/ ${s.oldTotal}</span>
                            </div>
                            <div class="text-[10px] text-gray-400 font-bold mt-0.5">${s.oldPct}%</div>
                        </div>
                        <div class="bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <div class="text-[9px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Now</div>
                            <div class="font-black text-white text-sm">
                                ${s.curAttended} <span class="text-gray-400 font-bold text-xs">/ ${s.curTotal}</span>
                            </div>
                            <div class="text-[10px] font-bold mt-0.5 ${pctColor}">${s.curPct}% <span class="text-gray-500 font-normal">(${s.pctDelta >= 0 ? '+' : ''}${s.pctDelta}%)</span></div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    } else {
        // Same date or no old attendance stored: Show ONLY current attendance available
        if (currentOnlyBanner) currentOnlyBanner.classList.remove('hidden');
        if (overallBanner) overallBanner.classList.add('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');

        const curSubs = (data.currentSubjects && data.currentSubjects.length > 0) 
            ? data.currentSubjects 
            : ((state && state.subjects) || []);

        if (listEl) {
            if (curSubs.length > 0) {
                listEl.classList.remove('hidden');
                listEl.innerHTML = `
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1 mb-1">Current Attendance Only (${curSubs.length} Subjects)</div>
                ` + curSubs.map(s => {
                    const att = Number(s.attended || 0);
                    const tot = Number(s.total || 0);
                    const pct = (s.percentage !== undefined && s.percentage !== null) 
                        ? parseFloat(s.percentage).toFixed(1) 
                        : (tot > 0 ? ((att / tot) * 100).toFixed(1) : '0.0');
                    const isEligible = parseFloat(pct) >= 75.0;
                    const badgeClass = isEligible 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
                    const pctColor = isEligible ? 'text-emerald-400' : 'text-rose-400';

                    return `
                    <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <div class="text-xs font-black text-white tracking-tight truncate">${s.name || s.code || 'Subject'}</div>
                                <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">${s.code || ''}</div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${badgeClass}">
                                ${pct}%
                            </span>
                        </div>
                        <div class="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
                            <div class="text-[11px] font-bold text-gray-400">
                                Current Attended Hours
                            </div>
                            <div class="font-black text-white text-sm">
                                ${att} <span class="text-gray-400 font-bold text-xs">/ ${tot} hrs</span>
                                <span class="ml-2 font-black ${pctColor}">(${pct}%)</span>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            } else {
                listEl.classList.add('hidden');
                if (emptyEl) emptyEl.classList.remove('hidden');
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

async function loadAcademics(force = false, silent = false) {
    const roll = state.rollNumber || (() => { try { return JSON.parse(localStorage.getItem('bunker_credentials') || '{}').roll; } catch { return null; } })();
    if (!roll) {
        if (!silent) showAcadError('Please log in with valid credentials to view academic data.');
        return;
    }

    const RESULTS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (604,800,000 ms)
    const INTERNALS_TTL = 12 * 60 * 60 * 1000;   // 12 hours (43,200,000 ms)

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

    // Fallback to legacy bunker_academics_<roll> if vaults are not yet initialized
    if (!resultsVault || !internalsVault) {
        try {
            const legacyRaw = localStorage.getItem(`bunker_academics_${roll}`);
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw);
                const legTime = parseInt(localStorage.getItem(`bunker_acad_fetch_time_${roll}`) || '0') || Date.now();
                if (!resultsVault && legacy.gpa) {
                    resultsVault = { data: legacy.gpa, timestamp: legTime };
                }
                if (!internalsVault && legacy.internals) {
                    internalsVault = { internals: legacy.internals, ca_sig: '', timestamp: legTime };
                }
            }
        } catch {}
    }

    const now = Date.now();
    const hasFreshResults = resultsVault && resultsVault.data && (now - (resultsVault.timestamp || 0) < RESULTS_TTL);
    const hasFreshInternals = internalsVault && Array.isArray(internalsVault.internals) && (now - (internalsVault.timestamp || 0) < INTERNALS_TTL);

    // If cached results or internals exist, load and render immediately for 0ms visual load
    if (resultsVault && resultsVault.data) {
        const gpaData = resultsVault.data;
        state.academics.gpa = gpaData;
        state.academics.cgpa = {
            cgpa: gpaData.cgpa || gpaData.overall_cgpa,
            overall_cgpa: gpaData.overall_cgpa || gpaData.cgpa,
            cgpa_note: gpaData.cgpa_note || '',
            has_arrears: gpaData.has_arrears || false,
            total_credits: gpaData.total_credits,
            total_enrolled_credits: gpaData.total_enrolled_credits,
            semwise_data: gpaData.semwise_data,
            all_subjects: gpaData.all_subjects || gpaData.table || []
        };
    }

    if (internalsVault && Array.isArray(internalsVault.internals)) {
        state.academics.internals = internalsVault.internals;
    }

    if (state.academics.gpa || state.academics.internals) {
        state.academics.loaded = true;
        state.academics.fromCache = true;
        document.getElementById('acad-loading')?.classList.add('hidden');
        if (state.academics.internals) renderInternals(state.academics.internals);
        if (state.academics.gpa) renderGPA(state.academics.gpa);
        if (state.academics.cgpa) renderCGPA(state.academics.cgpa);
        renderOthersOverview();

        // If both vaults are fresh and not force-refreshing, exit immediately (0 network calls, 0 bandwidth)
        if (!force && hasFreshResults && hasFreshInternals) {
            return;
        }
    }

    if (state.academics.loading) return; // Prevent duplicate requests
    state.academics.loading = true;

    if (!silent && !state.academics.fromCache) {
        const panels = ['internals', 'results'];
        panels.forEach(p => document.getElementById(`acad-panel-${p}`)?.classList.add('hidden'));
        document.getElementById('acad-error')?.classList.add('hidden');
        document.getElementById('acad-loading')?.classList.remove('hidden');
    }

    const authToken = getAuthToken();
    if (!authToken) {
        state.academics.loading = false;
        if (!silent) showAcadError('Please log in with valid credentials to view academic data.');
        return;
    }

    try {
        const sessionToken = localStorage.getItem('bunker_session_token') || '';
        const fetchTasks = [];

        // Determine if we need to probe /api/internals:
        const needInternals = force || !hasFreshInternals;
        const knownCaSig = (internalsVault && internalsVault.ca_sig) ? internalsVault.ca_sig : '';

        // Determine if we need to probe /api/gpa (NEVER call /api/cgpa simultaneously):
        const needResults = force || !hasFreshResults;

        let internalsPromise = null;
        if (needInternals) {
            internalsPromise = fetch('/api/internals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auth_token: authToken,
                    session_token: sessionToken,
                    known_ca_sig: knownCaSig,
                    force: force
                })
            });
            fetchTasks.push(internalsPromise);
        }

        let gpaPromise = null;
        if (needResults) {
            gpaPromise = fetch('/api/gpa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auth_token: authToken,
                    session_token: sessionToken,
                    force: force
                })
            });
            fetchTasks.push(gpaPromise);
        }

        if (fetchTasks.length === 0) {
            state.academics.loading = false;
            return;
        }

        await Promise.all(fetchTasks);

        let internalsUpdated = false;
        let resultsUpdated = false;

        // Process internals response
        if (internalsPromise) {
            const intRes = await internalsPromise;
            const newTok = intRes.headers.get('X-Session-Token');
            if (newTok) localStorage.setItem('bunker_session_token', newTok);
            const headerSig = intRes.headers.get('X-CA-Sig') || '';

            const intData = await intRes.json();
            if (intData.error) {
                console.warn('Internals fetch error:', intData.error);
            } else if (intData.up_to_date) {
                // Backend reports marks unchanged: renew timestamp in vault
                const renewedSig = intData.ca_sig || headerSig || knownCaSig;
                if (internalsVault && internalsVault.internals) {
                    internalsVault.timestamp = Date.now();
                    internalsVault.ca_sig = renewedSig;
                    localStorage.setItem(`bunker_internals_vault_${roll}`, JSON.stringify(internalsVault));
                }
            } else if (Array.isArray(intData)) {
                const caSig = headerSig || intData.ca_sig || '';
                state.academics.internals = intData;
                internalsVault = { internals: intData, ca_sig: caSig, timestamp: Date.now() };
                localStorage.setItem(`bunker_internals_vault_${roll}`, JSON.stringify(internalsVault));
                internalsUpdated = true;
            }
        }

        // Process GPA/results response
        if (gpaPromise) {
            const gpaRes = await gpaPromise;
            const newTok = gpaRes.headers.get('X-Session-Token');
            if (newTok) localStorage.setItem('bunker_session_token', newTok);

            const gpaData = await gpaRes.json();
            if (gpaData.error) {
                console.warn('GPA fetch error:', gpaData.error);
            } else if (gpaData.overall_cgpa || gpaData.gpa || gpaData.semwise_data) {
                state.academics.gpa = gpaData;
                state.academics.cgpa = {
                    cgpa: gpaData.cgpa || gpaData.overall_cgpa,
                    overall_cgpa: gpaData.overall_cgpa || gpaData.cgpa,
                    cgpa_note: gpaData.cgpa_note || '',
                    has_arrears: gpaData.has_arrears || false,
                    total_credits: gpaData.total_credits,
                    total_enrolled_credits: gpaData.total_enrolled_credits,
                    semwise_data: gpaData.semwise_data,
                    all_subjects: gpaData.all_subjects || gpaData.table || []
                };
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

        document.getElementById('acad-loading')?.classList.add('hidden');
        if (state.academics.internals) renderInternals(state.academics.internals);
        if (state.academics.gpa) renderGPA(state.academics.gpa);
        if (state.academics.cgpa) renderCGPA(state.academics.cgpa);
        renderOthersOverview();

        if (internalsUpdated || resultsUpdated) {
            showToast('📊 Marks updated!', 'success');
        }

        const internalsView = document.getElementById('others-subview-internals');
        const resultsView = document.getElementById('others-subview-results');
        if (internalsView && !internalsView.classList.contains('hidden')) {
            openOthersSubView('internals');
        } else if (resultsView && !resultsView.classList.contains('hidden')) {
            openOthersSubView('results');
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
    const errEl = document.getElementById('acad-error');
    const msgEl = document.getElementById('acad-error-msg');
    if (errEl) errEl.classList.remove('hidden');
    if (msgEl) msgEl.textContent = msg;
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
    { ca40: 23, sem100: 44, sem60: 26.4, roundUp: 27, final: 50 },
    { ca40: 24, sem100: 42, sem60: 25.2, roundUp: 26, final: 50 }
];

function getSemPassDetails(ca40) {
    const numCA = Math.max(0, Number(ca40) || 0);
    const roundedCA = Math.round(numCA);

    // Exact lookup from PSG official table for integer 12..24
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

    // Edge case: Already passed (e.g. CA >= 50)
    if (numCA >= 50) {
        return {
            ca40: Number(numCA.toFixed(1)),
            sem100: 0,
            sem60: 0,
            roundUp: 0,
            final: Math.round(numCA),
            alreadyPassed: true
        };
    }

    // Dynamic calculation with PSG Tech 60% conversion & ceil rounding
    for (let s = 0; s <= 100; s++) {
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

// Exact PSG 40:60 (Theory) or 60:40 (Lab) Ceiled Sem Score needed for target total out of 100
function calcSemNeededForTarget(caScore, targetTotal, isLab = false) {
    const numCA = Number(caScore) || 0;
    const scale = isLab ? 0.4 : 0.6;
    for (let s = 0; s <= 100; s++) {
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
        return pass.alreadyPassed ? 0 : (pass.impossible ? null : pass.sem100);
    }
    const factor = isLab ? 0.4 : 0.6;
    for (let s = 0; s <= 100; s++) {
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

    activePassMatrixCourse = courseCode;
    renderPassMatrixAutoSubjects();

    // Course badge handling
    const courseBadge = document.getElementById('pass-matrix-course-badge');
    const activeCodeEl = document.getElementById('pass-matrix-active-code');
    const activeNameEl = document.getElementById('pass-matrix-active-name');
    if (courseCode && state && state.academics && state.academics.internals) {
        const sub = state.academics.internals.find(s => s.course_code === courseCode);
        if (sub) {
            if (activeCodeEl) activeCodeEl.innerText = sub.course_code;
            if (activeNameEl) activeNameEl.innerText = sub.course_name;
            if (courseBadge) courseBadge.classList.remove('hidden');
        } else {
            if (courseBadge) courseBadge.classList.add('hidden');
        }
    } else {
        if (courseBadge) courseBadge.classList.add('hidden');
    }

    // Determine initial CA value
    let targetCA = 18;
    if (initialCA !== null && !isNaN(parseFloat(initialCA))) {
        targetCA = Math.max(0, Math.min(40, Math.round(parseFloat(initialCA))));
    } else if (courseCode && window.simState && window.simState[courseCode]) {
        const sub = state.academics.internals.find(s => s.course_code === courseCode);
        if (sub) {
            const numCols = sub.row_data.length;
            const expectedKeys = getSchemaKeys(sub.is_lab, numCols);
            const simKeys = expectedKeys.filter(k => k !== 'best2t' && k !== 'bestmcq' && k !== 'total' && k !== 'conv' && k !== 'rt' && k !== 'rt1' && k !== 'rt2');
            const totalCA = calcCATotal(sub.is_lab, simKeys, window.simState[courseCode]);
            targetCA = Math.round(sub.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40));
        }
    }

    // Set slider & calculator
    setPassMatrixCA(targetCA);

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

function switchPassMatrixTab(tab) {
    // Stub kept for compatibility
}

function updatePassMatrixFromSlider(val) {
    const caVal = Math.round(Number(val));
    setPassMatrixCA(caVal);
}

function renderPassMatrixAutoSubjects() {
    const listEl = document.getElementById("pm-auto-subjects-list");
    if (!listEl) return;
    if (!state.academics || !state.academics.internals || state.academics.internals.length === 0) {
        listEl.innerHTML = '<div class="text-center text-xs text-gray-500 py-3">No subjects synced yet</div>';
        return;
    }
    const nonLab = state.academics.internals.filter(x => !x.is_lab);
    const targetList = nonLab.length > 0 ? nonLab : state.academics.internals;
    listEl.innerHTML = targetList.map(item => {
        let ca40 = 20;
        let hasPending = false;
        if (window.simState && window.simState[item.course_code]) {
            const numCols = item.row_data.length;
            const expectedKeys = getSchemaKeys(item.is_lab, numCols);
            const simKeys = expectedKeys.filter(k => k !== "best2t" && k !== "bestmcq" && k !== "total" && k !== "conv" && k !== "rt" && k !== "rt1" && k !== "rt2");
            const totalCA = calcCATotal(item.is_lab, simKeys, window.simState[item.course_code]);
            ca40 = item.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40);
        } else if (item.total && !isNaN(parseFloat(item.total))) {
            const rawTot = parseFloat(item.total);
            ca40 = item.is_lab ? Math.min(60, rawTot * 1.2) : Math.min(40, (rawTot / 50) * 40);
        }

        ca40 = Math.max(0, Math.min(40, Number(ca40.toFixed(1))));
        const passMark = calcSemNeededForTarget(ca40, 50, item.is_lab) ?? 100;

        return `
        <div onclick="updatePassMatrix(${ca40}, '${item.course_code}')" class="p-2.5 rounded-2xl bg-black/45 border border-white/10 hover:border-rose-500/40 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.98] transition">
            <div class="min-w-0 pr-1">
                <div class="flex items-center gap-1.5">
                    <span class="text-[9px] font-black text-indigo-400 uppercase">${item.course_code}</span>
                    <span class="text-[9px] font-black text-emerald-300 bg-emerald-500/15 border-emerald-500/30 px-1.5 py-0.2 rounded border">
                        CA: ${ca40.toFixed(1)}/40
                    </span>
                </div>
                <p class="text-[11px] font-bold text-white truncate mt-0.5">${item.course_name}</p>
            </div>
            <div class="text-right shrink-0">
                <span class="text-[8px] font-black text-gray-400 uppercase block">Min Sem</span>
                <span class="text-xs font-black ${passMark <= 50 ? "text-emerald-400" : "text-amber-400"}">${passMark} / 100</span>
            </div>
        </div>`;
    }).join("");
}
window.renderPassMatrixAutoSubjects = renderPassMatrixAutoSubjects;

function updatePassMatrix(ca, codeLabel = null) {
    const caVal = Math.max(0, Math.min(40, Number(Number(ca).toFixed(1))));
    setPassMatrixCA(caVal, codeLabel);
}
window.updatePassMatrix = updatePassMatrix;

function setPassMatrixCA(caVal, codeLabel = null) {
    const slider = document.getElementById("pass-matrix-slider");
    const pmSlider = document.getElementById("pm-ca-slider");
    const inputVal = document.getElementById("pass-matrix-input-val");
    if (slider) slider.value = caVal;
    if (pmSlider) pmSlider.value = caVal;
    if (inputVal) inputVal.innerText = caVal;

    // Update pill highlights
    document.querySelectorAll(".pm-pill").forEach(btn => {
        if (btn.innerText.trim() == String(caVal)) {
            btn.className = "pm-pill px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs font-black text-rose-300 transition active:scale-95";
        } else {
            btn.className = "pm-pill px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black text-gray-300 hover:text-white transition active:scale-95";
        }
    });

    const passInfo = getSemPassDetails(caVal);

    // Update compact quick bar elements
    const labelEl = document.getElementById("pm-selected-label");
    if (labelEl) labelEl.innerText = codeLabel ? `${codeLabel} Target Check` : "Custom CA Check";
    const caDisp = document.getElementById("pm-ca-display");
    if (caDisp) caDisp.innerText = `CA: ${caVal}/40`;
    const semNeedEl = document.getElementById("pm-sem-needed");
    if (semNeedEl) semNeedEl.innerText = `Pass: ${passInfo.sem100}/100`;
    const proofEl = document.getElementById("pm-formula-proof");
    if (proofEl) proofEl.innerText = `${passInfo.sem100} × 0.6 = ${passInfo.sem60} ➔ ${passInfo.roundUp} + ${caVal} CA = ${passInfo.final} (PASS ✅)`;

    // Update 6 Target grade cards
    const cpEl = document.getElementById("pm-grade-cplus");
    const bEl = document.getElementById("pm-grade-b");
    const bpEl = document.getElementById("pm-grade-bplus");
    const aEl = document.getElementById("pm-grade-a");
    const apEl = document.getElementById("pm-grade-aplus");
    const sEl = document.getElementById("pm-grade-s");

    const reqCp = calcSemNeededForTarget(caVal, 56);
    const reqB = calcSemNeededForTarget(caVal, 61);
    const reqBp = calcSemNeededForTarget(caVal, 66);
    const reqA = calcSemNeededForTarget(caVal, 71);
    const reqAp = calcSemNeededForTarget(caVal, 81);
    const reqS = calcSemNeededForTarget(caVal, 91);

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
    if (sCalcText) sCalcText.innerText = `${passInfo.ca40} + ${passInfo.roundUp} = ${passInfo.final} ✅`;

    if (resBadge) {
        if (passInfo.alreadyPassed) {
            resBadge.innerText = "Already Safe";
            resBadge.className = "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
        } else if (passInfo.sem100 <= 46) {
            resBadge.innerText = "Easy Pass Target";
            resBadge.className = "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
        } else if (passInfo.sem100 <= 54) {
            resBadge.innerText = "Moderate Target";
            resBadge.className = "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
        } else {
            resBadge.innerText = "High Effort Required";
            resBadge.className = "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30";
        }
    }

    // Update target grades preview cards (legacy IDs)
    const tgtPass = document.getElementById("pm-tgt-pass");
    const tgtB = document.getElementById("pm-tgt-b");
    const tgtA = document.getElementById("pm-tgt-a");
    const tgtAplus = document.getElementById("pm-tgt-aplus");

    if (tgtPass) tgtPass.innerText = `${passInfo.sem100} / 100`;
    if (tgtB) tgtB.innerText = reqB !== null ? `${reqB} / 100` : "—";
    if (tgtA) tgtA.innerText = reqA !== null ? `${reqA} / 100` : "—";
    if (tgtAplus) tgtAplus.innerText = reqAp !== null ? `${reqAp} / 100` : "—";
}

function setPresetPendingMarks(courseCode, ratio) {
    const subject = state.academics && state.academics.internals ? state.academics.internals.find(s => s.course_code === courseCode) : null;
    if (!subject) return;
    const numCols = subject.row_data.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
    
    simKeys.forEach(k => {
        const idx = expectedKeys.indexOf(k);
        const actual = subject.row_data[idx];
        const isMissing = !actual || actual === '*' || actual.trim() === '';
        if (isMissing && window.simState && window.simState[courseCode]) {
            const meta = window.METADATA[k] || window.METADATA['c1'];
            const val = Math.round(meta.max * ratio);
            window.simState[courseCode][k] = val;
            const slider = document.querySelector(`input[oninput="updateSim('${courseCode}', '${k}', this.value)"]`);
            if (slider) slider.value = val;
            const textVal = document.getElementById(`val-${courseCode}-${k}`);
            if (textVal) textVal.innerText = val;
        }
    });
    calculateSimOutputs(courseCode, subject);
    showToast(`🎯 Applied ${Math.round(ratio * 100)}% preset to pending marks`);
}

function renderPassMatrixTable(showExtended = false) {}
function highlightActiveTableRow(caVal) {}
function selectMatrixRow(caVal) { setPassMatrixCA(caVal); }
function toggleExtendedPassTable() {}

function applyPassMatrixToActiveSubject() {
    if (!activePassMatrixCourse) {
        showToast("No active subject selected to apply to.");
        return;
    }
    const slider = document.getElementById('pass-matrix-slider');
    const caVal = slider ? parseInt(slider.value, 10) : 18;
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
    showToast(`🎯 Set Final Sem Exam slider to ${targetSem} / 100 for ${courseCode}`);
}

function copyPassMatrixSummary() {
    const caVal = document.getElementById('pass-matrix-input-val')?.innerText || '18';
    const semVal = document.getElementById('pm-res-sem100')?.innerText || '52';
    const sSem60 = document.getElementById('pm-step-sem60')?.innerText || '31.2 ➔ 32';
    const text = `🎯 PSG Tech Sem Pass Target:\n• Continuous Assessment: ${caVal} / 40\n• Required in Sem Exam: ${semVal} / 100\n• 60% Scale: ${sSem60}\n• Final Combined Score: 50 / 100 (PASS ✅)\n(Checked on PSG Bunker)`;
    
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
function renderInternals(internals) {
    const list = document.getElementById('internals-list');
    const statusEl = document.getElementById('internals-status');
    if (!list) return;

    // Filter out subjects without relevant data (labs with no marks yet, etc.)
    const mainSubjects = internals.filter(s => s.total !== '' || s.row_data.some(v => v && v !== '*' && v !== ''));

    // Count updated subjects
    const withTotals = mainSubjects.filter(s => {
        const t = parseFloat(s.total);
        return !isNaN(t);
    });
    if (withTotals.length > 0) {
        if (statusEl) statusEl.textContent = `${withTotals.length} of ${mainSubjects.length} subjects updated`;
    } else {
        if (statusEl) statusEl.textContent = 'Marks not yet entered';
    }

    if (mainSubjects.length === 0) {
        list.innerHTML = `<div class="text-center py-10 opacity-50"><div class="text-4xl mb-4">📝</div><p class="text-xs font-bold uppercase tracking-widest text-gray-500">No Marks Available Yet</p></div>`;
        return;
    }

    list.innerHTML = '';

    // Initialize global METADATA for simulation
    if (typeof window.METADATA === 'undefined') {
        window.METADATA = {
            // Theory: T1/T2 stored by portal already as out of 30 (50→30 scaled)
            t1:   { label: 'Test 1', max: 30, weight: 30, color: 'text-blue-400', accent: 'bg-blue-500' },
            t2:   { label: 'Test 2', max: 30, weight: 30, color: 'text-indigo-400', accent: 'bg-indigo-500' },
            // RT = Retest (max 30)
            rt:   { label: 'Retest', max: 30, weight: 30, color: 'text-orange-400', accent: 'bg-orange-500' },
            // AP = Assignment Presentation (no tutorial): max 10
            ap:   { label: 'Assignment', max: 10, weight: 10, color: 'text-purple-400', accent: 'bg-purple-500' },
            // AT1/AT2 = Assessment Tutorial (with tutorial courses): max 5 each
            ap1:  { label: 'Tutorial 1 (AT1)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            ap2:  { label: 'Tutorial 2 (AT2)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            at1:  { label: 'Tutorial 1 (AT1)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            at2:  { label: 'Tutorial 2 (AT2)', max: 5, weight: 5, color: 'text-purple-400', accent: 'bg-purple-500' },
            rt1:  { label: 'Retest 1', max: 30, weight: 30, color: 'text-orange-400', accent: 'bg-orange-500' },
            rt2:  { label: 'Retest 2', max: 30, weight: 30, color: 'text-orange-400', accent: 'bg-orange-500' },
            a1:   { label: 'Assignment 1', max: 50, weight: 50, color: 'text-emerald-400', accent: 'bg-emerald-500' },
            a2:   { label: 'Assignment 2', max: 50, weight: 50, color: 'text-teal-400', accent: 'bg-teal-500' },
            eh:   { label: 'Activity Hours', max: 150, weight: 150, color: 'text-amber-400', accent: 'bg-amber-500' },
            // MCQ: out of 10 each, average taken
            mq1:  { label: 'MCQ 1', max: 10, weight: 5, color: 'text-pink-400', accent: 'bg-pink-500' },
            mq2:  { label: 'MCQ 2', max: 10, weight: 5, color: 'text-pink-400', accent: 'bg-pink-500' },
            // Lab components
            ir1:  { label: 'Report 1 (Cycle I)', max: 15, weight: 15, color: 'text-emerald-400', accent: 'bg-emerald-500' },
            ir2:  { label: 'Report 2 (Cycle II)', max: 15, weight: 15, color: 'text-emerald-400', accent: 'bg-emerald-500' },
            plro1: { label: 'Pre-Lab 1 (Cycle I)', max: 10, weight: 10, color: 'text-teal-400', accent: 'bg-teal-500' },
            plro2: { label: 'Pre-Lab 2 (Cycle II)', max: 10, weight: 10, color: 'text-teal-400', accent: 'bg-teal-500' },
            // Fallbacks for unknown schemas
            c1: { label: 'Comp 1', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c2: { label: 'Comp 2', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c3: { label: 'Comp 3', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c4: { label: 'Comp 4', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c5: { label: 'Comp 5', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' },
            c6: { label: 'Comp 6', max: 30, weight: 10, color: 'text-gray-400', accent: 'bg-gray-500' }
        };
        window.simState = {};
    }

    let listHTML = '';

    mainSubjects.forEach((sub, idx) => {
        const rowData = sub.row_data;
        const numCols = rowData.length;
        const expectedKeys = getSchemaKeys(sub.is_lab, numCols);

        const d = {};
        expectedKeys.forEach((k, i) => {
            const val = rowData[i];
            d[k] = (!val || val === '*' || val.trim() === '') ? null : parseFloat(val);
        });

        // Simulator keys: exclude derived/read-only cols — these are inputs only
        const simKeys = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
        const missingKeys = simKeys.filter(k => d[k] === null);

        // Use the API's pre-converted total for card display (most accurate)
        // API computes: theory → total*0.8 (/40), lab → total*1.2 (/60)
        const portalTotalConverted = parseFloat(sub.total_converted);
        const portalTotalRaw = parseFloat(sub.total); // raw from portal (/50 for theory)
        const hasPortalTotal = !isNaN(portalTotalConverted);

        // Fallback to component calc only when portal total not available
        const currentTotal = hasPortalTotal ? portalTotalRaw : calcCATotal(sub.is_lab, simKeys, d);
        const currentOutOf40 = hasPortalTotal
            ? portalTotalConverted
            : (sub.is_lab ? Math.min(60, currentTotal * 1.2) : Math.min(40, (currentTotal / 50) * 40));
        const displayMax = sub.is_lab ? 60 : 40;

        const isTheory = !sub.is_lab;
        const iconName = isTheory ? 'fa-book-open' : 'fa-flask';
        const typeColor = isTheory ? 'indigo' : 'teal';

        const passInfo = isTheory ? getSemPassDetails(currentOutOf40) : null;
        const reqB = isTheory ? getSemNeededForGrade(currentOutOf40, 60, sub.is_lab) : null;
        const reqA = isTheory ? getSemNeededForGrade(currentOutOf40, 70, sub.is_lab) : null;
        const reqAp = isTheory ? getSemNeededForGrade(currentOutOf40, 80, sub.is_lab) : null;

        // DUAL-STATE MOBILE UI: Available Prediction vs Pending Simulation
        let statusCardHTML = '';
        if (isTheory && passInfo) {
            if (missingKeys.length === 0) {
                // STATE 1: MARKS AVAILABLE & FINALIZED -> SHOW BEST PREDICTION
                statusCardHTML = `
                <div class="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/30 via-indigo-950/20 to-black/40 border border-rose-500/25 shadow-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[9px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                            <i class="fas fa-bullseye text-[10px] text-rose-400"></i>
                            <span>Sem Pass Prediction (40:60 PSG Rule)</span>
                        </span>
                        <span class="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">
                            CA In
                        </span>
                    </div>
                    <div class="flex items-baseline justify-between mb-2.5">
                        <div>
                            <span class="text-xs text-gray-300 font-medium">To Pass: Need</span>
                            <span class="text-xl font-black text-white ml-1.5 underline decoration-rose-400 underline-offset-2" id="card-pass-req-${sub.course_code}">${passInfo.sem100}</span>
                            <span class="text-[10px] text-rose-400 font-bold">/ 100 in Sem</span>
                        </div>
                        <span class="text-[9.5px] font-bold text-gray-400 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                            ${currentOutOf40.toFixed(1)} + ${passInfo.roundUp} = ${passInfo.final}% ✅
                        </span>
                    </div>
                    <div class="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5 text-center">
                        <div class="bg-black/30 py-1.5 px-1 rounded-lg border border-white/5">
                            <span class="text-[7.5px] font-bold text-gray-400 uppercase block">Aim B (60%)</span>
                            <span class="text-[11px] font-black text-teal-300 block">${reqB !== null ? reqB + '/100' : '—'}</span>
                        </div>
                        <div class="bg-black/30 py-1.5 px-1 rounded-lg border border-white/5">
                            <span class="text-[7.5px] font-bold text-gray-400 uppercase block">Aim A (70%)</span>
                            <span class="text-[11px] font-black text-indigo-300 block">${reqA !== null ? reqA + '/100' : '—'}</span>
                        </div>
                        <div class="bg-black/30 py-1.5 px-1 rounded-lg border border-white/5">
                            <span class="text-[7.5px] font-bold text-gray-400 uppercase block">Aim A+ (80%)</span>
                            <span class="text-[11px] font-black text-purple-300 block">${reqAp !== null ? reqAp + '/100' : '—'}</span>
                        </div>
                    </div>
                </div>`;
            } else {
                // STATE 2: MARKS NOT AVAILABLE -> PROMPT TO SIMULATE
                const missingLabels = missingKeys.map(k => (window.METADATA[k] || {}).label || k).join(', ');
                statusCardHTML = `
                <div class="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-black/40 border border-amber-500/30 shadow-lg">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[9px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                            <i class="fas fa-wand-magic-sparkles text-[10px] text-amber-400 animate-pulse"></i>
                            <span>${missingKeys.length} Marks Pending</span>
                        </span>
                        <span class="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                            Tap to Simulate
                        </span>
                    </div>
                    <div class="text-xs font-bold text-white mb-1.5 leading-snug">
                        ${missingLabels} pending in portal
                    </div>
                    <div class="flex items-center justify-between text-[9.5px] text-gray-400 pt-1.5 border-t border-white/5">
                        <span>Current Est. Pass Target: <b class="text-rose-400 font-black" id="card-pass-req-${sub.course_code}">~${passInfo.sem100} / 100</b></span>
                        <span class="text-amber-300 font-bold flex items-center gap-1">Open Simulator <i class="fas fa-chevron-down text-[8px]"></i></span>
                    </div>
                </div>`;
            }
        }

        listHTML += `
        <div id="card-${sub.course_code}" class="glass-panel rounded-[30px] overflow-hidden transition-all duration-300 mb-4 border border-white/10">
            <div class="p-5 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all" onclick="toggleInternalCard('${sub.course_code}')">
                <div class="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none text-8xl text-white">
                    <i class="fas ${iconName}"></i>
                </div>
                <div class="flex justify-between items-start">
                    <div class="flex-1 pr-4 z-10">
                        <div class="flex flex-wrap items-center gap-2 mb-1.5">
                            <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-${typeColor}-500/10 text-${typeColor}-400 border-${typeColor}-500/20">${sub.course_code}</span>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${isTheory ? 'Theory' : 'Laboratory'}</span>
                        </div>
                        <h3 class="font-bold text-white text-[13px] leading-snug">${sub.course_name}</h3>
                        ${statusCardHTML}
                    </div>
                    <div class="flex flex-col items-end z-10 ml-2">
                        <div class="flex items-baseline gap-1">
                            <span class="text-2xl font-black text-transparent bg-clip-text ${missingKeys.length > 0 ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 'bg-gradient-to-r from-indigo-300 to-purple-400'}">
                                ${missingKeys.length > 0 ? '~' : ''}${currentOutOf40.toFixed(1)}
                            </span>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">/ ${displayMax}</span>
                        </div>
                        <div class="mt-0.5 mb-1.5 opacity-80">
                            <span class="text-[9px] font-bold text-gray-400">${hasPortalTotal ? `Portal Raw: ${portalTotalRaw}/50` : (missingKeys.length > 0 ? 'Pending Components' : 'All Components In')}</span>
                        </div>
                        <div class="mt-0 flex items-center">
                            ${missingKeys.length > 0 
                                ? `<span class="flex items-center gap-1 text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 whitespace-nowrap"><i class="fas fa-clock text-[8px]"></i> ${missingKeys.length} Pending</span>`
                                : `<span class="flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20 whitespace-nowrap"><i class="fas fa-check-circle text-[8px]"></i> Finalized</span>`
                            }
                        </div>
                    </div>
                </div>
                <div class="mt-4 flex items-center justify-between gap-3">
                    <div class="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden" id="bar-${sub.course_code}">
                         <div class="h-full bg-${typeColor}-500 transition-all duration-700" style="width: ${Math.min(100,(currentOutOf40/displayMax)*100).toFixed(1)}%"></div>
                    </div>
                    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${missingKeys.length > 0 ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'} text-[8.5px] font-black uppercase tracking-wider shrink-0 transition">
                        <i class="fas ${missingKeys.length > 0 ? 'fa-wand-magic-sparkles text-amber-400' : 'fa-graduation-cap text-indigo-400'} text-[9px]"></i>
                        <span>${missingKeys.length > 0 ? 'Simulate Pending' : 'Simulate Sem'}</span>
                    </div>
                </div>
            </div>

            <div class="expandable-content" id="content-${sub.course_code}">
                <div class="expandable-inner cursor-default">
                    <div class="px-5 pb-5">
                        <div class="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5 mt-2"></div>
                        ${renderFullSimulator(sub, d, simKeys)}
                    </div>
                </div>
            </div>
        </div>`;
    });

    list.innerHTML = listHTML;

    // Show predictor card
    const predictorCard = document.getElementById('cgpa-predictor');
    if (predictorCard) {
        predictorCard.classList.remove('hidden');
    }

    // Render list of subjects for predictor
    const predList = document.getElementById('predictor-subjects-list');
    if (predList) {
        let predHTML = '';
        mainSubjects.forEach(sub => {
            const courseCode = sub.course_code;
            
            let creditsMap = {};
            try {
                creditsMap = JSON.parse(localStorage.getItem(`bunker_predicted_credits_${state.rollNumber}`) || '{}');
            } catch (e) {}
            let credits = creditsMap[courseCode];
            const isZero = isZeroCreditCourse(courseCode);
            if (isZero) {
                credits = 0;
                creditsMap[courseCode] = 0;
            } else if (credits === undefined) {
                credits = sub.is_lab ? 2 : 3;
                creditsMap[courseCode] = credits;
            }

            const adjusterHTML = isZero
                ? `<span class="text-[8px] font-black text-gray-500 uppercase tracking-widest bg-white/[0.02] px-2 py-1 rounded-lg border border-white/5">Non-GPA</span>`
                : `<div class="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                        <button onclick="changeSubjectCredits('${courseCode}', -1)" class="w-6 h-6 rounded-lg bg-white/5 text-white hover:bg-white/10 active:scale-90 transition flex items-center justify-center text-xs font-bold">-</button>
                        <span id="pred-credits-${courseCode}" class="w-6 text-center text-xs font-black text-white">${credits}</span>
                        <button onclick="changeSubjectCredits('${courseCode}', 1)" class="w-6 h-6 rounded-lg bg-white/5 text-white hover:bg-white/10 active:scale-90 transition flex items-center justify-center text-xs font-bold">+</button>
                    </div>`;

            predHTML += `
            <div class="flex justify-between items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div class="flex-1 pr-2">
                    <p class="text-[11px] font-bold text-white leading-snug">${sub.course_name}</p>
                    <p class="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">${courseCode}</p>
                </div>
                <div class="flex items-center gap-3">
                    <!-- Predicted Grade Badge -->
                    <span id="pred-badge-${courseCode}" class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border">--</span>
                    
                    <!-- Credits Adjuster -->
                    ${adjusterHTML}
                </div>
            </div>`;
        });
        predList.innerHTML = predHTML;
    }

    // Initial calculation run for all simulators
    mainSubjects.forEach(sub => {
        if(window.simState[sub.course_code]) calculateSimOutputs(sub.course_code, sub);
    });

    recalculateCGPAPrediction();
}

function renderFullSimulator(subject, d, expectedKeys) {
    const courseCode = subject.course_code;
    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    let savedSim = null;
    try {
        const rawSim = localStorage.getItem(`bunker_internals_sim_${roll}`);
        if (rawSim) savedSim = JSON.parse(rawSim);
    } catch {}

    const courseSaved = (savedSim && savedSim[courseCode]) ? savedSim[courseCode] : null;

    window.simState[courseCode] = { sem: (courseSaved && courseSaved.sem !== undefined) ? courseSaved.sem : 75 };
    expectedKeys.forEach(k => { 
        const actual = d[k];
        const meta = window.METADATA[k] || window.METADATA['c1'];
        if (actual !== null) {
            window.simState[courseCode][k] = actual;
        } else if (courseSaved && courseSaved[k] !== undefined) {
            window.simState[courseCode][k] = courseSaved[k];
        } else {
            window.simState[courseCode][k] = Math.round(meta.max * 0.7);
        }
    });

    let actualMarksHTML = '';
    let slidersHTML = '';

    expectedKeys.forEach(key => {
        const meta = window.METADATA[key] || window.METADATA['c1'];
        const isMissing = d[key] === null;

        if (!isMissing) {
            actualMarksHTML += `
            <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span class="text-[11px] font-bold ${meta.color}">${meta.label}</span>
                <span class="text-sm font-black text-white bg-black/40 px-2.5 py-1 rounded">
                    ${d[key]} <span class="text-[9px] text-gray-500 font-medium">/ ${meta.max}</span>
                </span>
            </div>`;
        } else {
            slidersHTML += `
            <div class="bg-white/5 p-3.5 rounded-2xl border border-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.05)]">
                <div class="flex justify-between items-center mb-3">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold ${meta.color}">${meta.label}</span>
                        <div class="mt-1"><span class="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">Pending</span></div>
                    </div>
                    <span class="text-sm font-black text-white bg-black/40 px-2.5 py-1 rounded">
                        <span id="val-${courseCode}-${key}">${window.simState[courseCode][key]}</span> 
                        <span class="text-[10px] text-gray-500 font-medium">/ ${meta.max}</span>
                    </span>
                </div>
                <input type="range" min="0" max="${meta.max}" step="1" value="${window.simState[courseCode][key]}" 
                    oninput="updateSim('${courseCode}', '${key}', this.value)"
                    class="w-full bg-black/50 rounded-lg appearance-none cursor-pointer accent-indigo-500 acad-slider" style="height: 8px;" />
            </div>`;
        }
    });

    let internalsSimSection = '';
    if (actualMarksHTML !== '') internalsSimSection += `<div class="mb-4"><p class="text-[9px] text-gray-400 mb-2 uppercase tracking-widest font-bold">Entered / Published Marks</p><div class="grid grid-cols-2 gap-2">${actualMarksHTML}</div></div>`;
    if (slidersHTML !== '') {
        internalsSimSection += `
        <div class="mb-5">
            <div class="flex items-center justify-between mb-2">
                <p class="text-[9.5px] text-amber-300 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <i class="fas fa-wand-magic-sparkles text-[10px]"></i>
                    <span>Simulate Pending Components</span>
                </p>
                <div class="flex items-center gap-1">
                    <button type="button" onclick="setPresetPendingMarks('${courseCode}', 0.70)" class="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[8px] font-black text-gray-300 border border-white/10 active:scale-95 transition">Avg (70%)</button>
                    <button type="button" onclick="setPresetPendingMarks('${courseCode}', 0.90)" class="px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-[8px] font-black text-indigo-300 border border-indigo-500/30 active:scale-95 transition">High (90%)</button>
                    <button type="button" onclick="setPresetPendingMarks('${courseCode}', 1.0)" class="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-[8px] font-black text-emerald-300 border border-emerald-500/30 active:scale-95 transition">Max</button>
                </div>
            </div>
            <div class="grid grid-cols-1 gap-2.5 mb-2">${slidersHTML}</div>
            <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[10px]">
                <span class="text-gray-300 font-medium">Simulated CA: <b class="text-white font-black" id="dyn-sim-ca-${courseCode}">--</b> / 40</span>
                <span class="text-amber-300 font-bold">Pass in Sem: <b class="text-rose-400 font-black" id="dyn-sim-sem-${courseCode}">--</b> / 100</span>
            </div>
        </div>`;
    } else {
        internalsSimSection += `<div class="mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center"><span class="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5"><i class="fas fa-check-circle"></i> All internal component marks finalized!</span></div>`;
    }

    if (isZeroCreditCourse(courseCode)) {
        return `
        <div class="bg-gradient-to-br from-black/60 to-indigo-950/30 p-5 rounded-3xl border border-indigo-500/20 mt-4 relative shadow-inner" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <div class="flex items-center gap-2">
                    <i class="fas fa-info-circle text-indigo-400 text-xs"></i>
                    <h4 class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Course Information</h4>
                </div>
            </div>
            ${internalsSimSection}
            <div class="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 text-center">
                <p class="text-xs font-black text-indigo-300 uppercase tracking-wider mb-1">Non-GPA / Non-Credit Course</p>
                <p class="text-[10px] text-gray-400 font-medium">This course is evaluated for completion and does not contribute to your CGPA/SGPA calculation.</p>
            </div>
        </div>`;
    }

    return `
    <div class="bg-gradient-to-br from-black/60 to-indigo-950/30 p-5 rounded-3xl border border-indigo-500/20 mt-4 relative shadow-inner" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
            <div class="flex items-center gap-2">
                <i class="fas fa-calculator text-indigo-400 text-xs"></i>
                <h4 class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Master Simulator</h4>
            </div>
            <button onclick="resetSim('${courseCode}')" class="text-[10px] bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-lg font-bold transition-colors active:scale-95">Reset</button>
        </div>

        ${internalsSimSection}

        ${(() => {
            const isTh = !subject.is_lab;
            const simKeysForCA = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
            const curCA = calcCATotal(subject.is_lab, simKeysForCA, window.simState[courseCode]);
            const curCa40 = subject.is_lab ? Math.min(60, curCA * 1.2) : Math.min(40, (curCA / 50) * 40);
            const pInfo = isTh ? getSemPassDetails(curCa40) : null;
            if (!isTh || !pInfo) return '';

            return `
            <div class="mb-5 bg-gradient-to-br from-black/80 via-rose-950/20 to-purple-950/30 p-4 sm:p-5 rounded-2xl border border-rose-500/30 shadow-xl relative overflow-hidden">
                <div class="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
                        <span class="text-[10px] font-black uppercase tracking-widest text-white">PSG Pass Target (40 : 60 Rule)</span>
                    </div>
                    <button type="button" onclick="openPassMatrixModal('${courseCode}', ${curCa40.toFixed(1)})" class="text-[9px] font-bold text-rose-300 hover:text-white flex items-center gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 px-2.5 py-1 rounded-lg border border-rose-500/30 transition active:scale-95">
                        <i class="fas fa-table-cells text-[9px]"></i>
                        <span>Full Matrix</span>
                    </button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div class="bg-black/50 p-2.5 rounded-xl border border-white/5 text-center">
                        <div class="text-[8px] font-black uppercase text-gray-400">Your CA (For 40)</div>
                        <div class="text-lg font-black text-indigo-300 mt-0.5" id="sim-pass-ca40-${courseCode}">${curCa40.toFixed(1)}</div>
                        <div class="text-[7.5px] text-gray-500">Internal Score</div>
                    </div>
                    <div class="bg-rose-500/15 p-2.5 rounded-xl border border-rose-500/30 text-center shadow-lg shadow-rose-500/10">
                        <div class="text-[8px] font-black uppercase text-rose-300">Need in Sem (For 100)</div>
                        <div class="text-xl font-black text-white mt-0.5" id="sim-pass-sem100-${courseCode}">${pInfo.sem100} <span class="text-[9px] text-rose-400 font-bold">/ 100</span></div>
                        <div class="text-[7.5px] text-rose-300 font-medium">Exam Target</div>
                    </div>
                    <div class="bg-black/50 p-2.5 rounded-xl border border-white/5 text-center">
                        <div class="text-[8px] font-black uppercase text-gray-400">For 60 ➔ Round Up</div>
                        <div class="text-lg font-black text-purple-300 mt-0.5" id="sim-pass-sem60-${courseCode}">${pInfo.sem60} ➔ <span class="text-white">${pInfo.roundUp}</span></div>
                        <div class="text-[7.5px] text-gray-500">Scale &amp; Ceil</div>
                    </div>
                    <div class="bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/30 text-center">
                        <div class="text-[8px] font-black uppercase text-emerald-400">Final Mark</div>
                        <div class="text-xl font-black text-emerald-300 mt-0.5" id="sim-pass-final-${courseCode}">${pInfo.final} <span class="text-[9px] text-gray-400 font-bold">/ 100</span></div>
                        <div class="text-[7.5px] text-emerald-400 font-black">PASS (≥ 50) ✅</div>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                    <span class="text-[10px] text-gray-300 font-medium pl-1">Apply minimum pass mark to slider:</span>
                    <button type="button" id="sim-pass-apply-btn-${courseCode}" onclick="applyPassTargetToSim('${courseCode}', ${pInfo.sem100})" class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-rose-600/30">
                        <i class="fas fa-bullseye text-[9px]"></i> Set Sem to ${pInfo.sem100}
                    </button>
                </div>
            </div>`;
        })()}

        <p class="text-[10px] text-gray-400 mb-3 uppercase tracking-widest font-bold">Simulate Final Exam</p>
        <div class="mb-5 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 p-5 rounded-2xl border border-purple-500/20">
            <div class="flex justify-between items-end mb-4">
                <div class="flex items-center gap-2">
                    <i class="fas fa-graduation-cap text-purple-400 text-sm"></i>
                    <span class="text-xs font-bold text-gray-200">Final Sem Exam</span>
                </div>
                <div class="flex items-baseline gap-1">
                    <span class="text-2xl font-black text-purple-300" id="val-${courseCode}-sem">75</span>
                    <span class="text-[10px] font-bold text-gray-500">/ 100</span>
                </div>
            </div>
            <input type="range" min="0" max="100" value="75" id="slider-${courseCode}-sem"
                oninput="updateSim('${courseCode}', 'sem', this.value)"
                class="w-full bg-black/50 rounded-lg appearance-none cursor-pointer accent-purple-500 acad-slider" style="height: 8px;" />
        </div>

        <div class="flex items-stretch justify-between bg-black/40 p-2 rounded-2xl border border-white/5 mb-5 relative">
            <div class="flex-1 flex flex-col items-center justify-center p-2">
                <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">CA Weight</span>
                <span class="text-xl font-black text-indigo-300" id="out-${courseCode}-ca">--</span>
                <span class="text-[8px] text-gray-600 mt-1" id="out-${courseCode}-ca-raw">--</span>
            </div>
            <div class="w-px bg-white/5 my-2"></div>
            <div class="flex-1 flex flex-col items-center justify-center p-2">
                <span class="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Sem Weight</span>
                <span class="text-xl font-black text-purple-300" id="out-${courseCode}-sem">--</span>
                <span class="text-[8px] text-gray-600 mt-1" id="out-${courseCode}-sem-raw">--</span>
            </div>
            <div class="w-px bg-white/5 my-2"></div>
            <div id="out-${courseCode}-box" class="flex-[1.2] flex flex-col items-center justify-center p-3 rounded-xl border">
                <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Final Total</span>
                <span class="text-3xl font-black" id="out-${courseCode}-total">--%</span>
                <span id="out-${courseCode}-grade" class="text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded bg-black/20 text-center leading-tight"></span>
            </div>
        </div>

        <div>
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Smart Target — Marks needed in final exam</span>
            <div class="grid grid-cols-2 gap-3">
                ${(() => {
                    const isAbs = isAbsoluteGradingSystem(state.rollNumber);
                    const simKeysForTarget = expectedKeys.filter(k => !['best2t','bestmcq','total','conv','rt','rt1','rt2'].includes(k));
                    const currentCAVal = calcCATotal(subject.is_lab, simKeysForTarget, window.simState[courseCode]);
                    const currentCa40Val = subject.is_lab ? Math.min(60, currentCAVal * 1.2) : Math.min(40, (currentCAVal / 50) * 40);
                    const passTargetInfo = !subject.is_lab ? getSemPassDetails(currentCa40Val) : null;
                    const passMarkLabel = passTargetInfo ? `${passTargetInfo.sem100} / 100` : '50%';

                    if (isAbs) {
                        return `
                            <button onclick="targetGrade('${courseCode}', 91)" class="active:scale-95 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition">Aim Grade S (91)</button>
                            <button onclick="targetGrade('${courseCode}', 81)" class="active:scale-95 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition">Aim A+ (81)</button>
                            <button onclick="targetGrade('${courseCode}', 71)" class="active:scale-95 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition">Aim A (71)</button>
                            <button onclick="targetGrade('${courseCode}', 50)" class="active:scale-95 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition flex flex-col items-center justify-center"><span>Just Pass (50%)</span><span class="text-[9.5px] font-black text-rose-400 mt-0.5" id="sim-target-pass-sub-${courseCode}">Need ${passMarkLabel} in Sem</span></button>
                        `;
                    } else {
                        return `
                            <button onclick="targetGrade('${courseCode}', 90)" class="active:scale-95 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition">Aim Grade O (90)</button>
                            <button onclick="targetGrade('${courseCode}', 80)" class="active:scale-95 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 hover:bg-purple-500/20 transition">Aim A+ (80)</button>
                            <button onclick="targetGrade('${courseCode}', 70)" class="active:scale-95 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition">Aim A (70)</button>
                            <button onclick="targetGrade('${courseCode}', 50)" class="active:scale-95 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition flex flex-col items-center justify-center"><span>Just Pass (50%)</span><span class="text-[9.5px] font-black text-rose-400 mt-0.5" id="sim-target-pass-sub-${courseCode}">Need ${passMarkLabel} in Sem</span></button>
                        `;
                    }
                })()}
            </div>
        </div>
    </div>`;
}

function getGradeInfo(total, roll = null) {
    const rollNum = roll || state.rollNumber;
    if (isAbsoluteGradingSystem(rollNum)) {
        if (total >= 91) return { grade: 'S', gp: 10, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' };
        if (total >= 81) return { grade: 'A+', gp: 9, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };
        if (total >= 71) return { grade: 'A', gp: 8, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30' };
        if (total >= 66) return { grade: 'B+', gp: 7, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' };
        if (total >= 61) return { grade: 'B', gp: 6, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/30' };
        if (total >= 56) return { grade: 'C+', gp: 6, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' };
        if (total >= 50) return { grade: 'C', gp: 5, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' };
        return { grade: 'U', gp: 0, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' };
    } else {
        if (total >= 90) return { grade: 'O', gp: 10, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' };
        if (total >= 80) return { grade: 'A+', gp: 9, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };
        if (total >= 70) return { grade: 'A', gp: 8, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30' };
        if (total >= 60) return { grade: 'B+', gp: 7, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' };
        if (total >= 55) return { grade: 'B', gp: 6, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/30' };
        if (total >= 50) return { grade: 'C', gp: 5, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' };
        return { grade: 'U', gp: 0, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' };
    }
}

function toggleInternalCard(code) {
    const expand = document.getElementById(`content-${code}`);
    const card = document.getElementById(`card-${code}`);
    const bar = document.getElementById(`bar-${code}`);
    if (!expand) return;
    
    expand.classList.toggle('expanded');
    if(expand.classList.contains('expanded')) {
        card.classList.add('border-indigo-500/30', 'ring-1', 'ring-indigo-500/20');
        if(bar) bar.style.display = 'none';
    } else {
        card.classList.remove('border-indigo-500/30', 'ring-1', 'ring-indigo-500/20');
        if(bar) bar.style.display = 'block';
    }
}

function updateSim(courseCode, key, val) {
    window.simState[courseCode][key] = Number(val);
    document.getElementById(`val-${courseCode}-${key}`).innerText = val;
    if(key === 'sem') document.getElementById(`slider-${courseCode}-sem`).value = val;
    calculateSimOutputs(courseCode);

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (roll) {
        try {
            localStorage.setItem(`bunker_internals_sim_${roll}`, JSON.stringify(window.simState));
        } catch {}
    }
}

function resetSim(courseCode) {
    if (!courseCode) {
        resetPredictionSim();
        return;
    }
    const subject = state.academics.internals.find(s => s.course_code === courseCode);
    const rowData = subject.row_data;
    const numCols = rowData.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => k !== 'best2t' && k !== 'bestmcq' && k !== 'total');
    
    const d = {};
    expectedKeys.forEach((k, i) => {
        const val = rowData[i];
        d[k] = (!val || val === '*' || val.trim() === '') ? null : parseFloat(val);
    });

    window.simState[courseCode] = { sem: 75 };
    simKeys.forEach(k => { 
        const actual = d[k];
        const meta = window.METADATA[k] || window.METADATA['c1'];
        window.simState[courseCode][k] = actual !== null ? actual : Math.round(meta.max * 0.7); 
        
        const slider = document.querySelector(`input[oninput="updateSim('${courseCode}', '${k}', this.value)"]`);
        if(slider) slider.value = window.simState[courseCode][k];
        const textVal = document.getElementById(`val-${courseCode}-${k}`);
        if(textVal) textVal.innerText = window.simState[courseCode][k];
    });

    document.getElementById(`slider-${courseCode}-sem`).value = 75;
    document.getElementById(`val-${courseCode}-sem`).innerText = 75;

    calculateSimOutputs(courseCode, subject);

    const roll = (typeof state !== 'undefined' && state.rollNumber) ? state.rollNumber : localStorage.getItem('bunker_roll') || '';
    if (roll) {
        try {
            localStorage.setItem(`bunker_internals_sim_${roll}`, JSON.stringify(window.simState));
        } catch {}
    }
}

/**
 * Identify zero-credit/non-GPA courses (e.g. Activity Point Programme).
 */
function isZeroCreditCourse(courseCode) {
    if (!courseCode) return false;
    const code = courseCode.toUpperCase();
    if (code === '23U215' || code === '23Q213' || code === '23IP15') return true;
    if (state && state.academics) {
        if (state.academics.cgpa && state.academics.cgpa.all_subjects) {
            const match = state.academics.cgpa.all_subjects.find(s => s.course === courseCode);
            if (match) {
                const mCr = parseInt(match.credits, 10);
                if (!isNaN(mCr) && mCr === 0) return true;
                if (mCr > 0) return false;
            }
        }
        if (state.academics.internals) {
            const sub = state.academics.internals.find(s => s.course_code === courseCode);
            if (sub && sub.course_name && (sub.course_name.toUpperCase().includes('ACTIVITY POINT') || sub.course_name.toUpperCase().includes('INDUCTION PROGRAMME'))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Get the expected key schema for a subject's row_data columns.
 * Centralised so all simulators use the same column detection.
 */
function getSchemaKeys(isLab, numCols) {
    if (isLab) {
        if (numCols === 6) return ['ir1', 'ir2', 'plro1', 'plro2', 'total', 'conv'];
        if (numCols === 5) return ['ir1', 'ir2', 'plro1', 'plro2', 'total'];
        return Array.from({length: numCols}, (_, i) => `c${i+1}`);
    }
    // PSG portal actual column schemas (theory, lab, non-cgpa courses)
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

/**
 * Core CA calculation using correct PSG portal data structure:
 * 
 * Portal stores T1, T2 ALREADY SCALED to max:30 (tests conducted for 50, scaled to 30 by college)
 * Portal also gives best2t = pre-calculated average/best of tests (max 30)
 * Portal MCQ values are out of 10, BestMCQ = average of MQ1, MQ2
 * AP = Assignment (max 10) for non-tutorial, AT1/AT2 = Assessment Tutorials (max 5 each)
 *
 * So total out of 50 = best2t(30) + ap/at1+at2(10) + bestMCQ(10)
 * Then scaled to 40 = total * 0.8
 * 
 * For simulation (when marks are pending), we use component values directly as already-scaled.
 */
function calcCATotal(isLab, simKeys, values) {
    if (isLab) {
        // Lab: sum all components (max 50 total: ir1+ir2=30, plro1+plro2=20)
        const labKeys = ['ir1', 'ir2', 'plro1', 'plro2'];
        return labKeys.reduce((sum, k) => sum + (simKeys.includes(k) ? (values[k] || 0) : 0), 0);
    }
    if (simKeys.includes('eh')) {
        return values['eh'] || 0;
    }
    if (simKeys.includes('a1') || simKeys.includes('a2')) {
        return (values['a1'] || 0) + (values['a2'] || 0);
    }
    // Theory: T1, T2 are stored as max:30 by portal (already scaled from 50)
    // best2t is the pre-calculated portal value (average, max 30) - use if simulated
    const t1 = values['t1'] || 0;   // out of 30
    const t2 = values['t2'] || 0;   // out of 30
    const best2t = (t1 + t2) / 2;   // average → out of 30
    // Tutorials or Assignment
    const ap = (values['ap'] || 0) + (values['at1'] || values['ap1'] || 0) + (values['at2'] || values['ap2'] || 0); // out of 10
    // MCQ average
    const mq1 = values['mq1'] || 0;
    const mq2 = values['mq2'] || 0;
    const bestMCQ = (mq1 + mq2) / 2; // out of 10
    return best2t + ap + bestMCQ;    // total out of 50
}

function calculateSimOutputs(courseCode, subjectObj) {
    const subject = subjectObj || state.academics.internals.find(s => s.course_code === courseCode);
    if(!subject) return;
    
    const numCols = subject.row_data.length;
    const expectedKeys = getSchemaKeys(subject.is_lab, numCols);
    const simKeys = expectedKeys.filter(k => k !== 'best2t' && k !== 'bestmcq' && k !== 'total' && k !== 'conv' && k !== 'rt' && k !== 'rt1' && k !== 'rt2');

    const totalCA = calcCATotal(subject.is_lab, simKeys, window.simState[courseCode]);
    // Lab: CA max=50 scaled UP to 60 (×1.2); Theory: CA max=50 scaled DOWN to 40 (×0.8)
    const ca40 = subject.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40);
    // Lab: FE max=50 marks scaled DOWN to 40 (×0.4 of 100); Theory: FE 100 marks scaled DOWN to 60 (×0.6 of 100)
    const feFactor = subject.is_lab ? 0.4 : 0.6;
    const sem60 = (window.simState[courseCode].sem / 100) * (subject.is_lab ? 40 : 60);
    const grandTotal = ca40 + sem60;
    const info = getGradeInfo(grandTotal);

    const caEl = document.getElementById(`out-${courseCode}-ca`);
    if(caEl) {
        caEl.innerText = ca40.toFixed(1);
        document.getElementById(`out-${courseCode}-ca-raw`).innerText = subject.is_lab ? `Lab: ${totalCA.toFixed(1)}→×1.2` : `Theory: ${totalCA.toFixed(1)}/50`;
        document.getElementById(`out-${courseCode}-sem`).innerText = sem60.toFixed(1);
        document.getElementById(`out-${courseCode}-sem-raw`).innerText = `Exam ${window.simState[courseCode].sem}/100 × 60%`;
        
        document.getElementById(`out-${courseCode}-total`).innerText = grandTotal.toFixed(1) + '%';
        document.getElementById(`out-${courseCode}-total`).className = `text-3xl font-black ${info.color}`;
        
        const box = document.getElementById(`out-${courseCode}-box`);
        box.className = `flex-[1.2] flex flex-col items-center justify-center p-3 rounded-xl border ${info.bg} ${info.border}`;
        
        const gradeBadge = document.getElementById(`out-${courseCode}-grade`);
        gradeBadge.className = `text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded ${info.color} bg-black/20 text-center leading-tight`;
        gradeBadge.innerHTML = `Grade: ${info.grade}`;
    }

    // Dynamic real-time update for the pass target card inside simulator
    if (!subject.is_lab) {
        const passReq = getSemPassDetails(ca40);
        const pCa = document.getElementById(`sim-pass-ca40-${courseCode}`);
        const pSem = document.getElementById(`sim-pass-sem100-${courseCode}`);
        const pSem60 = document.getElementById(`sim-pass-sem60-${courseCode}`);
        const pFinal = document.getElementById(`sim-pass-final-${courseCode}`);
        const pBtn = document.getElementById(`sim-pass-apply-btn-${courseCode}`);
        const pTargetSub = document.getElementById(`sim-target-pass-sub-${courseCode}`);

        if (pCa) pCa.innerText = ca40.toFixed(1);
        if (pSem) pSem.innerHTML = `${passReq.sem100} <span class="text-[9px] text-rose-400 font-bold">/ 100</span>`;
        if (pSem60) pSem60.innerHTML = `${passReq.sem60} ➔ <span class="text-white">${passReq.roundUp}</span>`;
        if (pFinal) pFinal.innerHTML = `${passReq.final} <span class="text-[9px] text-gray-400 font-bold">/ 100</span>`;
        if (pBtn) {
            pBtn.innerHTML = `<i class="fas fa-bullseye text-[9px]"></i> Set Sem to ${passReq.sem100}`;
            pBtn.setAttribute('onclick', `applyPassTargetToSim('${courseCode}', ${passReq.sem100})`);
        }
        if (pTargetSub) {
            pTargetSub.innerText = `Need ${passReq.sem100} in Sem`;
        }

        // Keep card-front pass target badge synchronized
        const cardPassReq = document.getElementById(`card-pass-req-${courseCode}`);
        if (cardPassReq) {
            cardPassReq.innerText = passReq.sem100;
        }

        // Keep pending simulator live bar synchronized
        const dynCaEl = document.getElementById(`dyn-sim-ca-${courseCode}`);
        const dynSemEl = document.getElementById(`dyn-sim-sem-${courseCode}`);
        if (dynCaEl) dynCaEl.innerText = ca40.toFixed(1);
        if (dynSemEl) dynSemEl.innerText = passReq.sem100;
    }

    recalculateCGPAPrediction();
}

function recalculateCGPAPrediction() {
    if (!state.academics.loaded || !state.academics.internals) return;

    let totalCredits = 0;
    let totalCreditPoints = 0;
    let hasUGrade = false;

    // Get the credits map from localStorage or default it
    let creditsMap = {};
    try {
        creditsMap = JSON.parse(localStorage.getItem(`bunker_predicted_credits_${state.rollNumber}`) || '{}');
    } catch (e) {
        creditsMap = {};
    }

    state.academics.internals.forEach(sub => {
        const courseCode = sub.course_code;
        
        // 1. Get predicted Grade Point
        let gp = 0;
        let grade = 'U';
        if (window.simState && window.simState[courseCode]) {
            const numCols = sub.row_data.length;
            const expectedKeys = getSchemaKeys(sub.is_lab, numCols);
            const simKeys = expectedKeys.filter(k => k !== 'best2t' && k !== 'bestmcq' && k !== 'total');
            const totalCA = calcCATotal(sub.is_lab, simKeys, window.simState[courseCode]);
            const ca40 = sub.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40);
            const semExam = window.simState[courseCode].sem !== undefined ? window.simState[courseCode].sem : 75;
            const sem60 = (semExam / 100) * (sub.is_lab ? 40 : 60);
            const grandTotal = ca40 + sem60;
            const info = getGradeInfo(grandTotal);
            gp = info.gp;
            grade = info.grade;
        } else {
            const info = getGradeInfo(75);
            gp = info.gp;
            grade = info.grade;
        }

        // 2. Determine credits
        let credits = creditsMap[courseCode];
        if (isZeroCreditCourse(courseCode)) {
            credits = 0;
            creditsMap[courseCode] = 0;
        } else if (credits === undefined) {
            credits = sub.is_lab ? 2 : 3;
            creditsMap[courseCode] = credits;
        }

        if (grade === 'U' && !isZeroCreditCourse(courseCode)) {
            hasUGrade = true;
        }

        totalCredits += credits;
        totalCreditPoints += gp * credits;
    });

    // Save updated credits to localStorage
    localStorage.setItem(`bunker_predicted_credits_${state.rollNumber}`, JSON.stringify(creditsMap));

    // Calculate SGPA
    const sgpa = totalCredits > 0 ? (totalCreditPoints / totalCredits) : 0;
    
    // Calculate CGPA
    let pastCredits = 0;
    let pastCreditPoints = 0;
    if (state.academics.cgpa) {
        pastCredits = state.academics.cgpa.total_credits || 0;
        if (state.academics.cgpa.credit_points_total !== undefined && state.academics.cgpa.credit_points_total !== null && state.academics.cgpa.credit_points_total > 0) {
            pastCreditPoints = state.academics.cgpa.credit_points_total;
        } else if (state.academics.cgpa.cgpa && !isNaN(parseFloat(state.academics.cgpa.cgpa))) {
            pastCreditPoints = parseFloat(state.academics.cgpa.cgpa) * pastCredits;
        } else if (state.academics.cgpa.all_subjects) {
            pastCreditPoints = state.academics.cgpa.all_subjects.reduce((acc, c) => {
                const cr = parseInt(c.credits, 10) || 0;
                return acc + (cr > 0 && c.grade_points != null ? cr * c.grade_points : 0);
            }, 0);
        }
    }

    const predictedCGPA = (pastCredits + totalCredits) > 0 
        ? ((pastCreditPoints + totalCreditPoints) / (pastCredits + totalCredits)) 
        : 0;

    // Calculate Max SGPA & Max CGPA (ceiling assuming 100/100 on exam and max remaining pending components)
    let maxCredits = 0;
    let maxCreditPoints = 0;
    state.academics.internals.forEach(sub => {
        const courseCode = sub.course_code;
        const isZero = isZeroCreditCourse(courseCode);
        const credits = isZero ? 0 : (creditsMap[courseCode] !== undefined ? creditsMap[courseCode] : (sub.is_lab ? 2 : 3));
        if (credits === 0) return;

        const numCols = sub.row_data.length;
        const expectedKeys = getSchemaKeys(sub.is_lab, numCols);
        const simKeys = expectedKeys.filter(k => k !== "best2t" && k !== "bestmcq" && k !== "total" && k !== "conv" && k !== "rt" && k !== "rt1" && k !== "rt2");
        
        const maxMarksObj = {};
        simKeys.forEach(k => {
            const meta = window.METADATA[k] || window.METADATA["c1"];
            const actual = sub[k] !== undefined && sub[k] !== null && sub[k] !== "" && sub[k] !== "*" ? parseFloat(sub[k]) : null;
            maxMarksObj[k] = (actual !== null && !isNaN(actual)) ? actual : (meta ? meta.max : 10);
        });
        const maxCA = calcCATotal(sub.is_lab, simKeys, maxMarksObj);
        const maxCA40 = sub.is_lab ? Math.min(60, maxCA * 1.2) : Math.min(40, (maxCA / 50) * 40);
        const maxSemScore = sub.is_lab ? 40 : 60; // 100/100 on sem exam
        const maxGrandTotal = Math.min(100, Math.round(maxCA40 + maxSemScore));
        const maxInfo = getGradeInfo(maxGrandTotal);
        maxCredits += credits;
        maxCreditPoints += maxInfo.gp * credits;
    });

    const maxSgpa = maxCredits > 0 ? (maxCreditPoints / maxCredits) : 0;
    const maxCgpa = (pastCredits + maxCredits) > 0 ? ((pastCreditPoints + maxCreditPoints) / (pastCredits + maxCredits)) : 0;

    const maxSgpaEl = document.getElementById("max-sgpa-value");
    const maxCgpaEl = document.getElementById("max-cgpa-value");
    if (maxSgpaEl) maxSgpaEl.innerText = maxSgpa.toFixed(2);
    if (maxCgpaEl) maxCgpaEl.innerText = maxCgpa.toFixed(2);

    // Update UI elements - Official PSG Tech marksheet rule: "***" if any subject is RA/unpassed
    const sgpaValEl = document.getElementById("predicted-sgpa-value");
    const cgpaValEl = document.getElementById("predicted-cgpa-value");
    
    if (sgpaValEl) {
        sgpaValEl.textContent = hasUGrade ? "***" : sgpa.toFixed(2);
    }
    if (cgpaValEl) {
        cgpaValEl.textContent = hasUGrade ? "***" : predictedCGPA.toFixed(2);
    }

    // Calculate SGPA needed for 8.5 CGPA
    const targetContainer = document.getElementById('target-cgpa-container');
    const reqSgpaEl = document.getElementById('required-sgpa-85');
    
    if (totalCredits > 0 && pastCredits > 0) {
        const requiredCreditPoints = 8.5 * (pastCredits + totalCredits) - pastCreditPoints;
        const requiredSgpa = requiredCreditPoints / totalCredits;
        
        if (targetContainer && reqSgpaEl) {
            targetContainer.classList.remove('hidden');
            if (requiredSgpa > 10) {
                reqSgpaEl.textContent = "Impossible (>10)";
                reqSgpaEl.className = "font-black text-rose-400 text-sm";
            } else if (requiredSgpa <= 5) {
                reqSgpaEl.textContent = "Safe (≤5.0)";
                reqSgpaEl.className = "font-black text-emerald-400 text-sm";
            } else {
                reqSgpaEl.textContent = requiredSgpa.toFixed(2);
                reqSgpaEl.className = "font-black text-indigo-400 text-sm";
            }
        }
    } else if (targetContainer) {
        targetContainer.classList.add('hidden');
    }

    // Update individual subject badges in the predictor section
    state.academics.internals.forEach(sub => {
        const badgeEl = document.getElementById(`pred-badge-${sub.course_code}`);
        if (badgeEl) {
            let gp = 0;
            let grade = 'U';
            if (window.simState && window.simState[sub.course_code]) {
                const numCols = sub.row_data.length;
                const expectedKeys = getSchemaKeys(sub.is_lab, numCols);
                const simKeys = expectedKeys.filter(k => k !== 'best2t' && k !== 'bestmcq' && k !== 'total' && k !== 'conv' && k !== 'rt' && k !== 'rt1' && k !== 'rt2');
                const totalCA = calcCATotal(sub.is_lab, simKeys, window.simState[sub.course_code]);
                const ca40 = sub.is_lab ? Math.min(60, totalCA * 1.2) : Math.min(40, (totalCA / 50) * 40);
                const semExam = window.simState[sub.course_code].sem !== undefined ? window.simState[sub.course_code].sem : 75;
                const sem60 = (semExam / 100) * (sub.is_lab ? 40 : 60);
                const grandTotal = ca40 + sem60;
                const info = getGradeInfo(grandTotal);
                gp = info.gp;
                grade = info.grade;
            } else {
                const info = getGradeInfo(75);
                gp = info.gp;
                grade = info.grade;
            }
            const info = getGradeInfo(gp * 10);
            badgeEl.className = `text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${info.bg} ${info.color} ${info.border}`;
            badgeEl.textContent = `${grade} (${gp} GP)`;
        }
    });
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

    // If targeting Pass (50%) for a theory subject, use exact PSG Pass Matrix rule
    if (targetTotal === 50 && !subject.is_lab) {
        const passReq = getSemPassDetails(ca40);
        if (passReq.alreadyPassed) {
            showToast(`Already passed! Current CA (${ca40.toFixed(1)}) is enough to clear the course.`);
            updateSim(courseCode, 'sem', 0);
            return;
        }
        if (passReq.impossible) {
            showToast(`Critical: Cannot reach 50% with current CA alone. Need higher internal marks.`);
            updateSim(courseCode, 'sem', 100);
            return;
        }
        showToast(`🎯 PSG Pass Matrix: Need ${passReq.sem100} / 100 in Final Exam (${passReq.sem60} ➔ ${passReq.roundUp}/60) to score 50% (Pass)`);
        updateSim(courseCode, 'sem', passReq.sem100);
        return;
    }

    // For other grades, account for PSG 60% conversion with ceil rounding
    let foundSem = -1;
    for (let s = 0; s <= 100; s++) {
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
    } else if (foundSem === 0) {
        showToast(`Already achieved ${targetTotal}% total with current CA alone!`);
        updateSim(courseCode, 'sem', 0);
    } else {
        showToast(`Need ${foundSem} / 100 in Final Exam to score ${targetTotal}% overall`);
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

    if (targetSem === 'all' || targetSem === 'overall') {
        const cgpa = (state.academics.cgpa && state.academics.cgpa.cgpa) || gpaData.overall_cgpa || gpaData.gpa;
        if (titleEl) titleEl.textContent = 'Cumulative CGPA';
        if (valEl) {
            valEl.textContent = cgpa === 'RA' ? 'RA' : (cgpa || '--');
            valEl.style.color = cgpa === 'RA' ? '#EF4444' : cgpa >= 8.5 ? '#10B981' : cgpa >= 7 ? '#6366f1' : cgpa >= 5 ? '#F59E0B' : '#EF4444';
        }
        if (creditsEl) creditsEl.textContent = `${gpaData.total_credits || 0} total credits earned`;
        document.getElementById('gpa-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        if (creditsEl) creditsEl.textContent = `${sCr} Credits • ${sCount} Courses`;
        document.getElementById(`sem-section-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    _currentGPAData = gpaData;
    const valEl = document.getElementById('gpa-value');
    const tableEl = document.getElementById('gpa-table');
    const titleEl = document.getElementById('gpa-hero-title');
    const creditsEl = document.getElementById('cgpa-credits');
    const resultsChipsWrapper = document.getElementById('results-sem-chips');
    const resultsChipsList = document.getElementById('results-sem-chips-list');
    if (!valEl || !tableEl) return;

    const gpa = gpaData.gpa;
    valEl.textContent = gpa === 'RA' ? 'RA' : (gpa || '--');
    valEl.style.color = gpa === 'RA' ? '#EF4444' : gpa >= 8.5 ? '#10B981' : gpa >= 7 ? '#6366f1' : gpa >= 5 ? '#F59E0B' : '#EF4444';

    if (titleEl) {
        titleEl.textContent = gpaData.latest_sem ? `Semester ${gpaData.latest_sem} GPA` : 'Semester GPA';
    }

    const courses = gpaData.table || [];
    if (courses.length === 0) {
        tableEl.innerHTML = '<div class="text-center py-10 text-gray-600 text-xs">No semester data found</div>';
        if (resultsChipsWrapper) resultsChipsWrapper.classList.add('hidden');
        return;
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
                const cCr = parseInt(c.credits, 10) || 0;
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
            semwiseGPA[s] = hasRA ? 'RA' : (cr > 0 ? +(cp / cr).toFixed(2) : 0);
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
            let chipsHtml = '';
            const overallCGPA = (state.academics.cgpa && state.academics.cgpa.cgpa) || gpaData.overall_cgpa;
            if (overallCGPA) {
                chipsHtml += `<button type="button" data-sem="all" onclick="selectSemesterGPA('all')" class="results-sem-chip flex flex-col items-center px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-60">Overall</span>
                    <span class="text-xs font-black leading-tight">${overallCGPA}</span>
                </button>`;
            }
            sortedSems.forEach(s => {
                const sGPA = semwiseGPA[s] !== undefined ? semwiseGPA[s] : '--';
                const g = parseFloat(sGPA);
                const isRA = sGPA === 'RA' || isNaN(g);
                const color = isRA ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            : g >= 8.5 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : g >= 7   ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                            : g >= 5   ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            :            'text-rose-400 bg-rose-500/10 border-rose-500/20';
                chipsHtml += `<button type="button" data-sem="${s}" onclick="selectSemesterGPA(${s})" class="results-sem-chip flex flex-col items-center px-3 py-1.5 rounded-xl border ${color} hover:scale-105 active:scale-95 transition-all cursor-pointer">
                    <span class="text-[8px] font-black uppercase tracking-widest opacity-60">Sem ${s}</span>
                    <span class="text-xs font-black leading-tight">${sGPA}</span>
                </button>`;
            });
            resultsChipsList.innerHTML = chipsHtml;
            resultsChipsWrapper.classList.remove('hidden');

            // Set initial active ring
            const activeBtn = resultsChipsList.querySelector(`[data-sem="${activeSem}"]`);
            if (activeBtn) {
                activeBtn.classList.add('ring-2', 'ring-indigo-400', 'scale-105', 'bg-indigo-500/25', 'border-indigo-400');
            }
        } else {
            resultsChipsWrapper.classList.add('hidden');
        }
    }

    let html = '';
    Object.keys(sems).sort((a, b) => b - a).forEach(sem => {
        const sGPA = semwiseGPA[sem] !== undefined ? semwiseGPA[sem] : '--';
        const sCr = semwiseCredits[sem] !== undefined ? semwiseCredits[sem] : sems[sem].reduce((sum, c) => sum + (parseInt(c.credits) || 0), 0);
        const g = parseFloat(sGPA);
        const isRA = sGPA === 'RA' || isNaN(g);
        const badgeColor = isRA ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                         : g >= 8.5 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                         : g >= 7   ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                         : g >= 5   ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                         :            'text-rose-400 bg-rose-500/10 border-rose-500/20';

        html += `
        <div class="mb-5" id="sem-section-${sem}">
            <div class="flex items-center justify-between px-1 mb-2">
                <div class="flex items-center gap-2">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Semester ${sem}</p>
                    <span class="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">${sCr} Credits</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-[8px] font-bold text-gray-500 uppercase tracking-wider">SGPA</span>
                    <span class="text-xs font-black ${badgeColor} px-2.5 py-0.5 rounded-xl border">${sGPA}</span>
                </div>
            </div>
            <div class="bg-black/20 rounded-3xl p-2 border border-white/5 space-y-1">`;

        sems[sem].forEach(c => {
            const gradeStr = c.grade || '--';
            const gClean = String(c.grade || '').trim().toUpperCase();
            const isPass = c.result === 'Pass' || (c.grade && !gClean.startsWith('RA') && gClean !== 'U' && !gClean.startsWith('0 ') && (!c.result || c.result.toLowerCase() !== 'fail'));
            const isArrear = !isPass || gClean.startsWith('RA') || gClean === 'U' || (c.result && c.result.toLowerCase() === 'fail');
            const isNonCgpa = (parseInt(c.credits, 10) === 0 || c.credits === '0' || c.credits === 0);
            const catBadge = c.category ? `<span class="text-[8px] font-black ${isNonCgpa ? 'text-amber-400/90 bg-amber-500/10 border-amber-500/20' : 'text-indigo-400/80 bg-indigo-500/10 border-indigo-500/20'} px-1.5 py-0.5 rounded border">${c.category}</span>` : '';
            const nonCgpaBadge = isNonCgpa ? `<span class="text-[8px] font-black text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">NON-CGPA</span>` : '';
            const arrearBadge = isArrear ? `<span class="text-[8px] font-black text-rose-400 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">ARREAR</span>` : '';
            
            let effectiveGP = c.grade_points;
            if (effectiveGP == null && !isNonCgpa && c.grade) {
                const gMap = { 'S': 10, 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6.5, 'C+': 6, 'C': 5, 'D': 6, 'E': 5, 'P': 5 };
                if (gMap[gClean] !== undefined) effectiveGP = gMap[gClean];
            }
            const gpBadge = (effectiveGP !== null && effectiveGP !== undefined && !isNonCgpa) ? `<span class="text-[9px] text-gray-400 font-bold ml-1">(${effectiveGP} GP)</span>` : '';

            html += `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-2xl ${isArrear ? 'bg-rose-950/20 border border-rose-500/30' : 'hover:bg-white/5'} transition-colors gap-2">
                <div class="flex-1 pr-2">
                    <p class="text-[11px] sm:text-xs font-bold text-white mb-0.5 leading-snug">${c.title}</p>
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">${c.course} • ${c.credits || 0} CR</span>
                        ${catBadge}
                        ${nonCgpaBadge}
                        ${arrearBadge}
                    </div>
                </div>
                <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                    <div class="${isArrear ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-white/5 border border-white/10'} px-3 py-1.5 rounded-lg min-w-[70px] text-center">
                        <span class="text-xs font-black ${isArrear ? 'text-rose-400' : gradeStr === 'Completed' ? 'text-emerald-400' : 'text-indigo-300'}">${gradeStr}</span>
                        ${gpBadge}
                    </div>
                    ${c.result ? `
                    <div class="${isPass ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/20 border-rose-500/30'} px-3 py-1.5 rounded-lg border">
                        <span class="text-[10px] font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'} uppercase tracking-wider">${c.result}</span>
                    </div>` : ''}
                </div>
            </div>`;
        });
        html += '</div></div>';
    });

    tableEl.innerHTML = html;
}

// ---- CGPA ----
function renderCGPA(cgpaData) {
    const valEl = document.getElementById('internals-cgpa-value');
    const credEl = document.getElementById('cgpa-credits');
    const chartEl = document.getElementById('cgpa-chart');
    const semList = document.getElementById('cgpa-semlist');
    const semChipsWrapper = document.getElementById('internals-sem-chips');
    const semChipsList = document.getElementById('internals-sem-chips-list');
    if (!valEl) return;

    const cgpa = cgpaData.cgpa;
    const isWithheld = cgpa === '***' || cgpa === 'RA';
    valEl.textContent = isWithheld ? '***' : (cgpa || '--');
    valEl.style.color = isWithheld ? '#EF4444' : cgpa >= 8.5 ? '#10B981' : cgpa >= 7 ? '#6366f1' : cgpa >= 5 ? '#F59E0B' : '#EF4444';

    if (credEl) {
        if (isWithheld || cgpaData.cgpa_note) {
            const noteText = cgpaData.cgpa_note || 'CGPA is computed only if candidate passes all the courses registered.';
            credEl.innerHTML = `${cgpaData.total_credits || 0} total credits earned<div class="text-[9px] text-rose-400 font-medium mt-1 tracking-normal leading-snug"><i class="fas fa-exclamation-circle mr-1"></i>${noteText}</div>`;
        } else {
            credEl.textContent = `${cgpaData.total_credits || 0} total credits earned`;
        }
    }

    const semData = cgpaData.semwise_data || [];

    // Render all sem GPA chips inside the hero card
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
                return `<button type="button" onclick="switchAcadTab('results'); setTimeout(() => selectSemesterGPA(${d.sem}), 120)" class="flex flex-col items-center px-3 py-1.5 rounded-xl border ${color} hover:scale-105 active:scale-95 transition-all cursor-pointer">
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

        // Build paths
        const sgpaPoints = semData.map((d, i) => `${toX(i)},${toY(d.sgpa_numeric !== undefined ? d.sgpa_numeric : d.sgpa)}`).join(' ');
        const cgpaPoints = semData.map((d, i) => `${toX(i)},${toY(d.cgpa_numeric !== undefined ? d.cgpa_numeric : d.cgpa)}`).join(' ');

        // Grid lines at 6, 7, 8, 9, 10
        const gridLines = [6, 7, 8, 9, 10].map(g => {
            const y = toY(g);
            return `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
                    <text x="${padX - 4}" y="${y + 4}" font-size="7" fill="rgba(255,255,255,0.2)" text-anchor="end">${g}</text>`;
        }).join('');

        // Dots
        const sgpaDots = semData.map((d, i) => `<circle cx="${toX(i)}" cy="${toY(d.sgpa_numeric !== undefined ? d.sgpa_numeric : d.sgpa)}" r="3.5" fill="#6366f1"/>`).join('');
        const cgpaDots = semData.map((d, i) => `<circle cx="${toX(i)}" cy="${toY(d.cgpa_numeric !== undefined ? d.cgpa_numeric : d.cgpa)}" r="3.5" fill="#10B981"/>`).join('');

        // Sem labels
        const semLabels = semData.map((d, i) => `<text x="${toX(i)}" y="${H - 2}" font-size="7" fill="rgba(255,255,255,0.25)" text-anchor="middle">S${d.sem}</text>`).join('');

        chartEl.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" class="cgpa-chart-svg">
            ${gridLines}
            <!-- CGPA Line -->
            <polyline points="${cgpaPoints}" fill="none" stroke="#10B981" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
            <!-- SGPA Line -->
            <polyline points="${sgpaPoints}" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round" stroke-linecap="round"/>
            ${cgpaDots}
            ${sgpaDots}
            ${semLabels}
        </svg>
        <div class="flex gap-4 mt-2 justify-center">
            <div class="flex items-center gap-1.5"><div class="w-4 h-[2px] bg-emerald-500 rounded-full"></div><span class="text-[9px] font-bold text-gray-500">CGPA</span></div>
            <div class="flex items-center gap-1.5"><div class="w-4 h-[2px] bg-indigo-500 rounded-full opacity-70" style="background: repeating-linear-gradient(90deg, #6366f1 0px, #6366f1 4px, transparent 4px, transparent 7px);"></div><span class="text-[9px] font-bold text-gray-500">SGPA</span></div>
        </div>`;
    }

    // Sem-by-Sem breakdown
    if (semList && semData.length > 0) {
        semList.innerHTML = '';
        semData.forEach(d => {
            const isCgpaRA = d.cgpa === 'RA';
            const isSgpaRA = d.sgpa === 'RA';
            const cgpaVal = parseFloat(d.cgpa);
            const gpaColor = isCgpaRA ? 'text-rose-400' : cgpaVal >= 8.5 ? 'text-emerald-400' : cgpaVal >= 7 ? 'text-indigo-400' : cgpaVal >= 5 ? 'text-amber-400' : 'text-rose-400';
            const sgpaColor = isSgpaRA ? 'text-rose-400' : 'text-indigo-300';

            semList.innerHTML += `
            <div class="glass-panel rounded-[24px] p-5 flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Semester ${d.sem}</p>
                        ${d.credits ? `<span class="text-[8px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">${d.credits} CR</span>` : ''}
                    </div>
                    <div class="flex gap-4 items-center mt-2">
                        <div>
                            <span class="text-[8px] font-black text-indigo-400/80 block uppercase tracking-wider">SGPA</span>
                            <span class="text-lg font-black ${sgpaColor}">${d.sgpa}</span>
                        </div>
                        <div class="w-px h-7 bg-white/10"></div>
                        <div>
                            <span class="text-[8px] font-black text-emerald-400/80 block uppercase tracking-wider">CGPA</span>
                            <span class="text-lg font-black ${gpaColor}">${d.cgpa}</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="switchAcadTab('results'); setTimeout(() => selectSemesterGPA(${d.sem}), 120)" class="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/30 flex items-center justify-center text-gray-400 hover:text-indigo-300 text-xs font-black transition-all cursor-pointer" title="View Semester ${d.sem} Courses">S${d.sem}</button>
            </div>`;
        });
    } else if (semList) {
        semList.innerHTML = '<div class="text-center py-8 text-gray-600 text-xs">No semester data yet</div>';
    }

    // --- Degree Classification Projection ---
    const labelEl = document.getElementById('degree-class-label');
    const subEl = document.getElementById('degree-class-sub');
    const iconEl = document.getElementById('degree-class-icon');
    const progressEl = document.getElementById('degree-class-progress');

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

        let label, sub, icon, progressMsg, borderColor;

        if (hasAnyRA) {
            label = 'Pending Arrear(s)';
            sub = `${activeArrears.length} course(s) pending examination clearance`;
            icon = '⚠️';
            borderColor = '#EF4444';
            progressMsg = `<span class="text-rose-400 font-bold">Active Arrear Notice:</span> You have <b>${activeArrears.length} pending arrear(s)</b> (${activeArrears.map(a => `<b class="text-white">${a.course}</b>`).join(', ') || 'RA in past semester'}). Clear these courses in upcoming examination cycles to qualify for First Class degree classification.`;
        } else if (cgpaNum >= 8.5) {
            label = 'First Class with Distinction';
            sub = 'On track — Absolute CGPA ≥ 8.50, no arrears';
            icon = '🏆';
            borderColor = '#10B981';
            if (cgpaNum < 9) {
                const gap = (9.0 - cgpaNum).toFixed(2);
                progressMsg = `You are <b>${gap} CGPA points</b> below a 9.0 target. Maintain consistent absolute performance to graduate with Distinction.`;
            } else {
                progressMsg = `Outstanding performance! Distinction status maintained with no backlogs.`;
            }
        } else if (cgpaNum >= 6.5) {
            label = 'First Class';
            sub = 'On track — Absolute CGPA ≥ 6.50, no arrears';
            icon = '⭐';
            borderColor = '#6366f1';
            const gap = (8.5 - cgpaNum).toFixed(2);
            progressMsg = `You need <b>${gap} more CGPA points</b> to reach First Class with Distinction (≥ 8.50).`;
        } else if (cgpaNum >= 5.0) {
            label = 'Second Class';
            sub = 'CGPA ≥ 5.00 — Minimum graduation standard met';
            icon = '📘';
            borderColor = '#F59E0B';
            const gap = (6.5 - cgpaNum).toFixed(2);
            progressMsg = `You need <b>${gap} more CGPA points</b> to cross into First Class (≥ 6.50).`;
        } else {
            label = 'At Risk';
            sub = 'CGPA below minimum qualification threshold';
            icon = '⚠️';
            borderColor = '#EF4444';
            progressMsg = `CGPA is below 5.0. Focus on clearing courses in upcoming semester exams to raise your standing.`;
        }

        labelEl.textContent = label;
        subEl.textContent = sub;
        iconEl.textContent = icon;
        progressEl.innerHTML = progressMsg;

        // Update card border color
        const card = document.getElementById('degree-classification-card');
        if (card) card.style.borderLeftColor = borderColor;
    }
}

// Hook into switchTab to auto-load academics
// (Academics auto-load is handled in the existing switchTab function body above)
// Call this to refresh academics data manually
function refreshAcademics() {
    state.academics = { internals: null, gpa: null, cgpa: null, loaded: false };
    loadAcademics(true);
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


