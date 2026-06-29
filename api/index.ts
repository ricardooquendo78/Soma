export default async function handler(req: any, res: any) {
  try {
    // Dynamically import the Express app with explicit file extension to avoid directory resolution conflict
    const appModule = await import('../server.ts');
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
