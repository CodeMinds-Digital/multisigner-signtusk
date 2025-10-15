export interface CloudflareConfig {
    apiToken: string;
    zoneId?: string;
}

export interface CloudflareRecord {
    id: string;
    type: string;
    name: string;
    content: string;
    ttl: number;
}

export interface CloudflareZone {
    id: string;
    name: string;
    status: string;
}

export interface VerificationResult {
    verified: boolean;
    details: {
        txtVerification: boolean;
        dkimVerification: boolean;
        spfVerification: boolean;
        dmarcVerification: boolean;
    };
    nextCheck?: Date;
    error?: string;
}

export class CloudflareAutomationService {
    private baseUrl = 'https://api.cloudflare.com/client/v4';

    async setupDomainAutomation(domain: string, config: CloudflareConfig): Promise<{
        success: boolean;
        records?: CloudflareRecord[];
        error?: string;
    }> {
        try {
            // 1. Verify user has Cloudflare account and API access
            const zones = await this.getZones(config.apiToken);
            const targetZone = zones.find((z: CloudflareZone) => z.name === domain || domain.endsWith(`.${z.name}`));

            if (!targetZone) {
                throw new Error(`Domain ${domain} not found in Cloudflare account`);
            }

            // 2. Create required DNS records automatically
            const records = await this.createEmailDNSRecords(targetZone.id, domain, config.apiToken);

            return { success: true, records };
        } catch (error) {
            console.error('Cloudflare automation setup failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    private async getZones(apiToken: string): Promise<CloudflareZone[]> {
        const response = await fetch(`${this.baseUrl}/zones`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message || 'Unknown error'}`);
        }

        return data.result;
    }

    private async createEmailDNSRecords(zoneId: string, domain: string, apiToken: string): Promise<CloudflareRecord[]> {
        const verificationToken = this.generateVerificationToken();

        const records = [
            // Verification TXT record
            {
                type: 'TXT',
                name: `_emailverify.${domain}`,
                content: `v=emailverify1; token=${verificationToken}`,
                ttl: 300
            },
            // DKIM record
            {
                type: 'TXT',
                name: `zeptomail._domainkey.${domain}`,
                content: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7vKqvkjhwsa9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9QIDAQAB',
                ttl: 300
            },
            // SPF record (check if exists first)
            {
                type: 'TXT',
                name: domain,
                content: 'v=spf1 include:zeptomail.in ~all',
                ttl: 300
            },
            // DMARC record
            {
                type: 'TXT',
                name: `_dmarc.${domain}`,
                content: 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com',
                ttl: 300
            }
        ];

        const createdRecords: CloudflareRecord[] = [];

        for (const record of records) {
            try {
                // Check if record already exists (especially for SPF)
                if (record.name === domain && record.type === 'TXT') {
                    const existingRecords = await this.getExistingRecords(zoneId, domain, 'TXT', apiToken);
                    const spfExists = existingRecords.some((r: any) => r.content.includes('v=spf1'));

                    if (spfExists) {
                        console.log(`SPF record already exists for ${domain}, skipping creation`);
                        continue;
                    }
                }

                const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(record)
                });

                const result = await response.json();
                if (result.success) {
                    createdRecords.push(result.result);
                } else {
                    console.error(`Failed to create DNS record ${record.name}:`, result.errors);
                }
            } catch (error) {
                console.error(`Error creating DNS record ${record.name}:`, error);
            }
        }

        return createdRecords;
    }

    private async getExistingRecords(zoneId: string, name: string, type: string, apiToken: string) {
        const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records?name=${name}&type=${type}`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.success ? data.result : [];
    }

    async verifyDomainRecords(domain: string): Promise<VerificationResult> {
        try {
            // Use DNS lookup to verify records are propagated
            const verification = {
                txtVerification: await this.checkTXTRecord(`_emailverify.${domain}`),
                dkimVerification: await this.checkTXTRecord(`zeptomail._domainkey.${domain}`),
                spfVerification: await this.checkSPFRecord(domain),
                dmarcVerification: await this.checkTXTRecord(`_dmarc.${domain}`)
            };

            const allVerified = Object.values(verification).every(v => v);

            return {
                verified: allVerified,
                details: verification,
                nextCheck: allVerified ? undefined : new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
            };
        } catch (error) {
            return {
                verified: false,
                details: {
                    txtVerification: false,
                    dkimVerification: false,
                    spfVerification: false,
                    dmarcVerification: false
                },
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async checkTXTRecord(hostname: string): Promise<boolean> {
        try {
            const dns = require('dns').promises;
            const records = await dns.resolveTxt(hostname);
            return records.length > 0;
        } catch (error) {
            return false;
        }
    }

    private async checkSPFRecord(domain: string): Promise<boolean> {
        try {
            const dns = require('dns').promises;
            const records = await dns.resolveTxt(domain);
            return records.some((record: string[]) =>
                record.join('').includes('v=spf1') && record.join('').includes('zeptomail.in')
            );
        } catch (error) {
            return false;
        }
    }

    private generateVerificationToken(): string {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    async cleanupDomainRecords(domain: string, config: CloudflareConfig, recordIds: string[]): Promise<void> {
        try {
            const zones = await this.getZones(config.apiToken);
            const targetZone = zones.find(z => z.name === domain || domain.endsWith(`.${z.name}`));

            if (!targetZone) {
                console.warn(`Zone for domain ${domain} not found during cleanup`);
                return;
            }

            // Delete created records
            for (const recordId of recordIds) {
                try {
                    await fetch(`${this.baseUrl}/zones/${targetZone.id}/dns_records/${recordId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${config.apiToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.error(`Failed to delete DNS record ${recordId}:`, error);
                }
            }
        } catch (error) {
            console.error('Error during Cloudflare cleanup:', error);
        }
    }
}