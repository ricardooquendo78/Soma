export default async function handler(req: any, res: any) {
  try {
    // Import using the compiled .js extension to avoid ESM directory import conflicts
    const appModule = await import('../server.js');
    const app = appModule.default;
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL WRAPPER IMPORT/RUNTIME CRASH]', err);
    return res.status(500).json({
      error: 'Crash in Vercel Serverless Function',
      message: err.message,
      stack: err.stack
    });
  }
}
