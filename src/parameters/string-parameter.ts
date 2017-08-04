import * as inquirer from "inquirer";
import {BlueprintParameter} from "../";
import {AbstractParameter, CliConfig} from "./abstract";
import caporal = require("caporal");

/**
 * @internal
 */
export class StringParameter extends AbstractParameter {
    type = 'string';

    getCliConfig(option: BlueprintParameter): CliConfig {
        return {
            needArgument: true,
            validator: caporal.STRING
        }
    }

    createQuestion(option: BlueprintParameter, defaultParam: string | boolean): inquirer.Question {
        return {
            type: 'input',
            message: option.description,
            name: option.name,
            default: defaultParam
        }
    }

}
