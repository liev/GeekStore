const API_BASE_URL = 'http://localhost:5242/api';

const fetchApi = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await fetch(input, init);
    if (res.status === 401) {
        localStorage.removeItem('geekstore_token');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login?expired=true';
        }
    }
    return res;
};

export interface Seller {
    id: number;
    name: string;
    nickname: string;
    phoneNumber?: string;
}

export interface Product {
    id: number;
    name: string;
    description: string;
    priceCRC: number;
    categoryId: number;
    categoryEntity?: { id: number, name: string };
    imageUrl: string;
    imageUrl2?: string;
    imageUrl3?: string;
    stockStatus: string;
    sellerId: number;
    seller?: Seller;
    isMoxfieldCollection?: boolean;
    moxfieldDeckUrl?: string;
    stockCount: number;
    createdAt?: string;
    condition?: string;
}

export interface MoxfieldImportRequest {
    sellerId: number;
    importIndividually: boolean;
}

export interface Category {
    id: number;
    name: string;
    subcategories?: Category[];
    parentId?: number | null;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export const catalogApi = {
    getProducts: async (params?: {
        search?: string;
        categoryId?: number;
        condition?: string;
        minPrice?: number;
        maxPrice?: number;
        page?: number;
        pageSize?: number;
    }): Promise<PagedResult<Product>> => {
        try {
            let url = `${API_BASE_URL}/Products?`;
            if (params) {
                const sp = new URLSearchParams();
                if (params.search) sp.append('search', params.search);
                if (params.categoryId !== undefined) sp.append('categoryId', params.categoryId.toString());
                if (params.condition) sp.append('condition', params.condition);
                if (params.minPrice !== undefined) sp.append('minPrice', params.minPrice.toString());
                if (params.maxPrice !== undefined) sp.append('maxPrice', params.maxPrice.toString());
                if (params.page !== undefined) sp.append('page', params.page.toString());
                if (params.pageSize !== undefined) sp.append('pageSize', params.pageSize.toString());
                url += sp.toString();
            }
            const res = await fetchApi(url);
            if (!res.ok) throw new Error('Failed to fetch products');
            return await res.json();
        } catch (error) {
            console.error(error);
            return { items: [], totalCount: 0, page: 1, pageSize: 24, totalPages: 0 };
        }
    },
    getFollowingFeed: async (token: string, page: number = 1, pageSize: number = 24): Promise<PagedResult<Product>> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Feed/following?page=${page}&pageSize=${pageSize}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch following feed');
            return await res.json();
        } catch (error) {
            console.error(error);
            return { items: [], totalCount: 0, page: 1, pageSize: 24, totalPages: 0 };
        }
    },

    getProductsBySeller: async (sellerId: number): Promise<Product[]> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Products/seller/${sellerId}`);
            if (!res.ok) throw new Error(`Failed to fetch seller ${sellerId} catalog`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    getProduct: async (id: number): Promise<Product | null> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Products/${id}`);
            if (!res.ok) throw new Error(`Product ${id} not found`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    createProduct: async (product: Partial<Product>, token: string): Promise<Product> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(product)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to create product');
            }
            return await res.json();
        } catch (error) {
            console.error(error);
            throw new Error(error instanceof Error ? error.message : 'Error de conexión');
        }
    },

    updateProduct: async (id: number, product: Partial<Product>, token: string): Promise<void> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(product)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to update product');
            }
        } catch (error) {
            console.error(error);
            throw new Error(error instanceof Error ? error.message : 'Error de conexión');
        }
    },

    uploadImage: async (file: File, token: string): Promise<{ url: string; message: string; reason: string }> => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetchApi(`${API_BASE_URL}/Products/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to upload image');
            }
            return await res.json();
        } catch (error) {
            console.error(error);
            throw new Error(error instanceof Error ? error.message : 'Error de conexión');
        }
    },

    importMoxfieldDeck: async (publicId: string, request: MoxfieldImportRequest, token: string): Promise<{ message: string; productId?: number; count?: number }> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Products/import-moxfield/${publicId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(request)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || 'Failed to import Moxfield deck');
            }
            return await res.json();
        } catch (error) {
            console.error(error);
            throw new Error(error instanceof Error ? error.message : 'Error de conexión');
        }
    }
};

export const authApi = {
    login: async (email: string, password: string): Promise<string | null> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) return null;
            const data = await res.json();
            return data.token;
        } catch (error) {
            console.error(error);
            return null;
        }
    },
    register: async (sellerData: Record<string, unknown>): Promise<boolean> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sellerData)
            });
            return res.ok;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
};

export interface User {
    id: number;
    name: string;
    surname: string;
    nickname: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    subscriptionPlan?: string;
    subscriptionEndDate?: string | null;
    autoRenew?: boolean;
}

export const adminApi = {
    getUsers: async (token: string): Promise<User[]> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            return await res.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    toggleBan: async (id: number, token: string): Promise<User | null> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Admin/users/${id}/toggle-ban`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error(`Failed to toggle ban for user ${id}`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    },
    grantPlan: async (id: number, plan: string, endDate: string | null, token: string): Promise<User | null> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Admin/users/${id}/grant-plan`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan, endDate })
            });
            if (!res.ok) throw new Error(`Failed to grant plan for user ${id}`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    },
    moderateProduct: async (productId: number, reason: string, token: string): Promise<boolean> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Admin/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            return res.ok;
        } catch (error) {
            console.error(error);
            return false;
        }
    },
    sendWarning: async (userId: number, reason: string, token: string): Promise<string> => {
        const res = await fetchApi(`${API_BASE_URL}/Admin/users/${userId}/warn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });
        if (!res.ok) throw new Error('Failed to send warning');
        const data = await res.json();
        return data.message;
    },
    getReviews: async (token: string): Promise<(Review & { sellerId: number; sellerNickname: string })[]> => {
        const res = await fetchApi(`${API_BASE_URL}/Admin/reviews`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch reviews');
        return await res.json();
    },
    deleteReview: async (id: number, token: string): Promise<void> => {
        const res = await fetchApi(`${API_BASE_URL}/Admin/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete review');
    }
};

export const adminDashboardApi = {
    getStats: async (token: string): Promise<any> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/AdminDashboard/inventory-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
        } catch (error) {
            console.error(error);
            return { sellers: [], totalProducts: 0, totalCartAdditions: 0 };
        }
    },
    getAIAnalysis: async (token: string): Promise<any> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/AdminDashboard/seller-ai-analysis`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch AI analysis');
            return await res.json();
        } catch (error) {
            console.error(error);
            return { globalSummary: "Error", recommendations: [] };
        }
    },
    updateSellerConfig: async (id: number, config: any, token: string): Promise<boolean> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/AdminDashboard/update-seller-config/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            return res.ok;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
};

