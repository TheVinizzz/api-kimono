"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_controller_1 = require("../controllers/contact.controller");
const router = (0, express_1.Router)();
// Rota para enviar email de contato
router.post('/contact', contact_controller_1.sendContactEmail);
exports.default = router;
