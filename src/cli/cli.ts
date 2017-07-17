import {BlueprintDiscovery} from "../blueprint-discovery";
import caporal = require("caporal");
import * as Chalk from "chalk";
import * as inquirer from "inquirer";
import {BlueprintExecutor} from "../blueprint";
import {CliConfig} from "../cli-config";

const coreVersion = require('../../package.json').version;

export class Cli {
    private blueprintsDiscovery = new BlueprintDiscovery();

    constructor(argv: string[]) {
        const cliConf = CliConfig.getInstance();

        this.blueprintsDiscovery.discovery();

        const program = caporal
            .bin(cliConf.cliBin)
            .version(this.generateVersion())
            .name(cliConf.cliName)
            .description(cliConf.cliDescription)
            //.help(this.generateHelpText())
            .action((a, o) => this.runBlueprintCmd(null, o));

        this.blueprintsDiscovery
            .getBlueprints()
            .forEach((b) => {
                const tag = [b]
                    .map(b => this.blueprintsDiscovery.getBlueprintMetadata(b))
                    .map(m => m.tag)
                    .filter(tag => !!tag)
                    .map(tag => Chalk.grey(`[${tag}] `))
                    .join('');

                const chain = program
                    .command(b.name, `${tag}${b.description}`);

                b.options
                    .reduce((chain, option) => {
                        // if option is required but we can ask for them, we will do it in wizard
                        const required = option.require && !option.ask;

                        switch (option.type) {
                            case 'boolean':
                                return chain
                                    .option(`--${option.name}`, option.description, caporal.BOOL, undefined, required);
                            case 'string':
                                return chain
                                    .option(`--${option.name} <${option.name}>`, option.description, caporal.STRING, undefined, required);
                        }

                    }, chain)
                    .action((a, o) => this.runBlueprintCmd(b.name, o));
            });

        caporal.parse(argv);
    }

    private generateVersion(): string {
        const cliConf = CliConfig.getInstance();
        return `${cliConf.cliVersion} (core ${coreVersion})`;
    }

    private generateHelpText() {
        const blueprints = this.blueprintsDiscovery.getBlueprints()
            .map((blueprint) => `     ${Chalk.cyan(blueprint.name)}:\n         ${Chalk.magenta(blueprint.description)}`)
            .join('\n\n');

        return Chalk.blue(`Available blueprints:\n\n`) + blueprints;
    }

    private async runBlueprintCmd(blueprint: string | null, opt: { [k: string]: any }) {
        if (!blueprint) {
            blueprint = await this.selectBlueprint();
        }

        [blueprint]
            .map(b => this.blueprintsDiscovery.getBlueprint(b, true))
            .map(b => new BlueprintExecutor(b))
            .forEach(e => e.execute(opt));
    }

    private async selectBlueprint(): Promise<string> {
        const blueprints = this.blueprintsDiscovery
            .getBlueprints()
            .map(b => {
                return {
                    name: `${b.name}  ${Chalk.grey(b.description)}`,
                    value: b.name,
                    short: b.name
                }
            });

        const results = await inquirer.prompt([{
            type: 'list',
            name: 'blueprint',
            message: 'Select blueprint',
            choices: blueprints
        }]);

        return results.blueprint;
    }
}
