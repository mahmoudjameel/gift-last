export interface AuthenticaResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export class AuthenticaService {
    private static readonly BASE_URL = "https://api.authentica.sa"; // Based on research
    private apiKey: string;

    constructor(apiKey: string = "") {
        this.apiKey = apiKey;
    }

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Send OTP to a phone number
     * @param phone Saudi phone number (e.g., +9665XXXXXXXX)
     */
    async sendOTP(phone: string): Promise<AuthenticaResponse> {
        if (!this.apiKey) {
            console.warn("[Authentica] API Key not set, skipping actual API call");
            return { success: true, message: "DEV: OTP sent successfully (simulated)" };
        }

        try {
            const response = await fetch(`${AuthenticaService.BASE_URL}/send-otp`, {
                method: "POST",
                headers: {
                    "X-Authorization": this.apiKey,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phone }),
            });

            const data = await response.json();
            return {
                success: response.ok,
                data,
            };
        } catch (error: any) {
            console.error("[Authentica] Error sending OTP:", error.message);
            return {
                success: false,
                message: error.message || "Failed to send OTP",
            };
        }
    }

    /**
     * Verify OTP code for a phone number
     * @param phone Saudi phone number
     * @param otp OTP code received
     */
    async verifyOTP(phone: string, otp: string): Promise<AuthenticaResponse> {
        if (!this.apiKey) {
            console.warn("[Authentica] API Key not set, skipping actual API call");
            // Simulation: Accept code '123456' for testing
            if (otp === "123456") {
                return { success: true, message: "DEV: OTP verified successfully (simulated)" };
            }
            return { success: false, message: "DEV: Invalid OTP (simulation uses 123456)" };
        }

        try {
            const response = await fetch(`${AuthenticaService.BASE_URL}/verify-otp`, {
                method: "POST",
                headers: {
                    "X-Authorization": this.apiKey,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ phone, otp }),
            });

            const data = await response.json();
            return {
                success: response.ok,
                data,
            };
        } catch (error: any) {
            console.error("[Authentica] Error verifying OTP:", error.message);
            return {
                success: false,
                message: error.message || "Invalid OTP or verification failed",
            };
        }
    }
}

export const authenticaService = new AuthenticaService(process.env.AUTHENTICA_API_KEY);
