import {CliConfig} from "./cli-config";
import {Cli} from "./cli/cli";
import './lib/object-values-entries-polyfill';

export interface Configuration {
    cliName: string;
    cliVersion: string;
    cliDescription: string;
    configFilename: string;
    blueprintLocation: string;
    cliBin: string;
}

export class CliBootstrapper {
    constructor(private config: Configuration) {
        const cliConf = CliConfig.getInstance();
        cliConf.cliName = config.cliName;
        cliConf.cliVersion = config.cliVersion;
        cliConf.cliDescription = config.cliDescription;
        cliConf.configFilename = config.configFilename;
        cliConf.blueprintLocation = config.blueprintLocation;
        cliConf.cliBin = config.cliBin;
    }

    runCli(argv: string[]) {
        new Cli(argv);
    }
}
