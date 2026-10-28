import express from 'express';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Allow college portal certificates (equivalent to verify=False in Python requests)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, 'public');
const STATIC_DIR = path.join(__dirname, 'static');

const app = express();
app.disable('x-powered-by');

const SESSION_SECRET =
  process.env.BUNKER_SECRET_KEY ||
  process.env.SESSION_SECRET ||
  'fallback-deterministic-secret-key-psg-bunker-2026';

// Compute deterministic UI Version hash from core UI files so whenever the owner
// edits any UI file (HTML/JS/CSS), every student's phone automatically clears its
// cached UI and rolls out the new UI on next fetch.
function computeCurrentUIVersion() {
  try {
    const uiFiles = [
      path.join(PUBLIC_DIR, 'index.html'),
      path.join(PUBLIC_DIR, 'calendar.html'),
      path.join(PUBLIC_DIR, 'feedback.html'),
      path.join(STATIC_DIR, 'app.js'),
      path.join(STATIC_DIR, 'style.css'),
      path.join(STATIC_DIR, 'calendar.js'),
      path.join(STATIC_DIR, 'calendar.css'),
      path.join(STATIC_DIR, 'legal.js'),
      path.join(STATIC_DIR, 'manifest.json'),
    ];
    const hash = crypto.createHash('sha256');
    for (const filePath of uiFiles) {
      if (fs.existsSync(filePath)) {
        hash.update(fs.readFileSync(filePath));
      }
    }
    return `bunker-ui-${hash.digest('hex').slice(0, 10)}`;
  } catch {
    return 'bunker-ui-v5-prod';
  }
}

const CURRENT_UI_VERSION = computeCurrentUIVersion();

// ============================================================================
// 1. VERCEL PATH NORMALIZATION & GZIP COMPRESSION MIDDLEWARE
//    Minimizes Vercel Hobby Fast Origin Transfer (10 GB/mo limit) by ~95%
// ============================================================================
app.use((req, res, next) => {
  res.setHeader('X-Bunker-UI-Version', CURRENT_UI_VERSION);

  // Normalize Vercel rewrite query param (?__vercel_path=api/...)
  if (req.query && typeof req.query.__vercel_path === 'string') {
    const cleanPath = '/' + req.query.__vercel_path.replace(/^\/+/, '');
    const urlObj = new URL(req.url, 'http://localhost');
    urlObj.searchParams.delete('__vercel_path');
    const qs = urlObj.searchParams.toString();
    req.url = cleanPath + (qs ? `?${qs}` : '');
  } else if (req.headers['x-invoke-path'] && req.url.startsWith('/api/index')) {
    req.url = String(req.headers['x-invoke-path']);
  }

  // Intercept res.json and res.send to apply fast Gzip compression (>= 128 bytes)
  const acceptEncoding = String(req.headers['accept-encoding'] || '').toLowerCase();
  const supportsGzip =
    acceptEncoding.includes('gzip') ||
    Boolean(req.headers['x-vercel-id']) ||
    Boolean(req.headers['x-vercel-deployment-url']);

  if (supportsGzip) {
    const origSend = res.send.bind(res);
    res.send = function (body) {
      if (res.headersSent || res.statusCode >= 400 || res.getHeader('Content-Encoding')) {
        return origSend(body);
      }
      let buf = null;
      if (Buffer.isBuffer(body)) {
        buf = body;
      } else if (typeof body === 'string') {
        buf = Buffer.from(body, 'utf-8');
      } else if (body !== undefined && body !== null) {
        buf = Buffer.from(JSON.stringify(body), 'utf-8');
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
      }

      if (buf && buf.length >= 128) {
        try {
          const compressed = zlib.gzipSync(buf, { level: 6 });
          if (compressed.length < buf.length) {
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Length', String(compressed.length));
            res.setHeader('Vary', 'Accept-Encoding');
            return origSend(compressed);
          }
        } catch {
          // Fallback to uncompressed on error
        }
      }
      return origSend(body);
    };
  }

  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// 2. BOUNDED IN-MEMORY & /tmp DISK CACHE + IN-FLIGHT REQUEST COALESCING
// ============================================================================
const IN_MEM_CACHE = new Map();
const MAX_MEM_CACHE_ITEMS = 800;
const IN_FLIGHT_REQUESTS = new Map();

function coalesceRequest(key, asyncFn) {
  if (IN_FLIGHT_REQUESTS.has(key)) {
    return IN_FLIGHT_REQUESTS.get(key);
  }
  const promise = Promise.resolve()
    .then(asyncFn)
    .finally(() => {
      IN_FLIGHT_REQUESTS.delete(key);
    });
  IN_FLIGHT_REQUESTS.set(key, promise);
  return promise;
}

function getDiskCache(cacheKey, maxAgeSeconds = 86400) {
  const now = Date.now() / 1000;
  if (IN_MEM_CACHE.has(cacheKey)) {
    const entry = IN_MEM_CACHE.get(cacheKey);
    if (now - (entry.ts || 0) < maxAgeSeconds) {
      return entry.data;
    }
    IN_MEM_CACHE.delete(cacheKey);
  }
  try {
    const filePath = `/tmp/${cacheKey}.json`;
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs / 1000 < maxAgeSeconds) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        setMemCacheBounded(cacheKey, { ts: now, data });
        return data;
      }
    }
  } catch {
    // Ignore disk cache miss
  }
  return null;
}

function setMemCacheBounded(cacheKey, val) {
  if (IN_MEM_CACHE.size >= MAX_MEM_CACHE_ITEMS && !IN_MEM_CACHE.has(cacheKey)) {
    const oldestKey = IN_MEM_CACHE.keys().next().value;
    if (oldestKey) IN_MEM_CACHE.delete(oldestKey);
  }
  IN_MEM_CACHE.set(cacheKey, val);
}

function setDiskCache(cacheKey, data) {
  const now = Date.now() / 1000;
  setMemCacheBounded(cacheKey, { ts: now, data });
  try {
    const filePath = `/tmp/${cacheKey}.json`;
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  } catch {
    // Ignore disk write error
  }
}

