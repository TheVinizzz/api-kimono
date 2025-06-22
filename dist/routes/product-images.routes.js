"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Rotas temporariamente simplificadas para resolver build
router.get('/:productId', (req, res) => {
    res.json({ message: 'Product images route - em desenvolvimento' });
});
exports.default = router;
