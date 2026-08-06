import axios from 'axios';

export const verifyRecaptcha = async (token: string | undefined): Promise<boolean> => {
    const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();

    // Si no hay clave secreta configurada, no bloqueamos el flujo (ambiente sin CAPTCHA activo)
    if (!secret) return true;

    if (!token) return false;

    try {
        const { data } = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            { params: { secret, response: token.trim() } }
        );
        if (data.success !== true) {
            console.error('reCAPTCHA rechazado por Google:', data['error-codes']);
        }
        return data.success === true;
    } catch (error) {
        console.error('Error al verificar reCAPTCHA:', error);
        return false;
    }
};
