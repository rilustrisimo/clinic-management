/**
 * Loyverse API Client
 * Handles authentication and API requests to Loyverse
 */

const LOYVERSE_API_BASE = 'https://api.loyverse.com/v1.0';

export class LoyverseClient {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.LOYVERSE_API_TOKEN || '';
  }

  private ensureToken() {
    if (!this.token) {
      throw new Error('Loyverse API token is required. Please set LOYVERSE_API_TOKEN environment variable.');
    }
    console.log('[LoyverseClient] Token available:', this.token ? 'Yes' : 'No');
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    this.ensureToken();
    
    console.log('[LoyverseClient] Making request to:', endpoint);
    
    const url = `${LOYVERSE_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Loyverse API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get all customers
   */
  async getCustomers(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit) query.set('limit', params.limit.toString());
    
    return this.request(`/customers?${query.toString()}`);
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    return this.request(`/customers/${customerId}`);
  }

  /**
   * Create or update a customer
   * If id is provided, it will update; otherwise create
   */
  async upsertCustomer(data: LoyverseCustomer): Promise<any> {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(customerId: string): Promise<void> {
    await this.request(`/customers/${customerId}`, {
      method: 'DELETE',
    });
  }
}

/**
 * Loyverse Customer type (matches API schema)
 */
export interface LoyverseCustomer {
  id?: string;
  name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  customer_code?: string;
  note?: string;
  first_visit?: string;
  last_visit?: string;
  total_visits?: number;
  total_spent?: number;
  total_points?: number;
}

// Lazy singleton instance
let loyverseClientInstance: LoyverseClient | null = null;

export function getLoyverseClient(): LoyverseClient {
  if (!loyverseClientInstance) {
    loyverseClientInstance = new LoyverseClient();
  }
  return loyverseClientInstance;
}
