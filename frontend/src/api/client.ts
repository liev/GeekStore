const API_BASE_URL = 'http://localhost:5242/api';

export interface Product {
    id: number;
    name: string;
    description: string;
    priceCRC: number;
    category: string;
    imageUrl: string;
    stockStatus: string;
    sellerId: number;
    isMoxfieldCollection?: boolean;
    moxfieldDeckUrl?: string;
    stockCount?: number;
}

export const catalogApi = {
    getProducts: async (): Promise<Product[]> => {
        try {
            const res = await fetch(`${API_BASE_URL}/Products`);
            if (!res.ok) throw new Error('Failed to fetch catalog');
            return await res.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    getProductsBySeller: async (sellerId: number): Promise<Product[]> => {
        try {
            const res = await fetch(`${API_BASE_URL}/Products/seller/${sellerId}`);
            if (!res.ok) throw new Error(`Failed to fetch seller ${sellerId} catalog`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    getProduct: async (id: number): Promise<Product | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/Products/${id}`);
            if (!res.ok) throw new Error(`Product ${id} not found`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    createProduct: async (product: Partial<Product>, token: string): Promise<Product | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/Products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(product)
            });
            if (!res.ok) throw new Error('Failed to create product');
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }
};

export const authApi = {
    login: async (email: string, password: string): Promise<string | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/Auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                console.error('Login failed');
                return null;
            }

            const data = await res.json();
            return data.token;
        } catch (error) {
            console.error('Error logging in', error);
            return null;
        }
    }
};
