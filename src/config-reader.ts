import * as fs from "fs-extra";
import {CliConfig} from "./cli-config";

/**
 * Loads config file in json format
 */
export class ConfigReader<T extends {}> {
    private config: Partial<T>;
    private static instances: {[k:string]: ConfigReader<any>} = {};

    static getInstance<C extends {}>(configFile?: string): ConfigReader<C> {
        // if not provided use default file
        if(!configFile) {
            const cliConf = CliConfig.getInstance();
            configFile = cliConf.configFilename;
        }

        if (!ConfigReader.instances[configFile]) {
            ConfigReader.instances[configFile] = new ConfigReader(configFile);
        }
        return ConfigReader.instances[configFile];
    }

    private constructor(private configFile: string) {
        this.loadConfig();
    }

    getConfig(): Partial<T> {
        return this.config;
    }

    loadConfig() {
        if (fs.existsSync(this.configFile)) {
            this.config = JSON.parse(fs.readFileSync(this.configFile).toString());
        } else {
            this.config = {};
        }
    }
}

export interface CoreConfig {
    blueprintsDir?: string;
}