export const settingsApi = {
    getSellerFee: async (): Promise<string> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Settings/seller-fee`);
            if (!res.ok) throw new Error('Failed to fetch fee');
            return await res.text();
        } catch (error) {
            console.error(error);
            return "1.00";
        }
    },
    updateSellerFee: async (newFee: string, token: string): Promise<string> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Admin/settings/fees`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newFee })
            });
            if (!res.ok) throw new Error('Failed to update fee');
            const data = await res.json();
            return data.fee;
        } catch (error) {
            console.error(error);
            return newFee;
        }
    }
};

export const categoriesApi = {
    getCategories: async (): Promise<Category[]> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Categories`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    },
    addCategory: async (name: string, token: string): Promise<Category | null> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    },
    addSubcategory: async (categoryId: number, name: string, token: string): Promise<Category | null> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Categories/${categoryId}/subcategories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }
};

export interface CreateOrderItemDto {
    productId: number;
    quantity: number;
}

export interface CreateOrderDto {
    deliveryMethod: string;
    deliveryPointId?: number;
    shippingAddress?: string;
    buyerPhone?: string;
    items: CreateOrderItemDto[];
}

export interface OrderItem {
    id: number;
    orderId: number;
    productId: number;
    product: Product;
    quantity: number;
    unitPriceCRC: number;
}

export interface Order {
    id: number;
    buyerId: number;
    buyer?: { id: number; name: string; nickname: string; email: string };
    sellerId: number;
    seller?: Seller;
    totalAmountCRC: number;
    status: string;
    orderDate: string;
    confirmedAt?: string;
    shippedAt?: string;
    completedAt?: string;
    deliveryMethod: string;
    deliveryPointId?: number;
    deliveryPoint?: { id: number; name: string; address: string };
    shippingAddress?: string;
    items: OrderItem[];
}

export interface OrderSellerInfo {
    sellerId: number;
    sellerNickname: string;
    sellerPhone: string;
    totalAmountCRC: number;
}

export const ordersApi = {
    createOrder: async (data: CreateOrderDto, token: string): Promise<{ message: string; orderCount: number; sellers: OrderSellerInfo[] }> => {
        const res = await fetchApi(`${API_BASE_URL}/Orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Failed to create order');
        }
        return await res.json();
    },
    getMyPurchases: async (token: string): Promise<Order[]> => {
        const res = await fetchApi(`${API_BASE_URL}/Orders/my-purchases`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch purchases');
        return await res.json();
    },
    getMySales: async (token: string): Promise<Order[]> => {
        const res = await fetchApi(`${API_BASE_URL}/Orders/my-sales`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch sales');
        return await res.json();
    },
    /** Update order status (seller only). */
    updateStatus: async (orderId: number, newStatus: string, token: string): Promise<{ message: string; status: string }> => {
        const res = await fetchApi(`${API_BASE_URL}/Orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newStatus })
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Error al actualizar estado');
        }
        return await res.json();
    }
};

export interface SellerAnalyticsDto {
    totalActiveProducts: number;
    totalSoldProducts: number;
    totalRevenueCRC: number;
    pendingOrders: number;
    completedOrders: number;
}

export const sellersApi = {
    getMetrics: async (token: string): Promise<SellerAnalyticsDto> => {
        const res = await fetchApi(`${API_BASE_URL}/Sellers/metrics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch metrics');
        return await res.json();
    }
};

export interface UserProfileDto {
    id: number;
    nickname: string;
    email: string;
    totalActiveProducts: number;
    isFollowing: boolean;
    phoneNumber?: string;
}

export const usersApi = {
    getMe: async (token: string): Promise<UserProfileDto> => {
        const res = await fetchApi(`${API_BASE_URL}/Users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch current user');
        return await res.json();
    },
    getProfile: async (id: number, token?: string): Promise<UserProfileDto> => {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetchApi(`${API_BASE_URL}/Users/${id}/profile`, { headers });
        if (!res.ok) throw new Error('Failed to fetch profile');
        return await res.json();
    },
    followUser: async (id: number, token: string): Promise<void> => {
        const res = await fetchApi(`${API_BASE_URL}/Users/${id}/follow`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to follow user');
    },
    unfollowUser: async (id: number, token: string): Promise<void> => {
        const res = await fetchApi(`${API_BASE_URL}/Users/${id}/unfollow`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to unfollow user');
    },
    upgradeToSeller: async (plan: string, orderId: string, token: string): Promise<string> => {
        const res = await fetchApi(`${API_BASE_URL}/Users/upgrade-to-seller`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ plan, orderId })
        });
        if (!res.ok) throw new Error('Failed to upgrade to seller');
        const data = await res.json();
        return data.message;
    },
    cancelSubscription: async (token: string): Promise<string> => {
        const res = await fetchApi(`${API_BASE_URL}/Users/cancel-subscription`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error('Failed to cancel subscription');
        const data = await res.json();
        return data.message;
    },
    updateProfile: async (payload: { phoneNumber?: string }, token: string): Promise<string> => {
        const res = await fetchApi(`${API_BASE_URL}/Users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update profile');
        const data = await res.json();
        return data.message;
    }
};

// ── Reviews & Ratings ──────────────────────────────────────────────────

export interface Review {
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt?: string;
    reviewerNickname: string;
    reviewerId: number;
}

export interface ReviewSummary {
    averageRating: number;
    reviewCount: number;
}

export interface CreateReviewDto {
    sellerId: number;
    rating: number;
    comment: string;
}

export const reviewsApi = {
    /** Create or update a review for a seller. */
    createReview: async (data: CreateReviewDto, token: string): Promise<{ message: string }> => {
        const res = await fetchApi(`${API_BASE_URL}/Reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Error al crear reseña');
        }
        return await res.json();
    },

    /** Get all reviews for a seller. */
    getSellerReviews: async (sellerId: number): Promise<Review[]> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Reviews/seller/${sellerId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch {
            return [];
        }
    },

    /** Get average rating and count for a seller. */
    getSellerSummary: async (sellerId: number): Promise<ReviewSummary> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Reviews/seller/${sellerId}/summary`);
            if (!res.ok) return { averageRating: 0, reviewCount: 0 };
            return await res.json();
        } catch {
            return { averageRating: 0, reviewCount: 0 };
        }
    }
};

// ── Notifications ───────────────────────────────────────────────────

export interface AppNotification {
    id: number;
    userId: number;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    relatedEntityId?: number;
    createdAt: string;
}

export const notificationsApi = {
    /** Get all notifications for the authenticated user. */
    getAll: async (token: string): Promise<AppNotification[]> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return [];
            return await res.json();
        } catch {
            return [];
        }
    },
    /** Get unread notification count for badge. */
    getUnreadCount: async (token: string): Promise<number> => {
        try {
            const res = await fetchApi(`${API_BASE_URL}/Notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return 0;
            const data = await res.json();
            return data.count;
        } catch {
            return 0;
        }
    },
    /** Mark a single notification as read. */
    markRead: async (id: number, token: string): Promise<void> => {
        await fetchApi(`${API_BASE_URL}/Notifications/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },
    /** Mark all notifications as read. */
    markAllRead: async (token: string): Promise<void> => {
        await fetchApi(`${API_BASE_URL}/Notifications/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
};
