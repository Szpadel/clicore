import {ExtendableError} from "extendable-error";

export class UserError extends ExtendableError {
    constructor(message: string) {
        super(message);
    }
}

export class ValidationError extends UserError {
    constructor(message: string) {
        super(message);
    }
}
