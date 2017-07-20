import {Blueprint} from "./blueprint";
import * as path from "path";
import * as fs from "fs-extra";
import {ConfigReader, CoreConfig} from "./config-reader";
import {CliConfig} from "./cli-config";
import {resolveArray} from "./tools/async-utils";

/**
 * @internal
 */
export interface BlueprintMetadata {
    tag?: string;
    isActive: boolean;
}

/**
 * @internal
 */
export class BlueprintDiscovery {
    private blueprints: Blueprint[] = [];
    private blueprintMetadata: WeakMap<Blueprint, BlueprintMetadata> = new WeakMap();

    private detectIndexFile(dir: string, file: string) {
        return fs.existsSync(path.join(dir, `${file}.js`)) ?
            path.join(dir, `${file}.js`) :
            path.join(dir, `${file}.ts`);
    }

    private async loadBlueprints(dirPath: string, tag?: string) {
        const blueprints = fs.readdirSync(dirPath);

        // load valid blueprints
        this.blueprints = await blueprints
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
                return {blueprint, isActive: blueprint.precondition()}
            })
            .map(async ({blueprint, isActive}) => {
                this.blueprintMetadata.set(blueprint as Blueprint, {
                    tag: tag,
                    isActive: await isActive
                });
                return blueprint;
            })
            .reduce<Promise<Blueprint[]>>(resolveArray, Promise.resolve([]));
    }

    public async discovery() {
        const cliConf = CliConfig.getInstance();
        await this.loadBlueprints(cliConf.blueprintLocation);

        const config = ConfigReader.getInstance<CoreConfig>().getConfig();
        if (config.blueprintsDir) {
            await this.loadBlueprints(config.blueprintsDir, 'local');
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
        if (!metadata) {
            throw new Error('Blueprint doesn\'t have metadata assigned!');
        }
        return metadata;
    }
}
