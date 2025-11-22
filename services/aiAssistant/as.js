import { AiTools, AiToolsGhl, processMessages } from "@/components/aiAgent/functions/helper";
import {
    ghlGetCalendarGroups,
    ghlGetCalendars,
    ghlCreateAppointment, ghlCreateContact,
    ghlCreateOpportunity, ghlDeleteOpportunity,
    ghlGetContacts, ghlGetOpportunities, ghlGetPipelines,
    ghlGetTokens, ghlRefreshToken, ghlsendMessages, ghlUpdateOpportunity,
    ghlGetCalendarEvents,
    ghlGetCalendarSlots,
    ghlUpdateAppointment,
    ghlDeleteAppointment
} from "@/services/ghl";
import Prisma from "@/services/prisma";
import { camelToKebab } from "@/utils/data";
import { camelToSnake, getIsoString } from "@/utils/other";
import { cloneDeep, last } from "lodash";

const LOCATION_ID = process.env.GHL_LOCATION_ID;


const getPsqlContactDataFromGhlContact = (ghlContact) => {


    try {
        if (!ghlContact || typeof ghlContact !== 'object') return null;

        let newData = {};
        const okFields = [
            'location_id',
            'contact_name',
            'first_name',
            'last_name',
            'first_name_raw',
            'last_name_raw',
            'company_name',
            'email',
            'phone',
            'dnd',
            'dnd_settings',
            'type',
            'source',
            'assigned_to',
            'city',
            'state',
            'postal_code',
            'address1',
            'date_added',
            'date_updated',
            'date_of_birth',
            'business_id',
            'tags',
            'followers',
            'country',
            'website',
            'timezone',
            'profile_photo',
            'additional_emails',
            'custom_fields',
        ]


        okFields.forEach(field => {
            if (ghlContact.hasOwnProperty(field)) {
                newData[field] = ghlContact[field];
            }
        });

        newData.ghl_id = ghlContact.id;
        delete newData.id;

        return newData;

    } catch (error) {
        console.error('getPsqlContactDataFromGhlContact error: ', error);
        return null;
    }
}

