import {Blueprint, BlueprintParameter} from "./blueprint";
import * as inquirer from "inquirer";
import {Question} from "inquirer";

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
                switch(o.type) {
                    case 'boolean':
                        return this.createBoolQuestion(o, options[o.name] as boolean);
                    case 'string':
                        return this.createStringQuestion(o, options[o.name] as string);
                }
            });

        const resp = await inquirer.prompt(questions);

        return Object.assign(options, resp);
    }

    private createStringQuestion(option: BlueprintParameter, def?: string): Question {
        return {
            type: 'input',
            message: option.description,
            name: option.name,
            default: def
        }
    }

    private createBoolQuestion(option: BlueprintParameter, def?: boolean): Question {
        return {
            type: 'expand',
            message: option.description,
            name: option.name,
            default: def,
            choices: [
                {
                    key: 'y',
                    name: 'Yes',
                    value: 'y'
                },
                {
                    key: 'n',
                    name: 'No',
                    value:  'n'
                }
            ],
            validate: (i => i === 'y')
        };
    }
}
