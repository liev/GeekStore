import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
    role?: string;
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
    exp?: number;
}

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const token = localStorage.getItem('geekstore_token');

    if (!token) return <Navigate to="/login" replace />;

    try {
        const decoded = jwtDecode<JwtPayload>(token);

        // Check expiration
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem('geekstore_token');
            return <Navigate to="/login?expired=true" replace />;
        }

        // Check role if required
        if (requiredRole) {
            const role = decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
            if (role !== requiredRole) return <Navigate to="/" replace />;
        }

        return <>{children}</>;
    } catch {
        localStorage.removeItem('geekstore_token');
        return <Navigate to="/login" replace />;
    }
}
