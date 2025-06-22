import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// Rotas temporariamente simplificadas para resolver build
router.post('/single', (req: Request, res: Response) => {
  res.json({ message: 'Upload route - em desenvolvimento' });
});

router.post('/multiple', (req: Request, res: Response) => {
  res.json({ message: 'Upload multiple route - em desenvolvimento' });
});

export default router; 