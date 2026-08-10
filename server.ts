import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper function to query Adzuna safely with full diagnostics
  async function queryAdzuna(options: {
    query?: string;
    location?: string;
    daysOld?: number;
    country?: string;
    page?: number;
    resultsPerPage?: number;
  }) {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey || appId.trim() === '' || appKey.trim() === '') {
      return {
        ok: false,
        statusCategory: 'MISSING_CREDENTIALS',
        httpStatus: 400,
        statusText: 'Bad Request',
        apiUrlSanitized: 'https://api.adzuna.com/v1/api/jobs/br/search/1',
        countryCode: (options.country || 'br').toLowerCase().trim(),
        query: (options.query || '').trim() || '—',
        location: (options.location || '').trim() || '—',
        daysOld: options.daysOld || 30,
        page: options.page || 1,
        resultsPerPage: options.resultsPerPage || 50,
        adzunaCount: 0,
        resultsReceived: 0,
        adzunaError: 'Credenciais da Adzuna (ADZUNA_APP_ID / ADZUNA_APP_KEY) não foram configuradas.',
        results: [],
      };
    }

    const countryCode = (options.country || 'br').toLowerCase().trim();
    const cleanQuery = (options.query || '').trim();
    const cleanLocation = (options.location || '').trim();
    const page = options.page || 1;
    const resultsPerPage = options.resultsPerPage || 50;
    const daysOld = options.daysOld || 30;

    // Build actual params with credentials
    const params = new URLSearchParams();
    params.append('app_id', appId.trim());
    params.append('app_key', appKey.trim());
    params.append('results_per_page', String(resultsPerPage));
    if (daysOld && !isNaN(Number(daysOld))) {
      params.append('max_days_old', String(daysOld));
    }
    if (cleanQuery) {
      params.append('what', cleanQuery);
    }
    if (cleanLocation) {
      const locLower = cleanLocation.toLowerCase();
      if (countryCode === 'br' && (locLower === 'brazil' || locLower === 'brasil')) {
        // Omit 'where' because endpoint /jobs/br/ already specifies country Brazil
      } else {
        params.append('where', cleanLocation);
      }
    }

    // Build sanitized params without credentials for UI/logging
    const sanitizedParams = new URLSearchParams();
    sanitizedParams.append('app_id', '[REDACTED]');
    sanitizedParams.append('app_key', '[REDACTED]');
    sanitizedParams.append('results_per_page', String(resultsPerPage));
    if (daysOld) sanitizedParams.append('max_days_old', String(daysOld));
    if (cleanQuery) sanitizedParams.append('what', cleanQuery);
    if (cleanLocation && !(countryCode === 'br' && (cleanLocation.toLowerCase() === 'brazil' || cleanLocation.toLowerCase() === 'brasil'))) {
      sanitizedParams.append('where', cleanLocation);
    }

    const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?${params.toString()}`;
    const sanitizedUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?${sanitizedParams.toString()}`;

    try {
      const response = await fetch(adzunaUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      let statusCategory = 'ADZUNA_ERROR';
      let data: any = null;
      let adzunaError: string | null = null;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Adzuna API Error (${response.status}):`, errorText);

        if (response.status === 401 || response.status === 403) {
          statusCategory = 'AUTH_ERROR';
          adzunaError = `Erro de Autenticação (${response.status}): Verifique se ADZUNA_APP_ID e ADZUNA_APP_KEY são válidos.`;
        } else if (response.status === 429) {
          statusCategory = 'RATE_LIMIT';
          adzunaError = 'Limite de requisições atingido na API da Adzuna (Rate Limit 429).';
        } else if (response.status === 400) {
          statusCategory = 'BAD_REQUEST';
          adzunaError = `Parâmetros inválidos enviados para a Adzuna (${response.status}).`;
        } else {
          statusCategory = 'ADZUNA_ERROR';
          adzunaError = `Erro HTTP ${response.status} da Adzuna: ${response.statusText}`;
        }

        return {
          ok: false,
          statusCategory,
          httpStatus: response.status,
          statusText: response.statusText,
          apiUrlSanitized: sanitizedUrl,
          countryCode,
          query: cleanQuery || '—',
          location: cleanLocation || '—',
          daysOld,
          page,
          resultsPerPage,
          adzunaCount: 0,
          resultsReceived: 0,
          adzunaError,
          results: [],
        };
      }

      data = await response.json();
      const count = data.count || 0;
      const results = data.results || [];

      if (count > 0 && results.length > 0) {
        statusCategory = 'SUCCESS_WITH_RESULTS';
      } else {
        statusCategory = 'SUCCESS_EMPTY';
      }

      return {
        ok: true,
        statusCategory,
        httpStatus: response.status,
        statusText: response.statusText,
        apiUrlSanitized: sanitizedUrl,
        countryCode,
        query: cleanQuery || '—',
        location: cleanLocation || '—',
        daysOld,
        page,
        resultsPerPage,
        adzunaCount: count,
        resultsReceived: results.length,
        adzunaError: null,
        results,
      };
    } catch (err: any) {
      console.error('Network/Server Exception querying Adzuna:', err);
      return {
        ok: false,
        statusCategory: 'NETWORK_ERROR',
        httpStatus: 500,
        statusText: 'Internal Server Error',
        apiUrlSanitized: sanitizedUrl,
        countryCode,
        query: cleanQuery || '—',
        location: cleanLocation || '—',
        daysOld,
        page,
        resultsPerPage,
        adzunaCount: 0,
        resultsReceived: 0,
        adzunaError: err.message || 'Exceção de rede ou servidor ao conectar com a Adzuna.',
        results: [],
      };
    }
  }

  // API Route: Secure Adzuna Proxy
  app.post('/api/adzuna/search', async (req, res) => {
    const { query, location, daysOld, country, page } = req.body || {};
    const result = await queryAdzuna({ query, location, daysOld, country, page });
    return res.json(result);
  });

  // Minimal Test Diagnostic Endpoint
  app.get('/api/adzuna/test', async (req, res) => {
    const testResult = await queryAdzuna({
      query: 'customer',
      location: '', // Omit location
      daysOld: 30,
      resultsPerPage: 10,
      page: 1,
    });
    return res.json({
      testName: 'Minimal Diagnostic Test (Query: customer, Location: none, Days: 30, Limit: 10)',
      result: testResult,
    });
  });

  // Public Configuration Endpoint (Supabase Frontend Credentials Only)
  app.get('/api/config', (req, res) => {
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      '';
    const supabasePublishableKey =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    return res.json({
      supabaseUrl: supabaseUrl.trim(),
      supabasePublishableKey: supabasePublishableKey.trim(),
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasAdzunaCredentials: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
