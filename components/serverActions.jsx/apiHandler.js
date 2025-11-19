'use server';

import { fetchFromOpenAI, processMessages } from "@/components/aiAgent/functions/helper";
import { getConversations, ghlCreateContact, ghlGetContacts, ghlGetMessages, ghlGetTokens } from "@/services/ghl";
import Prisma from "@/services/prisma";
import { camelToKebab } from "@/utils/data";

const { NextResponse } = require("next/server");

const LOCATION_ID = process.env.GHL_LOCATION_ID;


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

        // get ghl tokens
        const ghlTokens = await ghlGetTokens();
        if (!ghlTokens) {
            resObj.message = 'GHL tokens not found';
            return NextResponse.json(resObj);
        }


        const psqlData = camelToKebab(reqData);
        if (itsFor === 'formSubmit') {
            let existing = null;
            let ghlContactsRes = null;
            let ghlConversationsRes = null;
            let ghlMessagesRes = null;

            let contact = null;
            let conversation = null;

            const messages = [];

            // check if already exists based on email or phone
            existing = await Prisma.forms.findFirst({
                where: {
                    OR: [
                        { email: reqData.email },
                        { phone: reqData.phone }
                    ]
                }
            });


            // if contact doest exist create new both in GHL and PSQL
            if (!existing) {


            }



            console.log('existing: ', existing);
            resObj.data = existing;
            return NextResponse.json(resObj);



            if (existing) {
                resObj.message = 'Form data already exists';
                // resObj.success = true;
                // resObj.data = existing;
                // return NextResponse.json(resObj);
            } else {
                // create form data 
                resObj.data = await Prisma.forms.create({
                    data: psqlData,
                });
            }


            // first check if the contact exists in GHL based on email or phone
            ghlContactsRes = await ghlGetContacts({
                tokens: ghlTokens,
                options: {
                    query: `${reqData.email}`,
                    limit: 1,
                }
            });
            if (ghlContactsRes.success && ghlContactsRes.data?.contacts && ghlContactsRes.data.contacts.length > 0) {
                contact = ghlContactsRes.data.contacts[0];
            }
            // console.log('contact: ', contact);



            if (!contact) {
                ghlContactsRes = await ghlCreateContact({
                    tokens: ghlTokens,
                    contactData: {
                        name: reqData.full_name ? reqData.full_name.split(' ')[0] : '',
                        email: reqData.email || '',
                        phone: reqData.phone || '',
                    },
                });
                if (ghlContactsRes.success && ghlContactsRes.data?.contact) {
                    contact = ghlContactsRes.data.contact;
                } else {
                    resObj.message = 'Error creating contact in GHL';
                    return NextResponse.json(resObj);
                }
            }


            // get conversation messages
            if (contact) {
                ghlConversationsRes = await getConversations({
                    tokens: ghlTokens,
                    locationId: LOCATION_ID,
                    query: {
                        contactId: contact.id,
                    },
                    limit: 10,
                });
                if (ghlConversationsRes.success && ghlConversationsRes.data?.conversations && ghlConversationsRes.data.conversations.length > 0) {
                    conversation = ghlConversationsRes.data.conversations[0];
                } else {
                    // no need to create conversation here
                    // as sending message will create if not exists
                }
            }


            // if convertsation exists get the messages
            // not possible to get messages overall
            if (conversation) {
                // // console.log('conversation: ', conversation);
                // ghlMessagesRes = await ghlGetMessages({
                //     tokens: ghlTokens,
                //     locationId: LOCATION_ID,
                //     query: { conversationId: conversation.id },
                //     options: {
                //         limit: 10,
                //     },
                // });
            }
            resObj = ghlMessagesRes;

            // // if contact exists get the messages
            // if (ghlContactsRes.data?.contacts && ghlContactsRes.data.contacts.length > 0) {
            //     const contact = ghlContactsRes.data.contacts[0];
            //     // fetch messages
            //     ghlMessagesRes = await ghlGetMessages({
            //         tokens: ghlTokens,
            //         contact: contact,
            //         options: {},
            //     });
            // }
            // resObj = ghlMessagesRes;



            // make AI request
            // const messages = [
            //     {
            //         role: 'user',
            //         content: `do you support my address ${reqData.project_address} ?`
            //     },
            // ]
            // const aiResponse = await processMessages(messages);
            // console.log('aiResponse.text: ', aiResponse.text);

            // resObj.success = true;
            // resObj.message = 'Form data saved successfully';
            // resObj.data = aiResponse

        }



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

