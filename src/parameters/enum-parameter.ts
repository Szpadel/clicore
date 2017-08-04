import * as inquirer from "inquirer";
import {BlueprintParameter} from "../";
import {AbstractParameter, CliConfig} from "./abstract";

/**
 * @internal
 */
export class EnumParameter extends AbstractParameter {
    type = 'enum';

    getCliConfig(option: BlueprintParameter): CliConfig {
        return {
            needArgument: true,
            validator: !!option.choices ? option.choices({}) : undefined
        }
    }

    createQuestion(option: BlueprintParameter, defaultParam: string | boolean): inquirer.Question {
        return {
            type: 'list',
            message: option.description,
            name: option.name,
            default: defaultParam,
            choices: option.choices,
        }
    }

}
