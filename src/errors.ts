import {ExtendableError} from "extendable-error";

/**
 * Error caused by user
 * This won't crash application, but display message to user
 */
export class UserError extends ExtendableError {
    constructor(message: string) {
        super(message);
    }
}

/**
 * Requirements for blueprint aren't met
 */
export class ValidationError extends UserError {
    constructor(message: string) {
        super(message);
    }
}
