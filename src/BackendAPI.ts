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
    private mClient: Client;

    constructor(url: string) {
        const apiToken = sessionStorage.getItem("apiToken");
        if (apiToken) {
            this.apiToken = apiToken;
            this.mClient = new Client(url, {apiToken});
        } else {
            this.mClient = new Client(url);
        }

        this.url = url;
    }

    get client() {
        return this.mClient;
    }

    async login(apiToken: string) {
        const client = new Client(this.url, {apiToken});
        await client.getInfo();

        this.apiToken = apiToken;
        sessionStorage.setItem("apiToken", apiToken);
        this.mClient = new Client(this.url, {apiToken});

    }

    logout() {
        sessionStorage.removeItem("apiToken");
        this.mClient = new Client(this.url);

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