const getForms = async ({ ghlTokens, email, phone }) => {
    let formData = [];
    try {
        formData = await Prisma.forms.findMany({
            where: {
                OR: [
                    { email: email },
                    { phone: phone }
                ]
            }
        });

        return formData;
    } catch (error) {
        console.error('getFormData error: ', error);
        return null;
    }
};
const createFormIfNotExists = async ({
    ghlTokens,
    data,
}) => {
    let formData = null;
    const _data = data || {};
    try {
        // check if already submitted form with same email or phone
        formData = await Prisma.forms.findFirst({
            where: {
                OR: [
                    { email: _data.email },
                    { phone: _data.phone }
                ]
            }
        });
        // if does not exist create new
        if (!formData) {
            formData = await Prisma.forms.create({
                data: _data,
            });
        }

        return formData;
    } catch (error) {
        console.error('createFormIfNotExists error: ', error);
        return null;
    }
};
const createContactIfNotExists = async ({
    ghlTokens,
    data,
    isFormData = true,
    isContactData = true,
    isDebug = true,
}) => {
    let resObj = {
        success: false,
        message: 'unhandled createContactIfNotExists request',
        data: null,
    };
    let contact = null;
    let ghlContactsRes = null;
    const _data = data || {};
    const psqlData = data;

    try {

        contact = await Prisma.contacts.findUnique({
            where: {
                email: _data.email,
            },
            include: { messages: true }
        });
        if (isDebug) {
            console.log('DEBUG: createContactIfNotExists: ', contact ? 'Contact found in PSQL' : 'Contact not found in PSQL');
        }

        // if contact doesnt exist in PSQL create new both in GHL and PSQL
        if (!contact || !contact.ghl_id) {
            let ghlContact = null;
            // first check if the contact exists in GHL based on email or phone
            try {
                ghlContactsRes = await ghlGetContacts({
                    tokens: ghlTokens,
                    options: {
                        query: `${_data.email}`,
                        limit: 1,
                    }
                });
            } catch (error) { }
            ghlContact = ghlContactsRes.data && ghlContactsRes.data.contacts && ghlContactsRes.data.contacts.length > 0
                ? ghlContactsRes.data.contacts[0]
                : null;

            if (isDebug) {
                console.error('DEBUG: ghlGetContacts by email error: ', ghlContact ? 'Contact found in GHL by email' : 'Contact not found in GHL by email');
            }
            if (!ghlContact) {
                try {
                    ghlContactsRes = await ghlGetContacts({
                        tokens: ghlTokens,
                        options: {
                            query: `${_data.phone}`,
                            limit: 1,
                        }
                    });
                } catch (error) { }
                ghlContact = ghlContactsRes.data && ghlContactsRes.data.contacts && ghlContactsRes.data.contacts.length > 0
                    ? ghlContactsRes.data.contacts[0]
                    : null;

                if (isDebug) {
                    console.error('DEBUG: ghlGetContacts by email error: ', ghlContact ? 'Contact found in GHL by phone' : 'Contact not found in GHL by phone');
                }
            }
            if (!ghlContact) {
                ghlContactsRes = await ghlCreateContact({
                    tokens: ghlTokens,
                    contactData: {
                        firstName: _data.full_name ? _data.full_name.split(' ')[0] : '',
                        lastName: _data.full_name ? last(_data.full_name.split(' ')) : '',
                        email: _data.email || '',
                        phone: _data.phone || '',
                    },
                });
                ghlContact = ghlContactsRes.data && ghlContactsRes.data
                    ? ghlContactsRes.data
                    : null;

                if (isDebug) {
                    console.log('DEBUG: ghlCreateContact', ghlContact ? 'Contact created in GHL' : ' error: Contact not created in GHL');
                }
            }
            if (!ghlContact) {
                resObj.success = false;
                resObj.message = 'Error creating contact in GHL';
                return resObj;
            }

            let toSaveContact = getPsqlContactDataFromGhlContact(camelToSnake(cloneDeep(ghlContact)));

            if (contact && contact?.id) {
                contact = await Prisma.contacts.update({
                    where: { id: contact.id },
                    data: toSaveContact,
                    include: { messages: true }
                });
            } else {
                contact = await Prisma.contacts.create({
                    data: toSaveContact,
                    include: { messages: true }
                });
            }
            if (isDebug) {
                console.error('DEBUG: Contact created in PSQL');
            }
        }

        resObj.success = true;
        resObj.message = 'Contact exists or created successfully';
        resObj.data = contact;

        return resObj;

    } catch (error) {
        console.error('createContactIfNotExists error: ', error);
        return null;
    }
};
const sendAndSaveMessage = async ({
    ghlTokens,
    locationId,
    contact,
    message,
}) => {
    let resObj = {
        success: false,
        message: 'unhandled sendAndSaveMessage request',
        data: null,
    };
    try {
        resObj = await ghlsendMessages({
            tokens: ghlTokens,
            locationId: locationId,
            message: {
                locationId: locationId,
                type: 'SMS',
                status: 'delivered',
                contactId: contact.ghl_id || contact.id,
                message: message,
            }
        });
        if (resObj.success) {
            // add message as message to contact
            const cd = camelToSnake(resObj.data);
            let msgToSave = {
                ...cd,
                ghl_id: cd.id,
                location_id: locationId,
                contact_id: contact.id,
                role: 'assistant',
                body: message,
            };
            delete msgToSave.id;
            await Prisma.messages.create({
                data: msgToSave,
            });
        }
        return resObj;
    } catch (error) {
        console.error('sendAndSaveMessage error: ', error);
        resObj.success = false;
        resObj.message = error.message || 'An error occurred in sendAndSaveMessage';
        return resObj;
    }
};




