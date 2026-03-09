const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const dotenv = require('dotenv');

dotenv.config();

const EXCLUDE_TITLES = ['welder', 'nurse', 'driver', 'teacher'];

let activeLinkedInSnapshotId = 'sd_mmht1y0d1cbo6leai7';
let activeIndeedSnapshotId = 'sd_mmhwhxgt2ag3mywh6n';
let lastSyncTime = new Date();
let syncInProgress = false;

const app = express();
app.use(cors());
app.use(express.json());

async function triggerFreshScrape() {
  const bearer = `Bearer ${process.env.BRIGHTDATA_API_KEY}`;

  const linkedInBody = JSON.stringify({
    input: [
      {
        location: 'Montgomery, Alabama',
        keyword: 'data center',
        country: 'US',
        time_range: 'Past month',
        job_type: 'Full-time',
        remote: 'On-site',
        experience_level: '',
        company: '',
        location_radius: ''
      },
      {
        location: 'Huntsville, Alabama',
        keyword: 'data center',
        country: 'US',
        time_range: 'Past month',
        job_type: 'Full-time',
        remote: 'On-site',
        experience_level: '',
        company: '',
        location_radius: ''
      },
      {
        location: 'Alabama',
        keyword: 'critical facilities engineer',
        country: 'US',
        time_range: 'Past month',
        job_type: 'Full-time',
        experience_level: '',
        company: '',
        location_radius: ''
      }
    ]
  });

  const indeedBody = JSON.stringify({
    input: [
      {
        country: 'US',
        domain: 'indeed.com',
        keyword_search: 'data center',
        location: 'Montgomery, AL',
        posted_by: '',
        location_radius: ''
      },
      {
        country: 'US',
        domain: 'indeed.com',
        keyword_search: 'data center technician',
        location: 'Montgomery, AL',
        posted_by: '',
        location_radius: ''
      },
      {
        country: 'US',
        domain: 'indeed.com',
        keyword_search: 'critical facilities',
        location: 'Alabama',
        posted_by: '',
        location_radius: ''
      }
    ]
  });

  const linkedInOptions = {
    hostname: 'api.brightdata.com',
    path: '/datasets/v3/trigger?dataset_id=gd_lpfll7v5hcqtkxl6l&notify=false&include_errors=true&type=discover_new&discover_by=keyword&async=true',
    method: 'POST',
    headers: {
      'Authorization': bearer,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(linkedInBody)
    }
  };

  const indeedOptions = {
    hostname: 'api.brightdata.com',
    path: '/datasets/v3/trigger?dataset_id=gd_l4dx9j9sscpvs7no2&notify=false&include_errors=true&type=discover_new&discover_by=keyword&async=true',
    method: 'POST',
    headers: {
      'Authorization': bearer,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(indeedBody)
    }
  };

  const [linkedInResult, indeedResult] = await Promise.all([
    httpsRequest(linkedInOptions, linkedInBody),
    httpsRequest(indeedOptions, indeedBody)
  ]);

  if (linkedInResult.status < 200 || linkedInResult.status >= 300) {
    throw new Error(`LinkedIn trigger failed (${linkedInResult.status}): ${linkedInResult.body}`);
  }
  if (indeedResult.status < 200 || indeedResult.status >= 300) {
    throw new Error(`Indeed trigger failed (${indeedResult.status}): ${indeedResult.body}`);
  }

  const linkedInData = JSON.parse(linkedInResult.body);
  const indeedData = JSON.parse(indeedResult.body);

  const linkedInSnapshotId = linkedInData.snapshot_id;
  const indeedSnapshotId = indeedData.snapshot_id;

  const pollProgress = async (snapshotId) => {
    const options = {
      hostname: 'api.brightdata.com',
      path: `/datasets/v3/progress/${snapshotId}`,
      method: 'GET',
      headers: {
        'Authorization': bearer,
        'Content-Type': 'application/json'
      }
    };
    const result = await httpsRequest(options);
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Progress check failed (${result.status}): ${result.body}`);
    }
    const data = JSON.parse(result.body);
    return data.status ?? data;
  };

  const donePromise = new Promise((resolve) => {
    let linkedInReady = false;
    let indeedReady = false;

    const tick = async () => {
      try {
        if (!linkedInReady && linkedInSnapshotId) {
          const status = await pollProgress(linkedInSnapshotId);
          if (status === 'ready') {
            linkedInReady = true;
            activeLinkedInSnapshotId = linkedInSnapshotId;
            lastSyncTime = new Date();
            console.log('LinkedIn snapshot updated:', linkedInSnapshotId);
          }
        }

        if (!indeedReady && indeedSnapshotId) {
          const status = await pollProgress(indeedSnapshotId);
          if (status === 'ready') {
            indeedReady = true;
            activeIndeedSnapshotId = indeedSnapshotId;
            console.log('Indeed snapshot updated:', indeedSnapshotId);
          }
        }

        if (linkedInReady && indeedReady) {
          clearInterval(interval);
          resolve();
        }
      } catch (err) {
        console.error('Polling error:', err.message);
      }
    };

    const interval = setInterval(tick, 30 * 1000);
    tick();
  });

  return { linkedInSnapshotId, indeedSnapshotId, donePromise };
}

function httpsRequest(options, postData, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (timeoutMs != null) {
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });
    }
    if (postData) req.write(postData);
    req.end();
  });
}

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function scrapeIndeed() {
  const urls = [
    'https://www.indeed.com/jobs?q=data+center&l=Montgomery%2C+AL',
    'https://www.indeed.com/jobs?q=critical+facilities+engineer&l=Alabama',
    'https://www.indeed.com/jobs?q=data+center+technician&l=Montgomery%2C+AL',
    'https://www.indeed.com/jobs?q=data+center&l=Huntsville%2C+AL',
    'https://www.indeed.com/jobs?q=data+center&l=Birmingham%2C+AL'
  ];

  const allJobs = [];

  for (const url of urls) {
    try {
      const body = JSON.stringify({
        zone: 'montgomerytransparencygap',
        url,
        format: 'raw'
      });
      const options = {
        hostname: 'api.brightdata.com',
        path: '/request',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };
      const result = await httpsRequest(options, body);
      const html = result.body;

      const claudeBody = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Extract job listings from this Indeed HTML. Return ONLY a JSON array with no markdown, no backticks, no explanation. Each object must have: title, company, location, salary (or null), jobKey (the jk= value from URLs if present). Only include jobs related to data centers, critical facilities, IT infrastructure, cloud, HVAC, electrical, or network operations. HTML: ${(html ?? '').substring(0, 15000)}`
        }]
      });

      const claudeOptions = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(claudeBody)
        }
      };

      const claudeResult = await httpsRequest(claudeOptions, claudeBody);
      const claudeData = JSON.parse(claudeResult.body);
      const text = (claudeData?.content?.[0]?.text ?? '').trim();
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      const jsonText = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text;
      const jobs = JSON.parse(jsonText);

      if (Array.isArray(jobs)) {
        jobs.forEach((j) => { j.source = 'Indeed'; });
        allJobs.push(...jobs);
      }
    } catch (err) {
      console.error('Indeed scrape error:', err.message);
    }
  }

  return allJobs;
}

