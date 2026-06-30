// Ruta: Backend/src/controllers/oauth/oauthController.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../../config/database';
import { verifyUser } from '../../models/userModel';

// ─── GET /oauth/authorize ─────────────────────────────────────────────────────
export const getAuthorizePage = async (req: Request, res: Response) => {
    const { client_id, redirect_uri, state, response_type } = req.query;

    if (!client_id || !redirect_uri || response_type !== 'code') {
        return res.status(400).send('Parámetros de autorización inválidos.');
    }

    // Leer error de query param (cuando el POST redirige de vuelta con error)
    const errorParam = req.query.error ? String(req.query.error) : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Joyería Diana Laura — Vincular cuenta</title>
    <style>
        body { font-family: Arial, sans-serif; background:#120A10; color:#eee; display:flex;
               justify-content:center; align-items:center; height:100vh; margin:0; }
        .card { background:#1E1218; padding:32px; border-radius:16px; width:90%; max-width:380px;
                box-shadow:0 4px 20px rgba(0,0,0,0.4); border:1px solid #3D2230; }
        h1 { font-size:20px; margin-bottom:4px; color:#E8A2BF; }
        p.sub { color:#A88D96; font-size:13px; margin-bottom:20px; }
        label { display:block; font-size:13px; margin-bottom:6px; color:#ccc; }
        input[type="email"], input[type="password"] {
            width:100%; padding:10px; margin-bottom:16px; border-radius:8px;
            border:1px solid #3D2230; background:#241620; color:#fff; box-sizing:border-box; }
        button { width:100%; padding:12px; border:none; border-radius:8px; background:#E8A2BF;
                 color:#120A10; font-weight:bold; cursor:pointer; font-size:15px; }
        button:hover { background:#d88aa8; }
        .error { color:#ff6b6b; font-size:13px; margin-bottom:12px; min-height:16px; }
        .footer { text-align:center; font-size:11px; color:#666; margin-top:20px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>💎 Joyería Diana Laura</h1>
        <p class="sub">Vincula tu cuenta para usar la skill de Alexa</p>
        ${errorParam ? `<div class="error">${errorParam}</div>` : '<div class="error"></div>'}
        <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="client_id"    value="${String(client_id)}">
            <input type="hidden" name="redirect_uri" value="${String(redirect_uri)}">
            <input type="hidden" name="state"        value="${String(state || '')}">
            <label for="email">Correo electrónico</label>
            <input type="email"    id="email"    name="email"    required autocomplete="username">
            <label for="password">Contraseña</label>
            <input type="password" id="password" name="password" required autocomplete="current-password">
            <button type="submit">Iniciar sesión y vincular</button>
        </form>
        <div class="footer">UTHH — Desarrollo de Dispositivos Inteligentes</div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};

// ─── POST /oauth/authorize ─────────────────────────────────────────────────────
export const postAuthorize = async (req: Request, res: Response) => {
    try {
        const { email, password, client_id, redirect_uri, state } = req.body;

        if (!email || !password || !client_id || !redirect_uri) {
            // Redirigir de vuelta al formulario con error
            const params = new URLSearchParams({
                client_id:     String(client_id || ''),
                redirect_uri:  String(redirect_uri || ''),
                state:         String(state || ''),
                response_type: 'code',
                error:         'Faltan datos requeridos.'
            });
            return res.redirect(`/oauth/authorize?${params.toString()}`);
        }

        const usuario = await verifyUser(email, password);
        if (!usuario) {
            const params = new URLSearchParams({
                client_id,
                redirect_uri,
                state:         String(state || ''),
                response_type: 'code',
                error:         'Correo o contraseña incorrectos.'
            });
            return res.redirect(`/oauth/authorize?${params.toString()}`);
        }

        const rolesPermitidos = ['cliente', 'trabajador', 'admin'];
        if (!rolesPermitidos.includes(String(usuario.rol))) {
            const params = new URLSearchParams({
                client_id,
                redirect_uri,
                state:         String(state || ''),
                response_type: 'code',
                error:         'No se pudo vincular esta cuenta. Contacta al administrador.'
            });
            return res.redirect(`/oauth/authorize?${params.toString()}`);
        }

        const code = crypto.randomBytes(32).toString('hex');
        const fechaExpira = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query(
            `INSERT INTO oauth_codes (code, usuario_id, redirect_uri, client_id, fecha_expira)
             VALUES ($1, $2, $3, $4, $5)`,
            [code, usuario.id, redirect_uri, client_id, fechaExpira]
        );

        const redirectUrl = `${redirect_uri}?state=${encodeURIComponent(state || '')}&code=${code}`;
        return res.redirect(redirectUrl);

    } catch (error: any) {
        console.error('❌ Error en postAuthorize:', error);
        return res.status(500).send('Error interno del servidor.');
    }
};

// ─── Helper: extraer y validar client_id/client_secret desde HTTP Basic Auth ─
const validarClienteBasicAuth = (req: Request): { valido: boolean; client_id?: string } => {
    const authHeader = req.headers.authorization;

    const CLIENT_ID_ESPERADO     = process.env.ALEXA_CLIENT_ID || 'alexa-joyeria-dl';
    const CLIENT_SECRET_ESPERADO = process.env.ALEXA_CLIENT_SECRET;

    if (!CLIENT_SECRET_ESPERADO) {
        console.error('❌ ALEXA_CLIENT_SECRET no configurado en .env');
        return { valido: false };
    }

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return { valido: false };
    }

    try {
        const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8');
        const [clientId, clientSecret] = decoded.split(':');

        if (clientId === CLIENT_ID_ESPERADO && clientSecret === CLIENT_SECRET_ESPERADO) {
            return { valido: true, client_id: clientId };
        }
        return { valido: false };
    } catch {
        return { valido: false };
    }
};

// ─── POST /oauth/token ──────────────────────────────────────────────────────────
export const postToken = async (req: Request, res: Response) => {
    try {
        const clienteValido = validarClienteBasicAuth(req);
        if (!clienteValido.valido) {
            return res.status(401).json({ error: 'invalid_client', error_description: 'Cliente no autorizado.' });
        }
        const client_id = clienteValido.client_id!;

        const { grant_type, code, refresh_token } = req.body;

        if (grant_type === 'authorization_code') {
            if (!code || !client_id) {
                return res.status(400).json({ error: 'invalid_request' });
            }

            const codeRes = await pool.query(
                `SELECT * FROM oauth_codes WHERE code = $1 AND client_id = $2 AND usado = false`,
                [code, client_id]
            );
            if (codeRes.rows.length === 0) {
                return res.status(400).json({ error: 'invalid_grant', error_description: 'Código inválido o ya usado.' });
            }

            const codeRow = codeRes.rows[0];
            if (new Date(codeRow.fecha_expira) < new Date()) {
                return res.status(400).json({ error: 'invalid_grant', error_description: 'Código expirado.' });
            }

            await pool.query(`UPDATE oauth_codes SET usado = true WHERE id = $1`, [codeRow.id]);

            const accessToken  = crypto.randomBytes(32).toString('hex');
            const refreshToken = crypto.randomBytes(32).toString('hex');
            const fechaExpira  = new Date(Date.now() + 60 * 60 * 1000);

            await pool.query(
                `INSERT INTO oauth_tokens (access_token, refresh_token, usuario_id, client_id, fecha_expira)
                 VALUES ($1, $2, $3, $4, $5)`,
                [accessToken, refreshToken, codeRow.usuario_id, client_id, fechaExpira]
            );

            return res.json({
                access_token:  accessToken,
                token_type:    'Bearer',
                expires_in:    3600,
                refresh_token: refreshToken
            });
        }

        if (grant_type === 'refresh_token') {
            if (!refresh_token || !client_id) {
                return res.status(400).json({ error: 'invalid_request' });
            }

            const tokenRes = await pool.query(
                `SELECT * FROM oauth_tokens WHERE refresh_token = $1 AND client_id = $2 AND revocado = false`,
                [refresh_token, client_id]
            );
            if (tokenRes.rows.length === 0) {
                return res.status(400).json({ error: 'invalid_grant', error_description: 'Refresh token inválido.' });
            }

            const oldToken = tokenRes.rows[0];
            await pool.query(`UPDATE oauth_tokens SET revocado = true WHERE id = $1`, [oldToken.id]);

            const newAccessToken  = crypto.randomBytes(32).toString('hex');
            const newRefreshToken = crypto.randomBytes(32).toString('hex');
            const fechaExpira     = new Date(Date.now() + 60 * 60 * 1000);

            await pool.query(
                `INSERT INTO oauth_tokens (access_token, refresh_token, usuario_id, client_id, fecha_expira)
                 VALUES ($1, $2, $3, $4, $5)`,
                [newAccessToken, newRefreshToken, oldToken.usuario_id, client_id, fechaExpira]
            );

            return res.json({
                access_token:  newAccessToken,
                token_type:    'Bearer',
                expires_in:    3600,
                refresh_token: newRefreshToken
            });
        }

        return res.status(400).json({ error: 'unsupported_grant_type' });

    } catch (error: any) {
        console.error('❌ Error en postToken:', error);
        res.status(500).json({ error: 'server_error' });
    }
};

// ─── GET /api/alexa/mi-rol ──────────────────────────────────────────────────────
export const getMiRol = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token no proporcionado.' });
        }
        const accessToken = authHeader.replace('Bearer ', '').trim();

        const result = await pool.query(
            `SELECT t.id, u.id AS usuario_id, u.nombre, u.email, u.rol, u.activo, t.revocado, t.fecha_expira
             FROM oauth_tokens t
             JOIN usuarios u ON u.id = t.usuario_id
             WHERE t.access_token = $1`,
            [accessToken]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Token inválido.' });
        }

        const row = result.rows[0];

        if (row.revocado) {
            return res.status(401).json({ success: false, message: 'Token revocado.' });
        }

        if (new Date(row.fecha_expira) < new Date()) {
            await pool.query(`UPDATE oauth_tokens SET revocado = true WHERE id = $1`, [row.id]);
            return res.status(401).json({ success: false, message: 'Token expirado.' });
        }

        if (!row.activo) {
            return res.status(403).json({ success: false, message: 'Cuenta desactivada.' });
        }

        res.json({
            success:    true,
            rol:        row.rol,
            nombre:     row.nombre,
            usuario_id: row.usuario_id
        });
    } catch (error: any) {
        console.error('❌ Error en getMiRol:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};