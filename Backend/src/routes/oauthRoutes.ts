// Ruta: Backend/src/routes/oauthRoutes.ts
import express from 'express';
import {
    getAuthorizePage,
    postAuthorize,
    postToken
} from '../controllers/oauth/oauthController';

const router = express.Router();

// ==========================================
// 🔐 ACCOUNT LINKING (OAuth2) — Alexa Skill
// ==========================================
router.get('/authorize', getAuthorizePage);   // Alexa abre esta página (HTML de login)
router.post('/authorize', postAuthorize);     // El form de login envía aquí (AJAX)
router.post('/token', postToken);             // Alexa intercambia code -> access_token

export default router;