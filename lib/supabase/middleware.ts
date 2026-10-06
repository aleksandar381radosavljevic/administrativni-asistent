// middleware.ts (root nivoa, u root projekta)
// Primeni middleware na svim rutama

import { type NextRequest } from 'next/server';
import { updateSession } from './update-session';

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)',
    ],
};
