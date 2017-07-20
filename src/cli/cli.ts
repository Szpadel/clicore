import {BlueprintDiscovery} from "../blueprint-discovery";
import caporal = require("caporal");
import * as Chalk from "chalk";
import * as inquirer from "inquirer";
import {BlueprintExecutor} from "../blueprint";
import {CliConfig} from "../cli-config";
import {Blueprint} from "../";

const coreVersion = require('../../package.json').version;

export class Cli {
    private blueprintsDiscovery = new BlueprintDiscovery();

    constructor(argv: string[]) {
        const ui = new inquirer.ui.BottomBar();

        ui.updateBottomBar(Chalk.magenta('Evaluating available blueprints...'));
        this.configure(argv)
            .then(() => ui.updateBottomBar(''))
            .then(() => caporal.parse(argv));
    }

    private async configure(argv: string[]) {
        const cliConf = CliConfig.getInstance();

        await this.blueprintsDiscovery.discovery();

        const program = caporal
            .bin(cliConf.cliBin)
            .version(this.generateVersion())
            .name(cliConf.cliName)
            .description(cliConf.cliDescription)
            //.help(this.generateHelpText())
            .action((a, o) => this.runBlueprintCmd(null, o));

        this.blueprintsDiscovery
            .getBlueprints()
            .map((b) => {
                const tag = this.getBlueprintTags(b);

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

    private async runBlueprintCmd(blueprintName: string | null, opt: { [k: string]: any }) {
        if (!blueprintName) {
            blueprintName = await this.selectBlueprint();
        }

        const blueprint = this.blueprintsDiscovery.getBlueprint(blueprintName, true);

        if(!this.isBlueprintActive(blueprint)) {
            await this.runBlueprintCmd(null, opt);
            return;
        }

        const executor = new BlueprintExecutor(blueprint);
        await executor.execute(opt);
    }

    private getBlueprintTags(blueprint: Blueprint): string {
        const m = this.blueprintsDiscovery.getBlueprintMetadata(blueprint);
        const tag = !!m.tag ? Chalk.grey(`[${m.tag}] `) : '';
        const active = !m.isActive ? Chalk.grey(`[unavailable] `) : '';
        return `${active}${tag}`;
    }

    private isBlueprintActive(blueprint: Blueprint) {
        const m = this.blueprintsDiscovery.getBlueprintMetadata(blueprint);
        return m.isActive;
    }

    private createBlueprintListItem(b: Blueprint) {
        const tag = this.getBlueprintTags(b);
        if(this.isBlueprintActive(b)) {
            return {
                name: `${b.name}  ${tag}${Chalk.grey(b.description)}`,
                value: b.name,
                short: b.name
            }
        }else {
            return new inquirer.Separator(`${Chalk.grey(b.name)}  ${tag}${Chalk.grey(b.description)}`)
        }
    }

    private async selectBlueprint(): Promise<string> {
        const blueprints = this.blueprintsDiscovery
            .getBlueprints()
            .map(b => this.createBlueprintListItem(b));

        const results = await inquirer.prompt([{
            type: 'list',
            name: 'blueprint',
            message: 'Select blueprint',
            choices: blueprints
        }]);

        return results.blueprint;
    }
}