export default async function aiAssistant({ itsFor, data }) {

    let resObj = {
        success: false,
        message: 'unhandled AI assistant request',
        data: null,
    };


    try {
        const _data = data || {};
        const ghlCalendarId = 'MpnLxyw9hVCScWIkPMJN';
        const ghlTimezone = 'Europe/London';
        const ghlPipelineId = 'jeE3ydJVSqONDnIyWH7o';
        const ghlPipelineStageId = '222de456-cee4-46f8-ac94-7a5806d9bd84';

        // get ghl tokens
        const ghlTokens = await ghlGetTokens();
        if (!ghlTokens) {
            resObj.message = 'GHL tokens not found';
            return resObj;
        }
        const psqlData = camelToSnake(data);

        // TEST START
        // =======================================================


        // resObj = ghlGetPipelines({
        //     tokens: ghlTokens,
        //     locationId: LOCATION_ID,
        // });
        // return resObj;

        // resObj = ghlCreateOpportunity({
        //     tokens: ghlTokens,
        //     locationId: LOCATION_ID,
        //     data: {
        //         pipelineId: 'jeE3ydJVSqONDnIyWH7o',
        //         name: 'Gor Stepanyan - Laminate estimate',
        //         pipelineStageId: '222de456-cee4-46f8-ac94-7a5806d9bd84',
        //         status: 'open',
        //         contactId: 'qS7Llousmgrb1VxNQ6Rn',
        //         monetaryValue: 375
        //     }
        // });
        // return resObj;



        // resObj = await ghlGetCalendarSlots({
        //     tokens: ghlTokens,
        //     locationId: LOCATION_ID,
        //     data: {
        //         calendarId: 'MpnLxyw9hVCScWIkPMJN',
        //         startTime: 1732454400000,
        //         endTime: 1732465200000
        //     }
        // });
        // return resObj;


        // resObj = await ghlGetCalendarEvents({
        //     tokens: ghlTokens,
        //     locationId: LOCATION_ID,
        //     data: {
        //         locationId: 'b1ntF8lr1ghex2dpcUvr',
        //         calendarId: 'MpnLxyw9hVCScWIkPMJN',
        //         startTime: 1762732800000,
        //         endTime: 1764028800000
        //     }
        // });
        // return resObj;


        // =======================================================
        // // TEST END

        const aiProfiles = {
            user: {
                // model: openai(aiModelName),
                // messages: messages,
                model: 'gpt-5-mini',
                tools: {
                    ...AiTools,
                    ...AiToolsGhl,
                },
                system: [
                    `======Identity & Communication Style:

                    You are Ava, the construction company\'s assistant. 
                    Speak like a real person, not an AI. Be short, clear, polite, and human.
                    Do not be verbose. Avoid filler, complex wording, and long explanations.
                    Do not use em dash, double negations, or "blah blah".
                    Use British pounds (£) for money.
                    Never mention internal systems, tools, CRM, or GHL.
                    `,
                    `======Conversation Rules:

                    Always check previous messages before asking questions.
                    Do not repeat a question if it was already answered.
                    Do not suggest anything unrealistic or unrelated to the user's context.
                    If you already asked something earlier, rephrase it instead of repeating.
                    If user submitted a form earlier, acknowledge it and check what changed.
                    Always scan previous context for useful data before responding.
                    If this is the first message, greet the user and say your name.
                    `,
                    `======CRM / GHL Logic (Internal Only — Never Mention to User):
                    
                    CRM: HighLevel (GHL)
                    locationId = ${LOCATION_ID}
                    calendarId = ${ghlCalendarId}
                    timezone = ${ghlTimezone}

                    When using any GHL tool, always pass (data.ghl_id || data.id) as contactId or id.
                    Never reveal CRM fields, ids, pipelines, tools, or internal logic to the user.
                    `,
                    `======Opportunity Rules:

                    Before creating an opportunity:
                    - Use ghlGetOpportunitiesTool to check if one exists.

                    If the lead is eligible AND no opportunity exists:
                    - Create one with ghlCreateOpportunityTool
                    pipelineId = ${ghlPipelineId}
                    stageId = ${ghlPipelineStageId}

                    If project value changes:
                    - Update using ghlUpdateOpportunityTool

                    If the project is cancelled:
                    - Use ghlDeleteOpportunityTool
                    `,
                    `======Appointment Rules:

                    Appointments must never be invented or guessed.
                    Always check availability first:
                    - Use ghlGetCalendarSlotsTool
                    If user wants to book:
                    - Use ghlCreateAppointmentTool with a slot returned earlier.
                    If user wants to reschedule:
                    - Use ghlUpdateAppointmentTool if required to change event and use ghlGetCalendarEventsTool (always try 6 days before and 6 days after today) to get the eventId for the appointment, use contactId to make sure you are looking at the correct appointments.
                    - if there is an existing appointment update it , never create extra appointment if existing one can be updated.
                    - when checking availability with ghlGetCalendarSlotsTool always check at least 3 days ahead just to have more options.
                    - always mention weekdays and time of the day (morning, afternoon, evening) when suggesting slots.
                    - try not to book and on weekends unless user insists only then check availability, otherwise prioritize weekdays.
                    - time format is hh:mm AM/PM (12-hour format).
                    If they want to cancel:
                    - Use ghlDeleteAppointmentTool if required (also if opportunity is cancelled).
                    `,
                    `====== Address & Estimate Rules:
                    If postcode exists in conversation:
                    - Run addressCheckerTool

                    If postcode is missing:
                    - Ask for postcode

                    If formData exists and no estimate is given yet:
                    - Use estimateTool to generate estimate
                    - If the user provided an email: say "Email sent with full estimate details."
                    - If no email: ask for email

                    If sending estimate:
                    - Create opportunity using ghlCreateOpportunityTool
                    `,
                    `====== Postcode Service Logic:
                    If postcode is supported:
                    - Offer to schedule a quick call with a flooring expert.

                    If postcode is NOT supported:
                    - Tell user we cannot install in their area, but we can ship flooring across Europe.
                    `,
                    `====== Behavior Consistency:
                    Keep everything simple, short, and clear.
                    Use the user\'s inputs exactly.
                    Search the conversation for phone number, postcode, address, email, or details before requesting.
                    Never guess.
                    Never repeat yourself unnecessarily.
                    Always prioritize correct tool usage and available data.
                    `,
                    `====== OTHER RULES:

                    - dont offer more timeslots of what use asked is already available.
                    - dont send messages that you will reschedule or cancle things later, you should do what you are asked in the same requst and reply with the result.
                    `,
                ].map(s => s.trim()).join(' ')
            },
            admin: {
                // model: openai(aiModelName),
                // messages: messages,
                model: 'gpt-5-mini',
                tools: {
                    ...AiTools,
                    ...AiToolsGhl,
                },
                system: [
                    `======Identity & Communication Style:
                    You are Ava, the construction company\'s assistant. 
                    Speak like a real person, not an AI. Be short, clear, polite, and human.
                    Do not be verbose. Avoid filler, complex wording, and long explanations.
                    Do not use em dash, double negations, or "blah blah".
                    Use British pounds (£) for money.
                    Never mention internal systems, tools, CRM, or GHL.
                    `,
                    `======CRM / GHL Logic (Internal Only — Never Mention to User):
                    
                    CRM: HighLevel (GHL)
                    locationId = ${LOCATION_ID}
                    calendarId = ${ghlCalendarId}
                    timezone = ${ghlTimezone}

                    When using any GHL tool, always pass (data.ghl_id || data.id) as contactId or id.
                    Never reveal CRM fields, ids, pipelines, tools, or internal logic to the user.
                    `,
                    `====== OTHER RULES:
                    - use tools whenever you feel necessary to get relevant information.
                    - dont offer more timeslots of what use asked is already available.
                    - dont send messages that you will reschedule or cancle things later, you should do what you are asked in the same requst and reply with the result.
                    `,
                ].map(s => s.trim()).join(' ')
            }
        }

        if (itsFor === 'formSubmit') {

            const previousForms = await getForms({
                ghlTokens,
                email: psqlData.email,
                phone: psqlData.phone,
            });
            const formData = await Prisma.forms.create({
                data: psqlData,
            });
            const contactRes = await createContactIfNotExists({
                ghlTokens,
                data: psqlData,
                isFormData: true,
                isContactData: true,
            });
            const contact = contactRes.data;
            const messages = [];

            if (!contactRes.success) {
                resObj = contactRes;
                return resObj;
            }

            // push form submission as messages
            messages.push({
                role: 'user',
                content: `
                previous form submissions: ${JSON.stringify(previousForms)}
                New form submission received with the following details: ${JSON.stringify(formData)}
                contact details: ${JSON.stringify(contact)}
                `,
            });

            // make AI request
            if (contact && contact.messages && contact.messages.length > 0) {
                contact.messages.forEach(msg => {
                    messages.push({
                        role: msg.role || 'user',
                        content: msg.body || msg.message || '',
                    });
                });
            }

            const aiResponse = await processMessages({
                messages: messages,
                ghl: {
                    tokens: ghlTokens,
                    locationId: LOCATION_ID,
                },
                profileData: aiProfiles.user,
            });
            // console.log('aiResponse.text: ', aiResponse.text);

            if (aiResponse.text) {

                resObj = await sendAndSaveMessage({
                    ghlTokens,
                    locationId: LOCATION_ID,
                    contact,
                    message: aiResponse.text,
                });

            } else {
                resObj.success = false;
                resObj.message = 'AI response error';
            }

            resObj.messages = messages;

        }
        else if (itsFor === 'InboundMessage') {
            // console.log('OutboundMessage data: ', data);

            let contact = null;
            const messages = [];

            //first find contact in psql DB
            const contactRes = await Prisma.contacts.findUnique({
                where: {
                    ghl_id: _data.contactId,
                },
                include: { messages: true }
            });
            contact = contactRes;
            // console.log('contact: ', contact);

            if (!contact) {
                // try getting contact from GHL and saving to PSQL
                const ghlContactsRes = await ghlGetContacts({
                    tokens: ghlTokens,
                    options: {
                        contactId: _data.contactId,
                    }
                });
                contact = ghlContactsRes.data && ghlContactsRes.data.contacts && ghlContactsRes.data.contacts.length > 0
                    ? ghlContactsRes.data.contacts[0]
                    : null;

                // if successfully got contact from GHL save to PSQL
                if (contact) {
                    let toSaveContact = getPsqlContactDataFromGhlContact(camelToSnake(cloneDeep(contact)));
                    contact = await Prisma.contacts.create({
                        data: toSaveContact,
                        include: { messages: true }
                    });
                }
            }

            if (!contact) {
                resObj.success = false;
                resObj.message = 'Contact not found';
                return resObj;
            }

            console.log('NEW MESSAGE >>>> : ', _data.body || _data.message || '');

            // push form submission as messages
            messages.push({
                role: 'user',
                content: `
                 contact details: ${JSON.stringify(contact)}
                `,
            });
            messages.push({
                role: 'user',
                content: _data.body || _data.message || '',
                timestamp: getIsoString({ date: null, newDate: true }),
            });

            // console.log('messages: ',messages);
            // return resObj;

            // push previous messages
            if (contact && contact.messages && contact.messages.length > 0) {
                contact.messages.forEach(msg => {
                    messages.push({
                        role: msg.role || 'user',
                        content: msg.body || msg.message || '',
                        timestamp: msg.created_at ? getIsoString({ date: msg.created_at }) : getIsoString({ date: null, newDate: true }),
                    });
                });
            }
            // console.log('messages: ', messages);
            // return resObj;

            const aiResponse = await processMessages({
                messages: messages,
                profileData: aiProfiles.user,
            });
            // console.log('aiResponse.text: ', aiResponse.text);

            if (aiResponse.text) {

                resObj = await sendAndSaveMessage({
                    ghlTokens,
                    locationId: LOCATION_ID,
                    contact,
                    message: aiResponse.text,
                });

                resObj.success = true;
                resObj.message = 'AI assistant test successful';
            } else {
                resObj.success = false;
                resObj.message = 'AI response error';
            }
        }
        else if (itsFor === 'admin') {
            return resObj;
            // console.log('data: ', data);
            const messages = []
            if (data.messages && data.messages.length) {
                messages.push(...data.messages);
            }



            const aiRes = await processMessages({
                messages: messages,
                profileData: aiProfiles.admin,
            });

            resObj.success = true;
            resObj.message = 'admin test successful';
            resObj.data = aiRes.text || '';
        }



        return resObj;
    } catch (error) {
        console.error(error);
        resObj.message = error.message || 'An error occurred in AI assistant';
        resObj.success = false;
        return resObj;
    }
}


