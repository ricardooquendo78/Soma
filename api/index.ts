export default async function handler(req: any, res: any) {
  try {
    // Dynamically import the Express app to catch any import-time crashes
    const appModule = await import('../server');
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
