"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Rotas temporariamente simplificadas para resolver build
router.post('/single', (req, res) => {
    res.json({ message: 'Upload route - em desenvolvimento' });
});
router.post('/multiple', (req, res) => {
    res.json({ message: 'Upload multiple route - em desenvolvimento' });
});
exports.default = router;
