import {Blueprint} from "./blueprint";
import * as path from "path";
import * as fs from "fs-extra";
import {ConfigReader, CoreConfig} from "./config-reader";
import {CliConfig} from "./cli-config";

export interface BlueprintMetadata {
    tag?: string;
}

export class BlueprintDiscovery {
    private blueprints: Blueprint[] = [];
    private blueprintMetadata: WeakMap<Blueprint, BlueprintMetadata> = new WeakMap();

    private detectIndexFile(dir: string, file: string) {
        return fs.existsSync(path.join(dir, `${file}.ts`)) ?
            path.join(dir, `${file}.ts`) :
            path.join(dir, `${file}.js`);
    }

    private loadBlueprints(dirPath: string, tag?: string) {
        const blueprints = fs.readdirSync(dirPath);

        // load valid blueprints
        this.blueprints = blueprints
            .map(item => path.join(dirPath, item))
            .filter(loc => fs.statSync(loc).isDirectory())
            .map(dir => this.detectIndexFile(dir, 'index'))
            .filter(file => fs.existsSync(file))
            .filter(loc => fs.statSync(loc).isFile())
            .map(file => require(file).default)
            .map(module => new module() as Blueprint)
            .filter(module => {
                const isModule = module instanceof Blueprint;
                if (!isModule) {
                    throw Error(`Loaded module isn't valid Blueprint! module: ${module}`);
                }
                return isModule;
            })
            .map((blueprint) => {
                this.blueprintMetadata.set(blueprint, {
                    tag
                });
                return blueprint;
            });
    }

    public discovery() {
        const cliConf = CliConfig.getInstance();
        this.loadBlueprints(cliConf.blueprintLocation);

        const config = ConfigReader.getInstance<CoreConfig>().getConfig();
        if (config.blueprintsDir) {
            this.loadBlueprints(config.blueprintsDir, 'local');
        }
    }

    public getBlueprint(name: string, ensure?: false): Blueprint | void;
    public getBlueprint(name: string, ensure: true): Blueprint;
    public getBlueprint(name: string, ensure: boolean = false): Blueprint | void {
        const blue = this.blueprints
            .find((blueprint) => blueprint.name === name);

        if (ensure && !blue) {
            throw new Error(`Couldn't find blueprint ${name}`);
        }

        return blue;
    }

    public getBlueprints() {
        return this.blueprints;
    }

    public getBlueprintMetadata(blueprint: Blueprint): BlueprintMetadata {
        const metadata = this.blueprintMetadata.get(blueprint);
        if(!metadata) {
            throw new Error('Blueprint doesn\'t have metadata assigned!');
        }
        return metadata;
    }
}
