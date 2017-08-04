import * as inquirer from "inquirer";
import {BlueprintParameter} from "../";
import {AbstractParameter, CliConfig} from "./abstract";
import caporal = require("caporal");

/**
 * @internal
 */
export class BooleanParameter extends AbstractParameter {
    type = 'boolean';

    getCliConfig(option: BlueprintParameter): CliConfig {
        return {
            needArgument: false,
            validator: caporal.BOOL
        }
    }

    createQuestion(option: BlueprintParameter, defaultParam: string | boolean): inquirer.Question {
        return {
            type: 'expand',
            message: option.description,
            name: option.name,
            default: defaultParam,
            choices: [
                {
                    key: 'y',
                    name: 'Yes',
                    value: 'y'
                },
                {
                    key: 'n',
                    name: 'No',
                    value: 'n'
                }
            ],
            validate: (i => i === 'y')
        };
    }
}
