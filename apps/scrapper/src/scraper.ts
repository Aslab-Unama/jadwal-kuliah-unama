import * as cheerio from 'cheerio';
import type { ScrapedScheduleItem, ScrapePageResult } from './types';

const BASE_URL = process.env.BAAK_URL || 'https://baak.unama.ac.id/jadwal-kuliah';

export interface ImpersonateFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  headers: Record<string, string>;
  engine: 'curl-impersonate' | 'fetch';
}

export function getImpersonateBinary(): string | null {
  const candidates = [
    '/usr/local/bin/curl_chrome120',
    '/usr/local/bin/curl_chrome124',
    '/usr/local/bin/curl_chrome116',
    '/usr/local/bin/curl_chrome',
    '/usr/local/bin/curl-impersonate-chrome',
    'curl_chrome120',
    'curl_chrome124',
    'curl_chrome116',
    'curl_chrome',
    'curl-impersonate-chrome',
  ];
  for (const bin of candidates) {
    if (Bun.which(bin)) {
      return bin;
    }
  }
  return null;
}

export async function fetchHtmlWithChromeImpersonate(url: string): Promise<ImpersonateFetchResponse> {
  const bin = getImpersonateBinary();

  if (bin) {
    try {
      const proc = Bun.spawn([
        bin,
        '-sSL',
        '-w',
        '\n__HTTP_STATUS__:%{http_code}',
        url,
      ], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const stdout = await new Response(proc.stdout).text();
      const marker = '\n__HTTP_STATUS__:';
      const markerIdx = stdout.lastIndexOf(marker);

      if (markerIdx !== -1) {
        const statusCode = parseInt(stdout.substring(markerIdx + marker.length).trim(), 10) || 200;
        const body = stdout.substring(0, markerIdx);
        return {
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          statusText: statusCode === 200 ? 'OK' : `Status ${statusCode}`,
          text: async () => body,
          headers: {
            'x-fetch-engine': 'curl-impersonate',
            'x-binary': bin,
          },
          engine: 'curl-impersonate',
        };
      }
    } catch (e: any) {
      console.warn(`[Scraper] Gagal menggunakan curl-impersonate (${e?.message}), beralih ke fetch standar...`);
    }
  }

  // Fallback ke fetch bawaan Bun
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    text: () => res.text(),
    headers: Object.fromEntries(res.headers.entries()),
    engine: 'fetch',
  };
}

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD sesuai zona waktu WIB (Asia/Jakarta)
 */
