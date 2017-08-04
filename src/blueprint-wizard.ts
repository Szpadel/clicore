import * as inquirer from "inquirer";
import {Blueprint, parametersSupport} from "./blueprint";

/**
 * @internal
 */
export class BlueprintWizard {
    constructor(private blueprint: Blueprint) {
    }

    async runWizard(options: { [k: string]: string | boolean }): Promise<{ [k: string]: string | boolean }> {
        const questions = this.blueprint
            .options
            .filter(o => o.ask)
            .map(o => {
                const param = parametersSupport.getParam(o.type);
                return param.createQuestion(o, options[o.name]);
            });

        const resp = await inquirer.prompt(questions);

        return Object.assign(options, resp);
    }
}
