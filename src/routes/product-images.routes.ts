import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// Rotas temporariamente simplificadas para resolver build
router.get('/:productId', (req: Request, res: Response) => {
  res.json({ message: 'Product images route - em desenvolvimento' });
});

export default router; 