app.get('/api/fred', async (req, res) => {
  try {
    const apiKey = process.env.FRED_API_KEY;
    const options = {
      hostname: 'api.stlouisfed.org',
      path: '/fred/series/observations?series_id=MONT801URN&api_key=' + apiKey + '&file_type=json&sort_order=desc&limit=1',
      method: 'GET'
    };
    const result = await httpsRequest(options);
    const data = JSON.parse(result.body);
    const latest = data.observations[0];
    res.json({ rate: latest.value, date: latest.date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wages', async (req, res) => {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing FRED_API_KEY' });

    const seriesIds = {
      montgomery: 'SMU01338600500000011',
      alabama: 'SMU01000000500000011',
      national: 'CES0500000011'
    };

    const makeOptions = (seriesId) => ({
      hostname: 'api.stlouisfed.org',
      path: `/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`,
      method: 'GET'
    });

    const parseLatest = (body) => {
      const data = JSON.parse(body);
      const latest = data?.observations?.[0];
      const weekly = latest?.value != null ? Number(latest.value) : null;
      const annual = weekly != null && Number.isFinite(weekly) ? weekly * 52 : null;
      const date = latest?.date ?? null;
      return { weekly, annual, date };
    };

    const [montRes, alRes, natRes] = await Promise.all([
      httpsRequest(makeOptions(seriesIds.montgomery)),
      httpsRequest(makeOptions(seriesIds.alabama)),
      httpsRequest(makeOptions(seriesIds.national))
    ]);

    const montgomery = parseLatest(montRes.body);
    const alabama = parseLatest(alRes.body);
    const national = parseLatest(natRes.body);

    const dataCenterAvg = 151676;

    const safePremium = (denomAnnual) => {
      if (denomAnnual == null || !Number.isFinite(denomAnnual) || denomAnnual === 0) return null;
      return Math.round((dataCenterAvg / denomAnnual - 1) * 100);
    };

    res.json({
      montgomery,
      alabama,
      national,
      dataCenterAvg,
      premiumVsNational: safePremium(national.annual),
      premiumVsAlabama: safePremium(alabama.annual),
      premiumVsMontgomery: safePremium(montgomery.annual)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/montgomery', async (req, res) => {
  try {
    res.json({ licenses2026: 1067 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/construction', async (req, res) => {
  try {
    const basePath = '/server/rest/services/HostedDatasets/Construction_Permits/FeatureServer/0/query';
    const outStats = encodeURIComponent('[{"statisticType":"count","onStatisticField":"OBJECTID","outStatisticFieldName":"permitCount"},{"statisticType":"sum","onStatisticField":"EstimatedCost","outStatisticFieldName":"totalCost"}]');

    const fy2026Options = {
      hostname: 'gis.montgomeryal.gov',
      path: `${basePath}?where=IssuedDate+%3E%3D+date+%272025-10-01%27+AND+UseType+%3D+%27Commercial%27&outStatistics=${outStats}&f=json`,
      method: 'GET'
    };
    const fy2025Options = {
      hostname: 'gis.montgomeryal.gov',
      path: `${basePath}?where=IssuedDate+%3E%3D+date+%272024-10-01%27+AND+IssuedDate+%3C+date+%272025-10-01%27+AND+UseType+%3D+%27Commercial%27&outStatistics=${outStats}&f=json`,
      method: 'GET'
    };

    const [fy2026Result, fy2025Result] = await Promise.all([
      httpsRequest(fy2026Options),
      httpsRequest(fy2025Options)
    ]);

    console.log('FY2026 construction raw:', fy2026Result.body);
    console.log('FY2025 construction raw:', fy2025Result.body);
    const fy2026Data = JSON.parse(fy2026Result.body);
    const fy2025Data = JSON.parse(fy2025Result.body);
    const fy2026Attrs = fy2026Data?.features?.[0]?.attributes ?? {};
    const fy2025Attrs = fy2025Data?.features?.[0]?.attributes ?? {};

    const fy2026PermitCount = Number(fy2026Attrs.permitCount) || 0;
    const fy2026TotalCost = Number(fy2026Attrs.totalCost) || 0;
    const fy2025TotalCost = Number(fy2025Attrs.totalCost) || 0;

    const growthPercent = fy2025TotalCost
      ? Math.round(((fy2026TotalCost - fy2025TotalCost) / fy2025TotalCost) * 100)
      : 0;

    const fmt = (n) => {
      if (!Number.isFinite(n)) return '$0.0M';
      if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'B';
      return '$' + (n / 1_000_000).toFixed(1) + 'M';
    };

    const monthsIn = 5;
    const pacedAnnual = monthsIn ? Math.round(((fy2026TotalCost / 1_000_000) * 12) / monthsIn) : 0;
    const pacedFormatted = monthsIn ? fmt((fy2026TotalCost * 12) / monthsIn) : fmt(0);

    res.json({
      fy2026: {
        permitCount: fy2026PermitCount,
        totalCost: Math.round(fy2026TotalCost),
        formatted: fmt(fy2026TotalCost)
      },
      fy2025: {
        totalCost: Math.round(fy2025TotalCost),
        formatted: fmt(fy2025TotalCost)
      },
      growthPercent,
      pacedAnnual,
      pacedFormatted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/salary', async (req, res) => {
  try {
    const bearer = `Bearer ${process.env.BRIGHTDATA_API_KEY}`;

    const fetchSnapshot = async (snapshotId) => {
      const options = {
        hostname: 'api.brightdata.com',
        path: `/datasets/v3/snapshot/${snapshotId}?format=json`,
        method: 'GET',
        headers: {
          'Authorization': bearer
        }
      };
      const result = await httpsRequest(options);
      const body = (result.body ?? '').trim();
      let rows;
      try {
        const parsed = JSON.parse(body);
        rows = Array.isArray(parsed) ? parsed : (parsed.data ?? parsed.results ?? parsed.items ?? []);
      } catch {
        const lines = body.split('\n').filter(Boolean);
        rows = lines.map((line) => JSON.parse(line));
      }
      return Array.isArray(rows) ? rows : [];
    };

    const [linkedInRows, indeedRows] = await Promise.all([
      fetchSnapshot(activeLinkedInSnapshotId),
      activeIndeedSnapshotId ? fetchSnapshot(activeIndeedSnapshotId) : Promise.resolve([])
    ]);

    const linkedInNormalized = (Array.isArray(linkedInRows) ? linkedInRows : []).map((job) => {
      const min = job.base_salary?.min_amount ?? null;
      const max = job.base_salary?.max_amount ?? null;
      const salary = (min != null || max != null)
        ? {
          min_amount: min,
          max_amount: max,
          currency: job.base_salary?.currency ?? null,
          payment_period: job.base_salary?.payment_period ?? null
        }
        : null;

      return {
        title: job.job_title ?? '',
        company: job.company_name ?? '',
        location: job.job_location ?? '',
        job_posted_date: job.job_posted_date ?? null,
        url: job.url ?? null,
        company_logo: job.company_logo ?? null,
        base_salary: job.base_salary ?? null,
        salary,
        job_description_formatted: job.job_description_formatted ?? '',
        source: 'LinkedIn'
      };
    }).filter((j) => j.title && j.company);

    const indeedNormalized = (Array.isArray(indeedRows) ? indeedRows : []).map((job) => {
      const title = job.title ?? job.job_title ?? '';
      const company = job.company ?? job.company_name ?? '';
      const location = job.location ?? job.job_location ?? '';
      const job_posted_date = job.date_posted ?? job.job_posted_date ?? null;
      const url = job.url ?? null;

      const min = job.salary_min ?? job.base_salary?.min_amount ?? null;
      const max = job.salary_max ?? job.base_salary?.max_amount ?? null;

      const salary = (min != null || max != null)
        ? {
          min_amount: min,
          max_amount: max,
          currency: job.base_salary?.currency ?? null,
          payment_period: job.base_salary?.payment_period ?? null
        }
        : null;

      return {
        title,
        company,
        location,
        job_posted_date,
        url,
        company_logo: null,
        base_salary: job.base_salary ?? null,
        salary,
        job_description_formatted: job.job_description_formatted ?? '',
        source: 'Indeed'
      };
    }).filter((j) => j.title && j.company);

    const seen = new Set();
    const mergedDeduped = [];
    const addIfNew = (job) => {
      const title = (job.title ?? '').toLowerCase().trim();
      const company = (job.company ?? '').toLowerCase().trim();
      if (!title || !company) return;
      const normalizedCompany = company
  .replace(/\b(llc|inc|corp|corporation|ltd|co|group|services|solutions)\b\.?/gi, '')
  .replace(/\s+/g, ' ')
  .trim();
const key = `${title}|${normalizedCompany}`;
      if (seen.has(key)) return;
      seen.add(key);
      mergedDeduped.push(job);
    };

    linkedInNormalized.forEach(addIfNew);
    indeedNormalized.forEach(addIfNew);

    const dataCenterRegex = /data.?center|datacenter|critical.?facilit|electrical|mechanical|hvac|controls|network|infrastructure|cloud|facility|facilities|construction.*manager|project.*manager.*data|low.?voltage|fiber|telecom|civil.*engineer|vdc|bim|site.*manager|deployment|connectivity|logistics.*operations|functional.*analyst|help.?desk|linux|systems.*admin/i;
    const excludeRegex = /casino|gaming.?machine|lube.?tech|auto.?tire|automotive|bingo|slot.?machine|car.?wash/i;

    const filteredJobs = mergedDeduped
      .filter((j) => dataCenterRegex.test(j.title ?? ''))
      .filter((j) => !excludeRegex.test(j.title ?? '') && !excludeRegex.test(j.company ?? ''));

    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentJobsArray = filteredJobs.filter((j) => {
      if (!j.job_posted_date) return false;
      const ts = new Date(j.job_posted_date).getTime();
      return Number.isFinite(ts) && ts >= weekAgo;
    });
    const recentJobs = recentJobsArray.length;

    const degreeRegex = /bachelor|degree|bs\/ba|university|college/i;
    const degreeJobs = recentJobsArray.filter((j) => {
      const text = j.job_description_formatted || '';
      return degreeRegex.test(text);
    }).length;
    const degreePercent = recentJobs ? Math.round((degreeJobs / recentJobs) * 100) : 0;

    const withSalary = filteredJobs.filter((j) => {
      const s = j.salary;
      if (!s) return false;
      const max = s.max_amount;
      return Number.isFinite(max) && max > 1000;
    });

    const salaryMid = (s) => {
      if (!s) return null;
      const min = s.min_amount;
      const max = s.max_amount;
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 1000) return null;
      return (min + max) / 2;
    };

    const avg = withSalary.length
      ? Math.round(withSalary.reduce((sum, j) => sum + (salaryMid(j.salary) ?? 0), 0) / withSalary.length)
      : 0;
    const top = withSalary.sort((a, b) => (b.salary?.max_amount ?? 0) - (a.salary?.max_amount ?? 0))[0];

    const allJobs = filteredJobs.map((j) => ({
      title: j.title,
      company: j.company,
      location: j.location,
      job_posted_date: j.job_posted_date,
      url: j.url,
      company_logo: j.company_logo,
      base_salary: j.base_salary,
      salary: j.salary,
      source: j.source
    }));

    res.json({
      avgSalary: avg,
      totalJobs: filteredJobs.length,
      jobsWithSalary: withSalary.length,
      recentJobs,
      degreeJobs,
      degreePercent,
      allJobs,
      topJob: top
        ? { title: top.title, min: top.salary?.min_amount, max: top.salary?.max_amount }
        : null,
      montgomeryMedian: 52000,
      premiumPercent: Math.round(((avg - 52000) / 52000) * 100)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/synthesis', async (req, res) => {
  try {
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);

    const fredData = { rate: '2.3' };
    const montData = { licenses2026: 1067 };
    const constructionData = {
      fy2026: { formatted: '$879.9M' }
    };
    let salaryData = { totalJobs: 41, avgSalary: 141000, premiumPercent: 171 };
    try {
      const salaryRes = await fetch(`http://localhost:${process.env.PORT || 3001}/api/salary`);
      const salaryJson = await salaryRes.json();
      if (salaryJson?.avgSalary) salaryData = salaryJson;
    } catch { /* use fallback */ }

    const prompt = `Based on this live data from Montgomery, AL, write exactly 3 sentences summarizing the economic impact of Meta's data center investment. Be factual and constructive in tone. Focus on: jobs being tracked, salary premium above median, and business growth signals. Do not mention unemployment rate. Use the avgSalary figure provided, not any hardcoded value. Write in plain prose only. Do not use markdown, hashtags, headers, bullet points, or bold text. Three sentences maximum.

Live data:
- Data center jobs tracked: ${salaryData.totalJobs}
- Avg salary: $${salaryData.avgSalary} (${salaryData.premiumPercent}% above median)
- Business licenses 2026: ${montData.licenses2026}
- Commercial construction: ${constructionData.fy2026.formatted}`;

    const synthesisBody = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: prompt
      }]
    });
    const synthesisOptions = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(synthesisBody)
      }
    };
    const synthesisResult = await httpsRequest(synthesisOptions, synthesisBody, 10000);
    console.log('Anthropic synthesis status:', synthesisResult.status);
    console.log('Anthropic synthesis raw body:', synthesisResult.body);

    if (synthesisResult.status < 200 || synthesisResult.status >= 300) {
      let msg = synthesisResult.body;
      try {
        const errJson = JSON.parse(synthesisResult.body);
        msg = errJson?.error?.message ?? errJson?.message ?? synthesisResult.body;
      } catch {
        // ignore
      }
      return res.status(500).json({ error: `Anthropic error (${synthesisResult.status}): ${msg}` });
    }

    const synthesisData = JSON.parse(synthesisResult.body);
    console.log('Claude response:', JSON.stringify(synthesisData).substring(0, 500));
    if (!synthesisData.content || !synthesisData.content[0]) {
      console.error('Unexpected Claude response:', synthesisData);
      return res.json({ synthesis: 'Analysis loading...' });
    }
    const text = synthesisData?.content?.[0]?.text ?? synthesisData?.completion ?? null;
    if (!text) {
      return res.status(500).json({ error: 'Anthropic response missing content text' });
    }
    res.json({ synthesis: String(text) });
  } catch (err) {
    console.error('Synthesis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync
app.post('/api/sync', async (req, res) => {
  try {
    if (syncInProgress) {
      return res.json({ status: 'already_syncing' });
    }

    syncInProgress = true;

    const { linkedInSnapshotId, indeedSnapshotId, donePromise } = await triggerFreshScrape();
    res.json({ status: 'syncing', linkedInSnapshotId, indeedSnapshotId });

    donePromise.finally(() => {
      syncInProgress = false;
      lastSyncTime = new Date();
    });
  } catch (err) {
    console.error('Sync error:', err);
    syncInProgress = false;
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status', async (req, res) => {
  res.json({
    lastSyncTime: lastSyncTime.toISOString(),
    syncInProgress,
    activeLinkedInSnapshotId,
    activeIndeedSnapshotId,
    nextSyncIn: '3 hours'
  });
});

// GET /api/poll/:snapshotId
app.get('/api/poll/:snapshotId', async (req, res) => {
  try {
    const apiKey = process.env.BRIGHTDATA_API_KEY;
    const { snapshotId } = req.params;

    const options = {
      hostname: 'api.brightdata.com',
      path: `/datasets/v3/progress/${snapshotId}`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    };

    const result = await httpsRequest(options);
    console.log('Bright Data poll response:', result.body);

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.body });
    }

    const data = JSON.parse(result.body);
    const status = data.status ?? data;

    res.json({ status });
  } catch (err) {
    console.error('Poll error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/download/:snapshotId
app.get('/api/download/:snapshotId', async (req, res) => {
  try {
    const apiKey = process.env.BRIGHTDATA_API_KEY;
    const { snapshotId } = req.params;

    const options = {
      hostname: 'api.brightdata.com',
      path: `/datasets/v3/snapshot/${snapshotId}?format=json`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    };

    const result = await httpsRequest(options);
    console.log('Download response length:', result.body?.length);
    console.log('Download preview:', result.body?.slice(0, 200));

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.body });
    }

    const raw = JSON.parse(result.body);
    const rows = Array.isArray(raw) ? raw : (raw.data ?? raw.results ?? []);

    const seen = new Set();
    const filtered = rows
      .filter((row) => {
        const title = (row.job_title ?? row.title ?? '').toLowerCase();
        if (EXCLUDE_TITLES.some((t) => title.includes(t))) return false;
        const key = `${row.job_title ?? row.title ?? ''}|${row.company_name ?? row.company ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((row) => ({
        job_title: row.job_title ?? row.title ?? '',
        company_name: row.company_name ?? row.company ?? '',
        job_location: row.job_location ?? row.location ?? '',
        job_posted_time: row.job_posted_time ?? row.posted ?? '',
        job_employment_type: row.job_employment_type ?? row.type ?? 'Full-time',
        apply_link: row.apply_link ?? row.url ?? '',
      }));

    res.json(filtered);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/save
app.post('/api/save', async (req, res) => {
  const jobs = Array.isArray(req.body) ? req.body : (req.body.jobs ?? []);
  console.log('Save called with', jobs.length, 'jobs');
  res.json({ id: 'local-' + Date.now() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Auto-refresh every 3 hours
setInterval(async () => {
  console.log('Auto-refresh triggered');
  try {
    await triggerFreshScrape();
  } catch (err) {
    console.error('Auto-refresh error:', err.message);
  }
}, 3 * 60 * 60 * 1000);

// Also trigger once on startup after 10 seconds
setTimeout(() => {
  console.log('Initial sync on startup');
  // On startup
  triggerFreshScrape().catch(err => {
    console.error('Initial sync error:', err.message);
    syncInProgress = false;
  });
}, 10000);

process.stdin.resume();
setInterval(() => {}, 1000 * 60 * 60);
process.on('SIGINT', () => process.exit(0));
process.on('uncaughtException', (err) => console.error('Uncaught:', err));