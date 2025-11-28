import { VercelRequest, VercelResponse } from '@vercel/node';
import { apiHandler } from '../_utils.js';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
        return res.status(500).json({ isAdmin: false, error: 'Server misconfiguration' });
    }

    const cookieHeader = req.headers.cookie || '';
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=').map(c => c.trim());
        if (key && value) acc[key] = value;
        return acc;
    }, {} as Record<string, string>);

    const siteToken = cookies['site_token'];

    if (siteToken === accessToken) {
        return res.status(200).json({ isAdmin: true });
    }

    return res.status(200).json({ isAdmin: false });
};

export default apiHandler(['GET'], handler);
