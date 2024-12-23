import { HttpException, HttpStatus } from "@nestjs/common";

export class AlertErrorBean extends HttpException {
    title?: string;
    image?: string;
    ctaText?: string;
    ctalink?: string;

    constructor(params: {
        message: string;
        title?: string;
        image?: string;
        ctaText?: string;
        ctalink?: string;
        status?: HttpStatus;
    }) {
        const { message, title, image, ctaText, ctalink, status } = params;
        const errorResponse = {
            message: message,
            errors: [
                {
                    title: title,
                    image: image,
                    message: message,
                    ctaText: ctaText,
                    ctalink: ctalink
                }
            ]
        };
        super(errorResponse, status);
    }
}
