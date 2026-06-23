// Ruta: Backend/src/controllers/oauth/oauthController.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../../config/database';
import { verifyUser } from '../../models/userModel';

// ─── GET /oauth/authorize ─────────────────────────────────────────────────────
// Sirve la página HTML de login que Alexa abre dentro de su app
export const getAuthorizePage = async (req: Request, res: Response) => {
    const { client_id, redirect_uri, state, response_type } = req.query;

    if (!client_id || !redirect_uri || response_type !== 'code') {
        return res.status(400).send('Parámetros de autorización inválidos.');
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Joyería Diana Laura — Vincular cuenta</title>
    <style>
        body { font-family: Arial, sans-serif; background:#1a1a1a; color:#eee; display:flex;
               justify-content:center; align-items:center; height:100vh; margin:0; }
        .card { background:#2a2a2a; padding:32px; border-radius:12px; width:90%; max-width:380px;
                box-shadow:0 4px 20px rgba(0,0,0,0.4); }
        h1 { font-size:20px; margin-bottom:4px; color:#d4af37; }
        p.sub { color:#aaa; font-size:13px; margin-bottom:20px; }
        label { display:block; font-size:13px; margin-bottom:6px; color:#ccc; }
        input { width:100%; padding:10px; margin-bottom:16px; border-radius:6px; border:1px solid #444;
                background:#1f1f1f; color:#fff; box-sizing:border-box; }
        button { width:100%; padding:12px; border:none; border-radius:6px; background:#d4af37;
                 color:#1a1a1a; font-weight:bold; cursor:pointer; font-size:15px; }
        button:hover { background:#c49b2c; }
        .error { color:#ff6b6b; font-size:13px; margin-bottom:12px; min-height:16px; }
        .footer { text-align:center; font-size:11px; color:#666; margin-top:20px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>💎 Joyería Diana Laura</h1>
        <p class="sub">Vincula tu cuenta para usar la skill de Alexa</p>
        <div class="error" id="errorMsg"></div>
        <form id="loginForm">
            <label for="email">Correo electrónico</label>
            <input type="email" id="email" required autocomplete="username">
            <label for="password">Contraseña</label>
            <input type="password" id="password" required autocomplete="current-password">
            <button type="submit">Iniciar sesión y vincular</button>
        </form>
        <div class="footer">UTHH — Desarrollo de Dispositivos Inteligentes</div>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('errorMsg');
            errorDiv.textContent = '';

            try {
                const resp = await fetch('/oauth/authorize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email, password,
                        client_id: ${JSON.stringify(client_id)},
                        redirect_uri: ${JSON.stringify(redirect_uri)},
                        state: ${JSON.stringify(state || '')}
                    })
                });
                const data = await resp.json();
                if (data.success && data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    errorDiv.textContent = data.message || 'Credenciales incorrectas.';
                }
            } catch (err) {
                errorDiv.textContent = 'Error de conexión. Intenta de nuevo.';
            }
        });
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};

// ─── POST /oauth/authorize ─────────────────────────────────────────────────────
// Valida credenciales reales y genera el authorization_code
export const postAuthorize = async (req: Request, res: Response) => {
    try {
        const { email, password, client_id, redirect_uri, state } = req.body;

        if (!email || !password || !client_id || !redirect_uri) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos.' });
        }

        // 1. Validar credenciales reales contra Postgres (bcrypt) — misma lógica que tu login web
        const usuario = await verifyUser(email, password);
        if (!usuario) {
            return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
        }

        // 2. Validar rol (solo trabajador/admin pueden vincular esta skill)
        if (!['trabajador', 'admin'].includes(String(usuario.rol))) {
            return res.status(403).json({
                success: false,
                message: 'Solo personal autorizado (trabajador/admin) puede vincular esta skill.'
            });
        }

        // 3. Generar authorization_code temporal (5 minutos)
        const code = crypto.randomBytes(32).toString('hex');
        const fechaExpira = new Date(Date.now() + 5 * 60 * 1000); // +5 min

        await pool.query(
            `INSERT INTO oauth_codes (code, usuario_id, redirect_uri, client_id, fecha_expira)
             VALUES ($1, $2, $3, $4, $5)`,
            [code, usuario.id, redirect_uri, client_id, fechaExpira]
        );

        // 4. Redirigir a Alexa con el code
        const redirectUrl = `${redirect_uri}?state=${encodeURIComponent(state || '')}&code=${code}`;

        res.json({ success: true, redirect: redirectUrl });

    } catch (error: any) {
        console.error('❌ Error en postAuthorize:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
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
// Intercambia authorization_code (o refresh_token) por access_token
export const postToken = async (req: Request, res: Response) => {
    try {
        // 🔒 Validar client_id/client_secret enviados por Alexa vía HTTP Basic Auth
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

            // Marcar código como usado
            await pool.query(`UPDATE oauth_codes SET usado = true WHERE id = $1`, [codeRow.id]);

            // Generar tokens
            const accessToken = crypto.randomBytes(32).toString('hex');
            const refreshToken = crypto.randomBytes(32).toString('hex');
            const fechaExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

            await pool.query(
                `INSERT INTO oauth_tokens (access_token, refresh_token, usuario_id, client_id, fecha_expira)
                 VALUES ($1, $2, $3, $4, $5)`,
                [accessToken, refreshToken, codeRow.usuario_id, client_id, fechaExpira]
            );

            return res.json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: 3600,
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

            // Revocar el viejo, crear uno nuevo
            await pool.query(`UPDATE oauth_tokens SET revocado = true WHERE id = $1`, [oldToken.id]);

            const newAccessToken = crypto.randomBytes(32).toString('hex');
            const newRefreshToken = crypto.randomBytes(32).toString('hex');
            const fechaExpira = new Date(Date.now() + 60 * 60 * 1000);

            await pool.query(
                `INSERT INTO oauth_tokens (access_token, refresh_token, usuario_id, client_id, fecha_expira)
                 VALUES ($1, $2, $3, $4, $5)`,
                [newAccessToken, newRefreshToken, oldToken.usuario_id, client_id, fechaExpira]
            );

            return res.json({
                access_token: newAccessToken,
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: newRefreshToken
            });
        }

        return res.status(400).json({ error: 'unsupported_grant_type' });

    } catch (error: any) {
        console.error('❌ Error en postToken:', error);
        res.status(500).json({ error: 'server_error' });
    }
};