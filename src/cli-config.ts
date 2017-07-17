export class CliConfig {
    cliName: string;
    cliVersion: string;
    cliDescription: string;
    configFilename: string;
    blueprintLocation: string;
    cliBin: string;

    private static instance: CliConfig;

    static getInstance(): CliConfig {
        if(!CliConfig.instance) {
            CliConfig.instance = new CliConfig();
        }
        return CliConfig.instance;
    }

    private constructor() {

    }
}
