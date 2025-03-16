export type InterServerError = {
    message: string;
    statusCode: number;
    stack : string;
}
export type SuccessResponse = {
    message: string;
    statusCode: number;
    data?: any;
}
export type ErrorResponse = {
    message: string;
    statusCode: number;
    error: any;
}
