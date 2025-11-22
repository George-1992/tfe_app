'use server';

import aiAssistant from "@/services/aiAssistant/as";
import { ghlGetContacts, ghlGetTokens } from "@/services/ghl";
import Prisma from "@/services/prisma";

const { NextResponse } = require("next/server");



export const handleApiRequest = async (req, res) => {
    let resObj = {
        success: false,
        warning: false,
        message: '',
        data: null,
    }
    try {
        // console.log('handleApiRequest>>>>>>>>>>>>');

        const METHOD = req.method;
        const HEADERS = req.headers;
        const pathname = req.nextUrl.pathname;
        let isFile = false;



        const isApiKeyValid = await verifyApiKey(HEADERS);
        // console.log('isApiKeyValid: ', isApiKeyValid);
        // console.log('pathname: ', pathname);

        if (!isApiKeyValid) {
            resObj.message = 'Invalid API Key';
            return NextResponse.json(resObj);
        }
        // check if its a file upload
        if (isFileRequest(req)) {
            isFile = true;
        }


        console.log('METHOD: ', METHOD);
        // console.log('HEADERS: ', HEADERS);

        if (METHOD === 'GET') {
            return await handleApiGetRequest(req, res);
        } else if (METHOD === 'POST') {
            // handle POST requests
            if (isFile) {
                // handle file upload
                console.log('isFile: ', isFile);
                // return await handleFileUploadRequest(req, res);
            }
            return await handleApiPostRequest(req, res);

        }

        return NextResponse.json(resObj);
    } catch (error) {
        console.error(error);
        resObj.message = error.message || 'An error occurred';
        resObj.warning = true;
    }
}

export const verifyApiKey = async (HEADERS) => {
    try {
        return true; // Temporarily disable API key verification
        if (!HEADERS) {
            console.error('No headers provided');
            return false;
        }
        const apiKey = await HEADERS.get('x-api-key');

        // console.log('apiKey: ', apiKey);
        if (!apiKey || apiKey !== process.env.API_KEY) {
            console.error('Invalid API Key');
            return false;
        }

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}


export const handleApiGetRequest = async (req, res) => {
    let resObj = {
        success: false,
        warning: false,
        message: 'unhandled GET request',
        data: null,
    }
    try {

        const HEADERS = req.headers;
        const queryParams = req.nextUrl.searchParams;

        const collection = queryParams.get('collection');

        // get ghl tokens
        const ghlTokens = await ghlGetTokens();
        if (!ghlTokens) {
            resObj.message = 'GHL tokens not found';
            return NextResponse.json(resObj);
        }


        if (collection === 'contacts') {
            resObj = await ghlGetContacts({
                tokens: ghlTokens,
            });
        }



        return NextResponse.json(resObj);
    } catch (error) {
        console.error(error);
        resObj.message = error.message || 'An error occurred';
        resObj.success = false;
        return NextResponse.json(resObj);
    }
}

export const handleApiPostRequest = async (req, res) => {
    let resObj = {
        success: false,
        warning: false,
        message: 'unhandled POST request',
        data: null,
    }
    try {

        const HEADERS = req.headers;
        const reqBody = await req.json();
        const itsFor = reqBody ? reqBody.itsFor : null;
        const reqData = reqBody ? reqBody.data : null;

        if (!reqBody) {
            resObj.message = 'No request body found';
            return NextResponse.json(resObj);
        }
        if (!itsFor) {
            resObj.message = 'No itsFor found in request body';
            return NextResponse.json(resObj);
        }

        resObj = await aiAssistant({
            itsFor,
            data: reqData,
        });


        return NextResponse.json(resObj);
        
    } catch (error) {
        console.error(error);
        resObj.message = error.message || 'An error occurred';
        resObj.success = false;
        return NextResponse.json(resObj);
    }
}




const isFileRequest = (req) => {
    try {
        // check if the request has form or multipart data
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('isFileRequest error: ', error);
        return false;
    }
}