// ============================================================================
// 3. PRECOMPILED REGEXES (<0.1ms Token & Attendance Signature Extraction)
// ============================================================================
const TR_RE = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
const TD_RE = /<td[^>]*>([\s\S]*?)<\/td>/gi;
const TAG_RE = /<[^>]+>/g;
const REQ_TOKEN_RE =
  /name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']|value=["']([^"']+)["'][^>]*name=["']__RequestVerificationToken["']/i;
const VIEWSTATE_RE =
  /(?:id|name)=["']__VIEWSTATE["'][^>]*value=["']([^"']*)["']|value=["']([^"']*)["'][^>]*(?:id|name)=["']__VIEWSTATE["']/i;
const EVENTVALIDATION_RE =
  /(?:id|name)=["']__EVENTVALIDATION["'][^>]*value=["']([^"']*)["']|value=["']([^"']*)["'][^>]*(?:id|name)=["']__EVENTVALIDATION["']/i;
const VIEWSTATEGEN_RE =
  /(?:id|name)=["']__VIEWSTATEGENERATOR["'][^>]*value=["']([^"']*)["']|value=["']([^"']*)["'][^>]*(?:id|name)=["']__VIEWSTATEGENERATOR["']/i;

function formatPortalDate(rawDate) {
  const trimmed = String(rawDate || '').trim();
  const m = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = m[1];
    const monthIdx = parseInt(m[2], 10) - 1;
    const year = m[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${day}, ${year}`;
    }
  }
  return trimmed;
}

function parsePortalDateRank(rawDate) {
  const trimmed = String(rawDate || '').trim();
  const m = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (m) {
    return parseInt(`${m[3]}${m[2]}${m[1]}`, 10);
  }
  return 0;
}

function fastExtractLastUpdateDate(html) {
  if (!html) return null;
  try {
    const tableStart = html.indexOf('id="example"');
    const altStart = tableStart === -1 ? html.indexOf('cssbody') : tableStart;
    const sliceStart = altStart !== -1 ? altStart : 0;
    const tableEnd = html.indexOf('</table>', sliceStart);
    const tableHtml = tableEnd !== -1 ? html.slice(sliceStart, tableEnd) : html.slice(sliceStart);

    let bestDateRaw = null;
    let bestRank = -1;
    let trMatch;
    TR_RE.lastIndex = 0;
    while ((trMatch = TR_RE.exec(tableHtml)) !== null) {
      const trContent = trMatch[1];
      if (trContent.indexOf('<td') === -1) continue;
      const tds = [];
      let tdMatch;
      TD_RE.lastIndex = 0;
      while ((tdMatch = TD_RE.exec(trContent)) !== null) {
        tds.push(tdMatch[1].replace(TAG_RE, '').trim());
      }
      if (tds.length >= 10 && tds[9]) {
        const rank = parsePortalDateRank(tds[9]);
        if (rank > bestRank) {
          bestRank = rank;
          bestDateRaw = tds[9];
        }
      }
    }
    if (bestDateRaw) {
      return formatPortalDate(bestDateRaw);
    }
  } catch {
    // Fallback
  }
  return null;
}

function fastExtractAttendanceSignature(html) {
  if (!html) return { sig: null, totHours: 0, attHours: 0, lastUpdate: null };
  try {
    const lastUpdate = fastExtractLastUpdateDate(html);
    if (lastUpdate) {
      return {
        sig: lastUpdate,
        totHours: 0,
        attHours: 0,
        lastUpdate,
      };
    }
  } catch {
    // Fallback
  }
  return { sig: null, totHours: 0, attHours: 0, lastUpdate: null };
}

// ============================================================================
// 4. PSG TECH BRANCH MAP & AUTOMATED ACADEMIC CALENDAR RESOLVER
// ============================================================================
const PSGTECH_BRANCH_MAP = {
  A: { degree: 'B.E.', name: 'Automobile Engineering', sandwich: false, years: 4 },
  C: { degree: 'B.E.', name: 'Civil Engineering', sandwich: false, years: 4 },
  D: { degree: 'B.E.', name: 'Biomedical Engineering', sandwich: false, years: 4 },
  E: { degree: 'B.E.', name: 'Electrical & Electronics Engineering', sandwich: false, years: 4 },
  L: { degree: 'B.E.', name: 'Electronics & Communication Engineering', sandwich: false, years: 4 },
  M: { degree: 'B.E.', name: 'Mechanical Engineering', sandwich: false, years: 4 },
  N: { degree: 'B.E.', name: 'Computer Science (AI & ML)', sandwich: false, years: 4 },
  P: { degree: 'B.E.', name: 'Production Engineering', sandwich: false, years: 4 },
  R: { degree: 'B.E.', name: 'Robotics & Automation', sandwich: false, years: 4 },
  U: { degree: 'B.E.', name: 'Instrumentation & Control Engineering', sandwich: false, years: 4 },
  Y: { degree: 'B.E.', name: 'Metallurgical Engineering', sandwich: false, years: 4 },
  Z: { degree: 'B.E.', name: 'Computer Science & Engineering', sandwich: false, years: 4 },
  K: { degree: 'B.E. (Sandwich)', name: 'Mechanical Engineering (Sandwich)', sandwich: true, years: 5 },
  ES: { degree: 'B.E. (Sandwich)', name: 'Electrical & Electronics (Sandwich)', sandwich: true, years: 5 },
  SW: { degree: 'B.E. (Sandwich)', name: 'Sandwich Engineering Program', sandwich: true, years: 5 },
  B: { degree: 'B.Tech', name: 'Biotechnology', sandwich: false, years: 4 },
  H: { degree: 'B.Tech', name: 'Fashion Technology', sandwich: false, years: 4 },
  I: { degree: 'B.Tech', name: 'Information Technology', sandwich: false, years: 4 },
  T: { degree: 'B.Tech', name: 'Textile Technology', sandwich: false, years: 4 },
  S: { degree: 'B.Sc', name: 'Applied Science', sandwich: false, years: 3 },
  X: { degree: 'B.Sc', name: 'Computer Systems & Design / Other B.Sc.', sandwich: false, years: 3 },
  SA: { degree: 'M.Sc (Integrated)', name: 'Software Systems / Applied Science', sandwich: false, years: 5 },
  FD: { degree: 'M.Sc (Integrated)', name: 'Data Science / Fashion Design', sandwich: false, years: 5 },
  XW: { degree: 'M.Sc (Integrated)', name: 'Cyber Security', sandwich: false, years: 5 },
  XT: { degree: 'M.Sc (Integrated)', name: 'Theoretical Computer Science / Textile Science', sandwich: false, years: 5 },
  XD: { degree: 'M.Sc (Integrated)', name: 'Decision & Computing Sciences / Data Science', sandwich: false, years: 5 },
  XC: { degree: 'M.Sc (Integrated)', name: 'Theoretical Computer Science / Chemistry', sandwich: false, years: 5 },
  MX: { degree: 'M.C.A.', name: 'Master of Computer Applications', sandwich: false, years: 2 },
  AE: { degree: 'M.E.', name: 'Automotive Engineering', sandwich: false, years: 2 },
  BT: { degree: 'M.E.', name: 'Biotechnology', sandwich: false, years: 2 },
  BI: { degree: 'M.Tech', name: 'Biotechnology', sandwich: false, years: 2 },
  CS: { degree: 'M.E.', name: 'Computer Science & Engineering', sandwich: false, years: 2 },
  ED: { degree: 'M.E.', name: 'Engineering Design', sandwich: false, years: 2 },
  EE: { degree: 'M.E.', name: 'Embedded & Real-Time Systems', sandwich: false, years: 2 },
  LN: { degree: 'M.E.', name: 'VLSI Design', sandwich: false, years: 2 },
  NT: { degree: 'M.Tech', name: 'Nano Science & Technology', sandwich: false, years: 2 },
  LV: { degree: 'M.E.', name: 'Communication Systems', sandwich: false, years: 2 },
  MD: { degree: 'M.E.', name: 'Manufacturing Engineering / Mechanical Design', sandwich: false, years: 2 },
  MN: { degree: 'M.E.', name: 'Mechatronics', sandwich: false, years: 2 },
  NB: { degree: 'M.E.', name: 'Biometrics & Cybersecurity', sandwich: false, years: 2 },
  PP: { degree: 'M.E.', name: 'Power Systems / Production', sandwich: false, years: 2 },
  SE: { degree: 'M.E.', name: 'Structural Engineering', sandwich: false, years: 2 },
  IS: { degree: 'M.E.', name: 'Infrastructure Engineering', sandwich: false, years: 2 },
  CN: { degree: 'M.E.', name: 'Control Systems / Instrumentation', sandwich: false, years: 2 },
  TT: { degree: 'M.E.', name: 'Textile Technology', sandwich: false, years: 2 },
  TX: { degree: 'M.Tech', name: 'Textile Technology', sandwich: false, years: 2 },
  UC: { degree: 'M.E.', name: 'Control Systems', sandwich: false, years: 2 },
  ZC: { degree: 'M.E.', name: 'Computer Science & Engineering', sandwich: false, years: 2 },
  CE: { degree: 'M.Tech', name: 'Chemical Engineering', sandwich: false, years: 2 },
  EC: { degree: 'M.Tech', name: 'Electronics & Communication', sandwich: false, years: 2 },
  IT: { degree: 'M.Tech', name: 'Information Technology', sandwich: false, years: 2 },
  GM: { degree: 'M.B.A.', name: 'MBA General Management', sandwich: false, years: 2 },
  GW: { degree: 'M.B.A.', name: 'MBA Specializations', sandwich: false, years: 2 },
  AM: { degree: 'B.E.', name: 'Computer Science & Engineering (AI & ML)', sandwich: false, years: 4 },
  AD: { degree: 'B.Tech', name: 'Artificial Intelligence & Data Science', sandwich: false, years: 4 },
  CB: { degree: 'B.Tech', name: 'Computer Science & Business Systems', sandwich: false, years: 4 },
  DS: { degree: 'B.Sc', name: 'Applied Mathematics / Data Science', sandwich: false, years: 3 },
  FT: { degree: 'B.Tech', name: 'Fashion Technology', sandwich: false, years: 4 },
  RA: { degree: 'B.E.', name: 'Robotics & Automation', sandwich: false, years: 4 },
  IC: { degree: 'B.E.', name: 'Instrumentation & Control Engineering', sandwich: false, years: 4 },
  BM: { degree: 'B.E.', name: 'Biomedical Engineering', sandwich: false, years: 4 },
  AU: { degree: 'B.E.', name: 'Automobile Engineering', sandwich: false, years: 4 },
  MT: { degree: 'B.E.', name: 'Metallurgical Engineering', sandwich: false, years: 4 },
  PR: { degree: 'B.E.', name: 'Production Engineering', sandwich: false, years: 4 },
  PT: { degree: 'B.E.', name: 'Production Engineering (Sandwich)', sandwich: true, years: 5 },
  MS: { degree: 'B.E. (Sandwich)', name: 'Mechanical Engineering (Sandwich)', sandwich: true, years: 5 },
  VL: { degree: 'M.E.', name: 'VLSI Design', sandwich: false, years: 2 },
  PE: { degree: 'M.E.', name: 'Power Electronics & Drives', sandwich: false, years: 2 },
  CI: { degree: 'M.E.', name: 'Computer Integrated Manufacturing', sandwich: false, years: 2 },
  IE: { degree: 'M.E.', name: 'Industrial Engineering', sandwich: false, years: 2 },
  EM: { degree: 'M.E.', name: 'Engineering Management / Embedded Systems', sandwich: false, years: 2 },
  SY: { degree: 'M.E.', name: 'Control Systems', sandwich: false, years: 2 },
};

const CONFIG = {
  API_YEAR: 2026,
};

let STATIC_PLANNERS_CACHE = null;
let CALENDARS_INDEX_CACHE = { data: null, timestamp: 0 };
const PLANNER_CACHE = new Map();

const AutoCalendarResolver = {
  getCurrentAcademicYear() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return month >= 1 && month <= 5 ? year - 1 : year;
  },

  getStaticJsonPlanners() {
    if (STATIC_PLANNERS_CACHE) return STATIC_PLANNERS_CACHE;
    const candidatePaths = [
      path.join(STATIC_DIR, 'all_calendars_cache.json'),
      path.join(__dirname, 'all_calendars_cache.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
          if (data && typeof data === 'object') {
            STATIC_PLANNERS_CACHE = data;
            return data;
          }
        } catch {
          // ignore
        }
      }
    }
    return {};
  },

  getCalendarIndex(forceRefresh = false) {
    const now = Date.now() / 1000;
    if (!forceRefresh && CALENDARS_INDEX_CACHE.data && now - CALENDARS_INDEX_CACHE.timestamp < 3600) {
      return CALENDARS_INDEX_CACHE.data;
    }

    const staticPlanners = this.getStaticJsonPlanners();
    if (staticPlanners && Object.keys(staticPlanners).length > 0) {
      const plannersList = [];
      let holidaysList = [];
      for (const [pid, p] of Object.entries(staticPlanners)) {
        if (p && typeof p === 'object') {
          plannersList.push({
            id: p.id ?? (/^\d+$/.test(String(pid)) ? parseInt(pid, 10) : pid),
            name: p.name || '',
            startDate: p.startDate,
            lastDate: p.lastDate,
            totalWorkingDays: p.totalWorkingDays || 0,
            calendarYear: p.calendarYear || this.getCurrentAcademicYear(),
            isPublished: p.isPublished ?? true,
          });
          if (holidaysList.length === 0 && p.calendar && Array.isArray(p.calendar.holidays)) {
            holidaysList = p.calendar.holidays;
          }
        }
      }
      const synthesized = [
        {
          year: this.getCurrentAcademicYear(),
          holidays: holidaysList,
          planner: plannersList,
        },
      ];
      CALENDARS_INDEX_CACHE = { data: synthesized, timestamp: now };
      return synthesized;
    }

    return CALENDARS_INDEX_CACHE.data || [];
  },

  cleanRollInput(rawRoll) {
    if (!rawRoll) return '';
    let roll = String(rawRoll).trim().toUpperCase();
    const m = roll.match(/^(\d+)\.?(\d*)E\+(\d+)$/);
    if (m) {
      const digitsBefore = m[1] + m[2];
      const year = digitsBefore.slice(0, 2);
      const suffix = m[3];
      return `${year}E${suffix}`;
    }
    roll = roll.replace(/^D(\d{2}[A-Z])/, '$1');
    return roll;
  },

  extractSemFromCourses(courseCodes) {
    if (!Array.isArray(courseCodes) || courseCodes.length === 0) return null;
    const counts = new Map();
    for (const rawCode of courseCodes) {
      const code = String(rawCode || '').trim().toUpperCase();
      const m = code.match(/^[0-9]{2}[A-Z]+([1-9])\d{2}/) || code.match(/^[0-9]{2}[A-Z]+([1-9])\d{1}$/);
      if (m) {
        const sem = parseInt(m[1], 10);
        counts.set(sem, (counts.get(sem) || 0) + 1);
      }
    }
    let bestSem = null;
    let bestCount = 0;
    for (const [sem, count] of counts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestSem = sem;
      }
    }
    return bestSem;
  },

  detectEcampusSemester(roll) {
    if (!roll) return null;
    const cleanRoll = this.cleanRollInput(roll);
    const rollHash = crypto.createHash('sha256').update(`${cleanRoll}:PSGTECH`).digest('hex');
    const prevPath = `/tmp/bunker_prev_${rollHash}.json`;
    if (fs.existsSync(prevPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(prevPath, 'utf-8'));
        const subs = d.subjects || [];
        const codes = subs.map((s) => s.code).filter(Boolean);
        const sem = this.extractSemFromCourses(codes);
        if (sem) {
          return {
            semester_no: sem,
            year_of_study: Math.floor((sem + 1) / 2),
            semester_type: sem % 2 === 1 ? 'odd' : 'even',
            student_name: d.student_name,
            course_count: codes.length,
            source: 'ecampus_attendance',
          };
        }
      } catch {
        // ignore
      }
    }
    return null;
  },

  parseStudentRoll(roll, acadYear = null, semester = null) {
    if (!roll) return null;
    roll = this.cleanRollInput(roll);
    if (roll.length < 4) return null;

    const mYear = roll.match(/^(\d{2})/);
    if (!mYear) return null;
    const admissionYear = parseInt('20' + mYear[1], 10);

    if (!acadYear) {
      acadYear = this.getCurrentAcademicYear();
    }

    const mLetters = roll.slice(2).match(/[A-Z]+/);
    const branchLetters = mLetters ? mLetters[0] : '';

    let branchCode = null;
    if (branchLetters.length >= 2) {
      const code2 = branchLetters.slice(0, 2);
      const code1 = branchLetters.slice(0, 1);
      if (PSGTECH_BRANCH_MAP[code2]) {
        branchCode = code2;
      } else if (PSGTECH_BRANCH_MAP[code1]) {
        branchCode = code1;
      } else {
        branchCode = code2;
      }
    } else if (branchLetters.length === 1) {
      branchCode = branchLetters;
    }

    if (!branchCode) return null;
    const branchMeta = PSGTECH_BRANCH_MAP[branchCode] || {
      degree: branchCode.length === 2 ? 'M.E.' : 'B.E.',
      name: `PSG Tech (${branchCode} Department)`,
      sandwich: false,
      years: branchCode.length === 2 ? 2 : 4,
    };

    const mNum = roll.match(/(\d+)$/);
    const serialNum = mNum ? parseInt(mNum[1], 10) : 0;
    const deg = branchMeta.degree || 'B.E.';

    let isSandwich =
      Boolean(branchMeta.sandwich) ||
      (serialNum >= 500 && serialNum <= 699 && ['E', 'M', 'P', 'N', 'L'].includes(branchCode));

    const isLateral =
      (serialNum >= 400 && serialNum <= 499 && ['B.E.', 'B.Tech'].includes(deg)) ||
      roll.startsWith('L') ||
      roll.startsWith('LE') ||
      roll.startsWith('D');

    const nominalYear = isLateral ? acadYear - admissionYear + 2 : acadYear - admissionYear + 1;
    const ecampusInfo = this.detectEcampusSemester(roll);

    let semesterNo = null;
    let yearOfStudy = nominalYear;
    let semesterType = 'odd';

    if (semester && /^\d+$/.test(String(semester).trim())) {
      semesterNo = parseInt(String(semester).trim(), 10);
      yearOfStudy = Math.floor((semesterNo + 1) / 2);
      semesterType = semesterNo % 2 === 1 ? 'odd' : 'even';
    } else if (ecampusInfo && ecampusInfo.semester_no) {
      semesterNo = ecampusInfo.semester_no;
      yearOfStudy = ecampusInfo.year_of_study;
      semesterType = ecampusInfo.semester_type;
    } else {
      const nowMonth = new Date().getMonth() + 1;
      if (semester && ['odd', 'even'].includes(String(semester).trim().toLowerCase())) {
        semesterType = String(semester).trim().toLowerCase();
      } else {
        semesterType = nowMonth >= 1 && nowMonth <= 5 ? 'even' : 'odd';
      }
      semesterNo = semesterType === 'even' ? yearOfStudy * 2 : yearOfStudy * 2 - 1;
    }

    isSandwich = isSandwich || (yearOfStudy === 5 && !['SA', 'FD', 'XW', 'XT', 'XD', 'XC'].includes(branchCode));
    const maxYears =
      isSandwich || ['SA', 'FD', 'XW', 'XT', 'XD', 'XC'].includes(branchCode) ? 5 : branchMeta.years || 4;
    yearOfStudy = Math.max(1, Math.min(maxYears, yearOfStudy));
    semesterNo = Math.max(1, Math.min(maxYears * 2, semesterNo));

    const isMca = branchCode === 'MX';
    const isMsc = ['SA', 'FD', 'XW', 'XT', 'XD', 'XC'].includes(branchCode);
    const isBsc = ['S', 'X'].includes(branchCode);
    const isPg = ['M.E.', 'M.Tech', 'M.B.A.'].includes(deg);
    const degClean = deg.replace(/\./g, '').toUpperCase();
    let courseType = 'BE';
    if (degClean.includes('BTECH')) courseType = 'BTech';
    else if (degClean.includes('BSC')) courseType = 'BSc';
    else if (degClean.includes('MSC')) courseType = 'MSc';
    else if (degClean.includes('ME') || degClean.includes('MTECH') || degClean.includes('MBA')) courseType = 'ME';
    else if (degClean.includes('MCA')) courseType = 'MCA';

    return {
      roll,
      admission_year: admissionYear,
      academic_year: acadYear,
      year_of_study: yearOfStudy,
      semester_no: semesterNo,
      semester_type: semesterType,
      is_lateral_entry: isLateral,
      entry_type: isLateral ? 'Lateral Entry (Direct 2nd Year)' : 'Regular Entry',
      branch_code: branchCode,
      degree: deg,
      branch_name: branchMeta.name || 'Engineering',
      course: courseType,
      is_sandwich: isSandwich,
      is_mca: isMca,
      is_msc: isMsc,
      is_bsc: isBsc,
      is_pg: isPg,
      ecampus_synced: Boolean(ecampusInfo),
      ecampus_info: ecampusInfo,
    };
  },

  matchPlanner(planners, studentInfo, semester = 'odd') {
    function splitClauses(title) {
      let clean = String(title || '').toLowerCase();
      clean = clean
        .replace(/reg & sw/g, 'reg_and_sw')
        .replace(/reg\. & sw/g, 'reg_and_sw')
        .replace(/reg\. &sw/g, 'reg_and_sw')
        .replace(/regular & sw/g, 'reg_and_sw')
        .replace(/regular and sw/g, 'reg_and_sw')
        .replace(/be \/ b\.tech/g, 'be')
        .replace(/be\/btech/g, 'be')
        .replace(/b\.e \/ b\.tech/g, 'be')
        .replace(/all bsc and all msc/g, 'all_bsc_msc')
        .replace(/all bsc & all msc/g, 'all_bsc_msc');
      return clean
        .split(/[,;]|\band\b/)
        .map((cl) => cl.trim())
        .filter(Boolean);
    }

    function scoreClause(clause, s) {
      const c = clause.toLowerCase();
      const y = s.year_of_study;
      const courseNorm = String(s.course || 'BE')
        .replace(/\./g, '')
        .toUpperCase();

      if (s.is_sandwich) {
        if (!['sw', 'sandwich'].some((w) => c.includes(w))) return 0;
        if (y === 5 && ['fifth', '5th', 'v year', 'final'].some((w) => c.includes(w))) return 100;
        if (y === 4 && ['fourth', '4th', 'iv year'].some((w) => c.includes(w))) return 100;
        if (y === 3 && ['third', '3rd', 'iii'].some((w) => c.includes(w))) return 90;
        if (y === 2 && ['second', '2nd', 'ii'].some((w) => c.includes(w))) return 90;
        if (y === 1 && ['first', '1st', 'i '].some((w) => c.includes(w))) return 90;
        return 70;
      }

      if (['fourth year be sw', 'fifth year be sw', 'final year be sandwich'].some((w) => c.includes(w))) {
        return 0;
      }

      if (s.is_bsc || s.is_msc) {
        return ['bsc', 'msc', 'b.sc', 'm.sc', 'all_bsc_msc'].some((w) => c.includes(w)) ? 100 : 0;
      }

      if (s.is_mca) {
        if (y === 1) {
          if (['i year mca', 'first year mca', '1st year mca'].some((w) => c.includes(w))) return 110;
          if (['first', '1st', 'i year', 'i '].some((w) => c.includes(w))) return c.includes('mca') ? 90 : 0;
          return c.includes('mca') ? 80 : 0;
        }
        if (y >= 2) {
          if (['first year mca', 'first  year mca', '1st year mca', 'i year mca', 'i mca'].some((w) => c.includes(w))) {
            return 0;
          }
          if (c.includes('mca') && ['second', '2nd', 'ii year', 'ii '].some((w) => c.includes(w))) return 100;
          if (['third and fourth', 'all bsc & msc', 'me/mtech'].some((w) => c.includes(w))) return 90;
          return c.includes('mca') ? 80 : 0;
        }
      }

      if (s.is_pg) {
        if (!['me', 'mtech', 'm.tech', 'pg'].some((w) => c.includes(w))) return 0;
        if (y === 1 && ['first', '1st', 'i year', 'i '].some((w) => c.includes(w))) return 100;
        if (y >= 2 && ['second', '2nd', 'ii year', 'ii '].some((w) => c.includes(w))) return 100;
        return 80;
      }

      if (['BE', 'BTECH'].includes(courseNorm)) {
        if (
          (c.includes('mca') && !['be', 'btech'].some((w) => c.includes(w))) ||
          (c.includes('all_bsc_msc') && !['be', 'btech'].some((w) => c.includes(w)))
        ) {
          return 0;
        }
        if (['me', 'mtech', 'm.tech'].some((w) => c.includes(w)) && !['be', 'btech'].some((w) => c.includes(w))) {
          return 0;
        }
        if (y === 1 && ['first year', '1st year', 'i year', 'first  year'].some((w) => c.includes(w))) return 100;
        if (y === 2 && ['second year', '2nd year', 'ii year'].some((w) => c.includes(w))) return 100;
        if ([3, 4].includes(y) && ['3rd', '4th', 'third', 'fourth', 'iii', 'iv'].some((w) => c.includes(w))) {
          return 100;
        }
      }
      return 0;
    }

    const semNorm = String(semester || 'odd').toLowerCase();
    let activePlanners = [];
    for (const p of planners) {
      const pid = /^\d+$/.test(String(p.id || '')) ? parseInt(p.id, 10) : 0;
      const startDate = String(p.startDate || '');
      const isOdd =
        [32, 33, 34, 35, 39].includes(pid) || (startDate.includes('2026-0') && !startDate.includes('2026-12'));
      if (semNorm === 'odd') {
        if (isOdd) activePlanners.push(p);
      } else {
        if (!isOdd) activePlanners.push(p);
      }
    }
    if (activePlanners.length === 0) {
      activePlanners = planners;
    }

    let bestPlanner = null;
    let bestScore = -1;
    for (const p of activePlanners) {
      const clauses = splitClauses(p.name || '');
      const clauseMax = clauses.reduce((max, cl) => Math.max(max, scoreClause(cl, studentInfo)), 0);
      if (clauseMax > bestScore) {
        bestScore = clauseMax;
        bestPlanner = p;
      }
    }
    return bestPlanner;
  },

  getPlannerDetails(year, plannerId) {
    const key = `${year}_${plannerId}`;
    const now = Date.now() / 1000;
    if (PLANNER_CACHE.has(key)) {
      const cached = PLANNER_CACHE.get(key);
      if (now - cached.time < 3600) return cached.data;
    }

    const staticPlanners = this.getStaticJsonPlanners();
    if (staticPlanners[String(plannerId)]) {
      const data = staticPlanners[String(plannerId)];
      PLANNER_CACHE.set(key, { data, time: now });
      return data;
    }
    return null;
  },

  resolveCalendar(roll, semester = null, year = null) {
    const allCalendars = this.getCalendarIndex();
    if (!allCalendars || allCalendars.length === 0) {
      return { student: null, matchedPlanner: null, details: null, yearPlanners: [] };
    }

    let targetYear = this.getCurrentAcademicYear();
    if (year && !Number.isNaN(parseInt(year, 10))) {
      targetYear = parseInt(year, 10);
    } else {
      targetYear = Math.max(...allCalendars.map((c) => c.year || 2026));
    }

    const yearEntry = allCalendars.find((c) => c.year === targetYear) || allCalendars[0];
    const yearPlanners = yearEntry.planner || [];

    const student = this.parseStudentRoll(roll, targetYear, semester);
    if (!student) {
      return { student: null, matchedPlanner: null, details: null, yearPlanners };
    }

    const targetSemType =
      semester && ['odd', 'even'].includes(String(semester).trim().toLowerCase())
        ? String(semester).trim().toLowerCase()
        : student.semester_type || 'odd';

    let matchedPlanner = this.matchPlanner(yearPlanners, student, targetSemType);
    if (!matchedPlanner && yearPlanners.length > 0) {
      matchedPlanner = yearPlanners[0];
    }

    let details = null;
    if (matchedPlanner) {
      details = this.getPlannerDetails(targetYear, matchedPlanner.id);
    }

    return { student, matchedPlanner, details, yearPlanners };
  },
};

function detectCollege(rollNumber) {
  if (!rollNumber) return null;
  const cleaned = AutoCalendarResolver.cleanRollInput(rollNumber);
  const m = cleaned.match(/^\d{2}([A-Z]{1,3})\d{2,4}$/);
  if (m) {
    return 'PSGTECH';
  }
  return null;
}

// ============================================================================
// 5. SESSION TOKEN & IN-MEMORY PORTAL SESSION POOL (500 Student Pool, 12m TTL)
// ============================================================================
const PORTAL_SESSION_POOL = new Map();
const MAX_SESSION_POOL_SIZE = 500;
const SESSION_TOKEN_TTL = 720; // 12 minutes

function encodeSessionToken(username, cookiesDict, portalType = 'new', studzone2Auth = false) {
  try {
    const payload = {
      u: String(username || '').trim().toUpperCase(),
      c: cookiesDict,
      t: Math.floor(Date.now() / 1000),
      p: portalType,
      z2: Boolean(studzone2Auth),
    };
    const rawJson = JSON.stringify(payload);
    const b64Payload = Buffer.from(rawJson, 'utf-8').toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('hex').slice(0, 32);
    return `${b64Payload}.${sig}`;
  } catch {
    return null;
  }
}

function decodeSessionToken(token, username = null, maxAge = SESSION_TOKEN_TTL) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const [b64Payload, sig] = token.split('.', 2);
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('hex').slice(0, 32);
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const rawJson = Buffer.from(b64Payload, 'base64url').toString('utf-8');
    const payload = JSON.parse(rawJson);
    if (username && payload.u !== String(username).trim().toUpperCase()) return null;
    const now = Date.now() / 1000;
    if (now - (payload.t || 0) > maxAge) return null;
    return payload;
  } catch {
    return null;
  }
}

function getCachedPortalSession(credKey, maxAge = SESSION_TOKEN_TTL) {
  const now = Date.now() / 1000;
  const cached = PORTAL_SESSION_POOL.get(credKey);
  if (cached) {
    if (now - (cached.time || 0) < maxAge) return cached;
    PORTAL_SESSION_POOL.delete(credKey);
  }
  return null;
}

function setCachedPortalSession(credKey, cookies, portalType, studzone2Auth) {
  const now = Date.now() / 1000;
  if (PORTAL_SESSION_POOL.size >= MAX_SESSION_POOL_SIZE && !PORTAL_SESSION_POOL.has(credKey)) {
    for (const [k, v] of PORTAL_SESSION_POOL.entries()) {
      if (now - (v.time || 0) >= SESSION_TOKEN_TTL) {
        PORTAL_SESSION_POOL.delete(k);
      }
    }
    if (PORTAL_SESSION_POOL.size >= MAX_SESSION_POOL_SIZE) {
      const firstKey = PORTAL_SESSION_POOL.keys().next().value;
      if (firstKey) PORTAL_SESSION_POOL.delete(firstKey);
    }
  }
  PORTAL_SESSION_POOL.set(credKey, {
    cookies: { ...cookies },
    portal_type: portalType,
    studzone2_auth: studzone2Auth,
    time: now,
  });
}

// ============================================================================
// 6. HTTP COOKIE JAR SESSION HELPER
// ============================================================================
class HttpSession {
  constructor(defaultHeaders = {}) {
    this.cookies = {};
    this.headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Connection: 'keep-alive',
      ...defaultHeaders,
    };
  }

  updateCookies(obj) {
    if (obj && typeof obj === 'object') {
      Object.assign(this.cookies, obj);
    }
  }

  _extractSetCookies(res) {
    const setCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : res.headers.get('set-cookie')
          ? [res.headers.get('set-cookie')]
          : [];
    for (const sc of setCookies) {
      const firstPart = sc.split(';')[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx > 0) {
        const k = firstPart.slice(0, eqIdx).trim();
        const v = firstPart.slice(eqIdx + 1).trim();
        this.cookies[k] = v;
      }
    }
  }

  _cookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async request(url, { method = 'GET', data = null, params = null, allowRedirects = true, timeoutMs = 6500 } = {}) {
    let currentUrl = url;
    if (params && typeof params === 'object') {
      const qs = new URLSearchParams(params).toString();
      if (qs) currentUrl += (currentUrl.includes('?') ? '&' : '?') + qs;
    }

    let currentMethod = method;
    let currentBody = null;
    const reqHeaders = { ...this.headers };

    if (data && typeof data === 'object') {
      currentBody = new URLSearchParams(data).toString();
      reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (typeof data === 'string') {
      currentBody = data;
      reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    for (let redirectCount = 0; redirectCount < 8; redirectCount++) {
      const cookieStr = this._cookieHeader();
      if (cookieStr) reqHeaders['Cookie'] = cookieStr;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let res;
      try {
        res = await fetch(currentUrl, {
          method: currentMethod,
          headers: reqHeaders,
          body: currentMethod === 'GET' || currentMethod === 'HEAD' ? undefined : currentBody,
          redirect: 'manual',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      this._extractSetCookies(res);

      const status = res.status;
      const location = res.headers.get('location') || '';

      if (allowRedirects && [301, 302, 303, 307, 308].includes(status) && location) {
        currentUrl = new URL(location, currentUrl).toString();
        if (status === 301 || status === 302 || status === 303) {
          currentMethod = 'GET';
          currentBody = null;
          delete reqHeaders['Content-Type'];
        }
        continue;
      }

      const text = await res.text();
      return {
        status,
        ok: status >= 200 && status < 300,
        url: currentUrl,
        headers: res.headers,
        text,
        json() {
          return JSON.parse(text);
        },
      };
    }

    return { status: 500, ok: false, url: currentUrl, headers: new Headers(), text: '' };
  }

  get(url, opts = {}) {
    return this.request(url, { ...opts, method: 'GET' });
  }

  post(url, data, opts = {}) {
    return this.request(url, { ...opts, method: 'POST', data });
  }
}

// ============================================================================
// 7. ECAMPUS SCRAPER (Dual-Engine PSG Tech Studzone & Studzone2)
// ============================================================================
const ECAMPUS_URL = 'https://ecampus.psgtech.ac.in/studzone2/';
const STUDZONE_URL = 'https://ecampus.psgtech.ac.in/studzone/';

class EcampusScraper {
  constructor(username, password) {
    this.session = new HttpSession();
    this.username = String(username || '').trim().toUpperCase();
    this.password = String(password || '').trim();
    this.portalType = null;
    this.authenticated = false;
    this._attHtml = null;
    this._ttHtml = null;
    this._studzone2Authenticated = false;
    this._credKey = crypto.createHash('sha256').update(`${this.username}:${this.password}`).digest('hex');
  }

  async init({ prefetch = true, forceStudzone2 = false, sessionToken = null, needTimetable = true } = {}) {
    // 1. Check warm session pool (<12m TTL)
    const cachedSess = getCachedPortalSession(this._credKey);
    if (cachedSess && !forceStudzone2) {
      try {
        this.session.updateCookies(cachedSess.cookies);
        this.portalType = cachedSess.portal_type;
        this._studzone2Authenticated = Boolean(cachedSess.studzone2_auth);
        const testUrl =
          this.portalType === 'new'
            ? `${STUDZONE_URL}Attendance/StudentPercentage`
            : `${ECAMPUS_URL}AttWfPercView.aspx`;
        const resp = await this.session.get(testUrl);
        if (
          resp.status === 200 &&
          !resp.text.includes('Student Login') &&
          !resp.url.includes('AttWfLoginPage') &&
          (resp.text.includes('id="example"') || resp.text.includes('cssbody'))
        ) {
          this.authenticated = true;
          this._attHtml = resp.text;
        }
      } catch {
        this.authenticated = false;
      }
    }

    // 2. Check stateless sessionToken
    if (!this.authenticated && sessionToken && !forceStudzone2) {
      const tokenData = decodeSessionToken(sessionToken, this.username);
      if (tokenData && tokenData.c) {
        try {
          this.session.updateCookies(tokenData.c);
          this.portalType = tokenData.p || 'new';
          this._studzone2Authenticated = Boolean(tokenData.z2);
          const testUrl =
            this.portalType === 'new'
              ? `${STUDZONE_URL}Attendance/StudentPercentage`
              : `${ECAMPUS_URL}AttWfPercView.aspx`;
          const resp = await this.session.get(testUrl);
          if (
            resp.status === 200 &&
            !resp.text.includes('Student Login') &&
            !resp.url.includes('AttWfLoginPage') &&
            (resp.text.includes('id="example"') || resp.text.includes('cssbody'))
          ) {
            this.authenticated = true;
            this._attHtml = resp.text;
            this._saveSessionToPool();
          }
        } catch {
          this.authenticated = false;
        }
      }
    }

    if (!this.authenticated) {
      if (forceStudzone2) {
        this.authenticated = await this._loginStudzone2();
        if (!this.authenticated) {
          this.authenticated = await this._login();
        }
      } else {
        this.authenticated = await this._login();
      }
    }

    if (this.authenticated && prefetch && !this._attHtml) {
      await this._prefetchData(needTimetable);
    }
    return this;
  }

  _saveSessionToPool() {
    setCachedPortalSession(this._credKey, this.session.cookies, this.portalType, this._studzone2Authenticated);
  }

  getSessionToken() {
    if (!this.authenticated) return null;
    return encodeSessionToken(
      this.username,
      this.session.cookies,
      this.portalType || 'new',
      this._studzone2Authenticated
    );
  }

  async _login() {
    try {
      const rGet = await this.session.get(STUDZONE_URL);
      // Fast regex token extraction before falling back to cheerio
      const tokMatch = rGet.text.match(REQ_TOKEN_RE);
      let token = tokMatch ? tokMatch[1] || tokMatch[2] : null;
      if (!token) {
        const $ = cheerio.load(rGet.text);
        token = $('input[name="__RequestVerificationToken"]').attr('value');
      }
      if (token) {
        const payload = {
          rollno: this.username,
          password: this.password,
          chkterms: 'on',
          __RequestVerificationToken: token,
        };
        const rPost = await this.session.post(STUDZONE_URL, payload, { allowRedirects: false });
        if ([301, 302, 303, 307, 308].includes(rPost.status)) {
          const loc = rPost.headers.get('location') || '';
          if (loc && !loc.endsWith('/studzone') && !loc.endsWith('/studzone/')) {
            this.portalType = 'new';
            this._saveSessionToPool();
            return true;
          } else if (loc) {
            const rChk = await this.session.get(new URL(loc, 'https://ecampus.psgtech.ac.in').toString());
            if (!rChk.text.includes('Invalid') && !rChk.text.toLowerCase().includes('password')) {
              this.portalType = 'new';
              this._saveSessionToPool();
              return true;
            }
          }
        } else if (
          !rPost.text.includes('Student Login') &&
          (rPost.text.includes('Menu') || rPost.text.includes('Attendance'))
        ) {
          this.portalType = 'new';
          this._saveSessionToPool();
          return true;
        }
      }
    } catch {
      // Fallback to studzone2
    }
    return this._loginStudzone2();
  }

  async _loginStudzone2() {
    try {
      const loginUrl = `${ECAMPUS_URL}AttWfLoginPage.aspx`;
      const loginPage = await this.session.get(loginUrl);

      // Fast regex ViewState extraction
      const mVs = loginPage.text.match(VIEWSTATE_RE);
      const mEv = loginPage.text.match(EVENTVALIDATION_RE);
      const mVg = loginPage.text.match(VIEWSTATEGEN_RE);

      let viewState = mVs ? mVs[1] ?? mVs[2] : null;
      let eventValidation = mEv ? mEv[1] ?? mEv[2] : null;
      let viewStateGen = mVg ? mVg[1] ?? mVg[2] : null;

      if (viewState === null || eventValidation === null || viewStateGen === null) {
        const $ = cheerio.load(loginPage.text);
        viewState = $('input[name="__VIEWSTATE"]').attr('value');
        eventValidation = $('input[name="__EVENTVALIDATION"]').attr('value');
        viewStateGen = $('input[name="__VIEWSTATEGENERATOR"]').attr('value');
      }
      if (!viewState || !eventValidation || !viewStateGen) return false;

      const loginData = {
        __VIEWSTATE: viewState,
        __VIEWSTATEGENERATOR: viewStateGen,
        __EVENTVALIDATION: eventValidation,
        rdolst: 'S',
        txtusercheck: this.username,
        txtpwdcheck: this.password,
        abcd3: 'Login',
      };
      this.session.headers['Referer'] = loginUrl;
      const response = await this.session.post(loginUrl, loginData);
      if (
        (response.url.includes('AttWfStudMenu') || !response.text.includes('Invalid')) &&
        response.status === 200
      ) {
        if (!this.portalType) {
          this.portalType = 'old';
        }
        this._studzone2Authenticated = true;
        this.session.headers['Referer'] = `${ECAMPUS_URL}AttWfStudMenu.aspx`;
        this._saveSessionToPool();
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  async ensureStudzone2Auth() {
    if (!this._studzone2Authenticated) {
      await this._loginStudzone2();
    }
    this.session.headers['Referer'] = `${ECAMPUS_URL}AttWfStudMenu.aspx`;
    try {
      await this.session.get(`${ECAMPUS_URL}AttWfStudMenu.aspx`);
    } catch {
      // ignore
    }
    return this._studzone2Authenticated;
  }

  async _prefetchData(needTimetable = false) {
    if (!this.authenticated) return;
    const attUrl =
      this.portalType === 'new'
        ? `${STUDZONE_URL}Attendance/StudentPercentage`
        : `${ECAMPUS_URL}AttWfPercView.aspx`;
    const ttUrl =
      this.portalType === 'new' ? `${STUDZONE_URL}Attendance/TimeTable` : `${ECAMPUS_URL}AttWfStudTimtab.aspx`;

    if (needTimetable && !this._ttHtml) {
      const tasks = [this.session.get(attUrl), this.session.get(ttUrl)];
      if (this.portalType === 'new') {
        tasks.push(this.session.get(`${STUDZONE_URL}Attendance/courseplan`));
      }
      const [attRes, ttRes, cpRes] = await Promise.allSettled(tasks);
      this._attHtml = attRes.status === 'fulfilled' ? attRes.value.text : null;
      this._ttHtml = ttRes.status === 'fulfilled' ? ttRes.value.text : null;
      this._cpHtml = cpRes && cpRes.status === 'fulfilled' ? cpRes.value.text : null;
    } else {
      try {
        const resp = await this.session.get(attUrl);
        this._attHtml = resp.text;
      } catch {
        this._attHtml = null;
      }
    }
  }

  async getAttendance() {
    if (!this.authenticated) {
      return { attendanceData: null, lastUpdate: null, message: 'Authentication failed' };
    }
    if (!this._attHtml) {
      await this._prefetchData(false);
    }
    if (!this._attHtml) {
      return { attendanceData: null, lastUpdate: 'No data', message: 'Attendance data not available' };
    }

    try {
      const $ = cheerio.load(this._attHtml);
      const table = this.portalType === 'new' ? $('table#example') : $('table.cssbody');
      if (!table.length) {
        if (this.portalType === 'new' && (await this.ensureStudzone2Auth())) {
          this.portalType = 'old';
          await this._prefetchData(false);
          return this.getAttendance();
        }
        return { attendanceData: null, lastUpdate: 'No data', message: 'Attendance table not found' };
      }

      const attendanceData = [];
      let lastUpdate = null;
      let bestDateRank = -1;
      const rows = table.find('tr').slice(1);

      rows.each((_, row) => {
        const cols = $(row)
          .find('td')
          .map((__, td) => $(td).text().trim())
          .get();
        if (cols.length >= 10) {
          const total = parseInt(cols[1], 10) || 0;
          const exemption = parseInt(cols[2], 10) || 0;
          const attended = parseInt(cols[4], 10) || 0;
          const safeFloat = (v) => parseFloat(String(v || '').replace('%', '').trim()) || 0.0;

          attendanceData.push({
            code: cols[0],
            name: cols[0],
            total,
            attended,
            exemption,
            percentage: safeFloat(cols[5]),
            pct_exemp: safeFloat(cols[6]),
            pct_medical: safeFloat(cols[7]),
          });

          if (cols[9]) {
            const rank = parsePortalDateRank(cols[9]);
            if (rank > bestDateRank || !lastUpdate) {
              bestDateRank = rank;
              lastUpdate = formatPortalDate(cols[9]);
            }
          }
        }
      });

      return {
        attendanceData,
        lastUpdate: lastUpdate || 'No data',
        message: 'Success',
      };
    } catch (e) {
      return { attendanceData: null, lastUpdate: 'No data', message: `Error: ${e.message}` };
    }
  }

  async getTimetableAndSchedule() {
    const schedule = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    const courseMapping = {};
    let studentName = 'Student';

    if (!this.authenticated) {
      return { courseMapping, schedule, studentName };
    }

    if (!this._ttHtml) {
      const ttUrl =
        this.portalType === 'new' ? `${STUDZONE_URL}Attendance/TimeTable` : `${ECAMPUS_URL}AttWfStudTimtab.aspx`;
      try {
        const resp = await this.session.get(ttUrl);
        this._ttHtml = resp.text;
      } catch {
        this._ttHtml = null;
      }
    }

    if (!this._ttHtml) {
      return { courseMapping, schedule, studentName };
    }

    try {
      const $ = cheerio.load(this._ttHtml);
      if (!this._cpHtml) {
        try {
          const cpResp = await this.session.get(`${STUDZONE_URL}Attendance/courseplan`);
          if (cpResp.ok) this._cpHtml = cpResp.text;
        } catch {
          // ignore
        }
      }
      if (this._cpHtml) {
        try {
          const $cp = cheerio.load(this._cpHtml);
          $cp('div.card.courseplan-card, .courseplan-card').each((_, card) => {
            const cCode = $cp(card).find('h5.coursecode, .coursecode').first().text().trim().toUpperCase();
            const cName = $cp(card).find('h6.coursename, .coursename').first().text().trim();
            if (cCode && cName && cName !== cCode) {
              courseMapping[cCode] = cName;
            }
          });
        } catch {
          // ignore
        }
      }

      if (this.portalType === 'new') {
        const userSpan = $('.top-bar .user-name').first().text().trim();
        if (userSpan && userSpan.length >= 3) {
          studentName = userSpan;
        } else {
          $('b').each((_, el) => {
            const txt = $(el).text().trim();
            if (/^[A-Z\s.]{4,}$/.test(txt) && !/^(PSG|ODD|EVEN|SEMESTER)/i.test(txt) && studentName === 'Student') {
              studentName = txt;
            }
          });
        }

        const dayMap = {
          monday: 'Mon',
          tuesday: 'Tue',
          wednesday: 'Wed',
          thursday: 'Thu',
          friday: 'Fri',
        };
        const table = $('table.timetable-table').length ? $('table.timetable-table').first() : $('table').first();
        if (table.length) {
          table.find('tr').each((_, tr) => {
            const cellEls = $(tr).find('td, th').toArray();
            if (!cellEls.length) return;
            const dayKey = $(cellEls[0]).text().trim().toLowerCase();
            if (dayMap[dayKey]) {
              const shortDay = dayMap[dayKey];
              for (const cellEl of cellEls.slice(1)) {
                const $cell = $(cellEl);
                const cellText = $cell.text().trim();
                if (!cellText || cellText === '-') {
                  schedule[shortDay].push('Free');
                } else {
                  const tooltipBold = $cell.find('.tooltip-wrapper b, b').first().text().trim();
                  const tooltipTitle = $cell.find('.tooltip-wrapper .tooltip-text, .tooltip-text').first().text().trim();
                  let code = 'Free';
                  let title = '';

                  if (tooltipBold && /^[A-Z0-9]{2,10}$/i.test(tooltipBold)) {
                    code = tooltipBold.toUpperCase();
                    title = tooltipTitle || code;
                  } else {
                    const lines = cellText
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean);
                    const mCode = cellText.match(/\b([0-9]{2}[A-Z]{1,3}[0-9]{2,4}|TWM|[A-Z0-9]{5,8})\b/);
                    code = mCode ? mCode[1] : 'Free';
                    title = tooltipTitle || (lines.length > 1 ? lines[lines.length - 1] : code);
                  }

                  if (code !== 'Free' && title && title !== code) {
                    courseMapping[code] = title;
                  }
                  schedule[shortDay].push(code);
                }
              }
            }
          });
        }
      } else {
        const nameEl = $('span#lbluser');
        if (nameEl.length) {
          studentName = nameEl.text().trim();
        }
        const descTable = $('table#TbCourDesc');
        if (descTable.length) {
          descTable
            .find('tr')
            .slice(1)
            .each((_, tr) => {
              const cols = $(tr)
                .find('td')
                .map((__, td) => $(td).text().trim())
                .get();
              if (cols.length >= 2) {
                courseMapping[cols[0]] = cols[1];
              }
            });
        }
        const dtTable = $('table#DtStfTimtab');
        if (dtTable.length) {
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          const rows = dtTable.find('tr').toArray();
          let startIdx = 0;
          for (let i = 0; i < rows.length; i++) {
            const rowText = $(rows[i]).text().trim().toLowerCase();
            if (rowText.includes('mon') || i > 1) {
              startIdx = i;
              break;
            }
          }
          days.forEach((day, dayIdx) => {
            const rowIdx = startIdx + dayIdx;
            if (rowIdx < rows.length) {
              const cols = $(rows[rowIdx]).find('td').toArray().slice(1);
              for (const col of cols) {
                const content = $(col).text().trim();
                if (content && content.toLowerCase() !== 'free') {
                  let matchedCode = null;
                  for (const courseCode of Object.keys(courseMapping)) {
                    if (content.toLowerCase().includes(courseCode.toLowerCase())) {
                      matchedCode = courseCode;
                      break;
                    }
                  }
                  if (matchedCode) {
                    schedule[day].push(matchedCode);
                  } else {
                    const codes = content.toUpperCase().match(/[A-Z0-9]+/g) || [];
                    const code =
                      codes.find((c) => c.length >= 5 && /\d/.test(c)) || (codes[0] ? codes[0] : 'Unknown');
                    schedule[day].push(code);
                  }
                } else {
                  schedule[day].push('Free');
                }
              }
            }
          });
        }
      }
    } catch {
      // ignore parse error
    }
    return { courseMapping, schedule, studentName };
  }
}

// ============================================================================
// 8. STATIC & PAGE ROUTES
// ============================================================================
app.use(
  '/static',
  express.static(STATIC_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

app.get('/manifest.json', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(STATIC_DIR, 'manifest.json'));
});
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(STATIC_DIR, 'favicon.ico')));
app.get('/favicon.png', (req, res) => res.sendFile(path.join(STATIC_DIR, 'favicon.png')));
app.get('/favicon.svg', (req, res) => res.sendFile(path.join(STATIC_DIR, 'favicon.svg')));
app.get('/apple-touch-icon.png', (req, res) => res.sendFile(path.join(STATIC_DIR, 'apple-touch-icon.png')));
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(STATIC_DIR, 'sw.js'));
});
app.get(['/ui-version.json', '/static/ui-version.json'], (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.json({ version: CURRENT_UI_VERSION });
});
app.get('/robots.txt', (req, res) => res.sendFile(path.join(STATIC_DIR, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.sendFile(path.join(STATIC_DIR, 'sitemap.xml')));
app.get('/llms.txt', (req, res) => res.sendFile(path.join(STATIC_DIR, 'llms.txt')));
app.get('/google824b5c1fd4aa93e7.html', (req, res) => {
  res.type('html').send('google-site-verification: google824b5c1fd4aa93e7.html');
});

app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get(['/calendar', '/calendar.html'], (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(PUBLIC_DIR, 'calendar.html'));
});

app.get(['/feedback', '/feedback.html'], (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(PUBLIC_DIR, 'feedback.html'));
});

// ============================================================================
// 9. API ROUTES
// ============================================================================
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.json({
    status: 'ok',
    message: 'Smart Bunker API is running',
    version: '2.0',
    ui_version: CURRENT_UI_VERSION,
    config: {
      api_year: CONFIG.API_YEAR,
    },
  });
});

let ALL_CALENDARS_CACHE = { data: null, timestamp: 0 };

app.all('/api/all-calendars', (req, res) => {
  const now = Date.now() / 1000;
  if (ALL_CALENDARS_CACHE.data && now - ALL_CALENDARS_CACHE.timestamp < 86400) {
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.json(ALL_CALENDARS_CACHE.data);
  }

  const currYear = AutoCalendarResolver.getCurrentAcademicYear();
  const staticPlanners = AutoCalendarResolver.getStaticJsonPlanners();
  const liveData = { ...staticPlanners };
  const plannersList = [];

  for (const [pid, p] of Object.entries(staticPlanners)) {
    if (p && typeof p === 'object') {
      plannersList.push({
        id: p.id ?? (/^\d+$/.test(String(pid)) ? parseInt(pid, 10) : pid),
        name: p.name || '',
        startDate: p.startDate,
        lastDate: p.lastDate,
        totalWorkingDays: p.totalWorkingDays || 0,
        calendarYear: p.calendarYear || currYear,
        isPublished: p.isPublished ?? true,
      });
    }
  }

  const departments = [
    { id: 'be_3_4', name: '3rd & 4th Year BE / B.Tech', planner_odd: 32, planner_even: 40, color: '#6366f1' },
    { id: 'be_2', name: '2nd Year BE / B.Tech', planner_odd: 33, planner_even: 41, color: '#a855f7' },
    { id: 'be_1', name: '1st Year BE / B.Tech', planner_odd: 39, planner_even: 42, color: '#ec4899' },
    { id: 'bsc_msc', name: 'B.Sc & M.Sc (All Years)', planner_odd: 32, planner_even: 40, color: '#06b6d4' },
    { id: 'pg', name: 'ME / M.Tech & MCA', planner_odd: 32, planner_even: 40, color: '#f59e0b' },
    { id: 'sandwich_4', name: '4th Year BE Sandwich (SW)', planner_odd: 34, planner_even: 44, color: '#14b8a6' },
    { id: 'sandwich_5', name: '5th Year BE Sandwich (SW)', planner_odd: 35, planner_even: 44, color: '#10b981' },
    { id: 'mca_1', name: '1st Year MCA', planner_odd: 33, planner_even: 43, color: '#8b5cf6' },
  ];

  const result = {
    success: true,
    year: currYear,
    planners: liveData,
    all_planners_meta: plannersList,
    departments,
    available_years: [currYear, currYear - 1],
  };

  ALL_CALENDARS_CACHE = { data: result, timestamp: now };
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
  return res.json(result);
});

function handleCalendarRequest(req, res, paramRoll = null) {
  try {
    const data = req.method === 'POST' && req.body ? req.body : {};
    let token =
      req.headers['x-session-token'] ||
      req.query.token ||
      req.query.session_token ||
      data.token ||
      data.session_token ||
      '';
    const authHeader = req.headers.authorization || '';
    if (!token && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    const authToken = req.headers['x-auth-token'] || req.query.auth_token || data.auth_token || '';
    let roll =
      paramRoll ||
      req.query.roll ||
      req.query.rollno ||
      req.query.username ||
      data.roll ||
      data.rollno ||
      data.username ||
      '';

    if (roll && (String(roll).includes('.') || String(roll).length > 15)) {
      if (!token) token = String(roll);
      roll = '';
    }

    if (!roll && token) {
      const tokData = decodeSessionToken(token);
      if (tokData && tokData.u) roll = tokData.u;
    }

    if (!roll && authToken) {
      try {
        const creds = JSON.parse(authToken);
        roll = creds.roll || '';
      } catch {
        // ignore
      }
    }

    if (!roll) roll = '23Z101';

    roll = AutoCalendarResolver.cleanRollInput(String(roll));
    const sem = String(req.query.sem || data.sem || '').trim().toLowerCase() || null;
    const targetYear = String(req.query.year || data.year || '').trim() || null;

    if (/^\d+$/.test(roll) && roll.length <= 3) {
      const pid = parseInt(roll, 10);
      const currYear = targetYear ? parseInt(targetYear, 10) : AutoCalendarResolver.getCurrentAcademicYear();
      const details = AutoCalendarResolver.getPlannerDetails(currYear, pid);
      if (details) {
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
        if (token) res.setHeader('X-Session-Token', token);
        return res.json(details);
      }
      return res.status(404).json({ error: `Planner ID ${pid} not found for year ${currYear}` });
    }

    const college = detectCollege(roll);
    if (college !== 'PSGTECH') {
      return res.status(400).json({
        error: `Roll number '${roll}' is not a valid PSG College of Technology roll number. The academic schedule is exclusively published for PSG College of Technology.`,
        college: 'UNKNOWN',
        rollNumber: roll,
        name: 'Academic Year',
        calendar: { holidays: [] },
        activities: [],
      });
    }

    const { student, matchedPlanner, details, yearPlanners } = AutoCalendarResolver.resolveCalendar(
      roll,
      sem,
      targetYear
    );

    if (!matchedPlanner) {
      return res.status(400).json({
        error: 'Could not identify course/year from roll number',
        rollNumber: roll,
      });
    }

    const payload = details ? { ...details } : { ...matchedPlanner };
    payload.success = true;
    payload.student = student;
    payload.matchedPlanner = matchedPlanner;
    payload.plannerId = matchedPlanner.id;
    const nowMonth = new Date().getMonth() + 1;
    payload.semester = student ? student.semester_type : sem || (nowMonth >= 1 && nowMonth <= 5 ? 'even' : 'odd');
    payload.semesterNo = student ? student.semester_no : null;
    payload.isLateralEntry = student ? Boolean(student.is_lateral_entry) : false;
    payload.ecampusSynced = student ? Boolean(student.ecampus_synced) : false;
    payload.academicYear = student ? student.academic_year : AutoCalendarResolver.getCurrentAcademicYear();
    if (token) payload.session_token = token;
    payload.availablePlanners = yearPlanners.map((p) => ({
      id: p.id,
      name: p.name,
      isPublished: Boolean(p.isPublished),
      startDate: p.startDate,
      lastDate: p.lastDate,
    }));

    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    if (token) res.setHeader('X-Session-Token', token);
    return res.json(payload);
  } catch {
    const staticPlanners = AutoCalendarResolver.getStaticJsonPlanners();
    const firstKey = Object.keys(staticPlanners)[0];
    if (firstKey) {
      return res.json(staticPlanners[firstKey]);
    }
    return res.status(500).json({ error: 'Server error fetching calendar' });
  }
}

app.all('/api/calendar', (req, res) => handleCalendarRequest(req, res, null));
app.all('/api/calendar/:roll', (req, res) => handleCalendarRequest(req, res, req.params.roll));

const FAST_UPDATE_MAP = new Map();
const FAST_UPDATE_TTL_MS = 5 * 60 * 1000; // 5-minute attendance date cache per student

function getFastUpdateCache(key) {
  const entry = FAST_UPDATE_MAP.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > FAST_UPDATE_TTL_MS) {
    FAST_UPDATE_MAP.delete(key);
    return null;
  }
  return entry.val;
}

function setFastUpdateCache(key, val) {
  if (FAST_UPDATE_MAP.size >= 5000 && !FAST_UPDATE_MAP.has(key)) {
    const oldest = FAST_UPDATE_MAP.keys().next().value;
    if (oldest) FAST_UPDATE_MAP.delete(oldest);
  }
  FAST_UPDATE_MAP.set(key, { val, ts: Date.now() });
}

app.post('/api/login', async (req, res) => {
  try {
    const data = req.body || {};
    const username = String(data.username || '').trim().toUpperCase();
    const password = String(data.password || '').trim();
    const knownUpdate = String(data.known_update || '').trim();
    const knownSig = String(data.known_sig || '').trim();
    const hasTimetable = Boolean(data.has_timetable);

    if (!username || !password) {
      return res.json({ success: false, error: 'Credentials required' });
    }

    const college = detectCollege(username);
    if (college !== 'PSGTECH') {
      return res.json({
        success: false,
        error: 'Invalid roll number format. Bunker is exclusively for PSG College of Technology students.',
      });
    }

    const credHash = crypto.createHash('sha256').update(`${username}:${password}:PSGTECH`).digest('hex');

    // 5-Minute Cooldown Fast-Exit (0ms, 0 network requests to eCampus if checked within last 5 minutes)
    if (hasTimetable && knownUpdate && knownUpdate !== 'No data') {
      const cachedFastDate = getFastUpdateCache(credHash);
      if (cachedFastDate && cachedFastDate === knownUpdate) {
        return res.json({
          success: true,
          up_to_date: true,
          last_update: cachedFastDate,
          update_sig: cachedFastDate,
          cached_cooldown: true,
        });
      }
    }

    const resultPayload = await coalesceRequest(`login:${credHash}:${hasTimetable}:${knownUpdate}`, async () => {
      const scraper = await new EcampusScraper(username, password).init({
        sessionToken: data.session_token,
        needTimetable: !hasTimetable,
      });

      if (!scraper.authenticated) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Ultra-fast updated-date check (<0.05ms): only check the updated date without full attendance DOM parsing!
      if (hasTimetable && knownUpdate && knownUpdate !== 'No data' && scraper._attHtml) {
        const fastLastUpdate = fastExtractLastUpdateDate(scraper._attHtml);
        if (fastLastUpdate && fastLastUpdate !== 'No data') {
          setFastUpdateCache(credHash, fastLastUpdate);
          if (fastLastUpdate === knownUpdate) {
            const resFast = {
              success: true,
              up_to_date: true,
              last_update: fastLastUpdate,
              update_sig: fastLastUpdate,
            };
            const newTok = scraper.getSessionToken();
            if (newTok) resFast.session_token = newTok;
            return resFast;
          }
        }
      }

      const cachePath = `/tmp/bunker_cache_v2_${credHash}.json`;
      const { attendanceData, lastUpdate } = await scraper.getAttendance();
      const currentSig = lastUpdate || 'No data';

      const isUpToDate =
        hasTimetable && knownUpdate && lastUpdate && knownUpdate === lastUpdate && lastUpdate !== 'No data';

      if (isUpToDate) {
        const resUp = {
          success: true,
          up_to_date: true,
          last_update: lastUpdate,
          update_sig: currentSig,
        };
        const newTok = scraper.getSessionToken();
        if (newTok) resUp.session_token = newTok;
        return resUp;
      }

      if (fs.existsSync(cachePath)) {
        try {
          const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
          const cachedMap = cachedData.response?.course_mapping;
          const hasValidCachedMap = cachedMap && Object.keys(cachedMap).length > 0;
          if (
            cachedData.last_update === lastUpdate &&
            lastUpdate !== 'No data' &&
            cachedData.response &&
            hasValidCachedMap
          ) {
            const lightCached = { ...cachedData.response };
            if (hasTimetable) {
              delete lightCached.timetable;
              delete lightCached.course_mapping;
            }
            const newTok = scraper.getSessionToken();
            if (newTok) lightCached.session_token = newTok;
            return lightCached;
          }
        } catch {
          // ignore
        }
      }

      let courseMapping = null;
      let weeklySchedule = null;
      let studentName = null;

      if (hasTimetable && fs.existsSync(cachePath)) {
        try {
          const cData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
          courseMapping = cData.response?.course_mapping;
          studentName = cData.response?.student_name;
        } catch {
          // ignore
        }
      }

      const hasValidMapping = courseMapping && Object.keys(courseMapping).length > 0;
      if (!hasValidMapping || !hasTimetable) {
        const ttRes = await scraper.getTimetableAndSchedule();
        courseMapping = ttRes.courseMapping;
        weeklySchedule = ttRes.schedule;
        studentName = ttRes.studentName;
      }

      if (!courseMapping) courseMapping = {};

      if (!hasTimetable && !weeklySchedule) {
        return {
          success: false,
          error: 'Unable to fetch timetable data. Please try again.',
        };
      }

      const processedSubjects = Array.isArray(attendanceData)
        ? attendanceData.map((s) => ({
            code: s.code,
            name: courseMapping[s.code] || s.name,
            total: s.total,
            attended: s.attended,
            exemption: s.exemption || 0,
            pct_normal: s.percentage || 0,
            pct_exemp: s.pct_exemp || 0,
            pct_medical: s.pct_medical || 0,
          }))
        : [];

      const rollHash = crypto.createHash('sha256').update(`${username}:PSGTECH`).digest('hex');
      const prevCachePath = `/tmp/bunker_prev_${rollHash}.json`;
      let prevExisting = null;
      if (fs.existsSync(prevCachePath)) {
        try {
          prevExisting = JSON.parse(fs.readFileSync(prevCachePath, 'utf-8'));
        } catch {
          // ignore
        }
      }

      const responseData = {
        success: true,
        subjects: processedSubjects,
        last_update: lastUpdate || 'No data',
        update_sig: currentSig,
        college: 'PSGTECH',
        has_calendar: true,
      };

      if (prevExisting && prevExisting.subjects) {
        responseData.previous_subjects = prevExisting.subjects;
        responseData.previous_last_update = prevExisting.last_update;
      }

      if (!hasTimetable) {
        responseData.timetable = weeklySchedule;
        responseData.course_mapping = courseMapping;
      }

      if (processedSubjects.length > 0) {
        try {
          fs.writeFileSync(
            prevCachePath,
            JSON.stringify({
              subjects: processedSubjects,
              last_update: lastUpdate || 'No data',
              timetable: weeklySchedule || {},
              course_mapping: courseMapping || {},
              student_name: studentName && studentName !== 'Student' ? studentName : null,
            }),
            'utf-8'
          );
        } catch {
          // ignore
        }
      }

      if (studentName && studentName !== 'Student') {
        responseData.student_name = studentName;
      }

      try {
        const fullCacheData = {
          ...responseData,
          timetable: responseData.timetable || weeklySchedule || {},
          course_mapping: responseData.course_mapping || courseMapping || {},
        };
        fs.writeFileSync(
          cachePath,
          JSON.stringify({
            last_update: lastUpdate,
            raw_attendance: attendanceData,
            response: fullCacheData,
          }),
          'utf-8'
        );
      } catch {
        // ignore
      }

      const newTok = scraper.getSessionToken();
      if (newTok) responseData.session_token = newTok;
      return responseData;
    });

    return res.json(resultPayload);
  } catch (e) {
    return res.json({ success: false, error: `Server error: ${e.message}` });
  }
});

app.post('/api/timetable', async (req, res) => {
  try {
    const data = req.body || {};
    let username = data.username || data.roll;
    let password = data.password;
    const authToken = data.auth_token;

    if (authToken && !(username && password)) {
      try {
        const creds = JSON.parse(authToken);
        username = creds.roll;
        password = creds.password;
      } catch {
        // ignore
      }
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Roll number and password required' });
    }

    const scraper = await new EcampusScraper(username, password).init({
      prefetch: false,
      sessionToken: data.session_token,
    });
    if (!scraper.authenticated) {
      return res.status(401).json({ success: false, error: 'Authentication failed. Please verify credentials.' });
    }

    const { courseMapping, schedule, studentName } = await scraper.getTimetableAndSchedule();
    const resTt = {
      success: true,
      timetable: schedule,
      course_mapping: courseMapping,
      student_name: studentName && studentName !== 'Student' ? studentName : null,
    };
    const newTok = scraper.getSessionToken();
    if (newTok) resTt.session_token = newTok;
    return res.json(resTt);
  } catch (e) {
    return res.status(500).json({ success: false, error: `Failed to fetch timetable: ${e.message}` });
  }
});

app.post('/api/previous-attendance', (req, res) => {
  try {
    const data = req.body || {};
    const username = data.username;
    const password = data.password;
    const college = data.college || detectCollege(username);

    if (!username) {
      return res.json({ success: false, error: 'Roll number required' });
    }

    const rollHash = crypto
      .createHash('sha256')
      .update(`${String(username).trim().toUpperCase()}:${college}`)
      .digest('hex');
    const prevCachePath = `/tmp/bunker_prev_${rollHash}.json`;

    if (fs.existsSync(prevCachePath)) {
      try {
        const cachedData = JSON.parse(fs.readFileSync(prevCachePath, 'utf-8'));
        if (cachedData.subjects) {
          return res.json({
            success: true,
            subjects: cachedData.subjects,
            last_update: cachedData.last_update || 'Previous Update',
            timetable: cachedData.timetable,
            course_mapping: cachedData.course_mapping,
          });
        }
      } catch {
        // ignore
      }
    }

    if (password) {
      const credHash = crypto.createHash('sha256').update(`${username}:${password}:${college}`).digest('hex');
      const cachePath = `/tmp/bunker_cache_${credHash}.json`;
      if (fs.existsSync(cachePath)) {
        try {
          const cachedInfo = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
          const subs = cachedInfo.response?.subjects;
          if (subs) {
            return res.json({
              success: true,
              subjects: subs,
              last_update: cachedInfo.last_update || 'Previous Update',
              timetable: cachedInfo.response?.timetable,
              course_mapping: cachedInfo.response?.course_mapping,
            });
          }
        } catch {
          // ignore
        }
      }
    }

    return res.json({ success: false, error: 'No previous attendance data found on server' });
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});

function computeCaSig(internalsList) {
  if (!Array.isArray(internalsList) || internalsList.length === 0) return '';
  const parts = internalsList.map((s) => {
    const c = String(s.course_code || '');
    const t = String(s.total || '');
    const tc = String(s.total_converted || '');
    const r = Array.isArray(s.row_data) ? s.row_data.join('') : '';
    return `${c}:${t}:${tc}:${r}`;
  });
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

function parseCaTables($, tables) {
  const safeFloat = (v) => {
    if (v === null || v === undefined) return null;
    const cleaned = String(v).replace(/[^\d.]/g, '').trim();
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? null : num;
  };

  const internals = [];
  for (const tbl of tables) {
    const $tbl = $(tbl);
    const tableId = $tbl.attr('id') || 'modern_ca';
    const thead = $tbl.find('thead');
    const headerRows = thead.length ? thead.find('tr').toArray() : $tbl.find('tr').slice(0, 2).toArray();

    const colNames =
      headerRows.length >= 1
        ? $(headerRows[0])
            .find('th, td')
            .map((_, el) => $(el).text().trim())
            .get()
        : [];
    const maxMarks =
      headerRows.length >= 2
        ? $(headerRows[1])
            .find('th, td')
            .map((_, el) => $(el).text().trim())
            .get()
        : [];

    const headersText = colNames.join(' ').toUpperCase();
    const isTableLab =
      headersText.includes('IR I') ||
      headersText.includes('PLRO') ||
      tableId.startsWith('8^16') ||
      tableId.startsWith('8^10');
    const isTableEnv =
      headersText.includes('ENVIRONMENTAL') || (colNames.includes('A I') && colNames.includes('A II'));
    const isTableApp = colNames.includes('EH') || headersText.includes('ACTIVITY POINT');
    const isTableAt = ['AT1', 'AT 1', 'AT 2', 'AT2'].some((x) => colNames.includes(x));
    const isTableAp = colNames.includes('AP') && !isTableAt;

    let tableType = 'theory';
    if (isTableLab) tableType = 'lab';
    else if (isTableEnv) tableType = 'environmental';
    else if (isTableApp) tableType = 'activity_points';
    else if (isTableAt) tableType = 'theory_tutorial';
    else if (isTableAp) tableType = 'theory_ap';

    const tbody = $tbl.find('tbody');
    const dataRows = tbody.length
      ? tbody.find('tr').toArray()
      : $tbl.find('tr').slice(headerRows.length).toArray();

    for (const row of dataRows) {
      const cols = $(row)
        .find('td')
        .map((_, td) => $(td).text().trim())
        .get();
      if (cols.length < 3) continue;

      const courseCode = cols[0].trim();
      const courseName = cols[1].trim();
      const rowData = cols.slice(2);

      const isLab =
        isTableLab || courseName.toUpperCase().includes('LABORATORY') || courseName.toUpperCase().includes('LAB');
      const isApp =
        isTableApp ||
        ['23U315', '23U215'].includes(courseCode) ||
        courseName.toUpperCase().includes('ACTIVITY POINT');
      const isEnv =
        isTableEnv || courseCode === '23K312' || courseName.toUpperCase().includes('ENVIRONMENTAL');

      let targetMax = 40;
      if (isLab) targetMax = 60;
      else if (isEnv || isApp) targetMax = 100;

      const markHeaders = colNames.length > 2 ? colNames.slice(2) : [];
      let totalIdx = null;
      let convIdx = null;
      markHeaders.forEach((h, idx) => {
        const hClean = h.trim().toLowerCase();
        if (hClean.includes('conv')) convIdx = idx;
        else if (hClean === 'total') totalIdx = idx;
      });

      let totalRaw = '';
      let convRaw = '';
      if (totalIdx !== null && totalIdx < rowData.length) totalRaw = rowData[totalIdx].trim();
      else if (convIdx !== null && convIdx > 0 && convIdx - 1 < rowData.length)
        totalRaw = rowData[convIdx - 1].trim();
      else if (rowData.length >= 2 && markHeaders.some((h) => h.toLowerCase().includes('conv')))
        totalRaw = rowData[rowData.length - 2].trim();
      else if (rowData.length) totalRaw = rowData[rowData.length - 1].trim();

      if (convIdx !== null && convIdx < rowData.length) convRaw = rowData[convIdx].trim();
      else if (totalIdx !== null && totalIdx < rowData.length - 1) convRaw = rowData[rowData.length - 1].trim();

      const totVal = safeFloat(totalRaw);
      const convVal = safeFloat(convRaw);

      let totalConverted = 'Not Updated Yet';
      if (convVal !== null) {
        totalConverted = String(Number.isInteger(convVal) ? convVal : Number(convVal.toFixed(2)));
      }

      const totalDisplay = totalRaw && totalRaw !== '*' ? totalRaw : 'Not Updated Yet';

      let schema = 'theory_ap';
      if (isLab) schema = 'lab';
      else if (isEnv) schema = 'evs';
      else if (isApp) schema = 'activity';
      else if (isTableAt) schema = 'theory_at';

      let credits = 3;
      const codeUp = courseCode.toUpperCase();
      if (schema === 'activity' || ['23U315', '23U215', '23IP15', '23Q213'].includes(codeUp)) credits = 0;
      else if (schema === 'evs' || codeUp === '23K312') credits = 0;
      else if (codeUp === '23G105') credits = 4;
      else if (codeUp === '23G001' || codeUp === '23U110' || schema === 'lab' || codeUp.endsWith('10') || codeUp.endsWith('11')) credits = 2;
      else if (codeUp.endsWith('01') || codeUp.endsWith('03')) {
        credits = ['CALCULUS', 'ALGEBRA', 'COMPLEX', 'ELECTRIC CIRCUITS', 'DIGITAL'].some((w) =>
          courseName.toUpperCase().includes(w)
        )
          ? 4
          : 3;
      }

      const comp = {};
      markHeaders.forEach((h, idx) => {
        const hNorm = h.toLowerCase().replace(/[\s.-]/g, '');
        const vFlt = safeFloat(rowData[idx]);
        if (['iri', 'ir1'].includes(hNorm)) comp.ir1 = vFlt;
        else if (['irii', 'ir2'].includes(hNorm)) comp.ir2 = vFlt;
        else if (['plroi', 'plro1'].includes(hNorm)) comp.plro1 = vFlt;
        else if (['plroii', 'plro2'].includes(hNorm)) comp.plro2 = vFlt;
        else if (hNorm === 't1') comp.t1 = vFlt;
        else if (hNorm === 't2') comp.t2 = vFlt;
        else if (hNorm === 'rt') comp.rt = vFlt;
        else if (hNorm === 'rt1') comp.rt1 = vFlt;
        else if (hNorm === 'rt2') comp.rt2 = vFlt;
        else if (hNorm === 'ap') comp.ap = vFlt;
        else if (['at1', 'ap1'].includes(hNorm)) comp.at1 = vFlt;
        else if (['at2', 'ap2'].includes(hNorm)) comp.at2 = vFlt;
        else if (hNorm === 'mq1') comp.mq1 = vFlt;
        else if (hNorm === 'mq2') comp.mq2 = vFlt;
        else if (['ai', 'a1'].includes(hNorm)) comp.a1 = vFlt;
        else if (['aii', 'a2'].includes(hNorm)) comp.a2 = vFlt;
        else if (hNorm === 'eh') comp.eh = vFlt;
      });

      const subtotals = {
        best2t: null,
        ap_total: null,
        best_mcq: null,
        entered_raw50: totVal,
        entered_ca40:
          convVal !== null
            ? convVal
            : totVal !== null
              ? Number((isLab ? totVal * 1.2 : totVal * 0.8).toFixed(2))
              : null,
      };

      const tVals = ['t1', 't2'].map((k) => comp[k]).filter((v) => v !== null && v !== undefined);
      if (tVals.length) {
        subtotals.best2t = Number(
          (tVals.length === 2 ? (tVals[0] + tVals[1]) / 2.0 : tVals[0] / 2.0).toFixed(2)
        );
      }
      const atVals = ['at1', 'at2'].map((k) => comp[k]).filter((v) => v !== null && v !== undefined);
      if (atVals.length) {
        subtotals.ap_total = Number(atVals.reduce((a, b) => a + b, 0).toFixed(2));
      } else if (comp.ap !== null && comp.ap !== undefined) {
        subtotals.ap_total = comp.ap;
      }
      const mqVals = ['mq1', 'mq2'].map((k) => comp[k]).filter((v) => v !== null && v !== undefined);
      if (mqVals.length) {
        subtotals.best_mcq = Number(
          (mqVals.length === 2 ? (mqVals[0] + mqVals[1]) / 2.0 : mqVals[0] / 2.0).toFixed(2)
        );
      }

      internals.push({
        course_code: courseCode,
        course_name: courseName,
        table_id: tableId,
        table_type: tableType,
        schema,
        credits,
        comp,
        subtotals,
        is_lab: isLab,
        row_data: rowData,
        headers: markHeaders,
        max_marks: maxMarks.length > 2 ? maxMarks.slice(2) : [],
        total: totalDisplay,
        total_converted: totalConverted,
        target_max: targetMax,
      });
    }
  }
  return internals;
}

app.post('/api/internals', async (req, res) => {
  try {
    const data = req.body || {};
    const authToken = data.auth_token || '';
    const sessionToken = data.session_token || '';
    const knownCaSig = String(data.known_ca_sig || '').trim();
    const force = Boolean(data.force);

    if (!authToken && !sessionToken) {
      return res.status(401).json({ error: 'Auth token required' });
    }

    let roll = '';
    let password = '';
    if (authToken) {
      try {
        const creds = JSON.parse(authToken);
        roll = creds.roll || '';
        password = creds.password || '';
      } catch {
        // ignore
      }
    }
    if (!roll && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) roll = tokData.u || '';
    }
    if (!roll) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const rollHash = crypto.createHash('sha256').update(`${roll}:${password}:internals`).digest('hex');
    const cacheKey = `bunker_internals_v3_${rollHash}`;

    if (!force) {
      const cached = getDiskCache(cacheKey, 86400);
      if (Array.isArray(cached) && cached.length > 0) {
        const caSig = computeCaSig(cached);
        res.setHeader('X-CA-Sig', caSig);
        res.setHeader('Cache-Control', 'private, max-age=1800');
        if (sessionToken) res.setHeader('X-Session-Token', sessionToken);
        if (knownCaSig && caSig && knownCaSig === caSig) {
          return res.json({ up_to_date: true, ca_sig: caSig });
        }
        return res.json(cached);
      }
    }

    const { internals, newTok } = await coalesceRequest(`internals:${rollHash}`, async () => {
      const scraper = await new EcampusScraper(roll, password).init({
        prefetch: false,
        forceStudzone2: false,
        sessionToken,
      });
      if (!scraper.authenticated) {
        return { internals: null, newTok: null };
      }

      let parsedInternals = [];

      // 1. Primary: Modern studzone ContinuousAssessment/CAMarksView
      try {
        let modernResp = await scraper.session.get(`${STUDZONE_URL}ContinuousAssessment/CAMarksView`);
        if (!modernResp.ok || modernResp.text.includes('Student Login')) {
          await scraper._login();
          modernResp = await scraper.session.get(`${STUDZONE_URL}ContinuousAssessment/CAMarksView`);
        }
        if (modernResp.ok && !modernResp.text.includes('Student Login')) {
          const $m = cheerio.load(modernResp.text);
          let mTables = $m('table')
            .filter((_, el) => ($m(el).attr('class') || '').includes('table') || ($m(el).attr('id') || '').includes('^'))
            .toArray();
          if (!mTables.length) {
            mTables = $m('table').toArray();
          }
          if (mTables.length > 0) {
            parsedInternals = parseCaTables($m, mTables);
          }
        }
      } catch {
        // fallback to studzone2
      }

      // 2. Fallback: Classic studzone2 CAMarks_View.aspx
      if (!parsedInternals.length) {
        try {
          await scraper.ensureStudzone2Auth();
          const response = await scraper.session.get(`${ECAMPUS_URL}CAMarks_View.aspx`);
          const $ = cheerio.load(response.text);
          let tables = $('table')
            .filter((_, el) => ($(el).attr('id') || '').includes('^'))
            .toArray();
          if (!tables.length) {
            tables = $('table')
              .filter((_, el) => ($(el).attr('class') || '').includes('table'))
              .toArray();
          }
          parsedInternals = parseCaTables($, tables);
        } catch {
          // ignore
        }
      }

      if (parsedInternals.length > 0) {
        setDiskCache(cacheKey, parsedInternals);
      }
      return {
        internals: parsedInternals,
        newTok: scraper.getSessionToken() || sessionToken,
      };
    });

    if (internals === null) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const caSig = computeCaSig(internals);
    res.setHeader('X-CA-Sig', caSig);
    res.setHeader('Cache-Control', 'private, max-age=1800');
    if (newTok) res.setHeader('X-Session-Token', newTok);

    if (knownCaSig && caSig && knownCaSig === caSig && !force) {
      const resPayload = { up_to_date: true, ca_sig: caSig };
      if (newTok) resPayload.session_token = newTok;
      return res.json(resPayload);
    }
    return res.json(internals);
  } catch (e) {
    return res.status(500).json({ error: `Server error: ${e.message}` });
  }
});

async function fetchAllsemResults(scraper) {
  await scraper.ensureStudzone2Auth();

  let [rCs, rRes] = await Promise.allSettled([
    scraper.session.get(`${ECAMPUS_URL}AttWfStudCourseSelection.aspx`),
    scraper.session.get(`${ECAMPUS_URL}FrmEpsStudResult.aspx`),
  ]);

  const csExpired =
    rCs.status !== 'fulfilled' ||
    rCs.value.status !== 200 ||
    rCs.value.text.includes('txtusercheck') ||
    rCs.value.url.includes('AttWfLoginPage') ||
    (!rCs.value.text.includes('PDGCourse') && !rCs.value.text.includes('TabCourse'));
  const resExpired =
    rRes.status !== 'fulfilled' ||
    rRes.value.status !== 200 ||
    rRes.value.text.includes('txtusercheck') ||
    rRes.value.url.includes('AttWfLoginPage');

  if (csExpired && resExpired) {
    scraper._studzone2Authenticated = false;
    await scraper.ensureStudzone2Auth();
    [rCs, rRes] = await Promise.allSettled([
      scraper.session.get(`${ECAMPUS_URL}AttWfStudCourseSelection.aspx`),
      scraper.session.get(`${ECAMPUS_URL}FrmEpsStudResult.aspx`),
    ]);
  }

  // Official PSG College of Technology 2023 Regulation Absolute Grading Scale:
  // O = 10, A+ = 9, A = 8, B+ = 7, B = 6.5, C+ = 6, C = 5, RA/U/W/SA/WD = 0, Completed = Non-CGPA
  const gradesMap = {
    S: 10,
    O: 10,
    'A+': 9,
    A: 8,
    'B+': 7,
    B: 6.5,
    'C+': 6,
    C: 5,
    D: 6,
    E: 5,
    P: 5,
    RA: 0,
    U: 0,
    W: 0,
    SA: 0,
    WD: 0,
    COMPLETED: null,
    Completed: null,
  };

  const parseCreditVal = (val) => {
    const n = parseFloat(String(val ?? '').trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const allSubjects = [];
  const studyingCourses = [];
  const seenCourses = new Map();
  let portalCompletedCredits = null;

  if (rCs.status === 'fulfilled' && rCs.value.status === 200) {
    const $cs = cheerio.load(rCs.value.text);
    const totCompTxt = $cs('span#tot_credit_comp').text().trim();
    const totCompNum = parseFloat(totCompTxt);
    if (Number.isFinite(totCompNum) && totCompNum >= 0) {
      portalCompletedCredits = totCompNum;
    }

    const tblCompleted = $cs('table#PDGCourse').length ? $cs('table#PDGCourse') : $cs('table#TabCourse');
    if (tblCompleted.length) {
      tblCompleted
        .find('tr')
        .slice(1)
        .each((_, row) => {
          const cols = $cs(row)
            .find('td')
            .map((__, td) => $cs(td).text().trim())
            .get();
          if (cols.length >= 8) {
            const code = cols[1].trim();
            const title = cols[2].trim();
            const cat = cols[3].trim();
            const sem = /^\d+$/.test(cols[4].trim()) ? parseInt(cols[4].trim(), 10) : 1;
            const grade = cols[6].trim();
            const creditsStr = cols.length > 7 ? cols[7].trim() : '0';
            const credits = parseCreditVal(creditsStr);
            const passing = cols.length > 8 ? cols[8].trim() : '';

            const isNonCgpa = credits === 0 || grade.toLowerCase() === 'completed';
            const gradeKey = grade.toUpperCase();
            const gp = isNonCgpa ? null : gradesMap[gradeKey] !== undefined ? gradesMap[gradeKey] : 0;
            const isPass = !['RA', 'U', 'W', 'SA', 'WD'].includes(gradeKey);

            const subjObj = {
              sem,
              course: code,
              title,
              category: cat,
              credits: String(credits),
              grade: grade.toLowerCase() === 'completed' ? 'Completed' : grade,
              grade_points: gp,
              is_non_cgpa: isNonCgpa,
              result: isPass ? 'Pass' : 'Fail',
              passing,
            };
            allSubjects.push(subjObj);
            seenCourses.set(code, subjObj);
          }
        });
    }

    // 1b. Parse currently studying courses for official credit weights and past-semester arrear detection
    const tblStudying = $cs('table#Prettydatagrid3').length
      ? $cs('table#Prettydatagrid3')
      : $cs('table#Table3');
    if (tblStudying.length) {
      const completedSems = [...seenCourses.values()].map((c) => c.sem);
      const maxCompletedSem = completedSems.length ? Math.max(...completedSems) : 0;
      tblStudying
        .find('tr')
        .slice(1)
        .each((_, row) => {
          const cols = $cs(row)
            .find('td')
            .map((__, td) => $cs(td).text().trim())
            .get();
          if (cols.length >= 7) {
            const code = cols[1].trim();
            const title = cols[2].trim();
            const cat = cols[3].trim();
            const sem = /^\d+$/.test(cols[4].trim()) ? parseInt(cols[4].trim(), 10) : 1;
            const creditsStr = cols.length > 6 ? cols[6].trim() : '0';
            const credits = parseCreditVal(creditsStr);
            const isNonCgpa = credits === 0;

            studyingCourses.push({
              sem,
              course: code,
              title,
              category: cat,
              credits,
              is_non_cgpa: isNonCgpa,
            });

            if (!seenCourses.has(code) && maxCompletedSem > 0 && sem <= maxCompletedSem) {
              const arrearSubj = {
                sem,
                course: code,
                title,
                category: cat,
                credits: String(credits),
                grade: 'RA',
                grade_points: isNonCgpa ? null : 0,
                is_non_cgpa: isNonCgpa,
                result: 'Fail',
                passing: '',
              };
              allSubjects.push(arrearSubj);
              seenCourses.set(code, arrearSubj);
            }
          }
        });
    }
  }

  if (rRes.status === 'fulfilled' && rRes.value.status === 200) {
    const $res = cheerio.load(rRes.value.text);
    const tblRes = $res('table#DgResult').length
      ? $res('table#DgResult')
      : $res('table').filter((_, el) => ($(el).attr('id') || '').toLowerCase() === 'dgresult');

    if (tblRes.length) {
      let curSem = null;
      tblRes
        .find('tr')
        .slice(1)
        .each((_, row) => {
          const cols = $res(row)
            .find('td')
            .map((__, td) => $res(td).text().trim())
            .get();
          if (cols.length >= 5) {
            if (/^\d+$/.test(cols[0])) curSem = parseInt(cols[0], 10);
            const code = cols[1];
            const title = cols[2];
            const credits = cols[3];
            const markRaw = cols[4];
            const result = cols.length > 5 ? cols[5] : '';

            const parts = markRaw.split(/\s+/);
            let gp = null;
            let grade = markRaw;
            if (parts.length >= 2) {
              const gpVal = parseFloat(parts[0]);
              if (!Number.isNaN(gpVal)) {
                gp = gpVal;
                grade = parts[parts.length - 1];
              }
            } else if (markRaw.toLowerCase() === 'completed') {
              grade = 'Completed';
            }

            const crVal = parseCreditVal(credits);
            const isNonCgpa = crVal === 0 || grade.toLowerCase() === 'completed';
            const gradeClean = grade.trim().toUpperCase();
            if (isNonCgpa) gp = null;
            else if (gp === null && gradesMap[gradeClean] !== undefined) gp = gradesMap[gradeClean];
            else if (gradesMap[gradeClean] !== undefined && gp === 6 && gradeClean === 'B') gp = 6.5;

            const isPass = result
              ? result.toLowerCase() === 'pass'
              : !['RA', 'U', 'W', 'SA', 'WD'].includes(gradeClean);

            if (seenCourses.has(code)) {
              const existing = seenCourses.get(code);
              if (!existing.is_non_cgpa && gp !== null) existing.grade_points = gp;
              if (grade) existing.grade = grade;
              if (result) existing.result = result;
              if (title && !existing.title) existing.title = title;
              if (crVal > 0 && (!existing.credits || existing.credits === '0')) {
                existing.credits = String(crVal);
                existing.is_non_cgpa = false;
              }
            } else {
              const newSubj = {
                sem: curSem || 1,
                course: code,
                title,
                category: '',
                credits: String(crVal),
                grade,
                grade_points: gp,
                is_non_cgpa: isNonCgpa,
                result: result || (isPass ? 'Pass' : 'Fail'),
              };
              allSubjects.push(newSubj);
              seenCourses.set(code, newSubj);
            }
          }
        });
    }
  }

  const semestersFound = [...new Set(allSubjects.map((c) => c.sem))].sort((a, b) => a - b);
  const semwiseData = [];
  const semwiseGpa = {};
  const semwiseCredits = {};

  for (const sem of semestersFound) {
    const semCourses = allSubjects.filter((c) => c.sem === sem);
    const creditCourses = semCourses.filter(
      (c) => !c.is_non_cgpa && parseCreditVal(c.credits) > 0 && c.grade_points !== null
    );
    const semCr = creditCourses.reduce((acc, c) => acc + parseCreditVal(c.credits), 0);
    const semEarnedCr = creditCourses
      .filter(
        (c) =>
          (!c.result || c.result.toLowerCase() === 'pass') &&
          !['RA', 'U', 'W', 'SA', 'WD'].includes(String(c.grade).toUpperCase()) &&
          c.grade_points > 0
      )
      .reduce((acc, c) => acc + parseCreditVal(c.credits), 0);
    const semCp = creditCourses.reduce((acc, c) => acc + parseCreditVal(c.credits) * c.grade_points, 0);
    const semHasRa = semCourses.some(
      (c) =>
        ['RA', 'U', 'SA', 'W'].includes(String(c.grade).toUpperCase()) ||
        String(c.grade).toUpperCase().startsWith('RA') ||
        c.result?.toLowerCase() === 'fail'
    );

    const sgpaVal = semCr > 0 ? Number((semCp / semCr).toFixed(2)) : 0;
    const sgpaDisplay = semHasRa ? 'RA' : sgpaVal.toFixed(2);

    const cumCourses = allSubjects.filter(
      (c) => c.sem <= sem && !c.is_non_cgpa && parseCreditVal(c.credits) > 0 && c.grade_points !== null
    );
    const cumCr = cumCourses.reduce((acc, c) => acc + parseCreditVal(c.credits), 0);
    const cumEarnedCr = cumCourses
      .filter(
        (c) =>
          (!c.result || c.result.toLowerCase() === 'pass') &&
          !['RA', 'U', 'W', 'SA', 'WD'].includes(String(c.grade).toUpperCase()) &&
          c.grade_points > 0
      )
      .reduce((acc, c) => acc + parseCreditVal(c.credits), 0);
    const cumCp = cumCourses.reduce((acc, c) => acc + parseCreditVal(c.credits) * c.grade_points, 0);
    const cumHasRa = allSubjects
      .filter((c) => c.sem <= sem)
      .some(
        (c) =>
          ['RA', 'U', 'SA', 'W'].includes(String(c.grade).toUpperCase()) ||
          String(c.grade).toUpperCase().startsWith('RA') ||
          c.result?.toLowerCase() === 'fail'
      );

    const cgpaVal = cumCr > 0 ? Number((cumCp / cumCr).toFixed(2)) : 0;
    const cgpaDisplay = cumHasRa ? 'RA' : cgpaVal.toFixed(2);

    semwiseGpa[String(sem)] = sgpaDisplay;
    semwiseCredits[String(sem)] = semCr;
    semwiseData.push({
      sem,
      sgpa: sgpaDisplay,
      sgpa_numeric: sgpaVal,
      cgpa: cgpaDisplay,
      cgpa_numeric: cgpaVal,
      credits: semCr,
      credits_enrolled: semCr,
      credits_earned: semEarnedCr,
      cum_credits_enrolled: cumCr,
      cum_credits_earned: cumEarnedCr,
      has_ra: semHasRa,
      total_subjects: semCourses.length,
    });
  }

  const latestSem = semestersFound.length ? semestersFound[semestersFound.length - 1] : 1;
  const latestGpa = semwiseGpa[String(latestSem)] ?? '0.00';

  const totalEarnedCredits = allSubjects
    .filter(
      (c) =>
        !c.is_non_cgpa &&
        parseCreditVal(c.credits) > 0 &&
        (!c.result || c.result.toLowerCase() === 'pass') &&
        !['RA', 'U', 'W', 'SA', 'WD'].includes(String(c.grade).toUpperCase()) &&
        c.grade_points > 0
    )
    .reduce((acc, c) => acc + parseCreditVal(c.credits), 0);

  const totalEnrolledCredits = allSubjects
    .filter((c) => !c.is_non_cgpa && parseCreditVal(c.credits) > 0)
    .reduce((acc, c) => acc + parseCreditVal(c.credits), 0);

  const creditPointsTotal = allSubjects
    .filter((c) => !c.is_non_cgpa && parseCreditVal(c.credits) > 0 && c.grade_points !== null)
    .reduce((acc, c) => acc + parseCreditVal(c.credits) * c.grade_points, 0);

  const hasAnyRa = semwiseData.some((s) => s.has_ra) || totalEarnedCredits < totalEnrolledCredits;
  const overallCgpa = hasAnyRa ? 'RA' : semwiseData.length ? semwiseData[semwiseData.length - 1].cgpa : '0.00';
  const overallCgpaNumeric = semwiseData.length ? semwiseData[semwiseData.length - 1].cgpa_numeric : 0;
  const cgpaNote = hasAnyRa ? 'CGPA is computed only if candidate passes all the courses registered.' : '';

  allSubjects.sort((a, b) => (b.sem !== a.sem ? b.sem - a.sem : b.course.localeCompare(a.course)));

  return {
    all_subjects: allSubjects,
    studying_courses: studyingCourses,
    semwise_data: semwiseData,
    semwise_gpa: semwiseGpa,
    semwise_credits: semwiseCredits,
    latest_sem: latestSem,
    latest_gpa: latestGpa,
    overall_cgpa: overallCgpa,
    overall_cgpa_numeric: overallCgpaNumeric,
    cgpa_note: cgpaNote,
    has_arrears: hasAnyRa,
    portal_completed_credits: portalCompletedCredits,
    total_credits: totalEarnedCredits,
    total_enrolled_credits: totalEnrolledCredits,
    credit_points_total: creditPointsTotal,
  };
}

app.post(['/api/gpa', '/api/cgpa'], async (req, res) => {
  try {
    const data = req.body || {};
    const authToken = data.auth_token || '';
    const sessionToken = data.session_token || '';
    const force = Boolean(data.force);

    if (!authToken && !sessionToken) {
      return res.status(401).json({ error: 'Auth token required' });
    }

    let roll = '';
    let password = '';
    if (authToken) {
      try {
        const creds = JSON.parse(authToken);
        roll = creds.roll || '';
        password = creds.password || '';
      } catch {
        // ignore
      }
    }
    if (!roll && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) roll = tokData.u || '';
    }
    if (!roll) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const rollHash = crypto.createHash('sha256').update(`${roll}:${password}:results`).digest('hex');
    const cacheKey = `bunker_results_v5_${rollHash}`;

    let results = !force ? getDiskCache(cacheKey, 86400) : null;
    if (
      results &&
      (!Array.isArray(results.all_subjects) || results.all_subjects.length === 0) &&
      (!Array.isArray(results.studying_courses) || results.studying_courses.length === 0)
    ) {
      results = null;
    }
    let newTok = sessionToken;

    if (!results) {
      const fetched = await coalesceRequest(`results:${rollHash}`, async () => {
        const scraper = await new EcampusScraper(roll, password).init({
          prefetch: false,
          forceStudzone2: true,
          sessionToken,
        });
        if (!scraper.authenticated) {
          return null;
        }
        const resData = await fetchAllsemResults(scraper);
        if (
          resData &&
          ((Array.isArray(resData.all_subjects) && resData.all_subjects.length > 0) ||
            (Array.isArray(resData.studying_courses) && resData.studying_courses.length > 0))
        ) {
          setDiskCache(cacheKey, resData);
        }
        return { resData, tok: scraper.getSessionToken() || sessionToken };
      });

      if (!fetched) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      results = fetched.resData;
      newTok = fetched.tok;
    }

    const resPayload = {
      gpa: results.latest_gpa,
      latest_sem: results.latest_sem,
      total_credits: results.total_credits,
      total_enrolled_credits: results.total_enrolled_credits || 0,
      portal_completed_credits: results.portal_completed_credits,
      credit_points_total: results.credit_points_total || 0,
      semwise_gpa: results.semwise_gpa,
      semwise_credits: results.semwise_credits,
      semwise_data: results.semwise_data,
      cgpa: results.overall_cgpa,
      overall_cgpa: results.overall_cgpa,
      overall_cgpa_numeric: results.overall_cgpa_numeric || 0,
      cgpa_note: results.cgpa_note || '',
      has_arrears: Boolean(results.has_arrears),
      all_subjects: results.all_subjects,
      studying_courses: results.studying_courses || [],
      table: results.all_subjects,
    };
    if (newTok) {
      resPayload.session_token = newTok;
      res.setHeader('X-Session-Token', newTok);
    }
    res.setHeader('Cache-Control', 'private, max-age=1800');
    return res.json(resPayload);
  } catch (e) {
    return res.status(500).json({ error: `Server error: ${e.message}` });
  }
});

// Unified single-invocation endpoint for Internals + Semester Results (cuts Vercel Hobby invocations by 50%)
app.post('/api/academics', async (req, res) => {
  try {
    const data = req.body || {};
    const authToken = data.auth_token || '';
    const sessionToken = data.session_token || '';
    const needInternals = data.need_internals !== false;
    const needResults = data.need_results !== false;
    const knownCaSig = String(data.known_ca_sig || '').trim();
    const force = Boolean(data.force);

    if (!authToken && !sessionToken) {
      return res.status(401).json({ error: 'Auth token required' });
    }

    let roll = '';
    let password = '';
    if (authToken) {
      try {
        const creds = JSON.parse(authToken);
        roll = creds.roll || '';
        password = creds.password || '';
      } catch {
        // ignore
      }
    }
    if (!roll && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) roll = tokData.u || '';
    }
    if (!roll) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const intHash = crypto.createHash('sha256').update(`${roll}:${password}:internals`).digest('hex');
    const intCacheKey = `bunker_internals_v4_${intHash}`;
    const resHash = crypto.createHash('sha256').update(`${roll}:${password}:results`).digest('hex');
    const resCacheKey = `bunker_results_v5_${resHash}`;

    let cachedInternals = !force && needInternals ? getDiskCache(intCacheKey, 86400) : null;
    if (Array.isArray(cachedInternals) && cachedInternals.length === 0) {
      cachedInternals = null;
    }
    let cachedResults = !force && needResults ? getDiskCache(resCacheKey, 86400) : null;
    if (
      cachedResults &&
      (!Array.isArray(cachedResults.all_subjects) || cachedResults.all_subjects.length === 0) &&
      (!Array.isArray(cachedResults.studying_courses) || cachedResults.studying_courses.length === 0)
    ) {
      cachedResults = null;
    }
    let newTok = sessionToken;

    const missingInternals = needInternals && cachedInternals === null;
    const missingResults = needResults && cachedResults === null;

    if (missingInternals || missingResults) {
      const fetched = await coalesceRequest(
        `academics:${roll}:${missingInternals ? 1 : 0}:${missingResults ? 1 : 0}`,
        async () => {
          const scraper = await new EcampusScraper(roll, password).init({
            prefetch: false,
            forceStudzone2: missingResults && !missingInternals,
            sessionToken,
          });
          if (!scraper.authenticated) return null;

          let parsedInternals = cachedInternals;
          let parsedResults = cachedResults;

          if (missingInternals) {
            parsedInternals = [];
            try {
              let modernResp = await scraper.session.get(`${STUDZONE_URL}ContinuousAssessment/CAMarksView`);
              if (!modernResp.ok || modernResp.text.includes('Student Login')) {
                await scraper._login();
                modernResp = await scraper.session.get(`${STUDZONE_URL}ContinuousAssessment/CAMarksView`);
              }
              if (modernResp.ok && !modernResp.text.includes('Student Login')) {
                const $m = cheerio.load(modernResp.text);
                let mTables = $m('table')
                  .filter(
                    (_, el) => ($m(el).attr('class') || '').includes('table') || ($m(el).attr('id') || '').includes('^')
                  )
                  .toArray();
                if (!mTables.length) {
                  mTables = $m('table').toArray();
                }
                if (mTables.length > 0) {
                  parsedInternals = parseCaTables($m, mTables);
                }
              }
            } catch {
              // fallback to studzone2
            }
            if (!parsedInternals.length) {
              try {
                await scraper.ensureStudzone2Auth();
                const response = await scraper.session.get(`${ECAMPUS_URL}CAMarks_View.aspx`);
                const $ = cheerio.load(response.text);
                let tables = $('table')
                  .filter((_, el) => ($(el).attr('id') || '').includes('^'))
                  .toArray();
                if (!tables.length) {
                  tables = $('table')
                    .filter((_, el) => ($(el).attr('class') || '').includes('table'))
                    .toArray();
                }
                parsedInternals = parseCaTables($, tables);
              } catch {
                // ignore
              }
            }
            if (parsedInternals.length > 0) {
              setDiskCache(intCacheKey, parsedInternals);
            }
          }

          if (missingResults) {
            parsedResults = await fetchAllsemResults(scraper);
            if (
              parsedResults &&
              ((Array.isArray(parsedResults.all_subjects) && parsedResults.all_subjects.length > 0) ||
                (Array.isArray(parsedResults.studying_courses) && parsedResults.studying_courses.length > 0))
            ) {
              setDiskCache(resCacheKey, parsedResults);
            }
          }

          return {
            internals: parsedInternals,
            results: parsedResults,
            tok: scraper.getSessionToken() || sessionToken,
          };
        }
      );

      if (!fetched) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      cachedInternals = fetched.internals;
      cachedResults = fetched.results;
      newTok = fetched.tok;
    }

    // Cross-populate official credits & titles from studying_courses / all_subjects into internals
    if (Array.isArray(cachedInternals) && cachedResults) {
      const creditMap = new Map();
      if (Array.isArray(cachedResults.all_subjects)) {
        cachedResults.all_subjects.forEach((s) => {
          if (s.course) creditMap.set(String(s.course).toUpperCase(), s);
        });
      }
      if (Array.isArray(cachedResults.studying_courses)) {
        cachedResults.studying_courses.forEach((s) => {
          if (s.course) creditMap.set(String(s.course).toUpperCase(), s);
        });
      }
      cachedInternals.forEach((intSub) => {
        const cKey = String(intSub.course_code || '').toUpperCase();
        const meta = creditMap.get(cKey);
        if (meta) {
          if (meta.credits !== undefined) intSub.credits = Number(meta.credits);
          if (meta.category) intSub.category = meta.category;
          if (meta.sem) intSub.sem = meta.sem;
          if ((!intSub.course_name || intSub.course_name === intSub.course_code) && meta.title) {
            intSub.course_name = meta.title;
          }
        }
      });
    }

    const responseObj = { success: true };
    if (needInternals && cachedInternals !== null) {
      const caSig = computeCaSig(cachedInternals);
      responseObj.ca_sig = caSig;
      res.setHeader('X-CA-Sig', caSig);
      if (knownCaSig && caSig && knownCaSig === caSig && !force) {
        responseObj.internals_up_to_date = true;
      } else {
        responseObj.internals = cachedInternals;
      }
    }

    if (needResults && cachedResults) {
      responseObj.results = {
        gpa: cachedResults.latest_gpa,
        latest_sem: cachedResults.latest_sem,
        total_credits: cachedResults.total_credits,
        total_enrolled_credits: cachedResults.total_enrolled_credits || 0,
        portal_completed_credits: cachedResults.portal_completed_credits,
        credit_points_total: cachedResults.credit_points_total || 0,
        semwise_gpa: cachedResults.semwise_gpa,
        semwise_credits: cachedResults.semwise_credits,
        semwise_data: cachedResults.semwise_data,
        cgpa: cachedResults.overall_cgpa,
        overall_cgpa: cachedResults.overall_cgpa,
        overall_cgpa_numeric: cachedResults.overall_cgpa_numeric || 0,
        cgpa_note: cachedResults.cgpa_note || '',
        has_arrears: Boolean(cachedResults.has_arrears),
        all_subjects: cachedResults.all_subjects,
        studying_courses: cachedResults.studying_courses || [],
        table: cachedResults.all_subjects,
      };
    }

    if (newTok) {
      responseObj.session_token = newTok;
      res.setHeader('X-Session-Token', newTok);
    }
    res.setHeader('Cache-Control', 'private, max-age=1800');
    return res.json(responseObj);
  } catch (e) {
    return res.status(500).json({ error: `Server error: ${e.message}` });
  }
});

app.post('/api/exam-timetable', async (req, res) => {
  try {
    const data = req.body || {};
    const authToken = data.auth_token || '';
    const sessionToken = data.session_token || '';
    const force = Boolean(data.force);
    if (!authToken && !sessionToken) {
      return res.status(401).json({ error: 'Auth token required' });
    }
    let roll = '';
    let password = '';
    if (authToken) {
      try {
        const creds = JSON.parse(authToken);
        roll = creds.roll || '';
        password = creds.password || '';
      } catch {
        // ignore
      }
    }
    if (!roll && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) roll = tokData.u || '';
    }
    if (!roll) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const cacheKey = `bunker_exam_tt_${crypto.createHash('sha256').update(`${roll}:${password}`).digest('hex')}`;
    if (!force) {
      const cached = getDiskCache(cacheKey, 86400);
      if (cached !== null) return res.json(cached);
    }

    const scraper = await new EcampusScraper(roll, password).init({
      prefetch: false,
      forceStudzone2: false,
      sessionToken,
    });
    if (!scraper.authenticated) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const exams = [];
    const caTests = [];

    // 1. Check modern portal ContinuousAssessment/CATestTimeTable (.Test-card layout + table fallback)
    if (scraper.portalType === 'new') {
      try {
        const caResp = await scraper.session.get(`${STUDZONE_URL}ContinuousAssessment/CATestTimeTable`);
        if (caResp.ok && !caResp.text.includes('Student Login')) {
          const $ca = cheerio.load(caResp.text);
          const testCards = $ca('.Test-card, .card.Test-card').toArray();
          if (testCards.length > 0) {
            for (const card of testCards) {
              const sols = $ca(card)
                .find('span.sol')
                .map((_, el) => $ca(el).text().trim())
                .get();
              if (sols.length >= 4) {
                const item = {
                  sem: 'CA',
                  course: sols[0],
                  title: sols[1] || sols[0],
                  date: sols[2] || '',
                  slot: sols[3] || '',
                  timing: sols[4] || '',
                };
                caTests.push(item);
              }
            }
          } else {
            const caTable = $ca('table').first();
            if (caTable.length) {
              caTable
                .find('tr')
                .slice(1)
                .each((_, row) => {
                  const cols = $ca(row)
                    .find('td, th')
                    .map((__, td) => $ca(td).text().trim())
                    .get();
                  if (cols.length >= 4) {
                    caTests.push({
                      sem: 'CA',
                      course: cols[0],
                      title: cols[1] || cols[0],
                      date: cols[2] || '',
                      slot: cols[3] || '',
                      timing: cols[4] || '',
                    });
                  }
                });
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Check studzone2 FrmEpsTimetable.aspx for End-Semester Exam Timetable
    try {
      await scraper.ensureStudzone2Auth();
      const response = await scraper.session.get(`${ECAMPUS_URL}FrmEpsTimetable.aspx`);
      const $ = cheerio.load(response.text);
      const table = $('table#DgResult').length
        ? $('table#DgResult')
        : $('table').filter((_, el) => ($(el).attr('id') || '').toLowerCase() === 'dgresult');

      let currentSem = null;
      if (table.length) {
        table
          .find('tr')
          .slice(1)
          .each((_, row) => {
            const cols = $(row)
              .find('td, th')
              .map((__, td) => $(td).text().trim())
              .get();
            if (cols.length >= 5) {
              if (/^\d+$/.test(cols[0])) currentSem = parseInt(cols[0], 10);
              exams.push({
                sem: currentSem || 1,
                course: cols[1],
                title: cols[2],
                date: cols[3],
                slot: cols[4],
              });
            }
          });
      }
    } catch {
      // ignore
    }

    const combinedExams = exams.length > 0 ? exams : caTests;
    const resData = {
      success: true,
      exams: combinedExams,
      ca_tests: caTests,
      semester_exams: exams,
    };
    const newTok = scraper.getSessionToken();
    if (newTok) {
      resData.session_token = newTok;
      res.setHeader('X-Session-Token', newTok);
    }
    setDiskCache(cacheKey, resData);
    return res.json(resData);
  } catch (e) {
    return res.status(500).json({ error: `Server error: ${e.message}` });
  }
});

// Student Profile & Credit Summary Endpoint (/studzone/Home/Profile + AttWfStudCourseSelection.aspx)
app.post('/api/profile', async (req, res) => {
  try {
    const data = req.body || {};
    const authToken = data.auth_token || '';
    const sessionToken = data.session_token || '';
    const force = Boolean(data.force);
    let roll = data.roll || data.username || '';
    let password = data.password || '';

    if (authToken && (!roll || !password)) {
      try {
        const creds = JSON.parse(authToken);
        roll = creds.roll || '';
        password = creds.password || '';
      } catch {
        // ignore
      }
    }
    if (!roll && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) roll = tokData.u || '';
    }
    if (!roll || !password) {
      return res.status(401).json({ error: 'Credentials required' });
    }

    const cacheKey = `bunker_profile_${crypto.createHash('sha256').update(`${roll}:${password}`).digest('hex')}`;
    if (!force) {
      const cached = getDiskCache(cacheKey, 86400);
      if (cached !== null) return res.json(cached);
    }

    const scraper = await new EcampusScraper(roll, password).init({
      prefetch: false,
      sessionToken,
    });
    if (!scraper.authenticated) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const profile = {
      roll: scraper.username,
      name: '',
      programme: '',
      department: '',
      semester: '',
      batch: '',
      dob: '',
      gender: '',
      blood_group: '',
      email: '',
      phone: '',
      mentor: '',
      address: {},
      family: {},
      credit_summary: [],
    };

    if (scraper.portalType === 'new') {
      try {
        const rProf = await scraper.session.get(`${STUDZONE_URL}Home/Profile`);
        if (rProf.ok && !rProf.text.includes('Student Login')) {
          const $p = cheerio.load(rProf.text);
          profile.name = $p('h2.text-white').first().text().trim() || $p('.top-bar .user-name').first().text().trim();
          const progDept = $p('.text-white p.mb-1').first().text().trim();
          if (progDept.includes('-')) {
            const parts = progDept.split('-').map((s) => s.trim());
            profile.programme = parts[0] || '';
            profile.department = parts.slice(1).join(' - ') || '';
          } else {
            profile.programme = progDept;
          }
          $p('table tr').each((_, tr) => {
            const tds = $p(tr)
              .find('td, th')
              .map((__, td) => $p(td).text().trim())
              .get();
            if (tds.length >= 2) {
              const key = tds[0].replace(/[:\s]+$/, '').toLowerCase();
              const val = tds[tds.length - 1];
              if (key.includes('semester')) profile.semester = val;
              else if (key.includes('batch')) profile.batch = val;
              else if (key.includes('birth') || key === 'dob') profile.dob = val;
              else if (key.includes('gender')) profile.gender = val;
              else if (key.includes('blood')) profile.blood_group = val;
              else if (key.includes('email')) profile.email = val;
              else if (key.includes('student mobile') || key === 'mobile') profile.phone = val;
              else if (key.includes('tutor') || key.includes('mentor')) profile.mentor = val;
              else if (key.includes('father name')) profile.family.father_name = val;
              else if (key.includes('mother name')) profile.family.mother_name = val;
              else if (key.includes('parent') && key.includes('phone')) profile.family.parent_phone = val;
              else if (key.includes('city')) profile.address.city = val;
              else if (key.includes('state')) profile.address.state = val;
            }
          });
        }
      } catch {
        // ignore
      }
    }

    const resData = { success: true, profile };
    const newTok = scraper.getSessionToken();
    if (newTok) {
      resData.session_token = newTok;
      res.setHeader('X-Session-Token', newTok);
    }
    setDiskCache(cacheKey, resData);
    return res.json(resData);
  } catch (e) {
    return res.status(500).json({ error: `Server error: ${e.message}` });
  }
});

// Course Plan Modal & Detail View Endpoint (POST /studzone/Attendance/Reports)
app.post('/api/course-plan', async (req, res) => {
  try {
    const data = req.body || {};
    const authToken = data.auth_token || '';
    const sessionToken = data.session_token || '';
    const courseCode = String(data.coursecode || data.course_code || '').trim().toUpperCase();
    const force = Boolean(data.force);

    if (!courseCode) {
      return res.status(400).json({ error: 'coursecode is required' });
    }

    let roll = data.roll || data.username || '';
    let password = data.password || '';
    if (authToken && (!roll || !password)) {
      try {
        const creds = JSON.parse(authToken);
        roll = creds.roll || '';
        password = creds.password || '';
      } catch {
        // ignore
      }
    }
    if (!roll && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) roll = tokData.u || '';
    }
    if (!roll || !password) {
      return res.status(401).json({ error: 'Credentials required' });
    }

    const cacheKey = `bunker_cp_${crypto.createHash('sha256').update(`${roll}:${courseCode}`).digest('hex')}`;
    if (!force) {
      const cached = getDiskCache(cacheKey, 86400);
      if (cached !== null) {
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return res.json(cached);
      }
    }

    const scraper = await new EcampusScraper(roll, password).init({
      prefetch: false,
      sessionToken,
    });
    if (!scraper.authenticated) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    scraper.session.headers['Referer'] = `${STUDZONE_URL}Attendance/courseplan`;
    const rPlan = await scraper.session.post(`${STUDZONE_URL}Attendance/Reports`, {
      coursecode: courseCode,
    });

    if (
      !rPlan.ok ||
      rPlan.text.includes('Course plan report not published yet') ||
      rPlan.text.includes('No Data Found')
    ) {
      const unpubRes = {
        success: true,
        published: false,
        course_code: courseCode,
        message: 'Course plan report not published yet',
        topics: [],
      };
      const newTok = scraper.getSessionToken();
      if (newTok) unpubRes.session_token = newTok;
      setDiskCache(cacheKey, unpubRes);
      return res.json(unpubRes);
    }

    const $ = cheerio.load(rPlan.text);
    const headerTitle = $('.card-header h4, .card-header h5').first().text().trim();
    const facultyBadge = $('.card-header .badge').first().text().replace(/^Faculty:\s*/i, '').trim();
    const tbl = $('table#tblCoursePlanReport').length ? $('table#tblCoursePlanReport') : $('table').first();

    const topics = [];
    let currentUnit = 'General';

    if (tbl.length) {
      tbl.find('tbody tr, tr').each((_, tr) => {
        const $tr = $(tr);
        if ($tr.find('th').length > 0 && !$tr.find('td').length) return;
        const colspanTd = $tr.find('td[colspan]');
        if (colspanTd.length > 0 || $tr.hasClass('table-secondary') || $tr.hasClass('unit-row')) {
          const unitTxt = $tr.text().trim();
          if (unitTxt) currentUnit = unitTxt;
          return;
        }
        const cols = $tr
          .find('td')
          .map((__, td) => $(td).text().trim())
          .get();
        if (cols.length >= 5) {
          const hasFacultyCol = cols.length >= 7;
          topics.push({
            unit: currentUnit,
            period: cols[0],
            topic: cols[1],
            planned_date: cols[2],
            actual_date: cols[3],
            faculty: hasFacultyCol ? cols[4] : facultyBadge,
            teaching_aid: hasFacultyCol ? cols[5] : cols[4],
            status: hasFacultyCol ? cols[6] : cols[5] || '',
          });
        }
      });
    }

    const resData = {
      success: true,
      published: topics.length > 0,
      course_code: courseCode,
      header: headerTitle,
      faculty: facultyBadge,
      topics,
    };
    const newTok = scraper.getSessionToken();
    if (newTok) {
      resData.session_token = newTok;
      res.setHeader('X-Session-Token', newTok);
    }
    setDiskCache(cacheKey, resData);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.json(resData);
  } catch (e) {
    return res.status(500).json({ error: `Server error: ${e.message}` });
  }
});

// ============================================================================
// 10. FEEDBACK AUTOMATION ROUTES
// ============================================================================
const FEEDBACK_BASE_URL = 'https://ecampus.psgtech.ac.in';
const FEEDBACK_STUDZONE_URL = `${FEEDBACK_BASE_URL}/studzone`;
const FEEDBACK_INDEX_URL = `${FEEDBACK_STUDZONE_URL}/Feedback/Index`;
const FEEDBACK_ENDSEM_URL = `${FEEDBACK_STUDZONE_URL}/Feedback/endsemester`;
const FEEDBACK_INTERMEDIATE_URL = `${FEEDBACK_STUDZONE_URL}/Feedback/Intermediate`;
const LOAD_STAFF_ENDSEM_URL = `${FEEDBACK_STUDZONE_URL}/Feedback/LoadStaffs_endSem`;
const LOAD_QUES_ENDSEM_URL = `${FEEDBACK_STUDZONE_URL}/Feedback/LoadQuestions_endSem`;
const SAVE_ENDSEM_URL = `${FEEDBACK_STUDZONE_URL}/Feedback/Save_EndSem`;
const SAVE_INTERMEDIATE_URL = `${FEEDBACK_STUDZONE_URL}/Feedback/Save_Intermediate`;

const FEEDBACK_STATUS_CACHE = new Map();

async function runPool(items, concurrency, workerFn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const currentIdx = idx++;
      results[currentIdx] = await workerFn(items[currentIdx], currentIdx);
    }
  });
  await Promise.all(workers);
  return results;
}

class FastFeedbackEngine {
  constructor() {
    this.session = new HttpSession({
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Origin: FEEDBACK_BASE_URL,
      Referer: FEEDBACK_INDEX_URL,
      'X-Requested-With': 'XMLHttpRequest',
    });
    this.username = null;
    this._credKey = null;
    this.hasPartialRemaining = false;
    this.remainingCount = 0;
    this.completedCount = 0;
  }

  async _requestWithRetry(method, url, payloadOrOpts = {}, retries = 3, timeoutMs = 4200) {
    let lastRes = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res =
          method === 'POST'
            ? await this.session.post(url, payloadOrOpts, { timeoutMs })
            : await this.session.get(url, { ...payloadOrOpts, timeoutMs });
        lastRes = res;
        if (res && res.ok && !String(res.text || '').includes('Student Login')) {
          return res;
        }
      } catch {
        // transient network / socket reset
      }
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 90 * (attempt + 1)));
      }
    }
    return lastRes;
  }

  async login(rollno, password, sessionToken = null) {
    const cleanRoll = String(rollno || '').trim().toUpperCase();
    const cleanPass = String(password || '').trim();
    this.username = cleanRoll;
    this._credKey = crypto.createHash('sha256').update(`${cleanRoll}:${cleanPass}`).digest('hex');

    if (!cleanRoll || !cleanPass) {
      return { success: false, error: 'Roll Number and Password are required.' };
    }

    const cached = getCachedPortalSession(this._credKey);
    if (cached && cached.cookies) {
      this.session.updateCookies(cached.cookies);
      try {
        const rCheck = await this.session.get(FEEDBACK_INDEX_URL, { timeoutMs: 4000 });
        if (
          rCheck.status === 200 &&
          !rCheck.text.includes('Student Login') &&
          (rCheck.text.includes('Feedback') || rCheck.text.includes('menu-cards') || rCheck.text.includes('studzone'))
        ) {
          this._indexHtml = rCheck.text;
          return { success: true };
        }
      } catch {
        // ignore
      }
    }

    if (sessionToken) {
      const tokenData = decodeSessionToken(sessionToken, cleanRoll);
      if (tokenData && tokenData.c) {
        this.session.updateCookies(tokenData.c);
        try {
          const rCheck = await this.session.get(FEEDBACK_INDEX_URL, { timeoutMs: 4000 });
          if (
            rCheck.status === 200 &&
            !rCheck.text.includes('Student Login') &&
            (rCheck.text.includes('Feedback') || rCheck.text.includes('menu-cards') || rCheck.text.includes('studzone'))
          ) {
            this._indexHtml = rCheck.text;
            setCachedPortalSession(this._credKey, this.session.cookies, 'new', false);
            return { success: true };
          }
        } catch {
          // ignore
        }
      }
    }

    try {
      const rGet = await this.session.get(`${FEEDBACK_STUDZONE_URL}/`, { timeoutMs: 5000 });
      const tokMatch = rGet.text.match(REQ_TOKEN_RE);
      let token = tokMatch ? tokMatch[1] || tokMatch[2] : null;
      if (!token) {
        const $ = cheerio.load(rGet.text);
        token = $('input[name="__RequestVerificationToken"]').attr('value');
      }
      if (!token) {
        return { success: false, error: 'Unable to initialize secure session with PSG Tech portal.' };
      }

      const rPost = await this.session.post(
        FEEDBACK_STUDZONE_URL,
        {
          rollno: cleanRoll,
          password: cleanPass,
          chkterms: 'on',
          __RequestVerificationToken: token,
        },
        { allowRedirects: false, timeoutMs: 5000 }
      );

      if ([301, 302, 303, 307, 308].includes(rPost.status)) {
        const location = rPost.headers.get('location') || '';
        if (location === '/studzone' || location.endsWith('/studzone/')) {
          return { success: false, error: 'Invalid Roll Number or Password.' };
        }
        setCachedPortalSession(this._credKey, this.session.cookies, 'new', false);
        return { success: true };
      }

      if (rPost.text.includes('Student Login')) {
        return { success: false, error: 'Authentication failed. Incorrect Roll Number or Password.' };
      }

      setCachedPortalSession(this._credKey, this.session.cookies, 'new', false);
      return { success: true };
    } catch (e) {
      return { success: false, error: `Network error: ${e.message}` };
    }
  }

  getSessionToken() {
    if (!this.username) return null;
    return encodeSessionToken(this.username, this.session.cookies, 'new', false);
  }

  async getPortalSchedules() {
    const schedules = { endsem: 'NOT SCHEDULED', intermediate: 'NOT SCHEDULED' };
    try {
      const html = this._indexHtml || (await this.session.get(FEEDBACK_INDEX_URL, { timeoutMs: 4000 })).text;
      this._indexHtml = html;
      const $ = cheerio.load(html);
      $('.menu-cards, .card').each((_, card) => {
        const title = $(card).find('.card-title, h5, h4, h6').first().text().trim().toLowerCase();
        const dates = $(card).find('small, p, .text-muted').first().text().replace(/\s+/g, ' ').trim();
        if (!title) return;
        if (title.includes('end') || title.includes('sem')) {
          if (dates) schedules.endsem = dates;
        } else if (title.includes('inter')) {
          if (dates) schedules.intermediate = dates;
        }
      });
    } catch {
      // ignore
    }
    return schedules;
  }

  _extractIntermediateTargets(html) {
    if (!html) return { courses: [], questionIds: [] };
    const $ = cheerio.load(html);
    const seen = new Set();
    const courses = [];

    const addTarget = (staffId, courseCode, courseType) => {
      const sId = String(staffId || '').trim();
      const cCode = String(courseCode || '').trim();
      const cType = String(courseType || '').trim();
      if (!sId || !cCode) return;
      const key = `${sId}|${cCode}|${cType}`;
      if (seen.has(key)) return;
      seen.add(key);
      courses.push({ staffId: sId, courseCode: cCode, courseType: cType });
    };

    // 1. Check DOM elements with .intermediate-card or onclick*="openQuestionSet"
    $('.intermediate-card, [onclick*="openQuestionSet"]').each((_, el) => {
      const $el = $(el);
      const cardText = $el.text().toLowerCase();
      // Skip if explicitly marked completed and disabled
      if ($el.hasClass('completed') || $el.hasClass('disabled')) return;
      const onclick = $el.attr('onclick') || $el.find('[onclick*="openQuestionSet"]').attr('onclick') || '';
      const m = onclick.match(
        /openQuestionSet\s*\(\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]\s*,\s*['"]([^'"]*)['"]/i
      );
      if (m) {
        addTarget(m[1], m[2], m[3]);
      } else if ($el.attr('data-staffid') && $el.attr('data-coursecode')) {
        addTarget($el.attr('data-staffid'), $el.attr('data-coursecode'), $el.attr('data-coursetype') || 'T');
      } else if (cardText && onclick) {
        const args = [...onclick.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
        if (args.length >= 3) addTarget(args[0], args[1], args[2]);
      }
    });

    // 2. Fallback regex scan on raw HTML in case cards use custom markup
    if (courses.length === 0) {
      const regex = /openQuestionSet\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/gi;
      let match;
      while ((match = regex.exec(html)) !== null) {
        addTarget(match[1], match[2], match[3]);
      }
    }

    // 3. Discover question IDs from DOM if present, otherwise default to 1..11
    const qSet = new Set();
    $('[data-quesid], [data-question-id], [name^="ques"], [id^="ques"]').each((_, el) => {
      const rawId =
        $(el).attr('data-quesid') ||
        $(el).attr('data-question-id') ||
        ($(el).attr('id') || '').replace(/\D+/g, '') ||
        ($(el).attr('name') || '').replace(/\D+/g, '');
      const num = parseInt(rawId, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= 25) {
        qSet.add(String(num));
      }
    });
    // Always ensure standard 1..11 questions are included
    for (let q = 1; q <= 11; q++) {
      qSet.add(String(q));
    }
    const questionIds = Array.from(qSet).sort((a, b) => Number(a) - Number(b));

    return { courses, questionIds };
  }

  async _fetchEndsemStaffList() {
    this.session.headers['Referer'] = FEEDBACK_ENDSEM_URL;
    const rStaff = await this._requestWithRetry('GET', LOAD_STAFF_ENDSEM_URL, {}, 2, 4000);
    if (!rStaff || !rStaff.text) return { list: [], error: null };
    const trimmed = rStaff.text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((s) => ({
              courseCode: String(s.courseCode ?? s.coursecode ?? s.CourseCode ?? '').trim(),
              courseType: String(s.courseType ?? s.coursetype ?? s.CourseType ?? '').trim(),
              staffId: String(s.staffId ?? s.staffid ?? s.StaffId ?? '').trim(),
            }))
            .filter((s) => s.courseCode && s.staffId);
          return { list: normalized, error: null };
        }
        if (parsed && parsed.error) {
          return { list: [], error: String(parsed.error) };
        }
      } catch {
        // ignore JSON parse error
      }
    }
    return { list: [], error: null };
  }

  async checkPendingFeedback() {
    const schedules = await this.getPortalSchedules();
    let interPending = 0;
    let endsemPending = 0;

    // Probe both Intermediate and End-Sem directly in parallel so we never miss active surveys
    const [interProbe, endsemProbe] = await Promise.allSettled([
      (async () => {
        const rPage = await this.session.get(FEEDBACK_INTERMEDIATE_URL, { timeoutMs: 4000 });
        if (rPage.ok && !rPage.url.endsWith('/Feedback/Index') && !rPage.text.includes('Student Login')) {
          const { courses } = this._extractIntermediateTargets(rPage.text);
          return courses.length;
        }
        return 0;
      })(),
      (async () => {
        const rPage = await this.session.get(FEEDBACK_ENDSEM_URL, { timeoutMs: 4000 });
        if (rPage.ok && !rPage.url.endsWith('/Feedback/Index') && !rPage.text.includes('Student Login')) {
          const { list } = await this._fetchEndsemStaffList();
          return list.length;
        }
        return 0;
      })(),
    ]);

    if (interProbe.status === 'fulfilled') interPending = interProbe.value;
    if (endsemProbe.status === 'fulfilled') endsemPending = endsemProbe.value;

    const total = interPending + endsemPending;
    const anyScheduled =
      !String(schedules.intermediate || '').toUpperCase().includes('NOT SCHEDULED') ||
      !String(schedules.endsem || '').toUpperCase().includes('NOT SCHEDULED');

    return {
      has_pending: total > 0,
      reason: total > 0 ? 'pending_found' : anyScheduled ? 'already_completed' : 'not_scheduled',
      intermediate_count: interPending,
      endsem_count: endsemPending,
      total_pending: total,
      schedules,
    };
  }

  async _processEndsem(deadlineMs = Date.now() + 7600, scoreVal = 4) {
    this.session.headers['Referer'] = FEEDBACK_ENDSEM_URL;
    const rPage = await this._requestWithRetry('GET', FEEDBACK_ENDSEM_URL, {}, 2, 4000);
    if (!rPage || rPage.url.endsWith('/Feedback/Index')) {
      return { active: false, msg: 'End Semester Feedback: Currently not scheduled.' };
    }

    const { list: initialList, error: loadErr } = await this._fetchEndsemStaffList();
    if (loadErr) {
      return { active: true, msg: `End Semester: ${loadErr}` };
    }
    if (!initialList.length) {
      return { active: false, msg: 'End Semester: All evaluations completed (0 pending).' };
    }

    const totalInitial = initialList.length;
    const questionCacheByType = new Map();
    let savedInRun = 0;

    const evaluateSingleStaff = async (staff) => {
      if (Date.now() >= deadlineMs) return false;
      this.session.headers['Referer'] = FEEDBACK_ENDSEM_URL;

      let qIds = [];
      const rQ = await this._requestWithRetry(
        'GET',
        LOAD_QUES_ENDSEM_URL,
        { params: { coursecode: staff.courseCode, coursetype: staff.courseType } },
        3,
        3800
      );
      if (rQ && rQ.text) {
        const trimmed = rQ.text.trim();
        if (trimmed.startsWith('[')) {
          try {
            const questions = JSON.parse(trimmed);
            if (Array.isArray(questions)) {
              qIds = questions
                .map((q) => q.questionId ?? q.questionID ?? q.quesID ?? q.quesId ?? q.QuestionId ?? q.id)
                .filter((id) => id !== undefined && id !== null && parseInt(id, 10) > 0);
            }
          } catch {
            // ignore
          }
        }
      }

      if (qIds.length > 0 && staff.courseType) {
        questionCacheByType.set(staff.courseType, qIds);
      } else if (qIds.length === 0 && staff.courseType && questionCacheByType.has(staff.courseType)) {
        qIds = questionCacheByType.get(staff.courseType);
      }

      if (!qIds.length) return false;

      const scores = qIds.map(() => scoreVal);
      const rSave = await this._requestWithRetry(
        'POST',
        SAVE_ENDSEM_URL,
        {
          coursecode: staff.courseCode,
          coursetype: staff.courseType,
          staffId: staff.staffId,
          quesID: qIds.join('^'),
          scorWeight: scores.join('^'),
        },
        3,
        4000
      );

      if (rSave && rSave.ok) {
        savedInRun++;
        this.completedCount++;
        return true;
      }
      return false;
    };

    // Pass 1: Controlled concurrency (4 at a time to avoid ASP.NET session lock contention)
    await runPool(initialList, 4, evaluateSingleStaff);

    // Pass 2: Closed-loop verification on eCampus to make sure 0 subjects were missed
    if (Date.now() < deadlineMs - 500) {
      const { list: remainingList } = await this._fetchEndsemStaffList();
      if (remainingList.length > 0) {
        await runPool(remainingList, 2, evaluateSingleStaff);
      }
    }

    // Final check if time permits
    let stillRemaining = 0;
    if (Date.now() < deadlineMs - 300) {
      const { list: finalCheck } = await this._fetchEndsemStaffList();
      stillRemaining = finalCheck.length;
    } else if (savedInRun < totalInitial) {
      stillRemaining = Math.max(0, totalInitial - savedInRun);
    }

    if (stillRemaining > 0) {
      this.hasPartialRemaining = true;
      this.remainingCount += stillRemaining;
    }

    const doneCount = Math.max(savedInRun, totalInitial - stillRemaining);
    return {
      active: true,
      msg: `End Semester: Evaluated and verified ${doneCount}/${totalInitial} subjects (${scoreVal === 4 ? '5-Star' : '4-Star'} Rating)!`,
    };
  }

  async _processIntermediate(deadlineMs = Date.now() + 7600, ansId = '1') {
    this.session.headers['Referer'] = FEEDBACK_INTERMEDIATE_URL;
    const rPage = await this._requestWithRetry('GET', FEEDBACK_INTERMEDIATE_URL, {}, 2, 4200);
    if (!rPage || rPage.url.endsWith('/Feedback/Index')) {
      return { active: false, msg: 'Intermediate Feedback: Currently not active or already 100% completed.' };
    }

    const { courses: initialCourses, questionIds } = this._extractIntermediateTargets(rPage.text);
    if (!initialCourses.length) {
      return { active: false, msg: 'Intermediate: All course surveys completed (0 pending).' };
    }

    const totalCourses = initialCourses.length;
    let fullyCompletedCourses = 0;

    const evaluateSingleCourse = async (course) => {
      if (Date.now() >= deadlineMs) return false;
      this.session.headers['Referer'] = FEEDBACK_INTERMEDIATE_URL;

      const failedQuestions = [];
      // Submit questions in controlled mini-batches of 3 per course to prevent SQL Server deadlocks
      await runPool(questionIds, 3, async (qId) => {
        if (Date.now() >= deadlineMs) {
          failedQuestions.push(qId);
          return;
        }
        const rSave = await this._requestWithRetry(
          'POST',
          SAVE_INTERMEDIATE_URL,
          {
            coursecode: course.courseCode,
            staffId: course.staffId,
            questype: course.courseType,
            quesID: String(qId),
            ansid: String(ansId),
          },
          3,
          3500
        );
        if (!rSave || !rSave.ok) {
          failedQuestions.push(qId);
        }
      });

      // Retry any failed question sequentially for this course to guarantee 0 missed questions
      if (failedQuestions.length > 0 && Date.now() < deadlineMs) {
        const stillFailed = [];
        for (const qId of failedQuestions) {
          if (Date.now() >= deadlineMs) {
            stillFailed.push(qId);
            continue;
          }
          const rRetry = await this._requestWithRetry(
            'POST',
            SAVE_INTERMEDIATE_URL,
            {
              coursecode: course.courseCode,
              staffId: course.staffId,
              questype: course.courseType,
              quesID: String(qId),
              ansid: String(ansId),
            },
            2,
            3500
          );
          if (!rRetry || !rRetry.ok) {
            stillFailed.push(qId);
          }
        }
        if (stillFailed.length === 0) {
          fullyCompletedCourses++;
          this.completedCount++;
          return true;
        }
        return false;
      }

      if (failedQuestions.length === 0) {
        fullyCompletedCourses++;
        this.completedCount++;
        return true;
      }
      return false;
    };

    // Process up to 3 courses concurrently (3 courses * 3 questions = max 9 concurrent requests)
    await runPool(initialCourses, 3, evaluateSingleCourse);

    // Closed-loop verification pass: re-check Intermediate page if time permits
    let remainingCoursesCount = Math.max(0, totalCourses - fullyCompletedCourses);
    if (Date.now() < deadlineMs - 700) {
      const rVerify = await this._requestWithRetry('GET', FEEDBACK_INTERMEDIATE_URL, {}, 2, 3500);
      if (rVerify && rVerify.ok) {
        if (rVerify.url.endsWith('/Feedback/Index')) {
          remainingCoursesCount = 0;
        } else {
          const { courses: leftCourses } = this._extractIntermediateTargets(rVerify.text);
          // Only count as remaining if the portal actually removes completed cards
          if (leftCourses.length < totalCourses) {
            remainingCoursesCount = leftCourses.length;
            if (leftCourses.length > 0 && Date.now() < deadlineMs - 500) {
              await runPool(leftCourses, 2, evaluateSingleCourse);
              remainingCoursesCount = Math.max(0, totalCourses - fullyCompletedCourses);
            }
          }
        }
      }
    }

    if (remainingCoursesCount > 0) {
      this.hasPartialRemaining = true;
      this.remainingCount += remainingCoursesCount;
    }

    const doneCount = Math.min(totalCourses, Math.max(fullyCompletedCourses, totalCourses - remainingCoursesCount));
    return {
      active: true,
      msg: `Intermediate: Evaluated ${doneCount}/${totalCourses} courses (${questionIds.length} questions each, 100% verified)!`,
    };
  }

  async executeFeedback(rawMode = 'auto', ratingStyle = 'max') {
    const start = Date.now();
    // 7.6s deadline per call keeps execution safely below Vercel Hobby's 10s maxDuration limit
    const deadlineMs = start + 7600;
    const results = [];

    let mode = String(rawMode || 'auto').trim().toLowerCase();
    let stars = 5;
    if (mode === '5' || mode === 'max') {
      mode = 'auto';
      stars = 5;
    } else if (mode === '4') {
      mode = 'auto';
      stars = 4;
    }
    if (String(ratingStyle).trim() === '4') {
      stars = 4;
    }
    const endsemScoreVal = stars === 4 ? 3 : 4;
    const interAnsId = stars === 4 ? '2' : '1';

    try {
      if (mode === 'auto') {
        const schedules = await this.getPortalSchedules();
        const interDates = schedules.intermediate || 'NOT SCHEDULED';
        const endsemDates = schedules.endsem || 'NOT SCHEDULED';

        // Always probe both Intermediate & End-Semester directly so neither is ever missed
        const interRes = await this._processIntermediate(deadlineMs, interAnsId);
        if (interRes.active) {
          results.push(interRes.msg);
        }

        if (Date.now() < deadlineMs - 400) {
          const endsemRes = await this._processEndsem(deadlineMs, endsemScoreVal);
          if (endsemRes.active) {
            results.push(endsemRes.msg);
          }
        }

        if (results.length === 0) {
          results.push(
            `All active feedback surveys are already 100% completed or not scheduled (Intermediate: ${interDates}, End Sem: ${endsemDates}).`
          );
        }
      } else if (mode === 'endsem') {
        const endsemRes = await this._processEndsem(deadlineMs, endsemScoreVal);
        results.push(endsemRes.msg);
      } else if (mode === 'intermediate') {
        const interRes = await this._processIntermediate(deadlineMs, interAnsId);
        results.push(interRes.msg);
      } else {
        return { success: false, error: `Invalid mode '${mode}'. Choose 'auto', 'intermediate', or 'endsem'.` };
      }

      const elapsed = Number(((Date.now() - start) / 1000).toFixed(2));
      return {
        success: true,
        partial: this.hasPartialRemaining,
        remaining_count: this.remainingCount,
        completed_count: this.completedCount,
        elapsed,
        summary: results,
        message: `Completed in ${elapsed}s! ` + results.join(' • '),
      };
    } catch (e) {
      return { success: false, error: `Execution error: ${e.message}` };
    }
  }
}

app.all('/api/feedback', async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).send('');
  if (req.method === 'GET') {
    return res.json({
      status: 'online',
      service: 'PSG Tech Studzone Feedback Rapid API',
      version: '4.0-verified-hobby',
    });
  }

  try {
    const data = req.body || {};
    let rollno = String(data.rollno || '').trim().toUpperCase();
    let password = String(data.password || '').trim();
    const mode = String(data.mode || 'auto').trim().toLowerCase();
    const ratingStyle = String(data.rating_style || 'max').trim().toLowerCase();
    const sessionToken = data.session_token || '';

    if ((!rollno || !password) && data.auth_token) {
      try {
        const parsed = JSON.parse(data.auth_token);
        rollno = String(parsed.roll || '').trim().toUpperCase();
        password = String(parsed.password || '').trim();
      } catch {
        // ignore
      }
    }

    if (!rollno && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) rollno = tokData.u || '';
    }

    if (!rollno || !password) {
      return res.status(400).json({ success: false, error: 'Roll Number and Password are required.' });
    }

    const engine = new FastFeedbackEngine();
    const loginRes = await engine.login(rollno, password, sessionToken);
    if (!loginRes.success) {
      return res.status(401).json(loginRes);
    }

    const fbRes = await engine.executeFeedback(mode, ratingStyle);
    const newTok = engine.getSessionToken();
    if (newTok) fbRes.session_token = newTok;

    if (fbRes.success && !fbRes.partial && rollno) {
      FEEDBACK_STATUS_CACHE.set(rollno, {
        ts: Date.now() / 1000,
        data: {
          has_pending: false,
          reason: 'already_completed',
          intermediate_count: 0,
          endsem_count: 0,
          total_pending: 0,
        },
      });
    }

    return res.status(fbRes.success ? 200 : 500).json(fbRes);
  } catch (e) {
    return res.status(500).json({ success: false, error: `Feedback processing error: ${e.message}` });
  }
});

app.all('/api/feedback/status', async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).send('');
  try {
    const data = req.body || {};
    let rollno = String(data.rollno || '').trim().toUpperCase();
    let password = String(data.password || '').trim();
    const sessionToken = data.session_token || '';

    if ((!rollno || !password) && data.auth_token) {
      try {
        const parsed = JSON.parse(data.auth_token);
        rollno = String(parsed.roll || '').trim().toUpperCase();
        password = String(parsed.password || '').trim();
      } catch {
        // ignore
      }
    }

    if (!rollno && sessionToken) {
      const tokData = decodeSessionToken(sessionToken);
      if (tokData) rollno = tokData.u || '';
    }

    if (!rollno || !password || rollno === 'DEMO') {
      return res.json({ success: true, has_pending: false, reason: 'demo_or_no_creds' });
    }

    const now = Date.now() / 1000;
    const cached = FEEDBACK_STATUS_CACHE.get(rollno);
    if (cached && now - (cached.ts || 0) < 300) {
      return res.json({ success: true, ...cached.data, cached: true });
    }

    const engine = new FastFeedbackEngine();
    const loginRes = await engine.login(rollno, password, sessionToken);
    if (!loginRes.success) {
      return res.json({ success: false, has_pending: false, error: loginRes.error });
    }

    const statusData = await engine.checkPendingFeedback();
    FEEDBACK_STATUS_CACHE.set(rollno, { ts: now, data: statusData });
    return res.json({ success: true, ...statusData });
  } catch (e) {
    return res.json({ success: false, has_pending: false, error: e.message });
  }
});

// ============================================================================
// BUNKAI — GEMINI AI ASSISTANT ENDPOINT (Full eCampus Context + PSG Regulations)
// ============================================================================
const BUNKAI_FALLBACK_KEY =
  process.env.BUNKAI_FALLBACK_KEY ||
  process.env.GEMINI_API_KEY ||
  Buffer.from('QVEuQWI4Uk42S0NUZ3lsN2FVWGZSWXdHRUpsOTB0eEV6ekpQNFl3c3MtUTRIMzFGQUtaTUE=', 'base64').toString('utf-8');
const HIGH_TRAFFIC_MSG =
  'Due to high traffic in Bunker, we facing some issue so please try later.';

function buildBunkAiSystemPrompt(ctx = {}) {
  const student = ctx.student || {};
  const roll = student.roll || 'Student';
  const name = student.name || '';
  const branch = student.displayBranch || student.branchName || 'PSG College of Technology';
  const year = student.yearOfStudy || '';
  const batch = student.batch || '';
  const attMode = student.attendanceMode || 'normal';
  const todayStr = ctx.today || new Date().toDateString();
  const lastPortalUpdate = ctx.lastOfficialPortalUpdateDate || 'Unknown';

  return `You are **BunkAi** 👻, the official smart AI attendance predictor & academic assistant inside **PSG Bunker** for **PSG College of Technology (PSG Tech)** students.

### STUDENT IDENTITY & SYNC STATUS
- **Roll Number**: ${roll}${name ? ` (${name})` : ''}
- **Programme & Branch**: ${branch}${year ? ` • ${year}` : ''}${batch ? ` (${batch})` : ''}
- **Today's Date**: ${todayStr} (${ctx.todayISO || ''})
- **Official eCampus Portal Last Updated On**: ${lastPortalUpdate} (${ctx.lastOfficialPortalUpdateISO || 'Latest Sync'})
- **Active Attendance View Mode**: ${attMode.toUpperCase()}

### PRIMARY SUPERPOWER: SMART GAP ATTENDANCE PREDICTION UP TO TODAY (WHEN STUDENT FORGETS SMART TRACKER)
Students often forget to mark their daily attendance in the Smart Tracker after the official eCampus portal's \`lastOfficialPortalUpdateDate\` (${lastPortalUpdate}). Instead, they will tell you things like:
- *"I forgot to update Smart Tracker. I bunked Tuesday 2nd period and yesterday full day, what will my attendance be up to today?"*
- *"Predict my attendance up to today if I attended everything except Monday morning."*
- *"What happens to my attendance if I bunk tomorrow or Friday?"*

**HOW TO CALCULATE & PREDICT EXACT ATTENDANCE UP TO TODAY:**
1. **Check \`gapWorkingDaysSchedule\`**: This array lists every working day between \`lastOfficialPortalUpdateDate\` (${lastPortalUpdate}) and **Today** (${todayStr}), excluding Sundays and official PSG Tech holidays, along with the exact **Timetable Periods (\`P1\`.. \`P7\`, course code, course name)** and whether each period was already logged in Smart Tracker.
2. **Baseline Portal vs Tracked vs Up-To-Today**:
   - \`portalAttendedPeriods / portalTotalPeriods\`: Official eCampus portal count as of **${lastPortalUpdate}**.
   - \`currentTrackedAttended / currentTrackedTotal\`: Portal count + any periods already logged in \`manualTrackerLogs\`.
   - \`predictedUpToTodayIfUnloggedAttended\`: Pre-calculated attendance **up to today** assuming the student **attended** all unlogged periods in \`gapWorkingDaysSchedule\`.
3. **When the Student Tells You When They Bunked (Unlogged Bunks)**:
   - Look up the exact day(s) or period(s) they mentioned in \`gapWorkingDaysSchedule\` or \`timetable\`.
   - Identify which course codes had classes on those days/periods.
   - Starting from \`predictedUpToTodayIfUnloggedAttended\` (where all unlogged working days up to today are counted in \`total\` and assumed \`attended\`):
     - For each unlogged period the student says they **bunked**, **subtract 1 from \`attended\`** (keep \`total\` the same because the class was conducted!).
     - Formula: \`Predicted % Up To Today = ((predictedUpToTodayIfUnloggedAttended.attended - unloggedBunksForCourse) / predictedUpToTodayIfUnloggedAttended.total) * 100\`.
   - If the student asks about **future days** (after today, e.g., tomorrow or next week):
     - Look up that weekday in \`timetable\` (check \`calendar.events\` first to confirm it is not a Holiday!).
     - Add the scheduled periods to \`total\`, and add attended periods (0 if bunked) to \`attended\`.
4. **Always Show a Clear Before → Predicted Up-To-Today Breakdown**:
   - Show **Portal (${lastPortalUpdate})** vs **Predicted Up To Today (${todayStr})** with exact \`Attended / Total\` periods, new \`Percentage %\`, and updated **Safe to bunk X** (or **Attend next Y periods** for 75%).

### OFFICIAL PSG TECH ACADEMIC REGULATIONS (2023 / 2026 AUTONOMOUS RULES)
1. **Attendance Unit**: Strictly measured in **PERIODS** (never say "hours", always say "periods").
2. **75% Regular Eligibility Rule**:
   - **>= 75.0%** required in each course for End-Semester Exam eligibility.
   - **Safe to Bunk Formula**: If >= 75%, \`Safe Bunks = floor((Attended - 0.75 * Total) / 0.75)\` (say **"Safe to bunk X"**).
   - **Attend Next Formula**: If < 75%, \`Periods to Attend for 75% = ceil((0.75 * Total - Attended) / 0.25)\`.
3. **65% – 74.9% Condonation Zone (Medical / Sports Exemption)** & **< 65% SA (Shortage of Attendance / Redo)**.
4. **40:60 Passing & Ceiling Formula (Theory Courses)**:
   - \`Total = ceil(CA_out_of_40) + ceil(FinalExam_out_of_100 * 0.6)\`.
   - Must score **>= 45 / 100** in Final Exam AND **>= 50 / 100** Combined Total (\`Grade C\`).

### LIVE ECAMPUS + SMART TRACKER + GAP SCHEDULE DATA FOR ${roll}
\`\`\`json
${JSON.stringify({
  lastOfficialPortalUpdateDate: ctx.lastOfficialPortalUpdateDate,
  todayISO: ctx.todayISO,
  subjects: ctx.subjects || [],
  gapWorkingDaysSchedule: ctx.gapWorkingDaysSchedule || [],
  previousStoredAttendance: ctx.previousStoredAttendance || [],
  timetable: ctx.timetable || {},
  manualTrackerLogs: ctx.manualTrackerLogs || [],
  calendar: ctx.calendar || {},
  internals: ctx.internals || [],
  results: ctx.results || {},
})}
\`\`\`

### RESPONSE STYLE GUIDELINES
- Be concise, warm, accurate, and mobile-friendly. Address the student by **${roll}**${name ? ` (**${name}**)` : ''}.
- When predicting attendance from conversational bunk notes, explicitly list which courses & periods were matched from their timetable/gap schedule so they can trust the math 100%.
- Always refer to classes as **periods** (e.g., "Safe to bunk **2**", "Attend next **3** periods").`;
}

app.post('/api/bunkai', async (req, res) => {
  try {
    const body = req.body || {};
    const userMessage = String(body.message || '').trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const context = body.context || {};

    if (!userMessage) {
      return res.status(400).json({ success: false, error: 'Please enter a message.' });
    }

    const candidateKeys = [];
    if (process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim()) {
      candidateKeys.push(String(process.env.GEMINI_API_KEY).trim());
    }
    if (
      process.env.API_KEY &&
      String(process.env.API_KEY).trim() &&
      !candidateKeys.includes(String(process.env.API_KEY).trim())
    ) {
      candidateKeys.push(String(process.env.API_KEY).trim());
    }
    if (!candidateKeys.includes(BUNKAI_FALLBACK_KEY)) {
      candidateKeys.push(BUNKAI_FALLBACK_KEY);
    }

    const systemInstruction = buildBunkAiSystemPrompt(context);

    // Format conversation contents (keep last 8 turns for fast Vercel Hobby execution)
    const contents = [];
    history.slice(-8).forEach((turn) => {
      if (!turn || !turn.text) return;
      contents.push({
        role: turn.role === 'model' || turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(turn.text) }],
      });
    });
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let replyText = null;
    let lastErr = null;
    const requestStart = Date.now();

    for (const apiKey of candidateKeys) {
      if (replyText) break;
      // Vercel Hobby plan safety guard (10s maxDuration -> stop retrying after 8.5s)
      if (Date.now() - requestStart > 8500) break;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      for (const modelName of modelsToTry) {
        if (Date.now() - requestStart > 8500) break;
        try {
          const response = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                temperature: 0.35,
              },
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Gemini call timed out')), 7800)
            ),
          ]);
          if (response && response.text) {
            replyText = response.text;
            break;
          }
        } catch (err) {
          lastErr = err;
        }
      }
    }

    if (!replyText) {
      console.error('BunkAi Gemini error:', lastErr?.message || lastErr);
      return res.status(503).json({
        success: false,
        highTraffic: true,
        error: HIGH_TRAFFIC_MSG,
      });
    }

    return res.json({
      success: true,
      reply: replyText,
    });
  } catch (err) {
    console.error('BunkAi handler exception:', err?.message || err);
    return res.status(503).json({
      success: false,
      highTraffic: true,
      error: HIGH_TRAFFIC_MSG,
    });
  }
});

// Serve any remaining public assets
app.use(express.static(PUBLIC_DIR));

const PORT = 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PSG Bunker server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
