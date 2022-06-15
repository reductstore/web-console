import {APIError, Client} from "reduct-js";

export interface IBackendAPI {
    client: Client;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isAllowed: () => Promise<boolean>;
}

export class BackendAPI implements IBackendAPI {
    private apiToken?: string;
    private readonly url: string;

    constructor(url: string) {
        const apiToken = sessionStorage.getItem("apiToken");
        if (apiToken) {
            this.apiToken = apiToken;
        }

        this.url = url;
    }

    get client() {
        const {url, apiToken} = this;
        return new Client(url, {apiToken});
    }

    async login(apiToken: string) {
        const client = new Client(this.url, {apiToken});
        await client.getInfo();

        this.apiToken = apiToken;
        sessionStorage.setItem("apiToken", apiToken);
    }

    logout() {
        sessionStorage.removeItem("apiToken");
    }

    async isAllowed(): Promise<boolean> {
        try {
            await this.client.getInfo();
            return true;
        } catch (err) {
            if (err instanceof APIError && err.status == 401) {
                sessionStorage.removeItem("apiToken");
                return false;
            }

            throw err;
        }

    }
}
