"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const settings_controller_1 = require("../controllers/settings.controller");
const router = (0, express_1.Router)();
// Rotas protegidas - apenas admin
router.get('/shipping', auth_1.auth, auth_1.isAdmin, settings_controller_1.getShippingSettings);
router.put('/shipping', auth_1.auth, auth_1.isAdmin, settings_controller_1.updateShippingSettings);
router.get('/:key', auth_1.auth, auth_1.isAdmin, settings_controller_1.getSetting);
exports.default = router;