export function getTodayDateWIB(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Scrape satu halaman jadwal perkuliahan dari BAAK UNAMA
 * @param page Nomor halaman (default: 1)
 * @param ruang Filter ruang kelas ('', 'labor', 'teori'. Default: '' untuk semua kelas)
 * @param tanggal Filter tanggal perkuliahan ('YYYY-MM-DD'. Default: '' untuk semua tanggal)
 */
export async function scrapeLabSchedulePage(
  page = 1,
  ruang = '',
  tanggal = '',
  status = ''
): Promise<ScrapePageResult> {
  const targetUrl = new URL(BASE_URL);
  targetUrl.searchParams.set('search', '1');
  if (ruang) {
    targetUrl.searchParams.set('ruang', ruang);
  }
  if (tanggal) {
    targetUrl.searchParams.set('tanggal', tanggal);
  }
  if (status) {
    targetUrl.searchParams.set('status', status);
  }
  targetUrl.searchParams.set('page', page.toString());
  const url = targetUrl.toString();

  let res: ImpersonateFetchResponse | null = null;
  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetchHtmlWithChromeImpersonate(url);

      if (res.ok) break;

      const headersObj = res.headers;
      let bodySnippet = '';
      try {
        const text = await res.text();
        bodySnippet = text.slice(0, 1500);
      } catch {}

      console.error(`\n=================== BAAK FETCH ERROR (Attempt ${attempt}/3) [Engine: ${res.engine}] ===================`);
      console.error(`URL: ${url}`);
      console.error(`Status: ${res.status} ${res.statusText}`);
      console.error(`Headers:`, JSON.stringify(headersObj, null, 2));
      console.error(`Body Snippet:\n${bodySnippet}`);
      console.error(`=========================================================================================\n`);

      throw new Error(`HTTP ${res.status} ${res.statusText} (Engine: ${res.engine})`);
    } catch (err: any) {
      lastError = err;
      if (attempt < 3) {
        const delay = attempt * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  if (!res || !res.ok) {
    throw new Error(`Gagal mengambil data dari ${url} setelah 3 percobaan: ${lastError?.message}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Ambil total kelas dari card header: "Hasil Pencarian: 3267 Kelas"
  const headerText = $('.card-header').text();
  const totalClassesMatch = headerText.match(/Hasil Pencarian:\s*(\d+)\s*Kelas/i);
  const totalClasses = totalClassesMatch ? parseInt(totalClassesMatch[1], 10) : 0;

  // Hitung total halaman dari link pagination
  let maxPageFound = 1;
  $('ul.pagination a.page-link').each((_, el) => {
    const textNum = parseInt($(el).text().trim(), 10);
    if (!isNaN(textNum) && textNum > maxPageFound) {
      maxPageFound = textNum;
    }
    const href = $(el).attr('href') || '';
    const match = href.match(/page=(\d+)/);
    if (match) {
      const hrefPage = parseInt(match[1], 10);
      if (!isNaN(hrefPage) && hrefPage > maxPageFound) {
        maxPageFound = hrefPage;
      }
    }
  });

  const totalPages = maxPageFound > 1 ? maxPageFound : Math.ceil(totalClasses / 100) || 1;

  const items: ScrapedScheduleItem[] = [];

  $('tr.table-content').each((_, el) => {
    const tds = $(el).find('td');
    if (tds.length < 5) return;

    const noStr = $(tds[0]).text().trim();
    const no = parseInt(noStr, 10) || 0;

    // Tanggal & Waktu: "Senin, 13 April 2026 08:00"
    const rawDateTime = $(tds[1]).text().trim().replace(/\s+/g, ' ');
    let hari = '';
    let tanggal = '';
    let waktuMulai = '';

    const commaIndex = rawDateTime.indexOf(',');
    if (commaIndex !== -1) {
      hari = rawDateTime.substring(0, commaIndex).trim();
      const afterComma = rawDateTime.substring(commaIndex + 1).trim();
      // Pisahkan tanggal dan jam: "13 April 2026 08:00"
      const lastSpaceIndex = afterComma.lastIndexOf(' ');
      if (lastSpaceIndex !== -1) {
        tanggal = afterComma.substring(0, lastSpaceIndex).trim();
        waktuMulai = afterComma.substring(lastSpaceIndex + 1).trim();
      } else {
        tanggal = afterComma;
      }
    } else {
      tanggal = rawDateTime;
    }

    // Dosen & Matakuliah (Tangani jika ada team teaching / multiple dosen)
    const tdDosenMatkul = $(tds[2]);
    const dosenList: string[] = [];
    tdDosenMatkul.find('span.font-weight-bold').each((_, s) => {
      const text = $(s).text().trim();
      if (text) dosenList.push(text);
    });
    const dosen = dosenList.length > 0 ? dosenList.join(' / ') : tdDosenMatkul.find('span.font-weight-bold').text().trim();

    // Text kelas & matkul: "01PS2 :: Pemrograman Berorientasi Objek"
    const rawMatkulDiv = tdDosenMatkul.children('div').last().text().trim();
    let kodeKelas = '';
    let mataKuliah = '';

    if (rawMatkulDiv.includes('::')) {
      const parts = rawMatkulDiv.split('::').map((s) => s.trim());
      kodeKelas = parts[0] || '';
      mataKuliah = parts[1] || '';
    } else {
      mataKuliah = rawMatkulDiv;
    }

    // Ruang: "Kampus Thehok, Labor 1.5"
    const rawRuang = $(tds[3]).text().trim();
    let kampus = '';
    let ruangan = '';

    if (rawRuang.includes(',')) {
      const parts = rawRuang.split(',').map((s) => s.trim());
      kampus = parts[0] || '';
      ruangan = parts.slice(1).join(', ').trim();
    } else {
      kampus = 'Kampus Thehok';
      ruangan = rawRuang;
    }

    // Status: ambil hanya teks status (buang <sup> "Updated By: ..." dsb.)
    const tdStatus = $(tds[4]).clone();
    tdStatus.find('sup').remove();
    const status = tdStatus
      .text()
      .replace(/Updated By:.*$/i, '')
      .trim()
      .replace(/\s+/g, ' ');

    items.push({
      no,
      hari,
      tanggal,
      waktuMulai,
      dosen,
      kodeKelas,
      mataKuliah,
      kampus,
      ruangan,
      status,
    });
  });

  return {
    page,
    totalPages,
    totalClasses,
    items,
  };
}
